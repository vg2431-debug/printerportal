from fastapi import APIRouter, Depends, Request, Body, HTTPException, status
from typing import Annotated, List
from bson import ObjectId
from fastapi.encoders import jsonable_encoder

from backend.models.inventory_model import InkInventoryCreate, InkInventoryUpdate, InkInventoryResponse
from backend.utils.auth import get_current_user

router = APIRouter(prefix="/inventory", tags=["Ink Inventory"])

def inventory_helper(item) -> dict:
    """Converts an inventory item doc from MongoDB to a JSON-serializable dict."""
    return {
        "id": str(item["_id"]),
        "owner_email": item.get("owner_email"),
        "ink_name": item.get("ink_name"),
        "unit_volume_ml": item.get("unit_volume_ml"),
        "stock_on_hand": item.get("stock_on_hand"),
    }

@router.post(
    "/", 
    response_description="Add new ink inventory item", 
    status_code=status.HTTP_201_CREATED,
    response_model=InkInventoryResponse
)
async def create_inventory_item(
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)],
    item_data: InkInventoryCreate = Body(...)
):
    collection = request.app.db["ink_inventory"]
    item_doc = jsonable_encoder(item_data)
    item_doc["owner_email"] = current_user
    
    # Check for duplicate name
    if await collection.find_one({"owner_email": current_user, "ink_name": item_doc["ink_name"]}):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An ink inventory item with the name '{item_doc['ink_name']}' already exists."
        )

    new_item = await collection.insert_one(item_doc)
    created_item = await collection.find_one({"_id": new_item.inserted_id})
    return inventory_helper(created_item)

@router.get(
    "/", 
    response_description="List all ink inventory items", 
    response_model=List[InkInventoryResponse]
)
async def list_inventory_items(
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)]
):
    collection = request.app.db["ink_inventory"]
    items = []
    async for item in collection.find({"owner_email": current_user}):
        items.append(inventory_helper(item))
    return items

@router.put(
    "/{id}", 
    response_description="Update an ink inventory item",
    response_model=InkInventoryResponse
)
async def update_inventory_item(
    id: str,
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)],
    item_data: InkInventoryUpdate = Body(...)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
        
    collection = request.app.db["ink_inventory"]
    
    # Exclude unset fields from the update
    update_data = item_data.dict(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    result = await collection.update_one(
        {"_id": ObjectId(id), "owner_email": current_user},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found or you do not have permission")

    updated_item = await collection.find_one({"_id": ObjectId(id)})
    return inventory_helper(updated_item)

@router.delete(
    "/{id}", 
    response_description="Delete an ink inventory item", 
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_inventory_item(
    id: str,
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)]
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
        
    collection = request.app.db["ink_inventory"]
    
    result = await collection.delete_one({"_id": ObjectId(id), "owner_email": current_user})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found or you do not have permission")
        
    return