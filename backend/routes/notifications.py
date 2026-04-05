from fastapi import APIRouter, HTTPException
from database import notifications
from bson import ObjectId
from bson.errors import InvalidId

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/{user_email}")
def get_notifications(user_email: str):
    data = list(
        notifications.find({"user_email": user_email}).sort("created_at", -1)
    )

    for item in data:
        item["id"] = str(item["_id"])
        del item["_id"]

    return data


@router.put("/read/{notification_id}")
def mark_notification_read(notification_id: str):
    try:
        obj_id = ObjectId(notification_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid notification id")

    result = notifications.update_one(
        {"_id": obj_id},
        {"$set": {"read": True}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"message": "Notification marked as read"}


@router.put("/read-all/{user_email}")
def mark_all_notifications_read(user_email: str):
    notifications.update_many(
        {"user_email": user_email, "read": False},
        {"$set": {"read": True}}
    )

    return {"message": "All notifications marked as read"}

