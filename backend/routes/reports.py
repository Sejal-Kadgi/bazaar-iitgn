from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import reports, listings, users
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/reports", tags=["Reports"])


class ReportCreate(BaseModel):
    reporter_email: str
    target_type: str   # "listing" or "user"
    target_id: str = ""   # listing id if target_type == listing
    target_user_email: str = ""
    reason: str
    description: str = ""


@router.post("/")
def create_report(data: ReportCreate):
    reporter = data.reporter_email.strip().lower()
    target_user_email = data.target_user_email.strip().lower() if data.target_user_email else ""

    if data.target_type not in ["listing", "user"]:
        raise HTTPException(status_code=400, detail="target_type must be 'listing' or 'user'")

    # Prevent duplicate reports by same user on same target
    existing = reports.find_one({
        "reporter_email": reporter,
        "target_type": data.target_type,
        "target_id": data.target_id,
        "target_user_email": target_user_email
    })

    if existing:
        raise HTTPException(status_code=400, detail="You already reported this target")

    report_doc = {
        "reporter_email": reporter,
        "target_type": data.target_type,
        "target_id": data.target_id,
        "target_user_email": target_user_email,
        "reason": data.reason,
        "description": data.description.strip(),
        "status": "pending",
        "created_at": datetime.utcnow()
    }

    result = reports.insert_one(report_doc)

    # If listing report, increment report count
    if data.target_type == "listing" and data.target_id:
        listing = listings.find_one({"_id": ObjectId(data.target_id)})
        if listing:
            new_count = listing.get("report_count", 0) + 1
            is_flagged = new_count >= 1
            is_hidden = new_count >= 3  # auto-hide after 3 reports

            listings.update_one(
                {"_id": ObjectId(data.target_id)},
                {
                    "$set": {
                        "report_count": new_count,
                        "is_flagged": is_flagged,
                        "is_hidden": is_hidden
                    }
                }
            )

    return {
        "message": "Report submitted successfully",
        "report_id": str(result.inserted_id)
    }


@router.get("/admin/all")
def get_all_reports():
    all_reports = list(reports.find().sort("created_at", -1))

    formatted = []
    for r in all_reports:
        r["_id"] = str(r["_id"])
        formatted.append(r)

    return {"reports": formatted}


@router.patch("/admin/{report_id}")
def update_report_status(report_id: str, status: str):
    if status not in ["pending", "reviewed", "resolved", "dismissed"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    report = reports.find_one({"_id": ObjectId(report_id)})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    reports.update_one(
        {"_id": ObjectId(report_id)},
        {"$set": {"status": status}}
    )

    # If report against user is resolved, count as valid report
    if status == "resolved" and report["target_type"] == "user" and report.get("target_user_email"):
        users.update_one(
            {"email": report["target_user_email"]},
            {"$inc": {"valid_reports_count": 1}}
        )

    return {"message": f"Report marked as {status}"}