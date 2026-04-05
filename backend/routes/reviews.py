from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import reviews, transactions, users
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/reviews", tags=["Reviews"])


# -----------------------------
# Schemas
# -----------------------------
class ReviewCreate(BaseModel):
    transaction_id: str
    reviewer_email: str
    reviewee_email: str
    rating: int
    comment: str = ""


# -----------------------------
# Create Review (BUYER ONLY)
# -----------------------------
@router.post("/")
def create_review(data: ReviewCreate):
    reviewer_email = data.reviewer_email.strip().lower()
    reviewee_email = data.reviewee_email.strip().lower()

    if reviewer_email == reviewee_email:
        raise HTTPException(status_code=400, detail="You cannot review yourself")

    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    # Validate transaction ID
    try:
        tx = transactions.find_one({"_id": ObjectId(data.transaction_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid transaction ID")

    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Only completed transactions can be reviewed
    if tx.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Reviews unlock only after transaction is completed")

    # BUYER ONLY can review
    if reviewer_email != tx["buyer_email"]:
        raise HTTPException(status_code=403, detail="Only the buyer can leave a review")

    # Buyer can only review seller
    if reviewee_email != tx["seller_email"]:
        raise HTTPException(status_code=400, detail="Buyer can only review the seller")

    # Prevent duplicate buyer review
    if tx.get("buyer_reviewed") is True:
        raise HTTPException(status_code=400, detail="You have already reviewed this transaction")

    # Extra safety check
    existing = reviews.find_one({
        "transaction_id": data.transaction_id,
        "reviewer_email": reviewer_email
    })

    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this transaction")

    review_doc = {
        "transaction_id": data.transaction_id,
        "reviewer_email": reviewer_email,
        "reviewee_email": reviewee_email,
        "rating": data.rating,
        "comment": data.comment.strip(),
        "created_at": datetime.utcnow()
    }

    reviews.insert_one(review_doc)

    # Mark buyer review complete
    transactions.update_one(
        {"_id": ObjectId(data.transaction_id)},
        {"$set": {"buyer_reviewed": True}}
    )

    # Recalculate seller rating stats
    all_reviews = list(reviews.find({"reviewee_email": reviewee_email}))
    total_reviews = len(all_reviews)
    avg_rating = round(
        sum(r.get("rating", 0) for r in all_reviews) / total_reviews,
        2
    ) if total_reviews > 0 else 0

    users.update_one(
        {"email": reviewee_email},
        {
            "$set": {
                "average_rating": avg_rating,
                "reviews_received_count": total_reviews
            }
        }
    )

    return {
        "message": "Review submitted successfully",
        "average_rating": avg_rating,
        "reviews_received_count": total_reviews
    }


# -----------------------------
# Get reviews received by a user
# -----------------------------
@router.get("/user/{email}")
def get_reviews_for_user(email: str):
    email = email.strip().lower()

    data = list(reviews.find({"reviewee_email": email}).sort("created_at", -1))

    formatted = []
    for r in data:
        formatted.append({
            "id": str(r["_id"]),
            "transaction_id": r["transaction_id"],
            "reviewer_email": r["reviewer_email"],
            "reviewee_email": r["reviewee_email"],
            "rating": r["rating"],
            "comment": r.get("comment", ""),
            "created_at": r["created_at"]
        })

    return {
        "reviews": formatted,
        "count": len(formatted)
    }