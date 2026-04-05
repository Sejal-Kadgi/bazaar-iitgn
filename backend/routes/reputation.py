from fastapi import APIRouter, HTTPException
from database import users
from datetime import datetime

router = APIRouter(prefix="/reputation", tags=["Reputation"])


def calculate_karma(user_doc):
    base = 10
    completed_trades = user_doc.get("completed_trades", 0)
    reviews_count = user_doc.get("reviews_received_count", 0)
    avg_rating = user_doc.get("average_rating", 0)
    valid_reports = user_doc.get("valid_reports_count", 0)
    created_at = user_doc.get("created_at")

    # Account age bonus
    age_bonus = 0
    if created_at:
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        days_old = (datetime.utcnow() - created_at).days
        if days_old > 90:
            age_bonus = 10
        elif days_old > 30:
            age_bonus = 5

    positive_reviews = reviews_count if avg_rating >= 4 else 0

    karma = base + (5 * completed_trades) + (2 * positive_reviews) + age_bonus - (5 * valid_reports)
    return max(0, karma)


@router.get("/{email}")
def get_reputation(email: str):
    email = email.strip().lower()
    user = users.find_one({"email": email}, {"_id": 0, "password": 0})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    karma = calculate_karma(user)

    users.update_one(
        {"email": email},
        {"$set": {"karma_score": karma}}
    )

    trust_badge = "New User"
    if karma >= 50:
        trust_badge = "Top Seller"
    elif karma >= 30:
        trust_badge = "Trusted Trader"
    elif karma >= 15:
        trust_badge = "Verified Trader"

    return {
        "email": email,
        "karma_score": karma,
        "completed_trades": user.get("completed_trades", 0),
        "average_rating": user.get("average_rating", 0),
        "reviews_received_count": user.get("reviews_received_count", 0),
        "valid_reports_count": user.get("valid_reports_count", 0),
        "trust_badge": trust_badge
    }