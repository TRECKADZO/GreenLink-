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
    pin_code: str  # Code PIN 4 chiffres pour USSD - OBLIGATOIRE
    hectares: Optional[float] = None  # Superficie approximative

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

# ============= DASHBOARD KPIs (REDD+, SSRTE, ICI) =============

@router.get("/dashboard-kpis")
async def get_dashboard_kpis(current_user: dict = Depends(get_current_user)):
    """KPIs REDD+, SSRTE, ICI gates par l'abonnement cooperative"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])

    # --- Subscription ---
    sub = await db.coop_subscriptions.find_one({"user_id": coop_id}, {"_id": 0})
    if not sub:
        from coop_subscription_models import create_coop_subscription, CoopPlan, COOP_PLAN_FEATURES, get_coop_sub_status
        coop_name = current_user.get("coop_name", current_user.get("full_name", ""))
        sub = create_coop_subscription(coop_id, coop_name)
        await db.coop_subscriptions.insert_one(sub)
        sub.pop("_id", None)
    else:
        from coop_subscription_models import CoopPlan, COOP_PLAN_FEATURES, get_coop_sub_status

    sub_status = get_coop_sub_status(sub)
    plan_key = sub.get("plan", CoopPlan.TRIAL.value)
    try:
        plan_enum = CoopPlan(plan_key)
    except ValueError:
        plan_enum = CoopPlan.TRIAL
    features = COOP_PLAN_FEATURES.get(plan_enum, COOP_PLAN_FEATURES[CoopPlan.TRIAL])

    subscription_info = {
        "plan": plan_key,
        "plan_name": {CoopPlan.TRIAL: "Essai Gratuit Pro", CoopPlan.STARTER: "Starter",
                      CoopPlan.PRO: "Pro", CoopPlan.ENTERPRISE: "Enterprise"}.get(plan_enum, "Essai"),
        "is_active": sub_status.get("is_active", False),
        "is_trial": sub_status.get("is_trial", False),
        "days_remaining": sub_status.get("days_remaining", 0),
        "status": sub_status.get("status", ""),
    }

    # --- REDD+ KPIs ---
    redd_kpis = None
    if features.get("redd_avance") or features.get("redd_simplifie"):
        cq = coop_id_query(coop_id)
        visits = await db.redd_tracking_visits.find(cq, {"_id": 0}).to_list(2000)
        total_visits = len(visits)
        avg_redd = round(sum(v.get("redd_score", 0) for v in visits) / max(total_visits, 1), 1)
        avg_conf = round(sum(v.get("conformity_pct", 0) for v in visits) / max(total_visits, 1))
        level_dist = {}
        for v in visits:
            lvl = v.get("redd_level", "Non conforme")
            level_dist[lvl] = level_dist.get(lvl, 0) + 1

        # MRV data from ars_farmer_data
        farmers_q = {"$or": [{"coop_id": coop_id}, {"cooperative_id": coop_id}]}
        farmers_data = await db.ars_farmer_data.find(farmers_q, {"_id": 0}).to_list(2000)
        total_farmers = len(farmers_data)
        practices_adoption = {}
        if total_farmers > 0:
            for key, label in [("agroforesterie", "Agroforesterie"), ("compost", "Compostage"),
                               ("couverture_sol", "Couverture sol"), ("brulage", "Zero brulage")]:
                val = "oui" if key != "brulage" else "non"
                cnt = sum(1 for f in farmers_data if f.get(key) == val)
                practices_adoption[label] = {"count": cnt, "pct": round(cnt / total_farmers * 100)}

        redd_kpis = {
            "total_visits": total_visits,
            "avg_score": avg_redd,
            "avg_conformity": avg_conf,
            "level_distribution": level_dist,
            "farmers_assessed": total_farmers,
            "practices_adoption": practices_adoption,
            "is_advanced": bool(features.get("redd_avance")),
            "has_mrv": bool(features.get("redd_donnees_mrv")),
        }

    # --- SSRTE KPIs ---
    ssrte_kpis = None
    if features.get("alertes_ssrte"):
        ssrte_q = coop_id_query(coop_id)

        total_ssrte = await db.ssrte_visits.count_documents(ssrte_q)

        # Handle both field names: niveau_risque (USSD) and risk_level (Web API)
        risk_pipeline = [
            {"$match": ssrte_q},
            {"$addFields": {"_risk": {"$ifNull": ["$niveau_risque", "$risk_level"]}}},
            {"$group": {"_id": "$_risk", "count": {"$sum": 1}}}
        ]
        risk_dist = {r["_id"]: r["count"] for r in await db.ssrte_visits.aggregate(risk_pipeline).to_list(20)}

        # Handle both: enfants_observes_travaillant (USSD) and children_at_risk (Web)
        children_pipeline = [
            {"$match": ssrte_q},
            {"$addFields": {
                "_enfants": {"$add": [
                    {"$ifNull": ["$enfants_observes_travaillant", 0]},
                    {"$ifNull": ["$children_at_risk", 0]}
                ]}
            }},
            {"$group": {"_id": None,
                        "total_enfants": {"$sum": "$_enfants"},
                        "with_children": {"$sum": {"$cond": [{"$gt": ["$_enfants", 0]}, 1, 0]}}}}
        ]
        ch = await db.ssrte_visits.aggregate(children_pipeline).to_list(1)
        enfants_total = ch[0]["total_enfants"] if ch else 0
        visits_with_children = ch[0]["with_children"] if ch else 0

        # Handle both farmer_id and member_id for unique farmers
        unique_pipeline = [
            {"$match": ssrte_q},
            {"$addFields": {"_fid": {"$ifNull": ["$farmer_id", "$member_id"]}}},
            {"$group": {"_id": "$_fid"}},
            {"$count": "total"}
        ]
        uf = await db.ssrte_visits.aggregate(unique_pipeline).to_list(1)
        unique_farmers = uf[0]["total"] if uf else 0

        total_members = await db.coop_members.count_documents(coop_id_query(coop_id))
        coverage = round(unique_farmers / max(total_members, 1) * 100, 1)

        has_reports = bool(features.get("rapports_ssrte_ici"))

        # Normalize risk keys: map high->eleve, low->faible, medium->modere, critical->critique
        risk_map = {"high": "eleve", "low": "faible", "medium": "modere", "critical": "critique"}
        normalized_risk = {"critique": 0, "eleve": 0, "modere": 0, "faible": 0}
        for k, v in risk_dist.items():
            mapped = risk_map.get(k, k)
            if mapped in normalized_risk:
                normalized_risk[mapped] += v

        ssrte_kpis = {
            "total_visits": total_ssrte,
            "risk_distribution": normalized_risk,
            "children_identified": enfants_total,
            "visits_with_children": visits_with_children,
            "unique_farmers_visited": unique_farmers,
            "coverage_rate": coverage,
            "has_full_reports": has_reports,
        }

    # --- ICI KPIs (Pro+ only) ---
    ici_kpis = None
    if features.get("rapports_ssrte_ici"):
        ici_q = coop_id_query(coop_id)

        total_cases = await db.ssrte_cases.count_documents(ici_q)
        resolved = await db.ssrte_cases.count_documents({**ici_q, "status": {"$in": ["resolved", "closed"]}})
        in_progress = await db.ssrte_cases.count_documents({**ici_q, "status": "in_progress"})
        resolution_rate = round(resolved / max(total_cases, 1) * 100, 1)

        ici_kpis = {
            "total_cases": total_cases,
            "resolved": resolved,
            "in_progress": in_progress,
            "resolution_rate": resolution_rate,
        }

    return {
        "subscription": subscription_info,
        "features": features,
        "redd": redd_kpis,
        "ssrte": ssrte_kpis,
        "ici": ici_kpis,
    }


@router.get("/dashboard-charts")
async def get_dashboard_charts(current_user: dict = Depends(get_current_user)):
    """Time-series data for dashboard charts (last 6 months)"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    cq = coop_id_query(coop_id)

    now = datetime.now(timezone.utc)
    months = []
    for i in range(5, -1, -1):
        d = now - timedelta(days=i * 30)
        months.append({"year": d.year, "month": d.month, "label": d.strftime("%b %Y")})

    # --- 1. REDD+ monthly evolution ---
    redd_monthly = []
    for m in months:
        start = datetime(m["year"], m["month"], 1, tzinfo=timezone.utc)
        next_m = m["month"] + 1 if m["month"] < 12 else 1
        next_y = m["year"] if m["month"] < 12 else m["year"] + 1
        end = datetime(next_y, next_m, 1, tzinfo=timezone.utc)

        # REDD visits in this month (created_at is ISO string or datetime)
        pipeline = [
            {"$match": {**cq, "$or": [
                {"created_at": {"$gte": start.isoformat(), "$lt": end.isoformat()}},
                {"created_at": {"$gte": start, "$lt": end}},
            ]}},
            {"$group": {
                "_id": None,
                "count": {"$sum": 1},
                "avg_score": {"$avg": "$redd_score"},
                "total_co2": {"$sum": {"$ifNull": ["$superficie_verifiee", 0]}},
            }}
        ]
        res = await db.redd_tracking_visits.aggregate(pipeline).to_list(1)
        r = res[0] if res else {}
        redd_monthly.append({
            "month": m["label"],
            "visites": r.get("count", 0),
            "score_moyen": round(r.get("avg_score", 0) or 0, 1),
            "co2_tonnes": round((r.get("total_co2", 0) or 0) * 0.8, 1),
        })

    # --- 2. SSRTE monthly trends ---
    ssrte_monthly = []
    for m in months:
        start = datetime(m["year"], m["month"], 1, tzinfo=timezone.utc)
        next_m = m["month"] + 1 if m["month"] < 12 else 1
        next_y = m["year"] if m["month"] < 12 else m["year"] + 1
        end = datetime(next_y, next_m, 1, tzinfo=timezone.utc)

        pipeline = [
            {"$match": {**cq, "$or": [
                {"created_at": {"$gte": start.isoformat(), "$lt": end.isoformat()}},
                {"created_at": {"$gte": start, "$lt": end}},
            ]}},
            {"$addFields": {
                "_risk": {"$ifNull": ["$niveau_risque", "$risk_level"]},
                "_enfants": {"$add": [
                    {"$ifNull": ["$enfants_observes_travaillant", 0]},
                    {"$ifNull": ["$children_at_risk", 0]}
                ]}
            }},
            {"$group": {
                "_id": None,
                "total": {"$sum": 1},
                "enfants": {"$sum": "$_enfants"},
                "risks": {"$push": "$_risk"},
            }}
        ]
        res = await db.ssrte_visits.aggregate(pipeline).to_list(1)
        r = res[0] if res else {}
        risk_map = {"high": "eleve", "low": "faible", "medium": "modere", "critical": "critique"}
        risks = r.get("risks", [])
        risk_counts = {"critique": 0, "eleve": 0, "modere": 0, "faible": 0}
        for rk in risks:
            mapped = risk_map.get(rk, rk)
            if mapped in risk_counts:
                risk_counts[mapped] += 1

        ssrte_monthly.append({
            "month": m["label"],
            "visites": r.get("total", 0),
            "enfants": r.get("enfants", 0),
            **risk_counts,
        })

    # --- 3. Risk by village/zone ---
    zone_pipeline = [
        {"$match": cq},
        {"$lookup": {
            "from": "coop_members",
            "let": {"mid": {"$ifNull": ["$farmer_id", "$member_id"]}},
            "pipeline": [
                {"$match": {"$expr": {"$eq": [{"$toString": "$_id"}, "$$mid"]}}},
                {"$project": {"village": 1}}
            ],
            "as": "member_info"
        }},
        {"$addFields": {
            "_village": {"$ifNull": [{"$arrayElemAt": ["$member_info.village", 0]}, "Inconnu"]},
            "_risk": {"$ifNull": ["$niveau_risque", "$risk_level"]}
        }},
        {"$group": {
            "_id": "$_village",
            "total": {"$sum": 1},
            "critique": {"$sum": {"$cond": [{"$in": ["$_risk", ["critique", "critical"]]}, 1, 0]}},
            "eleve": {"$sum": {"$cond": [{"$in": ["$_risk", ["eleve", "high"]]}, 1, 0]}},
            "modere": {"$sum": {"$cond": [{"$in": ["$_risk", ["modere", "medium"]]}, 1, 0]}},
            "faible": {"$sum": {"$cond": [{"$in": ["$_risk", ["faible", "low"]]}, 1, 0]}},
        }},
        {"$sort": {"critique": -1, "eleve": -1, "total": -1}},
        {"$limit": 10}
    ]
    zones_raw = await db.ssrte_visits.aggregate(zone_pipeline).to_list(10)
    risk_by_zone = [{"zone": z["_id"], "total": z["total"], "critique": z["critique"],
                     "eleve": z["eleve"], "modere": z["modere"], "faible": z["faible"]} for z in zones_raw]

    return {
        "redd_monthly": redd_monthly,
        "ssrte_monthly": ssrte_monthly,
        "risk_by_zone": risk_by_zone,
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
