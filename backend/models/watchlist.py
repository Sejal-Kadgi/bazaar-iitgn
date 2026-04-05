from pydantic import BaseModel

class WatchlistSchema(BaseModel):
    user_email: str
    listing_id: str