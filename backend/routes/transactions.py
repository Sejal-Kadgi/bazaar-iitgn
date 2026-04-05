from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import transactions, listings, users
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/transactions", tags=["Transactions"])


class TransactionCreate(BaseModel):
    listing_id: str
    buyer_email: str
    seller_email: str


@router.post("/create")
def create_transaction(data: TransactionCreate):
    try:
        listing = listings.find_one({"_id": ObjectId(data.listing_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid listing ID")

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    buyer_email = data.buyer_email.strip().lower()
    seller_email = data.seller_email.strip().lower()

    # Prevent duplicate active transaction for same listing + buyer + seller
    existing = transactions.find_one({
        "listing_id": data.listing_id,
        "buyer_email": buyer_email,
        "seller_email": seller_email,
        "status": {"$in": ["accepted", "completed"]}
    })

    if existing:
        return {
            "message": "Transaction already exists",
            "transaction_id": str(existing["_id"])
        }

    tx = {
        "listing_id": data.listing_id,
        "buyer_email": buyer_email,
        "seller_email": seller_email,
        "status": "accepted",
        "completed_at": None,
        "buyer_reviewed": False,
        "seller_reviewed": False,
        "created_at": datetime.utcnow()
    }

    result = transactions.insert_one(tx)

    return {
        "message": "Transaction created",
        "transaction_id": str(result.inserted_id)
    }


@router.post("/{transaction_id}/complete")
def complete_transaction(transaction_id: str):
    try:
        tx = transactions.find_one({"_id": ObjectId(transaction_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid transaction ID")

    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if tx["status"] == "completed":
        return {"message": "Transaction already completed"}

    transactions.update_one(
        {"_id": ObjectId(transaction_id)},
        {
            "$set": {
                "status": "completed",
                "completed_at": datetime.utcnow()
            }
        }
    )

    # increment completed trades for buyer and seller
    users.update_one(
        {"email": tx["buyer_email"]},
        {"$inc": {"completed_trades": 1}}
    )
    users.update_one(
        {"email": tx["seller_email"]},
        {"$inc": {"completed_trades": 1}}
    )

    return {"message": "Transaction marked as completed"}


# Required for buyer review flow from item-details
@router.get("/by-offer/{offer_id}")
def get_transaction_by_offer(offer_id: str):
    tx = transactions.find_one({"offer_id": offer_id})

    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    tx["id"] = str(tx["_id"])
    del tx["_id"]
    return tx