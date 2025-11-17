from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class InkInventoryBase(BaseModel):
    """
    The base model for an ink inventory item.
    """
    ink_name: str = Field(..., description="User-defined name, e.g., 'UV Cyan (1L Bottle)'")
    unit_volume_ml: int = Field(..., gt=0, description="Amount of ink in one unit, e.g., 1000")
    stock_on_hand: int = Field(..., ge=0, description="Number of units (bottles/pouches) in stock")

class InkInventoryCreate(InkInventoryBase):
    """
    Model used when creating a new inventory item.
    """
    pass

class InkInventoryUpdate(BaseModel):
    """
    Model used when updating an inventory item. All fields are optional.
    """
    ink_name: Optional[str] = None
    unit_volume_ml: Optional[int] = None
    stock_on_hand: Optional[int] = None

class InkInventoryResponse(InkInventoryBase):
    """
    The full model to be returned to the frontend, including the ID.
    """
    id: str
    owner_email: EmailStr