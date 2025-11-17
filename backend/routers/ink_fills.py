# --- New File: backend/routers/ink_fills.py ---

from fastapi import APIRouter, Depends, Request
from typing import Annotated, List
from backend.utils.auth import get_current_user

# We need the helper function from the printers router
from backend.routers.printers import ink_fill_helper

router = APIRouter(prefix="/ink-fills", tags=["Ink Fills"])

@router.get(
    "/", 
    response_description="Get all ink fill records for the user"
)
async def get_all_ink_fills(
    request: Request,
    current_user: Annotated[str, Depends(get_current_user)]
):
    """
    Retrieves all ink fill records for the currently authenticated user.
    """
    fills = []
    query = {"owner_email": current_user}
    
    # Sort by timestamp, most recent first
    async for fill in request.app.db["ink_fills"].find(query).sort("timestamp", -1):
        fills.append(ink_fill_helper(fill))
        
    return fills