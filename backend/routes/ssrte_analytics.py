# Historique et Statistiques des Visites SSRTE
# Dashboard analytique pour le suivi du travail des enfants

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ssrte", tags=["SSRTE Analytics"])


async def get_admin_or_coop_user(current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') not in ['admin', 'super_admin', 'cooperative', 'field_agent', 'agent_terrain']:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs, coopératives ou agents terrain")
    return current_user


# Dashboard endpoint moved to ssrte.py (admin-only with enriched living_conditions data)
# Kept for backward compatibility with cooperative-level access
@router.get("/dashboard/cooperative")
async def get_ssrte_dashboard_coop(
    period: str = Query(default="30d", description="Période: 7d, 30d, 90d, 1y, all"),
    cooperative_id: Optional[str] = None,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """
    Dashboard principal des statistiques SSRTE
    
    Retourne les KPIs, tendances et répartitions
    """
    user_type = current_user.get('user_type')
    
    # Déterminer la coopérative
    if user_type == 'cooperative':
        coop_id = str(current_user.get('_id'))
    elif cooperative_id:
        coop_id = cooperative_id
    else:
        coop_id = None
    
    # Calculer la date de début selon la période
    now = datetime.utcnow()
    if period == "7d":
        start_date = now - timedelta(days=7)
    elif period == "30d":
        start_date = now - timedelta(days=30)
    elif period == "90d":
        start_date = now - timedelta(days=90)
    elif period == "1y":
        start_date = now - timedelta(days=365)
    else:
        start_date = datetime(2020, 1, 1)
    
    # Query de base
    base_query = {"date_visite": {"$gte": start_date}}
    if coop_id:
        base_query["cooperative_id"] = coop_id
    
    # === KPIs PRINCIPAUX ===
    
    # Total des visites
    total_visits = await db.ssrte_visits.count_documents(base_query)
    
    # Visites par niveau de risque
    risk_pipeline = [
        {"$match": base_query},
        {"$group": {
            "_id": "$niveau_risque",
            "count": {"$sum": 1}
        }}
    ]
    risk_distribution = await db.ssrte_visits.aggregate(risk_pipeline).to_list(10)
    risk_counts = {r["_id"]: r["count"] for r in risk_distribution}
    
    # Enfants identifiés en travail
    children_pipeline = [
        {"$match": base_query},
        {"$group": {
            "_id": None,
            "total_enfants": {"$sum": "$enfants_observes_travaillant"},
            "visits_with_children": {"$sum": {"$cond": [{"$gt": ["$enfants_observes_travaillant", 0]}, 1, 0]}}
        }}
    ]
    children_stats = await db.ssrte_visits.aggregate(children_pipeline).to_list(1)
    enfants_total = children_stats[0]["total_enfants"] if children_stats else 0
    visits_with_children = children_stats[0]["visits_with_children"] if children_stats else 0
    
    # Tâches dangereuses les plus fréquentes
    tasks_pipeline = [
        {"$match": base_query},
        {"$unwind": "$taches_dangereuses_observees"},
        {"$group": {
            "_id": "$taches_dangereuses_observees",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 8}
    ]
    dangerous_tasks = await db.ssrte_visits.aggregate(tasks_pipeline).to_list(8)
    
    # Support fourni
    support_pipeline = [
        {"$match": base_query},
        {"$unwind": "$support_fourni"},
        {"$group": {
            "_id": "$support_fourni",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 8}
    ]
    support_stats = await db.ssrte_visits.aggregate(support_pipeline).to_list(8)
    
    # === TENDANCES ===
    
    # Visites par jour/semaine
    if period in ["7d", "30d"]:
        date_format = "%Y-%m-%d"
        group_by = {"$dateToString": {"format": date_format, "date": "$date_visite"}}
    else:
        date_format = "%Y-%W"
        group_by = {"$dateToString": {"format": "%Y-W%V", "date": "$date_visite"}}
    
    trend_pipeline = [
        {"$match": base_query},
        {"$group": {
            "_id": group_by,
            "visits": {"$sum": 1},
            "enfants": {"$sum": "$enfants_observes_travaillant"},
            "critical": {"$sum": {"$cond": [{"$eq": ["$niveau_risque", "critique"]}, 1, 0]}},
            "high": {"$sum": {"$cond": [{"$eq": ["$niveau_risque", "eleve"]}, 1, 0]}}
        }},
        {"$sort": {"_id": 1}}
    ]
    trends = await db.ssrte_visits.aggregate(trend_pipeline).to_list(100)
    
    # === PRODUCTEURS COUVERTS ===
    
    # Producteurs uniques visités
    unique_farmers_pipeline = [
        {"$match": base_query},
        {"$group": {"_id": "$farmer_id"}},
        {"$count": "total"}
    ]
    unique_farmers_result = await db.ssrte_visits.aggregate(unique_farmers_pipeline).to_list(1)
    unique_farmers = unique_farmers_result[0]["total"] if unique_farmers_result else 0
    
    # Total producteurs (pour calculer le taux de couverture)
    total_farmers_query = {"user_type": {"$in": ["farmer", "producteur"]}}
    if coop_id:
        total_farmers_query["cooperative_id"] = ObjectId(coop_id)
    total_farmers = await db.users.count_documents(total_farmers_query)
    
    # Taux de couverture
    coverage_rate = round((unique_farmers / total_farmers * 100), 1) if total_farmers > 0 else 0
    
    # === ALERTES RÉCENTES ===
    
    recent_alerts_pipeline = [
        {"$match": {**base_query, "niveau_risque": {"$in": ["critique", "eleve"]}}},
        {"$sort": {"date_visite": -1}},
        {"$limit": 5},
        {"$project": {
            "farmer_id": 1,
            "farmer_name": 1,
            "niveau_risque": 1,
            "enfants_observes_travaillant": 1,
            "date_visite": 1,
            "taches_dangereuses_observees": 1
        }}
    ]
    recent_alerts = await db.ssrte_visits.aggregate(recent_alerts_pipeline).to_list(5)
    
    # === COMPARAISON PÉRIODE PRÉCÉDENTE ===
    
    prev_start = start_date - (now - start_date)
    prev_query = {
        "date_visite": {"$gte": prev_start, "$lt": start_date}
    }
    if coop_id:
        prev_query["cooperative_id"] = coop_id
    
    prev_visits = await db.ssrte_visits.count_documents(prev_query)
    visits_change = round(((total_visits - prev_visits) / prev_visits * 100), 1) if prev_visits > 0 else 0
    
    prev_children_pipeline = [
        {"$match": prev_query},
        {"$group": {"_id": None, "total": {"$sum": "$enfants_observes_travaillant"}}}
    ]
    prev_children_result = await db.ssrte_visits.aggregate(prev_children_pipeline).to_list(1)
    prev_enfants = prev_children_result[0]["total"] if prev_children_result else 0
    enfants_change = round(((enfants_total - prev_enfants) / prev_enfants * 100), 1) if prev_enfants > 0 else 0
    
    return {
        "period": period,
        "cooperative_id": coop_id,
        "generated_at": datetime.utcnow().isoformat(),
        
        "kpis": {
            "total_visits": total_visits,
            "visits_change_percent": visits_change,
            "unique_farmers_visited": unique_farmers,
            "total_farmers": total_farmers,
            "coverage_rate": coverage_rate,
            "total_children_identified": enfants_total,
            "children_change_percent": enfants_change,
            "visits_with_children": visits_with_children,
            "visits_with_children_percent": round((visits_with_children / total_visits * 100), 1) if total_visits > 0 else 0
        },
        
        "risk_distribution": {
            "critique": risk_counts.get("critique", 0),
            "eleve": risk_counts.get("eleve", 0),
            "modere": risk_counts.get("modere", 0),
            "faible": risk_counts.get("faible", 0)
        },
        
        "dangerous_tasks": [
            {"code": t["_id"], "count": t["count"]} 
            for t in dangerous_tasks
        ],
        
        "support_provided": [
            {"type": s["_id"], "count": s["count"]}
            for s in support_stats
        ],
        
        "trends": [
            {
                "date": t["_id"],
                "visits": t["visits"],
                "children": t["enfants"],
                "critical": t["critical"],
                "high": t["high"]
            }
            for t in trends
        ],
        
        "recent_critical_visits": [
            {
                "farmer_id": str(a.get("farmer_id", "")),
                "farmer_name": a.get("farmer_name"),
                "risk_level": a.get("niveau_risque"),
                "children_count": a.get("enfants_observes_travaillant", 0),
                "date": a.get("date_visite").isoformat() if a.get("date_visite") else None,
                "dangerous_tasks": a.get("taches_dangereuses_observees", [])
            }
            for a in recent_alerts
        ]
    }


@router.get("/visits")
async def get_ssrte_visits(
    skip: int = 0,
    limit: int = 50,
    risk_level: Optional[str] = None,
    farmer_id: Optional[str] = None,
    cooperative_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    has_children: Optional[bool] = None,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """
    Historique des visites SSRTE avec filtres
    """
    user_type = current_user.get('user_type')
    
    # Query de base
    query = {}
    
    # Filtre coopérative / agent
    if user_type == 'cooperative':
        query["cooperative_id"] = str(current_user.get('_id'))
    elif user_type in ('field_agent', 'agent_terrain'):
        # Pour les agents, filtrer par recorded_by ou agent_id
        uid = str(current_user["_id"])
        query["$or"] = [{"recorded_by": uid}, {"agent_id": uid}]
    elif cooperative_id:
        query["cooperative_id"] = cooperative_id
    
    # Filtres optionnels
    if risk_level:
        query["niveau_risque"] = risk_level
    
    if farmer_id:
        query["farmer_id"] = farmer_id
    
    if start_date:
        query["date_visite"] = {"$gte": datetime.fromisoformat(start_date)}
    
    if end_date:
        if "date_visite" in query:
            query["date_visite"]["$lte"] = datetime.fromisoformat(end_date)
        else:
            query["date_visite"] = {"$lte": datetime.fromisoformat(end_date)}
    
    if has_children is True:
        query["enfants_observes_travaillant"] = {"$gt": 0}
    elif has_children is False:
        query["enfants_observes_travaillant"] = 0
    
    # Exécuter la requête
    total = await db.ssrte_visits.count_documents(query)
    visits = await db.ssrte_visits.find(query).sort("recorded_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "visits": [
            {
                "id": str(v.get("_id")),
                "farmer_id": v.get("farmer_id"),
                "farmer_name": v.get("farmer_name"),
                "member_name": v.get("member_name") or v.get("farmer_name"),
                "cooperative_id": v.get("cooperative_id"),
                "date_visite": v.get("date_visite").isoformat() if v.get("date_visite") else (v.get("recorded_at").isoformat() if v.get("recorded_at") else None),
                "visit_date": v.get("recorded_at") or v.get("date_visite") or v.get("visit_date"),
                "agent_name": v.get("agent_name"),
                "niveau_risque": v.get("niveau_risque"),
                "risk_level": v.get("niveau_risque") or v.get("risk_level", "faible"),
                "enfants_observes_travaillant": v.get("enfants_observes_travaillant", 0),
                "children_count": v.get("children_count") or v.get("enfants_observes_travaillant", 0),
                "children_at_risk": v.get("children_at_risk") or v.get("enfants_observes_travaillant", 0),
                "household_size": v.get("household_size") or v.get("taille_menage", 0),
                "taches_dangereuses_observees": v.get("taches_dangereuses_observees", []),
                "support_fourni": v.get("support_fourni", []),
                "recommandations": v.get("recommandations", []),
                "visite_suivi_requise": v.get("visite_suivi_requise", False),
                "has_cases": v.get("has_cases", v.get("enfants_observes_travaillant", 0) > 0),
                "notes": v.get("notes"),
                "photos": v.get("photos", [])
            }
            for v in visits
        ]
    }


@router.get("/visit/{visit_id}")
async def get_visit_detail(
    visit_id: str,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Détail d'une visite SSRTE"""
    visit = await db.ssrte_visits.find_one({"_id": ObjectId(visit_id)})
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visite non trouvée")
    
    # Récupérer les infos du producteur
    farmer = None
    if visit.get("farmer_id"):
        farmer = await db.users.find_one({"_id": ObjectId(visit["farmer_id"])})
        if not farmer:
            farmer = await db.coop_members.find_one({"_id": ObjectId(visit["farmer_id"])})
    
    return {
        "visit": {
            "id": str(visit["_id"]),
            "farmer_id": visit.get("farmer_id"),
            "farmer_name": visit.get("farmer_name"),
            "date_visite": visit.get("date_visite").isoformat() if visit.get("date_visite") else None,
            "agent_id": visit.get("agent_id"),
            "agent_name": visit.get("agent_name"),
            "niveau_risque": visit.get("niveau_risque"),
            "enfants_observes_travaillant": visit.get("enfants_observes_travaillant", 0),
            "taches_dangereuses_observees": visit.get("taches_dangereuses_observees", []),
            "support_fourni": visit.get("support_fourni", []),
            "recommandations": visit.get("recommandations", []),
            "visite_suivi_requise": visit.get("visite_suivi_requise", False),
            "notes": visit.get("notes"),
            "photos": visit.get("photos", []),
            "location": visit.get("location"),
            "created_at": visit.get("created_at").isoformat() if visit.get("created_at") else None
        },
        "farmer": {
            "id": str(farmer["_id"]) if farmer else None,
            "full_name": farmer.get("full_name") or farmer.get("name") if farmer else None,
            "phone_number": farmer.get("phone_number") if farmer else None,
            "village": farmer.get("village") if farmer else None,
            "photo_url": farmer.get("photo_url") if farmer else None
        } if farmer else None
    }


@router.get("/farmer/{farmer_id}/history")
async def get_farmer_visit_history(
    farmer_id: str,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Historique des visites d'un producteur spécifique"""
    
    visits = await db.ssrte_visits.find({"farmer_id": farmer_id}).sort("date_visite", -1).to_list(100)
    
    if not visits:
        return {
            "farmer_id": farmer_id,
            "total_visits": 0,
            "visits": [],
            "summary": None
        }
    
    # Calculer le résumé
    total_children = sum(v.get("enfants_observes_travaillant", 0) for v in visits)
    risk_levels = [v.get("niveau_risque") for v in visits]
    critical_visits = risk_levels.count("critique")
    high_visits = risk_levels.count("eleve")
    
    all_tasks = []
    for v in visits:
        all_tasks.extend(v.get("taches_dangereuses_observees", []))
    
    all_support = []
    for v in visits:
        all_support.extend(v.get("support_fourni", []))
    
    return {
        "farmer_id": farmer_id,
        "total_visits": len(visits),
        "summary": {
            "total_children_identified": total_children,
            "critical_visits": critical_visits,
            "high_risk_visits": high_visits,
            "last_visit_date": visits[0].get("date_visite").isoformat() if visits[0].get("date_visite") else None,
            "first_visit_date": visits[-1].get("date_visite").isoformat() if visits[-1].get("date_visite") else None,
            "most_common_tasks": list(set(all_tasks))[:5],
            "support_provided": list(set(all_support))
        },
        "visits": [
            {
                "id": str(v["_id"]),
                "date": v.get("date_visite").isoformat() if v.get("date_visite") else None,
                "risk_level": v.get("niveau_risque"),
                "children_count": v.get("enfants_observes_travaillant", 0),
                "tasks_count": len(v.get("taches_dangereuses_observees", [])),
                "support_count": len(v.get("support_fourni", [])),
                "follow_up_required": v.get("visite_suivi_requise", False)
            }
            for v in visits
        ]
    }


# Leaderboard endpoint moved to ssrte.py (admin-only)
@router.get("/leaderboard/cooperative")
async def get_ssrte_leaderboard_coop(
    period: str = "30d",
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Classement des agents/coopératives par nombre de visites"""
    
    now = datetime.utcnow()
    if period == "7d":
        start_date = now - timedelta(days=7)
    elif period == "30d":
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=90)
    
    # Par agent
    agent_pipeline = [
        {"$match": {"date_visite": {"$gte": start_date}}},
        {"$group": {
            "_id": "$agent_id",
            "agent_name": {"$first": "$agent_name"},
            "visits": {"$sum": 1},
            "children_identified": {"$sum": "$enfants_observes_travaillant"},
            "critical_visits": {"$sum": {"$cond": [{"$eq": ["$niveau_risque", "critique"]}, 1, 0]}}
        }},
        {"$sort": {"visits": -1}},
        {"$limit": 10}
    ]
    agents = await db.ssrte_visits.aggregate(agent_pipeline).to_list(10)
    
    # Par coopérative
    coop_pipeline = [
        {"$match": {"date_visite": {"$gte": start_date}}},
        {"$group": {
            "_id": "$cooperative_id",
            "visits": {"$sum": 1},
            "children_identified": {"$sum": "$enfants_observes_travaillant"},
            "unique_farmers": {"$addToSet": "$farmer_id"}
        }},
        {"$project": {
            "visits": 1,
            "children_identified": 1,
            "farmers_visited": {"$size": "$unique_farmers"}
        }},
        {"$sort": {"visits": -1}},
        {"$limit": 10}
    ]
    coops = await db.ssrte_visits.aggregate(coop_pipeline).to_list(10)
    
    # Enrichir avec les noms des coopératives
    coop_results = []
    for c in coops:
        coop_info = await db.users.find_one({"_id": ObjectId(c["_id"])}) if c["_id"] else None
        coop_results.append({
            "cooperative_id": c["_id"],
            "cooperative_name": coop_info.get("cooperative_name") or coop_info.get("full_name") if coop_info else "Inconnu",
            "visits": c["visits"],
            "children_identified": c["children_identified"],
            "farmers_visited": c["farmers_visited"]
        })
    
    return {
        "period": period,
        "top_agents": [
            {
                "agent_id": a["_id"],
                "agent_name": a.get("agent_name", "Agent"),
                "visits": a["visits"],
                "children_identified": a["children_identified"],
                "critical_visits": a["critical_visits"]
            }
            for a in agents
        ],
        "top_cooperatives": coop_results
    }
