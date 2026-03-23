# Notifications API Routes for GreenLink
# Handles push notifications, reminders, and scheduled tasks

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import logging
import asyncio
import json

from database import db
from routes.auth import get_current_user
from services.fcm_service import (
    fcm_service,
    send_notification_to_user,
    notify_payment_confirmed,
    notify_payment_pending,
    send_weekly_premium_reminders,
    notify_all_coop_members
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

# In-memory SSE clients registry
_sse_clients: Dict[str, List[asyncio.Queue]] = {}


def notify_sse_clients(user_id: str, notification: dict):
    """Push a notification to all SSE clients for a given user."""
    queues = _sse_clients.get(user_id, [])
    for q in queues:
        try:
            q.put_nowait(notification)
        except asyncio.QueueFull:
            pass


class DeviceRegistration(BaseModel):
    push_token: str
    platform: str  # "android" or "ios"
    device_name: Optional[str] = None


class NotificationRequest(BaseModel):
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None


class BulkNotificationRequest(BaseModel):
    title: str
    body: str  # Can include {member_name} placeholder
    data: Optional[Dict[str, Any]] = None


# ============= DEVICE REGISTRATION =============

@router.post("/register-device")
async def register_device(
    registration: DeviceRegistration,
    current_user: dict = Depends(get_current_user)
):
    """Register a device for push notifications"""
    
    user_id = str(current_user["_id"])
    
    # Check if device already registered
    existing = await db.device_tokens.find_one({
        "push_token": registration.push_token
    })
    
    if existing:
        # Update existing registration
        await db.device_tokens.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "user_id": user_id,
                    "platform": registration.platform,
                    "device_name": registration.device_name,
                    "is_active": True,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return {"success": True, "message": "Device updated"}
    
    # Create new registration
    await db.device_tokens.insert_one({
        "user_id": user_id,
        "push_token": registration.push_token,
        "platform": registration.platform,
        "device_name": registration.device_name,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "last_notification": None
    })
    
    logger.info(f"Device registered for user {user_id}: {registration.platform}")
    
    return {"success": True, "message": "Device registered"}


@router.delete("/unregister-device/{push_token}")
async def unregister_device(
    push_token: str,
    current_user: dict = Depends(get_current_user)
):
    """Unregister a device from push notifications"""
    
    result = await db.device_tokens.update_one(
        {"push_token": push_token},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Device not found")
    
    return {"success": True, "message": "Device unregistered"}


# ============= NOTIFICATION HISTORY =============

@router.get("/history")
async def get_notification_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get user's notification history"""
    
    user_id = str(current_user["_id"])
    
    notifications = await db.notification_history.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Convert ObjectId to string
    for notif in notifications:
        notif["_id"] = str(notif["_id"])
    
    return {
        "notifications": notifications,
        "count": len(notifications)
    }


@router.get("/unread-count")
async def get_unread_notification_count(
    current_user: dict = Depends(get_current_user)
):
    """Get count of unread notifications"""
    user_id = str(current_user["_id"])
    count = await db.notification_history.count_documents({
        "user_id": user_id,
        "read": False
    })
    return {"non_lues": count}



@router.put("/history/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    
    result = await db.notification_history.update_one(
        {
            "_id": ObjectId(notification_id),
            "user_id": str(current_user["_id"])
        },
        {"$set": {"read": True, "read_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"success": True}


@router.put("/history/read-all")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user)
):
    """Mark all notifications as read"""
    
    result = await db.notification_history.update_many(
        {"user_id": str(current_user["_id"]), "read": False},
        {"$set": {"read": True, "read_at": datetime.utcnow()}}
    )
    
    return {"success": True, "updated": result.modified_count}


# ============= ADMIN/COOP NOTIFICATION SENDING =============

@router.post("/send-to-member/{member_id}")
async def send_notification_to_member(
    member_id: str,
    notification: NotificationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a notification to a specific cooperative member (cooperative admin only)"""
    
    if current_user.get("user_type") not in ["cooperative", "admin"]:
        raise HTTPException(status_code=403, detail="Accès réservé aux coopératives")
    
    # Get member
    member = await db.coop_members.find_one({"_id": ObjectId(member_id)})
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Find user by phone
    phone = member.get("phone_number")
    user = await db.users.find_one({"phone_number": phone}) if phone else None
    
    if not user:
        # Queue SMS instead
        await db.pending_sms_notifications.insert_one({
            "phone_number": phone,
            "member_name": member.get("full_name", ""),
            "message": f"GreenLink: {notification.body[:160]}",
            "type": "direct_message",
            "created_at": datetime.utcnow(),
            "status": "pending"
        })
        return {"success": True, "method": "sms_queued"}
    
    # Send push notification
    result = await send_notification_to_user(
        db=db,
        user_id=str(user["_id"]),
        title=notification.title,
        body=notification.body,
        data=notification.data
    )
    
    # Log notification
    await db.notification_history.insert_one({
        "user_id": str(user["_id"]),
        "title": notification.title,
        "body": notification.body,
        "data": notification.data,
        "type": "direct_message",
        "sender_id": str(current_user["_id"]),
        "read": False,
        "created_at": datetime.utcnow()
    })
    
    return result


@router.post("/send-to-all-members")
async def send_to_all_coop_members(
    notification: BulkNotificationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Send a notification to all cooperative members (cooperative admin only)"""
    
    if current_user.get("user_type") != "cooperative":
        raise HTTPException(status_code=403, detail="Accès réservé aux coopératives")
    
    coop_id = str(current_user["_id"])
    
    # Get cooperative info
    coop = await db.users.find_one({"_id": current_user["_id"]})
    coop_name = coop.get("coop_name", coop.get("full_name", "Coopérative"))
    
    # Send notifications in background
    async def send_bulk():
        result = await notify_all_coop_members(
            db=db,
            coop_id=coop_id,
            title=notification.title,
            body=notification.body,
            data=notification.data
        )
        logger.info(f"Bulk notification result: {result}")
    
    background_tasks.add_task(send_bulk)
    
    return {
        "success": True,
        "message": "Notifications en cours d'envoi",
        "coop_name": coop_name
    }


# ============= SCHEDULED REMINDERS =============

@router.post("/trigger-weekly-reminders")
async def trigger_weekly_reminders(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Manually trigger weekly premium reminders (admin only)
    In production, this would be called by a cron job
    """
    
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    async def run_reminders():
        result = await send_weekly_premium_reminders(db)
        logger.info(f"Weekly reminders result: {result}")
    
    background_tasks.add_task(run_reminders)
    
    return {
        "success": True,
        "message": "Rappels hebdomadaires lancés en arrière-plan"
    }


# ============= NOTIFICATION PREFERENCES =============

@router.get("/preferences")
async def get_notification_preferences(
    current_user: dict = Depends(get_current_user)
):
    """Get user's notification preferences"""
    
    user_id = str(current_user["_id"])
    
    prefs = await db.notification_preferences.find_one({"user_id": user_id})
    
    if not prefs:
        # Return default preferences
        return {
            "premium_available": True,
            "payment_confirmed": True,
            "weekly_reminders": True,
            "coop_announcements": True,
            "harvest_updates": True,
            "marketing": False
        }
    
    # Remove internal fields
    prefs.pop("_id", None)
    prefs.pop("user_id", None)
    
    return prefs


@router.put("/preferences")
async def update_notification_preferences(
    preferences: Dict[str, bool],
    current_user: dict = Depends(get_current_user)
):
    """Update user's notification preferences"""
    
    user_id = str(current_user["_id"])
    
    # Validate preference keys
    valid_keys = {
        "premium_available", "payment_confirmed", "weekly_reminders",
        "coop_announcements", "harvest_updates", "marketing"
    }
    
    filtered_prefs = {k: v for k, v in preferences.items() if k in valid_keys}
    filtered_prefs["user_id"] = user_id
    filtered_prefs["updated_at"] = datetime.utcnow()
    
    await db.notification_preferences.update_one(
        {"user_id": user_id},
        {"$set": filtered_prefs},
        upsert=True
    )
    
    return {"success": True, "preferences": filtered_prefs}


# ============= PENDING SMS QUEUE (for members without app) =============

@router.get("/pending-sms")
async def get_pending_sms(
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get pending SMS notifications (admin/coop only) - for integration with SMS gateway"""
    
    if current_user.get("user_type") not in ["admin", "cooperative"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    pending = await db.pending_sms_notifications.find(
        {"status": "pending"}
    ).sort("created_at", 1).limit(limit).to_list(limit)
    
    for sms in pending:
        sms["_id"] = str(sms["_id"])
    
    return {"pending_sms": pending, "count": len(pending)}


@router.put("/pending-sms/{sms_id}/mark-sent")
async def mark_sms_sent(
    sms_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark an SMS as sent (for SMS gateway integration)"""
    
    if current_user.get("user_type") not in ["admin", "cooperative"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    result = await db.pending_sms_notifications.update_one(
        {"_id": ObjectId(sms_id)},
        {
            "$set": {
                "status": "sent",
                "sent_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="SMS non trouvé")
    
    return {"success": True}


# ============= TEST NOTIFICATION =============

@router.post("/test")
async def send_test_notification(
    current_user: dict = Depends(get_current_user)
):
    """Send a test notification to current user's devices"""
    
    user_id = str(current_user["_id"])
    
    result = await send_notification_to_user(
        db=db,
        user_id=user_id,
        title="Test GreenLink 🌱",
        body="Ceci est une notification de test. Si vous voyez ce message, les notifications fonctionnent!",
        data={
            "type": "test",
            "timestamp": datetime.utcnow().isoformat(),
            "screen": "Home"
        }
    )
    
    return result



# ============= WEB NOTIFICATIONS (reads from `notifications` collection) =============

@router.get("/web")
async def get_web_notifications(
    limit: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Get notifications for the web dashboard (reads from notifications collection)."""
    user_id = str(current_user["_id"])
    notifs = await db.notifications.find(
        {"user_id": {"$in": [user_id, current_user["_id"]]}}
    ).sort("created_at", -1).limit(limit).to_list(limit)

    return {
        "notifications": [{
            "id": str(n["_id"]),
            "title": n.get("title", ""),
            "message": n.get("message", ""),
            "type": n.get("type", ""),
            "action_url": n.get("action_url", ""),
            "is_read": n.get("is_read", False),
            "created_at": n["created_at"].isoformat() if isinstance(n.get("created_at"), datetime) else str(n.get("created_at", ""))
        } for n in notifs],
        "non_lues": sum(1 for n in notifs if not n.get("is_read", False))
    }


@router.get("/web/unread-count")
async def get_web_unread_count(
    current_user: dict = Depends(get_current_user)
):
    """Get unread notification count from notifications collection."""
    user_id = str(current_user["_id"])
    count = await db.notifications.count_documents({
        "user_id": {"$in": [user_id, current_user["_id"]]},
        "is_read": False
    })
    return {"non_lues": count}


@router.put("/web/{notification_id}/read")
async def mark_web_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a web notification as read."""
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"is_read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    return {"success": True}


@router.put("/web/read-all")
async def mark_all_web_notifications_read(
    current_user: dict = Depends(get_current_user)
):
    """Mark all web notifications as read."""
    user_id = str(current_user["_id"])
    result = await db.notifications.update_many(
        {"user_id": {"$in": [user_id, current_user["_id"]]}, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"success": True, "updated": result.modified_count}


# ============= SSE STREAM =============

@router.get("/stream")
async def notification_stream(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """SSE endpoint – streams new notifications to the connected web client."""
    user_id = str(current_user["_id"])
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)

    if user_id not in _sse_clients:
        _sse_clients[user_id] = []
    _sse_clients[user_id].append(queue)

    async def event_generator():
        try:
            # Send initial unread count
            count = await db.notifications.count_documents({
                "user_id": {"$in": [user_id, current_user["_id"]]},
                "is_read": False
            })
            yield f"event: unread_count\ndata: {json.dumps({'non_lues': count})}\n\n"

            while True:
                if await request.is_disconnected():
                    break
                try:
                    notification = await asyncio.wait_for(queue.get(), timeout=30)
                    yield f"event: notification\ndata: {json.dumps(notification, default=str)}\n\n"
                except asyncio.TimeoutError:
                    yield f"event: ping\ndata: {json.dumps({'ts': datetime.utcnow().isoformat()})}\n\n"
        finally:
            _sse_clients.get(user_id, []).remove(queue) if queue in _sse_clients.get(user_id, []) else None
            if not _sse_clients.get(user_id):
                _sse_clients.pop(user_id, None)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
