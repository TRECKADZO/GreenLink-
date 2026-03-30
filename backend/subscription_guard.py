"""
Subscription guard utility for cooperative feature gating.
Reusable helper to check subscription features on any endpoint.
"""
from fastapi import HTTPException
from database import db
from coop_subscription_models import (
    CoopPlan, COOP_PLAN_FEATURES, create_coop_subscription, get_coop_sub_status,
)
import logging

logger = logging.getLogger(__name__)


async def get_coop_features(coop_id: str, current_user: dict = None) -> dict:
    """
    Fetch and return the cooperative's subscription features dict.
    Auto-creates a trial subscription if none exists.
    Returns: {"features": {...}, "subscription": {...}, "plan_enum": CoopPlan}
    """
    sub = await db.coop_subscriptions.find_one({"user_id": coop_id}, {"_id": 0})
    if not sub:
        coop_name = ""
        if current_user:
            coop_name = current_user.get("coop_name", current_user.get("full_name", ""))
        sub = create_coop_subscription(coop_id, coop_name)
        await db.coop_subscriptions.insert_one(sub)
        sub.pop("_id", None)

    sub_status = get_coop_sub_status(sub)
    plan_key = sub.get("plan", CoopPlan.TRIAL.value)
    try:
        plan_enum = CoopPlan(plan_key)
    except ValueError:
        plan_enum = CoopPlan.TRIAL

    features = COOP_PLAN_FEATURES.get(plan_enum, COOP_PLAN_FEATURES[CoopPlan.TRIAL])

    return {
        "features": features,
        "plan_enum": plan_enum,
        "subscription": {
            "plan": plan_key,
            "is_active": sub_status.get("is_active", False),
            "is_trial": sub_status.get("is_trial", False),
            "days_remaining": sub_status.get("days_remaining", 0),
            "status": sub_status.get("status", ""),
        },
    }


def require_feature(features: dict, feature_key: str, message: str = None):
    """Raise 403 if the subscription doesn't include the required feature."""
    if not features.get(feature_key):
        msg = message or f"Fonctionnalite '{feature_key}' non disponible avec votre abonnement actuel. Mettez a niveau votre plan."
        raise HTTPException(status_code=403, detail=msg)
