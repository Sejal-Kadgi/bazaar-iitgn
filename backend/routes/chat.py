from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from typing import Dict, List
from bson import ObjectId
from datetime import datetime
from database import conversations, messages

router = APIRouter(prefix="/chat", tags=["Chat"])

print("🚀 NEW chat.py LOADED")


# -----------------------------
# Schemas
# -----------------------------
class CreateConversationSchema(BaseModel):
    listing_id: str
    buyer_email: str
    seller_email: str


# -----------------------------
# WebSocket Connection Manager
# -----------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, conversation_id: str, websocket: WebSocket):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(websocket)

    def disconnect(self, conversation_id: str, websocket: WebSocket):
        if conversation_id in self.active_connections:
            if websocket in self.active_connections[conversation_id]:
                self.active_connections[conversation_id].remove(websocket)

            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

    async def broadcast_to_conversation(self, conversation_id: str, data: dict):
        if conversation_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[conversation_id]:
                try:
                    await connection.send_json(data)
                except:
                    dead_connections.append(connection)

            for dead in dead_connections:
                self.disconnect(conversation_id, dead)


manager = ConnectionManager()


# -----------------------------
# Create or get conversation
# -----------------------------
@router.post("/conversation")
def create_or_get_conversation(data: CreateConversationSchema):
    existing = conversations.find_one({
        "listing_id": data.listing_id,
        "buyer_email": data.buyer_email,
        "seller_email": data.seller_email
    })

    if existing:
        existing["_id"] = str(existing["_id"])
        existing["created_at"] = existing["created_at"].isoformat() if "created_at" in existing else None
        return {"message": "Conversation exists", "conversation": existing}

    new_conv = {
        "listing_id": data.listing_id,
        "buyer_email": data.buyer_email,
        "seller_email": data.seller_email,
        "created_at": datetime.utcnow()
    }

    result = conversations.insert_one(new_conv)
    new_conv["_id"] = str(result.inserted_id)
    new_conv["created_at"] = new_conv["created_at"].isoformat()

    return {"message": "Conversation created", "conversation": new_conv}


# -----------------------------
# Get messages of a conversation
# -----------------------------
@router.get("/conversation/{conversation_id}/messages")
def get_messages(conversation_id: str):
    try:
        conv_obj_id = ObjectId(conversation_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    conv = conversations.find_one({"_id": conv_obj_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msgs = list(messages.find({"conversation_id": conversation_id}).sort("timestamp", 1))

    for msg in msgs:
        msg["_id"] = str(msg["_id"])
        msg["timestamp"] = msg["timestamp"].isoformat() if "timestamp" in msg else None

    return {"messages": msgs}


# -----------------------------
# Get all conversations for a user
# -----------------------------
@router.get("/user/{email}")
def get_user_conversations(email: str):
    convs = list(conversations.find({
        "$or": [
            {"buyer_email": email},
            {"seller_email": email}
        ]
    }).sort("created_at", -1))

    for conv in convs:
        conv["_id"] = str(conv["_id"])
        conv["created_at"] = conv["created_at"].isoformat() if "created_at" in conv else None

    return {"conversations": convs}


@router.get("/seller/{email}/conversations")
def get_seller_conversations(email: str):
    seller_conversations = list(
        conversations.find({"seller_email": email})
    )

    result = []
    for convo in seller_conversations:
        convo["_id"] = str(convo["_id"])
        result.append(convo)

    return {"conversations": result}


# -----------------------------
# WebSocket endpoint
# -----------------------------
@router.websocket("/ws/{conversation_id}")
async def websocket_chat(websocket: WebSocket, conversation_id: str):
    print("🔥 WS connect attempt:", conversation_id)

    try:
        conv_obj_id = ObjectId(conversation_id)
    except Exception as e:
        print("❌ Invalid conversation ID:", e)
        await websocket.accept()
        await websocket.send_json({"error": "Invalid conversation ID"})
        await websocket.close()
        return

    conv = conversations.find_one({"_id": conv_obj_id})
    if not conv:
        print("❌ Conversation not found:", conversation_id)
        await websocket.accept()
        await websocket.send_json({"error": "Conversation not found"})
        await websocket.close()
        return

    print("✅ WS connected:", conversation_id)
    await manager.connect(conversation_id, websocket)

    try:
        while True:
            data = await websocket.receive_json()
            print("📩 WS received:", data)

            sender_email = data.get("sender_email")
            receiver_email = data.get("receiver_email")
            content = data.get("content")
            message_type = data.get("message_type", "text")

            if not sender_email or not receiver_email or not content:
                print("❌ Missing required fields")
                await websocket.send_json({
                    "error": "sender_email, receiver_email, and content are required"
                })
                continue

            message_doc = {
                "conversation_id": conversation_id,
                "sender_email": sender_email,
                "receiver_email": receiver_email,
                "content": content,
                "message_type": message_type,
                "timestamp": datetime.utcnow()
            }

            result = messages.insert_one(message_doc)
            print("✅ Inserted message:", result.inserted_id)

            outgoing_message = {
                "_id": str(result.inserted_id),
                "conversation_id": conversation_id,
                "sender_email": sender_email,
                "receiver_email": receiver_email,
                "content": content,
                "message_type": message_type,
                "timestamp": message_doc["timestamp"].isoformat()
            }

            await manager.broadcast_to_conversation(conversation_id, outgoing_message)

    except WebSocketDisconnect:
        print("🔌 WS disconnected:", conversation_id)
        manager.disconnect(conversation_id, websocket)
    except Exception as e:
        print("💥 WS error:", e)
        manager.disconnect(conversation_id, websocket)