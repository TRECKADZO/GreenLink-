"""
REDD+ Impact National - Strategic metrics for international partners.
Aggregates REDD+, SSRTE/ICI, MRV, and carbon data across ALL cooperatives.
"""
from fastapi import APIRouter, Depends, HTTPException
from database import db
from routes.auth import get_current_user
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/redd-impact", tags=["REDD+ Impact National"])

USD_TO_XOF = 655


async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("user_type") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Acces reserve aux administrateurs")
    return current_user


@router.get("/national-metrics")
async def get_national_redd_metrics(current_user: dict = Depends(get_admin_user)):
    """All REDD+ impact metrics aggregated nationally for partner reporting."""

    # ---- 1. CARBON IMPACT ----
    total_parcels = await db.parcels.count_documents({})
    parcels_with_score = await db.parcels.find(
        {"carbon_score": {"$exists": True, "$gt": 0}},
        {"carbon_score": 1, "area_hectares": 1, "co2_tonnes": 1, "_id": 0}
    ).to_list(50000)

    total_hectares = sum(p.get("area_hectares", 0) for p in parcels_with_score)
    total_co2_tonnes = sum(p.get("co2_tonnes", 0) for p in parcels_with_score)
    avg_carbon_score = round(
        sum(p.get("carbon_score", 0) for p in parcels_with_score) / max(len(parcels_with_score), 1), 1
    )

    # Estimate CO2 from score if co2_tonnes not stored
    if total_co2_tonnes == 0 and total_hectares > 0:
        total_co2_tonnes = round(total_hectares * 4.8 * (avg_carbon_score / 10), 1)

    # Carbon revenue projection (5 years)
    price_per_tonne_xof = 19650  # ~30 USD
    annual_revenue_xof = round(total_co2_tonnes * price_per_tonne_xof)
    five_year_projection = []
    for year in range(1, 6):
        growth = 1 + (year * 0.15)  # 15% growth/year
        five_year_projection.append({
            "year": 2026 + year - 1,
            "tonnes_co2": round(total_co2_tonnes * growth),
            "revenue_xof": round(annual_revenue_xof * growth),
            "hectares": round(total_hectares * (1 + year * 0.10)),
        })

    # Equivalent foret sauvee (1 ha mature forest ~ 200 tCO2)
    foret_equivalente_ha = round(total_co2_tonnes / 200, 1)

    carbon_impact = {
        "total_co2_tonnes": round(total_co2_tonnes, 1),
        "total_hectares_couverts": round(total_hectares, 1),
        "avg_carbon_score": avg_carbon_score,
        "foret_equivalente_ha": foret_equivalente_ha,
        "annual_revenue_xof": annual_revenue_xof,
        "five_year_projection": five_year_projection,
        "parcels_assessed": len(parcels_with_score),
        "total_parcels": total_parcels,
    }

    # ---- 2. CONFORMITE & CERTIFICATIONS ----
    ars_data = await db.ars_farmer_data.find({}, {"_id": 0, "ars_level": 1}).to_list(50000)
    ars_distribution = {"bronze": 0, "argent": 0, "or": 0}
    for f in ars_data:
        level = (f.get("ars_level") or "").lower()
        if level in ars_distribution:
            ars_distribution[level] += 1

    eudr_parcels = await db.parcels.count_documents({"verification_status": "verified"})
    eudr_total = await db.parcels.count_documents({})
    eudr_rate = round(eudr_parcels / max(eudr_total, 1) * 100, 1)

    conformite = {
        "eudr_compliance_rate": eudr_rate,
        "eudr_verified_parcels": eudr_parcels,
        "eudr_total_parcels": eudr_total,
        "ars_distribution": ars_distribution,
        "ars_total_assessed": len(ars_data),
    }

    # ---- 3. IMPACT SOCIAL (SSRTE/ICI) ----
    total_ssrte = await db.ssrte_visits.count_documents({})
    ssrte_with_risk = await db.ssrte_visits.find(
        {}, {"_id": 0, "niveau_risque": 1, "risk_level": 1, "nombre_enfants": 1, "zone": 1, "localite": 1}
    ).to_list(50000)

    risk_dist = {"critique": 0, "eleve": 0, "modere": 0, "faible": 0}
    risk_map = {"high": "eleve", "low": "faible", "medium": "modere", "critical": "critique"}
    total_children = 0
    zones_at_risk = set()
    zones_secured = set()

    for v in ssrte_with_risk:
        risk = v.get("niveau_risque") or v.get("risk_level", "")
        risk_key = risk_map.get(risk, risk)
        if risk_key in risk_dist:
            risk_dist[risk_key] += 1
        enfants = v.get("nombre_enfants", 0) or 0
        total_children += enfants
        zone = v.get("zone") or v.get("localite") or ""
        if zone:
            if risk_key in ("critique", "eleve"):
                zones_at_risk.add(zone)
            elif risk_key == "faible":
                zones_secured.add(zone)

    ici_total = await db.ssrte_cases.count_documents({})
    ici_resolved = await db.ssrte_cases.count_documents({"status": {"$in": ["resolved", "closed"]}})
    ici_in_progress = await db.ssrte_cases.count_documents({"status": "in_progress"})
    ici_rate = round(ici_resolved / max(ici_total, 1) * 100, 1)

    social_impact = {
        "total_ssrte_visits": total_ssrte,
        "risk_distribution": risk_dist,
        "children_identified": total_children,
        "zones_at_risk": len(zones_at_risk),
        "zones_secured": len(zones_secured),
        "ici_total_cases": ici_total,
        "ici_resolved": ici_resolved,
        "ici_in_progress": ici_in_progress,
        "ici_resolution_rate": ici_rate,
    }

    # ---- 4. MRV NATIONAL ----
    total_redd_visits = await db.redd_tracking_visits.count_documents({})
    redd_visits = await db.redd_tracking_visits.find(
        {}, {"_id": 0, "practices_adopted": 1, "conformity_score": 1, "visit_date": 1,
             "zone": 1, "localite": 1, "cooperative_id": 1}
    ).to_list(50000)

    practices_count = {}
    zones_covered = set()
    conformity_scores = []
    monthly_visits = {}

    for v in redd_visits:
        for p in (v.get("practices_adopted") or []):
            cat = p.get("category", "unknown")
            practices_count[cat] = practices_count.get(cat, 0) + 1
        zone = v.get("zone") or v.get("localite") or ""
        if zone:
            zones_covered.add(zone)
        cs = v.get("conformity_score")
        if cs:
            conformity_scores.append(cs)
        vd = v.get("visit_date")
        if vd:
            if isinstance(vd, str):
                month_key = vd[:7]
            else:
                month_key = vd.strftime("%Y-%m")
            monthly_visits[month_key] = monthly_visits.get(month_key, 0) + 1

    avg_conformity = round(sum(conformity_scores) / max(len(conformity_scores), 1), 1)
    mrv_coverage = round(len(parcels_with_score) / max(total_parcels, 1) * 100, 1)

    # Sort monthly visits
    sorted_months = sorted(monthly_visits.items())[-12:]

    mrv_national = {
        "total_redd_visits": total_redd_visits,
        "practices_adoption_by_category": practices_count,
        "zones_covered": len(zones_covered),
        "avg_conformity_score": avg_conformity,
        "mrv_coverage_rate": mrv_coverage,
        "monthly_visit_trends": [{"month": m, "visits": c} for m, c in sorted_months],
    }

    # ---- 5. COOPERATIVES OVERVIEW ----
    total_coops = await db.users.count_documents({"user_type": "cooperative"})
    total_farmers = await db.users.count_documents({"user_type": "farmer"})
    total_agents = await db.users.count_documents({"user_type": "field_agent"})

    cooperatives_overview = {
        "total_cooperatives": total_coops,
        "total_farmers": total_farmers,
        "total_field_agents": total_agents,
    }

    # ---- 6. INVESTOR ATTRACTIVENESS ----
    pipeline_credits = round(total_co2_tonnes * 0.7, 1)  # 70% verifiable
    investor_metrics = {
        "pipeline_credits_tonnes": pipeline_credits,
        "pipeline_value_xof": round(pipeline_credits * price_per_tonne_xof),
        "roi_per_coop_xof": round(pipeline_credits * price_per_tonne_xof / max(total_coops, 1)),
        "five_year_projection": five_year_projection,
        "carbon_price_xof_per_tonne": price_per_tonne_xof,
    }

    return {
        "carbon_impact": carbon_impact,
        "conformite": conformite,
        "social_impact": social_impact,
        "mrv_national": mrv_national,
        "cooperatives": cooperatives_overview,
        "investor_metrics": investor_metrics,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
