# Cooperative Subscription Routes
# 6-month trial -> Starter/Pro/Enterprise

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import logging

from database import db
from routes.auth import get_current_user
from coop_subscription_models import (
    CoopPlan, CoopSubStatus, COOP_PLAN_PRICING, COOP_PLAN_FEATURES,
    COOP_TRIAL_DAYS, TRIAL_NOTIFICATION_DAYS,
    create_coop_subscription, get_coop_sub_status,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/coop-subscriptions", tags=["coop-subscriptions"])


PLAN_DISPLAY = {
    CoopPlan.TRIAL: {"name": "Essai Gratuit Pro", "recommended": False},
    CoopPlan.STARTER: {"name": "Starter", "recommended": False},
    CoopPlan.PRO: {"name": "Pro", "recommended": True},
    CoopPlan.ENTERPRISE: {"name": "Enterprise", "recommended": False},
}


# ============= PUBLIC: Plans info =============

@router.get("/plans")
async def get_coop_plans():
    """Get all cooperative subscription plans"""
    plans = []
    for plan in [CoopPlan.STARTER, CoopPlan.PRO, CoopPlan.ENTERPRISE]:
        pricing = COOP_PLAN_PRICING[plan]
        features = COOP_PLAN_FEATURES[plan]
        display = PLAN_DISPLAY[plan]
        plans.append({
            "id": plan.value,
            "name": display["name"],
            "recommended": display["recommended"],
            "pricing": pricing,
            "features": features,
        })
    return {
        "plans": plans,
        "trial": {
            "duration_days": COOP_TRIAL_DAYS,
            "duration_months": 6,
            "access_level": "Pro",
            "message": "6 mois d'essai gratuit offerts. Ensuite abonnement mensuel. GreenLink aide votre cooperative a generer des credits carbone et des primes tout en simplifiant les audits et le suivi SSRTE.",
        },
    }


# ============= AUTHENTICATED: My subscription =============

@router.get("/my-subscription")
async def get_my_coop_subscription(current_user: dict = Depends(get_current_user)):
    """Get current cooperative's subscription"""
    user_id = str(current_user["_id"])
    user_type = current_user.get("user_type", "")

    if user_type != "cooperative":
        raise HTTPException(status_code=403, detail="Reserve aux cooperatives")

    sub = await db.coop_subscriptions.find_one({"user_id": user_id}, {"_id": 0})

    if not sub:
        coop_name = current_user.get("cooperative_name", current_user.get("full_name", ""))
        sub = create_coop_subscription(user_id, coop_name)
        await db.coop_subscriptions.insert_one(sub)
        sub.pop("_id", None)
        logger.info(f"Created coop subscription for {user_id}")

    status = get_coop_sub_status(sub)
    plan_key = sub.get("plan", CoopPlan.TRIAL.value)

    try:
        plan_enum = CoopPlan(plan_key)
    except ValueError:
        plan_enum = CoopPlan.TRIAL

    features = COOP_PLAN_FEATURES.get(plan_enum, COOP_PLAN_FEATURES[CoopPlan.TRIAL])
    pricing = COOP_PLAN_PRICING.get(plan_enum, COOP_PLAN_PRICING[CoopPlan.TRIAL])

    return {
        "subscription": {
            "plan": plan_key,
            "plan_name": PLAN_DISPLAY.get(plan_enum, {}).get("name", "Essai"),
            "status": status["status"],
            "is_active": status["is_active"],
            "is_trial": status.get("is_trial", False),
            "days_remaining": status.get("days_remaining"),
            "trial_end": status.get("trial_end"),
            "start_date": sub.get("start_date"),
            "end_date": sub.get("end_date"),
            "price_xof": pricing.get("monthly", 0),
            "max_members": pricing.get("max_members"),
            "auto_upgrade_plan": sub.get("auto_upgrade_plan"),
        },
        "features": features,
        "pricing": pricing,
        "message": status.get("message"),
    }


# ============= Choose plan after trial =============

class ChoosePlanRequest(BaseModel):
    plan: str  # coop_starter, coop_pro, coop_enterprise
    billing_cycle: str = "monthly"
    payment_method: Optional[str] = None


@router.post("/choose-plan")
async def choose_plan(req: ChoosePlanRequest, current_user: dict = Depends(get_current_user)):
    """Choose a plan during or after trial"""
    user_id = str(current_user["_id"])

    try:
        plan = CoopPlan(req.plan)
    except ValueError:
        raise HTTPException(status_code=400, detail="Plan invalide")

    if plan == CoopPlan.TRIAL:
        raise HTTPException(status_code=400, detail="Impossible de choisir le plan essai")

    pricing = COOP_PLAN_PRICING[plan]
    price = pricing["yearly"] if req.billing_cycle == "yearly" else pricing["monthly"]
    now = datetime.utcnow()
    end_date = now + timedelta(days=365 if req.billing_cycle == "yearly" else 30)

    await db.coop_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "chosen_plan": plan.value,
            "plan": plan.value,
            "status": CoopSubStatus.PENDING_PAYMENT.value,
            "is_trial": False,
            "billing_cycle": req.billing_cycle,
            "price_xof": price,
            "payment_method": req.payment_method,
            "start_date": now,
            "end_date": end_date,
            "next_billing_date": end_date,
            "updated_at": now,
        }},
        upsert=True,
    )

    return {
        "success": True,
        "message": f"Plan {PLAN_DISPLAY[plan]['name']} selectionne. Montant: {price:,} FCFA/{req.billing_cycle}.",
        "payment": {"amount": price, "currency": "XOF", "plan": plan.value},
    }


# ============= Cancel subscription =============

@router.post("/cancel")
async def cancel_coop_subscription(current_user: dict = Depends(get_current_user)):
    """Cancel cooperative subscription (opt out of auto-upgrade)"""
    user_id = str(current_user["_id"])

    sub = await db.coop_subscriptions.find_one({"user_id": user_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Aucun abonnement trouve")

    now = datetime.utcnow()
    await db.coop_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "status": CoopSubStatus.CANCELLED.value,
            "auto_upgrade_plan": None,
            "cancelled_at": now,
            "updated_at": now,
        }},
    )

    return {
        "success": True,
        "message": "Abonnement annule. Vous conservez l'acces jusqu'a la fin de la periode en cours.",
        "access_until": sub.get("end_date") or sub.get("trial_end"),
    }


# ============= Trial notifications check (cron-style) =============

@router.post("/check-trial-notifications")
async def check_trial_notifications(current_user: dict = Depends(get_current_user)):
    """Check and send trial expiration notifications (call from cron/scheduler)"""
    now = datetime.utcnow()
    notifications_sent = 0

    for days_before in TRIAL_NOTIFICATION_DAYS:
        target_date = now + timedelta(days=days_before)
        target_start = target_date.replace(hour=0, minute=0, second=0)
        target_end = target_date.replace(hour=23, minute=59, second=59)

        subs = db.coop_subscriptions.find({
            "is_trial": True,
            "status": CoopSubStatus.TRIAL.value,
            "trial_end": {"$gte": target_start, "$lte": target_end},
            f"notifications_sent.{days_before}d": {"$exists": False},
        })

        async for sub in subs:
            user_id = sub["user_id"]
            await db.notifications.insert_one({
                "user_id": user_id,
                "type": "subscription_trial_ending",
                "title": f"Essai gratuit : {days_before} jours restants",
                "message": f"Votre periode d'essai gratuit se termine dans {days_before} jours. Choisissez un abonnement pour continuer a beneficier des fonctionnalites de durabilite et certification qualite.",
                "read": False,
                "created_at": now,
            })
            await db.coop_subscriptions.update_one(
                {"user_id": user_id},
                {"$set": {f"notifications_sent.{days_before}d": now}},
            )
            notifications_sent += 1

    return {"notifications_sent": notifications_sent}
