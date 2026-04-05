from pydantic import BaseModel

class MessageSchema(BaseModel):
    listing_id: str
    buyer_email: str
    seller_email: str
    sender_email: str
    text: str