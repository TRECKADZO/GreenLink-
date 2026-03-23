from fastapi import APIRouter, HTTPException, Depends, Query
from database import db
from routes.auth import get_current_user
from routes.notifications import notify_sse_clients
from datetime import datetime
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cooperative", tags=["cooperative-harvests"])


@router.get("/harvests")
async def get_cooperative_harvests(
    statut: str = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Liste des récoltes des membres de la coopérative"""
    coop_id = current_user["_id"]
    
    query = {"coop_id": coop_id}
    if statut:
        query["statut"] = statut
    
    total = await db.harvests.count_documents(query)
    skip = (page - 1) * limit
    
    harvests = await db.harvests.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrichir avec les infos
    result = []
    for h in harvests:
        # Build display string
        h_unit = h.get("unit", "kg")
        h_qty = h.get("quantity_kg", 0)
        if h_unit == "tonnes":
            h_display = f"{int(h_qty / 1000)} tonne(s) ({int(h_qty)} kg)"
        elif h_unit == "sacs":
            h_display = f"{int(h_qty / 65)} sac(s) ({int(h_qty)} kg)"
        else:
            h_display = f"{int(h_qty)} kg"
        
        result.append({
            "id": str(h["_id"]),
            "farmer_id": h.get("farmer_id", ""),
            "farmer_name": h.get("farmer_name", ""),
            "parcel_id": h.get("parcel_id", ""),
            "quantity_kg": h.get("quantity_kg", 0),
            "original_quantity": h.get("original_quantity", h.get("quantity_kg", 0)),
            "quantity_display": h.get("quantity_display", h_display),
            "quality_grade": h.get("quality_grade", ""),
            "unit": h.get("unit", "kg"),
            "notes": h.get("notes", ""),
            "statut": h.get("statut", "en_attente"),
            "carbon_premium": h.get("carbon_premium", 0),
            "total_amount": h.get("total_amount", 0),
            "harvest_date": h.get("harvest_date", h.get("created_at", "")),
            "created_at": h.get("created_at", ""),
            "validated_at": h.get("validated_at", None),
            "validated_by": h.get("validated_by", None),
            "rejection_reason": h.get("rejection_reason", None),
        })
    
    # Stats globales
    pipeline = [
        {"$match": {"coop_id": coop_id}},
        {"$group": {
            "_id": "$statut",
            "count": {"$sum": 1},
            "total_kg": {"$sum": "$quantity_kg"},
        }}
    ]
    stats_raw = await db.harvests.aggregate(pipeline).to_list(10)
    stats = {
        "total": total,
        "en_attente": 0,
        "validees": 0,
        "rejetees": 0,
        "total_kg_valide": 0,
        "total_kg_attente": 0,
    }
    for s in stats_raw:
        if s["_id"] == "en_attente":
            stats["en_attente"] = s["count"]
            stats["total_kg_attente"] = s["total_kg"]
        elif s["_id"] == "validee":
            stats["validees"] = s["count"]
            stats["total_kg_valide"] = s["total_kg"]
        elif s["_id"] == "rejetee":
            stats["rejetees"] = s["count"]
    
    return {
        "harvests": result,
        "stats": stats,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.put("/harvests/{harvest_id}/validate")
async def validate_harvest(
    harvest_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Valider une récolte"""
    harvest = await db.harvests.find_one({"_id": ObjectId(harvest_id)})
    if not harvest:
        raise HTTPException(status_code=404, detail="Récolte non trouvée")
    
    if harvest.get("coop_id") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Cette récolte ne fait pas partie de votre coopérative")
    
    if harvest.get("statut") != "en_attente":
        raise HTTPException(status_code=400, detail="Cette récolte a déjà été traitée")
    
    await db.harvests.update_one(
        {"_id": ObjectId(harvest_id)},
        {"$set": {
            "statut": "validee",
            "validated_at": datetime.utcnow(),
            "validated_by": current_user["_id"],
        }}
    )
    
    # Build display string for notifications
    unit = harvest.get("unit", "kg")
    stored_qty = harvest.get('quantity_kg', 0)
    if unit == "tonnes":
        qty_display = f"{int(stored_qty / 1000)} tonne(s) ({int(stored_qty)} kg)"
    elif unit == "sacs":
        qty_display = f"{int(stored_qty / 65)} sac(s) ({int(stored_qty)} kg)"
    else:
        qty_display = f"{int(stored_qty)} kg"
    
    # Notifier l'agriculteur
    validated_notif = {
        "user_id": harvest.get("farmer_id", ""),
        "title": "Récolte validée",
        "message": f"Votre récolte de {qty_display} a été validée par votre coopérative",
        "type": "harvest_validated",
        "created_at": datetime.utcnow(),
        "is_read": False
    }
    insert_r = await db.notifications.insert_one(validated_notif)
    farmer_id = str(harvest.get("farmer_id", ""))
    if farmer_id:
        notify_sse_clients(farmer_id, {
            "id": str(insert_r.inserted_id),
            "title": validated_notif["title"],
            "message": validated_notif["message"],
            "type": validated_notif["type"],
            "action_url": "",
            "is_read": False,
            "created_at": validated_notif["created_at"].isoformat()
        })
    
    return {"success": True, "message": "Récolte validée avec succès"}


@router.put("/harvests/{harvest_id}/reject")
async def reject_harvest(
    harvest_id: str,
    body: dict = None,
    current_user: dict = Depends(get_current_user)
):
    """Rejeter une récolte"""
    harvest = await db.harvests.find_one({"_id": ObjectId(harvest_id)})
    if not harvest:
        raise HTTPException(status_code=404, detail="Récolte non trouvée")
    
    if harvest.get("coop_id") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Cette récolte ne fait pas partie de votre coopérative")
    
    if harvest.get("statut") != "en_attente":
        raise HTTPException(status_code=400, detail="Cette récolte a déjà été traitée")
    
    reason = (body or {}).get("reason", "")
    
    await db.harvests.update_one(
        {"_id": ObjectId(harvest_id)},
        {"$set": {
            "statut": "rejetee",
            "validated_at": datetime.utcnow(),
            "validated_by": current_user["_id"],
            "rejection_reason": reason,
        }}
    )
    
    # Build display string for notifications
    unit_r = harvest.get("unit", "kg")
    stored_qty_r = harvest.get('quantity_kg', 0)
    if unit_r == "tonnes":
        qty_display_r = f"{int(stored_qty_r / 1000)} tonne(s) ({int(stored_qty_r)} kg)"
    elif unit_r == "sacs":
        qty_display_r = f"{int(stored_qty_r / 65)} sac(s) ({int(stored_qty_r)} kg)"
    else:
        qty_display_r = f"{int(stored_qty_r)} kg"
    
    # Notifier l'agriculteur
    reason_text = f" - Motif: {reason}" if reason else ""
    reject_notif = {
        "user_id": harvest.get("farmer_id", ""),
        "title": "Récolte rejetée",
        "message": f"Votre récolte de {qty_display_r} a été rejetée{reason_text}",
        "type": "harvest_rejected",
        "created_at": datetime.utcnow(),
        "is_read": False
    }
    insert_rej = await db.notifications.insert_one(reject_notif)
    farmer_id_r = str(harvest.get("farmer_id", ""))
    if farmer_id_r:
        notify_sse_clients(farmer_id_r, {
            "id": str(insert_rej.inserted_id),
            "title": reject_notif["title"],
            "message": reject_notif["message"],
            "type": reject_notif["type"],
            "action_url": "",
            "is_read": False,
            "created_at": reject_notif["created_at"].isoformat()
        })
    
    return {"success": True, "message": "Récolte rejetée"}


@router.get("/harvests/summary")
async def get_harvests_summary(
    current_user: dict = Depends(get_current_user)
):
    """Résumé des récoltes par membre"""
    coop_id = current_user["_id"]
    
    pipeline = [
        {"$match": {"coop_id": coop_id, "statut": "validee"}},
        {"$group": {
            "_id": "$farmer_id",
            "farmer_name": {"$first": "$farmer_name"},
            "total_kg": {"$sum": "$quantity_kg"},
            "total_recoltes": {"$sum": 1},
            "derniere_recolte": {"$max": "$harvest_date"},
            "total_carbon_premium": {"$sum": "$carbon_premium"},
        }},
        {"$sort": {"total_kg": -1}}
    ]
    
    summary = await db.harvests.aggregate(pipeline).to_list(100)
    
    total_kg = sum(s["total_kg"] for s in summary)
    total_recoltes = sum(s["total_recoltes"] for s in summary)
    total_premium = sum(s.get("total_carbon_premium", 0) for s in summary)
    
    return {
        "members": [{
            "farmer_id": s["_id"],
            "farmer_name": s["farmer_name"],
            "total_kg": s["total_kg"],
            "total_recoltes": s["total_recoltes"],
            "derniere_recolte": s.get("derniere_recolte"),
            "total_carbon_premium": s.get("total_carbon_premium", 0),
        } for s in summary],
        "totals": {
            "total_kg": total_kg,
            "total_recoltes": total_recoltes,
            "total_membres": len(summary),
            "total_carbon_premium": total_premium,
        }
    }
