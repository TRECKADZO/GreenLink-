# Notifications API Routes for GreenLink
# Handles push notifications, reminders, and scheduled tasks

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import logging

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
