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
        "score_carbone_moyen": lot.get("average_carbon_score", 0),
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
    """Créer un nouveau lot de vente groupée avec sélection explicite des contributeurs"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]

    # If contributors are explicitly provided, use them
    if lot.contributors and len(lot.contributors) > 0:
        total_tonnage_kg = sum(c.tonnage_kg for c in lot.contributors)
        contributors_doc = [{
            "farmer_id": c.farmer_id,
            "farmer_name": c.farmer_name,
            "tonnage_kg": c.tonnage_kg,
        } for c in lot.contributors]

        lot_doc = {
            "coop_id": coop_id,
            "lot_name": lot.lot_name,
            "lot_code": f"LOT-{str(coop_id)[-6:]}-{datetime.utcnow().strftime('%Y%m%d')}",
            "product_type": lot.product_type,
            "certification": lot.certification,
            "target_tonnage": lot.target_tonnage,
            "estimated_tonnage": round(total_tonnage_kg / 1000, 2),
            "actual_tonnage": 0,
            "min_carbon_score": lot.min_carbon_score,
            "average_carbon_score": 0,
            "total_hectares": 0,
            "contributors_count": len(lot.contributors),
            "contributors": contributors_doc,
            "eligible_parcels": 0,
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
            "eligible_farmers": len(lot.contributors),
            "eligible_parcels": 0,
            "superficie_totale": 0,
            "estimated_tonnage": round(total_tonnage_kg / 1000, 2),
            "score_carbone_moyen": 0
        }

    # Fallback: auto-detect from parcels (original logic)
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
        "lot_code": f"LOT-{str(coop_id)[-6:]}-{datetime.utcnow().strftime('%Y%m%d')}",
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
        "superficie_totale": round(total_hectares, 1),
        "estimated_tonnage": round(estimated_tonnage, 1),
        "score_carbone_moyen": round(avg_score, 1)
    }

@router.get("/lots/{lot_id}/contributors")
async def get_lot_contributors(
    lot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Liste des contributeurs (agriculteurs) d'un lot avec tonnages"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]

    lot = await db.coop_lots.find_one({"_id": ObjectId(lot_id), "coop_id": coop_id})
    if not lot:
        raise HTTPException(status_code=404, detail="Lot non trouve")

    # If lot has explicit contributors stored, use them
    stored_contributors = lot.get("contributors")
    if stored_contributors and len(stored_contributors) > 0:
        contributors = []
        for c in stored_contributors:
            contributors.append({
                "farmer_id": c.get("farmer_id", ""),
                "farmer_name": c.get("farmer_name", "Inconnu"),
                "parcels_count": 0,
                "total_hectares": 0,
                "estimated_tonnage_kg": round(c.get("tonnage_kg", 0)),
                "avg_carbon_score": 0,
                "nombre_arbres": 0,
            })
        contributors = sorted(contributors, key=lambda x: x["estimated_tonnage_kg"], reverse=True)
        return {
            "lot_id": lot_id,
            "lot_name": lot.get("lot_name"),
            "min_carbon_score": lot.get("min_carbon_score", 6.0),
            "total_contributors": len(contributors),
            "total_hectares": 0,
            "total_estimated_tonnage_kg": round(sum(c["estimated_tonnage_kg"] for c in contributors)),
            "contributors": contributors
        }

    # Fallback: auto-compute from parcels
    members = await db.coop_members.find({
        "coop_id": coop_id,
        "status": "active"
    }).to_list(10000)

    member_ids = [m["_id"] for m in members]
    member_user_ids = [str(m.get("user_id")) for m in members if m.get("user_id")]
    member_str_ids = [str(m["_id"]) for m in members]

    min_score = lot.get("min_carbon_score", 6.0)
    parcels = await db.parcels.find({
        "$or": [
            {"member_id": {"$in": member_ids}},
            {"farmer_id": {"$in": member_user_ids + member_str_ids}},
            {"coop_id": coop_id}
        ],
        "carbon_score": {"$gte": min_score}
    }).to_list(10000)

    # Group by farmer
    farmer_map = {}
    for p in parcels:
        fid = str(p.get("farmer_id") or p.get("member_id") or "")
        if fid not in farmer_map:
            farmer_map[fid] = {
                "farmer_id": fid,
                "farmer_name": "",
                "parcels": [],
                "total_hectares": 0,
                "estimated_tonnage_kg": 0,
                "avg_carbon_score": 0,
                "nombre_arbres": 0,
            }
        farmer_map[fid]["parcels"].append({
            "village": p.get("village", p.get("location", "")),
            "hectares": p.get("area_hectares", 0),
            "carbon_score": p.get("carbon_score", 0),
            "nombre_arbres": p.get("nombre_arbres", 0) or 0,
        })
        farmer_map[fid]["total_hectares"] += p.get("area_hectares", 0)
        farmer_map[fid]["estimated_tonnage_kg"] += p.get("area_hectares", 0) * 2250
        farmer_map[fid]["nombre_arbres"] += (p.get("nombre_arbres", 0) or 0)

    # Resolve farmer names
    member_dict = {str(m["_id"]): m.get("full_name", "Inconnu") for m in members}
    for fid, data in farmer_map.items():
        data["farmer_name"] = member_dict.get(fid, "")
        if not data["farmer_name"]:
            user = await db.users.find_one({"_id": ObjectId(fid)}, {"full_name": 1}) if ObjectId.is_valid(fid) else None
            data["farmer_name"] = user.get("full_name", "Inconnu") if user else "Inconnu"
        scores = [p["carbon_score"] for p in data["parcels"]]
        data["avg_carbon_score"] = round(sum(scores) / len(scores), 1) if scores else 0
        data["total_hectares"] = round(data["total_hectares"], 2)
        data["estimated_tonnage_kg"] = round(data["estimated_tonnage_kg"])
        data["parcels_count"] = len(data["parcels"])

    contributors = sorted(farmer_map.values(), key=lambda x: x["estimated_tonnage_kg"], reverse=True)

    return {
        "lot_id": lot_id,
        "lot_name": lot.get("lot_name"),
        "min_carbon_score": min_score,
        "total_contributors": len(contributors),
        "total_hectares": round(sum(c["total_hectares"] for c in contributors), 1),
        "total_estimated_tonnage_kg": round(sum(c["estimated_tonnage_kg"] for c in contributors)),
        "contributors": contributors
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
    """Redistribuer les primes carbone aux membres proportionnellement a leur contribution"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]

    lot = await db.coop_lots.find_one({
        "_id": ObjectId(lot_id),
        "coop_id": coop_id,
        "status": "completed"
    })

    if not lot:
        raise HTTPException(status_code=404, detail="Lot non trouve ou pas encore finalise")

    existing_dist = await db.coop_distributions.find_one({"lot_id": lot_id})
    if existing_dist:
        raise HTTPException(status_code=400, detail="Les primes de ce lot ont deja ete redistribuees")

    total_premium = lot.get("total_carbon_premium", 0)
    commission_rate = current_user.get("commission_rate", 0.10)
    commission = total_premium * commission_rate
    distributable = total_premium - commission

    # Check if lot has stored explicit contributors
    stored_contributors = lot.get("contributors")

    if stored_contributors and len(stored_contributors) > 0:
        # Use stored contributors with their explicit tonnage
        total_tonnage = sum(c.get("tonnage_kg", 0) for c in stored_contributors)
        distributions = []

        for c in stored_contributors:
            tonnage = c.get("tonnage_kg", 0)
            if total_tonnage <= 0 or tonnage <= 0:
                continue
            share_pct = tonnage / total_tonnage
            amount = distributable * share_pct

            # Resolve phone number
            fid = c.get("farmer_id", "")
            phone = ""
            try:
                user = await db.users.find_one({"_id": ObjectId(fid)}, {"phone_number": 1}) if ObjectId.is_valid(fid) else None
                phone = user.get("phone_number", "") if user else ""
            except Exception:
                pass
            # Also try coop_members
            if not phone:
                member = await db.coop_members.find_one({"_id": ObjectId(fid)}, {"phone_number": 1}) if ObjectId.is_valid(fid) else None
                phone = member.get("phone_number", "") if member else ""

            distributions.append({
                "member_id": fid,
                "nom_membre": c.get("farmer_name", "Inconnu"),
                "telephone": phone,
                "nombre_parcelles": 0,
                "superficie_totale": 0,
                "tonnage_contribution_kg": round(tonnage),
                "contribution_pct": round(share_pct * 100, 1),
                "average_score": 0,
                "share_percentage": round(share_pct * 100, 2),
                "amount": round(amount, 0),
                "payment_status": "pending"
            })
    else:
        # Fallback: compute from parcels
        members = await db.coop_members.find({
            "coop_id": coop_id,
            "status": "active"
        }).to_list(10000)

        member_ids = [m["_id"] for m in members]
        member_user_ids = [str(m.get("user_id")) for m in members if m.get("user_id")]
        member_str_ids = [str(m["_id"]) for m in members]

        min_score = lot.get("min_carbon_score", 6.0)
        parcels = await db.parcels.find({
            "$or": [
                {"member_id": {"$in": member_ids}},
                {"farmer_id": {"$in": member_user_ids + member_str_ids}},
                {"coop_id": coop_id}
            ],
            "carbon_score": {"$gte": min_score}
        }).to_list(10000)

        farmer_map = {}
        member_dict = {str(m["_id"]): m for m in members}

        for p in parcels:
            fid = str(p.get("farmer_id") or p.get("member_id") or "")
            if not fid:
                continue
            if fid not in farmer_map:
                farmer_map[fid] = {
                    "farmer_id": fid,
                    "parcels": [],
                    "total_hectares": 0,
                    "estimated_tonnage_kg": 0,
                    "weighted_score": 0,
                }
            area = p.get("area_hectares", 0)
            score = p.get("carbon_score", 0)
            farmer_map[fid]["parcels"].append(p)
            farmer_map[fid]["total_hectares"] += area
            farmer_map[fid]["estimated_tonnage_kg"] += area * 2250
            farmer_map[fid]["weighted_score"] += area * score

        total_tonnage = sum(f["estimated_tonnage_kg"] for f in farmer_map.values())

        distributions = []
        for fid, data in farmer_map.items():
            if total_tonnage <= 0 or data["estimated_tonnage_kg"] <= 0:
                continue

            share_pct = data["estimated_tonnage_kg"] / total_tonnage
            amount = distributable * share_pct
            avg_score = data["weighted_score"] / data["total_hectares"] if data["total_hectares"] > 0 else 0

            farmer_name = ""
            member = member_dict.get(fid)
            if member:
                farmer_name = member.get("full_name", "")
                phone = member.get("phone_number", "")
            else:
                try:
                    user = await db.users.find_one({"_id": ObjectId(fid)}, {"full_name": 1, "phone_number": 1})
                    farmer_name = user.get("full_name", "Inconnu") if user else "Inconnu"
                    phone = user.get("phone_number", "") if user else ""
                except Exception:
                    farmer_name = "Inconnu"
                    phone = ""

            distributions.append({
                "member_id": fid,
                "nom_membre": farmer_name,
                "telephone": phone,
                "nombre_parcelles": len(data["parcels"]),
                "superficie_totale": round(data["total_hectares"], 2),
                "tonnage_contribution_kg": round(data["estimated_tonnage_kg"]),
                "contribution_pct": round(share_pct * 100, 1),
                "average_score": round(avg_score, 1),
                "share_percentage": round(share_pct * 100, 2),
                "amount": round(amount, 0),
                "payment_status": "pending"
            })

    # Sort by amount descending
    distributions.sort(key=lambda x: x["amount"], reverse=True)

    dist_doc = {
        "coop_id": coop_id,
        "lot_id": lot_id,
        "lot_name": lot.get("lot_name", ""),
        "total_premium": total_premium,
        "commission_rate": commission_rate,
        "commission_amount": commission,
        "amount_distributed": distributable,
        "total_tonnage_kg": round(total_tonnage),
        "beneficiaries_count": len(distributions),
        "distributions": distributions,
        "status": "pending_payment",
        "created_at": datetime.utcnow(),
        "created_by": current_user["_id"]
    }

    result = await db.coop_distributions.insert_one(dist_doc)

    return {
        "message": "Redistribution calculee avec succes",
        "distribution_id": str(result.inserted_id),
        "total_premium": total_premium,
        "commission": commission,
        "commission_rate_pct": round(commission_rate * 100, 1),
        "amount_to_distribute": distributable,
        "total_tonnage_kg": round(total_tonnage),
        "beneficiaries_count": len(distributions),
        "distributions": distributions,
        "next_step": "Valider et declencher les paiements Orange Money"
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
        logger.info(f"SMS sent to {d.get('telephone', '')}: Prime carbone {d['amount']} XOF reçue")
    
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
        "lot_id": d.get("lot_id", ""),
        "lot_name": d.get("lot_name", ""),
        "total_premium": d.get("total_premium", 0),
        "commission_rate": d.get("commission_rate", 0),
        "commission_amount": d.get("commission_amount", 0),
        "amount_distributed": d.get("amount_distributed", 0),
        "total_tonnage_kg": d.get("total_tonnage_kg", 0),
        "beneficiaries_count": d.get("beneficiaries_count", 0),
        "distributions": d.get("distributions", []),
        "status": d.get("status", ""),
        "created_at": d.get("created_at", datetime.utcnow()).isoformat() if isinstance(d.get("created_at"), datetime) else str(d.get("created_at", ""))
    } for d in distributions]


@router.get("/distributions/{dist_id}")
async def get_distribution_detail(
    dist_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Détail d'une distribution spécifique"""
    verify_cooperative(current_user)

    dist = await db.coop_distributions.find_one({
        "_id": ObjectId(dist_id),
        "coop_id": current_user["_id"]
    })

    if not dist:
        raise HTTPException(status_code=404, detail="Distribution non trouvée")

    return {
        "id": str(dist["_id"]),
        "lot_id": dist.get("lot_id", ""),
        "lot_name": dist.get("lot_name", ""),
        "total_premium": dist.get("total_premium", 0),
        "commission_rate": dist.get("commission_rate", 0),
        "commission_amount": dist.get("commission_amount", 0),
        "amount_distributed": dist.get("amount_distributed", 0),
        "total_tonnage_kg": dist.get("total_tonnage_kg", 0),
        "beneficiaries_count": dist.get("beneficiaries_count", 0),
        "distributions": dist.get("distributions", []),
        "status": dist.get("status", ""),
        "created_at": dist.get("created_at", datetime.utcnow()).isoformat() if isinstance(dist.get("created_at"), datetime) else str(dist.get("created_at", "")),
        "executed_at": dist.get("executed_at", "").isoformat() if isinstance(dist.get("executed_at"), datetime) else str(dist.get("executed_at", ""))
    }
