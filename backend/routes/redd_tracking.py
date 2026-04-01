"""
REDD+ Field Agent Tracking - Fiche de suivi REDD+ pour agents terrain
Endpoints for creating and listing REDD+ practice verification visits
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from database import db
from routes.auth import get_current_user
from bson import ObjectId

router = APIRouter(prefix="/api/redd/tracking", tags=["REDD+ Tracking"])

REDD_PRACTICES = [
    {"code": "AGF1", "name": "Arbres d'ombrage (30-50% couverture)", "category": "agroforesterie", "hint": "Verifiez si 30 a 50% de la parcelle est couverte par des arbres. Comptez les grands arbres visibles au-dessus des cacaoyers."},
    {"code": "AGF2", "name": "Systeme agroforestier multi-strates", "category": "agroforesterie", "hint": "Y a-t-il plusieurs niveaux de vegetation ? Ex: herbes au sol, cacaoyers au milieu, grands arbres en haut."},
    {"code": "AGF3", "name": "Enrichissement parcelles", "category": "agroforesterie", "hint": "Le producteur a-t-il plante de nouveaux arbres fruitiers ou forestiers dans sa parcelle recemment ?"},
    {"code": "AGF4", "name": "Transition plein soleil vers ombrage", "category": "agroforesterie", "hint": "Si la parcelle etait en plein soleil avant, le producteur a-t-il commence a planter des arbres d'ombrage ?"},
    {"code": "ZD1", "name": "Intensification durable", "category": "zero_deforestation", "hint": "Le producteur produit-il plus sur la meme surface sans defricher de nouvelles forets ? Ex: taille, engrais bio, nouvelles varietes."},
    {"code": "ZD2", "name": "Engagement zero deforestation", "category": "zero_deforestation", "hint": "Le producteur s'est-il engage a ne plus couper de foret pour agrandir ses parcelles ? A-t-il signe un engagement ?"},
    {"code": "ZD3", "name": "Restauration parcelles degradees", "category": "zero_deforestation", "hint": "Y a-t-il des parcelles abandonnees ou degradees que le producteur est en train de replanter ou restaurer ?"},
    {"code": "ZD4", "name": "Protection forets classees", "category": "zero_deforestation", "hint": "Les parcelles sont-elles eloignees des forets classees ? Le producteur respecte-t-il les limites des zones protegees ?"},
    {"code": "SOL1", "name": "Paillage et compostage", "category": "gestion_sols", "hint": "Y a-t-il des tas de compost ou du paillage (feuilles mortes, cosses de cacao) au pied des arbres ?"},
    {"code": "SOL2", "name": "Biochar", "category": "gestion_sols", "hint": "Le producteur utilise-t-il du charbon vegetal (bois brule sans flamme) melange a la terre pour enrichir le sol ?"},
    {"code": "SOL3", "name": "Couverture vegetale", "category": "gestion_sols", "hint": "Le sol est-il couvert par des plantes basses entre les arbres (pas de sol nu visible) ? Ex: legumineuses, herbes."},
    {"code": "SOL4", "name": "Gestion integree ravageurs", "category": "gestion_sols", "hint": "Le producteur lutte-t-il contre les maladies sans produits chimiques dangereux ? Ex: piegeage, produits naturels, taille sanitaire."},
    {"code": "SOL5", "name": "Taille et elagage sanitaire", "category": "gestion_sols", "hint": "Les cacaoyers sont-ils bien tailles ? Les branches mortes ou malades sont-elles coupees et retirees ?"},
    {"code": "REST1", "name": "Reboisement et regeneration assistee", "category": "restauration", "hint": "Le producteur a-t-il plante de nouveaux arbres forestiers ou aide des jeunes pousses naturelles a grandir ?"},
    {"code": "REST2", "name": "Plantations bois-energie", "category": "restauration", "hint": "Y a-t-il des arbres plantes specialement pour le bois de chauffage afin d'eviter de couper la foret ?"},
    {"code": "REST3", "name": "Protection zones ripariennes", "category": "restauration", "hint": "Les bords de cours d'eau ou de marigots sont-ils proteges avec de la vegetation ? Pas de culture jusqu'au bord de l'eau."},
    {"code": "REST4", "name": "Valorisation residus agricoles", "category": "restauration", "hint": "Les dechets de recolte (cosses, branches) sont-ils reutilises comme compost ou paillage au lieu d'etre brules ?"},
    {"code": "TRAC1", "name": "Enregistrement GPS parcelles", "category": "tracabilite", "hint": "Les parcelles du producteur ont-elles ete cartographiees avec un GPS ? Les polygones sont-ils enregistres ?"},
    {"code": "TRAC2", "name": "Safeguards sociaux", "category": "tracabilite", "hint": "Pas de travail d'enfants, pas de travail force. Les travailleurs ont-ils des conditions correctes ?"},
    {"code": "TRAC3", "name": "Monitoring MRV", "category": "tracabilite", "hint": "Le producteur participe-t-il au suivi regulier (Mesure, Reporting, Verification) de ses pratiques ?"},
    {"code": "TRAC4", "name": "Certification Cacao Durable", "category": "tracabilite", "hint": "Le producteur est-il certifie ou en cours de certification pour la norme cacao durable (Bronze/Argent/Or) ?"},
]


def verify_agent_or_coop(user: dict):
    valid_types = ['field_agent', 'agent_terrain', 'cooperative', 'admin', 'carbon_auditor']
    valid_roles = ['field_agent', 'ssrte_agent', 'carbon_auditor']
    user_type = user.get('user_type', '')
    user_roles = user.get('roles', [])
    if user_type not in valid_types and not any(r in user_roles for r in valid_roles):
        raise HTTPException(status_code=403, detail="Acces reserve aux agents terrain et cooperatives")


@router.get("/practices-list")
async def get_redd_practices_list():
    """Return all REDD+ practices for tracking form."""
    return {"practices": REDD_PRACTICES}


@router.post("/visit")
async def create_redd_tracking_visit(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create a new REDD+ tracking visit (fiche de suivi)."""
    verify_agent_or_coop(current_user)

    farmer_id = data.get("farmer_id")
    if not farmer_id:
        raise HTTPException(status_code=400, detail="farmer_id requis")

    practices_verified = data.get("practices_verified", [])
    
    # Calculate scores
    categories = {}
    for p in practices_verified:
        cat = p.get("category", "autre")
        if cat not in categories:
            categories[cat] = {"verified": 0, "partial": 0, "non_conforme": 0, "total": 0}
        categories[cat]["total"] += 1
        if p.get("status") == "conforme":
            categories[cat]["verified"] += 1
        elif p.get("status") == "partiellement":
            categories[cat]["partial"] += 1
        elif p.get("status") == "non_conforme":
            categories[cat]["non_conforme"] += 1

    total_conforme = sum(1 for p in practices_verified if p.get("status") == "conforme")
    total_partiel = sum(1 for p in practices_verified if p.get("status") == "partiellement")
    total_non_conforme = sum(1 for p in practices_verified if p.get("status") == "non_conforme")
    total_checked = total_conforme + total_partiel + total_non_conforme
    conformity_pct = round((total_conforme + total_partiel * 0.5) / max(total_checked, 1) * 100)

    # REDD+ score estimation
    redd_score = 0
    for p in practices_verified:
        status = p.get("status", "")
        if status == "non_applicable":
            continue
        cat = p.get("category", "")
        weight = {"agroforesterie": 0.75, "zero_deforestation": 0.5, "gestion_sols": 0.5, "restauration": 0.375, "tracabilite": 0.25}.get(cat, 0.3)
        if status == "conforme":
            redd_score += weight
        elif status == "partiellement":
            redd_score += weight * 0.5
    redd_score = min(round(redd_score, 1), 10)

    if redd_score >= 8:
        redd_level = "Excellence"
    elif redd_score >= 6:
        redd_level = "Avance"
    elif redd_score >= 4:
        redd_level = "Intermediaire"
    elif redd_score >= 2:
        redd_level = "Debutant"
    else:
        redd_level = "Non conforme"

    # Resolve coop_id: explicit > user.coop_id > user._id (for cooperative/admin users)
    resolved_coop_id = data.get("coop_id") or current_user.get("coop_id") or ""
    if not resolved_coop_id and current_user.get("user_type") in ("cooperative", "admin"):
        resolved_coop_id = str(current_user.get("_id", ""))
    # For field agents, resolve from cooperative_id field
    if not resolved_coop_id:
        resolved_coop_id = current_user.get("cooperative_id", "")

    visit_doc = {
        "farmer_id": farmer_id,
        "farmer_name": data.get("farmer_name", ""),
        "farmer_phone": data.get("farmer_phone", ""),
        "coop_id": resolved_coop_id,
        "cooperative_id": resolved_coop_id,
        "coop_name": data.get("coop_name") or current_user.get("coop_name", ""),
        "agent_id": str(current_user.get("_id", "")),
        "agent_name": current_user.get("full_name", ""),
        "date_visite": data.get("date_visite") or datetime.now(timezone.utc).isoformat(),
        "practices_verified": practices_verified,
        "total_checked": total_checked,
        "total_conforme": total_conforme,
        "total_partiel": total_partiel,
        "total_non_conforme": total_non_conforme,
        "conformity_pct": conformity_pct,
        "redd_score": redd_score,
        "redd_level": redd_level,
        "categories_summary": categories,
        "superficie_verifiee": data.get("superficie_verifiee", 0),
        "arbres_comptes": data.get("arbres_comptes", 0),
        "observations": data.get("observations", ""),
        "recommandations": data.get("recommandations", ""),
        "suivi_requis": data.get("suivi_requis", False),
        "photos_count": data.get("photos_count", 0),
        "gps_lat": data.get("gps_lat"),
        "gps_lon": data.get("gps_lon"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await db.redd_tracking_visits.insert_one(visit_doc)
    visit_doc.pop("_id", None)

    # Update farmer's REDD+ data in ars_farmer_data
    await db.ars_farmer_data.update_one(
        {"farmer_id": farmer_id},
        {"$set": {
            "score_redd": redd_score,
            "redd_level": redd_level,
            "last_redd_visit": datetime.now(timezone.utc).isoformat(),
            "redd_practices_conforme": total_conforme,
            "redd_practices_partiel": total_partiel,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=False
    )

    return {
        "message": "Fiche de suivi environnemental enregistree avec succes",
        "visit_id": str(result.inserted_id),
        "redd_score": redd_score,
        "redd_level": redd_level,
        "conformity_pct": conformity_pct,
        "total_conforme": total_conforme,
        "total_partiel": total_partiel,
        "total_non_conforme": total_non_conforme,
    }


@router.get("/visits")
async def get_redd_tracking_visits(
    current_user: dict = Depends(get_current_user),
    farmer_id: str = Query(None),
    coop_id: str = Query(None),
    limit: int = Query(50),
):
    """List REDD+ tracking visits."""
    verify_agent_or_coop(current_user)

    query = {}
    if farmer_id:
        query["farmer_id"] = farmer_id
    if coop_id:
        query["coop_id"] = coop_id
    elif current_user.get("user_type") in ("field_agent", "agent_terrain"):
        query["agent_id"] = str(current_user.get("_id", ""))
    elif current_user.get("user_type") == "cooperative":
        query["coop_id"] = current_user.get("coop_id") or str(current_user.get("_id", ""))

    visits = await db.redd_tracking_visits.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"visits": visits, "count": len(visits)}


@router.get("/stats")
async def get_redd_tracking_stats(
    current_user: dict = Depends(get_current_user),
    coop_id: str = Query(None),
):
    """Get REDD+ tracking statistics for dashboard."""
    verify_agent_or_coop(current_user)

    query = {}
    if coop_id:
        query["coop_id"] = coop_id
    elif current_user.get("user_type") in ("field_agent", "agent_terrain"):
        query["agent_id"] = str(current_user.get("_id", ""))
    elif current_user.get("user_type") == "cooperative":
        query["coop_id"] = current_user.get("coop_id") or str(current_user.get("_id", ""))

    visits = await db.redd_tracking_visits.find(query, {"_id": 0}).to_list(2000)
    total_visits = len(visits)

    if total_visits == 0:
        return {
            "total_visits": 0,
            "avg_conformity": 0,
            "avg_redd_score": 0,
            "level_distribution": {},
            "recent_visits": [],
        }

    avg_conformity = round(sum(v.get("conformity_pct", 0) for v in visits) / total_visits)
    avg_redd = round(sum(v.get("redd_score", 0) for v in visits) / total_visits, 1)

    level_dist = {}
    for v in visits:
        lvl = v.get("redd_level", "Non conforme")
        level_dist[lvl] = level_dist.get(lvl, 0) + 1

    recent = sorted(visits, key=lambda x: x.get("created_at", ""), reverse=True)[:5]

    return {
        "total_visits": total_visits,
        "avg_conformity": avg_conformity,
        "avg_redd_score": avg_redd,
        "level_distribution": level_dist,
        "recent_visits": [{
            "farmer_name": v.get("farmer_name", ""),
            "date_visite": v.get("date_visite", ""),
            "redd_score": v.get("redd_score", 0),
            "redd_level": v.get("redd_level", ""),
            "conformity_pct": v.get("conformity_pct", 0),
        } for v in recent],
    }
