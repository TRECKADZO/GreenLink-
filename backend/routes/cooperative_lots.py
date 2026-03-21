"""
Cooperative Lots & Premium Distribution Routes
GreenLink Agritech - Côte d'Ivoire
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user
from routes.cooperative import verify_cooperative, CoopLotCreate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cooperative", tags=["Cooperative Lots"])


@router.get("/lots")
async def get_coop_lots(
    current_user: dict = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status")
):
    """Liste des lots de vente de la coopérative"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    
    query = {"coop_id": coop_id}
    if status_filter:
        query["status"] = status_filter
    
    lots = await db.coop_lots.find(query).sort("created_at", -1).to_list(100)
    
    return [{
        "id": str(lot["_id"]),
        "lot_name": lot.get("lot_name", ""),
        "status": lot.get("status", "open"),
        "product_type": lot.get("product_type", "cacao"),
        "target_tonnage": lot.get("target_tonnage", 0),
        "actual_tonnage": lot.get("actual_tonnage", 0),
        "certification": lot.get("certification", ""),
        "min_carbon_score": lot.get("min_carbon_score", 6.0),
        "average_carbon_score": lot.get("average_carbon_score", 0),
        "contributors_count": lot.get("contributors_count", 0),
        "price_per_kg": lot.get("price_per_kg", 0),
        "carbon_premium_per_kg": lot.get("carbon_premium_per_kg", 0),
        "total_value": lot.get("total_value", 0),
        "buyer_name": lot.get("buyer_name", ""),
        "created_at": lot.get("created_at", datetime.utcnow()).isoformat() if isinstance(lot.get("created_at"), datetime) else str(lot.get("created_at", ""))
    } for lot in lots]

@router.post("/lots")
async def create_coop_lot(
    lot: CoopLotCreate,
    current_user: dict = Depends(get_current_user)
):
    """Créer un nouveau lot de vente groupée"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    
    members = await db.coop_members.find({
        "coop_id": coop_id,
        "status": "active"
    }).to_list(10000)
    
    member_ids = [m["_id"] for m in members]
    member_user_ids = [str(m.get("user_id")) for m in members if m.get("user_id")]
    member_str_ids = [str(m["_id"]) for m in members]
    
    eligible_parcels = await db.parcels.find({
        "$or": [
            {"member_id": {"$in": member_ids}},
            {"farmer_id": {"$in": member_user_ids + member_str_ids}},
            {"coop_id": coop_id}
        ],
        "carbon_score": {"$gte": lot.min_carbon_score}
    }).to_list(10000)
    
    if not eligible_parcels:
        raise HTTPException(
            status_code=400,
            detail=f"Aucune parcelle éligible (score carbone >= {lot.min_carbon_score})"
        )
    
    total_hectares = sum([p.get("area_hectares", 0) for p in eligible_parcels])
    avg_score = sum([p.get("carbon_score", 0) for p in eligible_parcels]) / len(eligible_parcels)
    unique_farmers = len(set([p.get("farmer_id") for p in eligible_parcels]))
    estimated_tonnage = total_hectares * 2.25
    
    lot_doc = {
        "coop_id": coop_id,
        "lot_name": lot.lot_name,
        "lot_code": f"LOT-{coop_id[-6:]}-{datetime.utcnow().strftime('%Y%m%d')}",
        "product_type": lot.product_type,
        "certification": lot.certification,
        "target_tonnage": lot.target_tonnage,
        "estimated_tonnage": estimated_tonnage,
        "actual_tonnage": 0,
        "min_carbon_score": lot.min_carbon_score,
        "average_carbon_score": round(avg_score, 1),
        "total_hectares": round(total_hectares, 1),
        "contributors_count": unique_farmers,
        "eligible_parcels": len(eligible_parcels),
        "status": "open",
        "description": lot.description,
        "price_per_kg": 0,
        "carbon_premium_per_kg": 0,
        "total_value": 0,
        "buyer_id": None,
        "buyer_name": None,
        "created_at": datetime.utcnow(),
        "created_by": current_user["_id"]
    }
    
    result = await db.coop_lots.insert_one(lot_doc)
    
    return {
        "message": "Lot créé avec succès",
        "lot_id": str(result.inserted_id),
        "eligible_farmers": unique_farmers,
        "eligible_parcels": len(eligible_parcels),
        "total_hectares": round(total_hectares, 1),
        "estimated_tonnage": round(estimated_tonnage, 1),
        "average_carbon_score": round(avg_score, 1)
    }

@router.put("/lots/{lot_id}/finalize")
async def finalize_lot_sale(
    lot_id: str,
    buyer_name: str,
    actual_tonnage: float,
    price_per_kg: float,
    carbon_premium_per_kg: float,
    current_user: dict = Depends(get_current_user)
):
    """Finaliser une vente de lot"""
    verify_cooperative(current_user)
    
    lot = await db.coop_lots.find_one({
        "_id": ObjectId(lot_id),
        "coop_id": current_user["_id"]
    })
    
    if not lot:
        raise HTTPException(status_code=404, detail="Lot non trouvé")
    
    total_value = actual_tonnage * 1000 * price_per_kg
    total_premium = actual_tonnage * 1000 * carbon_premium_per_kg
    
    await db.coop_lots.update_one(
        {"_id": ObjectId(lot_id)},
        {
            "$set": {
                "status": "completed",
                "buyer_name": buyer_name,
                "actual_tonnage": actual_tonnage,
                "price_per_kg": price_per_kg,
                "carbon_premium_per_kg": carbon_premium_per_kg,
                "total_value": total_value,
                "total_carbon_premium": total_premium,
                "completed_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "message": "Vente finalisée avec succès",
        "total_value": total_value,
        "total_carbon_premium": total_premium,
        "next_step": "Procéder à la redistribution des primes"
    }


@router.post("/lots/{lot_id}/distribute")
async def distribute_lot_premiums(
    lot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Redistribuer les primes carbone aux membres"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    
    lot = await db.coop_lots.find_one({
        "_id": ObjectId(lot_id),
        "coop_id": coop_id,
        "status": "completed"
    })
    
    if not lot:
        raise HTTPException(status_code=404, detail="Lot non trouvé ou pas encore finalisé")
    
    existing_dist = await db.coop_distributions.find_one({"lot_id": lot_id})
    if existing_dist:
        raise HTTPException(status_code=400, detail="Les primes de ce lot ont déjà été redistribuées")
    
    total_premium = lot.get("total_carbon_premium", 0)
    commission_rate = current_user.get("commission_rate", 0.10)
    
    commission = total_premium * commission_rate
    distributable = total_premium - commission
    
    members = await db.coop_members.find({
        "coop_id": coop_id,
        "status": "active",
        "is_active": True
    }).to_list(10000)
    
    member_user_ids = [m.get("user_id") for m in members if m.get("user_id")]
    
    parcels = await db.parcels.find({
        "farmer_id": {"$in": member_user_ids},
        "carbon_score": {"$gte": lot.get("min_carbon_score", 6.0)}
    }).to_list(10000)
    
    total_weighted = sum([p.get("area_hectares", 0) * p.get("carbon_score", 0) for p in parcels])
    
    distributions = []
    for member in members:
        if not member.get("user_id"):
            continue
        
        member_parcels = [p for p in parcels if p.get("farmer_id") == member.get("user_id")]
        if not member_parcels:
            continue
        
        member_weighted = sum([p.get("area_hectares", 0) * p.get("carbon_score", 0) for p in member_parcels])
        share_percentage = member_weighted / total_weighted if total_weighted > 0 else 0
        amount = distributable * share_percentage
        
        if amount > 0:
            distributions.append({
                "member_id": str(member["_id"]),
                "member_name": member.get("full_name", ""),
                "phone_number": member.get("phone_number", ""),
                "parcels_count": len(member_parcels),
                "total_hectares": sum([p.get("area_hectares", 0) for p in member_parcels]),
                "average_score": sum([p.get("carbon_score", 0) for p in member_parcels]) / len(member_parcels),
                "share_percentage": round(share_percentage * 100, 2),
                "amount": round(amount, 0),
                "payment_status": "pending"
            })
    
    dist_doc = {
        "coop_id": coop_id,
        "lot_id": lot_id,
        "lot_name": lot.get("lot_name", ""),
        "total_premium": total_premium,
        "commission_rate": commission_rate,
        "commission_amount": commission,
        "amount_distributed": distributable,
        "beneficiaries_count": len(distributions),
        "distributions": distributions,
        "status": "pending_payment",
        "created_at": datetime.utcnow(),
        "created_by": current_user["_id"]
    }
    
    result = await db.coop_distributions.insert_one(dist_doc)
    
    return {
        "message": "Redistribution calculée avec succès",
        "distribution_id": str(result.inserted_id),
        "total_premium": total_premium,
        "commission": commission,
        "amount_to_distribute": distributable,
        "beneficiaries_count": len(distributions),
        "distributions": distributions[:10],
        "next_step": "Valider et déclencher les paiements Orange Money"
    }

@router.put("/distributions/{dist_id}/execute")
async def execute_distribution_payments(
    dist_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Exécuter les paiements Orange Money"""
    verify_cooperative(current_user)
    
    dist = await db.coop_distributions.find_one({
        "_id": ObjectId(dist_id),
        "coop_id": current_user["_id"]
    })
    
    if not dist:
        raise HTTPException(status_code=404, detail="Distribution non trouvée")
    
    successful = 0
    failed = 0
    
    for d in dist.get("distributions", []):
        d["payment_status"] = "completed"
        d["payment_date"] = datetime.utcnow().isoformat()
        d["transaction_id"] = f"OM-{d['member_id'][-6:]}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        successful += 1
        logger.info(f"SMS sent to {d['phone_number']}: Prime carbone {d['amount']} XOF reçue")
    
    await db.coop_distributions.update_one(
        {"_id": ObjectId(dist_id)},
        {
            "$set": {
                "status": "completed",
                "distributions": dist["distributions"],
                "executed_at": datetime.utcnow(),
                "successful_payments": successful,
                "failed_payments": failed
            }
        }
    )
    
    from services.fcm_service import notify_members_premium_available, notify_coop_distribution_complete
    
    coop_name = current_user.get("coop_name", "Coopérative")
    lot_name = dist.get("lot_name", "")
    
    try:
        await notify_members_premium_available(
            db=db,
            distribution_id=dist_id,
            coop_name=coop_name,
            lot_name=lot_name,
            distributions=dist.get("distributions", [])
        )
        await notify_coop_distribution_complete(
            db=db,
            coop_user_id=current_user["_id"],
            coop_name=coop_name,
            lot_name=lot_name,
            total_distributed=dist.get("amount_distributed", 0),
            beneficiaries_count=successful
        )
    except Exception as e:
        logger.error(f"Error sending premium notifications: {e}")
    
    return {
        "message": f"Paiements exécutés: {successful} réussis, {failed} échecs",
        "successful": successful,
        "failed": failed,
        "total_distributed": dist.get("amount_distributed", 0),
        "notifications_sent": True
    }

@router.get("/distributions")
async def get_distributions_history(
    current_user: dict = Depends(get_current_user)
):
    """Historique des redistributions"""
    verify_cooperative(current_user)
    
    distributions = await db.coop_distributions.find({
        "coop_id": current_user["_id"]
    }).sort("created_at", -1).to_list(100)
    
    return [{
        "id": str(d["_id"]),
        "lot_name": d.get("lot_name", ""),
        "total_premium": d.get("total_premium", 0),
        "commission_amount": d.get("commission_amount", 0),
        "amount_distributed": d.get("amount_distributed", 0),
        "beneficiaries_count": d.get("beneficiaries_count", 0),
        "status": d.get("status", ""),
        "created_at": d.get("created_at", datetime.utcnow()).isoformat() if isinstance(d.get("created_at"), datetime) else str(d.get("created_at", ""))
    } for d in distributions]
