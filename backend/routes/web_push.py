"""
Web Push Notifications Service
Gestion des abonnements push et envoi de notifications navigateur
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import db
from routes.auth import get_current_user
from datetime import datetime, timezone
import os
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/push", tags=["push-notifications"])

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CONTACT_EMAIL = os.environ.get("VAPID_CONTACT_EMAIL", "")


class PushSubscription(BaseModel):
    endpoint: str
    keys: dict  # {p256dh, auth}


@router.get("/vapid-key")
async def get_vapid_key():
    """Retourne la clé publique VAPID pour le frontend"""
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=503, detail="Push notifications non configurées")
    return {"public_key": VAPID_PUBLIC_KEY}


@router.post("/subscribe")
async def subscribe(
    sub: PushSubscription,
    current_user: dict = Depends(get_current_user)
):
    """Enregistrer un abonnement push pour l'utilisateur"""
    user_id = current_user["_id"]

    # Upsert: remplacer l'ancien abonnement pour ce endpoint
    await db.push_subscriptions.update_one(
        {"user_id": user_id, "endpoint": sub.endpoint},
        {"$set": {
            "user_id": user_id,
            "endpoint": sub.endpoint,
            "keys": sub.keys,
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )

    return {"message": "Abonnement enregistré"}


@router.delete("/unsubscribe")
async def unsubscribe(
    current_user: dict = Depends(get_current_user)
):
    """Supprimer tous les abonnements push de l'utilisateur"""
    user_id = current_user["_id"]
    result = await db.push_subscriptions.delete_many({"user_id": user_id})
    return {"message": f"{result.deleted_count} abonnement(s) supprimé(s)"}


async def send_push_to_user(user_id: str, title: str, body: str, url: str = "/messages", tag: str = "message"):
    """Envoyer une notification push à un utilisateur"""
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.debug("VAPID keys not configured, skipping push notification")
        return

    subs = await db.push_subscriptions.find({"user_id": user_id}).to_list(10)
    if not subs:
        return

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.warning("pywebpush not installed")
        return

    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "tag": tag,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    dead_subs = []
    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": sub["keys"]
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{VAPID_CONTACT_EMAIL}"}
            )
        except Exception as e:
            error_str = str(e)
            # 410 Gone or 404 = subscription expired
            if "410" in error_str or "404" in error_str:
                dead_subs.append(sub["endpoint"])
            logger.debug(f"Push error for {user_id}: {e}")

    # Nettoyer les abonnements expirés
    if dead_subs:
        await db.push_subscriptions.delete_many({
            "user_id": user_id,
            "endpoint": {"$in": dead_subs}
        })
