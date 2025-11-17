from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional, Dict, List

class PrintJob(BaseModel):
    """
    Defines the data model for a print job log.
    This is the class that jobs.py is trying to import.
    """
    printer_id: str
    owner_email: EmailStr
    job_name: str
    job_status: str
    copies: int = Field(default=1, gt=0)
    print_date: datetime
    
    # Dimensions
    width_mm: float
    length_mm: float
    printed_area_sqm: float
    printed_length_m: float
    
    # Ink
    total_ink_ml: float
    ink_consumption_ml: Dict[str, float] = Field(default_factory=dict)
    
    # Print Settings
    dpi_x: int
    dpi_y: int
    print_mode: str
    speed: str
    printed_pass: int

    class Config:
        str_strip_whitespace = True