"""
Messagerie Sécurisée - Système de messagerie temps réel entre acheteurs et vendeurs
Features:
- WebSocket pour messagerie instantanée
- Conversations liées aux annonces
- Pièces jointes (photos, documents)
- Accusés de lecture
- Messages épinglés/favoris
- Chiffrement des messages
- Signalement et blocage d'utilisateurs
- Notifications push pour messages hors ligne
"""
from fastapi import APIRouter, HTTPException, Depends, Query, WebSocket, WebSocketDisconnect, UploadFile, File
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from routes.auth import get_current_user
from services.push_notifications import push_service
import uuid
import json
import logging
import jwt
import os
import base64
import hashlib
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/messaging", tags=["messaging"])

# ============= ENCRYPTION =============
# Generate a key for message encryption (in production, use a secure key from env)
ENCRYPTION_KEY = os.environ.get('MESSAGE_ENCRYPTION_KEY', Fernet.generate_key().decode())
try:
    cipher_suite = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)
except Exception:
    cipher_suite = Fernet(Fernet.generate_key())

def encrypt_message(message: str) -> str:
    """Chiffrer un message"""
    try:
        return cipher_suite.encrypt(message.encode()).decode()
    except Exception:
        return message

def decrypt_message(encrypted: str) -> str:
    """Déchiffrer un message"""
    try:
        return cipher_suite.decrypt(encrypted.encode()).decode()
    except Exception:
        return encrypted

# ============= MODELS =============

class MessageCreate(BaseModel):
    """Créer un nouveau message"""
    conversation_id: str
    content: str
    message_type: str = Field(default="text", description="text, image, document, system")
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    reply_to_id: Optional[str] = None

class ConversationCreate(BaseModel):
    """Créer une nouvelle conversation liée à une annonce"""
    listing_id: str
    recipient_id: str
    initial_message: str

class ReportMessage(BaseModel):
    """Signaler un message"""
    message_id: str
    reason: str = Field(..., description="spam, harassment, fraud, other")
    details: Optional[str] = None

class BlockUser(BaseModel):
    """Bloquer un utilisateur"""
    user_id: str
    reason: Optional[str] = None

# ============= WEBSOCKET MANAGER =============

class MessagingConnectionManager:
    """Gestionnaire de connexions WebSocket pour la messagerie"""
    
    def __init__(self):
        self.active_connections: dict = {}  # user_id -> set of websockets
        self.websocket_users: dict = {}  # websocket -> user_id
        
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        self.websocket_users[websocket] = user_id
        logger.info(f"[Messaging WS] User {user_id} connected")
        
    def disconnect(self, websocket: WebSocket):
        user_id = self.websocket_users.get(websocket)
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        if websocket in self.websocket_users:
            del self.websocket_users[websocket]
        logger.info(f"[Messaging WS] User {user_id} disconnected")
            
    async def send_to_user(self, user_id: str, message: dict):
        """Envoyer un message à un utilisateur spécifique"""
        if user_id in self.active_connections:
            dead_connections = set()
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to user {user_id}: {e}")
                    dead_connections.add(ws)
            for ws in dead_connections:
                self.disconnect(ws)
                
    def is_online(self, user_id: str) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

messaging_manager = MessagingConnectionManager()

# ============= JWT VERIFICATION =============

# Use SECRET_KEY from environment (same as auth module)
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    logger.warning("SECRET_KEY not found in environment for messaging module")
    SECRET_KEY = 'your-secret-key'  # Fallback for development only

async def verify_ws_token(token: str) -> dict:
    """Vérifier le token JWT pour WebSocket"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        # Token uses 'sub' field from auth module, not 'user_id'
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return None
        return {
            "_id": str(user["_id"]),
            "user_type": user.get("user_type"),
            "full_name": user.get("full_name"),
            "avatar": user.get("avatar")
        }
    except Exception as e:
        logger.error(f"WebSocket token verification failed: {e}")
        return None

# ============= WEBSOCKET ENDPOINT =============

@router.websocket("/ws")
async def messaging_websocket(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket pour messagerie temps réel
    
    Messages supportés:
    - send_message: Envoyer un message
    - typing: Indicateur de frappe
    - read: Marquer comme lu
    - pin: Épingler un message
    """
    user = await verify_ws_token(token)
    if not user:
        await websocket.close(code=4001, reason="Authentication failed")
        return
    
    user_id = user["_id"]
    
    try:
        await messaging_manager.connect(websocket, user_id)
        
        # Update user online status
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"last_seen": datetime.now(timezone.utc), "is_online": True}}
        )
        
        # Send initial data
        unread_count = await db.messages.count_documents({
            "recipient_id": user_id,
            "is_read": False
        })
        
        await websocket.send_json({
            "type": "connected",
            "user_id": user_id,
            "unread_count": unread_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Listen for messages
        while True:
            data = await websocket.receive_json()
            await handle_ws_message(websocket, user, data)
            
    except WebSocketDisconnect:
        messaging_manager.disconnect(websocket)
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"last_seen": datetime.now(timezone.utc), "is_online": False}}
        )
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        messaging_manager.disconnect(websocket)


async def handle_ws_message(websocket: WebSocket, user: dict, data: dict):
    """Traiter un message WebSocket entrant"""
    msg_type = data.get("type")
    user_id = user["_id"]
    
    if msg_type == "send_message":
        # Envoyer un nouveau message
        conversation_id = data.get("conversation_id")
        content = data.get("content")
        message_type = data.get("message_type", "text")
        attachment = data.get("attachment")
        reply_to_id = data.get("reply_to_id")
        
        if not conversation_id or not content:
            await websocket.send_json({"type": "error", "message": "conversation_id et content requis"})
            return
        
        # Vérifier la conversation
        conversation = await db.conversations.find_one({"conversation_id": conversation_id})
        if not conversation:
            await websocket.send_json({"type": "error", "message": "Conversation non trouvée"})
            return
        
        # Vérifier que l'utilisateur fait partie de la conversation
        if user_id not in [conversation["buyer_id"], conversation["seller_id"]]:
            await websocket.send_json({"type": "error", "message": "Accès non autorisé"})
            return
        
        # Déterminer le destinataire
        recipient_id = conversation["seller_id"] if user_id == conversation["buyer_id"] else conversation["buyer_id"]
        
        # Vérifier si l'utilisateur n'est pas bloqué
        block = await db.blocked_users.find_one({
            "$or": [
                {"blocker_id": recipient_id, "blocked_id": user_id},
                {"blocker_id": user_id, "blocked_id": recipient_id}
            ]
        })
        if block:
            await websocket.send_json({"type": "error", "message": "Communication bloquée"})
            return
        
        # Créer le message
        message_id = f"MSG-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:6].upper()}"
        
        message_doc = {
            "message_id": message_id,
            "conversation_id": conversation_id,
            "sender_id": user_id,
            "sender_name": user.get("full_name", "Utilisateur"),
            "sender_avatar": user.get("avatar"),
            "recipient_id": recipient_id,
            "content": encrypt_message(content),
            "content_plain": content,  # For search (in production, use encrypted search)
            "message_type": message_type,
            "attachment_url": attachment.get("url") if attachment else None,
            "attachment_name": attachment.get("name") if attachment else None,
            "reply_to_id": reply_to_id,
            "is_read": False,
            "read_at": None,
            "is_pinned": False,
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.messages.insert_one(message_doc)
        
        # Mettre à jour la conversation
        await db.conversations.update_one(
            {"conversation_id": conversation_id},
            {
                "$set": {
                    "last_message": content[:100],
                    "last_message_at": datetime.now(timezone.utc),
                    "last_sender_id": user_id
                },
                "$inc": {"messages_count": 1}
            }
        )
        
        # Préparer le message à envoyer
        outgoing_message = {
            "type": "new_message",
            "message": {
                "message_id": message_id,
                "conversation_id": conversation_id,
                "sender_id": user_id,
                "sender_name": user.get("full_name"),
                "sender_avatar": user.get("avatar"),
                "content": content,
                "message_type": message_type,
                "attachment_url": message_doc["attachment_url"],
                "attachment_name": message_doc["attachment_name"],
                "reply_to_id": reply_to_id,
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Envoyer au destinataire
        await messaging_manager.send_to_user(recipient_id, outgoing_message)
        
        # Confirmer à l'expéditeur
        await websocket.send_json({
            "type": "message_sent",
            "message_id": message_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Créer une notification push si destinataire hors ligne
        if not messaging_manager.is_online(recipient_id):
            await db.notifications.insert_one({
                "user_id": recipient_id,
                "title": f"Nouveau message de {user.get('full_name')}",
                "message": content[:100],
                "type": "new_message",
                "action_url": f"/messages/{conversation_id}",
                "created_at": datetime.now(timezone.utc),
                "is_read": False
            })
            
            # Envoyer une notification push mobile
            try:
                listing_title = conversation.get("listing_title")
                await push_service.send_new_message_notification(
                    recipient_id=recipient_id,
                    sender_name=user.get("full_name", "Utilisateur"),
                    message_preview=content[:150],
                    conversation_id=conversation_id,
                    listing_title=listing_title
                )
            except Exception as e:
                logger.error(f"Error sending push notification: {e}")
    
    elif msg_type == "typing":
        # Indicateur de frappe
        conversation_id = data.get("conversation_id")
        is_typing = data.get("is_typing", True)
        
        conversation = await db.conversations.find_one({"conversation_id": conversation_id})
        if conversation:
            recipient_id = conversation["seller_id"] if user_id == conversation["buyer_id"] else conversation["buyer_id"]
            await messaging_manager.send_to_user(recipient_id, {
                "type": "typing",
                "conversation_id": conversation_id,
                "user_id": user_id,
                "user_name": user.get("full_name"),
                "is_typing": is_typing
            })
    
    elif msg_type == "read":
        # Marquer les messages comme lus
        conversation_id = data.get("conversation_id")
        message_ids = data.get("message_ids", [])
        
        if message_ids:
            # Marquer des messages spécifiques
            await db.messages.update_many(
                {"message_id": {"$in": message_ids}, "recipient_id": user_id},
                {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
            )
        else:
            # Marquer tous les messages de la conversation
            await db.messages.update_many(
                {"conversation_id": conversation_id, "recipient_id": user_id, "is_read": False},
                {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
            )
        
        # Notifier l'expéditeur
        conversation = await db.conversations.find_one({"conversation_id": conversation_id})
        if conversation:
            other_id = conversation["seller_id"] if user_id == conversation["buyer_id"] else conversation["buyer_id"]
            await messaging_manager.send_to_user(other_id, {
                "type": "messages_read",
                "conversation_id": conversation_id,
                "reader_id": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
    
    elif msg_type == "pin":
        # Épingler/Désépingler un message
        message_id = data.get("message_id")
        is_pinned = data.get("is_pinned", True)
        
        result = await db.messages.update_one(
            {"message_id": message_id, "$or": [{"sender_id": user_id}, {"recipient_id": user_id}]},
            {"$set": {"is_pinned": is_pinned}}
        )
        
        if result.modified_count > 0:
            await websocket.send_json({
                "type": "message_pinned",
                "message_id": message_id,
                "is_pinned": is_pinned
            })
    
    elif msg_type == "ping":
        await websocket.send_json({"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()})

# ============= REST API ENDPOINTS =============

@router.post("/conversations")
async def create_conversation(
    data: ConversationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Créer une nouvelle conversation liée à une annonce"""
    user_id = current_user["_id"]
    
    # Vérifier l'annonce
    listing = await db.harvest_listings.find_one({"listing_id": data.listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    # Déterminer les participants
    seller_id = listing["seller_id"]
    buyer_id = user_id
    
    # Ne peut pas se messager soi-même
    if seller_id == buyer_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous envoyer de message")
    
    # Vérifier si une conversation existe déjà pour cette annonce
    existing = await db.conversations.find_one({
        "listing_id": data.listing_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id
    })
    
    if existing:
        return {"conversation_id": existing["conversation_id"], "existing": True}
    
    # Vérifier le blocage
    block = await db.blocked_users.find_one({
        "$or": [
            {"blocker_id": seller_id, "blocked_id": buyer_id},
            {"blocker_id": buyer_id, "blocked_id": seller_id}
        ]
    })
    if block:
        raise HTTPException(status_code=403, detail="Communication bloquée avec cet utilisateur")
    
    # Créer la conversation
    conversation_id = f"CONV-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Récupérer les infos des participants
    seller = await db.users.find_one({"_id": ObjectId(seller_id)}, {"password": 0})
    buyer = await db.users.find_one({"_id": ObjectId(buyer_id)}, {"password": 0})
    
    # Safely get the first photo or None
    photos = listing.get("photos", [])
    listing_photo = photos[0] if photos else None
    
    conversation_doc = {
        "conversation_id": conversation_id,
        "listing_id": data.listing_id,
        "listing_title": f"{listing.get('crop_type', '')} - {listing.get('grade', '')}",
        "listing_photo": listing_photo,
        "buyer_id": buyer_id,
        "buyer_name": buyer.get("full_name") if buyer else "Acheteur",
        "buyer_avatar": buyer.get("avatar") if buyer else None,
        "seller_id": seller_id,
        "seller_name": seller.get("full_name") or seller.get("cooperative_name") if seller else "Vendeur",
        "seller_avatar": seller.get("avatar") if seller else None,
        "last_message": data.initial_message[:100],
        "last_message_at": datetime.now(timezone.utc),
        "last_sender_id": buyer_id,
        "messages_count": 1,
        "is_archived_buyer": False,
        "is_archived_seller": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.conversations.insert_one(conversation_doc)
    
    # Créer le premier message
    message_id = f"MSG-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:6].upper()}"
    
    await db.messages.insert_one({
        "message_id": message_id,
        "conversation_id": conversation_id,
        "sender_id": buyer_id,
        "sender_name": buyer.get("full_name") if buyer else "Acheteur",
        "recipient_id": seller_id,
        "content": encrypt_message(data.initial_message),
        "content_plain": data.initial_message,
        "message_type": "text",
        "is_read": False,
        "is_pinned": False,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Notifier le vendeur
    await messaging_manager.send_to_user(seller_id, {
        "type": "new_conversation",
        "conversation": {
            "conversation_id": conversation_id,
            "listing_id": data.listing_id,
            "listing_title": conversation_doc["listing_title"],
            "buyer_name": conversation_doc["buyer_name"],
            "initial_message": data.initial_message
        }
    })
    
    # Notification in-app
    await db.notifications.insert_one({
        "user_id": seller_id,
        "title": "Nouvelle conversation",
        "message": f"{conversation_doc['buyer_name']} vous a contacté concernant votre annonce",
        "type": "new_conversation",
        "action_url": f"/messages/{conversation_id}",
        "created_at": datetime.now(timezone.utc),
        "is_read": False
    })
    
    # Notification push mobile si vendeur hors ligne
    if not messaging_manager.is_online(seller_id):
        try:
            await push_service.send_new_conversation_notification(
                seller_id=seller_id,
                buyer_name=conversation_doc["buyer_name"],
                listing_title=conversation_doc["listing_title"],
                conversation_id=conversation_id,
                initial_message=data.initial_message
            )
        except Exception as e:
            logger.error(f"Error sending new conversation push: {e}")
    
    return {
        "conversation_id": conversation_id,
        "existing": False,
        "message": "Conversation créée avec succès"
    }


@router.get("/conversations")
async def get_conversations(
    current_user: dict = Depends(get_current_user),
    archived: bool = False,
    limit: int = 50
):
    """Liste des conversations de l'utilisateur"""
    user_id = current_user["_id"]
    
    # Query pour les conversations où l'utilisateur est acheteur ou vendeur
    query = {
        "$or": [
            {"buyer_id": user_id, "is_archived_buyer": archived},
            {"seller_id": user_id, "is_archived_seller": archived}
        ]
    }
    
    conversations = await db.conversations.find(query).sort("last_message_at", -1).limit(limit).to_list(limit)
    
    result = []
    for conv in conversations:
        # Déterminer si l'utilisateur est acheteur ou vendeur
        is_buyer = conv["buyer_id"] == user_id
        
        # Compter les messages non lus
        unread_count = await db.messages.count_documents({
            "conversation_id": conv["conversation_id"],
            "recipient_id": user_id,
            "is_read": False
        })
        
        # Récupérer l'info de l'autre participant
        other_id = conv["seller_id"] if is_buyer else conv["buyer_id"]
        other_user = await db.users.find_one({"_id": ObjectId(other_id)}, {"password": 0, "_id": 0})
        
        result.append({
            "conversation_id": conv["conversation_id"],
            "listing_id": conv.get("listing_id"),
            "listing_title": conv.get("listing_title"),
            "listing_photo": conv.get("listing_photo"),
            "other_user": {
                "id": other_id,
                "name": conv["seller_name"] if is_buyer else conv["buyer_name"],
                "avatar": conv.get("seller_avatar") if is_buyer else conv.get("buyer_avatar"),
                "is_online": other_user.get("is_online", False) if other_user else False,
                "user_type": other_user.get("user_type") if other_user else None
            },
            "last_message": conv.get("last_message"),
            "last_message_at": conv.get("last_message_at").isoformat() if conv.get("last_message_at") else None,
            "unread_count": unread_count,
            "is_my_turn": conv.get("last_sender_id") != user_id,
            "messages_count": conv.get("messages_count", 0),
            "created_at": conv.get("created_at").isoformat() if conv.get("created_at") else None
        })
    
    return result


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Détail d'une conversation avec ses messages"""
    user_id = current_user["_id"]
    
    conversation = await db.conversations.find_one({"conversation_id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    # Vérifier l'accès
    if user_id not in [conversation["buyer_id"], conversation["seller_id"]]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    is_buyer = conversation["buyer_id"] == user_id
    other_id = conversation["seller_id"] if is_buyer else conversation["buyer_id"]
    
    # Récupérer l'info de l'autre participant
    other_user = await db.users.find_one({"_id": ObjectId(other_id)}, {"password": 0})
    
    # Récupérer l'annonce
    listing = None
    if conversation.get("listing_id"):
        listing = await db.harvest_listings.find_one({"listing_id": conversation["listing_id"]})
        if listing:
            listing["_id"] = str(listing["_id"])
    
    return {
        "conversation_id": conversation["conversation_id"],
        "listing": listing,
        "other_user": {
            "id": other_id,
            "name": other_user.get("full_name") or other_user.get("cooperative_name") if other_user else "Utilisateur",
            "avatar": other_user.get("avatar") if other_user else None,
            "is_online": other_user.get("is_online", False) if other_user else False,
            "user_type": other_user.get("user_type") if other_user else None,
            "location": other_user.get("location") if other_user else None
        },
        "created_at": conversation.get("created_at").isoformat() if conversation.get("created_at") else None
    }


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    before: Optional[str] = None,
    limit: int = 50
):
    """Récupérer les messages d'une conversation"""
    user_id = current_user["_id"]
    
    conversation = await db.conversations.find_one({"conversation_id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    if user_id not in [conversation["buyer_id"], conversation["seller_id"]]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    query = {"conversation_id": conversation_id, "is_deleted": False}
    
    if before:
        # Pagination: messages avant un certain message
        ref_message = await db.messages.find_one({"message_id": before})
        if ref_message:
            query["created_at"] = {"$lt": ref_message["created_at"]}
    
    messages = await db.messages.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    messages.reverse()  # Ordre chronologique
    
    result = []
    for msg in messages:
        result.append({
            "message_id": msg["message_id"],
            "sender_id": msg["sender_id"],
            "sender_name": msg.get("sender_name"),
            "sender_avatar": msg.get("sender_avatar"),
            "content": decrypt_message(msg["content"]) if msg.get("content") else "",
            "message_type": msg.get("message_type", "text"),
            "attachment_url": msg.get("attachment_url"),
            "attachment_name": msg.get("attachment_name"),
            "reply_to_id": msg.get("reply_to_id"),
            "is_read": msg.get("is_read", False),
            "read_at": msg.get("read_at").isoformat() if msg.get("read_at") else None,
            "is_pinned": msg.get("is_pinned", False),
            "is_mine": msg["sender_id"] == user_id,
            "created_at": msg.get("created_at").isoformat() if msg.get("created_at") else None
        })
    
    # Marquer comme lus les messages reçus
    await db.messages.update_many(
        {"conversation_id": conversation_id, "recipient_id": user_id, "is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
    )
    
    return {
        "messages": result,
        "has_more": len(messages) == limit
    }


@router.get("/conversations/{conversation_id}/pinned")
async def get_pinned_messages(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer les messages épinglés d'une conversation"""
    user_id = current_user["_id"]
    
    conversation = await db.conversations.find_one({"conversation_id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    if user_id not in [conversation["buyer_id"], conversation["seller_id"]]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    messages = await db.messages.find({
        "conversation_id": conversation_id,
        "is_pinned": True,
        "is_deleted": False
    }).sort("created_at", -1).to_list(50)
    
    return [{
        "message_id": msg["message_id"],
        "sender_name": msg.get("sender_name"),
        "content": decrypt_message(msg["content"]) if msg.get("content") else "",
        "created_at": msg.get("created_at").isoformat() if msg.get("created_at") else None
    } for msg in messages]


@router.put("/conversations/{conversation_id}/archive")
async def archive_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Archiver une conversation"""
    user_id = current_user["_id"]
    
    conversation = await db.conversations.find_one({"conversation_id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    if user_id == conversation["buyer_id"]:
        await db.conversations.update_one(
            {"conversation_id": conversation_id},
            {"$set": {"is_archived_buyer": True}}
        )
    elif user_id == conversation["seller_id"]:
        await db.conversations.update_one(
            {"conversation_id": conversation_id},
            {"$set": {"is_archived_seller": True}}
        )
    else:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    return {"message": "Conversation archivée"}


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Supprimer un message (soft delete)"""
    user_id = current_user["_id"]
    
    message = await db.messages.find_one({"message_id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    if message["sender_id"] != user_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez supprimer que vos propres messages")
    
    await db.messages.update_one(
        {"message_id": message_id},
        {"$set": {"is_deleted": True, "content": "[Message supprimé]"}}
    )
    
    return {"message": "Message supprimé"}


# ============= SIGNALEMENT ET BLOCAGE =============

@router.post("/report")
async def report_message(
    report: ReportMessage,
    current_user: dict = Depends(get_current_user)
):
    """Signaler un message"""
    user_id = current_user["_id"]
    
    message = await db.messages.find_one({"message_id": report.message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    # Vérifier que l'utilisateur peut voir ce message
    if user_id not in [message["sender_id"], message["recipient_id"]]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    report_doc = {
        "report_id": f"RPT-{str(uuid.uuid4())[:8].upper()}",
        "message_id": report.message_id,
        "reporter_id": user_id,
        "reported_user_id": message["sender_id"],
        "reason": report.reason,
        "details": report.details,
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.message_reports.insert_one(report_doc)
    
    return {"message": "Signalement envoyé", "report_id": report_doc["report_id"]}


@router.post("/block")
async def block_user(
    block: BlockUser,
    current_user: dict = Depends(get_current_user)
):
    """Bloquer un utilisateur"""
    user_id = current_user["_id"]
    
    if block.user_id == user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous bloquer vous-même")
    
    # Vérifier si déjà bloqué
    existing = await db.blocked_users.find_one({
        "blocker_id": user_id,
        "blocked_id": block.user_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Utilisateur déjà bloqué")
    
    await db.blocked_users.insert_one({
        "blocker_id": user_id,
        "blocked_id": block.user_id,
        "reason": block.reason,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"message": "Utilisateur bloqué"}


@router.delete("/block/{user_id}")
async def unblock_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Débloquer un utilisateur"""
    result = await db.blocked_users.delete_one({
        "blocker_id": current_user["_id"],
        "blocked_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blocage non trouvé")
    
    return {"message": "Utilisateur débloqué"}


@router.get("/blocked")
async def get_blocked_users(current_user: dict = Depends(get_current_user)):
    """Liste des utilisateurs bloqués"""
    blocked = await db.blocked_users.find({"blocker_id": current_user["_id"]}).to_list(100)
    
    result = []
    for b in blocked:
        user = await db.users.find_one({"_id": ObjectId(b["blocked_id"])}, {"password": 0})
        if user:
            result.append({
                "user_id": b["blocked_id"],
                "name": user.get("full_name") or user.get("cooperative_name"),
                "blocked_at": b.get("created_at").isoformat() if b.get("created_at") else None
            })
    
    return result


# ============= UPLOAD D'ATTACHMENTS =============

@router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload d'une pièce jointe"""
    # Vérifier le type de fichier
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp", 
                     "application/pdf", "application/msword",
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé")
    
    # Limite de taille (5 MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 5 MB)")
    
    # Sauvegarder le fichier
    file_id = f"{str(uuid.uuid4())[:8]}_{file.filename}"
    file_path = f"/app/uploads/messages/{file_id}"
    
    import os
    os.makedirs("/app/uploads/messages", exist_ok=True)
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Déterminer le type
    is_image = file.content_type.startswith("image/")
    
    return {
        "url": f"/api/messaging/files/{file_id}",
        "name": file.filename,
        "type": "image" if is_image else "document",
        "size": len(content)
    }


@router.get("/files/{file_id}")
async def get_file(file_id: str):
    """Récupérer une pièce jointe"""
    from fastapi.responses import FileResponse
    
    file_path = f"/app/uploads/messages/{file_id}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    return FileResponse(file_path)


# ============= STATISTIQUES =============

@router.get("/stats")
async def get_messaging_stats(current_user: dict = Depends(get_current_user)):
    """Statistiques de messagerie pour l'utilisateur"""
    user_id = current_user["_id"]
    
    total_conversations = await db.conversations.count_documents({
        "$or": [{"buyer_id": user_id}, {"seller_id": user_id}]
    })
    
    unread_messages = await db.messages.count_documents({
        "recipient_id": user_id,
        "is_read": False
    })
    
    total_messages_sent = await db.messages.count_documents({"sender_id": user_id})
    total_messages_received = await db.messages.count_documents({"recipient_id": user_id})
    
    return {
        "total_conversations": total_conversations,
        "unread_messages": unread_messages,
        "total_messages_sent": total_messages_sent,
        "total_messages_received": total_messages_received
    }
