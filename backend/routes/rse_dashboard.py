"""
RSE Dashboard Stats - Métriques enrichies pour le tableau de bord RSE
Fournit des KPIs EUDR, ESG, traçabilité, monitoring travail enfants
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/rse", tags=["RSE Dashboard"])


def verify_rse_or_admin(current_user: dict):
    if current_user.get("user_type") not in ["entreprise_rse", "admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Accès réservé aux entreprises RSE")
    return current_user


@router.get("/dashboard-stats")
async def get_rse_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """
    Métriques enrichies du dashboard RSE:
    - Conformité EUDR
    - Monitoring travail des enfants (ICI/SSRTE)
    - Traçabilité chaîne d'approvisionnement
    - Score ESG
    - Marché carbone
    """
    verify_rse_or_admin(current_user)

    # === EUDR COMPLIANCE ===
    total_parcels = await db.parcels.count_documents({"status": "active"})
    if total_parcels == 0:
        total_parcels = await db.parcels.count_documents({})

    geolocated = await db.parcels.count_documents({
        "gps_coordinates": {"$exists": True, "$ne": None}
    })
    verified_parcels = await db.parcels.count_documents({
        "verification_status": "verified"
    })
    deforestation_free = await db.parcels.count_documents({
        "deforestation_free": True
    })

    eudr_compliance_rate = round(
        (deforestation_free / max(total_parcels, 1)) * 100, 1
    )
    geolocation_rate = round(
        (geolocated / max(total_parcels, 1)) * 100, 1
    )
    verification_rate = round(
        (verified_parcels / max(total_parcels, 1)) * 100, 1
    )

    # === CHILD LABOR MONITORING (ICI / SSRTE) ===
    total_ici_forms = await db.ici_profiles.count_documents({})
    total_ssrte_visits = await db.ssrte_visits.count_documents({})

    # Children monitored from ICI profiles
    ici_pipeline = [
        {"$project": {"children_count": {"$size": {"$ifNull": ["$children", []]}}}},
        {"$group": {"_id": None, "total": {"$sum": "$children_count"}}}
    ]
    ici_agg = await db.ici_profiles.aggregate(ici_pipeline).to_list(1)
    children_monitored = ici_agg[0]["total"] if ici_agg else 0

    # SSRTE risk distribution
    risk_pipeline = [
        {"$group": {"_id": "$niveau_risque", "count": {"$sum": 1}}}
    ]
    risk_agg = await db.ssrte_visits.aggregate(risk_pipeline).to_list(10)
    risk_distribution = {r["_id"]: r["count"] for r in risk_agg if r["_id"]}

    high_risk_cases = risk_distribution.get("élevé", 0) + risk_distribution.get("eleve", 0) + risk_distribution.get("critique", 0)
    moderate_risk = risk_distribution.get("modéré", 0) + risk_distribution.get("modere", 0)
    low_risk = risk_distribution.get("faible", 0) + risk_distribution.get("normal", 0)

    # Alerts from ICI
    total_alerts = await db.ici_alerts.count_documents({})
    resolved_alerts = await db.ici_alerts.count_documents({"status": "resolved"})

    # === SUPPLY CHAIN TRACEABILITY ===
    total_farmers = await db.coop_members.count_documents({"is_active": True})
    total_cooperatives = await db.users.count_documents({"user_type": "cooperative"})

    # Total hectares
    hectares_pipeline = [
        {"$group": {"_id": None, "total_ha": {"$sum": "$area_hectares"}}}
    ]
    ha_agg = await db.parcels.aggregate(hectares_pipeline).to_list(1)
    total_hectares = round(ha_agg[0]["total_ha"], 1) if ha_agg else 0

    # Certifications breakdown
    cert_pipeline = [
        {"$match": {"certification": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$certification", "count": {"$sum": 1}}}
    ]
    cert_agg = await db.parcels.aggregate(cert_pipeline).to_list(20)
    certifications = {c["_id"]: c["count"] for c in cert_agg if c["_id"]}
    certified_parcels = sum(certifications.values())

    # === CARBON MARKET ===
    available_credits = await db.carbon_credits.count_documents({"status": "available"})
    carbon_pipeline = [
        {"$match": {"status": "available"}},
        {"$group": {
            "_id": None,
            "total_tonnes": {"$sum": "$quantity_tonnes_co2"},
            "avg_price": {"$avg": "$price_per_tonne"},
            "min_price": {"$min": "$price_per_tonne"},
            "max_price": {"$max": "$price_per_tonne"}
        }}
    ]
    carbon_agg = await db.carbon_credits.aggregate(carbon_pipeline).to_list(1)
    carbon_market = carbon_agg[0] if carbon_agg else {}

    # Credit types available
    type_pipeline = [
        {"$match": {"status": "available"}},
        {"$group": {"_id": "$credit_type", "tonnes": {"$sum": "$quantity_tonnes_co2"}, "count": {"$sum": 1}}}
    ]
    type_agg = await db.carbon_credits.aggregate(type_pipeline).to_list(20)

    # User's own purchases
    my_purchases = await db.carbon_purchases.find(
        {"buyer_id": current_user["_id"]}
    ).to_list(1000)
    my_total_tonnes = sum(p.get("quantity_tonnes", 0) for p in my_purchases)
    my_total_investment = sum(p.get("total_price", 0) for p in my_purchases)

    # === ESG SCORE CALCULATION ===
    # Environmental (E): carbon offset, deforestation-free, certification coverage
    e_carbon = min(100, (my_total_tonnes / max(1, 100)) * 100)
    e_deforestation = eudr_compliance_rate
    e_certification = round((certified_parcels / max(total_parcels, 1)) * 100, 1)
    environmental_score = round((e_carbon * 0.4 + e_deforestation * 0.4 + e_certification * 0.2), 1)

    # Social (S): child labor monitoring, ICI forms, farmers impacted
    s_monitoring = min(100, (total_ici_forms / max(total_farmers, 1)) * 100)
    s_resolution = round((resolved_alerts / max(total_alerts, 1)) * 100, 1) if total_alerts > 0 else 100
    s_ssrte = min(100, (total_ssrte_visits / max(total_farmers, 1)) * 100)
    social_score = round((s_monitoring * 0.4 + s_resolution * 0.3 + s_ssrte * 0.3), 1)

    # Governance (G): traceability, verification, geolocation
    g_trace = geolocation_rate
    g_verify = verification_rate
    governance_score = round((g_trace * 0.5 + g_verify * 0.5), 1)

    esg_global = round((environmental_score * 0.4 + social_score * 0.35 + governance_score * 0.25), 1)

    return {
        "eudr_compliance": {
            "compliance_rate": eudr_compliance_rate,
            "geolocation_rate": geolocation_rate,
            "verification_rate": verification_rate,
            "total_parcels": total_parcels,
            "geolocated_parcels": geolocated,
            "verified_parcels": verified_parcels,
            "deforestation_free": deforestation_free,
        },
        "child_labor_monitoring": {
            "total_ici_forms": total_ici_forms,
            "total_ssrte_visits": total_ssrte_visits,
            "children_monitored": children_monitored,
            "high_risk_cases": high_risk_cases,
            "moderate_risk_cases": moderate_risk,
            "low_risk_cases": low_risk,
            "total_alerts": total_alerts,
            "resolved_alerts": resolved_alerts,
            "resolution_rate": round((resolved_alerts / max(total_alerts, 1)) * 100, 1) if total_alerts > 0 else 100,
        },
        "traceability": {
            "total_farmers": total_farmers,
            "total_cooperatives": total_cooperatives,
            "total_hectares": total_hectares,
            "total_parcels": total_parcels,
            "certified_parcels": certified_parcels,
            "certifications": certifications,
        },
        "carbon_market": {
            "available_credits": available_credits,
            "total_tonnes_available": round(carbon_market.get("total_tonnes", 0), 1),
            "avg_price_per_tonne": round(carbon_market.get("avg_price", 0)),
            "min_price": round(carbon_market.get("min_price", 0)),
            "max_price": round(carbon_market.get("max_price", 0)),
            "credit_types": [
                {"type": t["_id"], "tonnes": round(t["tonnes"], 1), "count": t["count"]}
                for t in type_agg if t["_id"]
            ],
        },
        "my_impact": {
            "total_tonnes_offset": round(my_total_tonnes, 1),
            "total_investment_xof": round(my_total_investment),
            "purchases_count": len(my_purchases),
        },
        "esg_score": {
            "global": min(esg_global, 100),
            "environmental": min(environmental_score, 100),
            "social": min(social_score, 100),
            "governance": min(governance_score, 100),
            "details": {
                "e_carbon_offset": round(e_carbon, 1),
                "e_deforestation_free": e_deforestation,
                "e_certification": e_certification,
                "s_ici_monitoring": round(s_monitoring, 1),
                "s_alert_resolution": s_resolution,
                "s_ssrte_coverage": round(s_ssrte, 1),
                "g_geolocation": g_trace,
                "g_verification": g_verify,
            }
        }
    }
