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

logger = logging.getLogger(__name__)

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
    nombre_arbres: Optional[int] = None
    arbres_petits: Optional[int] = None
    arbres_moyens: Optional[int] = None
    arbres_grands: Optional[int] = None
    couverture_ombragee: Optional[float] = None


class ParcelVerificationUpdate(BaseModel):
    verification_status: str  # verified, rejected, needs_correction
    verification_notes: Optional[str] = None
    verified_gps_lat: Optional[float] = None
    verified_gps_lng: Optional[float] = None
    verification_photos: Optional[List[str]] = []
    corrected_area_hectares: Optional[float] = None
    nombre_arbres: Optional[int] = None
    arbres_petits: Optional[int] = None
    arbres_moyens: Optional[int] = None
    arbres_grands: Optional[int] = None
    couverture_ombragee: Optional[float] = None
    pratiques_ecologiques: Optional[List[str]] = []


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
    
    # Calculate tree totals
    total_trees = parcel.nombre_arbres or 0
    if parcel.arbres_petits is not None or parcel.arbres_moyens is not None or parcel.arbres_grands is not None:
        total_trees = (parcel.arbres_petits or 0) + (parcel.arbres_moyens or 0) + (parcel.arbres_grands or 0)
    
    # Carbon score: base + surface bonus + certification bonus + tree bonus
    tree_bonus = min(2.0, total_trees * 0.02) if total_trees > 0 else 0
    carbon_score = round(min(9.5, 5.5 + (parcel.area_hectares * 0.3) + (1.5 if parcel.certification else 0) + tree_bonus), 1)
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
        "nombre_arbres": total_trees if total_trees > 0 else None,
        "arbres_petits": parcel.arbres_petits,
        "arbres_moyens": parcel.arbres_moyens,
        "arbres_grands": parcel.arbres_grands,
        "couverture_ombragee": parcel.couverture_ombragee,
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
    
    # Notifier les agents terrain de la nouvelle parcelle
    try:
        from services.push_notifications import push_service
        await push_service.send_new_parcel_notification_to_agents(
            parcel_data={
                "parcel_id": str(result.inserted_id),
                "nom_producteur": member.get("full_name", "Producteur"),
                "superficie": parcel.area_hectares,
                "village": parcel.village,
                "type_culture": parcel.crop_type,
                "has_gps": bool(parcel.gps_lat and parcel.gps_lng)
            },
            cooperative_id=coop_id,
            cooperative_name=current_user.get("coop_name", "")
        )
    except Exception as e:
        logger.warning(f"Notification agents terrain échouée: {e}")
    
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
        "membre_id": member_id,
        "nom_membre": member.get("full_name", ""),
        "total_parcelles": len(parcels),
        "superficie_totale": round(sum(p.get("area_hectares", 0) for p in parcels), 2),
        "co2_total": round(sum(p.get("co2_captured_tonnes", 0) for p in parcels), 2),
        "score_carbone_moyen": round(sum(p.get("carbon_score", 0) for p in parcels) / max(len(parcels), 1), 1),
        "parcelles": [{
            "id": str(p["_id"]),
            "localisation": p.get("location", ""),
            "village": p.get("village", ""),
            "superficie": p.get("area_hectares", 0),
            "type_culture": p.get("crop_type", "cacao"),
            "score_carbone": p.get("carbon_score", 0),
            "co2_capture": p.get("co2_captured_tonnes", 0),
            "certification": p.get("certification"),
            "coordonnees_gps": p.get("gps_coordinates"),
            "statut_verification": p.get("verification_status", "pending"),
            "verifie_le": p.get("verified_at"),
            "verifie_par": p.get("verified_by"),
            "nombre_arbres": p.get("nombre_arbres", 0),
            "arbres_strate1": p.get("arbres_petits", 0),
            "arbres_strate2": p.get("arbres_moyens", 0),
            "arbres_strate3": p.get("arbres_grands", 0),
            "couverture_ombragee": p.get("couverture_ombragee", 0),
            "pratiques_ecologiques": p.get("pratiques_ecologiques", []),
            "cree_le": p.get("created_at", "")
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
            "producteur_id": p.get("farmer_id", ""),
            "nom_producteur": member.get("full_name", "Inconnu") if member else "Inconnu",
            "telephone_producteur": member.get("phone_number", "") if member else "",
            "localisation": p.get("location", ""),
            "village": p.get("village", ""),
            "superficie": p.get("area_hectares", 0),
            "type_culture": p.get("crop_type", "cacao"),
            "coordonnees_gps": p.get("gps_coordinates"),
            "statut_verification": p.get("verification_status", "pending"),
            "cree_le": p.get("created_at", "")
        })
    
    return {
        "total_en_attente": len(result),
        "parcelles": result
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
            "producteur_id": p.get("farmer_id", ""),
            "nom_producteur": member.get("full_name", "Inconnu") if member else "Inconnu",
            "telephone_producteur": member.get("phone_number", "") if member else "",
            "localisation": p.get("location", ""),
            "village": p.get("village", ""),
            "superficie": p.get("area_hectares", 0),
            "type_culture": p.get("crop_type", "cacao"),
            "score_carbone": p.get("carbon_score", 0),
            "coordonnees_gps": p.get("gps_coordinates"),
            "statut_verification": p.get("verification_status", "pending"),
            "verifie_le": p.get("verified_at"),
            "verifie_par": p.get("verified_by"),
            "notes_verification": p.get("verification_notes"),
            "nombre_arbres": p.get("nombre_arbres", 0),
            "arbres_strate1": p.get("arbres_petits", 0),
            "arbres_strate2": p.get("arbres_moyens", 0),
            "arbres_strate3": p.get("arbres_grands", 0),
            "couverture_ombragee": p.get("couverture_ombragee", 0),
            "cree_le": p.get("created_at", "")
        })
    
    return {
        "total": len(result),
        "compteurs_statut": status_counts,
        "parcelles": result
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

    # Store tree categories
    if verification.arbres_petits is not None:
        update_data["arbres_petits"] = verification.arbres_petits
    if verification.arbres_moyens is not None:
        update_data["arbres_moyens"] = verification.arbres_moyens
    if verification.arbres_grands is not None:
        update_data["arbres_grands"] = verification.arbres_grands
    if verification.nombre_arbres is not None:
        update_data["nombre_arbres"] = verification.nombre_arbres
    elif any(x is not None for x in [verification.arbres_petits, verification.arbres_moyens, verification.arbres_grands]):
        update_data["nombre_arbres"] = (verification.arbres_petits or 0) + (verification.arbres_moyens or 0) + (verification.arbres_grands or 0)
    if verification.couverture_ombragee is not None:
        update_data["couverture_ombragee"] = verification.couverture_ombragee
    if verification.pratiques_ecologiques:
        update_data["pratiques_ecologiques"] = verification.pratiques_ecologiques

    # Recalculate carbon score with tree categories + REDD+ practices
    area = update_data.get("area_hectares", parcel.get("area_hectares", 0))
    from routes.field_agent_dashboard import _calculate_verified_carbon_score

    # Fetch REDD+ tracking practices for this parcel's farmer
    farmer_id_str = str(parcel.get("farmer_id") or parcel.get("member_id") or "")
    redd_practices_adopted = []
    if farmer_id_str:
        redd_visits = await db.redd_tracking_visits.find(
            {"farmer_id": farmer_id_str},
            {"practices_adopted": 1, "_id": 0}
        ).sort("visit_date", -1).limit(5).to_list(5)
        seen_codes = set()
        for visit in redd_visits:
            for practice in (visit.get("practices_adopted") or []):
                code = practice.get("code", "")
                if code and code not in seen_codes:
                    seen_codes.add(code)
                    redd_practices_adopted.append(practice)

    new_carbon_score = _calculate_verified_carbon_score(
        nombre_arbres=update_data.get("nombre_arbres", parcel.get("nombre_arbres")),
        couverture_ombragee=update_data.get("couverture_ombragee", parcel.get("couverture_ombragee")),
        pratiques=update_data.get("pratiques_ecologiques", []),
        area=area,
        existing_practices=parcel.get("farming_practices", []),
        arbres_petits=update_data.get("arbres_petits", parcel.get("arbres_petits")),
        arbres_moyens=update_data.get("arbres_moyens", parcel.get("arbres_moyens")),
        arbres_grands=update_data.get("arbres_grands", parcel.get("arbres_grands")),
        redd_practices=redd_practices_adopted,
    )
    update_data["carbon_score"] = new_carbon_score
    update_data["co2_captured_tonnes"] = round(area * new_carbon_score * 2.5, 2)
    
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
    
    # Notifier le producteur que sa parcelle a été vérifiée
    try:
        farmer_id = parcel.get("farmer_id") or str(parcel.get("member_id", ""))
        status_label = "vérifiée" if verification.verification_status == "verified" else "rejetée"
        notif_title = f"Parcelle {status_label}"
        notif_body = f"Votre parcelle à {parcel.get('location', parcel.get('village', 'N/A'))} ({parcel.get('area_hectares', 0)} ha) a été {status_label} par {current_user.get('full_name', 'un agent')}."
        if verification.verification_notes:
            notif_body += f" Notes: {verification.verification_notes}"
        
        # Stocker pour le producteur
        await db.notification_history.insert_one({
            "user_id": farmer_id,
            "title": notif_title,
            "body": notif_body,
            "data": {
                "type": "parcel_verified",
                "parcel_id": parcel_id,
                "status": verification.verification_status,
                "screen": "Parcels"
            },
            "type": "parcel_verified",
            "read": False,
            "created_at": datetime.utcnow()
        })
        
        # Push au producteur s'il a un token
        from services.push_notifications import push_service
        farmer_user = await db.users.find_one({"_id": ObjectId(farmer_id)}) if farmer_id else None
        if not farmer_user and member:
            farmer_user = await db.users.find_one({"phone_number": member.get("phone_number")})
        if farmer_user and farmer_user.get("push_token"):
            await push_service.send_push_notification(
                tokens=[farmer_user["push_token"]],
                title=notif_title,
                body=notif_body,
                data={"type": "parcel_verified", "parcel_id": parcel_id, "screen": "Parcels"},
                priority="high"
            )
        logger.info(f"Notification parcelle vérifiée envoyée à {farmer_id}")
    except Exception as e:
        logger.warning(f"Notification vérification parcelle échouée: {e}")
    
    return {
        "message": f"Parcelle {'vérifiée' if verification.verification_status == 'verified' else 'mise à jour'}",
        "parcelle_id": parcel_id,
        "statut_verification": verification.verification_status,
        "nom_producteur": member.get("full_name", "Inconnu") if member else "Inconnu",
        "verifie_le": update_data["verified_at"].isoformat()
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
        "producteur": {
            "id": str(member["_id"]) if member else "",
            "nom": member.get("full_name", "Inconnu") if member else "Inconnu",
            "telephone": member.get("phone_number", "") if member else "",
            "village": member.get("village", "") if member else ""
        },
        "localisation": parcel.get("location", ""),
        "village": parcel.get("village", ""),
        "superficie": parcel.get("area_hectares", 0),
        "superficie_declaree": parcel.get("area_hectares_declared"),
        "type_culture": parcel.get("crop_type", "cacao"),
        "score_carbone": parcel.get("carbon_score", 0),
        "co2_capture": parcel.get("co2_captured_tonnes", 0),
        "certification": parcel.get("certification"),
        "coordonnees_gps": parcel.get("gps_coordinates"),
        "coordonnees_gps_verifiees": parcel.get("verified_gps_coordinates"),
        "statut_verification": parcel.get("verification_status", "pending"),
        "notes_verification": parcel.get("verification_notes"),
        "photos_verification": parcel.get("verification_photos", []),
        "verifie_le": parcel.get("verified_at"),
        "nom_verificateur": verifier.get("full_name", "Agent") if verifier else parcel.get("verifier_name"),
        "nombre_arbres": parcel.get("nombre_arbres", 0),
        "arbres_strate1": parcel.get("arbres_petits", 0),
        "arbres_strate2": parcel.get("arbres_moyens", 0),
        "arbres_strate3": parcel.get("arbres_grands", 0),
        "couverture_ombragee": parcel.get("couverture_ombragee", 0),
        "pratiques_ecologiques": parcel.get("pratiques_ecologiques", []),
        "cree_le": parcel.get("created_at"),
        "conforme_eudr": parcel.get("eudr_compliant", True)
    }
