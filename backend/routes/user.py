from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import users, listings, offers, watchlist, notifications
from datetime import datetime

router = APIRouter(prefix="/user", tags=["User"])


# =========================
# NEW: Edit Profile Schema
# =========================
class UpdateProfileSchema(BaseModel):
    email: str
    full_name: str
    phone: str
    hostel: str


def get_trust_label(score: int):
    if score <= 30:
        return "New Seller"
    elif score <= 60:
        return "Trusted Seller"
    elif score <= 85:
        return "Highly Trusted Seller"
    return "Bazaar Legend"


@router.get("/profile/{email}")
def profile(email: str):
    user = users.find_one({"email": email})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # -----------------------------
    # Basic stats
    # -----------------------------
    listings_count = listings.count_documents({"owner_email": email})
    offers_count = offers.count_documents({"buyer_email": email})
    watchlist_count = watchlist.count_documents({"user_id": email})
    alerts_count = notifications.count_documents({"user_id": email})

    # -----------------------------
    # Successful trades
    # Assumes offers collection has:
    # buyer_email, seller_email, status
    # successful = accepted or completed
    # -----------------------------
    successful_trades = offers.count_documents({
        "$or": [
            {"buyer_email": email, "status": {"$in": ["accepted", "completed"]}},
            {"seller_email": email, "status": {"$in": ["accepted", "completed"]}}
        ]
    })

    # -----------------------------
    # Account age calculation
    # -----------------------------
    created_at = user.get("created_at")

    if created_at:
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at)
            except:
                created_at = None

    if created_at and isinstance(created_at, datetime):
        account_age_days = max((datetime.utcnow() - created_at).days, 0)
    else:
        # fallback for old users who don't have created_at
        account_age_days = 0

    # -----------------------------
    # Verification check
    # -----------------------------
    verified = email.endswith("@iitgn.ac.in")

    # -----------------------------
    # Karma Score formula
    # 4 points per month of account age
    # 6 points per successful trade
    # +10 if verified IITGN email
    # max = 100
    # -----------------------------
    karma_score = min(
        100,
        ((account_age_days // 30) * 4) +
        (successful_trades * 6) +
        (10 if verified else 0)
    )

    trust_label = get_trust_label(karma_score)

    return {
        "email": user["email"],
        "role": user.get("role", "user"),
        "full_name": user.get("full_name", ""),
        "phone": user.get("phone", ""),
        "hostel": user.get("hostel", ""),
        "verified": verified,

        # New Karma object
        "karma": {
            "score": karma_score,
            "trust_label": trust_label,
            "account_age_days": account_age_days,
            "successful_trades": successful_trades
        },

        # Keep old field also (optional, for compatibility)
        "karma_score": karma_score,

        "stats": {
            "listings": listings_count,
            "offers": offers_count,
            "watchlist": watchlist_count,
            "alerts": alerts_count,
        }
    }


# =========================
# NEW: Update Profile Route
# =========================
@router.put("/update-profile")
def update_profile(data: UpdateProfileSchema):
    user = users.find_one({"email": data.email})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    users.update_one(
        {"email": data.email},
        {
            "$set": {
                "full_name": data.full_name,
                "phone": data.phone,
                "hostel": data.hostel
            }
        }
    )

    return {"message": "Profile updated successfully"}


@router.get("/my-listings/{email}")
def my_listings(email: str):
    data = list(listings.find({"owner_email": email}))
    for i in data:
        i["id"] = str(i["_id"])
        del i["_id"]
    return data


@router.get("/watchlist/{email}")
def get_watchlist(email: str):
    # Get watchlist entries for this user
    watchlist_entries = list(watchlist.find({"user_email": email}, {"_id": 0}))

    # Extract listing IDs (stored as strings of Mongo _id)
    listing_ids = [str(entry["listing_id"]) for entry in watchlist_entries if "listing_id" in entry]

    if not listing_ids:
        return []

    # Get all listings and match by Mongo _id converted to string
    all_listings = list(listings.find({}))

    matched_items = []
    for item in all_listings:
        item_id = str(item["_id"])
        if item_id in listing_ids:
            item["id"] = item_id
            del item["_id"]
            matched_items.append(item)

    return matched_items


@router.get("/notifications/{email}")
def get_notifications(email: str):
    data = list(notifications.find({"user_id": email}))
    for i in data:
        i["id"] = str(i["_id"])
        del i["_id"]
    return data