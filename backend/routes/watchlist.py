from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import watchlist, listings
from bson import ObjectId

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


class WatchlistSchema(BaseModel):
    user_email: str
    listing_id: str


@router.post("/add")
def add_to_watchlist(data: WatchlistSchema):
    existing = watchlist.find_one({
        "user_email": data.user_email,
        "listing_id": str(data.listing_id)
    })

    if existing:
        return {"message": "Already in watchlist"}

    watchlist.insert_one({
        "user_email": data.user_email,
        "listing_id": str(data.listing_id)
    })

    return {"message": "Added to watchlist"}


# RECOMMENDED: use query params
@router.delete("/remove")
def remove_from_watchlist(user_email: str, listing_id: str):
    result = watchlist.delete_one({
        "user_email": user_email,
        "listing_id": str(listing_id)
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found in watchlist")

    return {"message": "Removed from watchlist"}


@router.get("/{user_email}")
def get_watchlist(user_email: str):
    watchlist_items = list(watchlist.find({"user_email": user_email}))

    listing_ids = []
    for item in watchlist_items:
        try:
            listing_ids.append(ObjectId(item["listing_id"]))
        except:
            pass

    if not listing_ids:
        return []

    watched_listings = list(listings.find({"_id": {"$in": listing_ids}}))

    for listing in watched_listings:
        listing["id"] = str(listing["_id"])
        del listing["_id"]

    return watched_listings