"""
Module Gestion des Risques & Durabilite - ARS 1000
Clauses 6.1, 6.2

Registre des risques, matrice, plan de mitigation, indicateurs environnementaux.
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone
import logging
import io
import uuid

from database import db
from routes.auth import get_current_user
from routes.cooperative import verify_cooperative

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/risques", tags=["Risques & Durabilite"])

CATEGORIES_RISQUES = [
    {"code": "ENVIRONNEMENT", "label": "Environnement", "exemples": "Deforestation, degradation sols, pollution eau, perte biodiversite"},
    {"code": "SOCIAL", "label": "Social", "exemples": "Travail enfants, travail force, discrimination, SST"},
    {"code": "ECONOMIQUE", "label": "Economique", "exemples": "Volatilite prix, acces marche, endettement producteurs"},
    {"code": "CLIMATIQUE", "label": "Climatique", "exemples": "Secheresse, inondations, maladies cacaoyer, temperature"},
    {"code": "GOUVERNANCE", "label": "Gouvernance", "exemples": "Corruption, transparence, conformite reglementaire"},
    {"code": "TRACABILITE", "label": "Tracabilite", "exemples": "Melange lots, perte tracabilite, fraude origine"},
]

NIVEAUX_PROBABILITE = ["Rare", "Peu probable", "Possible", "Probable", "Quasi certain"]
NIVEAUX_IMPACT = ["Negligeable", "Mineur", "Modere", "Majeur", "Critique"]


def get_coop_id(user):
    return str(user.get("coop_id") or user.get("_id") or user.get("id", ""))


class RisqueCreate(BaseModel):
    titre: str
    categorie: str = ""
    description: str = ""
    probabilite: str = "Possible"
    impact: str = "Modere"
    zone: str = ""
    parties_prenantes: str = ""
    cause_racine: str = ""

class RisqueUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    probabilite: Optional[str] = None
    impact: Optional[str] = None
    statut: Optional[str] = None
    zone: Optional[str] = None

class MitigationCreate(BaseModel):
    risque_id: str
    action: str
    responsable: str = ""
    echeance: str = ""
    ressources: str = ""

class IndicateurCreate(BaseModel):
    nom: str
    categorie: str = "ENVIRONNEMENT"
    valeur: float = 0
    unite: str = ""
    cible: float = 0
    periode: str = ""


def _score_risque(probabilite: str, impact: str) -> int:
    p = NIVEAUX_PROBABILITE.index(probabilite) + 1 if probabilite in NIVEAUX_PROBABILITE else 3
    i = NIVEAUX_IMPACT.index(impact) + 1 if impact in NIVEAUX_IMPACT else 3
    return p * i

def _niveau_risque(score: int) -> str:
    if score >= 16: return "Critique"
    if score >= 9: return "Eleve"
    if score >= 4: return "Moyen"
    return "Faible"


# ============= RISQUES CRUD =============

@router.post("/registre")
async def create_risque(data: RisqueCreate, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    score = _score_risque(data.probabilite, data.impact)
    doc = {
        "risque_id": str(uuid.uuid4()),
        "coop_id": coop_id,
        "titre": data.titre,
        "categorie": data.categorie,
        "description": data.description,
        "probabilite": data.probabilite,
        "impact": data.impact,
        "score": score,
        "niveau": _niveau_risque(score),
        "zone": data.zone,
        "parties_prenantes": data.parties_prenantes,
        "cause_racine": data.cause_racine,
        "statut": "ouvert",
        "mitigations": [],
        "created_by": current_user.get("full_name", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.risques_registre.insert_one(doc)
    doc.pop("_id", None)
    return {"status": "success", "risque": doc}


@router.get("/registre")
async def list_risques(
    current_user: dict = Depends(get_current_user),
    categorie: Optional[str] = None,
    statut: Optional[str] = None,
    niveau: Optional[str] = None,
):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)
    query = {"coop_id": coop_id}
    if categorie: query["categorie"] = categorie
    if statut: query["statut"] = statut
    if niveau: query["niveau"] = niveau

    risques = await db.risques_registre.find(query, {"_id": 0}).sort("score", -1).to_list(200)

    total = len(risques)
    critiques = sum(1 for r in risques if r.get("niveau") == "Critique")
    eleves = sum(1 for r in risques if r.get("niveau") == "Eleve")
    moyens = sum(1 for r in risques if r.get("niveau") == "Moyen")
    faibles = sum(1 for r in risques if r.get("niveau") == "Faible")
    ouverts = sum(1 for r in risques if r.get("statut") == "ouvert")
    mitigees = sum(1 for r in risques if r.get("statut") == "mitige")

    return {
        "risques": risques,
        "stats": {"total": total, "critiques": critiques, "eleves": eleves, "moyens": moyens, "faibles": faibles, "ouverts": ouverts, "mitigees": mitigees},
    }


@router.put("/registre/{risque_id}")
async def update_risque(risque_id: str, update: RisqueUpdate, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if "probabilite" in update_data or "impact" in update_data:
        r = await db.risques_registre.find_one({"risque_id": risque_id, "coop_id": coop_id})
        if r:
            prob = update_data.get("probabilite", r.get("probabilite", "Possible"))
            imp = update_data.get("impact", r.get("impact", "Modere"))
            score = _score_risque(prob, imp)
            update_data["score"] = score
            update_data["niveau"] = _niveau_risque(score)

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.risques_registre.update_one(
        {"risque_id": risque_id, "coop_id": coop_id}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Risque non trouve")

    r = await db.risques_registre.find_one({"risque_id": risque_id}, {"_id": 0})
    return {"status": "success", "risque": r}


# ============= MITIGATIONS =============

@router.post("/registre/{risque_id}/mitigation")
async def add_mitigation(risque_id: str, data: MitigationCreate, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    mit = {
        "mitigation_id": str(uuid.uuid4()),
        "action": data.action,
        "responsable": data.responsable,
        "echeance": data.echeance,
        "ressources": data.ressources,
        "statut": "planifie",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await db.risques_registre.update_one(
        {"risque_id": risque_id, "coop_id": coop_id},
        {"$push": {"mitigations": mit}, "$set": {"statut": "en_mitigation", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Risque non trouve")

    return {"status": "success", "mitigation": mit}


# ============= INDICATEURS =============

@router.post("/indicateurs")
async def add_indicateur(data: IndicateurCreate, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    doc = {
        "indicateur_id": str(uuid.uuid4()),
        "coop_id": coop_id,
        "nom": data.nom,
        "categorie": data.categorie,
        "valeur": data.valeur,
        "unite": data.unite,
        "cible": data.cible,
        "periode": data.periode or datetime.now(timezone.utc).strftime("%Y-%m"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.risques_indicateurs.insert_one(doc)
    doc.pop("_id", None)
    return {"status": "success", "indicateur": doc}


@router.get("/indicateurs")
async def list_indicateurs(current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)
    inds = await db.risques_indicateurs.find({"coop_id": coop_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"indicateurs": inds}


# ============= DASHBOARD =============

@router.get("/dashboard")
async def get_risques_dashboard(current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    risques = await db.risques_registre.find({"coop_id": coop_id}, {"_id": 0}).to_list(200)
    indicateurs = await db.risques_indicateurs.find({"coop_id": coop_id}, {"_id": 0}).to_list(200)

    total = len(risques)
    critiques = sum(1 for r in risques if r.get("niveau") == "Critique")
    eleves = sum(1 for r in risques if r.get("niveau") == "Eleve")
    ouverts = sum(1 for r in risques if r.get("statut") == "ouvert")
    mitigees = sum(1 for r in risques if r.get("statut") == "mitige")

    # Matrice par categorie
    par_categorie = {}
    for r in risques:
        cat = r.get("categorie", "Autre")
        if cat not in par_categorie:
            par_categorie[cat] = {"count": 0, "score_moyen": 0, "critiques": 0}
        par_categorie[cat]["count"] += 1
        par_categorie[cat]["score_moyen"] += r.get("score", 0)
        if r.get("niveau") == "Critique":
            par_categorie[cat]["critiques"] += 1
    for cat in par_categorie:
        par_categorie[cat]["score_moyen"] = round(par_categorie[cat]["score_moyen"] / par_categorie[cat]["count"], 1)

    categories_list = [{"categorie": k, **v} for k, v in par_categorie.items()]

    return {
        "kpis": {
            "total": total, "critiques": critiques, "eleves": eleves,
            "ouverts": ouverts, "mitigees": mitigees,
            "indicateurs": len(indicateurs),
        },
        "par_categorie": categories_list,
        "categories_reference": CATEGORIES_RISQUES,
        "top_risques": sorted(risques, key=lambda x: x.get("score", 0), reverse=True)[:5],
    }


# ============= REFERENCE =============

@router.get("/reference/categories")
async def get_categories():
    return {"categories": CATEGORIES_RISQUES}

@router.get("/reference/niveaux")
async def get_niveaux():
    return {"probabilite": NIVEAUX_PROBABILITE, "impact": NIVEAUX_IMPACT}
