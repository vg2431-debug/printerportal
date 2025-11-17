from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import List, Optional, Literal, Dict

class Specification(BaseModel):
    """Defines the technical specifications of the printer."""
    printer_width: int = Field(..., description="Width of the printer")
    printer_length: Optional[int] = Field(None, description="Length of the printer")
    unit: Literal["mm", "cm", "meters", "inches", "feet"] = Field(..., description="Measurement unit for size")
    print_head: str = Field(..., description="Print head model or type")
    head_nos: int = Field(..., description="Number of print heads")
    rip_software: Optional[str] = Field(None, description="RIP software used (e.g., Onyx, Caldera)")
    printer_control_system: str = Field(..., description="Printer control board hardware (e.g., BYHX, Hoson)")

class Printer(BaseModel):
    """Main model for registering a new printer."""
    owner_email: Optional[EmailStr] = None
    printer_name: str = Field(..., description="A user-friendly name for the printer")
    printer_main_category: str = Field(..., description="e.g., Large Format, DTG, Laser")
    printer_sub_category: Optional[str] = None
    brand: str
    model: str
    serial_number: str = Field(..., description="Unique serial number of the printer")
    vendor: Optional[str] = None
    install_date: Optional[datetime] = None
    color_nos: int = Field(..., gt=0, description="Number of ink channels")
    inks: List[str] = Field(..., description="List of ink color names")
    specification: Specification
    location: str
    department: Optional[str] = None
    ink_costs: Dict[str, float] = Field(default_factory=dict, description="Printer-specific ink cost per liter")
    
    # --- THIS IS THE NEW FIELD ---
    ink_link: Dict[str, Optional[str]] = Field(default_factory=dict, description="Links an ink channel (e.g., 'cyan') to an InkInventoryItem ID")
    # --- END NEW FIELD ---

    status: Literal["Online", "Offline", "Error", "Maintenance"] = "Online"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        str_strip_whitespace = True