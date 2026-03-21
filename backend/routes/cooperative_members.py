"""
Cooperative Members Management Routes
GreenLink Agritech - Côte d'Ivoire
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user
from routes.cooperative import verify_cooperative, coop_id_query, CoopMemberCreate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cooperative", tags=["Cooperative Members"])


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
        
        # Get member's parcels by member_id AND user_id
        member_id_str = str(m["_id"])
        parcel_or = [{"member_id": member_id_str}, {"farmer_id": member_id_str}]
        if m.get("user_id"):
            parcel_or.append({"farmer_id": m["user_id"]})
        parcels = await db.parcels.find({"$or": parcel_or}).to_list(100)
        member_data["nombre_parcelles"] = len(parcels)
        member_data["superficie_totale"] = round(sum([p.get("area_hectares", 0) or 0 for p in parcels]), 2)
        member_data["score_carbone_moyen"] = round(
            sum([p.get("carbon_score", 0) or 0 for p in parcels]) / len(parcels), 1
        ) if parcels else 0
        
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
        "coop_id": coop_id,
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
        "user_id": None,
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
        "errors": errors[:10],
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
