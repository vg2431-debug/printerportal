from fastapi import APIRouter, HTTPException, status, Body, Request, Depends
from typing import List, Annotated
from bson import ObjectId
from datetime import datetime
from fastapi.encoders import jsonable_encoder

from backend.models.printer_model import Printer
from backend.utils.auth import get_current_user
from backend.models.ink_fill_model import InkFillCreate, InkFillRecord

router = APIRouter(prefix="/printers", tags=["Printers"])

# --- Helper Functions ---

def printer_helper(printer) -> dict:
    """
    Helper to convert MongoDB doc to dict and str(ObjectId)
    V3: Added ink_link
    """
    return {
        "id": str(printer["_id"]),
        "owner_email": printer.get("owner_email"),
        "printer_name": printer.get("printer_name"),
        "brand": printer.get("brand"),
        "model": printer.get("model"),
        "serial_number": printer.get("serial_number"),
        "location": printer.get("location"),
        "status": printer.get("status"),
        "inks": printer.get("inks", []),
        "ink_costs": printer.get("ink_costs", {}),
        "ink_link": printer.get("ink_link", {})
    }

def ink_fill_helper(fill) -> dict:
    """Converts an ink_fill document to a JSON-serializable dict."""
    return {
        "id": str(fill["_id"]),
        "color": fill.get("color"),
        "amount_liters": fill.get("amount_liters"),
        "owner_email": fill.get("owner_email"),
        "printer_id": str(fill.get("printer_id")),
        "timestamp": fill.get("timestamp").isoformat() if fill.get("timestamp") else None,
    }

# --- Printer CRUD Endpoints ---

@router.post("/", response_description="Register a new printer", status_code=status.HTTP_201_CREATED)
async def register_printer(
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)],
    printer_data: Printer = Body(...)
):
    printer_collection = request.app.db["printers"]
    
    printer_data.owner_email = current_user
    printer_data.created_at = datetime.utcnow()
    printer_data.updated_at = datetime.utcnow()
    
    printer_dict = jsonable_encoder(printer_data)

    if await printer_collection.find_one({"serial_number": printer_dict["serial_number"]}):
        raise HTTPException(status_code=409, detail=f"Printer with serial number {printer_dict['serial_number']} already exists.")

    new_printer = await printer_collection.insert_one(printer_dict)
    created_printer = await printer_collection.find_one({"_id": new_printer.inserted_id})
    
    return printer_helper(created_printer)


@router.get("/", response_description="List all of your printers")
async def list_all_printers(
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)]
):
    printers = []
    async for printer in request.app.db["printers"].find({"owner_email": current_user}):
        printers.append( printer_helper(printer) )
    return printers


@router.get("/{id}", response_description="Get a single printer by ID")
async def get_printer(
    id: str,
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)]
):
    printer_collection = request.app.db["printers"]
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail=f"Invalid printer ID: {id}")

    printer = await printer_collection.find_one({
        "_id": ObjectId(id), 
        "owner_email": current_user
    })
    
    if printer:
        printer["id"] = str(printer["_id"])
        printer.pop("_id", None)
        return printer
        
    raise HTTPException(status_code=404, detail=f"Printer with ID {id} not found")


@router.put("/{id}", response_description="Update a printer's details")
async def update_printer(
    id: str,
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)],
    printer_data: Printer = Body(...)
):
    printer_collection = request.app.db["printers"]
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail=f"Invalid printer ID: {id}")

    existing_printer = await printer_collection.find_one({
        "_id": ObjectId(id), 
        "owner_email": current_user
    })
    if not existing_printer:
        raise HTTPException(status_code=404, detail=f"Printer with ID {id} not found or you don't have permission")

    update_data = jsonable_encoder(printer_data)
    
    # Fields that should NOT be updated
    update_data.pop("owner_email", None)
    update_data.pop("created_at", None)
    update_data.pop("_id", None)
    update_data.pop("id", None) 
    
    update_data["updated_at"] = datetime.utcnow()

    updated_result = await printer_collection.update_one(
        {"_id": ObjectId(id)}, {"$set": update_data}
    )

    if updated_result.modified_count >= 0:
        updated_printer = await printer_collection.find_one({"_id": ObjectId(id)})
        return printer_helper(updated_printer)

    raise HTTPException(status_code=500, detail="Failed to update printer.")


@router.delete("/{id}", response_description="Delete a printer", status_code=status.HTTP_204_NO_CONTENT)
async def delete_printer(
    id: str,
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)]
):
    printer_collection = request.app.db["printers"]
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail=f"Invalid printer ID: {id}")

    delete_result = await printer_collection.delete_one({"_id": ObjectId(id), "owner_email": current_user})

    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Printer with ID {id} not found or you don't have permission")

# --- Ink Fill Endpoints ---

@router.post(
    "/{printer_id}/ink-fill", 
    response_description="Record a manual ink fill for a printer", 
    status_code=status.HTTP_201_CREATED
)
async def record_ink_fill(
    printer_id: str,
    request: Request,
    ink_data: InkFillCreate,
    current_user: Annotated[str, Depends(get_current_user)]
):
    printer_collection = request.app.db["printers"]
    ink_fill_collection = request.app.db["ink_fills"]
    
    if not ObjectId.is_valid(printer_id):
        raise HTTPException(status_code=400, detail="Invalid printer ID")
        
    printer = await printer_collection.find_one({
        "_id": ObjectId(printer_id), 
        "owner_email": current_user
    })
    
    if printer is None:
        raise HTTPException(
            status_code=404, 
            detail="Printer not found or you do not have permission."
        )
        
    printer_inks = printer.get("inks", [])
    printer_inks_lowercase = [ink.lower() for ink in printer_inks]
    incoming_color_lowercase = ink_data.color.lower()
    
    if incoming_color_lowercase not in printer_inks_lowercase:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ink color '{ink_data.color}'. This printer only supports: {', '.join(printer_inks)}"
        )
    
    original_color = printer_inks[printer_inks_lowercase.index(incoming_color_lowercase)]

    ink_record = InkFillRecord(
        color=original_color,
        amount_liters=ink_data.amount_liters,
        owner_email=current_user,
        printer_id=printer_id
    )
    
    new_record = await ink_fill_collection.insert_one(ink_record.dict())
    
    return {
        "message": "Ink fill recorded successfully",
        "record_id": str(new_record.inserted_id)
    }

@router.get(
    "/{printer_id}/ink-fills", 
    response_description="Get all ink fill records for a specific printer"
)
async def get_ink_fills_for_printer(
    printer_id: str,
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)]
):
    if not ObjectId.is_valid(printer_id):
        raise HTTPException(status_code=400, detail="Invalid printer ID")

    printer = await request.app.db["printers"].find_one({
        "_id": ObjectId(printer_id),
        "owner_email": current_user
    })
    
    if printer is None:
        raise HTTPException(
            status_code=404, # <-- THIS WAS THE TYPO (4LOS)
            detail="Printer not found or you do not have permission."
        )

    fills = []
    query = {"owner_email": current_user, "printer_id": printer_id} 
    
    async for fill in request.app.db["ink_fills"].find(query).sort("timestamp", -1):
        fills.append(ink_fill_helper(fill))
        
    return fills