from pydantic import BaseModel, Field
from typing import List, Optional


class ListingSchema(BaseModel):
    title: str
    price: int = Field(..., gt=0)
    category: str
    hostel: str
    images: List[str] = []
    owner_email: str
    condition: str = "Good"
    description: str = ""
    contact: str = ""
    tags: List[str] = []
    is_flagged: bool = False
    is_hidden: bool = False
    report_count: int = 0
    status: str = "available"


class ListingUpdateSchema(BaseModel):
    title: Optional[str] = None
    price: Optional[int] = Field(None, gt=0)
    category: Optional[str] = None
    hostel: Optional[str] = None
    images: Optional[List[str]] = None
    owner_email: Optional[str] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    contact: Optional[str] = None
    tags: Optional[List[str]] = None