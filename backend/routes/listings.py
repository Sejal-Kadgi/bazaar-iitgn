from fastapi import APIRouter, HTTPException, File, UploadFile
import cloudinary.uploader
from database import listings, watchlist, notifications
from models.listing import ListingSchema, ListingUpdateSchema
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime

router = APIRouter(prefix="/listings", tags=["Listings"])


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    try:
        result = cloudinary.uploader.upload(file.file)
        return {
            "message": "Image uploaded successfully",
            "image_url": result["secure_url"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {str(e)}")


@router.post("/")
def create_listing(data: ListingSchema):
    try:
        listing_data = data.dict()

        # Ensure tags always exist
        listing_data["tags"] = listing_data.get("tags", [])

        # Moderation defaults
        listing_data["is_flagged"] = False
        listing_data["is_hidden"] = False
        listing_data["report_count"] = 0
        listing_data["status"] = "available"

        result = listings.insert_one(listing_data)

        return {
            "message": "Listing created",
            "id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create listing: {str(e)}")


@router.get("/")
def get_listings():
    # Hide listings that are auto-hidden by moderation
    data = list(listings.find({"is_hidden": {"$ne": True}}))

    for item in data:
        item["id"] = str(item["_id"])
        del item["_id"]
        item["tags"] = item.get("tags", [])

    return data


# NEW: Get all listings created by a specific user
@router.get("/my/{email}")
def get_my_listings(email: str):
    data = list(
        listings.find({
            "owner_email": email,
            "is_hidden": {"$ne": True}
        })
    )

    for item in data:
        item["id"] = str(item["_id"])
        del item["_id"]
        item["tags"] = item.get("tags", [])

    return data


@router.get("/{id}")
def get_listing_by_id(id: str):
    try:
        obj_id = ObjectId(id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid listing id")

    item = listings.find_one({"_id": obj_id})

    if not item:
        raise HTTPException(status_code=404, detail="Listing not found")

    item["id"] = str(item["_id"])
    del item["_id"]
    item["tags"] = item.get("tags", [])

    return item


@router.put("/{id}")
def update_listing(id: str, data: ListingUpdateSchema):
    try:
        obj_id = ObjectId(id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid listing id")

    existing = listings.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Listing not found")

    old_price = existing.get("price", 0)

    # Only update fields that were actually sent
    update_data = data.dict(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    # Prevent dangerous placeholder values from Swagger
    if update_data.get("title") == "string":
        raise HTTPException(status_code=400, detail="Invalid title: replace Swagger placeholder 'string'")

    # Preserve tags if not provided
    if "tags" not in update_data:
        update_data["tags"] = existing.get("tags", [])

    # Never allow moderation/system fields to be overwritten here
    update_data["is_flagged"] = existing.get("is_flagged", False)
    update_data["is_hidden"] = existing.get("is_hidden", False)
    update_data["report_count"] = existing.get("report_count", 0)
    update_data["status"] = existing.get("status", "available")

    listings.update_one(
        {"_id": obj_id},
        {"$set": update_data}
    )

    # Determine final new price safely
    new_price = update_data.get("price", old_price)

    print(f"[DEBUG] Listing updated -> id={id}, title={existing.get('title')}")
    print(f"[DEBUG] Old price={old_price}, New price={new_price}")

    # Create price-drop notifications only if price was actually changed and dropped
    if "price" in update_data and new_price < old_price:
        watchers = list(watchlist.find({"listing_id": id}))
        print(f"[DEBUG] Price drop detected. Watchers found={len(watchers)}")

        for watcher in watchers:
            print(f"[DEBUG] Creating notification for {watcher.get('user_email')}")
            notifications.insert_one({
                "user_email": watcher["user_email"],
                "message": f'Price dropped for "{existing.get("title", "an item")}" from ₹{old_price} to ₹{new_price}',
                "listing_id": id,
                "type": "price_drop",
                "read": False,
                "created_at": datetime.utcnow()
            })
    else:
        print("[DEBUG] No price drop detected")

    return {"message": "Listing updated successfully"}


@router.delete("/{id}")
def delete_listing(id: str):
    try:
        obj_id = ObjectId(id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid listing id")

    existing = listings.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Listing not found")

    listings.delete_one({"_id": obj_id})

    return {"message": "Listing deleted successfully"}