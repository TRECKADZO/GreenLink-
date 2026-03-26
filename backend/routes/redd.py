"""
REDD+ API Routes - Monitoring, Reporting, Verification (MRV)
Endpoints for REDD+ practices tracking, scoring, and MRV data
"""
from fastapi import APIRouter, Depends, Query
from datetime import datetime, timezone
from database import db

router = APIRouter(prefix="/api/redd", tags=["REDD+ MRV"])


def calculate_redd_score(answers: dict) -> dict:
    """
    Calculate REDD+ compliance score based on adopted practices.
    Categories: agroforesterie, zero-deforestation, gestion-sols, restauration, tracabilite
    """
    score = 0
    max_score = 10
    practices_adopted = []
    recommendations = []

    # 1. Agroforesterie (max 3.0)
    agroforesterie_score = 0
    arbres_par_ha = float(answers.get("arbres_par_ha", 0))
    if answers.get("agroforesterie") == "oui":
        agroforesterie_score += 1.0
        practices_adopted.append("Agroforesterie active")
    if arbres_par_ha >= 60:
        agroforesterie_score += 1.5
        practices_adopted.append("Couverture ombragee excellente")
    elif arbres_par_ha >= 30:
        agroforesterie_score += 1.0
        practices_adopted.append("Couverture ombragee bonne")
    elif arbres_par_ha >= 15:
        agroforesterie_score += 0.5
    else:
        recommendations.append("Plantez plus d'arbres d'ombrage (objectif: 30-60/ha)")
    if answers.get("diversification") == "oui":
        agroforesterie_score += 0.5
        practices_adopted.append("Diversification agroforestiere")
    score += min(agroforesterie_score, 3.0)

    # 2. Zero-deforestation (max 2.0)
    deforest_score = 0
    if answers.get("zero_deforestation") == "oui":
        deforest_score += 1.0
        practices_adopted.append("Engagement zero-deforestation")
    else:
        recommendations.append("Engagez-vous a ne pas etendre sur les forets")
    if answers.get("restauration_degradees") == "oui":
        deforest_score += 0.5
        practices_adopted.append("Restauration parcelles degradees")
    if answers.get("intensification_durable") == "oui":
        deforest_score += 0.5
        practices_adopted.append("Intensification durable")
    score += min(deforest_score, 2.0)

    # 3. Gestion sols bas-carbone (max 2.5)
    sols_score = 0
    if answers.get("compost") == "oui":
        sols_score += 0.7
        practices_adopted.append("Compostage/paillage")
    else:
        recommendations.append("Adoptez le compostage pour ameliorer la fertilite")
    if answers.get("couverture_sol") == "oui":
        sols_score += 0.5
        practices_adopted.append("Couverture vegetale")
    if answers.get("biochar") == "oui":
        sols_score += 0.5
        practices_adopted.append("Utilisation biochar")
    if answers.get("gestion_ravageurs") == "oui":
        sols_score += 0.4
        practices_adopted.append("Gestion integree ravageurs")
    if answers.get("engrais") == "non" or answers.get("engrais_chimique") == "non":
        sols_score += 0.4
        practices_adopted.append("Pas d'engrais chimiques")
    score += min(sols_score, 2.5)

    # 4. Restauration/conservation (max 1.5)
    resto_score = 0
    if answers.get("brulage") == "non":
        resto_score += 0.5
        practices_adopted.append("Pas de brulage")
    else:
        recommendations.append("Arretez le brulage des residus agricoles")
    if answers.get("reboisement") == "oui":
        resto_score += 0.5
        practices_adopted.append("Reboisement actif")
    if answers.get("protection_zones") == "oui":
        resto_score += 0.5
        practices_adopted.append("Protection zones fragiles")
    score += min(resto_score, 1.5)

    # 5. Tracabilite (max 1.0)
    trace_score = 0
    if answers.get("gps_parcelles") == "oui":
        trace_score += 0.5
        practices_adopted.append("Parcelles georeferencees")
    if answers.get("safeguards") == "oui":
        trace_score += 0.5
        practices_adopted.append("Safeguards respectes")
    score += min(trace_score, 1.0)

    score = round(min(score, max_score), 1)

    # Level
    if score >= 8:
        level = "Excellence"
        level_label = "Excellence REDD+"
    elif score >= 6:
        level = "Avance"
        level_label = "Avance REDD+"
    elif score >= 4:
        level = "Intermediaire"
        level_label = "Intermediaire REDD+"
    elif score >= 2:
        level = "Debutant"
        level_label = "Debutant REDD+"
    else:
        level = "Non conforme"
        level_label = "Non conforme REDD+"

    return {
        "score": score,
        "max_score": max_score,
        "level": level,
        "level_label": level_label,
        "practices_adopted": practices_adopted,
        "practices_count": len(practices_adopted),
        "recommendations": recommendations[:3],
    }


@router.get("/practices")
async def get_redd_practices():
    """Return all REDD+ practices categories and details."""
    return {
        "categories": [
            {
                "id": "agroforesterie",
                "title": "Agroforesterie",
                "practices_count": 4,
                "max_bonus": 3.0,
            },
            {
                "id": "zero-deforestation",
                "title": "Zero-Deforestation",
                "practices_count": 4,
                "max_bonus": 2.0,
            },
            {
                "id": "gestion-sols",
                "title": "Gestion Sols Bas-Carbone",
                "practices_count": 5,
                "max_bonus": 2.5,
            },
            {
                "id": "restauration",
                "title": "Restauration et Conservation",
                "practices_count": 4,
                "max_bonus": 1.5,
            },
            {
                "id": "tracabilite",
                "title": "Tracabilite et Conformite",
                "practices_count": 4,
                "max_bonus": 1.0,
            },
        ],
        "total_practices": 21,
        "max_score": 10,
    }


@router.get("/mrv/summary")
async def get_mrv_summary(coop_id: str = Query(None)):
    """MRV summary: aggregate REDD+ data for cooperatives/auditors."""
    query = {}
    if coop_id:
        query["coop_id"] = coop_id

    # Get all ARS farmer data (which contains practice info)
    farmers = await db.ars_farmer_data.find(query, {"_id": 0}).to_list(2000)

    total = len(farmers)
    if total == 0:
        return {
            "total_farmers": 0,
            "practices_summary": {},
            "avg_score": 0,
            "ars_distribution": {},
            "coverage": {"agroforesterie": 0, "compost": 0, "couverture_sol": 0, "zero_brulage": 0},
            "total_hectares": 0,
            "total_arbres": 0,
        }

    # Aggregate practice adoption
    agroforesterie_count = sum(1 for f in farmers if f.get("agroforesterie") == "oui")
    compost_count = sum(1 for f in farmers if f.get("compost") == "oui")
    couverture_count = sum(1 for f in farmers if f.get("couverture_sol") == "oui")
    zero_brulage = sum(1 for f in farmers if f.get("brulage") == "non")
    zero_engrais = sum(1 for f in farmers if f.get("engrais") == "non")

    total_hectares = sum(float(f.get("hectares", 0)) for f in farmers)
    total_arbres = sum(int(f.get("arbres_total", 0)) for f in farmers)
    avg_score = round(sum(float(f.get("score_carbone", 0)) for f in farmers) / max(total, 1), 1)

    # ARS distribution
    ars_dist = {}
    for f in farmers:
        level = f.get("ars_level", "Non conforme")
        ars_dist[level] = ars_dist.get(level, 0) + 1

    # REDD+ score distribution (based on practices)
    redd_scores = []
    for f in farmers:
        rs = 0
        if f.get("agroforesterie") == "oui":
            rs += 1.5
        if f.get("compost") == "oui":
            rs += 1.0
        if f.get("couverture_sol") == "oui":
            rs += 0.5
        if f.get("brulage") == "non":
            rs += 1.0
        if f.get("engrais") == "non":
            rs += 0.5
        arbres = int(f.get("arbres_total", 0))
        ha = float(f.get("hectares", 1))
        aph = arbres / max(ha, 0.1)
        if aph >= 60:
            rs += 1.5
        elif aph >= 30:
            rs += 1.0
        elif aph >= 15:
            rs += 0.5
        redd_scores.append(min(round(rs, 1), 10))

    avg_redd = round(sum(redd_scores) / max(len(redd_scores), 1), 1)

    return {
        "total_farmers": total,
        "total_hectares": round(total_hectares, 1),
        "total_arbres": total_arbres,
        "avg_score_carbone": avg_score,
        "avg_score_redd": avg_redd,
        "practices_adoption": {
            "agroforesterie": {"count": agroforesterie_count, "pct": round(agroforesterie_count / total * 100)},
            "compost": {"count": compost_count, "pct": round(compost_count / total * 100)},
            "couverture_sol": {"count": couverture_count, "pct": round(couverture_count / total * 100)},
            "zero_brulage": {"count": zero_brulage, "pct": round(zero_brulage / total * 100)},
            "zero_engrais": {"count": zero_engrais, "pct": round(zero_engrais / total * 100)},
        },
        "ars_distribution": ars_dist,
        "redd_level_distribution": {
            "excellence": sum(1 for s in redd_scores if s >= 8),
            "avance": sum(1 for s in redd_scores if 6 <= s < 8),
            "intermediaire": sum(1 for s in redd_scores if 4 <= s < 6),
            "debutant": sum(1 for s in redd_scores if 2 <= s < 4),
            "non_conforme": sum(1 for s in redd_scores if s < 2),
        },
    }


@router.get("/mrv/farmers")
async def get_mrv_farmers(coop_id: str = Query(None), limit: int = Query(50)):
    """Get individual farmer REDD+ data for MRV dashboard."""
    query = {}
    if coop_id:
        query["coop_id"] = coop_id

    farmers = await db.ars_farmer_data.find(query, {"_id": 0}).sort("updated_at", -1).limit(limit).to_list(limit)

    result = []
    for f in farmers:
        # Calculate REDD+ score for each farmer
        rs = 0
        practices = []
        if f.get("agroforesterie") == "oui":
            rs += 1.5
            practices.append("Agroforesterie")
        if f.get("compost") == "oui":
            rs += 1.0
            practices.append("Compost")
        if f.get("couverture_sol") == "oui":
            rs += 0.5
            practices.append("Couverture sol")
        if f.get("brulage") == "non":
            rs += 1.0
            practices.append("Zero brulage")
        if f.get("engrais") == "non":
            rs += 0.5
            practices.append("Zero engrais")
        arbres = int(f.get("arbres_total", 0))
        ha = float(f.get("hectares", 1))
        aph = arbres / max(ha, 0.1)
        if aph >= 60:
            rs += 1.5
            practices.append("Ombrage excellent")
        elif aph >= 30:
            rs += 1.0
            practices.append("Ombrage bon")
        elif aph >= 15:
            rs += 0.5
            practices.append("Ombrage moyen")
        rs = min(round(rs, 1), 10)

        if rs >= 8:
            level = "Excellence"
        elif rs >= 6:
            level = "Avance"
        elif rs >= 4:
            level = "Intermediaire"
        elif rs >= 2:
            level = "Debutant"
        else:
            level = "Non conforme"

        result.append({
            "farmer_id": f.get("farmer_id", ""),
            "farmer_name": f.get("farmer_name", ""),
            "phone": f.get("phone", ""),
            "coop_name": f.get("coop_name", ""),
            "hectares": f.get("hectares", 0),
            "arbres_total": f.get("arbres_total", 0),
            "score_carbone": f.get("score_carbone", 0),
            "ars_level": f.get("ars_level", ""),
            "redd_score": rs,
            "redd_level": level,
            "practices": practices,
            "updated_at": f.get("updated_at", ""),
        })

    return {"farmers": result, "count": len(result)}
