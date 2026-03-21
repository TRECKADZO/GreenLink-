"""
Cooperative Parcels Management Routes
GreenLink Agritech - Côte d'Ivoire
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user
from routes.cooperative import verify_cooperative, coop_id_query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cooperative", tags=["Cooperative Parcels"])


class MemberParcelCreate(BaseModel):
    location: str
    village: str
    area_hectares: float
    crop_type: str = "cacao"
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    certification: Optional[str] = None


class ParcelVerificationUpdate(BaseModel):
    verification_status: str  # verified, rejected, needs_correction
    verification_notes: Optional[str] = None
    verified_gps_lat: Optional[float] = None
    verified_gps_lng: Optional[float] = None
    verification_photos: Optional[List[str]] = []
    corrected_area_hectares: Optional[float] = None


@router.post("/members/{member_id}/parcels")
async def add_member_parcel(
    member_id: str,
    parcel: MemberParcelCreate,
    current_user: dict = Depends(get_current_user)
):
    """Ajouter une parcelle à un membre"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    member = await db.coop_members.find_one({
        "_id": ObjectId(member_id),
        "$or": [{"coop_id": coop_id}, {"cooperative_id": coop_id}]
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    carbon_score = round(min(9.5, 5.5 + (parcel.area_hectares * 0.3) + (1.5 if parcel.certification else 0)), 1)
    co2_captured = round(parcel.area_hectares * carbon_score * 2.5, 2)
    
    parcel_doc = {
        "member_id": str(member["_id"]),
        "coop_id": current_user["_id"],
        "farmer_id": member.get("user_id") or str(member["_id"]),
        "location": parcel.location,
        "village": parcel.village,
        "region": current_user.get("headquarters_region", ""),
        "area_hectares": parcel.area_hectares,
        "crop_type": parcel.crop_type,
        "carbon_score": carbon_score,
        "co2_captured_tonnes": co2_captured,
        "gps_coordinates": {
            "lat": parcel.gps_lat,
            "lng": parcel.gps_lng
        } if parcel.gps_lat and parcel.gps_lng else None,
        "certification": parcel.certification,
        "eudr_compliant": True,
        "deforestation_free": True,
        "status": "active",
        "verification_status": "pending",
        "verified_at": None,
        "verified_by": None,
        "verification_notes": None,
        "verification_photos": [],
        "verified_gps_coordinates": None,
        "created_at": datetime.utcnow(),
        "created_by": current_user["_id"]
    }
    
    result = await db.parcels.insert_one(parcel_doc)
    
    await db.coop_members.update_one(
        {"_id": ObjectId(member_id)},
        {
            "$inc": {"parcels_count": 1, "total_hectares": parcel.area_hectares},
            "$set": {"last_parcel_added": datetime.utcnow()}
        }
    )
    
    return {
        "message": "Parcelle ajoutée avec succès",
        "parcel_id": str(result.inserted_id),
        "carbon_score": carbon_score,
        "co2_captured_tonnes": co2_captured
    }

@router.get("/members/{member_id}/parcels")
async def get_member_parcels(
    member_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Liste des parcelles d'un membre"""
    verify_cooperative(current_user)
    
    coop_id = str(current_user["_id"])
    member = await db.coop_members.find_one({
        "_id": ObjectId(member_id),
        **coop_id_query(coop_id)
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    parcel_or = [{"member_id": member_id}, {"farmer_id": member_id}]
    if member.get("user_id"):
        parcel_or.append({"farmer_id": member["user_id"]})
    parcels = await db.parcels.find({"$or": parcel_or}).to_list(100)
    
    return {
        "member_id": member_id,
        "member_name": member.get("full_name", ""),
        "total_parcels": len(parcels),
        "total_hectares": round(sum(p.get("area_hectares", 0) for p in parcels), 2),
        "total_co2": round(sum(p.get("co2_captured_tonnes", 0) for p in parcels), 2),
        "average_carbon_score": round(sum(p.get("carbon_score", 0) for p in parcels) / max(len(parcels), 1), 1),
        "parcels": [{
            "id": str(p["_id"]),
            "location": p.get("location", ""),
            "village": p.get("village", ""),
            "area_hectares": p.get("area_hectares", 0),
            "crop_type": p.get("crop_type", "cacao"),
            "carbon_score": p.get("carbon_score", 0),
            "co2_captured_tonnes": p.get("co2_captured_tonnes", 0),
            "certification": p.get("certification"),
            "gps_coordinates": p.get("gps_coordinates"),
            "verification_status": p.get("verification_status", "pending"),
            "verified_at": p.get("verified_at"),
            "verified_by": p.get("verified_by"),
            "created_at": p.get("created_at", "")
        } for p in parcels]
    }

@router.delete("/members/{member_id}/parcels/{parcel_id}")
async def delete_member_parcel(
    member_id: str,
    parcel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Supprimer une parcelle d'un membre"""
    verify_cooperative(current_user)
    
    parcel = await db.parcels.find_one({
        "_id": ObjectId(parcel_id),
        "$or": [{"member_id": member_id}, {"farmer_id": member_id}]
    })
    
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcelle non trouvée")
    
    await db.parcels.delete_one({"_id": ObjectId(parcel_id)})
    
    await db.coop_members.update_one(
        {"_id": ObjectId(member_id)},
        {
            "$inc": {"parcels_count": -1, "total_hectares": -parcel.get("area_hectares", 0)}
        }
    )
    
    return {"message": "Parcelle supprimée avec succès"}


@router.get("/parcels/pending-verification")
async def get_parcels_pending_verification(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, le=200)
):
    """Liste des parcelles en attente de vérification pour cette coopérative"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    coop_oid = ObjectId(coop_id) if ObjectId.is_valid(coop_id) else None
    
    member_or = [{"coop_id": coop_id}, {"cooperative_id": coop_id}]
    if coop_oid:
        member_or.extend([{"coop_id": coop_oid}, {"cooperative_id": coop_oid}])
    members = await db.coop_members.find({"$or": member_or}).to_list(10000)
    member_ids = [str(m["_id"]) for m in members]
    member_user_ids = [m.get("user_id") for m in members if m.get("user_id")]
    
    parcel_match = {"$or": [
        {"coop_id": coop_id},
        {"farmer_id": {"$in": member_ids + member_user_ids}},
        {"member_id": {"$in": member_ids}}
    ]}
    parcel_match["verification_status"] = {"$in": ["pending", "needs_correction", None]}
    parcels = await db.parcels.find(parcel_match).sort("created_at", -1).to_list(limit)
    
    result = []
    for p in parcels:
        mid = p.get("member_id")
        member = None
        if mid:
            try:
                member = await db.coop_members.find_one({"_id": ObjectId(mid)})
            except Exception:
                pass
        result.append({
            "id": str(p["_id"]),
            "farmer_id": p.get("farmer_id", ""),
            "farmer_name": member.get("full_name", "Inconnu") if member else "Inconnu",
            "farmer_phone": member.get("phone_number", "") if member else "",
            "location": p.get("location", ""),
            "village": p.get("village", ""),
            "area_hectares": p.get("area_hectares", 0),
            "crop_type": p.get("crop_type", "cacao"),
            "gps_coordinates": p.get("gps_coordinates"),
            "verification_status": p.get("verification_status", "pending"),
            "created_at": p.get("created_at", "")
        })
    
    return {
        "total_pending": len(result),
        "parcels": result
    }

@router.get("/parcels/all")
async def get_all_coop_parcels(
    current_user: dict = Depends(get_current_user),
    verification_status: Optional[str] = Query(None),
    limit: int = Query(100, le=500)
):
    """Liste de toutes les parcelles de la coopérative avec filtre par statut de vérification"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    coop_oid = ObjectId(coop_id) if ObjectId.is_valid(coop_id) else None
    
    member_or = [{"coop_id": coop_id}, {"cooperative_id": coop_id}]
    if coop_oid:
        member_or.extend([{"coop_id": coop_oid}, {"cooperative_id": coop_oid}])
    members = await db.coop_members.find({"$or": member_or}).to_list(10000)
    member_ids = [str(m["_id"]) for m in members]
    member_user_ids = [m.get("user_id") for m in members if m.get("user_id")]
    
    base_parcel_query = {"$or": [
        {"coop_id": coop_id},
        {"farmer_id": {"$in": member_ids + member_user_ids}},
        {"member_id": {"$in": member_ids}}
    ]}
    
    query = {**base_parcel_query}
    if verification_status:
        query["verification_status"] = verification_status
    
    parcels = await db.parcels.find(query).sort("created_at", -1).to_list(limit)
    
    all_parcels = await db.parcels.find(base_parcel_query).to_list(1000)
    status_counts = {
        "pending": sum(1 for p in all_parcels if p.get("verification_status", "pending") in ["pending", None]),
        "verified": sum(1 for p in all_parcels if p.get("verification_status") == "verified"),
        "rejected": sum(1 for p in all_parcels if p.get("verification_status") == "rejected"),
        "needs_correction": sum(1 for p in all_parcels if p.get("verification_status") == "needs_correction")
    }
    
    result = []
    for p in parcels:
        mid = p.get("member_id")
        member = None
        if mid:
            try:
                member = await db.coop_members.find_one({"_id": ObjectId(mid)})
            except Exception:
                pass
        result.append({
            "id": str(p["_id"]),
            "farmer_id": p.get("farmer_id", ""),
            "farmer_name": member.get("full_name", "Inconnu") if member else "Inconnu",
            "farmer_phone": member.get("phone_number", "") if member else "",
            "location": p.get("location", ""),
            "village": p.get("village", ""),
            "area_hectares": p.get("area_hectares", 0),
            "crop_type": p.get("crop_type", "cacao"),
            "carbon_score": p.get("carbon_score", 0),
            "gps_coordinates": p.get("gps_coordinates"),
            "verification_status": p.get("verification_status", "pending"),
            "verified_at": p.get("verified_at"),
            "verified_by": p.get("verified_by"),
            "verification_notes": p.get("verification_notes"),
            "created_at": p.get("created_at", "")
        })
    
    return {
        "total": len(result),
        "status_counts": status_counts,
        "parcels": result
    }

@router.put("/parcels/{parcel_id}/verify")
async def verify_parcel(
    parcel_id: str,
    verification: ParcelVerificationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Vérifier/Valider une parcelle (pour agents terrain)"""
    if current_user.get("user_type") not in ["cooperative", "field_agent", "agent_terrain", "super_admin"]:
        raise HTTPException(status_code=403, detail="Non autorisé à vérifier les parcelles")
    
    parcel = await db.parcels.find_one({"_id": ObjectId(parcel_id)})
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcelle non trouvée")
    
    update_data = {
        "verification_status": verification.verification_status,
        "verified_at": datetime.utcnow(),
        "verified_by": str(current_user["_id"]),
        "verifier_name": current_user.get("full_name", "Agent"),
        "verification_notes": verification.verification_notes
    }
    
    if verification.verified_gps_lat and verification.verified_gps_lng:
        update_data["verified_gps_coordinates"] = {
            "lat": verification.verified_gps_lat,
            "lng": verification.verified_gps_lng
        }
    
    if verification.verification_photos:
        update_data["verification_photos"] = verification.verification_photos
    
    if verification.corrected_area_hectares and verification.corrected_area_hectares != parcel.get("area_hectares"):
        update_data["area_hectares_declared"] = parcel.get("area_hectares")
        update_data["area_hectares"] = verification.corrected_area_hectares
        new_carbon_score = round(min(9.5, 5.5 + (verification.corrected_area_hectares * 0.3)), 1)
        update_data["carbon_score"] = new_carbon_score
        update_data["co2_captured_tonnes"] = round(verification.corrected_area_hectares * new_carbon_score * 2.5, 2)
    
    await db.parcels.update_one(
        {"_id": ObjectId(parcel_id)},
        {"$set": update_data}
    )
    
    member = await db.coop_members.find_one({"_id": parcel.get("member_id")})
    
    try:
        import asyncio as _asyncio
        from services.notification_email_helper import send_notification_email_async
        farmer_id = parcel.get("farmer_id") or str(parcel.get("member_id", ""))
        _asyncio.create_task(send_notification_email_async(db, "parcel_verified",
            farmer_id=farmer_id,
            parcel_location=parcel.get("location") or parcel.get("village", ""),
            status=verification.verification_status,
            carbon_score=parcel.get("carbon_score"),
            notes=verification.verification_notes
        ))
    except Exception as e:
        logger.error(f"Parcel verification email notification failed: {e}")
    
    return {
        "message": f"Parcelle {'vérifiée' if verification.verification_status == 'verified' else 'mise à jour'}",
        "parcel_id": parcel_id,
        "verification_status": verification.verification_status,
        "farmer_name": member.get("full_name", "Inconnu") if member else "Inconnu",
        "verified_at": update_data["verified_at"].isoformat()
    }

@router.get("/parcels/{parcel_id}/details")
async def get_parcel_details(
    parcel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Détails complets d'une parcelle pour vérification"""
    parcel = await db.parcels.find_one({"_id": ObjectId(parcel_id)})
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcelle non trouvée")
    
    member = await db.coop_members.find_one({"_id": parcel.get("member_id")})
    
    verifier = None
    if parcel.get("verified_by"):
        verifier = await db.users.find_one({"_id": ObjectId(parcel["verified_by"])})
    
    return {
        "id": str(parcel["_id"]),
        "farmer": {
            "id": str(member["_id"]) if member else "",
            "name": member.get("full_name", "Inconnu") if member else "Inconnu",
            "phone": member.get("phone_number", "") if member else "",
            "village": member.get("village", "") if member else ""
        },
        "location": parcel.get("location", ""),
        "village": parcel.get("village", ""),
        "area_hectares": parcel.get("area_hectares", 0),
        "area_hectares_declared": parcel.get("area_hectares_declared"),
        "crop_type": parcel.get("crop_type", "cacao"),
        "carbon_score": parcel.get("carbon_score", 0),
        "co2_captured_tonnes": parcel.get("co2_captured_tonnes", 0),
        "certification": parcel.get("certification"),
        "gps_coordinates": parcel.get("gps_coordinates"),
        "verified_gps_coordinates": parcel.get("verified_gps_coordinates"),
        "verification_status": parcel.get("verification_status", "pending"),
        "verification_notes": parcel.get("verification_notes"),
        "verification_photos": parcel.get("verification_photos", []),
        "verified_at": parcel.get("verified_at"),
        "verifier_name": verifier.get("full_name", "Agent") if verifier else parcel.get("verifier_name"),
        "created_at": parcel.get("created_at"),
        "eudr_compliant": parcel.get("eudr_compliant", True)
    }
