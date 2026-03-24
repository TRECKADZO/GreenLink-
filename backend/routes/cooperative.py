"""
Routes pour la gestion des coopératives agricoles - Core
GreenLink Agritech - Côte d'Ivoire

Ce module contient les modèles, helpers, dashboard et endpoints généraux.
Les autres endpoints sont répartis dans:
- cooperative_members.py: Gestion des membres
- cooperative_parcels.py: Gestion des parcelles et vérification
- cooperative_lots.py: Gestion des lots et distribution de primes
- cooperative_agents.py: Gestion des agents terrain et progression
- cooperative_reports.py: Rapports EUDR, statistiques, PDFs
- cooperative_carbon_premiums.py: Calcul et paiement des primes carbone
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
    department: Optional[str] = None
    zone: Optional[str] = None
    cni_number: Optional[str] = None
    consent_given: bool = True
    pin_code: Optional[str] = None  # Code PIN 4 chiffres pour USSD

class CoopMemberUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    village: Optional[str] = None
    department: Optional[str] = None
    zone: Optional[str] = None
    is_active: Optional[bool] = None

class LotContributor(BaseModel):
    farmer_id: str
    farmer_name: str
    tonnage_kg: float

class CoopLotCreate(BaseModel):
    lot_name: str
    target_tonnage: float
    product_type: str = "cacao"
    certification: Optional[str] = None
    min_carbon_score: float = 6.0
    description: Optional[str] = None
    contributors: Optional[List[LotContributor]] = None

class CoopPremiumDistribution(BaseModel):
    lot_id: str
    total_premium: float
    distribution_method: str = "proportional"

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
    """Vérifier que l'utilisateur est une coopérative"""
    if current_user.get("user_type") not in ["cooperative", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux coopératives"
        )

def coop_id_query(coop_id) -> dict:
    """Generate a query that matches both string and ObjectId coop_id"""
    or_conditions = [{"coop_id": coop_id}, {"cooperative_id": coop_id}]
    if ObjectId.is_valid(coop_id):
        or_conditions.extend([{"coop_id": ObjectId(coop_id)}, {"cooperative_id": ObjectId(coop_id)}])
    return {"$or": or_conditions}

# ============= SETTINGS =============

@router.put("/settings/commission-rate")
async def update_commission_rate(
    rate: float,
    current_user: dict = Depends(get_current_user)
):
    """Mettre à jour le taux de commission"""
    verify_cooperative(current_user)
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"commission_rate": round(float(rate), 4)}}
    )
    return {"message": "Taux de commission mis à jour", "rate": rate}

# ============= DASHBOARD ENDPOINTS =============

@router.get("/dashboard")
async def get_coop_dashboard(current_user: dict = Depends(get_current_user)):
    """Vue d'ensemble du tableau de bord coopérative"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    coop_oid = ObjectId(coop_id) if ObjectId.is_valid(coop_id) else None
    
    # Get members with both field name variants and types
    member_or = [{"coop_id": coop_id}, {"cooperative_id": coop_id}]
    if coop_oid:
        member_or.extend([{"coop_id": coop_oid}, {"cooperative_id": coop_oid}])
    members = await db.coop_members.find({"$or": member_or}).to_list(10000)
    
    # Aggregate member IDs
    member_ids = [str(m["_id"]) for m in members]
    member_user_ids = [m.get("user_id") for m in members if m.get("user_id")]
    
    # Get parcels linked to this cooperative's members
    parcels = await db.parcels.find({
        "$or": [
            {"coop_id": coop_id},
            {"farmer_id": {"$in": member_ids + member_user_ids}},
            {"member_id": {"$in": member_ids}}
        ]
    }).to_list(10000)
    
    # Calculate stats
    active_members = [m for m in members if m.get("is_active", True)]
    total_hectares = sum(p.get("area_hectares", 0) or 0 for p in parcels)
    total_trees = sum(p.get("trees_count", 0) or 0 for p in parcels)
    total_co2 = sum(p.get("co2_captured_tonnes", 0) or 0 for p in parcels)
    avg_carbon = sum(p.get("carbon_score", 0) or 0 for p in parcels) / max(len(parcels), 1)
    
    # Get recent members
    recent_members = sorted(members, key=lambda m: m.get("created_at", datetime.min), reverse=True)[:5]
    
    # Get agents
    agents_or = [{"coop_id": coop_id}]
    if coop_oid:
        agents_or.append({"coop_id": coop_oid})
    agents = await db.coop_agents.find({"$or": agents_or}).to_list(100)
    active_agents = [a for a in agents if a.get("is_active", True)]
    activated_agents = [a for a in agents if a.get("account_activated", False)]
    
    return {
        "coop_info": {
            "name": current_user.get("coop_name"),
            "code": current_user.get("coop_code"),
            "certifications": current_user.get("certifications") or [],
            "region": current_user.get("headquarters_region"),
            "commission_rate": current_user.get("commission_rate", 0.10)
        },
        "members": {
            "total": len(members),
            "active": len(active_members),
            "pending_validation": len([m for m in members if m.get("status") == "pending_validation"])
        },
        "parcelles": {
            "total": len(parcels),
            "superficie_totale": round(total_hectares, 2),
            "total_arbres": total_trees,
            "score_carbone_moyen": round(avg_carbon, 1),
            "co2_total": round(total_co2, 2),
            "verifiees": len([p for p in parcels if p.get("verification_status") == "verified"]),
            "en_attente_verification": len([p for p in parcels if p.get("verification_status") in ["pending", None]]),
        },
        "recent_members": [{
            "id": str(m["_id"]),
            "full_name": m.get("full_name", ""),
            "village": m.get("village", ""),
            "created_at": m.get("created_at", "")
        } for m in recent_members],
        "agents": {
            "total": len(agents),
            "active": len(active_agents),
            "activated": len(activated_agents)
        }
    }

# ============= CARBON AUDIT ENDPOINTS =============

@router.get("/{coop_id}/parcels-for-audit")
async def get_parcels_for_audit(coop_id: str):
    """Get all parcels of a cooperative for carbon audit"""
    try:
        members = await db.coop_members.find({"cooperative_id": coop_id}).to_list(length=500)
        member_ids = [str(m["_id"]) for m in members]
        member_user_ids = [str(m.get("user_id")) for m in members if m.get("user_id")]
        
        coop_users = await db.users.find({
            "$or": [
                {"coop_id": coop_id},
                {"cooperative_id": coop_id}
            ],
            "user_type": {"$in": ["producteur", "farmer"]}
        }).to_list(length=500)
        farmer_user_ids = [str(u["_id"]) for u in coop_users]
        
        all_farmer_ids = list(set(member_ids + member_user_ids + farmer_user_ids))
        
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
            farmer_name = "Non assigné"
            farmer_id = parcel.get("farmer_id") or parcel.get("owner_id") or parcel.get("member_id")
            if farmer_id:
                member = await db.coop_members.find_one({"_id": ObjectId(farmer_id)}) if ObjectId.is_valid(farmer_id) else None
                if member:
                    farmer_name = member.get("full_name", "Non assigné")
                else:
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
