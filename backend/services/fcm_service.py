# Firebase Cloud Messaging Service for GreenLink
# Handles sending push notifications to mobile devices

import os
import json
import httpx
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# Firebase configuration
FIREBASE_PROJECT_ID = os.environ.get('FIREBASE_PROJECT_ID', 'greenlink-farmer')
FIREBASE_SERVER_KEY = os.environ.get('FIREBASE_SERVER_KEY', '')

# Expo Push Notification Service (fallback)
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class FCMService:
    """Firebase Cloud Messaging Service for sending push notifications"""
    
    def __init__(self):
        self.fcm_url = f"https://fcm.googleapis.com/fcm/send"
        self.server_key = FIREBASE_SERVER_KEY
        self.use_expo_fallback = not bool(FIREBASE_SERVER_KEY)
        
        if self.use_expo_fallback:
            logger.info("FCM Server Key not configured, using Expo Push Service as fallback")
    
    async def send_notification(
        self,
        push_token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        badge: int = 1,
        sound: str = "default"
    ) -> Dict[str, Any]:
        """
        Send a push notification to a single device
        
        Args:
            push_token: The device's push token (FCM or Expo)
            title: Notification title
            body: Notification body text
            data: Optional data payload for the app
            badge: Badge count for iOS
            sound: Sound to play
            
        Returns:
            Response from the push service
        """
        # Detect if it's an Expo token
        is_expo_token = push_token.startswith("ExponentPushToken")
        
        if is_expo_token or self.use_expo_fallback:
            return await self._send_expo_notification(
                push_token, title, body, data, badge, sound
            )
        else:
            return await self._send_fcm_notification(
                push_token, title, body, data, badge, sound
            )
    
    async def send_bulk_notifications(
        self,
        notifications: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Send notifications to multiple devices
        
        Args:
            notifications: List of notification configs with push_token, title, body, data
            
        Returns:
            List of responses
        """
        results = []
        
        # Group by token type
        expo_notifications = []
        fcm_notifications = []
        
        for notif in notifications:
            if notif.get("push_token", "").startswith("ExponentPushToken"):
                expo_notifications.append(notif)
            else:
                fcm_notifications.append(notif)
        
        # Send Expo notifications in batch
        if expo_notifications:
            expo_results = await self._send_expo_batch(expo_notifications)
            results.extend(expo_results)
        
        # Send FCM notifications
        for notif in fcm_notifications:
            result = await self._send_fcm_notification(
                notif["push_token"],
                notif["title"],
                notif["body"],
                notif.get("data"),
                notif.get("badge", 1),
                notif.get("sound", "default")
            )
            results.append(result)
        
        return results
    
    async def _send_fcm_notification(
        self,
        push_token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        badge: int = 1,
        sound: str = "default"
    ) -> Dict[str, Any]:
        """Send notification via Firebase Cloud Messaging"""
        
        if not self.server_key:
            logger.warning("FCM Server Key not configured")
            return {"success": False, "error": "FCM not configured"}
        
        payload = {
            "to": push_token,
            "notification": {
                "title": title,
                "body": body,
                "sound": sound,
                "badge": badge
            },
            "data": data or {},
            "priority": "high"
        }
        
        headers = {
            "Authorization": f"key={self.server_key}",
            "Content-Type": "application/json"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.fcm_url,
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                
                result = response.json()
                logger.info(f"FCM response: {result}")
                
                return {
                    "success": result.get("success", 0) > 0,
                    "message_id": result.get("results", [{}])[0].get("message_id"),
                    "error": result.get("results", [{}])[0].get("error")
                }
                
        except Exception as e:
            logger.error(f"FCM send error: {e}")
            return {"success": False, "error": str(e)}
    
    async def _send_expo_notification(
        self,
        push_token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        badge: int = 1,
        sound: str = "default"
    ) -> Dict[str, Any]:
        """Send notification via Expo Push Service"""
        
        message = {
            "to": push_token,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": sound,
            "badge": badge,
            "priority": "high",
            "channelId": "default"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    EXPO_PUSH_URL,
                    json=message,
                    headers={"Content-Type": "application/json"},
                    timeout=30.0
                )
                
                result = response.json()
                logger.info(f"Expo Push response: {result}")
                
                if "data" in result:
                    ticket = result["data"]
                    return {
                        "success": ticket.get("status") == "ok",
                        "ticket_id": ticket.get("id"),
                        "error": ticket.get("message") if ticket.get("status") == "error" else None
                    }
                
                return {"success": False, "error": "Invalid response"}
                
        except Exception as e:
            logger.error(f"Expo Push send error: {e}")
            return {"success": False, "error": str(e)}
    
    async def _send_expo_batch(
        self,
        notifications: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Send batch notifications via Expo Push Service"""
        
        messages = [
            {
                "to": n["push_token"],
                "title": n["title"],
                "body": n["body"],
                "data": n.get("data", {}),
                "sound": n.get("sound", "default"),
                "badge": n.get("badge", 1),
                "priority": "high",
                "channelId": "default"
            }
            for n in notifications
        ]
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    EXPO_PUSH_URL,
                    json=messages,
                    headers={"Content-Type": "application/json"},
                    timeout=60.0
                )
                
                result = response.json()
                logger.info(f"Expo Batch Push response: {len(result.get('data', []))} tickets")
                
                results = []
                for ticket in result.get("data", []):
                    results.append({
                        "success": ticket.get("status") == "ok",
                        "ticket_id": ticket.get("id"),
                        "error": ticket.get("message") if ticket.get("status") == "error" else None
                    })
                
                return results
                
        except Exception as e:
            logger.error(f"Expo Batch Push error: {e}")
            return [{"success": False, "error": str(e)} for _ in notifications]


# Global service instance
fcm_service = FCMService()


# Convenience functions for common notification types
async def notify_farmer_parcel_verified(
    push_token: str,
    farmer_name: str,
    parcel_id: str,
    carbon_score: float
) -> Dict[str, Any]:
    """Send notification when a parcel is verified"""
    return await fcm_service.send_notification(
        push_token=push_token,
        title="Parcelle vérifiée ✅",
        body=f"Votre parcelle a été vérifiée. Score carbone: {carbon_score:.1f}/10",
        data={
            "type": "parcel_verified",
            "parcel_id": parcel_id,
            "screen": "Parcels"
        }
    )


async def notify_farmer_payment_received(
    push_token: str,
    farmer_name: str,
    amount: float,
    currency: str = "FCFA"
) -> Dict[str, Any]:
    """Send notification when payment is received"""
    return await fcm_service.send_notification(
        push_token=push_token,
        title="Paiement reçu 💰",
        body=f"Vous avez reçu {amount:,.0f} {currency} sur votre compte Orange Money",
        data={
            "type": "payment_received",
            "amount": amount,
            "screen": "Payments"
        }
    )


async def notify_farmer_harvest_confirmed(
    push_token: str,
    crop_type: str,
    quantity: float
) -> Dict[str, Any]:
    """Send notification when harvest is confirmed"""
    return await fcm_service.send_notification(
        push_token=push_token,
        title="Récolte enregistrée 🌾",
        body=f"Votre déclaration de {quantity} kg de {crop_type} a été enregistrée",
        data={
            "type": "harvest_confirmed",
            "screen": "Harvest"
        }
    )


async def notify_farmer_carbon_premium(
    push_token: str,
    premium_amount: float
) -> Dict[str, Any]:
    """Send notification for carbon premium eligibility"""
    return await fcm_service.send_notification(
        push_token=push_token,
        title="Prime carbone disponible 🌱",
        body=f"Félicitations ! Vous êtes éligible à une prime de {premium_amount:,.0f} FCFA",
        data={
            "type": "carbon_premium",
            "amount": premium_amount,
            "screen": "Home"
        }
    )


async def send_notification_to_user(
    db,
    user_id: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Send notification to a user by looking up their registered devices
    
    Args:
        db: MongoDB database instance
        user_id: The user's ID
        title: Notification title
        body: Notification body
        data: Optional data payload
        
    Returns:
        Result of the notification send
    """
    # Get user's registered devices
    devices = await db.device_tokens.find({
        "user_id": user_id,
        "is_active": True
    }).to_list(10)
    
    if not devices:
        logger.warning(f"No registered devices for user {user_id}")
        return {"success": False, "error": "No registered devices"}
    
    results = []
    for device in devices:
        result = await fcm_service.send_notification(
            push_token=device["push_token"],
            title=title,
            body=body,
            data=data
        )
        results.append(result)
        
        # Update last notification time
        await db.device_tokens.update_one(
            {"_id": device["_id"]},
            {"$set": {"last_notification": datetime.utcnow()}}
        )
    
    # Return success if at least one device received the notification
    success_count = sum(1 for r in results if r.get("success"))
    return {
        "success": success_count > 0,
        "devices_notified": success_count,
        "total_devices": len(devices)
    }


# ============= COOPERATIVE PREMIUM NOTIFICATIONS =============

async def notify_members_premium_available(
    db,
    distribution_id: str,
    coop_name: str,
    lot_name: str,
    distributions: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Send notifications to all members when their carbon premiums are ready
    
    Args:
        db: MongoDB database instance
        distribution_id: The distribution ID
        coop_name: Cooperative name
        lot_name: Name of the sales lot
        distributions: List of member distributions with member_id, amount, etc.
        
    Returns:
        Summary of notification results
    """
    notifications_sent = 0
    notifications_failed = 0
    
    for dist in distributions:
        member_id = dist.get("member_id")
        amount = dist.get("amount", 0)
        member_name = dist.get("member_name", "")
        
        if not member_id or amount <= 0:
            continue
        
        # Get member's phone number to find their user account
        member = await db.coop_members.find_one({"_id": member_id if isinstance(member_id, str) == False else {"$exists": True}})
        if not member:
            # Try finding by string ID
            from bson import ObjectId
            try:
                member = await db.coop_members.find_one({"_id": ObjectId(member_id)})
            except:
                pass
        
        if member:
            phone = member.get("phone_number")
            
            # Find user by phone number
            user = await db.users.find_one({"phone_number": phone}) if phone else None
            
            if user:
                user_id = str(user["_id"])
                
                # Send notification
                result = await send_notification_to_user(
                    db=db,
                    user_id=user_id,
                    title="Prime Carbone Disponible! 🌱💰",
                    body=f"Félicitations {member_name}! Votre prime de {amount:,.0f} FCFA de {coop_name} est prête.",
                    data={
                        "type": "carbon_premium_available",
                        "distribution_id": distribution_id,
                        "amount": amount,
                        "lot_name": lot_name,
                        "coop_name": coop_name,
                        "screen": "Payments"
                    }
                )
                
                if result.get("success"):
                    notifications_sent += 1
                    logger.info(f"Premium notification sent to {member_name} ({phone})")
                else:
                    notifications_failed += 1
                    logger.warning(f"Failed to send notification to {member_name}: {result.get('error')}")
            else:
                # User not in system - log for SMS sending
                logger.info(f"Member {member_name} ({phone}) not in app - would send SMS")
                
                # Store notification for SMS service
                await db.pending_sms_notifications.insert_one({
                    "phone_number": phone,
                    "member_name": member_name,
                    "message": f"GreenLink: Votre prime carbone de {amount:,.0f} FCFA de {coop_name} est disponible. Lot: {lot_name}",
                    "type": "carbon_premium",
                    "distribution_id": distribution_id,
                    "created_at": datetime.utcnow(),
                    "status": "pending"
                })
                notifications_sent += 1  # Count SMS as pending
    
    return {
        "success": notifications_sent > 0,
        "notifications_sent": notifications_sent,
        "notifications_failed": notifications_failed,
        "total_members": len(distributions)
    }


async def notify_coop_distribution_complete(
    db,
    coop_user_id: str,
    coop_name: str,
    lot_name: str,
    total_distributed: float,
    beneficiaries_count: int
) -> Dict[str, Any]:
    """
    Send notification to cooperative admin when distribution is complete
    """
    return await send_notification_to_user(
        db=db,
        user_id=coop_user_id,
        title="Distribution Terminée ✅",
        body=f"La distribution de {total_distributed:,.0f} FCFA à {beneficiaries_count} membres ({lot_name}) est terminée.",
        data={
            "type": "distribution_complete",
            "lot_name": lot_name,
            "total_distributed": total_distributed,
            "beneficiaries_count": beneficiaries_count,
            "screen": "CoopDistributions"
        }
    )
