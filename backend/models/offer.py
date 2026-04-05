from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class OfferSchema(BaseModel):
    buyer_email: str
    seller_email: str
    listing_id: str
    original_price: int
    current_price: int
    status: str = "pending"
    accepted_by: Optional[str] = None
    history: List[Dict[str, Any]] = []