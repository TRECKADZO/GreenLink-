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
    
    visit_doc = {
        "agent_id": str(current_user["_id"]),
        "agent_name": current_user.get("full_name"),
        "member_id": visit.member_id,
        "member_name": member.get("full_name"),
        "cooperative_id": member.get("coop_id"),
        "visit_date": datetime.fromisoformat(visit.visit_date) if visit.visit_date else datetime.now(timezone.utc),
        "household_size": visit.household_size,
        "children_count": visit.children_count,
        "children_details": visit.children_details,
        "children_at_risk": children_at_risk,
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
        "risk_level": "high" if children_at_risk > 0 else "low",
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.ssrte_visits.insert_one(visit_doc)
    
    # Mettre à jour les stats de l'agent
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"ssrte_stats.visits_completed": 1}}
    )
    
    return {
        "message": "Visite enregistrée avec succès",
        "visit_id": str(result.inserted_id),
        "children_at_risk": children_at_risk,
        "risk_level": "high" if children_at_risk > 0 else "low"
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
        query["agent_id"] = agent_id
    elif current_user.get('user_type') == 'field_agent':
        query["agent_id"] = str(current_user["_id"])
    
    if risk_level:
        query["risk_level"] = risk_level
    
    visits = await db.ssrte_visits.find(query).sort("visit_date", -1).limit(limit).to_list(limit)
    
    return {
        "visits": [{
            "id": str(v["_id"]),
            "member_name": v.get("member_name"),
            "agent_name": v.get("agent_name"),
            "visit_date": v.get("visit_date"),
            "household_size": v.get("household_size"),
            "children_count": v.get("children_count"),
            "children_at_risk": v.get("children_at_risk", 0),
            "risk_level": v.get("risk_level"),
            "living_conditions": v.get("living_conditions"),
            "has_cases": v.get("has_cases", False)
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
    
    return {
        "message": "Cas enregistré avec succès",
        "case_id": str(result.inserted_id),
        "severity": "critical" if case.severity_score >= 8 else "high" if case.severity_score >= 5 else "medium"
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
    
    if status:
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
    
    # Statistiques des visites
    total_visits = await db.ssrte_visits.count_documents(query)
    high_risk_visits = await db.ssrte_visits.count_documents({**query, "risk_level": "high"})
    
    # Statistiques des cas
    case_query = query.copy()
    total_cases = await db.ssrte_cases.count_documents(case_query)
    cases_identified = await db.ssrte_cases.count_documents({**case_query, "status": "identified"})
    cases_in_progress = await db.ssrte_cases.count_documents({**case_query, "status": "in_progress"})
    cases_resolved = await db.ssrte_cases.count_documents({**case_query, "status": "resolved"})
    
    # Par type de travail
    hazardous_cases = await db.ssrte_cases.count_documents({**case_query, "labor_type": "hazardous"})
    worst_forms_cases = await db.ssrte_cases.count_documents({**case_query, "labor_type": "worst_forms"})
    
    # Statistiques des remédiations
    total_remediations = await db.ssrte_remediations.count_documents(query)
    completed_remediations = await db.ssrte_remediations.count_documents({**query, "status": "completed"})
    
    # Calcul du taux de prévalence
    prevalence_rate = (total_cases / total_visits * 100) if total_visits > 0 else 0
    resolution_rate = (cases_resolved / total_cases * 100) if total_cases > 0 else 0
    
    # Visites ce mois
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_visits = await db.ssrte_visits.count_documents({
        **query,
        "visit_date": {"$gte": month_start}
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
