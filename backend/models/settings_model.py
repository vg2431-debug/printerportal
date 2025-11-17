from pydantic import BaseModel, Field, EmailStr
from typing import Dict, Optional

# This model is no longer used for ink
class InkCost(BaseModel):
    color_name: str
    price_per_liter: float

class UserSettings(BaseModel):
    owner_email: EmailStr
    # ink_costs: Dict[str, float] = Field(default_factory=dict) # <-- REMOVED
    cost_coefficient: float = 1.0
    currency_symbol: str = "₹" # <-- ADDED

class UserSettingsUpdate(BaseModel):
    # ink_costs: Dict[str, float] # <-- REMOVED
    cost_coefficient: float
    currency_symbol: str # <-- ADDED