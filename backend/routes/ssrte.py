"""
SSRTE (Système de Suivi et Remédiation du Travail des Enfants) Routes
Conforme aux standards ICI (International Cocoa Initiative)
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from enum import Enum
import logging

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ssrte", tags=["SSRTE - Child Labor Monitoring"])


# ============== ENUMS ==============

class ChildLaborType(str, Enum):
    NONE = "none"  # Pas de travail des enfants
    LIGHT_WORK = "light_work"  # Travail léger (acceptable selon l'âge)
    HAZARDOUS = "hazardous"  # Travail dangereux
    WORST_FORMS = "worst_forms"  # Pires formes de travail des enfants


class CaseStatus(str, Enum):
    IDENTIFIED = "identified"  # Cas identifié
    IN_PROGRESS = "in_progress"  # Remédiation en cours
    RESOLVED = "resolved"  # Cas résolu
    CLOSED = "closed"  # Dossier fermé


class RemediationType(str, Enum):
    SCHOOLING = "schooling"  # Scolarisation
    AWARENESS = "awareness"  # Sensibilisation
    ECONOMIC_SUPPORT = "economic_support"  # Support économique
    BIRTH_CERTIFICATE = "birth_certificate"  # Obtention acte de naissance
    WITHDRAWAL = "withdrawal"  # Retrait du travail
    OTHER = "other"


# ============== MODELS ==============

class SSRTEAgentCreate(BaseModel):
    full_name: str
    email: str
    phone_number: str
    password: str
    cooperative_id: str
    zone_coverage: List[str] = []


class HouseholdVisitCreate(BaseModel):
    member_id: str  # ID du membre/producteur visité
    visit_date: Optional[str] = None
    household_size: int
    children_count: int
    children_details: List[dict] = []  # Liste des enfants avec âge, scolarisation, activités
    living_conditions: str  # good, average, poor
    has_piped_water: bool = False
    has_electricity: bool = False
    distance_to_school_km: Optional[float] = None
    observations: Optional[str] = None
    photos: List[str] = []
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None


class ChildLaborCaseCreate(BaseModel):
    visit_id: str
    member_id: str
    child_name: str
    child_age: int
    child_gender: str  # M/F
    labor_type: ChildLaborType
    activities_observed: List[str] = []  # Ex: ["spraying", "carrying_loads", "harvesting"]
    hours_per_day: Optional[float] = None
    school_attendance: str  # regular, irregular, none
    description: str
    severity_score: int = Field(ge=1, le=10)  # 1-10
    photos: List[str] = []


class RemediationPlanCreate(BaseModel):
    case_id: str
    remediation_type: RemediationType
    description: str
    target_date: str
    responsible_party: str  # cooperative, family, ngo, government
    budget_xof: Optional[float] = None
    notes: Optional[str] = None


class RemediationUpdate(BaseModel):
    status: str  # planned, in_progress, completed, cancelled
    completion_date: Optional[str] = None
    outcome: Optional[str] = None
    notes: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

def verify_ssrte_access(user: dict):
    """Vérifie l'accès SSRTE (agents, coopératives, admin)"""
    user_type = user.get('user_type')
    roles = user.get('roles', [])
    
    valid_types = ['admin', 'cooperative', 'field_agent', 'carbon_auditor']
    valid_roles = ['ssrte_agent', 'field_agent']
    
    has_valid_type = user_type in valid_types
    has_valid_role = any(role in roles for role in valid_roles)
    
    if not has_valid_type and not has_valid_role:
        raise HTTPException(status_code=403, detail="Accès SSRTE non autorisé")


# ============== AGENT MANAGEMENT ==============

@router.post("/agents/create")
async def create_ssrte_agent(agent: SSRTEAgentCreate, current_user: dict = Depends(get_current_user)):
    """Créer un agent SSRTE (Admin ou Coopérative)"""
    if current_user.get('user_type') not in ['admin', 'cooperative']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    # Vérifier email unique
    existing = await db.users.find_one({"email": agent.email})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Vérifier la coopérative
    coop = await db.users.find_one({"_id": ObjectId(agent.cooperative_id), "user_type": "cooperative"})
    if not coop:
        raise HTTPException(status_code=404, detail="Coopérative non trouvée")
    
    from auth_utils import get_password_hash
    hashed_password = get_password_hash(agent.password)
    
    user_doc = {
        "email": agent.email,
        "phone_number": agent.phone_number,
        "full_name": agent.full_name,
        "hashed_password": hashed_password,
        "user_type": "field_agent",
        "roles": ["ssrte_agent", "field_agent"],
        "cooperative_id": agent.cooperative_id,
        "cooperative_name": coop.get("full_name") or coop.get("coop_name"),
        "zone_coverage": agent.zone_coverage,
        "is_active": True,
        "ssrte_stats": {
            "visits_completed": 0,
            "cases_identified": 0,
            "cases_resolved": 0
        },
        "created_at": datetime.now(timezone.utc),
        "created_by": str(current_user["_id"])
    }
    
    result = await db.users.insert_one(user_doc)
    
    return {
        "message": "Agent SSRTE créé avec succès",
        "agent_id": str(result.inserted_id),
        "email": agent.email,
        "cooperative": coop.get("full_name") or coop.get("coop_name")
    }


@router.get("/agents")
async def list_ssrte_agents(
    cooperative_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Lister les agents SSRTE"""
    verify_ssrte_access(current_user)
    
    query = {"roles": "ssrte_agent"}
    
    # Filtrer par coopérative si spécifié ou si l'utilisateur est une coopérative
    if cooperative_id:
        query["cooperative_id"] = cooperative_id
    elif current_user.get('user_type') == 'cooperative':
        query["cooperative_id"] = str(current_user["_id"])
    
    agents = await db.users.find(query, {"hashed_password": 0}).to_list(None)
    
    result = []
    for agent in agents:
        stats = agent.get("ssrte_stats", {})
        result.append({
            "id": str(agent["_id"]),
            "full_name": agent.get("full_name"),
            "email": agent.get("email"),
            "phone_number": agent.get("phone_number"),
            "cooperative_id": agent.get("cooperative_id"),
            "cooperative_name": agent.get("cooperative_name"),
            "zone_coverage": agent.get("zone_coverage", []),
            "is_active": agent.get("is_active", True),
            "visits_completed": stats.get("visits_completed", 0),
            "cases_identified": stats.get("cases_identified", 0),
            "cases_resolved": stats.get("cases_resolved", 0),
            "created_at": agent.get("created_at")
        })
    
    return {"agents": result, "total": len(result)}


# ============== HOUSEHOLD VISITS ==============

@router.post("/visits/create")
async def create_household_visit(
    visit: HouseholdVisitCreate,
    current_user: dict = Depends(get_current_user)
):
    """Enregistrer une visite de ménage"""
    verify_ssrte_access(current_user)
    
    # Vérifier le membre
    member = await db.coop_members.find_one({"_id": ObjectId(visit.member_id)})
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Analyser les enfants pour détecter les risques
    children_at_risk = 0
    for child in visit.children_details:
        age = child.get("age", 0)
        works_on_farm = child.get("works_on_farm", False)
        in_school = child.get("in_school", True)
        
        # Enfant à risque si: travaille sur la ferme ET (moins de 15 ans OU pas scolarisé)
        if works_on_farm and (age < 15 or not in_school):
            children_at_risk += 1
    
    # Resolve cooperative_id from member or current user
    resolved_coop_id = member.get("coop_id") or member.get("cooperative_id") or ""
    if not resolved_coop_id and current_user.get("user_type") in ("cooperative", "admin"):
        resolved_coop_id = str(current_user["_id"])
    if not resolved_coop_id:
        resolved_coop_id = current_user.get("coop_id", "") or current_user.get("cooperative_id", "")

    # Map risk to French normalized level
    risk_english = "high" if children_at_risk > 0 else "low"
    risk_french = {"high": "eleve", "low": "faible"}.get(risk_english, "faible")

    visit_doc = {
        "agent_id": str(current_user["_id"]),
        "agent_name": current_user.get("full_name"),
        "member_id": visit.member_id,
        "farmer_id": visit.member_id,
        "member_name": member.get("full_name"),
        "cooperative_id": resolved_coop_id,
        "coop_id": resolved_coop_id,
        "visit_date": datetime.fromisoformat(visit.visit_date) if visit.visit_date else datetime.now(timezone.utc),
        "household_size": visit.household_size,
        "children_count": visit.children_count,
        "children_details": visit.children_details,
        "children_at_risk": children_at_risk,
        "enfants_observes_travaillant": children_at_risk,
        "living_conditions": visit.living_conditions,
        "has_piped_water": visit.has_piped_water,
        "has_electricity": visit.has_electricity,
        "distance_to_school_km": visit.distance_to_school_km,
        "observations": visit.observations,
        "photos": visit.photos,
        "gps_coordinates": {
            "lat": visit.gps_lat,
            "lng": visit.gps_lng
        } if visit.gps_lat and visit.gps_lng else None,
        "status": "completed",
        "risk_level": risk_english,
        "niveau_risque": risk_french,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.ssrte_visits.insert_one(visit_doc)
    visit_doc["_id"] = result.inserted_id
    
    # Mettre à jour les stats de l'agent
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"ssrte_stats.visits_completed": 1}}
    )
    
    # Envoyer une notification push pour les visites à haut risque
    if children_at_risk > 0:
        try:
            from services.push_notifications import push_service
            await push_service.send_ssrte_visit_notification({
                "_id": result.inserted_id,
                "farmer_name": member.get("full_name"),
                "niveau_risque": "eleve",
                "enfants_observes_travaillant": children_at_risk
            })
            logger.info(f"[SSRTE] Push notification sent for high-risk visit: {member.get('full_name')}")
        except Exception as e:
            logger.error(f"[SSRTE] Failed to send push notification: {e}")
        
        # Stocker notification pour la coopérative
        try:
            coop_id = member.get("coop_id") or member.get("cooperative_id")
            if coop_id:
                notif_title = "Alerte SSRTE - Visite critique"
                notif_body = f"{children_at_risk} enfant(s) à risque détecté(s) chez {member.get('full_name', 'un producteur')}. Agent: {current_user.get('full_name', 'N/A')}."
                
                await db.notification_history.insert_one({
                    "user_id": str(coop_id),
                    "title": notif_title,
                    "body": notif_body,
                    "data": {
                        "type": "ssrte_critical_alert",
                        "visit_id": str(result.inserted_id),
                        "farmer_name": member.get("full_name"),
                        "children_at_risk": children_at_risk,
                        "screen": "SSRTE"
                    },
                    "type": "ssrte_critical_alert",
                    "read": False,
                    "created_at": datetime.now(timezone.utc)
                })
                logger.info(f"[SSRTE] Notification critique stockée pour coopérative {coop_id}")
        except Exception as e:
            logger.error(f"[SSRTE] Failed to store critical notification: {e}")
        
        # Envoyer une alerte WebSocket temps réel
        try:
            from services.websocket_manager import send_ssrte_high_risk_visit
            await send_ssrte_high_risk_visit({
                "_id": result.inserted_id,
                "member_name": member.get("full_name"),
                "children_count": visit.children_count,
                "children_at_risk": children_at_risk,
                "risk_level": "high",
                "agent_name": current_user.get("full_name")
            })
            logger.info(f"[SSRTE] WebSocket alert sent for high-risk visit")
        except Exception as e:
            logger.error(f"[SSRTE] Failed to send WebSocket alert: {e}")
    
    return {
        "message": "Visite enregistrée avec succès",
        "visit_id": str(result.inserted_id),
        "children_at_risk": children_at_risk,
        "risk_level": "high" if children_at_risk > 0 else "low",
        "notification_sent": children_at_risk > 0
    }


@router.get("/visits")
async def list_visits(
    cooperative_id: Optional[str] = None,
    agent_id: Optional[str] = None,
    risk_level: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Lister les visites de ménages"""
    verify_ssrte_access(current_user)
    
    query = {}
    
    if cooperative_id:
        query["cooperative_id"] = cooperative_id
    elif current_user.get('user_type') == 'cooperative':
        query["cooperative_id"] = str(current_user["_id"])
    
    if agent_id:
        query["$or"] = [{"agent_id": agent_id}, {"recorded_by": agent_id}]
    elif current_user.get('user_type') in ('field_agent', 'agent_terrain'):
        uid = str(current_user["_id"])
        query["$or"] = [{"agent_id": uid}, {"recorded_by": uid}]
    
    if risk_level:
        query["niveau_risque"] = risk_level
    
    visits = await db.ssrte_visits.find(query).sort("recorded_at", -1).limit(limit).to_list(limit)
    
    return {
        "visits": [{
            "id": str(v["_id"]),
            "nom_membre": v.get("member_name") or v.get("farmer_name"),
            "nom_agent": v.get("agent_name"),
            "date_visite": v.get("recorded_at") or v.get("date_visite") or v.get("visit_date"),
            "taille_menage": v.get("household_size") or v.get("taille_menage", 0),
            "enfants_observes": v.get("children_count") or v.get("enfants_observes_travaillant", 0),
            "enfants_a_risque": v.get("children_at_risk") or v.get("enfants_observes_travaillant", 0),
            "niveau_risque": v.get("niveau_risque") or v.get("risk_level", "faible"),
            "conditions_vie": v.get("living_conditions"),
            "cas_detectes": v.get("has_cases", v.get("enfants_observes_travaillant", 0) > 0),
            "producteur_id": v.get("farmer_id")
        } for v in visits],
        "total": len(visits)
    }


@router.get("/visits/{visit_id}")
async def get_visit_details(visit_id: str, current_user: dict = Depends(get_current_user)):
    """Détails d'une visite"""
    verify_ssrte_access(current_user)
    
    visit = await db.ssrte_visits.find_one({"_id": ObjectId(visit_id)})
    if not visit:
        raise HTTPException(status_code=404, detail="Visite non trouvée")
    
    # Récupérer les cas associés
    cases = await db.ssrte_cases.find({"visit_id": visit_id}).to_list(None)
    
    visit["_id"] = str(visit["_id"])
    visit["cases"] = [{
        "id": str(c["_id"]),
        "child_name": c.get("child_name"),
        "labor_type": c.get("labor_type"),
        "status": c.get("status"),
        "severity_score": c.get("severity_score")
    } for c in cases]
    
    return visit


# ============== CHILD LABOR CASES ==============

@router.post("/cases/create")
async def create_child_labor_case(
    case: ChildLaborCaseCreate,
    current_user: dict = Depends(get_current_user)
):
    """Enregistrer un cas de travail des enfants"""
    verify_ssrte_access(current_user)
    
    # Vérifier la visite
    visit = await db.ssrte_visits.find_one({"_id": ObjectId(case.visit_id)})
    if not visit:
        raise HTTPException(status_code=404, detail="Visite non trouvée")
    
    case_doc = {
        "visit_id": case.visit_id,
        "member_id": case.member_id,
        "member_name": visit.get("member_name"),
        "cooperative_id": visit.get("cooperative_id"),
        "agent_id": str(current_user["_id"]),
        "agent_name": current_user.get("full_name"),
        "child_name": case.child_name,
        "child_age": case.child_age,
        "child_gender": case.child_gender,
        "labor_type": case.labor_type,
        "activities_observed": case.activities_observed,
        "hours_per_day": case.hours_per_day,
        "school_attendance": case.school_attendance,
        "description": case.description,
        "severity_score": case.severity_score,
        "photos": case.photos,
        "status": CaseStatus.IDENTIFIED.value,
        "remediation_plans": [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.ssrte_cases.insert_one(case_doc)
    case_doc["_id"] = result.inserted_id
    
    # Mettre à jour la visite
    await db.ssrte_visits.update_one(
        {"_id": ObjectId(case.visit_id)},
        {"$set": {"has_cases": True}}
    )
    
    # Mettre à jour les stats de l'agent
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"ssrte_stats.cases_identified": 1}}
    )
    
    logger.info(f"[SSRTE] New child labor case created: {case.child_name}, type: {case.labor_type}")
    
    # Envoyer une notification push pour les cas critiques ou dangereux
    if case.severity_score >= 5 or case.labor_type in [ChildLaborType.HAZARDOUS, ChildLaborType.WORST_FORMS]:
        try:
            from services.push_notifications import push_service
            await push_service.send_ssrte_case_alert(case_doc)
            logger.info(f"[SSRTE] Push notification sent for critical case: {case.child_name}")
        except Exception as e:
            logger.error(f"[SSRTE] Failed to send push notification: {e}")
    
    # Envoyer une alerte WebSocket temps réel
    try:
        from services.websocket_manager import send_ssrte_case_alert as ws_send_case_alert
        await ws_send_case_alert(case_doc)
        logger.info(f"[SSRTE] WebSocket alert sent for case: {case.child_name}")
    except Exception as e:
        logger.error(f"[SSRTE] Failed to send WebSocket alert: {e}")
    
    return {
        "message": "Cas enregistré avec succès",
        "case_id": str(result.inserted_id),
        "severity": "critical" if case.severity_score >= 8 else "high" if case.severity_score >= 5 else "medium",
        "notification_sent": case.severity_score >= 5 or case.labor_type in [ChildLaborType.HAZARDOUS, ChildLaborType.WORST_FORMS]
    }


@router.get("/cases")
async def list_cases(
    cooperative_id: Optional[str] = None,
    status: Optional[str] = None,
    labor_type: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Lister les cas de travail des enfants"""
    verify_ssrte_access(current_user)
    
    query = {}
    
    if cooperative_id:
        query["cooperative_id"] = cooperative_id
    elif current_user.get('user_type') == 'cooperative':
        query["cooperative_id"] = str(current_user["_id"])
    elif current_user.get('user_type') in ('field_agent', 'agent_terrain'):
        query["cooperative_id"] = current_user.get('cooperative_id', '')
    
    if status:
        if ',' in status:
            query["status"] = {"$in": [s.strip() for s in status.split(',')]}
        else:
            query["status"] = status
    
    if labor_type:
        query["labor_type"] = labor_type
    
    cases = await db.ssrte_cases.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "cases": [{
            "id": str(c["_id"]),
            "child_name": c.get("child_name"),
            "child_age": c.get("child_age"),
            "member_name": c.get("member_name"),
            "labor_type": c.get("labor_type"),
            "severity_score": c.get("severity_score"),
            "status": c.get("status"),
            "school_attendance": c.get("school_attendance"),
            "created_at": c.get("created_at"),
            "has_remediation": len(c.get("remediation_plans", [])) > 0
        } for c in cases],
        "total": len(cases)
    }


@router.get("/cases/{case_id}")
async def get_case_details(case_id: str, current_user: dict = Depends(get_current_user)):
    """Détails d'un cas"""
    verify_ssrte_access(current_user)
    
    case = await db.ssrte_cases.find_one({"_id": ObjectId(case_id)})
    if not case:
        raise HTTPException(status_code=404, detail="Cas non trouvé")
    
    # Récupérer les plans de remédiation
    remediations = await db.ssrte_remediations.find({"case_id": case_id}).to_list(None)
    
    case["_id"] = str(case["_id"])
    case["remediations"] = [{
        "id": str(r["_id"]),
        "type": r.get("remediation_type"),
        "description": r.get("description"),
        "status": r.get("status"),
        "target_date": r.get("target_date"),
        "completion_date": r.get("completion_date")
    } for r in remediations]
    
    return case


@router.put("/cases/{case_id}/status")
async def update_case_status(
    case_id: str,
    status: CaseStatus,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Mettre à jour le statut d'un cas"""
    verify_ssrte_access(current_user)
    
    update_data = {
        "status": status.value,
        "updated_at": datetime.now(timezone.utc),
        "updated_by": str(current_user["_id"])
    }
    
    if notes:
        update_data["status_notes"] = notes
    
    if status == CaseStatus.RESOLVED:
        update_data["resolved_at"] = datetime.now(timezone.utc)
        update_data["resolved_by"] = str(current_user["_id"])
        
        # Mettre à jour les stats de l'agent qui a identifié le cas
        case = await db.ssrte_cases.find_one({"_id": ObjectId(case_id)})
        if case:
            await db.users.update_one(
                {"_id": ObjectId(case.get("agent_id"))},
                {"$inc": {"ssrte_stats.cases_resolved": 1}}
            )
    
    result = await db.ssrte_cases.update_one(
        {"_id": ObjectId(case_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cas non trouvé")
    
    return {"message": f"Statut mis à jour: {status.value}"}


# ============== REMEDIATION PLANS ==============

@router.post("/remediations/create")
async def create_remediation_plan(
    plan: RemediationPlanCreate,
    current_user: dict = Depends(get_current_user)
):
    """Créer un plan de remédiation"""
    verify_ssrte_access(current_user)
    
    # Vérifier le cas
    case = await db.ssrte_cases.find_one({"_id": ObjectId(plan.case_id)})
    if not case:
        raise HTTPException(status_code=404, detail="Cas non trouvé")
    
    remediation_doc = {
        "case_id": plan.case_id,
        "child_name": case.get("child_name"),
        "member_id": case.get("member_id"),
        "cooperative_id": case.get("cooperative_id"),
        "remediation_type": plan.remediation_type,
        "description": plan.description,
        "target_date": datetime.fromisoformat(plan.target_date),
        "responsible_party": plan.responsible_party,
        "budget_xof": plan.budget_xof,
        "notes": plan.notes,
        "status": "planned",
        "created_by": str(current_user["_id"]),
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.ssrte_remediations.insert_one(remediation_doc)
    
    # Mettre à jour le statut du cas
    await db.ssrte_cases.update_one(
        {"_id": ObjectId(plan.case_id)},
        {
            "$set": {"status": CaseStatus.IN_PROGRESS.value, "updated_at": datetime.now(timezone.utc)},
            "$push": {"remediation_plans": str(result.inserted_id)}
        }
    )
    
    return {
        "message": "Plan de remédiation créé",
        "remediation_id": str(result.inserted_id)
    }


@router.put("/remediations/{remediation_id}")
async def update_remediation(
    remediation_id: str,
    update: RemediationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Mettre à jour un plan de remédiation"""
    verify_ssrte_access(current_user)
    
    update_data = {
        "status": update.status,
        "updated_at": datetime.now(timezone.utc),
        "updated_by": str(current_user["_id"])
    }
    
    if update.completion_date:
        update_data["completion_date"] = datetime.fromisoformat(update.completion_date)
    if update.outcome:
        update_data["outcome"] = update.outcome
    if update.notes:
        update_data["notes"] = update.notes
    
    result = await db.ssrte_remediations.update_one(
        {"_id": ObjectId(remediation_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    
    return {"message": "Plan de remédiation mis à jour"}


@router.get("/remediations")
async def list_remediations(
    case_id: Optional[str] = None,
    cooperative_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Lister les plans de remédiation"""
    verify_ssrte_access(current_user)
    
    query = {}
    
    if case_id:
        query["case_id"] = case_id
    if cooperative_id:
        query["cooperative_id"] = cooperative_id
    elif current_user.get('user_type') == 'cooperative':
        query["cooperative_id"] = str(current_user["_id"])
    elif current_user.get('user_type') in ('field_agent', 'agent_terrain'):
        query["cooperative_id"] = current_user.get('cooperative_id', '')
    if status:
        query["status"] = status
    
    remediations = await db.ssrte_remediations.find(query).sort("target_date", 1).to_list(None)
    
    return {
        "remediations": [{
            "id": str(r["_id"]),
            "case_id": r.get("case_id"),
            "child_name": r.get("child_name"),
            "type": r.get("remediation_type"),
            "description": r.get("description"),
            "status": r.get("status"),
            "target_date": r.get("target_date"),
            "completion_date": r.get("completion_date"),
            "budget_xof": r.get("budget_xof")
        } for r in remediations],
        "total": len(remediations)
    }


# ============== STATISTICS & ANALYTICS ==============

@router.get("/dashboard")
async def get_ssrte_dashboard(
    period: str = "30d",
    current_user: dict = Depends(get_current_user)
):
    """Dashboard SSRTE analytique pour super-admin"""
    if current_user.get('user_type') not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Acces reserve au super-admin")

    # Calculate date filter
    now = datetime.now(timezone.utc)
    period_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365, "all": 3650}
    days = period_map.get(period, 30)
    start_date = now - timedelta(days=days)
    prev_start = start_date - timedelta(days=days)

    date_filter = {"$gte": start_date} if period != "all" else {"$gte": now - timedelta(days=3650)}

    # Aggregate from both ssrte_visits and ici_data_collection
    ssrte_visits = await db.ssrte_visits.find(
        {"$or": [{"visit_date": date_filter}, {"date_visite": date_filter}, {"created_at": date_filter}]}
    ).to_list(None)

    prev_visits = await db.ssrte_visits.find(
        {"$or": [
            {"visit_date": {"$gte": prev_start, "$lt": start_date}},
            {"date_visite": {"$gte": prev_start, "$lt": start_date}},
            {"created_at": {"$gte": prev_start, "$lt": start_date}}
        ]}
    ).to_list(None)

    total_farmers = await db.coop_members.count_documents({})

    # KPI calculations
    total_visits = len(ssrte_visits)
    prev_total = len(prev_visits)
    visits_change = round(((total_visits - prev_total) / max(prev_total, 1)) * 100) if prev_total else 0

    # Children identified
    total_children = sum(v.get("enfants_observes_travaillant", 0) + v.get("children_at_risk", 0) for v in ssrte_visits)
    prev_children = sum(v.get("enfants_observes_travaillant", 0) + v.get("children_at_risk", 0) for v in prev_visits)
    children_change = round(((total_children - prev_children) / max(prev_children, 1)) * 100) if prev_children else 0

    # Unique farmers visited
    farmer_ids = set()
    for v in ssrte_visits:
        fid = v.get("farmer_id") or v.get("member_id")
        if fid:
            farmer_ids.add(str(fid))
    unique_farmers = len(farmer_ids)
    coverage_rate = round((unique_farmers / max(total_farmers, 1)) * 100, 1)

    visits_with_children = sum(1 for v in ssrte_visits if (v.get("enfants_observes_travaillant", 0) + v.get("children_at_risk", 0)) > 0)

    # Risk distribution
    risk_dist = {"critique": 0, "eleve": 0, "modere": 0, "faible": 0}
    for v in ssrte_visits:
        risk = v.get("niveau_risque") or v.get("risk_level", "faible")
        mapping = {"high": "eleve", "critical": "critique", "moderate": "modere", "low": "faible"}
        risk = mapping.get(risk, risk)
        if risk in risk_dist:
            risk_dist[risk] += 1

    # Living conditions analysis
    conditions_dist = {"precaires": 0, "moyennes": 0, "bonnes": 0, "tres_bonnes": 0}
    eau_count = 0
    electricite_count = 0
    total_household_size = 0
    total_children_listed = 0
    total_scolarise = 0
    total_travaille = 0
    distance_values = []

    for v in ssrte_visits:
        cond = v.get("conditions_vie") or v.get("living_conditions")
        if cond:
            mapped = {"good": "bonnes", "average": "moyennes", "poor": "precaires"}.get(cond, cond)
            if mapped in conditions_dist:
                conditions_dist[mapped] += 1
        if v.get("eau_courante") or v.get("has_piped_water"):
            eau_count += 1
        if v.get("electricite") or v.get("has_electricity"):
            electricite_count += 1
        total_household_size += v.get("taille_menage") or v.get("household_size") or 0
        dist = v.get("distance_ecole_km") or v.get("distance_to_school_km")
        if dist and isinstance(dist, (int, float)):
            distance_values.append(dist)
        children_list = v.get("liste_enfants") or v.get("children_details") or []
        for child in children_list:
            total_children_listed += 1
            if child.get("scolarise") or child.get("in_school"):
                total_scolarise += 1
            if child.get("travaille_exploitation") or child.get("works_on_farm"):
                total_travaille += 1

    avg_household = round(total_household_size / max(total_visits, 1), 1)
    avg_distance = round(sum(distance_values) / max(len(distance_values), 1), 1) if distance_values else 0
    scolarisation_rate = round((total_scolarise / max(total_children_listed, 1)) * 100, 1)

    # Trends by date
    from collections import defaultdict
    trend_data = defaultdict(lambda: {"visits": 0, "children": 0, "critical": 0})
    for v in ssrte_visits:
        dt = v.get("date_visite") or v.get("visit_date") or v.get("created_at")
        if dt:
            if isinstance(dt, str):
                try:
                    dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
                except Exception:
                    continue
            key = dt.strftime("%Y-%m-%d")
            trend_data[key]["visits"] += 1
            trend_data[key]["children"] += v.get("enfants_observes_travaillant", 0) + v.get("children_at_risk", 0)
            risk = v.get("niveau_risque") or v.get("risk_level", "")
            if risk in ("critique", "eleve", "high", "critical"):
                trend_data[key]["critical"] += 1
    trends = [{"date": k, **v} for k, v in sorted(trend_data.items())]

    # Dangerous tasks frequency
    task_freq = defaultdict(int)
    for v in ssrte_visits:
        for t in (v.get("taches_dangereuses_observees") or v.get("activities_observed") or []):
            task_freq[t] += 1
    dangerous_tasks = [{"code": k, "count": v} for k, v in sorted(task_freq.items(), key=lambda x: -x[1])][:10]

    # Support provided frequency
    support_freq = defaultdict(int)
    for v in ssrte_visits:
        for s in (v.get("support_fourni") or []):
            support_freq[s] += 1
    support_provided = [{"type": k, "count": v} for k, v in sorted(support_freq.items(), key=lambda x: -x[1])][:10]

    # Recent critical visits
    critical_visits = [v for v in ssrte_visits if (v.get("niveau_risque") or v.get("risk_level", "")) in ("critique", "eleve", "high", "critical")]
    critical_visits.sort(key=lambda v: v.get("date_visite") or v.get("visit_date") or v.get("created_at") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    recent_critical = []
    for v in critical_visits[:10]:
        recent_critical.append({
            "farmer_name": v.get("farmer_name") or v.get("member_name") or "Producteur",
            "children_count": v.get("enfants_observes_travaillant", 0) + v.get("children_at_risk", 0),
            "dangerous_tasks": v.get("taches_dangereuses_observees") or v.get("activities_observed") or [],
            "risk_level": v.get("niveau_risque") or v.get("risk_level", "eleve"),
            "date": str(v.get("date_visite") or v.get("visit_date") or v.get("created_at") or "")
        })

    return {
        "kpis": {
            "total_visits": total_visits,
            "visits_change_percent": visits_change,
            "unique_farmers_visited": unique_farmers,
            "total_farmers": total_farmers,
            "coverage_rate": coverage_rate,
            "total_children_identified": total_children,
            "children_change_percent": children_change,
            "visits_with_children_percent": round((visits_with_children / max(total_visits, 1)) * 100, 1)
        },
        "risk_distribution": risk_dist,
        "living_conditions": {
            "conditions_distribution": conditions_dist,
            "eau_courante_percent": round((eau_count / max(total_visits, 1)) * 100, 1),
            "electricite_percent": round((electricite_count / max(total_visits, 1)) * 100, 1),
            "avg_household_size": avg_household,
            "avg_distance_ecole_km": avg_distance,
            "scolarisation_rate": scolarisation_rate,
            "total_children_registered": total_children_listed,
            "children_scolarise": total_scolarise,
            "children_travaillant": total_travaille
        },
        "trends": trends[-30:],
        "dangerous_tasks": dangerous_tasks,
        "support_provided": support_provided,
        "recent_critical_visits": recent_critical
    }


@router.get("/leaderboard")
async def get_ssrte_leaderboard(
    period: str = "30d",
    current_user: dict = Depends(get_current_user)
):
    """Leaderboard SSRTE agents et cooperatives"""
    if current_user.get('user_type') not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Acces reserve au super-admin")

    now = datetime.now(timezone.utc)
    period_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365, "all": 3650}
    days = period_map.get(period, 30)
    start_date = now - timedelta(days=days)
    date_filter = {"$gte": start_date}

    visits = await db.ssrte_visits.find(
        {"$or": [{"visit_date": date_filter}, {"date_visite": date_filter}, {"created_at": date_filter}]}
    ).to_list(None)

    # Agent leaderboard
    from collections import defaultdict
    agent_stats = defaultdict(lambda: {"visits": 0, "children_identified": 0, "agent_name": ""})
    coop_stats = defaultdict(lambda: {"visits": 0, "farmers_visited": set(), "cooperative_name": ""})

    for v in visits:
        agent_id = v.get("agent_id")
        agent_name = v.get("agent_name") or "Agent"
        if agent_id:
            agent_stats[agent_id]["visits"] += 1
            agent_stats[agent_id]["children_identified"] += v.get("enfants_observes_travaillant", 0) + v.get("children_at_risk", 0)
            agent_stats[agent_id]["agent_name"] = agent_name

        coop_id = v.get("cooperative_id") or v.get("coop_id")
        if coop_id:
            coop_stats[coop_id]["visits"] += 1
            farmer_id = v.get("farmer_id") or v.get("member_id")
            if farmer_id:
                coop_stats[coop_id]["farmers_visited"].add(str(farmer_id))

    # Get cooperative names
    coop_ids_to_lookup = list(coop_stats.keys())
    for cid in coop_ids_to_lookup:
        try:
            coop = await db.users.find_one({"_id": ObjectId(cid)})
            if coop:
                coop_stats[cid]["cooperative_name"] = coop.get("full_name") or coop.get("coop_name") or "Cooperative"
        except Exception:
            coop_stats[cid]["cooperative_name"] = "Cooperative"

    top_agents = sorted(
        [{"agent_id": k, **{kk: vv for kk, vv in v.items()}} for k, v in agent_stats.items()],
        key=lambda x: -x["visits"]
    )[:10]

    top_cooperatives = sorted(
        [{"cooperative_id": k, "visits": v["visits"], "farmers_visited": len(v["farmers_visited"]), "cooperative_name": v["cooperative_name"]} for k, v in coop_stats.items()],
        key=lambda x: -x["visits"]
    )[:10]

    return {
        "top_agents": top_agents,
        "top_cooperatives": top_cooperatives
    }


@router.get("/stats/overview")
async def get_ssrte_overview(
    cooperative_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Statistiques SSRTE globales"""
    verify_ssrte_access(current_user)
    
    query = {}
    if cooperative_id:
        query["cooperative_id"] = cooperative_id
    elif current_user.get('user_type') == 'cooperative':
        query["cooperative_id"] = str(current_user["_id"])
    elif current_user.get('user_type') in ('field_agent', 'agent_terrain'):
        # Pour les agents terrain, filtrer par recorded_by (leur propre user_id)
        query["recorded_by"] = str(current_user["_id"])
    
    # Statistiques des visites (champs en francais)
    total_visits = await db.ssrte_visits.count_documents(query)
    high_risk_visits = await db.ssrte_visits.count_documents({
        **query, "niveau_risque": {"$in": ["critique", "eleve"]}
    })
    
    # Statistiques des cas
    case_query = {}
    if "cooperative_id" in query:
        case_query["cooperative_id"] = query["cooperative_id"]
    elif "recorded_by" in query:
        case_query["$or"] = [
            {"recorded_by": query["recorded_by"]},
            {"agent_id": query["recorded_by"]}
        ]
    total_cases = await db.ssrte_cases.count_documents(case_query)
    cases_identified = await db.ssrte_cases.count_documents({**case_query, "status": "identified"})
    cases_in_progress = await db.ssrte_cases.count_documents({**case_query, "status": "in_progress"})
    cases_resolved = await db.ssrte_cases.count_documents({**case_query, "status": "resolved"})
    
    # Si pas de cas dans ssrte_cases, calculer depuis ssrte_visits directement
    if total_cases == 0 and total_visits > 0:
        total_cases = await db.ssrte_visits.count_documents({
            **query, "enfants_observes_travaillant": {"$gt": 0}
        })
        cases_identified = total_cases
        cases_resolved = 0
        cases_in_progress = 0
    
    # Par type de travail
    hazardous_cases = await db.ssrte_cases.count_documents({**case_query, "labor_type": "hazardous"})
    if hazardous_cases == 0 and total_visits > 0:
        hazardous_cases = await db.ssrte_visits.count_documents({
            **query, "taches_dangereuses_count": {"$gt": 0}
        })
    worst_forms_cases = await db.ssrte_cases.count_documents({**case_query, "labor_type": "worst_forms"})
    
    # Statistiques des remediations
    rem_query = case_query.copy() if case_query else query.copy()
    total_remediations = await db.ssrte_remediations.count_documents(rem_query)
    completed_remediations = await db.ssrte_remediations.count_documents({**rem_query, "status": "completed"})
    
    # Calcul des taux
    prevalence_rate = (total_cases / total_visits * 100) if total_visits > 0 else 0
    resolution_rate = (cases_resolved / total_cases * 100) if total_cases > 0 else 0
    
    # Visites ce mois (utiliser recorded_at, pas visit_date)
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_visits = await db.ssrte_visits.count_documents({
        **query,
        "recorded_at": {"$gte": month_start}
    })
    
    return {
        "visits": {
            "total": total_visits,
            "high_risk": high_risk_visits,
            "monthly": monthly_visits,
            "risk_rate": round((high_risk_visits / total_visits * 100) if total_visits > 0 else 0, 1)
        },
        "cases": {
            "total": total_cases,
            "identified": cases_identified,
            "in_progress": cases_in_progress,
            "resolved": cases_resolved,
            "hazardous": hazardous_cases,
            "worst_forms": worst_forms_cases
        },
        "remediations": {
            "total": total_remediations,
            "completed": completed_remediations,
            "completion_rate": round((completed_remediations / total_remediations * 100) if total_remediations > 0 else 0, 1)
        },
        "rates": {
            "prevalence": round(prevalence_rate, 2),
            "resolution": round(resolution_rate, 1)
        }
    }


@router.get("/stats/by-zone")
async def get_stats_by_zone(
    cooperative_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Statistiques par zone géographique"""
    verify_ssrte_access(current_user)
    
    # Aggregation pipeline pour grouper par zone
    pipeline = [
        {"$lookup": {
            "from": "coop_members",
            "localField": "member_id",
            "foreignField": "_id",
            "as": "member"
        }},
        {"$unwind": {"path": "$member", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": "$member.department",
            "total_visits": {"$sum": 1},
            "high_risk_visits": {"$sum": {"$cond": [{"$eq": ["$risk_level", "high"]}, 1, 0]}},
            "children_at_risk": {"$sum": "$children_at_risk"}
        }},
        {"$sort": {"children_at_risk": -1}}
    ]
    
    results = await db.ssrte_visits.aggregate(pipeline).to_list(None)
    
    return {
        "zones": [{
            "department": r.get("_id") or "Non spécifié",
            "total_visits": r.get("total_visits", 0),
            "high_risk_visits": r.get("high_risk_visits", 0),
            "children_at_risk": r.get("children_at_risk", 0),
            "risk_rate": round((r.get("high_risk_visits", 0) / r.get("total_visits", 1)) * 100, 1)
        } for r in results]
    }


# ============== REPORTS ==============

@router.get("/reports/pdf/{cooperative_id}")
async def generate_ssrte_report_pdf(
    cooperative_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Générer un rapport SSRTE PDF"""
    from fastapi.responses import Response
    from services.pdf_service import pdf_generator
    
    verify_ssrte_access(current_user)
    
    # Récupérer les données
    coop = await db.users.find_one({"_id": ObjectId(cooperative_id)})
    if not coop:
        raise HTTPException(status_code=404, detail="Coopérative non trouvée")
    
    stats = await get_ssrte_overview(cooperative_id, current_user)
    cases = await db.ssrte_cases.find({"cooperative_id": cooperative_id}).to_list(None)
    
    report_data = {
        "cooperative_name": coop.get("full_name") or coop.get("coop_name"),
        "report_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
        "stats": stats,
        "cases_count": len(cases),
        "cases": cases[:20]  # Top 20 cas
    }
    
    pdf_bytes = pdf_generator.generate_ssrte_report(report_data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=rapport_ssrte_{cooperative_id}.pdf"
        }
    )


@router.get("/reports/csv/{cooperative_id}")
async def export_ssrte_csv(
    cooperative_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Exporter les données SSRTE en CSV"""
    from fastapi.responses import Response
    import csv
    import io
    
    verify_ssrte_access(current_user)
    
    cases = await db.ssrte_cases.find({"cooperative_id": cooperative_id}).to_list(None)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "ID", "Enfant", "Age", "Genre", "Membre", "Type de travail",
        "Score gravité", "Scolarisation", "Statut", "Date création"
    ])
    
    # Data
    for case in cases:
        writer.writerow([
            str(case["_id"]),
            case.get("child_name"),
            case.get("child_age"),
            case.get("child_gender"),
            case.get("member_name"),
            case.get("labor_type"),
            case.get("severity_score"),
            case.get("school_attendance"),
            case.get("status"),
            case.get("created_at").strftime("%Y-%m-%d") if case.get("created_at") else ""
        ])
    
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content.encode('utf-8'),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=ssrte_cases_{cooperative_id}.csv"
        }
    )
