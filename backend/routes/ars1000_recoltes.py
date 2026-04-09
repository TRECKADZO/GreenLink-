"""
ARS 1000-2 - Déclarations de Récoltes & Contrôles Qualité
GreenLink Agritech - Côte d'Ivoire

Flux de validation : Planteur déclare -> Coopérative valide/rejette
Contrôles qualité simples à la ferme (humidité, fermentation, corps étrangers)
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ars1000/recoltes", tags=["ARS 1000 - Récoltes"])


# ============= MODELS =============

class ControleQualiteFerme(BaseModel):
    humidite_estimee: str = "normale"  # seche, normale, humide
    fermentation: str = "bonne"  # bonne, moyenne, mauvaise
    corps_etrangers: bool = False
    feves_moisies: bool = False
    feves_germees: bool = False
    aspect_visuel: str = "bon"  # bon, acceptable, mauvais
    odeur: str = "normale"  # normale, acidulee, moisie
    observations: str = ""

class DeclarationRecolte(BaseModel):
    parcelle_id: Optional[str] = None
    parcelle_nom: str = ""
    campagne: str = "2025-2026"
    quantite_kg: float = 0
    unite: str = "kg"  # kg, sacs, tonnes
    quantite_originale: float = 0
    type_cacao: str = "feves_sechees"  # feves_fraiches, feves_sechees, cabosses
    methode_sechage: str = "soleil"  # soleil, four, artificiel
    duree_fermentation_jours: int = 0
    date_recolte: Optional[str] = None
    controle_qualite: ControleQualiteFerme = ControleQualiteFerme()
    notes: str = ""


# ============= HELPERS =============

def calculer_grade_ferme(controle: dict) -> dict:
    """Calcule un grade qualité simple basé sur les contrôles à la ferme"""
    score = 0
    details = []

    # Humidité
    hum = controle.get("humidite_estimee", "normale")
    if hum == "seche":
        score += 3
        details.append("Humidité correcte")
    elif hum == "normale":
        score += 2
        details.append("Humidité acceptable")
    else:
        score += 0
        details.append("Trop humide - séchage requis")

    # Fermentation
    ferm = controle.get("fermentation", "bonne")
    if ferm == "bonne":
        score += 3
        details.append("Fermentation bonne")
    elif ferm == "moyenne":
        score += 1
        details.append("Fermentation moyenne")
    else:
        score += 0
        details.append("Fermentation mauvaise")

    # Corps étrangers
    if not controle.get("corps_etrangers", False):
        score += 2
        details.append("Pas de corps étrangers")
    else:
        details.append("Corps étrangers détectés")

    # Fèves moisies
    if not controle.get("feves_moisies", False):
        score += 1
    else:
        details.append("Fèves moisies détectées")

    # Fèves germées
    if not controle.get("feves_germees", False):
        score += 1
    else:
        details.append("Fèves germées détectées")

    # Aspect visuel
    vis = controle.get("aspect_visuel", "bon")
    if vis == "bon":
        score += 2
    elif vis == "acceptable":
        score += 1

    # Odeur
    od = controle.get("odeur", "normale")
    if od == "normale":
        score += 1
    elif od == "moisie":
        details.append("Odeur de moisissure")

    # Grade
    max_score = 13
    pct = round((score / max_score) * 100)
    if pct >= 80:
        grade = "A"
        label = "Excellente qualité"
    elif pct >= 60:
        grade = "B"
        label = "Bonne qualité"
    elif pct >= 40:
        grade = "C"
        label = "Qualité acceptable"
    else:
        grade = "D"
        label = "Qualité insuffisante"

    return {
        "grade": grade,
        "label": label,
        "score": score,
        "score_max": max_score,
        "pourcentage": pct,
        "details": details,
    }


def serialize_declaration(d: dict) -> dict:
    """Sérialise une déclaration pour la réponse API"""
    return {
        "id": str(d["_id"]),
        "farmer_id": d.get("farmer_id", ""),
        "farmer_name": d.get("farmer_name", ""),
        "coop_id": d.get("coop_id", ""),
        "parcelle_id": d.get("parcelle_id", ""),
        "parcelle_nom": d.get("parcelle_nom", ""),
        "campagne": d.get("campagne", ""),
        "quantite_kg": d.get("quantite_kg", 0),
        "unite": d.get("unite", "kg"),
        "quantite_originale": d.get("quantite_originale", 0),
        "type_cacao": d.get("type_cacao", ""),
        "methode_sechage": d.get("methode_sechage", ""),
        "duree_fermentation_jours": d.get("duree_fermentation_jours", 0),
        "date_recolte": d.get("date_recolte", ""),
        "controle_qualite": d.get("controle_qualite", {}),
        "grade_ferme": d.get("grade_ferme", {}),
        "notes": d.get("notes", ""),
        "statut": d.get("statut", "en_attente"),
        "motif_rejet": d.get("motif_rejet", ""),
        "validated_at": d.get("validated_at", ""),
        "validated_by": d.get("validated_by", ""),
        "controle_coop": d.get("controle_coop", {}),
        "created_at": d.get("created_at", ""),
    }


# ============= ENDPOINTS =============

@router.post("/declaration")
async def creer_declaration(data: DeclarationRecolte, current_user: dict = Depends(get_current_user)):
    """Planteur déclare une récolte avec contrôles qualité à la ferme"""
    user_id = str(current_user["_id"])

    # Convertir en kg si besoin
    quantite_kg = data.quantite_kg
    if data.unite == "tonnes":
        quantite_kg = data.quantite_kg * 1000
    elif data.unite == "sacs":
        quantite_kg = data.quantite_kg * 65

    # Calculer le grade qualité ferme
    controle_dict = data.controle_qualite.model_dump()
    grade = calculer_grade_ferme(controle_dict)

    # Trouver la coopérative du planteur
    coop_id = ""
    member = await db.coop_members.find_one({"user_id": user_id})
    if member:
        coop_id = str(member.get("coop_id", ""))

    doc = {
        "farmer_id": user_id,
        "farmer_name": current_user.get("full_name", ""),
        "coop_id": coop_id,
        "parcelle_id": data.parcelle_id or "",
        "parcelle_nom": data.parcelle_nom,
        "campagne": data.campagne,
        "quantite_kg": quantite_kg,
        "unite": data.unite,
        "quantite_originale": data.quantite_originale or data.quantite_kg,
        "type_cacao": data.type_cacao,
        "methode_sechage": data.methode_sechage,
        "duree_fermentation_jours": data.duree_fermentation_jours,
        "date_recolte": data.date_recolte or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "controle_qualite": controle_dict,
        "grade_ferme": grade,
        "notes": data.notes,
        "statut": "en_attente",
        "motif_rejet": "",
        "validated_at": "",
        "validated_by": "",
        "controle_coop": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await db.ars1000_declarations_recoltes.insert_one(doc)
    doc["_id"] = result.inserted_id

    return serialize_declaration(doc)


@router.get("/declarations")
async def lister_declarations(
    statut: Optional[str] = None,
    campagne: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user)
):
    """Liste les déclarations de récolte (filtrées par rôle)"""
    user_id = str(current_user["_id"])
    user_type = current_user.get("user_type", "")

    query = {}
    if user_type in ("farmer", "planteur", "producteur"):
        query["farmer_id"] = user_id
    elif user_type in ("cooperative", "admin"):
        if user_type == "cooperative":
            query["coop_id"] = user_id
    else:
        query["farmer_id"] = user_id

    if statut:
        query["statut"] = statut
    if campagne:
        query["campagne"] = campagne

    total = await db.ars1000_declarations_recoltes.count_documents(query)
    skip = (page - 1) * limit
    docs = await db.ars1000_declarations_recoltes.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    # Stats
    pipeline = [
        {"$match": {k: v for k, v in query.items() if k != "statut"}},
        {"$group": {
            "_id": "$statut",
            "count": {"$sum": 1},
            "total_kg": {"$sum": "$quantite_kg"},
        }}
    ]
    stats_raw = await db.ars1000_declarations_recoltes.aggregate(pipeline).to_list(10)
    stats = {"en_attente": 0, "validee": 0, "rejetee": 0, "total_kg_valide": 0, "total_kg_attente": 0, "total_kg": 0}
    for s in stats_raw:
        sid = s["_id"]
        if sid == "en_attente":
            stats["en_attente"] = s["count"]
            stats["total_kg_attente"] = s["total_kg"]
        elif sid == "validee":
            stats["validee"] = s["count"]
            stats["total_kg_valide"] = s["total_kg"]
        elif sid == "rejetee":
            stats["rejetee"] = s["count"]
        stats["total_kg"] += s["total_kg"]

    return {
        "declarations": [serialize_declaration(d) for d in docs],
        "stats": stats,
        "total": total,
        "page": page,
    }


@router.put("/declarations/{decl_id}/validate")
async def valider_declaration(decl_id: str, body: dict = None, current_user: dict = Depends(get_current_user)):
    """Coopérative valide une déclaration de récolte"""
    user_type = current_user.get("user_type", "")
    if user_type not in ("cooperative", "admin"):
        raise HTTPException(status_code=403, detail="Seule la coopérative peut valider")

    try:
        oid = ObjectId(decl_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID invalide")

    decl = await db.ars1000_declarations_recoltes.find_one({"_id": oid})
    if not decl:
        raise HTTPException(status_code=404, detail="Déclaration introuvable")

    if decl.get("statut") != "en_attente":
        raise HTTPException(status_code=400, detail="Déclaration déjà traitée")

    controle_coop = {}
    if body:
        controle_coop = body.get("controle_coop", {})

    await db.ars1000_declarations_recoltes.update_one(
        {"_id": oid},
        {"$set": {
            "statut": "validee",
            "validated_at": datetime.now(timezone.utc).isoformat(),
            "validated_by": str(current_user["_id"]),
            "controle_coop": controle_coop,
        }}
    )

    return {"message": "Déclaration validée", "id": decl_id}


@router.put("/declarations/{decl_id}/reject")
async def rejeter_declaration(decl_id: str, body: dict = None, current_user: dict = Depends(get_current_user)):
    """Coopérative rejette une déclaration de récolte"""
    user_type = current_user.get("user_type", "")
    if user_type not in ("cooperative", "admin"):
        raise HTTPException(status_code=403, detail="Seule la coopérative peut rejeter")

    try:
        oid = ObjectId(decl_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID invalide")

    decl = await db.ars1000_declarations_recoltes.find_one({"_id": oid})
    if not decl:
        raise HTTPException(status_code=404, detail="Déclaration introuvable")

    if decl.get("statut") != "en_attente":
        raise HTTPException(status_code=400, detail="Déclaration déjà traitée")

    motif = ""
    if body:
        motif = body.get("motif", "")

    await db.ars1000_declarations_recoltes.update_one(
        {"_id": oid},
        {"$set": {
            "statut": "rejetee",
            "motif_rejet": motif,
            "validated_at": datetime.now(timezone.utc).isoformat(),
            "validated_by": str(current_user["_id"]),
        }}
    )

    return {"message": "Déclaration rejetée", "id": decl_id}


@router.get("/declarations/{decl_id}")
async def get_declaration(decl_id: str, current_user: dict = Depends(get_current_user)):
    """Détail d'une déclaration"""
    try:
        oid = ObjectId(decl_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID invalide")

    decl = await db.ars1000_declarations_recoltes.find_one({"_id": oid})
    if not decl:
        raise HTTPException(status_code=404, detail="Déclaration introuvable")

    return serialize_declaration(decl)


@router.get("/analytics")
async def get_analytics(current_user: dict = Depends(get_current_user)):
    """Tableau de bord analytique des récoltes"""
    user_id = str(current_user["_id"])
    user_type = current_user.get("user_type", "")

    query = {}
    if user_type in ("farmer", "planteur", "producteur"):
        query["farmer_id"] = user_id
    elif user_type == "cooperative":
        query["coop_id"] = user_id

    # Volume par campagne
    vol_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$campagne", "total_kg": {"$sum": "$quantite_kg"}, "count": {"$sum": 1}, "validees": {"$sum": {"$cond": [{"$eq": ["$statut", "validee"]}, 1, 0]}}}},
        {"$sort": {"_id": 1}}
    ]
    vol_data = await db.ars1000_declarations_recoltes.aggregate(vol_pipeline).to_list(20)

    # Qualité moyenne par parcelle
    qual_pipeline = [
        {"$match": {**query, "grade_ferme.pourcentage": {"$exists": True}}},
        {"$group": {"_id": "$parcelle_nom", "avg_qualite": {"$avg": "$grade_ferme.pourcentage"}, "count": {"$sum": 1}, "total_kg": {"$sum": "$quantite_kg"}}},
        {"$sort": {"avg_qualite": -1}}
    ]
    qual_data = await db.ars1000_declarations_recoltes.aggregate(qual_pipeline).to_list(50)

    # Distribution des grades
    grade_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$grade_ferme.grade", "count": {"$sum": 1}, "total_kg": {"$sum": "$quantite_kg"}}},
        {"$sort": {"_id": 1}}
    ]
    grade_data = await db.ars1000_declarations_recoltes.aggregate(grade_pipeline).to_list(10)

    # Evolution mensuelle (derniers 12 mois)
    monthly_pipeline = [
        {"$match": query},
        {"$addFields": {"month": {"$substr": ["$date_recolte", 0, 7]}}},
        {"$group": {"_id": "$month", "total_kg": {"$sum": "$quantite_kg"}, "count": {"$sum": 1}, "avg_qualite": {"$avg": "$grade_ferme.pourcentage"}}},
        {"$sort": {"_id": 1}},
        {"$limit": 12}
    ]
    monthly_data = await db.ars1000_declarations_recoltes.aggregate(monthly_pipeline).to_list(12)

    # Top planteurs (pour coop)
    top_farmers = []
    if user_type in ("cooperative", "admin"):
        top_pipeline = [
            {"$match": {**query, "statut": "validee"}},
            {"$group": {"_id": "$farmer_name", "total_kg": {"$sum": "$quantite_kg"}, "count": {"$sum": 1}, "avg_qualite": {"$avg": "$grade_ferme.pourcentage"}}},
            {"$sort": {"total_kg": -1}},
            {"$limit": 10}
        ]
        top_farmers = await db.ars1000_declarations_recoltes.aggregate(top_pipeline).to_list(10)

    return {
        "volume_par_campagne": [{"campagne": v["_id"], "total_kg": round(v["total_kg"], 1), "count": v["count"], "validees": v.get("validees", 0)} for v in vol_data],
        "qualite_par_parcelle": [{"parcelle": q["_id"] or "N/A", "avg_qualite": round(q["avg_qualite"], 1), "count": q["count"], "total_kg": round(q["total_kg"], 1)} for q in qual_data],
        "distribution_grades": [{"grade": g["_id"] or "N/A", "count": g["count"], "total_kg": round(g["total_kg"], 1)} for g in grade_data],
        "evolution_mensuelle": [{"mois": m["_id"] or "N/A", "total_kg": round(m["total_kg"], 1), "count": m["count"], "avg_qualite": round(m["avg_qualite"] or 0, 1)} for m in monthly_data],
        "top_planteurs": [{"nom": t["_id"] or "N/A", "total_kg": round(t["total_kg"], 1), "count": t["count"], "avg_qualite": round(t["avg_qualite"] or 0, 1)} for t in top_farmers],
    }

