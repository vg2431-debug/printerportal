from fastapi import APIRouter, Depends, Request, Body, HTTPException
from typing import Annotated
from fastapi.encoders import jsonable_encoder

from backend.models.settings_model import UserSettings, UserSettingsUpdate
from backend.utils.auth import get_current_user

router = APIRouter(prefix="/settings", tags=["User Settings"])

@router.get("/", response_description="Get user settings", response_model=UserSettings)
async def get_user_settings(
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)]
):
    """
    Retrieves the user's settings (coefficient, currency).
    If no settings exist, it creates and returns default settings.
    """
    settings_collection = request.app.db["user_settings"]
    settings = await settings_collection.find_one({"owner_email": current_user})
    
    if settings:
        return UserSettings(**settings) # Use model to ensure all fields are present
    
    # If no settings, create default ones
    default_settings = UserSettings(owner_email=current_user)
    await settings_collection.insert_one(default_settings.dict())
    return default_settings

@router.post("/", response_description="Update user settings", response_model=UserSettings)
async def update_user_settings(
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)],
    settings_data: UserSettingsUpdate = Body(...)
):
    """
    Updates or creates the user's settings.
    """
    settings_collection = request.app.db["user_settings"]
    
    update_data = jsonable_encoder(settings_data)
    
    await settings_collection.update_one(
        {"owner_email": current_user},
        {
            "$set": {
                "cost_coefficient": update_data["cost_coefficient"],
                "currency_symbol": update_data["currency_symbol"]
            },
            "$setOnInsert": {"owner_email": current_user}
        },
        upsert=True
    )
    
    updated_settings = await settings_collection.find_one({"owner_email": current_user})
    if updated_settings:
        return UserSettings(**updated_settings)
        
    raise HTTPException(status_code=404, detail="Settings not found after update.")