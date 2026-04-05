from pydantic import BaseModel

class ReportSchema(BaseModel):
    user_email: str
    listing_id: str
    reason: str
    status: str = "pending"