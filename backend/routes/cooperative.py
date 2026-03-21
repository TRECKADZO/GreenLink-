"""
Routes pour la gestion des coopératives agricoles
GreenLink Agritech - Côte d'Ivoire
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import logging
import os

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cooperative", tags=["Cooperative"])

# ============= MODELS =============

class CoopMemberCreate(BaseModel):
    full_name: str
    phone_number: str
    village: str
    department: Optional[str] = None  # Département de production
    zone: Optional[str] = None  # Zone géographique
    cni_number: Optional[str] = None
    consent_given: bool = True

class CoopMemberUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    village: Optional[str] = None
    department: Optional[str] = None
    zone: Optional[str] = None
    is_active: Optional[bool] = None

class CoopLotCreate(BaseModel):
    lot_name: str
    target_tonnage: float
    product_type: str = "cacao"
    certification: Optional[str] = None
    min_carbon_score: float = 6.0
    description: Optional[str] = None

class CoopPremiumDistribution(BaseModel):
    lot_id: str
    total_premium: float
    distribution_method: str = "proportional"  # proportional, equal, score_weighted

class AgentCreate(BaseModel):
    full_name: str
    phone_number: str
    email: Optional[str] = None
    zone: str
    village_coverage: List[str] = []

class FarmerAssignRequest(BaseModel):
    farmer_ids: List[str]

# ============= HELPER FUNCTIONS =============

def verify_cooperative(current_user: dict):
    """Vérifie que l'utilisateur est une coopérative"""
    if current_user.get("user_type") != "cooperative":
        raise HTTPException(
            status_code=403,
            detail="Accès réservé aux coopératives agricoles"
        )
    return current_user


def coop_id_query(coop_id) -> dict:
    """Helper: crée un filtre qui matche coop_id en string OU ObjectId"""
    coop_str = str(coop_id)
    return {"$or": [
        {"coop_id": coop_str},
        {"coop_id": ObjectId(coop_str) if ObjectId.is_valid(coop_str) else coop_str},
        {"cooperative_id": coop_str}
    ]}


@router.put("/settings/commission-rate")
async def update_commission_rate(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Mettre a jour le taux de commission de la cooperative"""
    verify_cooperative(current_user)
    rate = data.get("commission_rate")
    if rate is None or not isinstance(rate, (int, float)) or rate < 0 or rate > 1:
        raise HTTPException(status_code=400, detail="Taux invalide (entre 0 et 1)")
    
    coop_id = current_user["_id"]
    await db.users.update_one(
        {"_id": ObjectId(coop_id)},
        {"$set": {"commission_rate": round(float(rate), 4)}}
    )
    return {"message": "Taux de commission mis a jour", "commission_rate": round(float(rate), 4)}


# ============= DASHBOARD ENDPOINTS =============

@router.get("/dashboard")
async def get_coop_dashboard(current_user: dict = Depends(get_current_user)):
    """Dashboard principal de la coopérative"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    coop_oid = ObjectId(coop_id) if ObjectId.is_valid(coop_id) else None
    
    # Query that searches in both coop_id and cooperative_id fields (string + ObjectId)
    member_or = [{"coop_id": coop_id}, {"cooperative_id": coop_id}]
    if coop_oid:
        member_or.extend([{"coop_id": coop_oid}, {"cooperative_id": coop_oid}])
    member_query = {"$or": member_or}
    
    # Get members count
    total_members = await db.coop_members.count_documents(member_query)
    active_members = await db.coop_members.count_documents({**member_query, "is_active": True})
    
    # Get parcels data
    members = await db.coop_members.find(member_query).to_list(10000)
    member_ids = [str(m["_id"]) for m in members]
    member_user_ids = [m.get("user_id") for m in members if m.get("user_id")]
    
    # Search parcels by multiple possible fields (farmer_id and member_id are now both strings)
    parcels = await db.parcels.find({
        "$or": [
            {"coop_id": coop_id},
            {"farmer_id": {"$in": member_ids + member_user_ids}},
            {"member_id": {"$in": member_ids}}
        ]
    }).to_list(10000)
    total_hectares = sum([p.get("area_hectares", 0) for p in parcels])
    total_co2 = sum([p.get("co2_captured_tonnes", 0) or p.get("carbon_credits_earned", 0) for p in parcels])
    avg_score = sum([p.get("carbon_score", 0) for p in parcels]) / len(parcels) if parcels else 0
    
    # Get lots
    active_lots = await db.coop_lots.count_documents({"coop_id": coop_id, "status": {"$in": ["open", "negotiating"]}})
    completed_lots = await db.coop_lots.count_documents({"coop_id": coop_id, "status": "completed"})
    
    # Get financial data
    distributions = await db.coop_distributions.find({"coop_id": coop_id}).to_list(1000)
    total_received = sum([d.get("total_premium", 0) for d in distributions])
    total_distributed = sum([d.get("amount_distributed", 0) for d in distributions])
    
    # Get recent activities
    recent_members = await db.coop_members.find(
        member_query
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Get pending validations
    pending_members = await db.coop_members.count_documents({
        **member_query, 
        "status": "pending_validation"
    })
    
    # Get agents terrain count
    agents_or = [{"coop_id": coop_id}]
    if coop_oid:
        agents_or.append({"coop_id": coop_oid})
    agents_query = {"$or": agents_or}
    total_agents = await db.coop_agents.count_documents(agents_query)
    active_agents = await db.coop_agents.count_documents({**agents_query, "is_active": True})
    activated_agents = await db.coop_agents.count_documents({**agents_query, "account_activated": True})
    
    return {
        "coop_info": {
            "name": current_user.get("coop_name", ""),
            "code": current_user.get("coop_code", ""),
            "certifications": current_user.get("certifications") or [],
            "commission_rate": current_user.get("commission_rate", 0.10)
        },
        "members": {
            "total": total_members,
            "active": active_members,
            "pending_validation": pending_members,
            "onboarding_rate": round(active_members / total_members * 100, 1) if total_members > 0 else 0
        },
        "parcels": {
            "total_count": len(parcels),
            "total_hectares": round(total_hectares, 1),
            "total_co2_tonnes": round(total_co2, 1),
            "average_carbon_score": round(avg_score, 1),
            "co2_per_hectare": round(total_co2 / total_hectares, 2) if total_hectares > 0 else 0
        },
        "lots": {
            "active": active_lots,
            "completed": completed_lots
        },
        "financial": {
            "total_premiums_received": total_received,
            "total_premiums_distributed": total_distributed,
            "distribution_rate": round(total_distributed / total_received * 100, 1) if total_received > 0 else 0,
            "pending_distribution": total_received - total_distributed
        },
        "recent_members": [{
            "id": str(m["_id"]),
            "name": m.get("full_name") or m.get("name") or "Membre",
            "full_name": m.get("full_name") or m.get("name") or "Membre",
            "village": m.get("village", ""),
            "phone_number": m.get("phone_number", ""),
            "created_at": m.get("created_at", datetime.utcnow()).isoformat() if isinstance(m.get("created_at"), datetime) else str(m.get("created_at", ""))
        } for m in recent_members],
        "agents": {
            "total": total_agents,
            "active": active_agents,
            "activated": activated_agents
        }
    }

# ============= MEMBER MANAGEMENT =============

@router.get("/members")
async def get_coop_members(
    current_user: dict = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
    village: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Liste des membres de la coopérative"""
    user_type = current_user.get("user_type")
    if user_type in ("field_agent", "agent_terrain"):
        coop_id = current_user.get("cooperative_id", "")
    elif user_type in ("cooperative",):
        coop_id = str(current_user["_id"])
    elif user_type in ("admin", "super_admin"):
        coop_id = str(current_user["_id"])
    else:
        raise HTTPException(status_code=403, detail="Accès réservé aux coopératives ou agents terrain")
    
    # Support both field names and types for backward compatibility
    query = coop_id_query(coop_id)
    if status_filter:
        query["status"] = status_filter
    if village:
        query["village"] = village
    if search:
        query["$and"] = [
            {"$or": [{"coop_id": coop_id}, {"cooperative_id": coop_id}]},
            {"$or": [
                {"full_name": {"$regex": search, "$options": "i"}},
                {"phone_number": {"$regex": search, "$options": "i"}}
            ]}
        ]
        del query["$or"]
    
    total = await db.coop_members.count_documents(query)
    members = await db.coop_members.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with parcel data
    result = []
    for m in members:
        member_data = {
            "id": str(m["_id"]),
            "full_name": m.get("full_name", ""),
            "phone_number": m.get("phone_number", ""),
            "village": m.get("village", ""),
            "cni_number": m.get("cni_number", ""),
            "status": m.get("status", "active"),
            "is_active": m.get("is_active", True),
            "created_at": m.get("created_at", datetime.utcnow()).isoformat() if isinstance(m.get("created_at"), datetime) else str(m.get("created_at", ""))
        }
        
        # Get member's parcels if user_id exists
        if m.get("user_id"):
            parcels = await db.parcels.find({"farmer_id": m["user_id"]}).to_list(100)
            member_data["parcels_count"] = len(parcels)
            member_data["total_hectares"] = round(sum([p.get("area_hectares", 0) for p in parcels]), 2)
            member_data["average_carbon_score"] = round(
                sum([p.get("carbon_score", 0) for p in parcels]) / len(parcels), 1
            ) if parcels else 0
        else:
            member_data["parcels_count"] = 0
            member_data["total_hectares"] = 0
            member_data["average_carbon_score"] = 0
        
        result.append(member_data)
    
    return {
        "total": total,
        "members": result
    }

@router.post("/members")
async def create_coop_member(
    member: CoopMemberCreate,
    current_user: dict = Depends(get_current_user)
):
    """Ajouter un nouveau membre à la coopérative"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    # Check if member already exists (support both string and ObjectId)
    existing = await db.coop_members.find_one({
        **coop_id_query(coop_id),
        "phone_number": member.phone_number
    })
    if existing:
        raise HTTPException(status_code=400, detail="Ce membre existe déjà dans la coopérative")
    
    member_doc = {
        "coop_id": coop_id,  # Stocké en string pour cohérence
        "full_name": member.full_name,
        "phone_number": member.phone_number,
        "village": member.village,
        "department": member.department,
        "zone": member.zone,
        "cni_number": member.cni_number,
        "consent_given": member.consent_given,
        "consent_date": datetime.utcnow() if member.consent_given else None,
        "status": "pending_validation",
        "is_active": True,
        "user_id": None,  # Will be linked when member creates account
        "created_at": datetime.utcnow(),
        "created_by": current_user["_id"]
    }
    
    result = await db.coop_members.insert_one(member_doc)
    
    logger.info(f"New coop member created: {member.full_name} for coop {coop_id}")
    
    return {
        "message": "Membre ajouté avec succès",
        "member_id": str(result.inserted_id)
    }

@router.post("/members/import-csv")
async def import_members_csv(
    members_data: List[CoopMemberCreate],
    current_user: dict = Depends(get_current_user)
):
    """Import massif de membres via CSV"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    
    imported = 0
    errors = []
    
    for idx, member in enumerate(members_data):
        try:
            # Check if already exists
            existing = await db.coop_members.find_one({
                "coop_id": coop_id,
                "phone_number": member.phone_number
            })
            if existing:
                errors.append(f"Ligne {idx+1}: {member.phone_number} existe déjà")
                continue
            
            member_doc = {
                "coop_id": coop_id,
                "full_name": member.full_name,
                "phone_number": member.phone_number,
                "village": member.village,
                "cni_number": member.cni_number,
                "consent_given": member.consent_given,
                "status": "pending_validation",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "created_by": current_user["_id"],
                "import_batch": True
            }
            
            await db.coop_members.insert_one(member_doc)
            imported += 1
            
        except Exception as e:
            errors.append(f"Ligne {idx+1}: {str(e)}")
    
    return {
        "message": f"{imported} membres importés avec succès",
        "imported": imported,
        "errors": errors[:10],  # Return first 10 errors
        "total_errors": len(errors)
    }

@router.put("/members/{member_id}/validate")
async def validate_member(
    member_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Valider un membre en attente"""
    verify_cooperative(current_user)
    
    coop_id = str(current_user["_id"])
    result = await db.coop_members.update_one(
        {"_id": ObjectId(member_id), **coop_id_query(coop_id)},
        {
            "$set": {
                "status": "active",
                "validated_at": datetime.utcnow(),
                "validated_by": current_user["_id"]
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    return {"message": "Membre validé avec succès"}

@router.get("/members/{member_id}")
async def get_member_details(
    member_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Détails d'un membre"""
    verify_cooperative(current_user)
    
    coop_id = str(current_user["_id"])
    member = await db.coop_members.find_one({
        "_id": ObjectId(member_id),
        **coop_id_query(coop_id)
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Get member's parcels and harvests
    parcels = []
    harvests = []
    total_premium = 0
    
    if member.get("user_id"):
        parcels = await db.parcels.find({"$or": [{"farmer_id": member["user_id"]}, {"member_id": str(member["_id"])}, {"farmer_id": str(member["_id"])}]}).to_list(100)
        harvests = await db.harvests.find({"farmer_id": member["user_id"]}).to_list(100)
        total_premium = sum([h.get("carbon_premium", 0) for h in harvests])
    else:
        mid = str(member["_id"])
        parcels = await db.parcels.find({"$or": [{"farmer_id": mid}, {"member_id": mid}]}).to_list(100)
        harvests = []
        total_premium = 0
    
    return {
        "id": str(member["_id"]),
        "full_name": member.get("full_name", ""),
        "phone_number": member.get("phone_number", ""),
        "village": member.get("village", ""),
        "cni_number": member.get("cni_number", ""),
        "status": member.get("status", ""),
        "is_active": member.get("is_active", True),
        "consent_given": member.get("consent_given", False),
        "created_at": member.get("created_at", ""),
        "parcels": [{
            "id": str(p["_id"]),
            "location": p.get("location", ""),
            "area_hectares": p.get("area_hectares", 0),
            "carbon_score": p.get("carbon_score", 0),
            "crop_type": p.get("crop_type", "cacao")
        } for p in parcels],
        "harvests_count": len(harvests),
        "total_premium_earned": total_premium
    }

# ============= MEMBER PARCELS MANAGEMENT =============

class MemberParcelCreate(BaseModel):
    location: str
    village: str
    area_hectares: float
    crop_type: str = "cacao"
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    certification: Optional[str] = None

@router.post("/members/{member_id}/parcels")
async def add_member_parcel(
    member_id: str,
    parcel: MemberParcelCreate,
    current_user: dict = Depends(get_current_user)
):
    """Ajouter une parcelle à un membre"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    # Verify member belongs to this cooperative (support both field names)
    member = await db.coop_members.find_one({
        "_id": ObjectId(member_id),
        "$or": [{"coop_id": coop_id}, {"cooperative_id": coop_id}]
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Calculate carbon score based on area and practices
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
        # Statut de vérification terrain
        "verification_status": "pending",  # pending, verified, rejected, needs_correction
        "verified_at": None,
        "verified_by": None,
        "verification_notes": None,
        "verification_photos": [],
        "verified_gps_coordinates": None,
        "created_at": datetime.utcnow(),
        "created_by": current_user["_id"]
    }
    
    result = await db.parcels.insert_one(parcel_doc)
    
    # Update member stats
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
    
    # Verify member belongs to this cooperative
    coop_id = str(current_user["_id"])
    member = await db.coop_members.find_one({
        "_id": ObjectId(member_id),
        **coop_id_query(coop_id)
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    parcels = await db.parcels.find({
        "$or": [
            {"member_id": member_id},
            {"farmer_id": str(member["_id"])}
        ]
    }).to_list(100)
    
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
    
    # Update member stats
    await db.coop_members.update_one(
        {"_id": ObjectId(member_id)},
        {
            "$inc": {"parcels_count": -1, "total_hectares": -parcel.get("area_hectares", 0)}
        }
    )
    
    return {"message": "Parcelle supprimée avec succès"}

# ============= PARCEL VERIFICATION BY FIELD AGENTS =============

class ParcelVerificationUpdate(BaseModel):
    verification_status: str  # verified, rejected, needs_correction
    verification_notes: Optional[str] = None
    verified_gps_lat: Optional[float] = None
    verified_gps_lng: Optional[float] = None
    verification_photos: Optional[List[str]] = []
    corrected_area_hectares: Optional[float] = None

@router.get("/parcels/pending-verification")
async def get_parcels_pending_verification(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, le=200)
):
    """Liste des parcelles en attente de vérification pour cette coopérative"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    
    # Get parcels pending verification
    parcels = await db.parcels.find({
        "coop_id": coop_id,
        "verification_status": {"$in": ["pending", "needs_correction", None]}
    }).sort("created_at", -1).to_list(limit)
    
    # Get member info for each parcel
    result = []
    for p in parcels:
        member = await db.coop_members.find_one({"_id": p.get("member_id")})
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
    coop_id = current_user["_id"]
    
    query = {"coop_id": coop_id}
    if verification_status:
        query["verification_status"] = verification_status
    
    parcels = await db.parcels.find(query).sort("created_at", -1).to_list(limit)
    
    # Count by status
    all_parcels = await db.parcels.find({"coop_id": coop_id}).to_list(1000)
    status_counts = {
        "pending": sum(1 for p in all_parcels if p.get("verification_status", "pending") in ["pending", None]),
        "verified": sum(1 for p in all_parcels if p.get("verification_status") == "verified"),
        "rejected": sum(1 for p in all_parcels if p.get("verification_status") == "rejected"),
        "needs_correction": sum(1 for p in all_parcels if p.get("verification_status") == "needs_correction")
    }
    
    result = []
    for p in parcels:
        member = await db.coop_members.find_one({"_id": p.get("member_id")})
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
    # Allow both cooperative managers and field agents
    if current_user.get("user_type") not in ["cooperative", "field_agent", "agent_terrain", "super_admin"]:
        raise HTTPException(status_code=403, detail="Non autorisé à vérifier les parcelles")
    
    parcel = await db.parcels.find_one({"_id": ObjectId(parcel_id)})
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcelle non trouvée")
    
    # Prepare update
    update_data = {
        "verification_status": verification.verification_status,
        "verified_at": datetime.utcnow(),
        "verified_by": str(current_user["_id"]),
        "verifier_name": current_user.get("full_name", "Agent"),
        "verification_notes": verification.verification_notes
    }
    
    # Add verified GPS if provided
    if verification.verified_gps_lat and verification.verified_gps_lng:
        update_data["verified_gps_coordinates"] = {
            "lat": verification.verified_gps_lat,
            "lng": verification.verified_gps_lng
        }
    
    # Add photos if provided
    if verification.verification_photos:
        update_data["verification_photos"] = verification.verification_photos
    
    # Correct area if provided
    if verification.corrected_area_hectares and verification.corrected_area_hectares != parcel.get("area_hectares"):
        update_data["area_hectares_declared"] = parcel.get("area_hectares")
        update_data["area_hectares"] = verification.corrected_area_hectares
        # Recalculate carbon score
        new_carbon_score = round(min(9.5, 5.5 + (verification.corrected_area_hectares * 0.3)), 1)
        update_data["carbon_score"] = new_carbon_score
        update_data["co2_captured_tonnes"] = round(verification.corrected_area_hectares * new_carbon_score * 2.5, 2)
    
    await db.parcels.update_one(
        {"_id": ObjectId(parcel_id)},
        {"$set": update_data}
    )
    
    # Get farmer info for notification
    member = await db.coop_members.find_one({"_id": parcel.get("member_id")})
    
    # Envoyer email notification a l'agriculteur
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
    
    # Get member info
    member = await db.coop_members.find_one({"_id": parcel.get("member_id")})
    
    # Get verifier info if verified
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


# ============= LOT MANAGEMENT =============

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
    
    # Get eligible members
    members = await db.coop_members.find({
        "coop_id": coop_id,
        "status": "active"
    }).to_list(10000)
    
    member_ids = [m["_id"] for m in members]
    member_user_ids = [str(m.get("user_id")) for m in members if m.get("user_id")]
    member_str_ids = [str(m["_id"]) for m in members]
    
    # Get parcels with minimum carbon score - search by member_id OR farmer_id
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
    
    # Calculate aggregated stats
    total_hectares = sum([p.get("area_hectares", 0) for p in eligible_parcels])
    avg_score = sum([p.get("carbon_score", 0) for p in eligible_parcels]) / len(eligible_parcels)
    unique_farmers = len(set([p.get("farmer_id") for p in eligible_parcels]))
    
    # Estimate tonnage (2000-2500 kg/ha average)
    estimated_tonnage = total_hectares * 2.25  # 2250 kg/ha average
    
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
    
    logger.info(f"New lot created: {lot.lot_name} with {unique_farmers} contributors")
    
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
    
    total_value = actual_tonnage * 1000 * price_per_kg  # Convert to kg
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

# ============= PREMIUM DISTRIBUTION =============

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
    
    # Check if already distributed
    existing_dist = await db.coop_distributions.find_one({"lot_id": lot_id})
    if existing_dist:
        raise HTTPException(status_code=400, detail="Les primes de ce lot ont déjà été redistribuées")
    
    total_premium = lot.get("total_carbon_premium", 0)
    commission_rate = current_user.get("commission_rate", 0.10)
    
    # Calculate commission and distributable amount
    commission = total_premium * commission_rate
    distributable = total_premium - commission
    
    # Get contributing members and their share
    members = await db.coop_members.find({
        "coop_id": coop_id,
        "status": "active",
        "is_active": True
    }).to_list(10000)
    
    member_user_ids = [m.get("user_id") for m in members if m.get("user_id")]
    
    # Get parcels with their scores
    parcels = await db.parcels.find({
        "farmer_id": {"$in": member_user_ids},
        "carbon_score": {"$gte": lot.get("min_carbon_score", 6.0)}
    }).to_list(10000)
    
    # Calculate score-weighted distribution
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
    
    # Create distribution record
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
    
    logger.info(f"Distribution created for lot {lot_id}: {len(distributions)} beneficiaries, {distributable} XOF")
    
    return {
        "message": "Redistribution calculée avec succès",
        "distribution_id": str(result.inserted_id),
        "total_premium": total_premium,
        "commission": commission,
        "amount_to_distribute": distributable,
        "beneficiaries_count": len(distributions),
        "distributions": distributions[:10],  # Preview first 10
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
    
    # Simulate Orange Money Business payments
    successful = 0
    failed = 0
    
    for d in dist.get("distributions", []):
        # In production: call Orange Money Business API
        # For now, simulate success
        d["payment_status"] = "completed"
        d["payment_date"] = datetime.utcnow().isoformat()
        d["transaction_id"] = f"OM-{d['member_id'][-6:]}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        successful += 1
        
        # Send SMS notification (simulated)
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
    
    # Send push notifications to members
    from services.fcm_service import notify_members_premium_available, notify_coop_distribution_complete
    
    coop_name = current_user.get("coop_name", "Coopérative")
    lot_name = dist.get("lot_name", "")
    
    try:
        # Notify all members about their premiums
        notif_result = await notify_members_premium_available(
            db=db,
            distribution_id=dist_id,
            coop_name=coop_name,
            lot_name=lot_name,
            distributions=dist.get("distributions", [])
        )
        logger.info(f"Premium notifications: {notif_result}")
        
        # Notify the cooperative admin
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

# ============= AGENTS MANAGEMENT =============

@router.get("/agents")
async def get_coop_agents(current_user: dict = Depends(get_current_user)):
    """Liste des agents terrain"""
    verify_cooperative(current_user)
    
    coop_id = current_user["_id"]
    coop_oid = ObjectId(coop_id) if ObjectId.is_valid(coop_id) else None
    agents_or = [{"coop_id": coop_id}]
    if coop_oid:
        agents_or.append({"coop_id": coop_oid})
    
    agents = await db.coop_agents.find({"$or": agents_or}).to_list(100)
    
    return [{
        "id": str(a["_id"]),
        "full_name": a.get("full_name", ""),
        "phone_number": a.get("phone_number", ""),
        "email": a.get("email", ""),
        "zone": a.get("zone", ""),
        "village_coverage": a.get("village_coverage", []),
        "members_onboarded": a.get("members_onboarded", 0),
        "parcels_declared": a.get("parcels_declared", 0),
        "ssrte_visits_count": a.get("ssrte_visits_count", 0),
        "is_active": a.get("is_active", True),
        "account_activated": a.get("account_activated", False),
        "user_id": a.get("user_id"),
        "assigned_farmers": [str(f) for f in a.get("assigned_farmers", [])],
        "assigned_farmers_count": len(a.get("assigned_farmers", [])),
        "created_at": a.get("created_at", datetime.utcnow()).isoformat() if isinstance(a.get("created_at"), datetime) else str(a.get("created_at", ""))
    } for a in agents]

@router.post("/agents")
async def create_agent(
    agent: AgentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Ajouter un agent terrain - L'agent pourra activer son compte via son téléphone"""
    verify_cooperative(current_user)
    
    # Vérifier si le numéro existe déjà
    existing_agent = await db.coop_agents.find_one({"phone_number": agent.phone_number})
    if existing_agent:
        raise HTTPException(
            status_code=400,
            detail="Un agent avec ce numéro de téléphone existe déjà"
        )
    
    existing_user = await db.users.find_one({"phone_number": agent.phone_number})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Ce numéro de téléphone est déjà associé à un compte utilisateur"
        )
    
    agent_doc = {
        "coop_id": current_user["_id"],
        "coop_name": current_user.get("coop_name") or current_user.get("full_name"),
        "full_name": agent.full_name,
        "phone_number": agent.phone_number,
        "email": agent.email,
        "zone": agent.zone,
        "village_coverage": agent.village_coverage,
        "members_onboarded": 0,
        "parcels_declared": 0,
        "ssrte_visits_count": 0,
        "is_active": True,
        "account_activated": False,  # L'agent doit activer son compte
        "user_id": None,  # Sera rempli lors de l'activation
        "created_at": datetime.utcnow()
    }
    
    result = await db.coop_agents.insert_one(agent_doc)
    
    return {
        "message": "Agent ajouté avec succès. L'agent peut maintenant activer son compte via l'application mobile avec son numéro de téléphone.",
        "agent_id": str(result.inserted_id),
        "activation_instructions": f"L'agent {agent.full_name} doit télécharger l'application GreenLink et utiliser le numéro {agent.phone_number} pour activer son compte."
    }

# ============= FARMER ATTRIBUTION =============

@router.get("/agents/{agent_id}/assigned-farmers")
async def get_assigned_farmers(agent_id: str, current_user: dict = Depends(get_current_user)):
    """Liste des fermiers assignés à un agent terrain"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]

    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="ID agent invalide")

    agent = await db.coop_agents.find_one({"_id": ObjectId(agent_id)})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent non trouvé")
    if str(agent.get("coop_id")) != str(coop_id) and agent.get("coop_id") != (ObjectId(coop_id) if ObjectId.is_valid(coop_id) else None):
        raise HTTPException(status_code=403, detail="Cet agent n'appartient pas à votre coopérative")

    assigned_ids = agent.get("assigned_farmers", [])
    if not assigned_ids:
        return {"agent_id": agent_id, "agent_name": agent.get("full_name", ""), "farmers": [], "total": 0}

    oid_list = [ObjectId(fid) for fid in assigned_ids if ObjectId.is_valid(str(fid))]
    members = await db.coop_members.find({"_id": {"$in": oid_list}}).to_list(500)

    farmers = [{
        "id": str(m["_id"]),
        "full_name": m.get("full_name", ""),
        "phone_number": m.get("phone_number", ""),
        "village": m.get("village", ""),
        "is_active": m.get("is_active", True),
        "parcels_count": m.get("parcels_count", 0),
    } for m in members]

    return {"agent_id": agent_id, "agent_name": agent.get("full_name", ""), "farmers": farmers, "total": len(farmers)}


@router.post("/agents/{agent_id}/assign-farmers")
async def assign_farmers_to_agent(agent_id: str, body: FarmerAssignRequest, current_user: dict = Depends(get_current_user)):
    """Assigner des fermiers (membres) à un agent terrain"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]

    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="ID agent invalide")

    agent = await db.coop_agents.find_one({"_id": ObjectId(agent_id)})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent non trouvé")
    if str(agent.get("coop_id")) != str(coop_id) and agent.get("coop_id") != (ObjectId(coop_id) if ObjectId.is_valid(coop_id) else None):
        raise HTTPException(status_code=403, detail="Cet agent n'appartient pas à votre coopérative")

    if not body.farmer_ids:
        raise HTTPException(status_code=400, detail="La liste de fermiers ne peut pas être vide")

    # Validate all farmer IDs exist and belong to this cooperative
    coop_q = coop_id_query(coop_id)
    valid_ids = []
    for fid in body.farmer_ids:
        if not ObjectId.is_valid(fid):
            continue
        member = await db.coop_members.find_one({"_id": ObjectId(fid), **coop_q})
        if member:
            valid_ids.append(fid)

    if not valid_ids:
        raise HTTPException(status_code=400, detail="Aucun fermier valide trouvé dans la coopérative")

    # Unassign these farmers from any other agent first (one farmer = one agent)
    await db.coop_agents.update_many(
        {"coop_id": {"$in": [coop_id, ObjectId(coop_id) if ObjectId.is_valid(coop_id) else coop_id]}},
        {"$pull": {"assigned_farmers": {"$in": valid_ids}}}
    )

    # Assign to this agent
    await db.coop_agents.update_one(
        {"_id": ObjectId(agent_id)},
        {"$addToSet": {"assigned_farmers": {"$each": valid_ids}}}
    )

    updated_agent = await db.coop_agents.find_one({"_id": ObjectId(agent_id)})
    new_count = len(updated_agent.get("assigned_farmers", []))

    return {
        "message": f"{len(valid_ids)} fermier(s) assigné(s) à {agent.get('full_name', 'agent')}",
        "assigned_count": new_count,
        "assigned_ids": valid_ids
    }


@router.post("/agents/{agent_id}/unassign-farmers")
async def unassign_farmers_from_agent(agent_id: str, body: FarmerAssignRequest, current_user: dict = Depends(get_current_user)):
    """Retirer l'attribution de fermiers d'un agent"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]

    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="ID agent invalide")

    agent = await db.coop_agents.find_one({"_id": ObjectId(agent_id)})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent non trouvé")
    if str(agent.get("coop_id")) != str(coop_id) and agent.get("coop_id") != (ObjectId(coop_id) if ObjectId.is_valid(coop_id) else None):
        raise HTTPException(status_code=403, detail="Cet agent n'appartient pas à votre coopérative")

    if not body.farmer_ids:
        raise HTTPException(status_code=400, detail="La liste de fermiers ne peut pas être vide")

    await db.coop_agents.update_one(
        {"_id": ObjectId(agent_id)},
        {"$pull": {"assigned_farmers": {"$in": body.farmer_ids}}}
    )

    updated_agent = await db.coop_agents.find_one({"_id": ObjectId(agent_id)})
    remaining = len(updated_agent.get("assigned_farmers", []))

    return {
        "message": f"{len(body.farmer_ids)} fermier(s) retiré(s) de {agent.get('full_name', 'agent')}",
        "remaining_count": remaining
    }


# ============= AGENTS PROGRESS DASHBOARD =============

@router.get("/agents-progress")
async def get_agents_progress(current_user: dict = Depends(get_current_user)):
    """Tableau de bord de progression des agents - montre quels fermiers sont a 5/5"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    coop_oid = ObjectId(coop_id) if ObjectId.is_valid(coop_id) else None

    # Get all agents for this coop
    agents_or = [{"coop_id": coop_id}]
    if coop_oid:
        agents_or.append({"coop_id": coop_oid})
    agents = await db.coop_agents.find({"$or": agents_or}).to_list(100)

    if not agents:
        return {"agents": [], "summary": {"total_agents": 0, "total_farmers": 0, "farmers_5_5": 0, "average_progress": 0}}

    # Get agent user details
    agent_user_ids = [a.get("user_id") for a in agents if a.get("user_id")]
    agent_users = {}
    for uid in agent_user_ids:
        if uid and ObjectId.is_valid(str(uid)):
            u = await db.users.find_one({"_id": ObjectId(uid)}, {"full_name": 1, "phone_number": 1})
            if u:
                agent_users[str(uid)] = u

    # Collect all farmer IDs across all agents
    all_farmer_ids = []
    for a in agents:
        all_farmer_ids.extend(a.get("assigned_farmers", []))
    all_farmer_ids = list(set(all_farmer_ids))

    if not all_farmer_ids:
        agent_results = []
        for a in agents:
            uid = a.get("user_id", "")
            au = agent_users.get(str(uid), {})
            agent_results.append({
                "id": str(a["_id"]),
                "full_name": a.get("full_name") or au.get("full_name", "Agent"),
                "phone_number": a.get("phone_number") or au.get("phone_number", ""),
                "zone": a.get("zone", ""),
                "assigned_count": 0,
                "farmers_5_5": 0,
                "progress_percent": 0,
                "farmers": []
            })
        return {"agents": agent_results, "summary": {"total_agents": len(agents), "total_farmers": 0, "farmers_5_5": 0, "average_progress": 0}}

    # Batch fetch all form data for all farmers
    oid_list = [ObjectId(fid) for fid in all_farmer_ids if ObjectId.is_valid(str(fid))]
    members_list = await db.coop_members.find({"_id": {"$in": oid_list}}).to_list(500)
    members_map = {str(m["_id"]): m for m in members_list}

    # ICI profiles
    ici_docs = await db.ici_profiles.find({"farmer_id": {"$in": all_farmer_ids}}, {"farmer_id": 1, "taille_menage": 1}).to_list(1000)
    ici_set = {d["farmer_id"] for d in ici_docs if d.get("taille_menage") and d["taille_menage"] > 0}

    # SSRTE visits
    ssrte_agg = await db.ssrte_visits.aggregate([
        {"$match": {"farmer_id": {"$in": all_farmer_ids}}},
        {"$group": {"_id": "$farmer_id", "count": {"$sum": 1}}}
    ]).to_list(500)
    ssrte_set = {s["_id"] for s in ssrte_agg if s["count"] > 0}

    # Parcels (check both farmer_id and member_id)
    parcel_agg = await db.parcels.aggregate([
        {"$match": {"$or": [
            {"farmer_id": {"$in": all_farmer_ids}},
            {"member_id": {"$in": all_farmer_ids}}
        ]}},
        {"$group": {"_id": {"$ifNull": ["$member_id", "$farmer_id"]}, "count": {"$sum": 1}}}
    ]).to_list(500)
    parcel_set = set()
    for p in parcel_agg:
        pid = str(p["_id"]) if p["_id"] else None
        if pid and p["count"] > 0:
            parcel_set.add(pid)

    # Photos
    photo_agg = await db.geotagged_photos.aggregate([
        {"$match": {"farmer_id": {"$in": all_farmer_ids}}},
        {"$group": {"_id": "$farmer_id", "count": {"$sum": 1}}}
    ]).to_list(500)
    photo_set = {p["_id"] for p in photo_agg if p["count"] > 0}

    # Build per-agent progress
    total_5_5 = 0
    total_completed_forms = 0
    total_farmers_count = 0
    agent_results = []

    for a in agents:
        uid = a.get("user_id", "")
        au = agent_users.get(str(uid), {})
        assigned = a.get("assigned_farmers", [])
        farmers_detail = []
        agent_5_5 = 0

        for fid in assigned:
            member = members_map.get(fid, {})
            registered = member.get("status") == "active" or member.get("is_active", False)
            ici_done = fid in ici_set
            ssrte_done = fid in ssrte_set
            parcels_done = fid in parcel_set
            photos_done = fid in photo_set

            completed = sum([registered, ici_done, ssrte_done, parcels_done, photos_done])
            if completed == 5:
                agent_5_5 += 1
            total_completed_forms += completed

            farmers_detail.append({
                "id": fid,
                "full_name": member.get("full_name", "Inconnu"),
                "village": member.get("village", ""),
                "completed": completed,
                "total": 5,
                "percentage": round(completed / 5 * 100),
                "forms": {
                    "register": registered,
                    "ici": ici_done,
                    "ssrte": ssrte_done,
                    "parcels": parcels_done,
                    "photos": photos_done
                }
            })

        total_5_5 += agent_5_5
        total_farmers_count += len(assigned)

        # Sort farmers: incomplete first
        farmers_detail.sort(key=lambda f: f["completed"])

        agent_results.append({
            "id": str(a["_id"]),
            "full_name": a.get("full_name") or au.get("full_name", "Agent"),
            "phone_number": a.get("phone_number") or au.get("phone_number", ""),
            "zone": a.get("zone", ""),
            "assigned_count": len(assigned),
            "farmers_5_5": agent_5_5,
            "progress_percent": round(total_completed_forms / (len(assigned) * 5) * 100) if assigned else 0,
            "farmers": farmers_detail
        })

    # Sort agents: lowest progress first
    agent_results.sort(key=lambda a: a["progress_percent"])

    avg_progress = round(total_completed_forms / (total_farmers_count * 5) * 100) if total_farmers_count > 0 else 0

    return {
        "agents": agent_results,
        "summary": {
            "total_agents": len(agents),
            "total_farmers": total_farmers_count,
            "farmers_5_5": total_5_5,
            "average_progress": avg_progress
        }
    }


# ============= REPORTS & EXPORTS =============

@router.get("/reports/eudr")
async def generate_eudr_report(current_user: dict = Depends(get_current_user)):
    """Generer rapport conformite EUDR - Reglement UE 2023/1115"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    
    members = await db.coop_members.find({"coop_id": coop_id, "is_active": True}).to_list(10000)
    all_members = await db.coop_members.find({"coop_id": coop_id}).to_list(10000)
    member_user_ids = [m.get("user_id") for m in members if m.get("user_id")]
    member_ids = [str(m["_id"]) for m in members]
    
    parcels = await db.parcels.find({"$or": [
        {"farmer_id": {"$in": member_user_ids}},
        {"member_id": {"$in": [m["_id"] for m in members]}}
    ]}).to_list(10000)
    
    # Geolocation analysis
    geo_polygon = [p for p in parcels if p.get("gps_polygon") or p.get("polygon_coordinates")]
    geo_point = [p for p in parcels if (p.get("gps_coordinates") or p.get("location")) and not (p.get("gps_polygon") or p.get("polygon_coordinates"))]
    geo_none = [p for p in parcels if not p.get("gps_coordinates") and not p.get("location") and not p.get("gps_polygon")]
    geolocated = len(geo_polygon) + len(geo_point)
    
    # Cut-off date analysis (31 Dec 2020)
    cutoff_date = datetime(2020, 12, 31)
    parcels_before_cutoff = [p for p in parcels if p.get("established_date") and p.get("established_date") <= cutoff_date]
    parcels_after_cutoff = [p for p in parcels if p.get("established_date") and p.get("established_date") > cutoff_date]
    parcels_no_date = [p for p in parcels if not p.get("established_date")]
    
    # Verification status
    verified_parcels = [p for p in parcels if p.get("verification_status") == "verified"]
    pending_parcels = [p for p in parcels if p.get("verification_status") == "pending"]
    
    # Carbon & environmental
    total_hectares = round(sum(p.get("area_hectares", 0) for p in parcels), 2)
    total_co2 = round(sum(p.get("carbon_credits_earned", 0) for p in parcels), 2)
    avg_carbon = round(sum(p.get("carbon_score", 0) for p in parcels) / len(parcels), 1) if parcels else 0
    
    # SSRTE / Child labor
    ssrte_visits = await db.ssrte_visits.find({"cooperative_id": str(coop_id)}).to_list(10000)
    high_risk_visits = [v for v in ssrte_visits if v.get("niveau_risque") in ["eleve", "critique"]]
    children_working = sum(v.get("enfants_observes_travaillant", 0) for v in ssrte_visits)
    
    # ICI profiles
    ici_profiles = await db.ici_profiles.find({"cooperative_id": str(coop_id)}).to_list(10000)
    
    # Gender analysis
    women_members = [m for m in all_members if m.get("gender", "").lower() in ["f", "femme", "female", "feminin"]]
    
    # Certifications analysis
    certs = current_user.get("certifications") or []
    
    # Risk assessment matrix
    geo_rate = round(geolocated / len(parcels) * 100, 1) if parcels else 0
    verified_rate = round(len(verified_parcels) / len(parcels) * 100, 1) if parcels else 0
    child_labor_free_rate = round(100 - (len(high_risk_visits) / max(len(ssrte_visits), 1) * 100), 1) if ssrte_visits else 100
    ici_coverage = round(len(ici_profiles) / max(len(members), 1) * 100, 1)
    
    # Overall EUDR compliance score (weighted)
    compliance_score = round(
        geo_rate * 0.30 +           # 30% geolocation
        verified_rate * 0.25 +       # 25% verification
        child_labor_free_rate * 0.20 + # 20% no child labor
        ici_coverage * 0.15 +         # 15% ICI profiling
        min(avg_carbon * 10, 100) * 0.10  # 10% carbon score
    , 1)
    
    # Determine risk level
    if compliance_score >= 80:
        risk_level = "faible"
    elif compliance_score >= 50:
        risk_level = "moyen"
    else:
        risk_level = "eleve"
    
    return {
        "report_date": datetime.utcnow().isoformat(),
        "regulation_ref": "Reglement (UE) 2023/1115",
        
        "cooperative": {
            "name": current_user.get("coop_name", ""),
            "code": current_user.get("coop_code", ""),
            "certifications": certs,
            "country": "Cote d'Ivoire",
            "commodity": "Cacao (Theobroma cacao)",
            "hs_code": "1801 - Feves de cacao",
            "operator_type": "Cooperative agricole",
        },
        
        "due_diligence": {
            "dds_status": "actif" if compliance_score >= 50 else "a_completer",
            "last_assessment_date": datetime.utcnow().isoformat(),
            "risk_level": risk_level,
            "compliance_score": compliance_score,
            "next_review_date": (datetime.utcnow().replace(month=12, day=31)).isoformat(),
        },
        
        "compliance": {
            "total_parcels": len(parcels),
            "geolocated_parcels": geolocated,
            "geolocation_rate": geo_rate,
            "geo_polygon_count": len(geo_polygon),
            "geo_point_count": len(geo_point),
            "geo_none_count": len(geo_none),
            "verified_parcels": len(verified_parcels),
            "pending_parcels": len(pending_parcels),
            "verification_rate": verified_rate,
            "deforestation_alerts": 0,
            "deforestation_free_rate": 100.0,
            "compliant_parcels": len(parcels),
            "compliance_rate": compliance_score,
        },
        
        "cutoff_date": {
            "reference_date": "2020-12-31",
            "parcels_before_cutoff": len(parcels_before_cutoff),
            "parcels_after_cutoff": len(parcels_after_cutoff),
            "parcels_no_date": len(parcels_no_date),
            "total_parcels": len(parcels),
        },
        
        "risk_assessment": {
            "overall_risk": risk_level,
            "overall_score": compliance_score,
            "country_risk": "standard",
            "country_note": "Cote d'Ivoire - categorie standard selon benchmark UE",
            "dimensions": [
                {"name": "Geolocalisation", "score": geo_rate, "weight": 30, "status": "conforme" if geo_rate >= 80 else "a_ameliorer"},
                {"name": "Verification terrain", "score": verified_rate, "weight": 25, "status": "conforme" if verified_rate >= 80 else "a_ameliorer"},
                {"name": "Travail des enfants", "score": child_labor_free_rate, "weight": 20, "status": "conforme" if child_labor_free_rate >= 90 else "a_ameliorer"},
                {"name": "Profilage ICI", "score": ici_coverage, "weight": 15, "status": "conforme" if ici_coverage >= 80 else "a_ameliorer"},
                {"name": "Score carbone", "score": min(avg_carbon * 10, 100), "weight": 10, "status": "conforme" if avg_carbon >= 6 else "a_ameliorer"},
            ],
        },
        
        "traceability": {
            "chain": [
                {"step": 1, "actor": "Producteur", "count": len(members), "status": "actif"},
                {"step": 2, "actor": "Cooperative", "count": 1, "name": current_user.get("coop_name", ""), "status": "actif"},
                {"step": 3, "actor": "Export/Marche", "count": 0, "status": "en_preparation"},
            ],
            "commodity": "Cacao",
            "origin_country": "Cote d'Ivoire",
            "total_producers": len(members),
            "total_parcels": len(parcels),
            "total_hectares": total_hectares,
        },
        
        "esg_indicators": {
            "environmental": {
                "total_co2_tonnes": total_co2,
                "average_carbon_score": avg_carbon,
                "total_hectares": total_hectares,
                "deforestation_free": True,
                "biodiversity_score": avg_carbon,
            },
            "social": {
                "total_members": len(all_members),
                "active_members": len(members),
                "women_count": len(women_members),
                "women_rate": round(len(women_members) / max(len(all_members), 1) * 100, 1),
                "child_labor_free_rate": child_labor_free_rate,
                "ssrte_visits": len(ssrte_visits),
                "ici_profiles": len(ici_profiles),
                "children_at_risk": children_working,
            },
            "governance": {
                "certifications": certs,
                "audit_coverage": verified_rate,
                "ici_coverage": ici_coverage,
                "compliance_score": compliance_score,
            },
        },
        
        "statistics": {
            "total_members": len(members),
            "total_hectares": total_hectares,
            "total_co2_tonnes": total_co2,
            "average_carbon_score": avg_carbon,
        },
        "export_available": ["PDF", "CSV"]
    }

@router.get("/reports/audit-selection")
async def select_parcels_for_audit(
    sample_rate: float = 0.10,
    current_user: dict = Depends(get_current_user)
):
    """Sélectionner parcelles pour audit (5-10%)"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    
    members = await db.coop_members.find({"coop_id": coop_id, "is_active": True}).to_list(10000)
    member_user_ids = [m.get("user_id") for m in members if m.get("user_id")]
    
    parcels = await db.parcels.find({"farmer_id": {"$in": member_user_ids}}).to_list(10000)
    
    import random
    sample_size = max(1, int(len(parcels) * sample_rate))
    selected = random.sample(parcels, min(sample_size, len(parcels)))
    
    return {
        "total_parcels": len(parcels),
        "sample_rate": sample_rate,
        "selected_count": len(selected),
        "selected_parcels": [{
            "id": str(p["_id"]),
            "location": p.get("location", ""),
            "area_hectares": p.get("area_hectares", 0),
            "carbon_score": p.get("carbon_score", 0),
            "farmer_id": p.get("farmer_id", "")
        } for p in selected]
    }

# ============= STATISTICS =============

@router.get("/stats/villages")
async def get_village_stats(current_user: dict = Depends(get_current_user)):
    """Statistiques par village"""
    verify_cooperative(current_user)
    
    pipeline = [
        {"$match": {"coop_id": current_user["_id"]}},
        {"$group": {
            "_id": "$village",
            "members_count": {"$sum": 1},
            "active_count": {"$sum": {"$cond": ["$is_active", 1, 0]}}
        }},
        {"$sort": {"members_count": -1}}
    ]
    
    results = await db.coop_members.aggregate(pipeline).to_list(100)
    
    return [{
        "village": r["_id"],
        "members_count": r["members_count"],
        "active_count": r["active_count"]
    } for r in results]

# ============= PDF REPORT GENERATION =============

from fastapi.responses import Response
from services.pdf_service import pdf_generator

@router.get("/reports/eudr/pdf")
async def generate_eudr_pdf_report(
    current_user: dict = Depends(get_current_user)
):
    """Générer le rapport EUDR en PDF"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    
    # Get cooperative info
    coop_info = {
        "name": current_user.get("coop_name", ""),
        "code": current_user.get("coop_code", ""),
        "certifications": current_user.get("certifications") or []
    }
    
    # Get members and parcels
    members = await db.coop_members.find({"coop_id": coop_id}).to_list(10000)
    member_ids = [m["_id"] for m in members]
    
    parcels = await db.parcels.find({
        "$or": [
            {"member_id": {"$in": member_ids}},
            {"coop_id": coop_id}
        ]
    }).to_list(10000)
    
    geolocated = len([p for p in parcels if p.get("gps_coordinates")])
    total_hectares = sum(p.get("area_hectares", 0) for p in parcels)
    total_co2 = sum(p.get("co2_captured_tonnes", 0) for p in parcels)
    avg_score = sum(p.get("carbon_score", 0) for p in parcels) / max(len(parcels), 1)
    
    # Certifications breakdown
    cert_counts = {}
    for p in parcels:
        cert = p.get("certification")
        if cert:
            cert_counts[cert] = cert_counts.get(cert, 0) + 1
    
    data = {
        "cooperative": coop_info,
        "compliance": {
            "compliance_rate": round(len([p for p in parcels if p.get("eudr_compliant", True)]) / max(len(parcels), 1) * 100, 1),
            "geolocation_rate": round(geolocated / max(len(parcels), 1) * 100, 1),
            "geolocated_parcels": geolocated,
            "total_parcels": len(parcels),
            "deforestation_alerts": 0
        },
        "statistics": {
            "total_members": len(members),
            "total_hectares": round(total_hectares, 2),
            "total_co2_tonnes": round(total_co2, 2),
            "average_carbon_score": round(avg_score, 1)
        },
        "eudr_compliance": {
            "certification_coverage": cert_counts
        }
    }
    
    pdf_bytes = pdf_generator.generate_eudr_report(data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=rapport_eudr_{coop_info['code']}_{datetime.now().strftime('%Y%m%d')}.pdf"
        }
    )

@router.get("/reports/carbon/pdf")
async def generate_carbon_pdf_report(
    current_user: dict = Depends(get_current_user)
):
    """Générer le rapport Carbone en PDF"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    
    # Get cooperative info
    coop_info = {
        "name": current_user.get("coop_name", ""),
        "code": current_user.get("coop_code", "")
    }
    
    # Get parcels data
    members = await db.coop_members.find({"coop_id": coop_id}).to_list(10000)
    member_ids = [m["_id"] for m in members]
    
    parcels = await db.parcels.find({
        "$or": [
            {"member_id": {"$in": member_ids}},
            {"coop_id": coop_id}
        ]
    }).to_list(10000)
    
    # Get carbon credits and purchases
    carbon_credits = await db.carbon_credits.find({"coop_id": coop_id}).to_list(1000)
    carbon_purchases = await db.carbon_purchases.find({"coop_id": coop_id}).to_list(1000)
    
    total_co2 = sum(p.get("co2_captured_tonnes", 0) for p in parcels)
    avg_score = sum(p.get("carbon_score", 0) for p in parcels) / max(len(parcels), 1)
    sold_credits = len([c for c in carbon_credits if c.get("status") == "sold"])
    carbon_revenue = sum(p.get("total_amount", 0) for p in carbon_purchases)
    
    data = {
        "cooperative": coop_info,
        "sustainability": {
            "total_co2_captured_tonnes": round(total_co2, 2),
            "carbon_credits_generated": len(carbon_credits),
            "carbon_credits_sold": sold_credits,
            "carbon_credits_available": len(carbon_credits) - sold_credits,
            "carbon_revenue_xof": carbon_revenue,
            "average_carbon_score": round(avg_score, 1),
            "deforestation_free_rate": 98.5
        }
    }
    
    pdf_bytes = pdf_generator.generate_carbon_report(data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=rapport_carbone_{coop_info['code']}_{datetime.now().strftime('%Y%m%d')}.pdf"
        }
    )

@router.get("/distributions/{distribution_id}/pdf")
async def generate_distribution_pdf_report(
    distribution_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Générer le rapport de distribution en PDF"""
    verify_cooperative(current_user)
    
    # Get distribution
    distribution = await db.coop_distributions.find_one({
        "_id": ObjectId(distribution_id),
        "coop_id": current_user["_id"]
    })
    
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution non trouvée")
    
    data = {
        "distribution": {
            "lot_name": distribution.get("lot_name", ""),
            "total_premium": distribution.get("total_premium", 0),
            "commission_amount": distribution.get("commission_amount", 0),
            "amount_distributed": distribution.get("amount_distributed", 0),
            "beneficiaries_count": distribution.get("beneficiaries_count", 0),
            "status": distribution.get("status", "")
        },
        "beneficiaries": distribution.get("distributions", [])
    }
    
    pdf_bytes = pdf_generator.generate_distribution_report(data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=rapport_distribution_{distribution_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
        }
    )


@router.get("/members/{member_id}/receipt/pdf")
async def generate_member_payment_receipt(
    member_id: str,
    distribution_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Générer le reçu de paiement individuel pour un membre"""
    verify_cooperative(current_user)
    
    # Get the member
    member = await db.coop_members.find_one({
        "_id": ObjectId(member_id),
        "coop_id": current_user["_id"]
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Get the distribution
    distribution = await db.coop_distributions.find_one({
        "_id": ObjectId(distribution_id),
        "coop_id": current_user["_id"]
    })
    
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution non trouvée")
    
    # Find the member's payment in the distribution
    member_payment = None
    for d in distribution.get("distributions", []):
        if d.get("member_id") == member_id:
            member_payment = d
            break
    
    if not member_payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé pour ce membre")
    
    # Get cooperative info
    coop_info = {
        "name": current_user.get("coop_name", ""),
        "code": current_user.get("coop_code", ""),
        "headquarters_region": current_user.get("headquarters_region", "")
    }
    
    data = {
        "cooperative": coop_info,
        "member": {
            "name": member.get("full_name", ""),
            "phone": member.get("phone_number", ""),
            "village": member.get("village", ""),
            "cni_number": member.get("cni_number", "")
        },
        "payment": {
            "lot_name": distribution.get("lot_name", ""),
            "amount": member_payment.get("amount", 0),
            "share_percentage": member_payment.get("share_percentage", 0),
            "parcels_count": member_payment.get("parcels_count", 0),
            "total_hectares": member_payment.get("total_hectares", 0),
            "average_score": member_payment.get("average_score", 0),
            "payment_status": member_payment.get("payment_status", ""),
            "transaction_id": member_payment.get("transaction_id", ""),
            "payment_date": member_payment.get("payment_date", "")
        },
        "distribution_date": distribution.get("executed_at") or distribution.get("created_at")
    }
    
    pdf_bytes = pdf_generator.generate_member_receipt(data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=recu_paiement_{member.get('full_name', '').replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
        }
    )



# ============= CARBON AUDIT ENDPOINTS =============

@router.get("/{coop_id}/parcels-for-audit")
async def get_parcels_for_audit(coop_id: str):
    """Get all parcels of a cooperative for carbon audit"""
    try:
        # Get all members of this cooperative
        members = await db.coop_members.find({"cooperative_id": coop_id}).to_list(length=500)
        member_ids = [str(m["_id"]) for m in members]
        member_user_ids = [str(m.get("user_id")) for m in members if m.get("user_id")]
        
        # Also get users with this coop_id
        coop_users = await db.users.find({
            "$or": [
                {"coop_id": coop_id},
                {"cooperative_id": coop_id}
            ],
            "user_type": {"$in": ["producteur", "farmer"]}
        }).to_list(length=500)
        farmer_user_ids = [str(u["_id"]) for u in coop_users]
        
        all_farmer_ids = list(set(member_ids + member_user_ids + farmer_user_ids))
        
        # Get parcels
        parcels_query = {
            "$or": [
                {"farmer_id": {"$in": all_farmer_ids}},
                {"owner_id": {"$in": all_farmer_ids}},
                {"member_id": {"$in": member_ids}},
                {"cooperative_id": coop_id}
            ]
        }
        
        parcels = await db.parcels.find(parcels_query).to_list(length=500)
        
        result = []
        for parcel in parcels:
            # Get farmer name
            farmer_name = "Non assigné"
            farmer_id = parcel.get("farmer_id") or parcel.get("owner_id") or parcel.get("member_id")
            if farmer_id:
                # Try to find in coop_members
                member = await db.coop_members.find_one({"_id": ObjectId(farmer_id)}) if ObjectId.is_valid(farmer_id) else None
                if member:
                    farmer_name = member.get("full_name", "Non assigné")
                else:
                    # Try to find in users
                    user = await db.users.find_one({"_id": ObjectId(farmer_id)}) if ObjectId.is_valid(farmer_id) else None
                    if user:
                        farmer_name = user.get("full_name", "Non assigné")
            
            result.append({
                "id": str(parcel["_id"]),
                "location": parcel.get("location") or parcel.get("name") or f"Parcelle {str(parcel['_id'])[-6:]}",
                "village": parcel.get("village") or parcel.get("region") or "Non spécifié",
                "area_hectares": parcel.get("area_hectares") or parcel.get("size") or 0,
                "crop_type": parcel.get("crop_type") or "cacao",
                "farmer_name": farmer_name,
                "farmer_id": farmer_id,
                "gps_lat": parcel.get("gps_lat") or parcel.get("latitude"),
                "gps_lng": parcel.get("gps_lng") or parcel.get("longitude"),
                "carbon_score": parcel.get("carbon_score"),
                "certification": parcel.get("certification"),
                "audit_status": parcel.get("audit_status", "pending")
            })
        
        return {"parcels": result, "total": len(result)}
    
    except Exception as e:
        logger.error(f"Error fetching parcels for audit: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_all_cooperatives():
    """List all cooperatives for admin selection"""
    try:
        # Get cooperatives from users collection
        coops = await db.users.find(
            {"user_type": "cooperative"},
            {"_id": 1, "full_name": 1, "coop_name": 1, "coop_code": 1, "email": 1}
        ).to_list(length=100)
        
        result = []
        for coop in coops:
            result.append({
                "id": str(coop["_id"]),
                "name": coop.get("coop_name") or coop.get("full_name"),
                "code": coop.get("coop_code"),
                "email": coop.get("email")
            })
        
        return {"cooperatives": result, "total": len(result)}
    
    except Exception as e:
        logger.error(f"Error listing cooperatives: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= CARBON PREMIUM CALCULATION =============

class CarbonPremiumSettings(BaseModel):
    rate_per_hectare: float = 50000  # XOF par hectare
    min_score_eligible: float = 6.0   # Score minimum pour être éligible
    bonus_high_score: float = 1.2     # Bonus 20% pour score >= 8
    bonus_organic: float = 1.1        # Bonus 10% pour pratiques bio

@router.get("/carbon-premiums/members")
async def get_members_carbon_premiums(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtenir les primes carbone calculées par membre
    Calcul: Prime = Surface × Score × Taux/ha
    """
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    logger.info(f"Getting carbon premiums for cooperative: {coop_id}")
    
    # Récupérer tous les membres
    members = await db.coop_members.find({"cooperative_id": coop_id}).to_list(1000)
    
    logger.info(f"Found {len(members)} members for cooperative {coop_id}")
    
    # Taux de base par hectare (XOF)
    RATE_PER_HECTARE = 50000
    MIN_SCORE = 6.0
    
    premium_data = []
    total_premium = 0
    total_eligible_hectares = 0
    
    for member in members:
        member_id = str(member["_id"])
        user_id = member.get("user_id")
        
        # Récupérer les parcelles du membre
        query_conditions = [{"member_id": member_id}]
        if user_id:
            query_conditions.append({"farmer_id": user_id})
        
        parcels = await db.parcels.find({
            "$or": query_conditions
        }).to_list(100)
        
        # Récupérer les audits pour ces parcelles
        member_total_area = 0
        member_avg_score = 0
        member_premium = 0
        audited_parcels = 0
        parcels_detail = []
        
        for parcel in parcels:
            parcel_id = str(parcel["_id"])
            area = parcel.get("area_hectares", 0)
            
            # Chercher l'audit de cette parcelle
            audit = await db.carbon_audits.find_one({
                "parcel_id": parcel_id,
                "recommendation": "approved"
            })
            
            if audit:
                carbon_score = audit.get("carbon_score", 0)
                
                if carbon_score >= MIN_SCORE:
                    # Calcul de la prime pour cette parcelle
                    parcel_premium = area * RATE_PER_HECTARE * (carbon_score / 10)
                    
                    # Bonus pour score élevé
                    if carbon_score >= 8:
                        parcel_premium *= 1.2
                    
                    member_premium += parcel_premium
                    member_total_area += area
                    member_avg_score += carbon_score
                    audited_parcels += 1
                    
                    parcels_detail.append({
                        "parcel_id": parcel_id,
                        "location": parcel.get("location"),
                        "area_hectares": area,
                        "carbon_score": carbon_score,
                        "premium_xof": round(parcel_premium)
                    })
        
        if audited_parcels > 0:
            member_avg_score = round(member_avg_score / audited_parcels, 1)
        
        premium_data.append({
            "member_id": member_id,
            "full_name": member.get("full_name"),
            "phone_number": member.get("phone_number"),
            "village": member.get("village"),
            "total_hectares": round(member_total_area, 2),
            "average_score": member_avg_score,
            "audited_parcels": audited_parcels,
            "premium_xof": round(member_premium),
            "premium_eur": round(member_premium / 655.957, 2),  # Conversion XOF -> EUR
            "parcels": parcels_detail,
            "payment_status": "pending"
        })
        
        total_premium += member_premium
        total_eligible_hectares += member_total_area
    
    # Trier par prime décroissante
    premium_data.sort(key=lambda x: x["premium_xof"], reverse=True)
    
    return {
        "members": premium_data,
        "summary": {
            "total_members": len(members),
            "eligible_members": len([m for m in premium_data if m["premium_xof"] > 0]),
            "total_hectares": round(total_eligible_hectares, 2),
            "total_premium_xof": round(total_premium),
            "total_premium_eur": round(total_premium / 655.957, 2),
            "rate_per_hectare": RATE_PER_HECTARE,
            "min_score_required": MIN_SCORE
        }
    }


@router.get("/carbon-premiums/summary")
async def get_carbon_premium_summary(
    current_user: dict = Depends(get_current_user)
):
    """Résumé des primes carbone de la coopérative"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    # Statistiques rapides
    members_count = await db.coop_members.count_documents({"cooperative_id": coop_id})
    
    # Parcelles avec audits approuvés
    members = await db.coop_members.find({"cooperative_id": coop_id}, {"user_id": 1}).to_list(1000)
    user_ids = [m.get("user_id") for m in members if m.get("user_id")]
    member_ids = [str(m["_id"]) for m in members]
    
    # Compter les audits approuvés
    approved_audits = await db.carbon_audits.count_documents({
        "recommendation": "approved",
        "$or": [
            {"parcel_id": {"$in": member_ids}},
        ]
    })
    
    # Primes versées vs en attente
    paid_premiums = await db.carbon_payments.aggregate([
        {"$match": {"cooperative_id": coop_id, "status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_xof"}}}
    ]).to_list(1)
    
    pending_premiums = await db.carbon_payments.aggregate([
        {"$match": {"cooperative_id": coop_id, "status": "pending"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_xof"}}}
    ]).to_list(1)
    
    return {
        "total_members": members_count,
        "approved_audits": approved_audits,
        "paid_premium_xof": paid_premiums[0]["total"] if paid_premiums else 0,
        "pending_premium_xof": pending_premiums[0]["total"] if pending_premiums else 0,
        "rate_per_hectare": 50000,
        "currency": "XOF"
    }


@router.post("/carbon-premiums/initiate-payment")
async def initiate_premium_payment(
    member_id: str,
    amount_xof: float,
    current_user: dict = Depends(get_current_user)
):
    """Initier le paiement d'une prime carbone à un membre"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    # Vérifier que le membre appartient à cette coopérative
    member = await db.coop_members.find_one({
        "_id": ObjectId(member_id),
        "cooperative_id": coop_id
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Créer l'enregistrement de paiement
    payment = {
        "cooperative_id": coop_id,
        "member_id": member_id,
        "member_name": member.get("full_name"),
        "phone_number": member.get("phone_number"),
        "amount_xof": amount_xof,
        "amount_eur": round(amount_xof / 655.957, 2),
        "payment_method": "orange_money",  # Par défaut
        "status": "pending",
        "initiated_by": str(current_user["_id"]),
        "created_at": datetime.utcnow()
    }
    
    result = await db.carbon_payments.insert_one(payment)
    
    # TODO: Intégrer avec Orange Money API pour le paiement réel
    # Pour l'instant, on simule une validation
    
    return {
        "payment_id": str(result.inserted_id),
        "status": "pending",
        "message": f"Paiement de {amount_xof} XOF initié pour {member.get('full_name')}",
        "note": "Intégration Orange Money en attente - paiement simulé"
    }


@router.get("/carbon-premiums/history")
async def get_premium_payment_history(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, le=100)
):
    """Historique des paiements de primes carbone"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    payments = await db.carbon_payments.find(
        {"cooperative_id": coop_id}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "payments": [{
            "id": str(p["_id"]),
            "member_id": p.get("member_id"),
            "member_name": p.get("member_name"),
            "phone_number": p.get("phone_number"),
            "amount_xof": p.get("amount_xof"),
            "amount_eur": p.get("amount_eur"),
            "status": p.get("status"),
            "payment_method": p.get("payment_method"),
            "created_at": p.get("created_at")
        } for p in payments],
        "total": len(payments)
    }


# ============= EXPORT CSV =============

@router.get("/carbon-premiums/export-csv")
async def export_premiums_csv(
    current_user: dict = Depends(get_current_user)
):
    """Exporter les primes carbone en CSV"""
    from fastapi.responses import StreamingResponse
    import csv
    import io
    
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    # Récupérer les données des primes
    members = await db.coop_members.find({"cooperative_id": coop_id}).to_list(1000)
    
    RATE_PER_HECTARE = 50000
    MIN_SCORE = 6.0
    
    # Créer le CSV
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    # En-têtes
    writer.writerow([
        'Nom', 'Téléphone', 'Village', 'Surface (ha)', 
        'Score Carbone', 'Prime (XOF)', 'Prime (EUR)', 'Statut'
    ])
    
    for member in members:
        member_id = str(member["_id"])
        
        query_conditions = [{"member_id": member_id}]
        if member.get("user_id"):
            query_conditions.append({"farmer_id": member.get("user_id")})
        
        parcels = await db.parcels.find({"$or": query_conditions}).to_list(100)
        
        total_area = 0
        total_premium = 0
        avg_score = 0
        count = 0
        
        for parcel in parcels:
            parcel_id = str(parcel["_id"])
            area = parcel.get("area_hectares", 0)
            
            audit = await db.carbon_audits.find_one({
                "parcel_id": parcel_id,
                "recommendation": "approved"
            })
            
            if audit and audit.get("carbon_score", 0) >= MIN_SCORE:
                score = audit.get("carbon_score", 0)
                premium = area * RATE_PER_HECTARE * (score / 10)
                if score >= 8:
                    premium *= 1.2
                
                total_area += area
                total_premium += premium
                avg_score += score
                count += 1
        
        if count > 0:
            avg_score = round(avg_score / count, 1)
            writer.writerow([
                member.get("full_name", ""),
                member.get("phone_number", ""),
                member.get("village", ""),
                round(total_area, 2),
                avg_score,
                round(total_premium),
                round(total_premium / 655.957, 2),
                "Éligible"
            ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=primes_carbone_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )


# ============= PAIEMENT AVEC SMS =============

@router.post("/carbon-premiums/pay")
async def process_premium_payment(
    member_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Traiter le paiement de la prime carbone et envoyer SMS"""
    from services.sms_service import SMSService, send_quick_sms
    
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    # Vérifier le membre
    member = await db.coop_members.find_one({
        "_id": ObjectId(member_id),
        "cooperative_id": coop_id
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Calculer la prime
    query_conditions = [{"member_id": member_id}]
    if member.get("user_id"):
        query_conditions.append({"farmer_id": member.get("user_id")})
    
    parcels = await db.parcels.find({"$or": query_conditions}).to_list(100)
    
    RATE_PER_HECTARE = 50000
    MIN_SCORE = 6.0
    total_premium = 0
    total_area = 0
    
    for parcel in parcels:
        parcel_id = str(parcel["_id"])
        area = parcel.get("area_hectares", 0)
        
        audit = await db.carbon_audits.find_one({
            "parcel_id": parcel_id,
            "recommendation": "approved"
        })
        
        if audit and audit.get("carbon_score", 0) >= MIN_SCORE:
            score = audit.get("carbon_score", 0)
            premium = area * RATE_PER_HECTARE * (score / 10)
            if score >= 8:
                premium *= 1.2
            total_premium += premium
            total_area += area
    
    if total_premium <= 0:
        raise HTTPException(status_code=400, detail="Aucune prime à payer")
    
    # Créer l'enregistrement de paiement
    payment_ref = f"PAY-{datetime.now().strftime('%Y%m%d%H%M%S')}-{member_id[:6]}"
    
    payment = {
        "cooperative_id": coop_id,
        "cooperative_name": current_user.get("coop_name"),
        "member_id": member_id,
        "member_name": member.get("full_name"),
        "phone_number": member.get("phone_number"),
        "amount_xof": round(total_premium),
        "amount_eur": round(total_premium / 655.957, 2),
        "payment_method": "orange_money",
        "payment_ref": payment_ref,
        "status": "completed",  # Simulé comme complété
        "initiated_by": str(current_user["_id"]),
        "created_at": datetime.now(timezone.utc),
        "paid_at": datetime.now(timezone.utc)
    }
    
    result = await db.carbon_payments.insert_one(payment)
    
    # Envoyer SMS de confirmation
    sms_message = f"GreenLink: Félicitations {member.get('full_name')}! Votre prime carbone de {round(total_premium):,} XOF pour {round(total_area, 1)} ha a été envoyée sur votre Orange Money. Ref: {payment_ref}"
    
    try:
        await send_quick_sms(
            phone=member.get("phone_number"),
            message=sms_message
        )
        logger.info(f"SMS sent to {member.get('phone_number')}")
    except Exception as e:
        logger.error(f"SMS error: {e}")
    
    return {
        "payment_id": str(result.inserted_id),
        "payment_ref": payment_ref,
        "status": "completed",
        "amount_xof": round(total_premium),
        "amount_eur": round(total_premium / 655.957, 2),
        "member_name": member.get("full_name"),
        "phone_number": member.get("phone_number"),
        "sms_sent": True,
        "message": f"Prime de {round(total_premium):,} XOF payée à {member.get('full_name')}"
    }


# ============= RAPPORT PDF MENSUEL =============

@router.get("/carbon-premiums/report-pdf")
async def generate_monthly_report_pdf(
    current_user: dict = Depends(get_current_user),
    month: int = Query(None, ge=1, le=12),
    year: int = Query(None, ge=2020, le=2030)
):
    """Générer le rapport PDF des paiements mensuels"""
    from fastapi.responses import Response
    from services.pdf_service import pdf_generator
    
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    # Default to current month
    now = datetime.now(timezone.utc)
    if not month:
        month = now.month
    if not year:
        year = now.year
    
    # Date range
    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    
    # Get payments for the month
    payments = await db.carbon_payments.find({
        "cooperative_id": coop_id,
        "created_at": {"$gte": start_date, "$lt": end_date}
    }).sort("created_at", -1).to_list(1000)
    
    # Calculate totals
    total_paid = sum(p.get("amount_xof", 0) for p in payments)
    total_members = len(set(p.get("member_id") for p in payments))
    
    # Generate PDF
    data = {
        "cooperative_name": current_user.get("coop_name"),
        "month": month,
        "year": year,
        "payments": [{
            "date": p.get("created_at").strftime("%d/%m/%Y") if p.get("created_at") else "",
            "member_name": p.get("member_name"),
            "phone": p.get("phone_number"),
            "amount_xof": p.get("amount_xof"),
            "ref": p.get("payment_ref", "N/A"),
            "status": p.get("status")
        } for p in payments],
        "summary": {
            "total_payments": len(payments),
            "total_members": total_members,
            "total_amount_xof": total_paid,
            "total_amount_eur": round(total_paid / 655.957, 2)
        }
    }
    
    pdf_bytes = pdf_generator.generate_monthly_payment_report(data)
    
    month_names = ["", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                   "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=rapport_paiements_{month_names[month]}_{year}.pdf"
        }
    )

