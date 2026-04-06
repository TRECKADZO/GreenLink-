"""
Routes pour la Gestion des Primes Carbone - Super Admin
Flux: Verification terrain -> Admissibilite -> Demande USSD -> Validation Admin -> Paiement Orange Money

FORMULE RSE (CONFIDENTIELLE - Super Admin uniquement):
RSE_total = score_carbone x taux_par_hectare x hectares
- 30% -> Frais
- 70% distribue:
  - 25% -> GreenLink
  - 5%  -> Cooperative
  - 70% -> Paysan
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user
from routes.notifications import notify_sse_clients

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/carbon-premiums", tags=["carbon-premiums"])

# Configuration par defaut (surchargee par la DB)
ADMISSIBILITY_THRESHOLD = 6.0
DEFAULT_RATE_PER_HA = 5000  # XOF, modifiable par Super Admin

# Repartition RSE (confidentielle)
FRAIS_RATE = 0.30          # 30% frais
DISTRIBUTABLE_RATE = 0.70  # 70% distribue
GREENLINK_SHARE = 0.25     # 25% du distribue -> GreenLink
COOP_SHARE = 0.05          # 5% du distribue -> Cooperative
FARMER_SHARE = 0.70        # 70% du distribue -> Paysan


async def get_current_rate():
    """Get the current taux_par_hectare from DB (set by Super Admin)."""
    config = await db.carbon_config.find_one({"key": "premium_rate"})
    if config:
        return config.get("taux_par_hectare", DEFAULT_RATE_PER_HA)
    return DEFAULT_RATE_PER_HA


def calculate_premium_breakdown(score: float, area: float, taux: float):
    """Calculate the full RSE breakdown for a parcel."""
    rse_total = round(score * taux * area)
    frais = round(rse_total * FRAIS_RATE)
    distributable = rse_total - frais
    greenlink = round(distributable * GREENLINK_SHARE)
    coop = round(distributable * COOP_SHARE)
    farmer = distributable - greenlink - coop  # remainder to farmer to avoid rounding issues
    return {
        "rse_total": rse_total,
        "frais": frais,
        "distributable": distributable,
        "greenlink": greenlink,
        "coop": coop,
        "farmer": farmer
    }


def verify_admin(user: dict):
    roles = user.get("user_type", "")
    if roles not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Acces reserve au Super Admin")


# ============= ADMISSIBILITY CHECK =============

async def check_and_set_admissibility(parcel_id: str, carbon_score: float, farmer_id: str, area_hectares: float):
    """Called after field verification to set admissibility and notify farmer."""
    is_admissible = carbon_score >= ADMISSIBILITY_THRESHOLD
    status = "admissible" if is_admissible else "non_admissible"
    
    # Calculate farmer share only (formula hidden from farmer)
    taux = await get_current_rate()
    if is_admissible:
        breakdown = calculate_premium_breakdown(carbon_score, area_hectares, taux)
        prime_farmer = breakdown["farmer"]
    else:
        prime_farmer = 0
    
    await db.parcels.update_one(
        {"_id": ObjectId(parcel_id)},
        {"$set": {
            "admissibilite_prime": status,
            "prime_estimee": prime_farmer,
            "admissibilite_date": datetime.utcnow()
        }}
    )
    
    # Notify farmer (only show their share, no formula details)
    if is_admissible:
        notif = {
            "user_id": farmer_id,
            "title": "Prime Carbone - Admissible",
            "message": f"Votre parcelle est admissible a la prime carbone (score {carbon_score}/10). Prime estimee: {prime_farmer:,.0f} XOF. Faites votre demande via *144*99#",
            "type": "carbon_admissible",
            "action_url": "/farmer/carbon-score",
            "created_at": datetime.utcnow(),
            "is_read": False
        }
    else:
        notif = {
            "user_id": farmer_id,
            "title": "Prime Carbone - Non Admissible",
            "message": f"Votre parcelle n'est pas encore admissible (score {carbon_score}/10, minimum requis: {ADMISSIBILITY_THRESHOLD}). Ameliorez vos pratiques ecologiques.",
            "type": "carbon_non_admissible",
            "action_url": "/farmer/carbon-score",
            "created_at": datetime.utcnow(),
            "is_read": False
        }
    
    result = await db.notifications.insert_one(notif)
    notify_sse_clients(farmer_id, {
        "id": str(result.inserted_id),
        "title": notif["title"],
        "message": notif["message"],
        "type": notif["type"],
        "action_url": notif["action_url"],
        "is_read": False,
        "created_at": notif["created_at"].isoformat()
    })
    
    return {"admissible": is_admissible, "prime_estimee": prime_farmer}


# ============= USSD PAYMENT REQUEST =============

async def create_ussd_payment_request(phone_number: str):
    """Called from USSD when farmer requests carbon premium payment."""
    # Find user by phone
    user = await db.users.find_one({"phone_number": phone_number})
    if not user:
        return {"success": False, "message": "Utilisateur non trouve"}
    
    farmer_id = str(user["_id"])
    farmer_name = user.get("full_name", "Inconnu")
    
    # Find admissible parcels without pending/paid payment requests
    admissible_parcels = await db.parcels.find({
        "farmer_id": {"$in": [farmer_id, user["_id"]]},
        "admissibilite_prime": "admissible"
    }).to_list(100)
    
    if not admissible_parcels:
        return {"success": False, "message": "Aucune parcelle admissible. Score minimum requis: 6.0/10"}
    
    # Check for existing pending requests
    existing = await db.carbon_payment_requests.find_one({
        "farmer_id": farmer_id,
        "status": {"$in": ["pending", "approved"]}
    })
    if existing:
        return {"success": False, "message": "Vous avez deja une demande en cours de traitement"}
    
    # Calculate premium using RSE formula
    taux = await get_current_rate()
    total_rse = 0
    total_frais = 0
    total_greenlink = 0
    total_coop = 0
    total_farmer = 0
    parcels_detail = []
    for p in admissible_parcels:
        score = p.get("carbon_score", 0)
        area = p.get("area_hectares", 0)
        bd = calculate_premium_breakdown(score, area, taux)
        total_rse += bd["rse_total"]
        total_frais += bd["frais"]
        total_greenlink += bd["greenlink"]
        total_coop += bd["coop"]
        total_farmer += bd["farmer"]
        parcels_detail.append({
            "parcel_id": str(p["_id"]),
            "village": p.get("village", p.get("location", "")),
            "area_hectares": area,
            "carbon_score": score,
            "prime": bd["farmer"]  # farmer sees only their share
        })
    
    coop_commission = total_coop
    farmer_amount = total_farmer
    
    # Get cooperative info
    coop_id = user.get("cooperative_id", "")
    coop_name = ""
    coop_phone = ""
    if coop_id:
        coop = await db.users.find_one({"_id": ObjectId(coop_id) if ObjectId.is_valid(str(coop_id)) else None})
        if coop:
            coop_name = coop.get("full_name", coop.get("cooperative_name", ""))
            coop_phone = coop.get("phone_number", "")
    
    # Create payment request (stores full breakdown for Admin, farmer/coop only see their share)
    request_doc = {
        "farmer_id": farmer_id,
        "farmer_name": farmer_name,
        "farmer_phone": phone_number,
        "coop_id": str(coop_id) if coop_id else "",
        "coop_name": coop_name,
        "coop_phone": coop_phone,
        "parcels": parcels_detail,
        "parcels_count": len(parcels_detail),
        "total_area_hectares": round(sum(p["area_hectares"] for p in parcels_detail), 2),
        "average_carbon_score": round(sum(p["carbon_score"] for p in parcels_detail) / len(parcels_detail), 1),
        # Full RSE breakdown (Super Admin only)
        "rse_total": total_rse,
        "frais": total_frais,
        "greenlink_share": total_greenlink,
        "taux_par_hectare": taux,
        # Visible shares
        "total_premium": total_rse,
        "coop_commission": coop_commission,
        "farmer_amount": farmer_amount,
        "status": "pending",
        "requested_at": datetime.utcnow(),
        "requested_via": "ussd"
    }
    
    result = await db.carbon_payment_requests.insert_one(request_doc)
    
    # Notify admin
    admins = await db.users.find({"user_type": {"$in": ["admin", "super_admin"]}}).to_list(50)
    for admin in admins:
        admin_notif = {
            "user_id": str(admin["_id"]),
            "title": "Nouvelle demande prime carbone",
            "message": f"{farmer_name} demande {farmer_amount:,.0f} XOF (score moy. {request_doc['average_carbon_score']}/10, {len(parcels_detail)} parcelles)",
            "type": "carbon_payment_request",
            "action_url": "/admin/carbon-premiums",
            "created_at": datetime.utcnow(),
            "is_read": False
        }
        ins = await db.notifications.insert_one(admin_notif)
        notify_sse_clients(str(admin["_id"]), {
            "id": str(ins.inserted_id),
            "title": admin_notif["title"],
            "message": admin_notif["message"],
            "type": admin_notif["type"],
            "action_url": admin_notif["action_url"],
            "is_read": False,
            "created_at": admin_notif["created_at"].isoformat()
        })
    
    return {
        "success": True,
        "request_id": str(result.inserted_id),
        "message": f"Demande enregistree. Montant: {farmer_amount:,.0f} XOF. En attente de validation.",
        "farmer_amount": farmer_amount,
        "coop_commission": coop_commission
    }


# ============= FARMER ENDPOINTS =============

farmer_router = APIRouter(prefix="/api/farmer/carbon-premiums", tags=["farmer-carbon-premiums"])


@farmer_router.get("/my-requests")
async def get_my_premium_requests(current_user: dict = Depends(get_current_user)):
    """Farmer views their own carbon premium payment requests."""
    farmer_id = str(current_user["_id"])

    requests_list = await db.carbon_payment_requests.find(
        {"farmer_id": farmer_id}
    ).sort("requested_at", -1).to_list(50)

    # Also get admissible parcels count
    admissible = await db.parcels.count_documents({
        "farmer_id": {"$in": [farmer_id, current_user["_id"]]},
        "admissibilite_prime": "admissible"
    })
    has_pending = await db.carbon_payment_requests.count_documents({
        "farmer_id": farmer_id,
        "status": {"$in": ["pending", "approved"]}
    })

    return {
        "parcelles_admissibles": admissible,
        "peut_demander": admissible > 0 and has_pending == 0,
        "requests": [{
            "id": str(r["_id"]),
            "status": r.get("status", ""),
            "farmer_amount": r.get("farmer_amount", 0),
            "parcels_count": r.get("parcels_count", 0),
            "average_carbon_score": r.get("average_carbon_score", 0),
            "requested_at": r["requested_at"].isoformat() if isinstance(r.get("requested_at"), datetime) else str(r.get("requested_at", "")),
            "requested_via": r.get("requested_via", ""),
            "validated_at": r.get("validated_at", "").isoformat() if isinstance(r.get("validated_at"), datetime) else str(r.get("validated_at", "")),
            "paid_at": r.get("paid_at", "").isoformat() if isinstance(r.get("paid_at"), datetime) else str(r.get("paid_at", "")),
            "farmer_transaction_id": r.get("farmer_transaction_id", ""),
            "rejection_reason": r.get("rejection_reason", ""),
        } for r in requests_list]
    }


# ============= SUPER ADMIN ENDPOINTS =============

@router.get("/config")
async def get_carbon_premium_config(current_user: dict = Depends(get_current_user)):
    """Get current carbon premium configuration (Super Admin only)."""
    verify_admin(current_user)
    taux = await get_current_rate()
    return {
        "admissibility_threshold": ADMISSIBILITY_THRESHOLD,
        "taux_par_hectare": taux,
        "repartition": {
            "frais_pct": FRAIS_RATE * 100,
            "distributable_pct": DISTRIBUTABLE_RATE * 100,
            "greenlink_pct": GREENLINK_SHARE * 100,
            "cooperative_pct": COOP_SHARE * 100,
            "paysan_pct": FARMER_SHARE * 100,
        },
        "formula": f"RSE = score x {taux:,.0f} XOF x hectares | 30% frais, 70% distribue (25% GreenLink, 5% Coop, 70% Paysan)"
    }


class UpdateRateRequest(BaseModel):
    taux_par_hectare: float


@router.put("/config/rate")
async def update_premium_rate(
    data: UpdateRateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update the taux_par_hectare (Super Admin only)."""
    verify_admin(current_user)
    if data.taux_par_hectare <= 0:
        raise HTTPException(status_code=400, detail="Le taux doit etre positif")

    await db.carbon_config.update_one(
        {"key": "premium_rate"},
        {"$set": {
            "taux_par_hectare": data.taux_par_hectare,
            "updated_at": datetime.utcnow(),
            "updated_by": str(current_user["_id"]),
            "updated_by_name": current_user.get("full_name", "Admin")
        }},
        upsert=True
    )
    logger.info(f"[CONFIG] Taux mis a jour: {data.taux_par_hectare} XOF par score/ha par {current_user.get('full_name')}")
    return {"message": f"Taux mis a jour: {data.taux_par_hectare:,.0f} XOF/score/ha", "taux_par_hectare": data.taux_par_hectare}


@router.get("/stats")
async def get_carbon_premium_stats(current_user: dict = Depends(get_current_user)):
    """Dashboard stats for carbon premium management."""
    verify_admin(current_user)
    
    pending = await db.carbon_payment_requests.count_documents({"status": "pending"})
    approved = await db.carbon_payment_requests.count_documents({"status": "approved"})
    paid_requests = await db.carbon_payment_requests.find({"status": "paid"}).to_list(10000)
    rejected = await db.carbon_payment_requests.count_documents({"status": "rejected"})
    
    total_paid_farmers = sum(r.get("farmer_amount", 0) for r in paid_requests)
    total_paid_coops = sum(r.get("coop_commission", 0) for r in paid_requests)
    total_greenlink = sum(r.get("greenlink_share", 0) for r in paid_requests)
    total_frais = sum(r.get("frais", 0) for r in paid_requests)
    total_rse = sum(r.get("rse_total", 0) for r in paid_requests)
    
    admissible_parcels = await db.parcels.count_documents({"admissibilite_prime": "admissible"})
    non_admissible = await db.parcels.count_documents({"admissibilite_prime": "non_admissible"})
    
    taux = await get_current_rate()
    
    return {
        "demandes_en_attente": pending,
        "demandes_approuvees": approved,
        "demandes_payees": len(paid_requests),
        "demandes_rejetees": rejected,
        "total_rse": total_rse,
        "total_frais": total_frais,
        "total_greenlink": total_greenlink,
        "total_paye_planteurs": total_paid_farmers,
        "total_paye_cooperatives": total_paid_coops,
        "total_distribue": total_paid_farmers + total_paid_coops + total_greenlink,
        "parcelles_admissibles": admissible_parcels,
        "parcelles_non_admissibles": non_admissible,
        "taux_actuel": taux,
    }


@router.get("/requests")
async def get_payment_requests(
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """List carbon premium payment requests."""
    verify_admin(current_user)
    
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.carbon_payment_requests.find(query).sort("requested_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.carbon_payment_requests.count_documents(query)
    
    return {
        "total": total,
        "requests": [{
            "id": str(r["_id"]),
            "farmer_name": r.get("farmer_name", ""),
            "farmer_phone": r.get("farmer_phone", ""),
            "coop_name": r.get("coop_name", ""),
            "parcels_count": r.get("parcels_count", 0),
            "total_area_hectares": r.get("total_area_hectares", 0),
            "average_carbon_score": r.get("average_carbon_score", 0),
            # Full RSE breakdown (Admin only)
            "rse_total": r.get("rse_total", r.get("total_premium", 0)),
            "frais": r.get("frais", 0),
            "greenlink_share": r.get("greenlink_share", 0),
            "taux_par_hectare": r.get("taux_par_hectare", 0),
            "total_premium": r.get("rse_total", r.get("total_premium", 0)),
            "coop_commission": r.get("coop_commission", 0),
            "farmer_amount": r.get("farmer_amount", 0),
            "status": r.get("status", ""),
            "requested_at": r["requested_at"].isoformat() if isinstance(r.get("requested_at"), datetime) else str(r.get("requested_at", "")),
            "requested_via": r.get("requested_via", ""),
            "parcels": r.get("parcels", []),
            "validated_at": r.get("validated_at", "").isoformat() if isinstance(r.get("validated_at"), datetime) else str(r.get("validated_at", "")),
            "validated_by": r.get("validated_by_name", ""),
            "paid_at": r.get("paid_at", "").isoformat() if isinstance(r.get("paid_at"), datetime) else str(r.get("paid_at", "")),
            "rejection_reason": r.get("rejection_reason", ""),
        } for r in requests]
    }


@router.get("/requests/{request_id}")
async def get_payment_request_detail(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed view of a payment request."""
    verify_admin(current_user)
    
    req = await db.carbon_payment_requests.find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Demande non trouvee")
    
    return {
        "id": str(req["_id"]),
        "farmer_name": req.get("farmer_name", ""),
        "farmer_phone": req.get("farmer_phone", ""),
        "farmer_id": req.get("farmer_id", ""),
        "coop_name": req.get("coop_name", ""),
        "coop_phone": req.get("coop_phone", ""),
        "parcels": req.get("parcels", []),
        "parcels_count": req.get("parcels_count", 0),
        "total_area_hectares": req.get("total_area_hectares", 0),
        "average_carbon_score": req.get("average_carbon_score", 0),
        # Full RSE breakdown (Admin only)
        "rse_total": req.get("rse_total", req.get("total_premium", 0)),
        "frais": req.get("frais", 0),
        "greenlink_share": req.get("greenlink_share", 0),
        "taux_par_hectare": req.get("taux_par_hectare", 0),
        "total_premium": req.get("rse_total", req.get("total_premium", 0)),
        "coop_commission": req.get("coop_commission", 0),
        "farmer_amount": req.get("farmer_amount", 0),
        "status": req.get("status", ""),
        "requested_at": req["requested_at"].isoformat() if isinstance(req.get("requested_at"), datetime) else str(req.get("requested_at", "")),
        "requested_via": req.get("requested_via", ""),
    }


class PaymentValidation(BaseModel):
    action: str  # "approve" or "reject"
    rejection_reason: Optional[str] = None


@router.put("/requests/{request_id}/validate")
async def validate_payment_request(
    request_id: str,
    validation: PaymentValidation,
    current_user: dict = Depends(get_current_user)
):
    """Approve or reject a carbon premium payment request."""
    verify_admin(current_user)
    
    req = await db.carbon_payment_requests.find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Demande non trouvee")
    
    if req.get("status") != "pending":
        raise HTTPException(status_code=400, detail=f"Demande deja traitee (statut: {req['status']})")
    
    farmer_id = req.get("farmer_id", "")
    
    if validation.action == "approve":
        await db.carbon_payment_requests.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {
                "status": "approved",
                "validated_at": datetime.utcnow(),
                "validated_by": str(current_user["_id"]),
                "validated_by_name": current_user.get("full_name", "Admin")
            }}
        )
        
        # Notify farmer
        notif = {
            "user_id": farmer_id,
            "title": "Prime carbone approuvee",
            "message": f"Votre demande de {req['farmer_amount']:,.0f} XOF a ete approuvee. Paiement en cours.",
            "type": "carbon_payment_approved",
            "created_at": datetime.utcnow(),
            "is_read": False
        }
        ins = await db.notifications.insert_one(notif)
        notify_sse_clients(farmer_id, {
            "id": str(ins.inserted_id), "title": notif["title"],
            "message": notif["message"], "type": notif["type"],
            "action_url": "", "is_read": False,
            "created_at": notif["created_at"].isoformat()
        })
        
        return {"message": "Demande approuvee", "status": "approved"}
    
    elif validation.action == "reject":
        await db.carbon_payment_requests.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {
                "status": "rejected",
                "validated_at": datetime.utcnow(),
                "validated_by": str(current_user["_id"]),
                "validated_by_name": current_user.get("full_name", "Admin"),
                "rejection_reason": validation.rejection_reason or ""
            }}
        )
        
        notif = {
            "user_id": farmer_id,
            "title": "Prime carbone refusee",
            "message": f"Votre demande a ete refusee. Motif: {validation.rejection_reason or 'Non specifie'}",
            "type": "carbon_payment_rejected",
            "created_at": datetime.utcnow(),
            "is_read": False
        }
        ins = await db.notifications.insert_one(notif)
        notify_sse_clients(farmer_id, {
            "id": str(ins.inserted_id), "title": notif["title"],
            "message": notif["message"], "type": notif["type"],
            "action_url": "", "is_read": False,
            "created_at": notif["created_at"].isoformat()
        })
        
        return {"message": "Demande rejetee", "status": "rejected"}
    
    raise HTTPException(status_code=400, detail="Action invalide (approve ou reject)")


@router.put("/requests/{request_id}/pay")
async def execute_payment(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Execute Orange Money payment for approved request."""
    verify_admin(current_user)
    
    req = await db.carbon_payment_requests.find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Demande non trouvee")
    
    if req.get("status") != "approved":
        raise HTTPException(status_code=400, detail="La demande doit etre approuvee avant le paiement")
    
    farmer_phone = req.get("farmer_phone", "")
    coop_phone = req.get("coop_phone", "")
    farmer_amount = req.get("farmer_amount", 0)
    coop_commission = req.get("coop_commission", 0)
    farmer_id = req.get("farmer_id", "")
    coop_id = req.get("coop_id", "")
    
    # Execute Orange Money payments (MOCK for now)
    farmer_tx = f"OM-FARMER-{farmer_phone[-4:]}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    coop_tx = f"OM-COOP-{coop_phone[-4:]}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}" if coop_phone else None
    
    logger.info(f"[MOCK] Orange Money payment: {farmer_amount} XOF to {farmer_phone} (tx: {farmer_tx})")
    if coop_phone and coop_commission > 0:
        logger.info(f"[MOCK] Orange Money commission: {coop_commission} XOF to {coop_phone} (tx: {coop_tx})")
    
    # Update request status
    await db.carbon_payment_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {
            "status": "paid",
            "paid_at": datetime.utcnow(),
            "paid_by": str(current_user["_id"]),
            "paid_by_name": current_user.get("full_name", "Admin"),
            "farmer_transaction_id": farmer_tx,
            "coop_transaction_id": coop_tx,
            "payment_method": "orange_money_mock"
        }}
    )
    
    # Mark parcels as paid
    for p in req.get("parcels", []):
        pid = p.get("parcel_id")
        if pid:
            await db.parcels.update_one(
                {"_id": ObjectId(pid)},
                {"$set": {"prime_payee": True, "prime_payment_date": datetime.utcnow()}}
            )
    
    # Notify farmer
    farmer_notif = {
        "user_id": farmer_id,
        "title": "Prime carbone payee",
        "message": f"Vous avez recu {farmer_amount:,.0f} XOF sur votre Orange Money ({farmer_phone}). Ref: {farmer_tx}",
        "type": "carbon_payment_completed",
        "created_at": datetime.utcnow(),
        "is_read": False
    }
    ins_f = await db.notifications.insert_one(farmer_notif)
    notify_sse_clients(farmer_id, {
        "id": str(ins_f.inserted_id), "title": farmer_notif["title"],
        "message": farmer_notif["message"], "type": farmer_notif["type"],
        "action_url": "", "is_read": False,
        "created_at": farmer_notif["created_at"].isoformat()
    })
    
    # Notify cooperative
    if coop_id and coop_commission > 0:
        coop_notif = {
            "user_id": coop_id,
            "title": "Commission prime carbone recue",
            "message": f"Commission de {coop_commission:,.0f} XOF recue pour le planteur {req.get('farmer_name', '')}. Ref: {coop_tx}",
            "type": "carbon_commission_received",
            "created_at": datetime.utcnow(),
            "is_read": False
        }
        ins_c = await db.notifications.insert_one(coop_notif)
        notify_sse_clients(coop_id, {
            "id": str(ins_c.inserted_id), "title": coop_notif["title"],
            "message": coop_notif["message"], "type": coop_notif["type"],
            "action_url": "", "is_read": False,
            "created_at": coop_notif["created_at"].isoformat()
        })
    
    return {
        "message": "Paiements effectues avec succes",
        "farmer_payment": {"amount": farmer_amount, "phone": farmer_phone, "transaction_id": farmer_tx},
        "coop_payment": {"amount": coop_commission, "phone": coop_phone, "transaction_id": coop_tx} if coop_tx else None,
        "status": "paid"
    }
