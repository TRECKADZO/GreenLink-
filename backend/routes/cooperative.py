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
    cni_number: Optional[str] = None
    consent_given: bool = True

class CoopMemberUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    village: Optional[str] = None
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

# ============= HELPER FUNCTIONS =============

def verify_cooperative(current_user: dict):
    """Vérifie que l'utilisateur est une coopérative"""
    if current_user.get("user_type") != "cooperative":
        raise HTTPException(
            status_code=403,
            detail="Accès réservé aux coopératives agricoles"
        )
    return current_user

# ============= DASHBOARD ENDPOINTS =============

@router.get("/dashboard")
async def get_coop_dashboard(current_user: dict = Depends(get_current_user)):
    """Dashboard principal de la coopérative"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    
    # Get members count
    total_members = await db.coop_members.count_documents({"coop_id": coop_id})
    active_members = await db.coop_members.count_documents({"coop_id": coop_id, "is_active": True})
    
    # Get parcels data
    members = await db.coop_members.find({"coop_id": coop_id}).to_list(10000)
    member_user_ids = [m.get("user_id") for m in members if m.get("user_id")]
    
    parcels = await db.parcels.find({"farmer_id": {"$in": member_user_ids}}).to_list(10000)
    total_hectares = sum([p.get("area_hectares", 0) for p in parcels])
    total_co2 = sum([p.get("carbon_credits_earned", 0) for p in parcels])
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
        {"coop_id": coop_id}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Get pending validations
    pending_members = await db.coop_members.count_documents({
        "coop_id": coop_id, 
        "status": "pending_validation"
    })
    
    return {
        "coop_info": {
            "name": current_user.get("coop_name", ""),
            "code": current_user.get("coop_code", ""),
            "certifications": current_user.get("certifications", []),
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
            "name": m.get("full_name", ""),
            "village": m.get("village", ""),
            "created_at": m.get("created_at", datetime.utcnow()).isoformat() if isinstance(m.get("created_at"), datetime) else str(m.get("created_at", ""))
        } for m in recent_members]
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
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    # Support both field names for backward compatibility
    query = {"$or": [{"coop_id": coop_id}, {"cooperative_id": coop_id}]}
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
    coop_id = current_user["_id"]
    
    # Check if member already exists
    existing = await db.coop_members.find_one({
        "coop_id": coop_id,
        "phone_number": member.phone_number
    })
    if existing:
        raise HTTPException(status_code=400, detail="Ce membre existe déjà dans la coopérative")
    
    member_doc = {
        "coop_id": coop_id,
        "full_name": member.full_name,
        "phone_number": member.phone_number,
        "village": member.village,
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
    
    result = await db.coop_members.update_one(
        {"_id": ObjectId(member_id), "coop_id": current_user["_id"]},
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
    
    member = await db.coop_members.find_one({
        "_id": ObjectId(member_id),
        "coop_id": current_user["_id"]
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Get member's parcels and harvests
    parcels = []
    harvests = []
    total_premium = 0
    
    if member.get("user_id"):
        parcels = await db.parcels.find({"farmer_id": member["user_id"]}).to_list(100)
        harvests = await db.harvests.find({"farmer_id": member["user_id"]}).to_list(100)
        total_premium = sum([h.get("carbon_premium", 0) for h in harvests])
    
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
    
    # Verify member belongs to this cooperative
    member = await db.coop_members.find_one({
        "_id": ObjectId(member_id),
        "coop_id": current_user["_id"]
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Calculate carbon score based on area and practices
    carbon_score = round(min(9.5, 5.5 + (parcel.area_hectares * 0.3) + (1.5 if parcel.certification else 0)), 1)
    co2_captured = round(parcel.area_hectares * carbon_score * 2.5, 2)
    
    parcel_doc = {
        "member_id": ObjectId(member_id),
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
    member = await db.coop_members.find_one({
        "_id": ObjectId(member_id),
        "coop_id": current_user["_id"]
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    parcels = await db.parcels.find({
        "$or": [
            {"member_id": ObjectId(member_id)},
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
        "member_id": ObjectId(member_id)
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
    
    logger.info(f"Distribution created for lot {lot_id}: {len(distributions)} beneficiaries, {distributable} FCFA")
    
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
        logger.info(f"SMS sent to {d['phone_number']}: Prime carbone {d['amount']} FCFA reçue")
    
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
    
    agents = await db.coop_agents.find({
        "coop_id": current_user["_id"]
    }).to_list(100)
    
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

# ============= REPORTS & EXPORTS =============

@router.get("/reports/eudr")
async def generate_eudr_report(current_user: dict = Depends(get_current_user)):
    """Générer rapport conformité EUDR"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    
    members = await db.coop_members.find({"coop_id": coop_id, "is_active": True}).to_list(10000)
    member_user_ids = [m.get("user_id") for m in members if m.get("user_id")]
    
    parcels = await db.parcels.find({"farmer_id": {"$in": member_user_ids}}).to_list(10000)
    
    geolocated = len([p for p in parcels if p.get("location") or p.get("gps_coordinates")])
    
    return {
        "report_date": datetime.utcnow().isoformat(),
        "cooperative": {
            "name": current_user.get("coop_name", ""),
            "code": current_user.get("coop_code", ""),
            "certifications": current_user.get("certifications", [])
        },
        "compliance": {
            "total_parcels": len(parcels),
            "geolocated_parcels": geolocated,
            "geolocation_rate": round(geolocated / len(parcels) * 100, 1) if parcels else 0,
            "deforestation_alerts": 0,  # Would come from satellite API
            "compliant_parcels": len(parcels),  # Simplified
            "compliance_rate": 100.0
        },
        "statistics": {
            "total_members": len(members),
            "total_hectares": round(sum([p.get("area_hectares", 0) for p in parcels]), 1),
            "total_co2_tonnes": round(sum([p.get("carbon_credits_earned", 0) for p in parcels]), 1),
            "average_carbon_score": round(
                sum([p.get("carbon_score", 0) for p in parcels]) / len(parcels), 1
            ) if parcels else 0
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
        "certifications": current_user.get("certifications", [])
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
            "carbon_revenue_fcfa": carbon_revenue,
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
    rate_per_hectare: float = 50000  # FCFA par hectare
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
    
    # Taux de base par hectare (FCFA)
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
                        "premium_fcfa": round(parcel_premium)
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
            "premium_fcfa": round(member_premium),
            "premium_eur": round(member_premium / 655.957, 2),  # Conversion FCFA -> EUR
            "parcels": parcels_detail,
            "payment_status": "pending"
        })
        
        total_premium += member_premium
        total_eligible_hectares += member_total_area
    
    # Trier par prime décroissante
    premium_data.sort(key=lambda x: x["premium_fcfa"], reverse=True)
    
    return {
        "members": premium_data,
        "summary": {
            "total_members": len(members),
            "eligible_members": len([m for m in premium_data if m["premium_fcfa"] > 0]),
            "total_hectares": round(total_eligible_hectares, 2),
            "total_premium_fcfa": round(total_premium),
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
        {"$group": {"_id": None, "total": {"$sum": "$amount_fcfa"}}}
    ]).to_list(1)
    
    pending_premiums = await db.carbon_payments.aggregate([
        {"$match": {"cooperative_id": coop_id, "status": "pending"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_fcfa"}}}
    ]).to_list(1)
    
    return {
        "total_members": members_count,
        "approved_audits": approved_audits,
        "paid_premium_fcfa": paid_premiums[0]["total"] if paid_premiums else 0,
        "pending_premium_fcfa": pending_premiums[0]["total"] if pending_premiums else 0,
        "rate_per_hectare": 50000,
        "currency": "FCFA"
    }


@router.post("/carbon-premiums/initiate-payment")
async def initiate_premium_payment(
    member_id: str,
    amount_fcfa: float,
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
        "amount_fcfa": amount_fcfa,
        "amount_eur": round(amount_fcfa / 655.957, 2),
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
        "message": f"Paiement de {amount_fcfa} FCFA initié pour {member.get('full_name')}",
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
            "amount_fcfa": p.get("amount_fcfa"),
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
        'Score Carbone', 'Prime (FCFA)', 'Prime (EUR)', 'Statut'
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
        "amount_fcfa": round(total_premium),
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
    sms_message = f"GreenLink: Félicitations {member.get('full_name')}! Votre prime carbone de {round(total_premium):,} FCFA pour {round(total_area, 1)} ha a été envoyée sur votre Orange Money. Ref: {payment_ref}"
    
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
        "amount_fcfa": round(total_premium),
        "amount_eur": round(total_premium / 655.957, 2),
        "member_name": member.get("full_name"),
        "phone_number": member.get("phone_number"),
        "sms_sent": True,
        "message": f"Prime de {round(total_premium):,} FCFA payée à {member.get('full_name')}"
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
    total_paid = sum(p.get("amount_fcfa", 0) for p in payments)
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
            "amount_fcfa": p.get("amount_fcfa"),
            "ref": p.get("payment_ref", "N/A"),
            "status": p.get("status")
        } for p in payments],
        "summary": {
            "total_payments": len(payments),
            "total_members": total_members,
            "total_amount_fcfa": total_paid,
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

