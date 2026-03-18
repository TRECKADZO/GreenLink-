# Subscription Routes for GreenLink
# Business Model:
# - FREE: Producteurs, Coopératives
# - PAID (15-day trial + devis): Acheteurs, Fournisseurs, Entreprises RSE (tous sur devis)

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user
from subscription_models import (
    SubscriptionPlan,
    SubscriptionStatus,
    SubscriptionCreate,
    SubscriptionUpdate,
    PLAN_PRICING,
    PLAN_FEATURES,
    USER_TYPE_TO_PLAN,
    create_subscription_for_user,
    get_subscription_status,
    get_plan_features,
    get_plan_pricing,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])


# ============= SUBSCRIPTION INFO =============

@router.get("/plans")
async def get_available_plans():
    """Get all available subscription plans with pricing"""
    plans = []
    
    for plan in SubscriptionPlan:
        pricing = PLAN_PRICING[plan]
        features = PLAN_FEATURES[plan]
        
        plans.append({
            "id": plan.value,
            "name": get_plan_display_name(plan),
            "description": get_plan_description(plan),
            "pricing": {
                "monthly": pricing["monthly"],
                "yearly": pricing["yearly"],
                "commission": pricing["commission"],
                "trial_days": pricing["trial_days"],
            },
            "features": features.dict(),
            "is_free": plan == SubscriptionPlan.FREE,
            "user_types": [k for k, v in USER_TYPE_TO_PLAN.items() if v == plan],
        })
    
    return {"plans": plans}


@router.get("/my-subscription")
async def get_my_subscription(current_user: dict = Depends(get_current_user)):
    """Get current user's subscription status"""
    user_id = str(current_user["_id"])
    user_type = current_user.get("user_type", "producteur")
    
    # Find existing subscription
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        # Create subscription based on user type
        subscription = create_subscription_for_user(user_id, user_type)
        await db.subscriptions.insert_one(subscription)
        logger.info(f"Created subscription for user {user_id}: {subscription['plan']}")
    
    # Get current status
    status = get_subscription_status(subscription)
    
    # Get features
    features = get_plan_features(subscription["plan"])
    pricing = get_plan_pricing(subscription["plan"])
    
    return {
        "subscription": {
            "plan": subscription["plan"],
            "plan_name": get_plan_display_name(SubscriptionPlan(subscription["plan"])),
            "status": status["status"],
            "is_active": status["is_active"],
            "is_trial": status["is_trial"],
            "days_remaining": status.get("days_remaining"),
            "trial_ends": status.get("trial_ends"),
            "start_date": subscription.get("start_date"),
            "end_date": subscription.get("end_date"),
            "next_billing_date": subscription.get("next_billing_date"),
            "billing_cycle": subscription.get("billing_cycle"),
            "requires_quote": status.get("requires_quote", False),
        },
        "features": features,
        "pricing": pricing,
        "message": status.get("message"),
    }


@router.get("/check-feature/{feature_name}")
async def check_feature_access(
    feature_name: str,
    current_user: dict = Depends(get_current_user)
):
    """Check if user has access to a specific feature"""
    user_id = str(current_user["_id"])
    
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        # Default to free plan features
        features = get_plan_features(SubscriptionPlan.FREE.value)
    else:
        # Check if subscription is active
        status = get_subscription_status(subscription)
        if not status["is_active"]:
            return {
                "has_access": False,
                "reason": "subscription_expired",
                "message": "Votre abonnement a expiré. Veuillez renouveler pour accéder à cette fonctionnalité.",
            }
        
        features = get_plan_features(subscription["plan"])
    
    has_access = features.get(feature_name, False)
    
    return {
        "feature": feature_name,
        "has_access": has_access,
        "plan": subscription["plan"] if subscription else "free",
    }


# ============= SUBSCRIPTION MANAGEMENT =============

@router.post("/upgrade")
async def upgrade_subscription(
    upgrade_data: SubscriptionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Upgrade subscription to a paid plan"""
    user_id = str(current_user["_id"])
    user_type = current_user.get("user_type")
    
    # Verify plan is appropriate for user type
    expected_plan = USER_TYPE_TO_PLAN.get(user_type)
    if expected_plan == SubscriptionPlan.FREE:
        raise HTTPException(
            status_code=400,
            detail="Les producteurs et coopératives bénéficient d'un accès gratuit permanent."
        )
    
    pricing = PLAN_PRICING.get(upgrade_data.plan)
    if not pricing:
        raise HTTPException(status_code=400, detail="Plan invalide")
    
    now = datetime.utcnow()
    
    # Calculate subscription period
    if upgrade_data.billing_cycle == "yearly":
        end_date = now + timedelta(days=365)
        price = pricing["yearly"]
    else:
        end_date = now + timedelta(days=30)
        price = pricing["monthly"]
    
    # Update subscription
    await db.subscriptions.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "plan": upgrade_data.plan.value,
                "status": SubscriptionStatus.PENDING_PAYMENT.value,
                "is_trial": False,
                "billing_cycle": upgrade_data.billing_cycle,
                "price_paid": price,
                "payment_method": upgrade_data.payment_method,
                "start_date": now,
                "end_date": end_date,
                "next_billing_date": end_date,
                "updated_at": now,
            }
        },
        upsert=True
    )
    
    # In real implementation, redirect to payment gateway
    return {
        "success": True,
        "message": "Redirection vers le paiement...",
        "payment": {
            "amount": price,
            "currency": "XOF",
            "plan": upgrade_data.plan.value,
            "billing_cycle": upgrade_data.billing_cycle,
        }
    }


@router.post("/confirm-payment")
async def confirm_payment(
    payment_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Confirm payment and activate subscription"""
    user_id = str(current_user["_id"])
    
    # In real implementation, verify payment with Orange Money/Stripe
    transaction_id = payment_data.get("transaction_id")
    
    if not transaction_id:
        raise HTTPException(status_code=400, detail="Transaction ID manquant")
    
    now = datetime.utcnow()
    
    # Get current subscription
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Aucun abonnement trouvé")
    
    # Update to active
    await db.subscriptions.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "status": SubscriptionStatus.ACTIVE.value,
                "last_payment_date": now,
                "updated_at": now,
            },
            "$push": {
                "payment_history": {
                    "transaction_id": transaction_id,
                    "amount": subscription.get("price_paid"),
                    "date": now,
                    "method": subscription.get("payment_method"),
                }
            }
        }
    )
    
    logger.info(f"Payment confirmed for user {user_id}: {transaction_id}")
    
    return {
        "success": True,
        "message": "Paiement confirmé! Votre abonnement est maintenant actif.",
        "subscription": {
            "plan": subscription["plan"],
            "status": SubscriptionStatus.ACTIVE.value,
            "end_date": subscription.get("end_date"),
        }
    }


@router.post("/cancel")
async def cancel_subscription(
    cancellation: Dict[str, str],
    current_user: dict = Depends(get_current_user)
):
    """Cancel subscription"""
    user_id = str(current_user["_id"])
    reason = cancellation.get("reason", "Non spécifié")
    
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Aucun abonnement trouvé")
    
    if subscription["plan"] == SubscriptionPlan.FREE.value:
        raise HTTPException(status_code=400, detail="Le plan gratuit ne peut pas être annulé")
    
    now = datetime.utcnow()
    
    await db.subscriptions.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "status": SubscriptionStatus.CANCELLED.value,
                "cancelled_at": now,
                "cancellation_reason": reason,
                "updated_at": now,
            }
        }
    )
    
    logger.info(f"Subscription cancelled for user {user_id}: {reason}")
    
    return {
        "success": True,
        "message": "Votre abonnement a été annulé. Vous conservez l'accès jusqu'à la fin de la période en cours.",
        "access_until": subscription.get("end_date"),
    }


# ============= TRIAL MANAGEMENT =============

@router.post("/extend-trial")
async def extend_trial(
    current_user: dict = Depends(get_current_user)
):
    """Extend trial period (admin only or special promotion)"""
    user_id = str(current_user["_id"])
    user_type = current_user.get("user_type")
    
    if user_type != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # This endpoint could be used for promotional trial extensions
    raise HTTPException(status_code=501, detail="Fonctionnalité non disponible")


@router.get("/trial-status")
async def get_trial_status(current_user: dict = Depends(get_current_user)):
    """Get detailed trial status"""
    user_id = str(current_user["_id"])
    
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        return {"has_trial": False, "message": "Aucun abonnement trouvé"}
    
    if subscription["plan"] == SubscriptionPlan.FREE.value:
        return {
            "has_trial": False,
            "is_free_plan": True,
            "message": "Votre compte bénéficie d'un accès gratuit permanent.",
        }
    
    if not subscription.get("is_trial"):
        return {
            "has_trial": False,
            "is_paid": True,
            "message": "Vous avez un abonnement payant actif.",
        }
    
    trial_end = subscription.get("trial_end")
    if trial_end:
        if isinstance(trial_end, str):
            trial_end = datetime.fromisoformat(trial_end.replace('Z', '+00:00'))
        
        now = datetime.utcnow()
        
        if now < trial_end:
            days_remaining = (trial_end - now).days
            hours_remaining = ((trial_end - now).seconds // 3600)
            
            return {
                "has_trial": True,
                "is_active": True,
                "days_remaining": days_remaining,
                "hours_remaining": hours_remaining,
                "trial_end": trial_end.isoformat(),
                "message": f"Période d'essai: {days_remaining} jours restants",
            }
        else:
            return {
                "has_trial": True,
                "is_active": False,
                "days_remaining": 0,
                "trial_end": trial_end.isoformat(),
                "message": "Votre période d'essai est terminée. Souscrivez pour continuer!",
            }
    
    return {"has_trial": False}


# ============= HELPERS =============

def get_plan_display_name(plan: SubscriptionPlan) -> str:
    """Get display name for a plan"""
    names = {
        SubscriptionPlan.FREE: "Gratuit",
        SubscriptionPlan.STARTER: "Acheteur",
        SubscriptionPlan.BUSINESS: "Fournisseur",
        SubscriptionPlan.ENTERPRISE: "Entreprise RSE",
    }
    return names.get(plan, "Inconnu")


def get_plan_description(plan: SubscriptionPlan) -> str:
    """Get description for a plan"""
    descriptions = {
        SubscriptionPlan.FREE: "Acces gratuit pour les producteurs et cooperatives",
        SubscriptionPlan.STARTER: "Acces bourse des recoltes et messagerie - sur devis",
        SubscriptionPlan.BUSINESS: "Boutique en ligne et gestion de commandes - sur devis",
        SubscriptionPlan.ENTERPRISE: "Credits carbone, rapports ESG et tracabilite - sur devis",
    }
    return descriptions.get(plan, "")
