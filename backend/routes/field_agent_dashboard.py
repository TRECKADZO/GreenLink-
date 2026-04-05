# Dashboard spécifique pour les agents terrain
# Statistiques, classement et suivi des performances
# Supporte les agents avec double casquette (SSRTE + Carbon)

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/field-agent", tags=["Field Agent Dashboard"])


def verify_field_agent(user: dict):
    """Vérifie que l'utilisateur est un agent terrain ou a le rôle approprié"""
    user_type = user.get('user_type')
    roles = user.get('roles', [])
    
    # Accepter si user_type est agent ou si l'utilisateur a le rôle field_agent/ssrte_agent
    valid_types = ['field_agent', 'cooperative', 'admin', 'carbon_auditor']
    valid_roles = ['field_agent', 'ssrte_agent', 'carbon_auditor']
    
    has_valid_type = user_type in valid_types
    has_valid_role = any(role in roles for role in valid_roles)
    
    if not has_valid_type and not has_valid_role:
        raise HTTPException(status_code=403, detail="Accès réservé aux agents terrain")


@router.get("/dashboard")
async def get_agent_dashboard(
    current_user: dict = Depends(get_current_user)
):
    """
    Tableau de bord principal de l'agent terrain avec statistiques personnelles
    """
    verify_field_agent(current_user)
    
    user_id = str(current_user.get('_id'))
    user_type = current_user.get('user_type')
    
    # Si c'est une coopérative ou admin, on récupère les stats globales
    if user_type in ['cooperative', 'admin']:
        return await get_coop_agents_overview(current_user)
    
    # Agent terrain - ses propres statistiques
    coop_id = current_user.get('cooperative_id')
    
    # Récupérer les visites SSRTE de l'agent
    ssrte_visits = await db.ssrte_visits.find({
        "$or": [
            {"agent_id": user_id},
            {"recorded_by": user_id}
        ]
    }).to_list(500)
    
    # Statistiques des visites
    total_visits = len(ssrte_visits)
    visits_this_month = len([v for v in ssrte_visits if v.get('recorded_at', datetime.min) > datetime.utcnow() - timedelta(days=30)])
    visits_this_week = len([v for v in ssrte_visits if v.get('recorded_at', datetime.min) > datetime.utcnow() - timedelta(days=7)])
    
    # Répartition par niveau de risque
    risk_distribution = {
        "critique": 0,
        "eleve": 0,
        "modere": 0,
        "faible": 0
    }
    for v in ssrte_visits:
        risk = v.get('niveau_risque', 'faible')
        if risk in risk_distribution:
            risk_distribution[risk] += 1
    
    # Enfants identifiés
    children_identified = sum(v.get('enfants_observes_travaillant', 0) for v in ssrte_visits)
    
    # Photos géolocalisées
    geotagged_photos = await db.geotagged_photos.count_documents({
        "$or": [
            {"agent_id": user_id},
            {"uploaded_by": user_id}
        ]
    })
    
    # Membres enregistrés/onboardés
    members_onboarded = await db.coop_members.count_documents({
        "registered_by": user_id
    })
    
    # Parcelles déclarées
    parcels_declared = await db.parcels.count_documents({
        "declared_by": user_id
    })
    
    # Objectifs mensuels (configurable)
    monthly_targets = {
        "visits": 20,
        "members": 10,
        "parcels": 15,
        "photos": 30
    }
    
    # Calcul des progressions
    progress = {
        "visits": min(100, round(visits_this_month / monthly_targets["visits"] * 100)),
        "members": min(100, round(members_onboarded / monthly_targets["members"] * 100)),
        "parcels": min(100, round(parcels_declared / monthly_targets["parcels"] * 100)),
        "photos": min(100, round(geotagged_photos / monthly_targets["photos"] * 100))
    }
    
    # Score de performance global
    performance_score = round((progress["visits"] + progress["members"] + progress["parcels"] + progress["photos"]) / 4)
    
    # Dernières activités
    recent_visits = sorted(ssrte_visits, key=lambda x: x.get('recorded_at', datetime.min), reverse=True)[:5]
    recent_activities = [
        {
            "type": "ssrte_visit",
            "nom_producteur": v.get('farmer_name', 'Producteur'),
            "niveau_risque": v.get('niveau_risque'),
            "enfants_observes": v.get('enfants_observes_travaillant', 0),
            "date": v.get('recorded_at')
        }
        for v in recent_visits
    ]
    
    return {
        "agent_info": {
            "id": user_id,
            "name": current_user.get('full_name'),
            "zone": current_user.get('zone'),
            "cooperative": current_user.get('cooperative_name'),
            "cooperative_id": coop_id,
            "activation_date": current_user.get('activation_date')
        },
        "performance": {
            "score": performance_score,
            "level": "Expert" if performance_score >= 80 else "Confirmé" if performance_score >= 50 else "Débutant",
            "badge_color": "#10b981" if performance_score >= 80 else "#f59e0b" if performance_score >= 50 else "#6b7280"
        },
        "statistics": {
            "ssrte_visits": {
                "total": total_visits,
                "this_month": visits_this_month,
                "this_week": visits_this_week,
                "target": monthly_targets["visits"],
                "progress": progress["visits"]
            },
            "members_onboarded": {
                "total": members_onboarded,
                "target": monthly_targets["members"],
                "progress": progress["members"]
            },
            "parcels_declared": {
                "total": parcels_declared,
                "target": monthly_targets["parcels"],
                "progress": progress["parcels"]
            },
            "geotagged_photos": {
                "total": geotagged_photos,
                "target": monthly_targets["photos"],
                "progress": progress["photos"]
            },
            "children_identified": children_identified
        },
        "risk_distribution": risk_distribution,
        "recent_activities": recent_activities,
        "achievements": get_achievements(total_visits, members_onboarded, parcels_declared, children_identified)
    }


def get_achievements(visits: int, members: int, parcels: int, children: int) -> list:
    """Calcule les badges/achievements débloqués"""
    achievements = []
    
    if visits >= 1:
        achievements.append({"id": "first_visit", "name": "Première visite", "icon": "clipboard", "unlocked": True})
    if visits >= 10:
        achievements.append({"id": "10_visits", "name": "10 visites", "icon": "star", "unlocked": True})
    if visits >= 50:
        achievements.append({"id": "50_visits", "name": "50 visites", "icon": "trophy", "unlocked": True})
    if visits >= 100:
        achievements.append({"id": "100_visits", "name": "Centenaire", "icon": "medal", "unlocked": True})
    
    if members >= 5:
        achievements.append({"id": "5_members", "name": "Recruteur", "icon": "people", "unlocked": True})
    if members >= 20:
        achievements.append({"id": "20_members", "name": "Super Recruteur", "icon": "person-add", "unlocked": True})
    
    if children >= 1:
        achievements.append({"id": "child_protector", "name": "Protecteur", "icon": "shield", "unlocked": True})
    if children >= 10:
        achievements.append({"id": "guardian", "name": "Gardien", "icon": "shield-checkmark", "unlocked": True})
    
    return achievements


async def get_coop_agents_overview(coop_user: dict):
    """Vue d'ensemble des agents pour une coopérative"""
    coop_id = coop_user.get('_id')
    
    # Récupérer tous les agents de la coopérative
    agents = await db.coop_agents.find({"coop_id": coop_id}).to_list(100)
    
    agents_stats = []
    for agent in agents:
        agent_user_id = agent.get('user_id')
        
        # Statistiques de l'agent
        visits_count = 0
        if agent_user_id:
            visits_count = await db.ssrte_visits.count_documents({
                "$or": [
                    {"agent_id": agent_user_id},
                    {"recorded_by": agent_user_id}
                ]
            })
        
        agents_stats.append({
            "id": str(agent['_id']),
            "user_id": agent_user_id,
            "name": agent.get('full_name'),
            "phone": agent.get('phone_number'),
            "zone": agent.get('zone'),
            "is_active": agent.get('is_active', True),
            "account_activated": agent.get('account_activated', False),
            "ssrte_visits": visits_count,
            "members_onboarded": agent.get('members_onboarded', 0),
            "parcels_declared": agent.get('parcels_declared', 0)
        })
    
    # Trier par nombre de visites
    agents_stats.sort(key=lambda x: x['ssrte_visits'], reverse=True)
    
    # Statistiques globales
    total_visits = sum(a['ssrte_visits'] for a in agents_stats)
    total_members = sum(a['members_onboarded'] for a in agents_stats)
    activated_agents = len([a for a in agents_stats if a['account_activated']])
    
    return {
        "cooperative_info": {
            "id": str(coop_id),
            "name": coop_user.get('coop_name') or coop_user.get('full_name'),
            "total_agents": len(agents)
        },
        "global_stats": {
            "total_ssrte_visits": total_visits,
            "total_members_onboarded": total_members,
            "activated_agents": activated_agents,
            "pending_activation": len(agents) - activated_agents
        },
        "agents_ranking": agents_stats[:10],
        "all_agents": agents_stats
    }


@router.get("/leaderboard")
async def get_agents_leaderboard(
    period: str = Query(default="month", regex="^(week|month|all)$"),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """
    Classement des agents terrain par performance
    """
    coop_id = current_user.get('cooperative_id') or str(current_user.get('_id'))
    
    # Période de filtrage
    date_filter = {}
    if period == "week":
        date_filter = {"recorded_at": {"$gte": datetime.utcnow() - timedelta(days=7)}}
    elif period == "month":
        date_filter = {"recorded_at": {"$gte": datetime.utcnow() - timedelta(days=30)}}
    
    # Agrégation des visites par agent
    pipeline = [
        {"$match": {**date_filter, "cooperative_id": coop_id}},
        {"$group": {
            "_id": "$agent_id",
            "visits_count": {"$sum": 1},
            "children_identified": {"$sum": "$enfants_observes_travaillant"},
            "critical_visits": {"$sum": {"$cond": [{"$eq": ["$niveau_risque", "critique"]}, 1, 0]}}
        }},
        {"$sort": {"visits_count": -1}},
        {"$limit": limit}
    ]
    
    results = await db.ssrte_visits.aggregate(pipeline).to_list(limit)
    
    # Enrichir avec les infos des agents
    leaderboard = []
    for i, result in enumerate(results):
        agent_id = result['_id']
        if agent_id:
            agent = await db.users.find_one({"_id": ObjectId(agent_id)})
            if agent:
                leaderboard.append({
                    "rank": i + 1,
                    "agent_id": agent_id,
                    "name": agent.get('full_name', 'Agent'),
                    "zone": agent.get('zone'),
                    "visits_count": result['visits_count'],
                    "children_identified": result['children_identified'],
                    "critical_visits": result['critical_visits'],
                    "score": result['visits_count'] * 10 + result['children_identified'] * 5 + result['critical_visits'] * 20
                })
    
    return {
        "period": period,
        "leaderboard": leaderboard,
        "updated_at": datetime.utcnow().isoformat()
    }


@router.get("/my-visits")
async def get_my_visits(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    risk_level: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Historique des visites SSRTE de l'agent
    """
    verify_field_agent(current_user)
    user_id = str(current_user.get('_id'))
    
    query = {
        "$or": [
            {"agent_id": user_id},
            {"recorded_by": user_id}
        ]
    }
    
    if risk_level:
        query["niveau_risque"] = risk_level
    
    skip = (page - 1) * limit
    
    total = await db.ssrte_visits.count_documents(query)
    visits = await db.ssrte_visits.find(query).sort("recorded_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "visits": [
            {
                "id": str(v['_id']),
                "producteur_id": v.get('farmer_id'),
                "nom_producteur": v.get('farmer_name', 'Producteur'),
                "niveau_risque": v.get('niveau_risque'),
                "enfants_observes": v.get('enfants_observes_travaillant', 0),
                "taches_dangereuses": v.get('taches_dangereuses_observees', []),
                "support_fourni": v.get('support_fourni', []),
                "suivi_requis": v.get('visite_suivi_requise', False),
                "date": v.get('recorded_at')
            }
            for v in visits
        ]
    }


@router.get("/my-farmers")
async def get_my_assigned_farmers(
    current_user: dict = Depends(get_current_user)
):
    """
    Récupérer les fermiers assignés à l'agent connecté (pour usage offline mobile)
    """
    verify_field_agent(current_user)
    user_id = str(current_user.get('_id'))

    # Find this agent's coop_agents record by user_id
    agent_doc = await db.coop_agents.find_one({"user_id": user_id})
    if not agent_doc:
        # Try by phone number
        phone = current_user.get('phone_number', '')
        agent_doc = await db.coop_agents.find_one({"phone_number": phone})

    if not agent_doc:
        return {"farmers": [], "total": 0, "last_updated": datetime.utcnow().isoformat()}

    assigned_ids = agent_doc.get("assigned_farmers", [])
    if not assigned_ids:
        return {"farmers": [], "total": 0, "last_updated": datetime.utcnow().isoformat()}

    oid_list = [ObjectId(fid) for fid in assigned_ids if ObjectId.is_valid(str(fid))]
    members = await db.coop_members.find({"_id": {"$in": oid_list}}).to_list(500)

    # Collect all member IDs for batch queries
    member_ids = [str(m["_id"]) for m in members]
    user_ids = [m.get("user_id") for m in members if m.get("user_id")]
    # Bug 4 fix: Use all possible IDs for form lookups (member_id + user_id)
    all_possible_ids = list(set(member_ids + [uid for uid in user_ids if uid]))

    # Batch fetch form completion data using all possible IDs
    ici_profiles = await db.ici_profiles.find(
        {"farmer_id": {"$in": all_possible_ids}}, {"farmer_id": 1}
    ).to_list(500)
    ici_set = {p["farmer_id"] for p in ici_profiles}

    ssrte_pipeline = [
        {"$match": {"farmer_id": {"$in": all_possible_ids}}},
        {"$group": {"_id": "$farmer_id", "count": {"$sum": 1}, "last": {"$max": "$recorded_at"}}}
    ]
    ssrte_agg = await db.ssrte_visits.aggregate(ssrte_pipeline).to_list(500)
    ssrte_map = {s["_id"]: {"count": s["count"], "last": s.get("last")} for s in ssrte_agg}

    photo_pipeline = [
        {"$match": {"farmer_id": {"$in": all_possible_ids}}},
        {"$group": {"_id": "$farmer_id", "count": {"$sum": 1}}}
    ]
    photo_agg = await db.geotagged_photos.aggregate(photo_pipeline).to_list(500)
    photo_map = {p["_id"]: p["count"] for p in photo_agg}

    # Also check agent_photos collection
    agent_photo_pipeline = [
        {"$match": {"farmer_id": {"$in": all_possible_ids}}},
        {"$group": {"_id": "$farmer_id", "count": {"$sum": "$photo_count"}}}
    ]
    agent_photo_agg = await db.agent_photos.aggregate(agent_photo_pipeline).to_list(500)
    for ap in agent_photo_agg:
        fid = ap["_id"]
        photo_map[fid] = photo_map.get(fid, 0) + ap["count"]

    # Check REDD visits (correct collection: redd_tracking_visits)
    redd_pipeline = [
        {"$match": {"farmer_id": {"$in": all_possible_ids}}},
        {"$group": {"_id": "$farmer_id", "count": {"$sum": 1}}}
    ]
    redd_agg = await db.redd_tracking_visits.aggregate(redd_pipeline).to_list(500)
    redd_map = {r["_id"]: r["count"] for r in redd_agg}

    parcel_pipeline = [
        {"$match": {"$or": [
            {"farmer_id": {"$in": all_possible_ids}},
            {"member_id": {"$in": all_possible_ids}}
        ]}},
        {"$group": {"_id": {"$ifNull": ["$member_id", "$farmer_id"]}, "count": {"$sum": 1}}}
    ]
    parcel_agg = await db.parcels.aggregate(parcel_pipeline).to_list(500)
    parcel_map = {p["_id"]: p["count"] for p in parcel_agg}

    # Enrich with parcel data and form completion for offline use
    farmers = []
    for m in members:
        member_id = str(m["_id"])
        parcels = []
        farmer_uid = m.get("user_id", "")
        # Query parcels by both member_id and farmer_id
        parcel_query = {"$or": [{"farmer_id": member_id}, {"member_id": member_id}]}
        if farmer_uid:
            parcel_query["$or"].append({"farmer_id": farmer_uid})
        parcels = await db.parcels.find(parcel_query, {"_id": 0}).to_list(50)

        parcels_count = parcel_map.get(member_id, 0) or parcel_map.get(farmer_uid, 0) or len(parcels)

        # Form completion status - check both member_id and user_id (Bug 4 fix)
        ici_done = member_id in ici_set or farmer_uid in ici_set
        ssrte_info = ssrte_map.get(member_id, {}) or ssrte_map.get(farmer_uid, {})
        ssrte_done = ssrte_info.get("count", 0) > 0
        parcels_done = parcels_count > 0
        photos_done = photo_map.get(member_id, 0) > 0 or photo_map.get(farmer_uid, 0) > 0
        redd_done = redd_map.get(member_id, 0) > 0 or redd_map.get(farmer_uid, 0) > 0
        registered = m.get("status") == "active" or m.get("is_active", False)

        forms_status = {
            "ici": {"completed": ici_done, "label": "Visite ICI"},
            "ssrte": {"completed": ssrte_done, "label": "Visite SSRTE", "count": ssrte_info.get("count", 0)},
            "redd": {"completed": redd_done, "label": "Fiche Environnementale", "count": redd_map.get(member_id, 0) or redd_map.get(farmer_uid, 0)},
            "parcels": {"completed": parcels_done, "label": "Parcelles", "count": parcels_count},
            "photos": {"completed": photos_done, "label": "Photos", "count": photo_map.get(member_id, 0) or photo_map.get(farmer_uid, 0)},
            "register": {"completed": registered, "label": "Enregistrement"},
        }
        completed_count = sum(1 for f in forms_status.values() if f["completed"])
        total_forms = len(forms_status)

        farmers.append({
            "id": member_id,
            "full_name": m.get("full_name", ""),
            "phone_number": m.get("phone_number", ""),
            "village": m.get("village", ""),
            "department": m.get("department", ""),
            "zone": m.get("zone", ""),
            "cni_number": m.get("cni_number", ""),
            "is_active": m.get("is_active", True),
            "status": m.get("status", "active"),
            "parcels": [{
                "superficie": p.get("area_hectares", 0),
                "score_carbone": p.get("carbon_score", 0),
                "type_culture": p.get("crop_type", "cacao"),
                "coordonnees_gps": p.get("gps_coordinates"),
            } for p in parcels],
            "parcels_count": parcels_count or len(parcels),
            "forms_status": forms_status,
            "completion": {
                "completed": completed_count,
                "total": total_forms,
                "percentage": round(completed_count / total_forms * 100) if total_forms > 0 else 0,
            },
        })

    return {
        "farmers": farmers,
        "total": len(farmers),
        "last_updated": datetime.utcnow().isoformat()
    }


@router.post("/log-activity")
async def log_agent_activity(
    activity_type: str,
    details: dict = {},
    current_user: dict = Depends(get_current_user)
):
    """
    Enregistre une activite de l'agent (photo, visite, etc.)
    """
    verify_field_agent(current_user)
    user_id = str(current_user.get('_id'))
    
    activity = {
        "agent_id": user_id,
        "agent_name": current_user.get('full_name'),
        "cooperative_id": current_user.get('cooperative_id'),
        "activity_type": activity_type,
        "details": details,
        "timestamp": datetime.utcnow()
    }
    
    await db.agent_activities.insert_one(activity)
    
    return {"success": True, "message": "Activité enregistrée"}


@router.post("/geotagged-photos")
async def save_geotagged_photo(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Enregistrer une photo geolocalisee"""
    user_id = str(current_user["_id"])
    
    photo_doc = {
        "farmer_id": data.get("farmer_id"),
        "farmer_name": data.get("farmer_name", ""),
        "photo_type": data.get("type", "parcelle"),
        "notes": data.get("notes", ""),
        "location": data.get("location"),
        "recorded_by": user_id,
        "agent_name": current_user.get("full_name", ""),
        "recorded_at": datetime.utcnow(),
        "synced": True,
    }
    
    result = await db.geotagged_photos.insert_one(photo_doc)
    return {
        "message": "Photo enregistree",
        "photo_id": str(result.inserted_id),
    }


@router.get("/farmer-parcels/{farmer_id}")
async def get_farmer_parcels_agent(
    farmer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Recuperer les parcelles d'un agriculteur (pour agents terrain)"""
    parcels = await db.parcels.find(
        {"$or": [{"member_id": farmer_id}, {"farmer_id": farmer_id}]}, {"_id": 0}
    ).to_list(100)
    return {"parcels": parcels}


@router.post("/farmer-parcels/{farmer_id}")
async def add_farmer_parcel_agent(
    farmer_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Declarer une parcelle pour un agriculteur (pour agents terrain)"""
    parcel_doc = {
        "member_id": farmer_id,
        "farmer_id": farmer_id,
        "village": data.get("village", ""),
        "area_hectares": data.get("area_hectares", 0),
        "crop_type": data.get("crop_type", "cacao"),
        "notes": data.get("notes", ""),
        "gps_coordinates": data.get("gps_coordinates"),
        "declared_by": str(current_user["_id"]),
        "agent_name": current_user.get("full_name", ""),
        "status": "pending",
        "created_at": datetime.utcnow(),
    }
    result = await db.parcels.insert_one(parcel_doc)
    return {"message": "Parcelle declaree", "parcel_id": str(result.inserted_id)}



@router.get("/parcels-to-verify")
async def get_parcels_to_verify(
    current_user: dict = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, description="pending, needs_correction, all"),
    village: Optional[str] = Query(None)
):
    """
    Liste des parcelles a verifier par l'agent terrain.
    Filtre par fermiers assignes + zone/village de l'agent.
    """
    verify_field_agent(current_user)
    user_id = str(current_user.get('_id'))

    # Find agent record
    agent_doc = await db.coop_agents.find_one({"user_id": user_id})
    if not agent_doc:
        phone = current_user.get('phone_number', '')
        agent_doc = await db.coop_agents.find_one({"phone_number": phone})

    if not agent_doc:
        return {"parcels": [], "total": 0, "stats": {"pending": 0, "needs_correction": 0, "verified": 0}}

    assigned_ids = agent_doc.get("assigned_farmers", [])
    agent_zone = agent_doc.get("zone", "")
    agent_villages = agent_doc.get("village_coverage", [])

    # Build parcel query: assigned farmers OR agent zone/villages
    parcel_or = []
    if assigned_ids:
        parcel_or.append({"member_id": {"$in": assigned_ids}})
        parcel_or.append({"farmer_id": {"$in": assigned_ids}})
    if agent_villages:
        parcel_or.append({"village": {"$in": agent_villages}})
    if agent_zone:
        parcel_or.append({"village": {"$regex": agent_zone, "$options": "i"}})

    if not parcel_or:
        return {"parcels": [], "total": 0, "stats": {"pending": 0, "needs_correction": 0, "verified": 0}}

    base_query = {"$or": parcel_or}

    # Status filter
    if status_filter and status_filter != "all":
        base_query["verification_status"] = status_filter
    elif not status_filter:
        base_query["verification_status"] = {"$in": ["pending", "needs_correction", None]}

    # Village filter
    if village:
        base_query["village"] = {"$regex": village, "$options": "i"}

    parcels = await db.parcels.find(base_query).sort("created_at", -1).to_list(200)

    # Batch fetch member names
    member_ids_set = set()
    for p in parcels:
        if p.get("member_id"):
            member_ids_set.add(p["member_id"])
        if p.get("farmer_id"):
            member_ids_set.add(p["farmer_id"])

    oid_list = [ObjectId(mid) for mid in member_ids_set if ObjectId.is_valid(str(mid))]
    members_list = await db.coop_members.find({"_id": {"$in": oid_list}}).to_list(500)
    members_map = {str(m["_id"]): m for m in members_list}

    # Also check users collection for farmer names
    users_list = await db.users.find({"_id": {"$in": oid_list}}).to_list(500)
    users_map = {str(u["_id"]): u for u in users_list}

    result = []
    for p in parcels:
        mid = p.get("member_id") or p.get("farmer_id", "")
        member = members_map.get(mid) or users_map.get(mid)
        result.append({
            "id": str(p["_id"]),
            "nom_producteur": member.get("full_name", "Inconnu") if member else "Inconnu",
            "telephone_producteur": member.get("phone_number", "") if member else "",
            "producteur_id": p.get("farmer_id", ""),
            "membre_id": p.get("member_id", ""),
            "village": p.get("village", ""),
            "localisation": p.get("location", ""),
            "superficie": p.get("area_hectares", 0),
            "type_culture": p.get("crop_type", "cacao"),
            "coordonnees_gps": p.get("gps_coordinates"),
            "statut_verification": p.get("verification_status", "pending"),
            "notes_verification": p.get("verification_notes"),
            "verifie_le": p.get("verified_at"),
            "score_carbone": p.get("carbon_score", 0),
            "cree_le": str(p.get("created_at", ""))
        })

    # Stats for counters
    all_query = {"$or": parcel_or}
    all_parcels = await db.parcels.find(all_query, {"verification_status": 1}).to_list(1000)
    stats = {"pending": 0, "needs_correction": 0, "verified": 0, "rejected": 0}
    for p in all_parcels:
        vs = p.get("verification_status", "pending") or "pending"
        if vs in stats:
            stats[vs] += 1

    return {"parcels": result, "total": len(result), "stats": stats}


@router.put("/parcels/{parcel_id}/verify")
async def verify_parcel_by_agent(
    parcel_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Verifier/Valider une parcelle sur le terrain.
    Body: {verification_status, verification_notes, gps_lat, gps_lng, corrected_area_hectares,
           nombre_arbres, couverture_ombragee, pratiques_ecologiques}
    """
    verify_field_agent(current_user)

    if not ObjectId.is_valid(parcel_id):
        raise HTTPException(status_code=400, detail="ID parcelle invalide")

    parcel = await db.parcels.find_one({"_id": ObjectId(parcel_id)})
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcelle non trouvee")

    v_status = data.get("verification_status", "verified")
    if v_status not in ["verified", "rejected", "needs_correction"]:
        raise HTTPException(status_code=400, detail="Statut invalide")

    update_data = {
        "verification_status": v_status,
        "verified_at": datetime.utcnow(),
        "verified_by": str(current_user["_id"]),
        "verifier_name": current_user.get("full_name", "Agent"),
        "verification_notes": data.get("verification_notes", ""),
    }

    gps_lat = data.get("gps_lat")
    gps_lng = data.get("gps_lng")
    if gps_lat and gps_lng:
        update_data["verified_gps_coordinates"] = {
            "lat": float(gps_lat),
            "lng": float(gps_lng)
        }

    corrected = data.get("corrected_area_hectares")
    if corrected and float(corrected) != parcel.get("area_hectares", 0):
        update_data["area_hectares_declared"] = parcel.get("area_hectares")
        update_data["area_hectares"] = float(corrected)

    photos = data.get("verification_photos", [])
    if photos:
        update_data["verification_photos"] = photos

    # Carbon premium fields
    nombre_arbres = data.get("nombre_arbres")
    arbres_petits = data.get("arbres_petits")
    arbres_moyens = data.get("arbres_moyens")
    arbres_grands = data.get("arbres_grands")

    if nombre_arbres is not None:
        update_data["nombre_arbres"] = int(nombre_arbres)
    if arbres_petits is not None:
        update_data["arbres_petits"] = int(arbres_petits)
    if arbres_moyens is not None:
        update_data["arbres_moyens"] = int(arbres_moyens)
    if arbres_grands is not None:
        update_data["arbres_grands"] = int(arbres_grands)

    # Auto-calculate total nombre_arbres from categories
    if arbres_petits is not None or arbres_moyens is not None or arbres_grands is not None:
        total_trees = int(arbres_petits or 0) + int(arbres_moyens or 0) + int(arbres_grands or 0)
        update_data["nombre_arbres"] = total_trees
        nombre_arbres = total_trees

    couverture_ombragee = data.get("couverture_ombragee")
    # Auto-calculate shade cover if not provided but tree count is available
    if couverture_ombragee is None and nombre_arbres is not None:
        area_for_calc = float(corrected) if corrected else parcel.get("area_hectares", 0)
        if area_for_calc > 0:
            CANOPY_M2 = 80  # average shade tree canopy ~80m²
            couverture_ombragee = min((int(nombre_arbres) * CANOPY_M2) / (area_for_calc * 10000) * 100, 100)
            couverture_ombragee = round(couverture_ombragee, 1)
    if couverture_ombragee is not None:
        update_data["couverture_ombragee"] = float(couverture_ombragee)

    pratiques = data.get("pratiques_ecologiques", [])
    if pratiques:
        update_data["pratiques_ecologiques"] = pratiques

    # Recalculate carbon score with enriched data + REDD+ practices
    area = float(corrected) if corrected else parcel.get("area_hectares", 0)

    # Fetch REDD+ tracking practices for this parcel's farmer
    farmer_id_str = str(parcel.get("farmer_id", ""))
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

    carbon_score = _calculate_verified_carbon_score(
        nombre_arbres=nombre_arbres,
        couverture_ombragee=couverture_ombragee,
        pratiques=pratiques,
        area=area,
        existing_practices=parcel.get("farming_practices", []),
        arbres_petits=arbres_petits,
        arbres_moyens=arbres_moyens,
        arbres_grands=arbres_grands,
        redd_practices=redd_practices_adopted,
    )
    update_data["carbon_score"] = carbon_score
    update_data["co2_captured_tonnes"] = round(area * carbon_score * 2.5, 2)
    update_data["carbon_credits_earned"] = round(carbon_score * area * 0.5, 2)

    await db.parcels.update_one(
        {"_id": ObjectId(parcel_id)},
        {"$set": update_data}
    )

    # Check admissibility for carbon premium (only for verified parcels)
    if v_status == "verified":
        from routes.carbon_premiums import check_and_set_admissibility
        farmer_id = str(parcel.get("farmer_id", ""))
        await check_and_set_admissibility(parcel_id, carbon_score, farmer_id, area)

    status_labels = {"verified": "verifiee", "rejected": "rejetee", "needs_correction": "a corriger"}

    return {
        "message": f"Parcelle {status_labels.get(v_status, v_status)}",
        "parcel_id": parcel_id,
        "verification_status": v_status,
        "carbon_score": carbon_score,
        "verified_at": update_data["verified_at"].isoformat()
    }


def _calculate_verified_carbon_score(nombre_arbres, couverture_ombragee, pratiques, area, existing_practices=None,
                                     arbres_petits=None, arbres_moyens=None, arbres_grands=None,
                                     redd_practices=None):
    """
    Recalculate carbon score using field-verified data with tree height categories
    and REDD+ practices integration.
    Base score 3.0, max 10.0.
    
    Tree biomass weighting (based on allometric equations AGB ~ f(D^2 * H)):
    - Petits (< 8m): coefficient 0.3 (young trees, low biomass)
    - Moyens (8-12m): coefficient 0.7 (maturing trees, moderate biomass)
    - Grands (> 12m): coefficient 1.0 (mature trees, full biomass)
    
    REDD+ practices (21 practices, 5 categories):
    - agroforesterie: AGF1-AGF4 (+0.3 each, max +1.2)
    - zero_deforestation: ZD1-ZD4 (+0.3 each, max +1.2)
    - gestion_sols: SOL1-SOL5 (+0.2 each, max +1.0)
    - restauration: REST1-REST4 (+0.3 each, max +1.2)
    - tracabilite: TRAC1-TRAC4 (+0.15 each, max +0.6)
    """
    score = 3.0

    # Calculate weighted tree count using biomass coefficients
    COEFF_PETIT = 0.3
    COEFF_MOYEN = 0.7
    COEFF_GRAND = 1.0

    n_petits = int(arbres_petits or 0)
    n_moyens = int(arbres_moyens or 0)
    n_grands = int(arbres_grands or 0)
    
    # If only total nombre_arbres provided (backward compat), treat as moyens
    total_from_categories = n_petits + n_moyens + n_grands
    if nombre_arbres and total_from_categories == 0:
        n_moyens = int(nombre_arbres)
        total_from_categories = n_moyens

    weighted_trees = (n_petits * COEFF_PETIT) + (n_moyens * COEFF_MOYEN) + (n_grands * COEFF_GRAND)

    # Tree biomass bonus (0-2 pts) based on weighted density per hectare
    if total_from_categories > 0 and area > 0:
        weighted_density = weighted_trees / area
        if weighted_density >= 80:
            score += 2.0
        elif weighted_density >= 50:
            score += 1.5
        elif weighted_density >= 20:
            score += 1.0
        elif weighted_density >= 5:
            score += 0.5

    # Shade cover bonus (0-2 pts) - weighted by tree maturity
    if couverture_ombragee is not None:
        pct = float(couverture_ombragee)
        # Bonus for having mature trees (grands > 12m) providing quality shade
        mature_ratio = n_grands / total_from_categories if total_from_categories > 0 else 0
        maturity_bonus = 0.3 * mature_ratio  # up to +0.3 bonus for having large trees
        
        if pct >= 60:
            score += min(2.0 + maturity_bonus, 2.0)
        elif pct >= 40:
            score += min(1.5 + maturity_bonus, 2.0)
        elif pct >= 20:
            score += min(1.0 + maturity_bonus, 2.0)
        elif pct >= 10:
            score += min(0.5 + maturity_bonus, 2.0)

    # Ecological practices bonus (0-2.5 pts, 0.5 each)
    practice_scores = {
        "compostage": 0.5,
        "absence_pesticides": 0.5,
        "gestion_dechets": 0.5,
        "protection_cours_eau": 0.5,
        "agroforesterie": 0.5,
    }
    all_practices = list(pratiques or []) + list(existing_practices or [])
    seen = set()
    for p in all_practices:
        if p not in seen:
            score += practice_scores.get(p, 0)
            seen.add(p)

    # REDD+ practices bonus (from field agent tracking visits)
    redd_category_scores = {
        "agroforesterie": 0.3,      # AGF1-AGF4: +0.3 each
        "zero_deforestation": 0.3,   # ZD1-ZD4: +0.3 each
        "gestion_sols": 0.2,         # SOL1-SOL5: +0.2 each
        "restauration": 0.3,         # REST1-REST4: +0.3 each
        "tracabilite": 0.15,         # TRAC1-TRAC4: +0.15 each
    }
    redd_category_caps = {
        "agroforesterie": 1.2,
        "zero_deforestation": 1.2,
        "gestion_sols": 1.0,
        "restauration": 1.2,
        "tracabilite": 0.6,
    }
    if redd_practices:
        category_totals = {}
        for rp in redd_practices:
            cat = rp.get("category", "")
            if cat in redd_category_scores:
                category_totals[cat] = category_totals.get(cat, 0) + redd_category_scores[cat]
        for cat, total in category_totals.items():
            capped = min(total, redd_category_caps.get(cat, 1.0))
            score += capped

    # Area bonus (0-0.5 pts)
    if area >= 5:
        score += 0.5

    return round(min(score, 10.0), 1)
