# Subscription Models for GreenLink Business Model
# - Free for: Producteurs, Coopératives
# - Paid with 15-day trial: Acheteurs, Fournisseurs, Entreprises RSE

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
from enum import Enum


class SubscriptionPlan(str, Enum):
    FREE = "free"
    STARTER = "starter"  # Acheteurs - 49,000 XOF/month
    BUSINESS = "business"  # Fournisseurs - 29,000 XOF/month + 5% commission
    ENTERPRISE = "enterprise"  # Entreprises RSE - Custom pricing


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    TRIAL = "trial"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING_PAYMENT = "pending_payment"


# Plan pricing in XOF
PLAN_PRICING = {
    SubscriptionPlan.FREE: {
        "monthly": 0,
        "yearly": 0,
        "trial_days": 0,  # No trial needed
        "commission": 0,
    },
    SubscriptionPlan.STARTER: {  # Acheteurs
        "monthly": 49000,
        "yearly": 490000,  # ~17% discount
        "trial_days": 15,
        "commission": 0,
    },
    SubscriptionPlan.BUSINESS: {  # Fournisseurs
        "monthly": 29000,
        "yearly": 290000,  # ~17% discount
        "trial_days": 15,
        "commission": 0.05,  # 5% per sale
    },
    SubscriptionPlan.ENTERPRISE: {  # Entreprises RSE
        "monthly": None,  # Custom pricing
        "yearly": None,
        "trial_days": 15,
        "commission": 0,
    },
}

# Map user types to subscription plans
USER_TYPE_TO_PLAN = {
    "producteur": SubscriptionPlan.FREE,
    "cooperative": SubscriptionPlan.FREE,
    "acheteur": SubscriptionPlan.STARTER,
    "fournisseur": SubscriptionPlan.BUSINESS,
    "entreprise_rse": SubscriptionPlan.ENTERPRISE,
    "admin": SubscriptionPlan.FREE,
}


class SubscriptionFeatures(BaseModel):
    """Features available for each plan"""
    # Basic features (all plans)
    marketplace_access: bool = True
    messaging: bool = True
    basic_support: bool = True
    
    # Starter plan (Acheteurs)
    ai_recommendations: bool = False
    advanced_filters: bool = False
    detailed_analytics: bool = False
    data_export: bool = False
    priority_support: bool = False
    verified_badge: bool = False
    
    # Business plan (Fournisseurs)
    online_store: bool = False
    product_catalog: bool = False
    order_management: bool = False
    sales_statistics: bool = False
    real_time_notifications: bool = False
    merchant_support: bool = False
    
    # Enterprise plan (RSE)
    unlimited_requests: bool = False
    ai_credit_verification: bool = False
    esg_reports: bool = False
    full_traceability: bool = False
    api_access: bool = False
    dedicated_support: bool = False
    rse_coaching: bool = False


# Features per plan
PLAN_FEATURES = {
    SubscriptionPlan.FREE: SubscriptionFeatures(
        marketplace_access=True,
        messaging=True,
        basic_support=True,
    ),
    SubscriptionPlan.STARTER: SubscriptionFeatures(
        marketplace_access=True,
        messaging=True,
        basic_support=True,
        ai_recommendations=True,
        advanced_filters=True,
        detailed_analytics=True,
        data_export=True,
        priority_support=True,
        verified_badge=True,
    ),
    SubscriptionPlan.BUSINESS: SubscriptionFeatures(
        marketplace_access=True,
        messaging=True,
        basic_support=True,
        online_store=True,
        product_catalog=True,
        order_management=True,
        sales_statistics=True,
        real_time_notifications=True,
        merchant_support=True,
    ),
    SubscriptionPlan.ENTERPRISE: SubscriptionFeatures(
        marketplace_access=True,
        messaging=True,
        basic_support=True,
        ai_recommendations=True,
        advanced_filters=True,
        detailed_analytics=True,
        data_export=True,
        priority_support=True,
        verified_badge=True,
        unlimited_requests=True,
        ai_credit_verification=True,
        esg_reports=True,
        full_traceability=True,
        api_access=True,
        dedicated_support=True,
        rse_coaching=True,
    ),
}


class Subscription(BaseModel):
    """User subscription model"""
    user_id: str
    plan: SubscriptionPlan
    status: SubscriptionStatus
    
    # Trial period
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    is_trial: bool = False
    
    # Subscription period
    start_date: datetime
    end_date: Optional[datetime] = None  # None for free plans
    
    # Billing
    billing_cycle: str = "monthly"  # monthly, yearly
    price_paid: Optional[int] = None  # in XOF
    next_billing_date: Optional[datetime] = None
    
    # Payment
    payment_method: Optional[str] = None  # orange_money, card, bank_transfer
    last_payment_date: Optional[datetime] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None


class SubscriptionCreate(BaseModel):
    """Create a new subscription"""
    plan: SubscriptionPlan
    billing_cycle: str = "monthly"
    payment_method: Optional[str] = None


class SubscriptionUpdate(BaseModel):
    """Update subscription"""
    plan: Optional[SubscriptionPlan] = None
    billing_cycle: Optional[str] = None
    payment_method: Optional[str] = None
    status: Optional[SubscriptionStatus] = None


def create_subscription_for_user(user_id: str, user_type: str) -> dict:
    """
    Create appropriate subscription based on user type
    - Producteurs & Coopératives: Free forever
    - Others: 15-day trial then paid
    """
    plan = USER_TYPE_TO_PLAN.get(user_type, SubscriptionPlan.FREE)
    pricing = PLAN_PRICING[plan]
    now = datetime.utcnow()
    
    if plan == SubscriptionPlan.FREE:
        # Free plan - no trial, no expiration
        return {
            "user_id": user_id,
            "plan": plan.value,
            "status": SubscriptionStatus.ACTIVE.value,
            "is_trial": False,
            "trial_start": None,
            "trial_end": None,
            "start_date": now,
            "end_date": None,  # Never expires
            "billing_cycle": None,
            "price_paid": 0,
            "next_billing_date": None,
            "payment_method": None,
            "created_at": now,
            "updated_at": now,
        }
    else:
        # Paid plan - start with 15-day trial
        trial_days = pricing["trial_days"]
        trial_end = now + timedelta(days=trial_days)
        
        return {
            "user_id": user_id,
            "plan": plan.value,
            "status": SubscriptionStatus.TRIAL.value,
            "is_trial": True,
            "trial_start": now,
            "trial_end": trial_end,
            "start_date": now,
            "end_date": trial_end,  # Expires after trial if not paid
            "billing_cycle": "monthly",
            "price_paid": 0,  # Trial is free
            "next_billing_date": trial_end,
            "payment_method": None,
            "created_at": now,
            "updated_at": now,
        }


def get_subscription_status(subscription: dict) -> dict:
    """
    Check and return current subscription status
    """
    now = datetime.utcnow()
    status = subscription.get("status")
    plan = subscription.get("plan")
    
    # Free plans are always active
    if plan == SubscriptionPlan.FREE.value:
        return {
            "is_active": True,
            "is_trial": False,
            "days_remaining": None,
            "status": SubscriptionStatus.ACTIVE.value,
        }
    
    # Check trial status
    if subscription.get("is_trial"):
        trial_end = subscription.get("trial_end")
        if trial_end:
            if isinstance(trial_end, str):
                trial_end = datetime.fromisoformat(trial_end.replace('Z', '+00:00'))
            
            if now < trial_end:
                days_remaining = (trial_end - now).days
                return {
                    "is_active": True,
                    "is_trial": True,
                    "days_remaining": days_remaining,
                    "status": SubscriptionStatus.TRIAL.value,
                    "trial_ends": trial_end.isoformat(),
                }
            else:
                return {
                    "is_active": False,
                    "is_trial": False,
                    "days_remaining": 0,
                    "status": SubscriptionStatus.EXPIRED.value,
                    "message": "Période d'essai terminée. Veuillez souscrire pour continuer.",
                }
    
    # Check paid subscription
    end_date = subscription.get("end_date")
    if end_date:
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        if now < end_date:
            days_remaining = (end_date - now).days
            return {
                "is_active": True,
                "is_trial": False,
                "days_remaining": days_remaining,
                "status": SubscriptionStatus.ACTIVE.value,
            }
        else:
            return {
                "is_active": False,
                "is_trial": False,
                "days_remaining": 0,
                "status": SubscriptionStatus.EXPIRED.value,
            }
    
    return {
        "is_active": status == SubscriptionStatus.ACTIVE.value,
        "is_trial": False,
        "days_remaining": None,
        "status": status,
    }


def get_plan_features(plan: str) -> dict:
    """Get features for a plan"""
    try:
        plan_enum = SubscriptionPlan(plan)
        features = PLAN_FEATURES.get(plan_enum, PLAN_FEATURES[SubscriptionPlan.FREE])
        return features.dict()
    except ValueError:
        return PLAN_FEATURES[SubscriptionPlan.FREE].dict()


def get_plan_pricing(plan: str) -> dict:
    """Get pricing for a plan"""
    try:
        plan_enum = SubscriptionPlan(plan)
        return PLAN_PRICING.get(plan_enum, PLAN_PRICING[SubscriptionPlan.FREE])
    except ValueError:
        return PLAN_PRICING[SubscriptionPlan.FREE]
