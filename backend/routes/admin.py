from fastapi import APIRouter, HTTPException
from database import listings, users, reports
from auth import is_admin
from bson import ObjectId

router = APIRouter(prefix="/admin")

@router.get("/listings")
def get_all(email: str):
    if not is_admin(email):
        raise HTTPException(403, "Not authorized")

    data = list(listings.find())
    for i in data:
        i["id"] = str(i["_id"])
        del i["_id"]
    return data

@router.delete("/listing/{id}")
def delete_listing(id: str, email: str):
    if not is_admin(email):
        raise HTTPException(403, "Not authorized")

    listings.delete_one({"_id": ObjectId(id)})
    return {"message": "Deleted"}

@router.get("/reports")
def get_reports(email: str):
    if not is_admin(email):
        raise HTTPException(403, "Not authorized")

    data = list(reports.find())
    for i in data:
        i["id"] = str(i["_id"])
        del i["_id"]
    return data

@router.get("/users")
def get_users(email: str):
    if not is_admin(email):
        raise HTTPException(403, "Not authorized")

    data = list(users.find())
    for i in data:
        i["id"] = str(i["_id"])
        del i["_id"]
        i.pop("password", None)
    return data

@router.put("/report/resolve/{report_id}")
def resolve_report(report_id: str, email: str):
    if not is_admin(email):
        raise HTTPException(403, "Not authorized")

    reports.update_one(
        {"_id": ObjectId(report_id)},
        {"$set": {"status": "resolved"}}
    )
    return {"message": "Report marked resolved"}

@router.put("/user/promote/{user_id}")
def promote_user(user_id: str, email: str):
    if not is_admin(email):
        raise HTTPException(403, "Not authorized")

    users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": "admin"}}
    )
    return {"message": "User promoted to admin"}

@router.put("/user/flag/{user_id}")
def flag_user(user_id: str, email: str):
    if not is_admin(email):
        raise HTTPException(403, "Not authorized")

    users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"banned": True}}
    )
    return {"message": "User flagged"}