"""
ARS 1000-2 - Traçabilité & Qualité des Lots de Cacao
GreenLink Agritech - Côte d'Ivoire

Gestion des lots, contrôles qualité, ségrégation et rapports d'essai
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user
from routes.cooperative import verify_cooperative

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ars1000/lots", tags=["ARS 1000 - Traçabilité"])


# ============= MODELS =============

class ControleHumidite(BaseModel):
    taux_humidite: float = 0  # Max 8%
    conforme: bool = False
    methode: str = "four"  # four, humidimetre
    date_controle: Optional[str] = None

class ControleTamisage(BaseModel):
    taux_debris: float = 0  # Max 1.5%
    conforme: bool = False
    date_controle: Optional[str] = None

class ControleCorpsEtrangers(BaseModel):
    taux_corps_etrangers: float = 0  # Max 0.75%
    taux_elements_connexes: float = 0  # Max 3.5%
    taux_feves_plates: float = 0  # Max 1.5%
    conforme: bool = False
    date_controle: Optional[str] = None

class EpreuveCoupe(BaseModel):
    nombre_feves: int = 300
    moisies_pct: float = 0
    ardoisees_pct: float = 0
    insectes_germees_pct: float = 0
    violettes_pct: float = 0
    grade: str = ""  # Grade 1, 2, 3, SS/HS
    date_controle: Optional[str] = None

class ControleFermentation(BaseModel):
    type_fermentation: str = ""  # bonne, satisfaisante, sous-grade
    duree_jours: int = 0
    temperature_max: Optional[float] = None
    observations: str = ""
    date_controle: Optional[str] = None

class ControlesQualite(BaseModel):
    humidite: ControleHumidite = ControleHumidite()
    tamisage: ControleTamisage = ControleTamisage()
    corps_etrangers: ControleCorpsEtrangers = ControleCorpsEtrangers()
    epreuve_coupe: EpreuveCoupe = EpreuveCoupe()
    fermentation: ControleFermentation = ControleFermentation()
    score_qualite_global: float = 0
    conforme_global: bool = False

class LotCreate(BaseModel):
    parcelle_ids: List[str] = []
    farmer_ids: List[str] = []
    poids_total_kg: float = 0
    type_produit: str = "cacao"
    campagne: str = ""  # 2025-2026
    origine_village: str = ""
    origine_region: str = ""
    controles_qualite: ControlesQualite = ControlesQualite()
    segregation_physique: bool = False
    marquage: dict = {}
    notes: str = ""

class LotUpdate(BaseModel):
    poids_total_kg: Optional[float] = None
    controles_qualite: Optional[ControlesQualite] = None
    segregation_physique: Optional[bool] = None
    marquage: Optional[dict] = None
    notes: Optional[str] = None


# ============= HELPERS =============

def calculate_grade(epreuve: dict) -> str:
    """Détermine le grade selon ARS 1000-2 Table 2"""
    moisies = epreuve.get("moisies_pct", 0)
    ardoisees = epreuve.get("ardoisees_pct", 0)
    insectes = epreuve.get("insectes_germees_pct", 0)

    if moisies <= 1 and ardoisees <= 3 and insectes <= 5:
        return "Grade 1"
    elif moisies <= 2 and ardoisees <= 4 and insectes <= 8:
        return "Grade 2"
    elif moisies <= 3 and ardoisees <= 6 and insectes <= 6:
        return "Grade 3"
    else:
        return "Sous-grade (HS)"


def calculate_qualite_score(controles: dict) -> tuple:
    """Calcule le score qualité global et la conformité"""
    score = 0
    total = 5
    
    h = controles.get("humidite", {})
    if h.get("taux_humidite", 100) <= 8:
        score += 1
    
    t = controles.get("tamisage", {})
    if t.get("taux_debris", 100) <= 1.5:
        score += 1
    
    ce = controles.get("corps_etrangers", {})
    if ce.get("taux_corps_etrangers", 100) <= 0.75:
        score += 1
    
    ec = controles.get("epreuve_coupe", {})
    if ec.get("grade", "").startswith("Grade"):
        score += 1
    
    f = controles.get("fermentation", {})
    if f.get("type_fermentation") in ("bonne", "satisfaisante"):
        score += 1
    
    pct = round((score / total) * 100, 1)
    return pct, pct >= 60


def serialize_lot(lot: dict) -> dict:
    return {
        "id": str(lot["_id"]),
        "lot_code": lot.get("lot_code", ""),
        "coop_id": lot.get("coop_id", ""),
        "parcelle_ids": lot.get("parcelle_ids", []),
        "farmer_ids": lot.get("farmer_ids", []),
        "poids_total_kg": lot.get("poids_total_kg", 0),
        "type_produit": lot.get("type_produit", "cacao"),
        "campagne": lot.get("campagne", ""),
        "origine_village": lot.get("origine_village", ""),
        "origine_region": lot.get("origine_region", ""),
        "controles_qualite": lot.get("controles_qualite", {}),
        "segregation_physique": lot.get("segregation_physique", False),
        "marquage": lot.get("marquage", {}),
        "statut": lot.get("statut", "reception"),
        "rapport_essai": lot.get("rapport_essai"),
        "notes": lot.get("notes", ""),
        "created_at": lot.get("created_at", ""),
        "updated_at": lot.get("updated_at", ""),
    }


# ============= ENDPOINTS =============

@router.post("")
async def create_lot(data: LotCreate, current_user: dict = Depends(get_current_user)):
    """Enregistrer un nouveau lot avec contrôles qualité"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])

    # Generate lot code
    count = await db.lots_traceabilite.count_documents({"coop_id": coop_id})
    campagne = data.campagne or f"{datetime.now().year}-{datetime.now().year + 1}"
    lot_code = f"LOT-{coop_id[-4:]}-{campagne[-4:]}-{count + 1:04d}"

    # Auto-calculate grade and quality
    controles = data.controles_qualite.model_dump()
    controles["epreuve_coupe"]["grade"] = calculate_grade(controles.get("epreuve_coupe", {}))
    pct, conforme = calculate_qualite_score(controles)
    controles["score_qualite_global"] = pct
    controles["conforme_global"] = conforme

    # Auto-set conformity flags
    controles["humidite"]["conforme"] = controles["humidite"].get("taux_humidite", 100) <= 8
    controles["tamisage"]["conforme"] = controles["tamisage"].get("taux_debris", 100) <= 1.5
    ce = controles["corps_etrangers"]
    ce["conforme"] = (ce.get("taux_corps_etrangers", 100) <= 0.75 and
                      ce.get("taux_elements_connexes", 100) <= 3.5 and
                      ce.get("taux_feves_plates", 100) <= 1.5)

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "lot_code": lot_code,
        "coop_id": coop_id,
        "parcelle_ids": data.parcelle_ids,
        "farmer_ids": data.farmer_ids,
        "poids_total_kg": data.poids_total_kg,
        "type_produit": data.type_produit,
        "campagne": campagne,
        "origine_village": data.origine_village,
        "origine_region": data.origine_region,
        "controles_qualite": controles,
        "segregation_physique": data.segregation_physique,
        "marquage": data.marquage or {
            "pays_origine": "Côte d'Ivoire",
            "nom_produit": "Cacao durable",
            "campagne": campagne,
            "lot_code": lot_code,
            "norme": "ARS 1000",
        },
        "statut": "reception",
        "rapport_essai": None,
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.lots_traceabilite.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_lot(doc)


@router.get("")
async def get_lots(
    current_user: dict = Depends(get_current_user),
    statut: Optional[str] = Query(None),
    campagne: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Liste des lots de la coopérative"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])

    query = {"coop_id": coop_id}
    if statut:
        query["statut"] = statut
    if campagne:
        query["campagne"] = campagne

    total = await db.lots_traceabilite.count_documents(query)
    skip = (page - 1) * limit
    lots = await db.lots_traceabilite.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "lots": [serialize_lot(l) for l in lots]
    }


@router.get("/{lot_id}")
async def get_lot(lot_id: str, current_user: dict = Depends(get_current_user)):
    """Détail d'un lot"""
    if not ObjectId.is_valid(lot_id):
        raise HTTPException(status_code=400, detail="ID invalide")
    
    lot = await db.lots_traceabilite.find_one({"_id": ObjectId(lot_id)})
    if not lot:
        raise HTTPException(status_code=404, detail="Lot introuvable")
    return serialize_lot(lot)


@router.put("/{lot_id}")
async def update_lot(lot_id: str, data: LotUpdate, current_user: dict = Depends(get_current_user)):
    """Mettre à jour un lot"""
    verify_cooperative(current_user)

    if not ObjectId.is_valid(lot_id):
        raise HTTPException(status_code=400, detail="ID invalide")

    lot = await db.lots_traceabilite.find_one({"_id": ObjectId(lot_id)})
    if not lot:
        raise HTTPException(status_code=404, detail="Lot introuvable")

    update_data = {}
    for field, value in data.model_dump(exclude_none=True).items():
        if hasattr(value, 'model_dump'):
            update_data[field] = value.model_dump()
        else:
            update_data[field] = value

    # Recalculate quality if controls updated
    if "controles_qualite" in update_data:
        c = update_data["controles_qualite"]
        c["epreuve_coupe"]["grade"] = calculate_grade(c.get("epreuve_coupe", {}))
        pct, conforme = calculate_qualite_score(c)
        c["score_qualite_global"] = pct
        c["conforme_global"] = conforme
        c["humidite"]["conforme"] = c["humidite"].get("taux_humidite", 100) <= 8
        c["tamisage"]["conforme"] = c["tamisage"].get("taux_debris", 100) <= 1.5
        ce = c["corps_etrangers"]
        ce["conforme"] = (ce.get("taux_corps_etrangers", 100) <= 0.75 and
                          ce.get("taux_elements_connexes", 100) <= 3.5 and
                          ce.get("taux_feves_plates", 100) <= 1.5)

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.lots_traceabilite.update_one({"_id": ObjectId(lot_id)}, {"$set": update_data})

    updated = await db.lots_traceabilite.find_one({"_id": ObjectId(lot_id)})
    return serialize_lot(updated)


@router.post("/{lot_id}/rapport-essai")
async def generate_rapport_essai(lot_id: str, current_user: dict = Depends(get_current_user)):
    """Générer le rapport d'essai pour un lot (ARS 1000-2)"""
    verify_cooperative(current_user)

    if not ObjectId.is_valid(lot_id):
        raise HTTPException(status_code=400, detail="ID invalide")

    lot = await db.lots_traceabilite.find_one({"_id": ObjectId(lot_id)})
    if not lot:
        raise HTTPException(status_code=404, detail="Lot introuvable")

    cq = lot.get("controles_qualite", {})
    rapport = {
        "lot_code": lot.get("lot_code"),
        "date_generation": datetime.now(timezone.utc).isoformat(),
        "identification_echantillon": {
            "lot_code": lot.get("lot_code"),
            "campagne": lot.get("campagne"),
            "origine": lot.get("origine_village"),
            "poids_kg": lot.get("poids_total_kg"),
        },
        "resultats": {
            "humidite": cq.get("humidite", {}),
            "tamisage": cq.get("tamisage", {}),
            "corps_etrangers": cq.get("corps_etrangers", {}),
            "epreuve_coupe": cq.get("epreuve_coupe", {}),
            "fermentation": cq.get("fermentation", {}),
        },
        "score_global": cq.get("score_qualite_global", 0),
        "conforme": cq.get("conforme_global", False),
        "methodes": [
            "Humidité: Méthode du four (103°C, 16h) - ARS 1000-2 Annexe F",
            "Tamisage: Tamis 5mm - ARS 1000-2 Annexe B",
            "Corps étrangers: Séparation manuelle - ARS 1000-2 Annexe C",
            "Épreuve à la coupe: 300 fèves - ARS 1000-2 Annexe E",
        ],
        "generateur": str(current_user["_id"]),
        "norme_reference": "ARS 1000-2:2021",
    }

    now = datetime.now(timezone.utc).isoformat()
    await db.lots_traceabilite.update_one(
        {"_id": ObjectId(lot_id)},
        {"$set": {"rapport_essai": rapport, "statut": "controle", "updated_at": now}}
    )

    return rapport


@router.get("/stats/overview")
async def get_lots_stats(current_user: dict = Depends(get_current_user)):
    """Statistiques globales des lots"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])

    total = await db.lots_traceabilite.count_documents({"coop_id": coop_id})
    conformes = await db.lots_traceabilite.count_documents({
        "coop_id": coop_id, "controles_qualite.conforme_global": True
    })

    pipeline = [
        {"$match": {"coop_id": coop_id}},
        {"$group": {
            "_id": None,
            "poids_total": {"$sum": "$poids_total_kg"},
            "score_moyen": {"$avg": "$controles_qualite.score_qualite_global"}
        }}
    ]
    agg = await db.lots_traceabilite.aggregate(pipeline).to_list(1)
    
    poids_total = agg[0]["poids_total"] if agg else 0
    score_moyen = round(agg[0]["score_moyen"], 1) if agg and agg[0].get("score_moyen") else 0

    by_statut = {}
    pipeline2 = [
        {"$match": {"coop_id": coop_id}},
        {"$group": {"_id": "$statut", "count": {"$sum": 1}}}
    ]
    async for doc in db.lots_traceabilite.aggregate(pipeline2):
        by_statut[doc["_id"]] = doc["count"]

    return {
        "total_lots": total,
        "lots_conformes": conformes,
        "poids_total_kg": poids_total,
        "score_qualite_moyen": score_moyen,
        "par_statut": by_statut
    }
