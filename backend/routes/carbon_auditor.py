"""
Carbon Auditor Management Routes
Auditeurs Carbone rattachés à GreenLink (gérés par Super Admin)
Migrated to async motor - March 2026
Supporte les agents avec double casquette (SSRTE + Carbon)
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId

router = APIRouter(prefix="/api/carbon-auditor", tags=["Carbon Auditor"])

# Use centralized async database connection
from database import db


# ============== HELPER FUNCTIONS ==============

def has_carbon_auditor_role(user: dict) -> bool:
    """Vérifie si l'utilisateur a le rôle d'auditeur carbone"""
    user_type = user.get('user_type')
    roles = user.get('roles', [])
    
    # L'utilisateur est auditeur carbone si:
    # 1. Son user_type est 'carbon_auditor'
    # 2. Ou il a 'carbon_auditor' dans ses rôles
    return user_type == 'carbon_auditor' or 'carbon_auditor' in roles


async def get_auditor_by_id(auditor_id: str):
    """Récupère un auditeur par ID, supporte les rôles multiples"""
    user = await db.users.find_one({"_id": ObjectId(auditor_id)})
    if user and has_carbon_auditor_role(user):
        return user
    return None


# ============== MODELS ==============

class AuditorCreate(BaseModel):
    full_name: str
    email: str
    phone_number: str
    password: str
    zone_coverage: List[str] = []  # Départements couverts
    certifications: List[str] = []  # Ex: Verra VCS, Gold Standard
    is_dual_role: bool = False  # Si True, l'agent aura aussi le rôle SSRTE
    cooperative_id: Optional[str] = None  # Pour les agents double casquette

class AuditorUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    zone_coverage: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    is_active: Optional[bool] = None
    roles: Optional[List[str]] = None  # Pour ajouter/retirer des rôles

class AuditMissionCreate(BaseModel):
    auditor_id: str
    cooperative_id: str
    parcel_ids: List[str]
    deadline: Optional[str] = None
    notes: Optional[str] = None

class AuditSubmission(BaseModel):
    parcel_id: str
    actual_area_hectares: float
    shade_trees_count: int
    shade_trees_density: str  # low, medium, high
    organic_practices: bool
    soil_cover: bool
    composting: bool
    erosion_control: bool
    crop_health: str  # excellent, good, average, poor
    photos: List[str] = []  # URLs des photos
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    observations: Optional[str] = None
    recommendation: str  # approved, rejected, needs_review
    rejection_reason: Optional[str] = None

# ============== ADMIN ROUTES (Gestion Auditeurs) ==============

@router.post("/admin/auditors/create")
async def create_auditor(auditor: AuditorCreate):
    """Créer un nouvel auditeur carbone (Super Admin)
    
    Supporte la création d'agents à double casquette (Carbon + SSRTE)
    """
    # Vérifier si email existe déjà
    existing = await db.users.find_one({"email": auditor.email})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Hash password using the centralized auth_utils module
    from auth_utils import get_password_hash
    hashed_password = get_password_hash(auditor.password)
    
    # Définir les rôles
    roles = ["carbon_auditor"]
    user_type = "carbon_auditor"
    
    # Si double casquette, ajouter le rôle SSRTE/field_agent
    if auditor.is_dual_role:
        roles.append("ssrte_agent")
        roles.append("field_agent")
    
    # Créer l'utilisateur auditeur
    user_doc = {
        "email": auditor.email,
        "phone_number": auditor.phone_number,
        "full_name": auditor.full_name,
        "hashed_password": hashed_password,
        "user_type": user_type,
        "roles": roles,  # Liste des rôles pour supporter la double casquette
        "zone_coverage": auditor.zone_coverage,
        "certifications": auditor.certifications,
        "cooperative_id": auditor.cooperative_id,  # Pour les agents double casquette
        "is_active": True,
        "is_dual_role": auditor.is_dual_role,
        "audits_completed": 0,
        "parcels_validated": 0,
        "ssrte_visits_completed": 0,  # Pour les agents SSRTE
        "created_at": datetime.now(timezone.utc),
        "created_by": "admin"
    }
    
    result = await db.users.insert_one(user_doc)
    
    role_description = "Auditeur Carbone + Agent SSRTE" if auditor.is_dual_role else "Auditeur Carbone"
    
    return {
        "message": f"{role_description} créé avec succès",
        "auditor_id": str(result.inserted_id),
        "email": auditor.email,
        "roles": roles,
        "is_dual_role": auditor.is_dual_role
    }


@router.post("/admin/auditors/{auditor_id}/add-role")
async def add_role_to_auditor(auditor_id: str, role: str):
    """Ajouter un rôle à un auditeur existant (Super Admin)
    
    Permet de transformer un auditeur carbone en agent double casquette
    """
    valid_roles = ["carbon_auditor", "ssrte_agent", "field_agent"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Rôle invalide. Valides: {valid_roles}")
    
    user = await db.users.find_one({"_id": ObjectId(auditor_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    current_roles = user.get("roles", [])
    if user.get("user_type") and user.get("user_type") not in current_roles:
        current_roles.append(user.get("user_type"))
    
    if role not in current_roles:
        current_roles.append(role)
    
    is_dual = "carbon_auditor" in current_roles and ("ssrte_agent" in current_roles or "field_agent" in current_roles)
    
    await db.users.update_one(
        {"_id": ObjectId(auditor_id)},
        {"$set": {
            "roles": current_roles,
            "is_dual_role": is_dual,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {
        "message": f"Rôle '{role}' ajouté avec succès",
        "roles": current_roles,
        "is_dual_role": is_dual
    }


@router.delete("/admin/auditors/{auditor_id}/remove-role/{role}")
async def remove_role_from_auditor(auditor_id: str, role: str):
    """Retirer un rôle à un auditeur (Super Admin)"""
    user = await db.users.find_one({"_id": ObjectId(auditor_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    current_roles = user.get("roles", [])
    
    # Ne pas permettre de retirer le rôle principal (user_type)
    if role == user.get("user_type"):
        raise HTTPException(status_code=400, detail="Impossible de retirer le rôle principal")
    
    if role in current_roles:
        current_roles.remove(role)
    
    is_dual = "carbon_auditor" in current_roles and ("ssrte_agent" in current_roles or "field_agent" in current_roles)
    
    await db.users.update_one(
        {"_id": ObjectId(auditor_id)},
        {"$set": {
            "roles": current_roles,
            "is_dual_role": is_dual,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {
        "message": f"Rôle '{role}' retiré avec succès",
        "roles": current_roles,
        "is_dual_role": is_dual
    }


@router.get("/admin/auditors")
async def list_auditors(include_dual_role: bool = True):
    """Lister tous les auditeurs carbone (Super Admin)
    
    Inclut les agents avec rôle carbon_auditor dans leurs rôles
    """
    # Requête pour trouver les auditeurs carbone (user_type ou dans roles)
    query = {
        "$or": [
            {"user_type": "carbon_auditor"},
            {"roles": "carbon_auditor"}
        ]
    }
    
    auditors = await db.users.find(query, {"password": 0, "hashed_password": 0}).to_list(None)
    
    result = []
    for auditor in auditors:
        # Compter les missions
        missions_count = await db.audit_missions.count_documents({"auditor_id": str(auditor["_id"])})
        pending_missions = await db.audit_missions.count_documents({
            "auditor_id": str(auditor["_id"]),
            "status": "pending"
        })
        
        result.append({
            "id": str(auditor["_id"]),
            "full_name": auditor.get("full_name"),
            "email": auditor.get("email"),
            "phone_number": auditor.get("phone_number"),
            "zone_coverage": auditor.get("zone_coverage", []),
            "certifications": auditor.get("certifications", []),
            "is_active": auditor.get("is_active", True),
            "is_dual_role": auditor.get("is_dual_role", False),
            "roles": auditor.get("roles", [auditor.get("user_type")]),
            "cooperative_id": auditor.get("cooperative_id"),
            "audits_completed": auditor.get("audits_completed", 0),
            "parcels_validated": auditor.get("parcels_validated", 0),
            "ssrte_visits_completed": auditor.get("ssrte_visits_completed", 0),
            "missions_count": missions_count,
            "pending_missions": pending_missions,
            "created_at": auditor.get("created_at")
        })
    
    return {
        "auditors": result,
        "total": len(result)
    }

@router.get("/admin/auditors/{auditor_id}")
async def get_auditor_details(auditor_id: str):
    """Détails d'un auditeur (Super Admin) - Supporte les rôles multiples"""
    # Chercher par user_type ou par rôle
    auditor = await db.users.find_one(
        {
            "_id": ObjectId(auditor_id),
            "$or": [
                {"user_type": "carbon_auditor"},
                {"roles": "carbon_auditor"}
            ]
        },
        {"password": 0, "hashed_password": 0}
    )
    
    if not auditor:
        raise HTTPException(status_code=404, detail="Auditeur non trouvé")
    
    # Récupérer les missions
    missions = await db.audit_missions.find({"auditor_id": auditor_id}).sort("created_at", -1).limit(10).to_list(10)
    
    # Récupérer les audits récents
    recent_audits = await db.carbon_audits.find({"auditor_id": auditor_id}).sort("audit_date", -1).limit(10).to_list(10)
    
    return {
        "id": str(auditor["_id"]),
        "full_name": auditor.get("full_name"),
        "email": auditor.get("email"),
        "phone_number": auditor.get("phone_number"),
        "zone_coverage": auditor.get("zone_coverage", []),
        "certifications": auditor.get("certifications", []),
        "is_active": auditor.get("is_active", True),
        "is_dual_role": auditor.get("is_dual_role", False),
        "roles": auditor.get("roles", [auditor.get("user_type")]),
        "cooperative_id": auditor.get("cooperative_id"),
        "audits_completed": auditor.get("audits_completed", 0),
        "parcels_validated": auditor.get("parcels_validated", 0),
        "ssrte_visits_completed": auditor.get("ssrte_visits_completed", 0),
        "created_at": auditor.get("created_at"),
        "recent_missions": [{
            "id": str(m["_id"]),
            "cooperative_id": m.get("cooperative_id"),
            "parcels_count": len(m.get("parcel_ids", [])),
            "status": m.get("status"),
            "created_at": m.get("created_at")
        } for m in missions],
        "recent_audits": [{
            "id": str(a["_id"]),
            "parcel_id": a.get("parcel_id"),
            "recommendation": a.get("recommendation"),
            "audit_date": a.get("audit_date")
        } for a in recent_audits]
    }

@router.put("/admin/auditors/{auditor_id}")
async def update_auditor(auditor_id: str, update: AuditorUpdate):
    """Mettre à jour un auditeur (Super Admin) - Supporte les rôles multiples"""
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    # Si des rôles sont spécifiés, mettre à jour is_dual_role
    if "roles" in update_data:
        roles = update_data["roles"]
        is_dual = "carbon_auditor" in roles and ("ssrte_agent" in roles or "field_agent" in roles)
        update_data["is_dual_role"] = is_dual
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Chercher par user_type ou par rôle
    result = await db.users.update_one(
        {
            "_id": ObjectId(auditor_id),
            "$or": [
                {"user_type": "carbon_auditor"},
                {"roles": "carbon_auditor"}
            ]
        },
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Auditeur non trouvé")
    
    return {"message": "Auditeur mis à jour avec succès"}

@router.delete("/admin/auditors/{auditor_id}")
async def deactivate_auditor(auditor_id: str):
    """Désactiver un auditeur (Super Admin)"""
    result = await db.users.update_one(
        {
            "_id": ObjectId(auditor_id),
            "$or": [
                {"user_type": "carbon_auditor"},
                {"roles": "carbon_auditor"}
            ]
        },
        {"$set": {"is_active": False, "deactivated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Auditeur non trouvé")
    
    return {"message": "Auditeur désactivé avec succès"}

# ============== MISSIONS D'AUDIT ==============

@router.post("/admin/missions/create")
async def create_audit_mission(mission: AuditMissionCreate):
    """Créer une mission d'audit (Super Admin)"""
    # Vérifier que l'auditeur existe
    auditor = await db.users.find_one({"_id": ObjectId(mission.auditor_id), "user_type": "carbon_auditor"})
    if not auditor:
        raise HTTPException(status_code=404, detail="Auditeur non trouvé")
    
    # Vérifier que la coopérative existe
    coop = await db.users.find_one({"_id": ObjectId(mission.cooperative_id), "user_type": "cooperative"})
    if not coop:
        raise HTTPException(status_code=404, detail="Coopérative non trouvée")
    
    mission_doc = {
        "auditor_id": mission.auditor_id,
        "auditor_name": auditor.get("full_name"),
        "cooperative_id": mission.cooperative_id,
        "cooperative_name": coop.get("full_name") or coop.get("cooperative_name"),
        "parcel_ids": mission.parcel_ids,
        "parcels_count": len(mission.parcel_ids),
        "parcels_audited": 0,
        "deadline": mission.deadline,
        "notes": mission.notes,
        "status": "pending",  # pending, in_progress, completed
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.audit_missions.insert_one(mission_doc)
    
    return {
        "message": "Mission d'audit créée avec succès",
        "mission_id": str(result.inserted_id),
        "parcels_to_audit": len(mission.parcel_ids)
    }

@router.get("/admin/missions")
async def list_missions(status: Optional[str] = None):
    """Lister toutes les missions d'audit (Super Admin)"""
    query = {}
    if status:
        query["status"] = status
    
    missions = await db.audit_missions.find(query).sort("created_at", -1).to_list(None)
    
    return {
        "missions": [{
            "id": str(m["_id"]),
            "auditor_id": m.get("auditor_id"),
            "auditor_name": m.get("auditor_name"),
            "cooperative_id": m.get("cooperative_id"),
            "cooperative_name": m.get("cooperative_name"),
            "parcels_count": m.get("parcels_count", 0),
            "parcels_audited": m.get("parcels_audited", 0),
            "status": m.get("status"),
            "deadline": m.get("deadline"),
            "created_at": m.get("created_at")
        } for m in missions],
        "total": len(missions)
    }

# ============== ROUTES AUDITEUR (Dashboard & Audits) ==============

@router.get("/dashboard/{auditor_id}")
async def get_auditor_dashboard(auditor_id: str):
    """Dashboard de l'auditeur carbone"""
    # Vérifier l'auditeur
    auditor = await db.users.find_one(
        {"_id": ObjectId(auditor_id), "user_type": "carbon_auditor"},
        {"password": 0}
    )
    
    if not auditor:
        raise HTTPException(status_code=404, detail="Auditeur non trouvé")
    
    # Missions en cours
    pending_missions = await db.audit_missions.find({
        "auditor_id": auditor_id,
        "status": {"$in": ["pending", "in_progress"]}
    }).to_list(None)
    
    # Statistiques
    total_audits = await db.carbon_audits.count_documents({"auditor_id": auditor_id})
    approved_audits = await db.carbon_audits.count_documents({"auditor_id": auditor_id, "recommendation": "approved"})
    rejected_audits = await db.carbon_audits.count_documents({"auditor_id": auditor_id, "recommendation": "rejected"})
    
    # Audits ce mois
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_audits = await db.carbon_audits.count_documents({
        "auditor_id": auditor_id,
        "audit_date": {"$gte": month_start}
    })
    
    # Calculer le badge actuel
    badge = calculate_auditor_badge(total_audits)
    
    # Objectif pour le prochain badge
    next_badge_info = get_next_badge_info(total_audits)
    
    return {
        "auditor": {
            "id": str(auditor["_id"]),
            "full_name": auditor.get("full_name"),
            "email": auditor.get("email"),
            "certifications": auditor.get("certifications", []),
            "badge": badge,
            "badge_label": get_badge_label(badge)
        },
        "stats": {
            "total_audits": total_audits,
            "approved": approved_audits,
            "rejected": rejected_audits,
            "monthly_audits": monthly_audits,
            "approval_rate": round((approved_audits / total_audits * 100) if total_audits > 0 else 0, 1)
        },
        "badge_progress": next_badge_info,
        "pending_missions": [{
            "id": str(m["_id"]),
            "cooperative_name": m.get("cooperative_name"),
            "parcels_count": m.get("parcels_count", 0),
            "parcels_audited": m.get("parcels_audited", 0),
            "deadline": m.get("deadline"),
            "status": m.get("status")
        } for m in pending_missions],
        "missions_count": len(pending_missions)
    }

def get_badge_label(badge: str) -> str:
    """Obtenir le label du badge"""
    labels = {
        "starter": "🌱 Débutant",
        "bronze": "🥉 Bronze",
        "silver": "🥈 Argent",
        "gold": "🥇 Or"
    }
    return labels.get(badge, "")

def get_next_badge_info(audits_completed: int) -> dict:
    """Obtenir les infos sur le prochain badge"""
    if audits_completed >= 100:
        return {
            "current_badge": "gold",
            "next_badge": None,
            "audits_needed": 0,
            "progress_percent": 100
        }
    elif audits_completed >= 50:
        return {
            "current_badge": "silver",
            "next_badge": "gold",
            "audits_needed": 100 - audits_completed,
            "progress_percent": int((audits_completed / 100) * 100)
        }
    elif audits_completed >= 10:
        return {
            "current_badge": "bronze",
            "next_badge": "silver",
            "audits_needed": 50 - audits_completed,
            "progress_percent": int((audits_completed / 50) * 100)
        }
    else:
        return {
            "current_badge": "starter" if audits_completed > 0 else None,
            "next_badge": "bronze",
            "audits_needed": 10 - audits_completed,
            "progress_percent": int((audits_completed / 10) * 100)
        }

@router.get("/missions/{auditor_id}")
async def get_auditor_missions(auditor_id: str, status: Optional[str] = None):
    """Liste des missions d'un auditeur"""
    query = {"auditor_id": auditor_id}
    if status:
        query["status"] = status
    
    missions = await db.audit_missions.find(query).sort("created_at", -1).to_list(None)
    
    return {
        "missions": [{
            "id": str(m["_id"]),
            "cooperative_id": m.get("cooperative_id"),
            "cooperative_name": m.get("cooperative_name"),
            "parcel_ids": m.get("parcel_ids", []),
            "parcels_count": m.get("parcels_count", 0),
            "parcels_audited": m.get("parcels_audited", 0),
            "status": m.get("status"),
            "deadline": m.get("deadline"),
            "notes": m.get("notes"),
            "created_at": m.get("created_at")
        } for m in missions]
    }

@router.get("/mission/{mission_id}/parcels")
async def get_mission_parcels(mission_id: str):
    """Liste des parcelles d'une mission à auditer"""
    mission = await db.audit_missions.find_one({"_id": ObjectId(mission_id)})
    
    if not mission:
        raise HTTPException(status_code=404, detail="Mission non trouvée")
    
    parcel_ids = mission.get("parcel_ids", [])
    
    # Récupérer les détails des parcelles
    parcels = []
    for pid in parcel_ids:
        parcel = await db.parcels.find_one({"_id": ObjectId(pid)})
        if parcel:
            # Vérifier si déjà audité
            audit = await db.carbon_audits.find_one({
                "parcel_id": pid,
                "mission_id": mission_id
            })
            
            # Récupérer info producteur
            farmer = None
            if parcel.get("farmer_id"):
                farmer = await db.users.find_one({"_id": ObjectId(parcel["farmer_id"])}, {"full_name": 1})
            
            parcels.append({
                "id": str(parcel["_id"]),
                "location": parcel.get("location"),
                "village": parcel.get("village"),
                "area_hectares": parcel.get("area_hectares") or parcel.get("size"),
                "crop_type": parcel.get("crop_type"),
                "farmer_name": farmer.get("full_name") if farmer else "Non assigné",
                "gps_lat": parcel.get("gps_lat") or parcel.get("latitude"),
                "gps_lng": parcel.get("gps_lng") or parcel.get("longitude"),
                "carbon_score": parcel.get("carbon_score"),
                "audit_status": "completed" if audit else "pending",
                "audit_result": audit.get("recommendation") if audit else None
            })
    
    return {
        "mission_id": mission_id,
        "cooperative_name": mission.get("cooperative_name"),
        "parcels": parcels,
        "total": len(parcels),
        "audited": len([p for p in parcels if p["audit_status"] == "completed"])
    }

@router.post("/audit/submit")
async def submit_audit(audit: AuditSubmission, auditor_id: str, mission_id: str):
    """Soumettre un audit de parcelle"""
    # Vérifier l'auditeur
    auditor = await db.users.find_one({"_id": ObjectId(auditor_id), "user_type": "carbon_auditor"})
    if not auditor:
        raise HTTPException(status_code=404, detail="Auditeur non trouvé")
    
    # Vérifier la mission
    mission = await db.audit_missions.find_one({"_id": ObjectId(mission_id)})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission non trouvée")
    
    # Vérifier la parcelle
    parcel = await db.parcels.find_one({"_id": ObjectId(audit.parcel_id)})
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcelle non trouvée")
    
    # Calculer le nouveau score carbone basé sur l'audit
    carbon_score = calculate_carbon_score_from_audit(audit)
    
    # Créer l'audit
    audit_doc = {
        "parcel_id": audit.parcel_id,
        "mission_id": mission_id,
        "auditor_id": auditor_id,
        "auditor_name": auditor.get("full_name"),
        "actual_area_hectares": audit.actual_area_hectares,
        "shade_trees_count": audit.shade_trees_count,
        "shade_trees_density": audit.shade_trees_density,
        "organic_practices": audit.organic_practices,
        "soil_cover": audit.soil_cover,
        "composting": audit.composting,
        "erosion_control": audit.erosion_control,
        "crop_health": audit.crop_health,
        "photos": audit.photos,
        "gps_lat": audit.gps_lat,
        "gps_lng": audit.gps_lng,
        "observations": audit.observations,
        "recommendation": audit.recommendation,
        "rejection_reason": audit.rejection_reason,
        "calculated_carbon_score": carbon_score,
        "audit_date": datetime.now(timezone.utc)
    }
    
    result = await db.carbon_audits.insert_one(audit_doc)
    
    # Mettre à jour la parcelle si approuvée
    if audit.recommendation == "approved":
        await db.parcels.update_one(
            {"_id": ObjectId(audit.parcel_id)},
            {"$set": {
                "audit_status": "approved",
                "audited_carbon_score": carbon_score,
                "audited_area_hectares": audit.actual_area_hectares,
                "last_audit_date": datetime.now(timezone.utc),
                "last_auditor_id": auditor_id
            }}
        )
    elif audit.recommendation == "rejected":
        await db.parcels.update_one(
            {"_id": ObjectId(audit.parcel_id)},
            {"$set": {
                "audit_status": "rejected",
                "rejection_reason": audit.rejection_reason,
                "last_audit_date": datetime.now(timezone.utc)
            }}
        )
    
    # Mettre à jour la mission
    await db.audit_missions.update_one(
        {"_id": ObjectId(mission_id)},
        {
            "$inc": {"parcels_audited": 1},
            "$set": {"status": "in_progress"}
        }
    )
    
    # Vérifier si mission complète
    mission_updated = await db.audit_missions.find_one({"_id": ObjectId(mission_id)})
    if mission_updated.get("parcels_audited", 0) >= mission_updated.get("parcels_count", 0):
        await db.audit_missions.update_one(
            {"_id": ObjectId(mission_id)},
            {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}}
        )
    
    # Mettre à jour stats auditeur
    await db.users.update_one(
        {"_id": ObjectId(auditor_id)},
        {"$inc": {
            "audits_completed": 1,
            "parcels_validated": 1 if audit.recommendation == "approved" else 0
        }}
    )
    
    # Calculer et mettre à jour le badge de l'auditeur
    auditor_updated = await db.users.find_one({"_id": ObjectId(auditor_id)})
    new_badge = calculate_auditor_badge(auditor_updated.get("audits_completed", 0))
    if new_badge:
        current_badge = auditor_updated.get("badge")
        if current_badge != new_badge:
            await db.users.update_one(
                {"_id": ObjectId(auditor_id)},
                {"$set": {"badge": new_badge, "badge_earned_at": datetime.now(timezone.utc)}}
            )
    
    # Envoyer notification push à l'admin et à la coopérative
    try:
        from services.push_notifications import push_service
        import asyncio
        
        # Notification à la coopérative
        coop_id = mission.get("cooperative_id")
        if coop_id:
            asyncio.create_task(push_service.notify_audit_completed(
                cooperative_id=coop_id,
                parcel_location=parcel.get("location", "Parcelle"),
                recommendation=audit.recommendation,
                carbon_score=carbon_score,
                auditor_name=auditor.get("full_name")
            ))
    except Exception as e:
        print(f"Error sending audit notification: {e}")
    
    return {
        "message": "Audit soumis avec succès",
        "audit_id": str(result.inserted_id),
        "recommendation": audit.recommendation,
        "carbon_score": carbon_score,
        "badge": new_badge
    }

def calculate_auditor_badge(audits_completed: int) -> str:
    """Calculer le badge de l'auditeur basé sur le nombre d'audits"""
    if audits_completed >= 100:
        return "gold"      # Auditeur Or
    elif audits_completed >= 50:
        return "silver"    # Auditeur Argent
    elif audits_completed >= 10:
        return "bronze"    # Auditeur Bronze
    elif audits_completed >= 1:
        return "starter"   # Débutant
    return None

def calculate_carbon_score_from_audit(audit: AuditSubmission) -> float:
    """Calculer le score carbone basé sur les données d'audit"""
    score = 0.0
    
    # Base: Densité arbres d'ombrage (max 4 points)
    if audit.shade_trees_density == "high":
        score += 4.0
    elif audit.shade_trees_density == "medium":
        score += 2.5
    elif audit.shade_trees_density == "low":
        score += 1.0
    
    # Pratiques durables (max 4 points)
    if audit.organic_practices:
        score += 1.0
    if audit.soil_cover:
        score += 1.0
    if audit.composting:
        score += 1.0
    if audit.erosion_control:
        score += 1.0
    
    # Santé des cultures (max 2 points)
    health_scores = {"excellent": 2.0, "good": 1.5, "average": 1.0, "poor": 0.5}
    score += health_scores.get(audit.crop_health, 0.5)
    
    return min(round(score, 1), 10.0)

@router.get("/audit/{audit_id}")
async def get_audit_details(audit_id: str):
    """Détails d'un audit"""
    audit = await db.carbon_audits.find_one({"_id": ObjectId(audit_id)})
    
    if not audit:
        raise HTTPException(status_code=404, detail="Audit non trouvé")
    
    # Récupérer info parcelle
    parcel = await db.parcels.find_one({"_id": ObjectId(audit["parcel_id"])})
    
    return {
        "id": str(audit["_id"]),
        "parcel_id": audit.get("parcel_id"),
        "parcel_location": parcel.get("location") if parcel else None,
        "auditor_name": audit.get("auditor_name"),
        "actual_area_hectares": audit.get("actual_area_hectares"),
        "shade_trees_count": audit.get("shade_trees_count"),
        "shade_trees_density": audit.get("shade_trees_density"),
        "organic_practices": audit.get("organic_practices"),
        "soil_cover": audit.get("soil_cover"),
        "composting": audit.get("composting"),
        "erosion_control": audit.get("erosion_control"),
        "crop_health": audit.get("crop_health"),
        "photos": audit.get("photos", []),
        "gps_lat": audit.get("gps_lat"),
        "gps_lng": audit.get("gps_lng"),
        "observations": audit.get("observations"),
        "recommendation": audit.get("recommendation"),
        "rejection_reason": audit.get("rejection_reason"),
        "calculated_carbon_score": audit.get("calculated_carbon_score"),
        "audit_date": audit.get("audit_date")
    }

# ============== STATS GLOBALES ==============

@router.get("/admin/stats/overview")
async def get_audit_stats_overview():
    """Statistiques globales des audits (Super Admin)"""
    total_auditors = await db.users.count_documents({"user_type": "carbon_auditor", "is_active": True})
    total_missions = await db.audit_missions.count_documents({})
    pending_missions = await db.audit_missions.count_documents({"status": "pending"})
    completed_missions = await db.audit_missions.count_documents({"status": "completed"})
    
    total_audits = await db.carbon_audits.count_documents({})
    approved_audits = await db.carbon_audits.count_documents({"recommendation": "approved"})
    rejected_audits = await db.carbon_audits.count_documents({"recommendation": "rejected"})
    
    # Audits ce mois
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_audits = await db.carbon_audits.count_documents({"audit_date": {"$gte": month_start}})
    
    in_progress_missions = await db.audit_missions.count_documents({"status": "in_progress"})
    needs_review_audits = await db.carbon_audits.count_documents({"recommendation": "needs_review"})
    
    return {
        "auditors": {
            "total": total_auditors,
            "active": total_auditors
        },
        "missions": {
            "total": total_missions,
            "pending": pending_missions,
            "in_progress": in_progress_missions,
            "completed": completed_missions
        },
        "audits": {
            "total": total_audits,
            "approved": approved_audits,
            "rejected": rejected_audits,
            "needs_review": needs_review_audits,
            "approval_rate": round((approved_audits / total_audits * 100) if total_audits > 0 else 0, 1),
            "monthly": monthly_audits
        }
    }


# ============== PDF REPORTS ==============

@router.get("/audit/{audit_id}/pdf")
async def get_audit_pdf_report(audit_id: str):
    """Générer le rapport PDF d'un audit"""
    from fastapi.responses import Response
    from services.pdf_service import pdf_generator
    
    audit = await db.carbon_audits.find_one({"_id": ObjectId(audit_id)})
    if not audit:
        raise HTTPException(status_code=404, detail="Audit non trouvé")
    
    # Get related data
    parcel = await db.parcels.find_one({"_id": ObjectId(audit["parcel_id"])})
    mission = await db.audit_missions.find_one({"_id": ObjectId(audit.get("mission_id", ""))}) if audit.get("mission_id") else None
    auditor = await db.users.find_one({"_id": ObjectId(audit["auditor_id"])})
    
    farmer = None
    if parcel and parcel.get("member_id"):
        mid = parcel["member_id"]
        farmer = await db.users.find_one({"_id": ObjectId(mid)}) if ObjectId.is_valid(str(mid)) else None
        if not farmer:
            farmer = await db.coop_members.find_one({"_id": ObjectId(mid)}) if ObjectId.is_valid(str(mid)) else None
    
    data = {
        "audit_id": str(audit["_id"]),
        "audit_date": audit.get("audit_date", datetime.now(timezone.utc)).strftime("%d/%m/%Y"),
        "mission": {
            "cooperative_name": mission.get("cooperative_name", "N/A") if mission else "N/A",
            "auditor_name": auditor.get("full_name", "N/A") if auditor else "N/A"
        },
        "parcel": {
            "location": parcel.get("location", "N/A") if parcel else "N/A",
            "farmer_name": farmer.get("full_name", "N/A") if farmer else parcel.get("farmer_name", "N/A") if parcel else "N/A",
            "declared_area": parcel.get("area_hectares", 0) if parcel else 0
        },
        "actual_area_hectares": audit.get("actual_area_hectares", 0),
        "gps_lat": audit.get("gps_coordinates", {}).get("lat", "N/A"),
        "gps_lng": audit.get("gps_coordinates", {}).get("lng", "N/A"),
        "shade_trees_count": audit.get("shade_trees_count", 0),
        "shade_trees_density": audit.get("shade_trees_density", "N/A"),
        "organic_practices": audit.get("organic_practices", False),
        "soil_cover": audit.get("soil_cover", False),
        "composting": audit.get("composting", False),
        "erosion_control": audit.get("erosion_control", False),
        "crop_health": audit.get("crop_health", "N/A"),
        "carbon_score": audit.get("carbon_score", 0),
        "recommendation": audit.get("recommendation", "pending"),
        "observations": audit.get("observations", ""),
        "rejection_reason": audit.get("rejection_reason", "")
    }
    
    pdf_bytes = pdf_generator.generate_audit_report(data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=audit_report_{audit_id}.pdf"
        }
    )


@router.get("/auditor/{auditor_id}/badge-certificate")
async def get_badge_certificate(auditor_id: str):
    """Générer le certificat de badge d'un auditeur"""
    from fastapi.responses import Response
    from services.pdf_service import pdf_generator
    
    auditor = await db.users.find_one({"_id": ObjectId(auditor_id), "user_type": "carbon_auditor"})
    if not auditor:
        raise HTTPException(status_code=404, detail="Auditeur non trouvé")
    
    total_audits = await db.carbon_audits.count_documents({"auditor_id": auditor_id})
    approved = await db.carbon_audits.count_documents({"auditor_id": auditor_id, "recommendation": "approved"})
    
    badge = calculate_auditor_badge(total_audits)
    if not badge:
        raise HTTPException(status_code=400, detail="Aucun badge obtenu")
    
    data = {
        "auditor_name": auditor.get("full_name", "N/A"),
        "badge": badge,
        "total_audits": total_audits,
        "approval_rate": round((approved / total_audits * 100) if total_audits > 0 else 0, 1),
        "badge_date": auditor.get("badge_earned_at", datetime.now(timezone.utc)).strftime("%d/%m/%Y") if auditor.get("badge_earned_at") else datetime.now(timezone.utc).strftime("%d/%m/%Y")
    }
    
    pdf_bytes = pdf_generator.generate_auditor_badge_certificate(data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=badge_certificate_{auditor_id}.pdf"
        }
    )


# ============== ANALYTICS DASHBOARD ==============

@router.get("/admin/analytics/badges")
async def get_badges_analytics():
    """Dashboard Analytics des badges auditeurs"""
    
    # Badge distribution
    all_auditors = await db.users.find({"user_type": "carbon_auditor"}).to_list(None)
    
    badge_counts = {
        "gold": 0,
        "silver": 0,
        "bronze": 0,
        "starter": 0,
        "none": 0
    }
    
    auditor_details = []
    
    for auditor in all_auditors:
        auditor_id = str(auditor["_id"])
        total_audits = await db.carbon_audits.count_documents({"auditor_id": auditor_id})
        approved = await db.carbon_audits.count_documents({"auditor_id": auditor_id, "recommendation": "approved"})
        
        badge = calculate_auditor_badge(total_audits)
        if badge:
            badge_counts[badge] += 1
        else:
            badge_counts["none"] += 1
        
        auditor_details.append({
            "id": auditor_id,
            "full_name": auditor.get("full_name"),
            "email": auditor.get("email"),
            "badge": badge,
            "badge_label": get_badge_label(badge) if badge else "Aucun",
            "total_audits": total_audits,
            "approved_audits": approved,
            "approval_rate": round((approved / total_audits * 100) if total_audits > 0 else 0, 1),
            "is_active": auditor.get("is_active", True)
        })
    
    # Sort by total audits (leaderboard)
    auditor_details.sort(key=lambda x: x["total_audits"], reverse=True)
    
    # Monthly trends
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_audits = await db.carbon_audits.count_documents({"audit_date": {"$gte": month_start}})
    
    # Previous month comparison
    prev_month_start = (month_start - timedelta(days=1)).replace(day=1)
    prev_month_audits = await db.carbon_audits.count_documents({
        "audit_date": {"$gte": prev_month_start, "$lt": month_start}
    })
    
    growth_rate = 0
    if prev_month_audits > 0:
        growth_rate = round(((monthly_audits - prev_month_audits) / prev_month_audits) * 100, 1)
    
    return {
        "badge_distribution": badge_counts,
        "total_auditors": len(all_auditors),
        "active_auditors": len([a for a in all_auditors if a.get("is_active", True)]),
        "leaderboard": auditor_details[:10],  # Top 10
        "all_auditors": auditor_details,
        "monthly_stats": {
            "current_month_audits": monthly_audits,
            "previous_month_audits": prev_month_audits,
            "growth_rate": growth_rate
        },
        "badge_requirements": {
            "starter": {"min_audits": 1, "description": "Premier audit complété"},
            "bronze": {"min_audits": 10, "description": "10 audits complétés"},
            "silver": {"min_audits": 50, "description": "50 audits complétés"},
            "gold": {"min_audits": 100, "description": "100 audits - Excellence"}
        }
    }
