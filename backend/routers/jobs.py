from fastapi import APIRouter, HTTPException, Body, Request, Depends, status
from typing import List, Annotated
from bson import ObjectId
from fastapi.encoders import jsonable_encoder

from backend.models.job_model import PrintJob
from backend.utils.auth import get_current_user

router = APIRouter(prefix="/jobs", tags=["Jobs"])

def job_helper(job) -> dict:
    """Converts a job document from MongoDB to a JSON-serializable dict."""
    return {
        "id": str(job["_id"]),
        "printer_id": str(job.get("printer_id")),
        "owner_email": job.get("owner_email"),
        "job_name": job.get("job_name"),
        "job_status": job.get("job_status"),
        "copies": job.get("copies", 1),
        "print_date": job.get("print_date").isoformat() if job.get("print_date") else None,
        "width_mm": job.get("width_mm"),
        "length_mm": job.get("length_mm"),
        "printed_area_sqm": job.get("printed_area_sqm"),
        "printed_length_m": job.get("printed_length_m"),
        "total_ink_ml": job.get("total_ink_ml"),
        "ink_consumption_ml": job.get("ink_consumption_ml", {}),
        "dpi_x": job.get("dpi_x"),
        "dpi_y": job.get("dpi_y"),
        "print_mode": job.get("print_mode"),
        "speed": job.get("speed"),
        "printed_pass": job.get("printed_pass"),
    }

@router.post(
    "/", 
    response_description="Upload a new print job", 
    status_code=status.HTTP_201_CREATED,
    response_model=dict
)
async def upload_print_job(
    request: Request,
    job_data: PrintJob = Body(...),
    current_user: Annotated[str, Depends(get_current_user)] = None
):
    job_collection = request.app.db["print_jobs"]
    job_dict = jsonable_encoder(job_data)
    
    if current_user:
        job_dict["owner_email"] = current_user
    
    # Check if printer_id is a valid ObjectId before proceeding
    if not ObjectId.is_valid(job_dict["printer_id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid printer_id format: {job_dict['printer_id']}"
        )

    printer = await request.app.db["printers"].find_one({
        "_id": ObjectId(job_dict["printer_id"]),
        "owner_email": job_dict["owner_email"]
    })
    if not printer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Printer not found or user does not have permission."
        )

    new_job = await job_collection.insert_one(job_dict)
    return {"message": "Job uploaded successfully", "job_id": str(new_job.inserted_id)}

@router.get(
    "/by_printer/{printer_id}", 
    response_description="Get all jobs for a specific printer"
)
async def get_jobs_for_printer(
    printer_id: str,
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)]
):
    if not ObjectId.is_valid(printer_id):
        raise HTTPException(status_code=400, detail="Invalid printer ID")
    
    job_collection = request.app.db["print_jobs"]
    jobs = []
    
    # --- THIS IS THE FIX ---
    # We create a query that checks for the printer_id as a STRING
    # and *also* as an ObjectId, just in case.
    # This makes the query robust to how the data was stored.
    query = {
        "owner_email": current_user,
        "$or": [
            {"printer_id": printer_id},
            {"printer_id": ObjectId(printer_id)}
        ]
    }
    # --- END FIX ---
    
    # Find jobs matching the query, sorted by print_date descending
    async for job in job_collection.find(query).sort("print_date", -1):
        jobs.append(job_helper(job))
        
    return jobs

@router.get("/{job_id}", response_description="Get a single job by ID")
async def get_job_by_id(
    job_id: str,
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)]
):
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    job_collection = request.app.db["print_jobs"]
    
    job = await job_collection.find_one({
        "_id": ObjectId(job_id),
        "owner_email": current_user
    })
    
    if job:
        return job_helper(job)
        
    raise HTTPException(status_code=404, detail=f"Job with ID {job_id} not found")

@router.get("/", response_description="Get all jobs for the user")
async def get_all_jobs(
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)]
):
    job_collection = request.app.db["print_jobs"]
    jobs = []
    
    async for job in job_collection.find({"owner_email": current_user}).sort("print_date", -1):
        jobs.append(job_helper(job))
        
    return jobs