from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import offers, listings, notifications, transactions, users
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/offers", tags=["Offers"])


# -----------------------------
# Schemas
# -----------------------------
class CreateOfferSchema(BaseModel):
    listing_id: str
    buyer_email: str
    offer_price: int


class CounterOfferSchema(BaseModel):
    offer_id: str
    user_email: str
    counter_price: int


class OfferActionSchema(BaseModel):
    offer_id: str
    user_email: str


# -----------------------------
# Helpers
# -----------------------------
def serialize_offer(offer):
    offer["id"] = str(offer["_id"])
    del offer["_id"]
    return offer


def add_notification(user_id: str, message: str):
    notifications.insert_one({
        "user_id": user_id,
        "message": message,
        "created_at": datetime.utcnow(),
        "read": False
    })


# -----------------------------
# Create Offer
# Buyer makes first offer
# -----------------------------
@router.post("/create")
def create_offer(payload: CreateOfferSchema):
    try:
        listing = listings.find_one({"_id": ObjectId(payload.listing_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid listing ID")

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    # Prevent offers on reserved/sold items
    if listing.get("status") in ["reserved", "sold"]:
        raise HTTPException(
            status_code=400,
            detail=f"This item is already {listing.get('status')} and not available for offers"
        )

    seller_email = listing["owner_email"]

    if payload.buyer_email == seller_email:
        raise HTTPException(status_code=400, detail="You cannot make an offer on your own listing")

    # Prevent duplicate active offer by same buyer on same listing
    existing = offers.find_one({
        "listing_id": payload.listing_id,
        "buyer_email": payload.buyer_email,
        "status": {"$in": ["pending", "countered", "accepted"]}
    })

    if existing:
        raise HTTPException(status_code=400, detail="Active offer already exists for this listing")

    now = datetime.utcnow()

    offer_doc = {
        "listing_id": payload.listing_id,
        "buyer_email": payload.buyer_email,
        "seller_email": seller_email,
        "original_price": listing.get("price", 0),
        "current_price": payload.offer_price,
        "status": "pending",
        "accepted_by": None,
        "created_at": now,
        "updated_at": now,
        "history": [
            {
                "by": payload.buyer_email,
                "action": "proposed",
                "price": payload.offer_price,
                "timestamp": now.isoformat()
            }
        ]
    }

    result = offers.insert_one(offer_doc)
    offer_doc["_id"] = result.inserted_id

    add_notification(
        seller_email,
        f"New offer of ₹{payload.offer_price} received for '{listing.get('title', 'your listing')}'"
    )

    return {
        "message": "Offer created successfully",
        "offer": serialize_offer(offer_doc)
    }


# -----------------------------
# Counter Offer
# Buyer or Seller can counter
# -----------------------------
@router.post("/counter")
def counter_offer(payload: CounterOfferSchema):
    try:
        offer = offers.find_one({"_id": ObjectId(payload.offer_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid offer ID")

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if offer["status"] not in ["pending", "countered"]:
        raise HTTPException(status_code=400, detail="Offer can no longer be countered")

    if payload.user_email not in [offer["buyer_email"], offer["seller_email"]]:
        raise HTTPException(status_code=403, detail="Not authorized for this offer")

    # Prevent same user from countering twice in a row
    last_action = offer.get("history", [])[-1] if offer.get("history") else None
    if last_action and last_action.get("by") == payload.user_email:
        raise HTTPException(status_code=400, detail="Wait for the other party to respond")

    other_party = offer["seller_email"] if payload.user_email == offer["buyer_email"] else offer["buyer_email"]
    now = datetime.utcnow()

    offers.update_one(
        {"_id": ObjectId(payload.offer_id)},
        {
            "$set": {
                "current_price": payload.counter_price,
                "status": "countered",
                "updated_at": now
            },
            "$push": {
                "history": {
                    "by": payload.user_email,
                    "action": "countered",
                    "price": payload.counter_price,
                    "timestamp": now.isoformat()
                }
            }
        }
    )

    add_notification(
        other_party,
        f"Counter-offer received: ₹{payload.counter_price}"
    )

    updated_offer = offers.find_one({"_id": ObjectId(payload.offer_id)})
    return {
        "message": "Counter-offer sent successfully",
        "offer": serialize_offer(updated_offer)
    }


# -----------------------------
# Accept Offer / Accept Counter
# -----------------------------
@router.post("/accept")
def accept_offer(payload: OfferActionSchema):
    try:
        offer = offers.find_one({"_id": ObjectId(payload.offer_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid offer ID")

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if offer["status"] not in ["pending", "countered"]:
        raise HTTPException(status_code=400, detail="Offer cannot be accepted")

    if payload.user_email not in [offer["buyer_email"], offer["seller_email"]]:
        raise HTTPException(status_code=403, detail="Not authorized for this offer")

    # Cannot accept your own latest offer
    last_action = offer.get("history", [])[-1] if offer.get("history") else None
    if last_action and last_action.get("by") == payload.user_email:
        raise HTTPException(status_code=400, detail="You cannot accept your own latest offer")

    other_party = offer["seller_email"] if payload.user_email == offer["buyer_email"] else offer["buyer_email"]
    now = datetime.utcnow()

    offers.update_one(
        {"_id": ObjectId(payload.offer_id)},
        {
            "$set": {
                "status": "accepted",
                "accepted_by": payload.user_email,
                "updated_at": now
            },
            "$push": {
                "history": {
                    "by": payload.user_email,
                    "action": "accepted",
                    "price": offer["current_price"],
                    "timestamp": now.isoformat()
                }
            }
        }
    )

    # Mark listing as reserved when offer is accepted
    try:
        listings.update_one(
            {"_id": ObjectId(offer["listing_id"])},
            {"$set": {"status": "reserved"}}
        )
    except:
        pass

    # Auto-reject all other active offers for the same listing
    offers.update_many(
        {
            "listing_id": offer["listing_id"],
            "_id": {"$ne": ObjectId(payload.offer_id)},
            "status": {"$in": ["pending", "countered"]}
        },
        {
            "$set": {
                "status": "rejected",
                "updated_at": now
            }
        }
    )

    add_notification(
        other_party,
        f"Your offer has been accepted at ₹{offer['current_price']}"
    )

    updated_offer = offers.find_one({"_id": ObjectId(payload.offer_id)})
    return {
        "message": "Offer accepted successfully",
        "offer": serialize_offer(updated_offer)
    }


# -----------------------------
# Reject Offer / Reject Counter
# -----------------------------
@router.post("/reject")
def reject_offer(payload: OfferActionSchema):
    try:
        offer = offers.find_one({"_id": ObjectId(payload.offer_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid offer ID")

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if offer["status"] not in ["pending", "countered"]:
        raise HTTPException(status_code=400, detail="Offer cannot be rejected")

    if payload.user_email not in [offer["buyer_email"], offer["seller_email"]]:
        raise HTTPException(status_code=403, detail="Not authorized for this offer")

    other_party = offer["seller_email"] if payload.user_email == offer["buyer_email"] else offer["buyer_email"]
    now = datetime.utcnow()

    offers.update_one(
        {"_id": ObjectId(payload.offer_id)},
        {
            "$set": {
                "status": "rejected",
                "updated_at": now
            },
            "$push": {
                "history": {
                    "by": payload.user_email,
                    "action": "rejected",
                    "price": offer["current_price"],
                    "timestamp": now.isoformat()
                }
            }
        }
    )

    add_notification(
        other_party,
        "Your offer was rejected."
    )

    updated_offer = offers.find_one({"_id": ObjectId(payload.offer_id)})
    return {
        "message": "Offer rejected successfully",
        "offer": serialize_offer(updated_offer)
    }


# -----------------------------
# Complete Trade
# IMPORTANT:
# - Marks offer completed
# - Marks listing sold
# - Creates transaction (needed for reviews)
# - Increments completed_trades for buyer + seller
# -----------------------------
@router.post("/complete")
def complete_offer(payload: OfferActionSchema):
    try:
        offer = offers.find_one({"_id": ObjectId(payload.offer_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid offer ID")

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if offer["status"] != "accepted":
        raise HTTPException(status_code=400, detail="Only accepted offers can be completed")

    if payload.user_email not in [offer["buyer_email"], offer["seller_email"]]:
        raise HTTPException(status_code=403, detail="Not authorized for this offer")

    now = datetime.utcnow()

    offers.update_one(
        {"_id": ObjectId(payload.offer_id)},
        {
            "$set": {
                "status": "completed",
                "updated_at": now
            },
            "$push": {
                "history": {
                    "by": payload.user_email,
                    "action": "completed",
                    "price": offer["current_price"],
                    "timestamp": now.isoformat()
                }
            }
        }
    )

    # Mark listing as sold
    try:
        listings.update_one(
            {"_id": ObjectId(offer["listing_id"])},
            {"$set": {"status": "sold"}}
        )
    except:
        pass

    # NEW: create transaction for reviews (only once)
    existing_tx = transactions.find_one({"offer_id": str(offer["_id"])})

    if not existing_tx:
        transactions.insert_one({
            "offer_id": str(offer["_id"]),
            "listing_id": offer["listing_id"],
            "buyer_email": offer["buyer_email"],
            "seller_email": offer["seller_email"],
            "final_price": offer.get("current_price", 0),
            "status": "completed",
            "buyer_reviewed": False,
            "seller_reviewed": False,
            "completed_at": now
        })

    # NEW: increment successful trade count for both users (for karma score)
    users.update_one(
        {"email": offer["buyer_email"]},
        {"$inc": {"completed_trades": 1}}
    )

    users.update_one(
        {"email": offer["seller_email"]},
        {"$inc": {"completed_trades": 1}}
    )

    other_party = offer["seller_email"] if payload.user_email == offer["buyer_email"] else offer["buyer_email"]

    add_notification(
        other_party,
        f"Trade marked as completed at ₹{offer['current_price']}"
    )

    updated_offer = offers.find_one({"_id": ObjectId(payload.offer_id)})
    return {
        "message": "Trade completed successfully",
        "offer": serialize_offer(updated_offer)
    }


# -----------------------------
# Get all offers for buyer
# -----------------------------
@router.get("/buyer/{email}")
def get_my_offers(email: str):
    data = list(offers.find({"buyer_email": email}).sort("updated_at", -1))

    for item in data:
        item["id"] = str(item["_id"])
        del item["_id"]

    return data


# -----------------------------
# Get all offers for seller
# -----------------------------
@router.get("/seller/{email}")
def get_seller_offers(email: str):
    data = list(offers.find({"seller_email": email}).sort("updated_at", -1))

    for item in data:
        item["id"] = str(item["_id"])
        del item["_id"]

    return data


# -----------------------------
# Get all offers for a user
# -----------------------------
@router.get("/user/{email}")
def get_user_offers(email: str):
    data = list(offers.find({
        "$or": [
            {"buyer_email": email},
            {"seller_email": email}
        ]
    }).sort("updated_at", -1))

    for item in data:
        item["id"] = str(item["_id"])
        del item["_id"]

    return data