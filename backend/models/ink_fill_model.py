from pydantic import BaseModel, Field, EmailStr
from datetime import datetime

class InkFillCreate(BaseModel):
    """
    Pydantic model for validating incoming ink fill data from the local agent.
    A single fill event for one color.
    """
    color: str = Field(..., description="The color of ink being filled, e.g., 'Cyan'")
    amount_litters: float = Field(..., gt=0, description="The amount of ink in liters")

class InkFillRecord(InkFillCreate):
    owner_email: EmailStr
    printer_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)