# Gestion des Devis (Quotes) pour abonnements fournisseurs
# Workflow: Inscription -> 15 jours gratuits -> Formulaire devis -> Approbation admin -> Compte actif

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user
from subscription_models import SubscriptionStatus
from services.email_service import (
    send_quote_approved_email, send_quote_rejected_email,
    send_account_suspended_email, send_account_activated_email,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Quotes & Devis"])


# ============= MODELS =============

class QuoteSubmit(BaseModel):
    company_name: str = Field(description="Nom de l'entreprise")
    contact_name: str = Field(description="Nom du contact")
    contact_email: Optional[str] = None
    contact_phone: str = Field(description="Telephone")
    business_type: str = Field(description="Type d'activite: intrants/semences/equipements/services/autre")
    description: str = Field(description="Description des produits/services proposes")
    estimated_monthly_volume: Optional[str] = None
    target_regions: List[str] = Field(default=[], description="Regions ciblees")
    needs: Optional[str] = Field(None, description="Besoins specifiques")
    billing_preference: str = Field(default="monthly", description="monthly/quarterly/yearly")


class QuoteAdminAction(BaseModel):
    action: str = Field(description="approve/reject")
    admin_note: Optional[str] = None
    custom_price_xof: Optional[int] = Field(None, description="Montant abonnement en XOF")
    commission_rate: Optional[float] = Field(None, description="Taux de commission fournisseur (3-5%)")
    billing_cycle: Optional[str] = Field(None, description="monthly/quarterly/yearly")
    subscription_duration_days: Optional[int] = None


class AccountAction(BaseModel):
    action: str = Field(description="activate/suspend/delete")
    reason: Optional[str] = None


# ============= HELPERS =============

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Acces reserve aux administrateurs")
    return current_user


# ============= QUOTE ENDPOINTS (USER) =============

@router.post("/subscriptions/quote/submit")
async def submit_quote(
    quote: QuoteSubmit,
    current_user: dict = Depends(get_current_user)
):
    """Soumettre un formulaire de devis (fournisseur apres fin de periode d'essai)"""
    user_id = str(current_user["_id"])
    user_type = current_user.get("user_type")

    if user_type not in ["fournisseur", "acheteur", "entreprise_rse"]:
        raise HTTPException(status_code=400, detail="Seuls les comptes payants peuvent soumettre un devis")

    existing = await db.quotes.find_one({"user_id": user_id, "status": "pending"})
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez deja un devis en attente d'approbation")

    now = datetime.utcnow()
    quote_doc = {
        "user_id": user_id,
        "user_name": current_user.get("full_name") or current_user.get("coop_name") or quote.contact_name,
        "user_email": current_user.get("email") or quote.contact_email,
        "user_phone": current_user.get("phone_number") or quote.contact_phone,
        "user_type": user_type,
        "company_name": quote.company_name,
        "contact_name": quote.contact_name,
        "contact_email": quote.contact_email,
        "contact_phone": quote.contact_phone,
        "business_type": quote.business_type,
        "description": quote.description,
        "estimated_monthly_volume": quote.estimated_monthly_volume,
        "target_regions": quote.target_regions,
        "needs": quote.needs,
        "billing_preference": quote.billing_preference,
        "status": "pending",
        "submitted_at": now,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.quotes.insert_one(quote_doc)

    # Update subscription status
    await db.subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "status": SubscriptionStatus.PENDING_QUOTE.value,
            "updated_at": now,
        }},
        upsert=True
    )

    logger.info(f"Quote submitted by user {user_id} ({quote.company_name})")

    return {
        "success": True,
        "quote_id": str(result.inserted_id),
        "message": "Votre demande de devis a ete soumise. L'administrateur l'examinera sous 48h.",
    }


@router.get("/subscriptions/quote/my-quote")
async def get_my_quote(current_user: dict = Depends(get_current_user)):
    """Obtenir le statut du devis de l'utilisateur"""
    user_id = str(current_user["_id"])

    quotes = await db.quotes.find({"user_id": user_id}).sort("created_at", -1).to_list(10)

    formatted = []
    for q in quotes:
        formatted.append({
            "id": str(q["_id"]),
            "company_name": q.get("company_name"),
            "business_type": q.get("business_type"),
            "status": q.get("status"),
            "submitted_at": q.get("submitted_at"),
            "reviewed_at": q.get("reviewed_at"),
            "admin_note": q.get("admin_note"),
            "custom_price_xof": q.get("custom_price_xof"),
            "commission_rate": q.get("commission_rate"),
            "billing_cycle": q.get("billing_cycle"),
            "subscription_duration_days": q.get("subscription_duration_days"),
        })

    return {"quotes": formatted, "total": len(formatted)}


# ============= ADMIN QUOTE MANAGEMENT =============

@router.get("/admin/quotes")
async def list_quotes(
    status: Optional[str] = Query(None, description="pending/approved/rejected"),
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_admin_user)
):
    """Lister tous les devis (admin)"""
    query = {}
    if status:
        query["status"] = status

    quotes = await db.quotes.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.quotes.count_documents(query)

    stats = {
        "pending": await db.quotes.count_documents({"status": "pending"}),
        "approved": await db.quotes.count_documents({"status": "approved"}),
        "rejected": await db.quotes.count_documents({"status": "rejected"}),
    }

    formatted = []
    for q in quotes:
        formatted.append({
            "id": str(q["_id"]),
            "user_id": q.get("user_id"),
            "user_name": q.get("user_name"),
            "user_email": q.get("user_email"),
            "user_phone": q.get("user_phone"),
            "user_type": q.get("user_type"),
            "company_name": q.get("company_name"),
            "contact_name": q.get("contact_name"),
            "business_type": q.get("business_type"),
            "description": q.get("description"),
            "estimated_monthly_volume": q.get("estimated_monthly_volume"),
            "target_regions": q.get("target_regions", []),
            "needs": q.get("needs"),
            "billing_preference": q.get("billing_preference"),
            "status": q.get("status"),
            "submitted_at": q.get("submitted_at"),
            "reviewed_at": q.get("reviewed_at"),
            "reviewed_by": q.get("reviewed_by"),
            "admin_note": q.get("admin_note"),
            "custom_price_xof": q.get("custom_price_xof"),
            "commission_rate": q.get("commission_rate"),
            "billing_cycle": q.get("billing_cycle"),
        })

    return {"quotes": formatted, "total": total, "stats": stats}


@router.put("/admin/quotes/{quote_id}")
async def review_quote(
    quote_id: str,
    action_data: QuoteAdminAction,
    admin: dict = Depends(get_admin_user)
):
    """Approuver ou rejeter un devis (admin)"""
    quote = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis non trouve")

    if quote.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Ce devis a deja ete traite")

    now = datetime.utcnow()
    user_id = quote["user_id"]

    if action_data.action == "approve":
        # Approve quote -> activate subscription
        duration = action_data.subscription_duration_days or 365
        end_date = now + timedelta(days=duration)

        await db.quotes.update_one(
            {"_id": ObjectId(quote_id)},
            {"$set": {
                "status": "approved",
                "reviewed_at": now,
                "reviewed_by": str(admin["_id"]),
                "admin_note": action_data.admin_note,
                "custom_price_xof": action_data.custom_price_xof,
                "commission_rate": action_data.commission_rate,
                "billing_cycle": action_data.billing_cycle or quote.get("billing_preference", "monthly"),
                "subscription_duration_days": duration,
                "updated_at": now,
            }}
        )

        billing_cycle = action_data.billing_cycle or quote.get("billing_preference", "monthly")

        # Activate subscription
        await db.subscriptions.update_one(
            {"user_id": user_id},
            {"$set": {
                "status": SubscriptionStatus.ACTIVE.value,
                "is_trial": False,
                "start_date": now,
                "end_date": end_date,
                "price_xof": action_data.custom_price_xof or 0,
                "commission_rate": action_data.commission_rate or 0,
                "billing_cycle": billing_cycle,
                "activated_by_admin": str(admin["_id"]),
                "activated_at": now,
                "updated_at": now,
            }},
            upsert=True
        )

        # Activate user
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": True, "subscription_status": "active", "updated_at": now}}
        )

        # Build pricing message for notification
        price_msg = ""
        if action_data.custom_price_xof:
            cycle_label = {"monthly": "mois", "quarterly": "trimestre", "yearly": "an"}.get(billing_cycle, "mois")
            price_msg = f" Montant: {action_data.custom_price_xof:,} XOF/{cycle_label}."
        if action_data.commission_rate and action_data.commission_rate > 0:
            price_msg += f" Commission sur ventes: {action_data.commission_rate}%."

        # Notify user
        await db.notifications.insert_one({
            "user_id": user_id,
            "title": "Devis approuve",
            "message": f"Votre demande de devis a ete approuvee. Votre compte est maintenant actif jusqu'au {end_date.strftime('%d/%m/%Y')}.{price_msg}",
            "type": "subscription",
            "created_at": now,
            "is_read": False,
        })

        logger.info(f"Quote {quote_id} approved for user {user_id} by admin {admin['_id']}")

        # Send email notification
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        if user_doc:
            send_quote_approved_email(
                to_email=user_doc.get("email") or quote.get("contact_email"),
                user_name=quote.get("user_name", ""),
                company_name=quote.get("company_name", ""),
                end_date=end_date.strftime("%d/%m/%Y"),
                admin_note=action_data.admin_note,
            )

        return {"success": True, "message": "Devis approuve. Le compte fournisseur est maintenant actif.", "end_date": end_date.isoformat()}

    elif action_data.action == "reject":
        await db.quotes.update_one(
            {"_id": ObjectId(quote_id)},
            {"$set": {
                "status": "rejected",
                "reviewed_at": now,
                "reviewed_by": str(admin["_id"]),
                "admin_note": action_data.admin_note,
                "updated_at": now,
            }}
        )

        # Notify user
        await db.notifications.insert_one({
            "user_id": user_id,
            "title": "Devis refuse",
            "message": f"Votre demande de devis a ete refusee. {action_data.admin_note or 'Contactez-nous pour plus d informations.'}",
            "type": "subscription",
            "created_at": now,
            "is_read": False,
        })

        logger.info(f"Quote {quote_id} rejected for user {user_id}")

        # Send email notification
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        if user_doc:
            send_quote_rejected_email(
                to_email=user_doc.get("email") or quote.get("contact_email"),
                user_name=quote.get("user_name", ""),
                company_name=quote.get("company_name", ""),
                admin_note=action_data.admin_note,
            )

        return {"success": True, "message": "Devis refuse. L'utilisateur a ete notifie."}

    raise HTTPException(status_code=400, detail="Action invalide. Utilisez 'approve' ou 'reject'.")


# ============= ADMIN ACCOUNT MANAGEMENT (DEVIS) =============

@router.put("/admin/accounts/{user_id}/action")
async def admin_account_action(
    user_id: str,
    action_data: AccountAction,
    admin: dict = Depends(get_admin_user)
):
    """Activer, suspendre ou supprimer un compte utilisateur (admin)"""
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")

    if str(user["_id"]) == str(admin["_id"]):
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre compte")

    now = datetime.utcnow()
    action = action_data.action

    if action == "activate":
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": True, "subscription_status": "active", "updated_at": now}}
        )
        await db.subscriptions.update_one(
            {"user_id": user_id},
            {"$set": {"status": SubscriptionStatus.ACTIVE.value, "updated_at": now}},
            upsert=True
        )
        await db.notifications.insert_one({
            "user_id": user_id,
            "title": "Compte active",
            "message": "Votre compte a ete active par l'administrateur.",
            "type": "subscription",
            "created_at": now,
            "is_read": False,
        })
        send_account_activated_email(
            to_email=user.get("email"),
            user_name=user.get("full_name") or user.get("company_name") or "Utilisateur",
        )
        return {"success": True, "message": "Compte active avec succes"}

    elif action == "suspend":
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": False, "subscription_status": "suspended", "suspended_at": now, "suspend_reason": action_data.reason, "updated_at": now}}
        )
        await db.subscriptions.update_one(
            {"user_id": user_id},
            {"$set": {"status": SubscriptionStatus.SUSPENDED.value, "updated_at": now}},
            upsert=True
        )
        await db.notifications.insert_one({
            "user_id": user_id,
            "title": "Compte suspendu",
            "message": f"Votre compte a ete suspendu. {action_data.reason or ''}",
            "type": "subscription",
            "created_at": now,
            "is_read": False,
        })
        send_account_suspended_email(
            to_email=user.get("email"),
            user_name=user.get("full_name") or user.get("company_name") or "Utilisateur",
            reason=action_data.reason,
        )
        return {"success": True, "message": "Compte suspendu"}

    elif action == "delete":
        # Soft delete: mark as deleted
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": False, "subscription_status": "deleted", "deleted_at": now, "delete_reason": action_data.reason, "updated_at": now}}
        )
        await db.subscriptions.delete_many({"user_id": user_id})
        await db.quotes.update_many({"user_id": user_id}, {"$set": {"status": "cancelled"}})
        return {"success": True, "message": "Compte supprime"}

    raise HTTPException(status_code=400, detail="Action invalide. Utilisez 'activate', 'suspend' ou 'delete'.")


# ============= ADMIN DEVIS ACCOUNTS LIST =============

@router.get("/admin/devis-accounts")
async def list_devis_accounts(
    status: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_admin_user)
):
    """Lister tous les comptes par devis avec leur statut"""
    query = {"user_type": {"$in": ["fournisseur", "acheteur", "entreprise_rse"]}}
    if status:
        query["subscription_status"] = status

    users_list = await db.users.find(query, {"password": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)

    accounts = []
    for u in users_list:
        uid = str(u["_id"])
        sub = await db.subscriptions.find_one({"user_id": uid})
        last_quote = await db.quotes.find_one({"user_id": uid}, sort=[("created_at", -1)])

        accounts.append({
            "id": uid,
            "name": u.get("full_name") or u.get("company_name") or u.get("supplier_company") or "N/A",
            "email": u.get("email", ""),
            "phone": u.get("phone_number", ""),
            "user_type": u.get("user_type"),
            "is_active": u.get("is_active", True),
            "subscription_status": u.get("subscription_status") or (sub.get("status") if sub else "unknown"),
            "subscription_plan": sub.get("plan") if sub else None,
            "trial_end": sub.get("trial_end") if sub else None,
            "subscription_end": sub.get("end_date") if sub else None,
            "last_quote_status": last_quote.get("status") if last_quote else None,
            "last_quote_date": last_quote.get("submitted_at") if last_quote else None,
            "created_at": u.get("created_at"),
        })

    stats = {
        "total": total,
        "active": await db.users.count_documents({**query, "subscription_status": "active"}),
        "trial": await db.subscriptions.count_documents({"status": "trial"}),
        "pending_quote": await db.quotes.count_documents({"status": "pending"}),
        "suspended": await db.users.count_documents({**query, "subscription_status": "suspended"}),
    }

    return {"accounts": accounts, "total": total, "stats": stats}
