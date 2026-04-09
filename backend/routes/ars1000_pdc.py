"""
ARS 1000 - Plan de Développement de la Cacaoyère (PDC)
GreenLink Agritech - Côte d'Ivoire

Gestion complète des PDC selon la norme ARS 1000-1
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user
from routes.cooperative import verify_cooperative

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ars1000/pdc", tags=["ARS 1000 - PDC"])


# ============= MODELS =============

class PDCIdentification(BaseModel):
    nom: str = ""
    prenoms: str = ""
    date_naissance: Optional[str] = None
    genre: str = ""
    numero_identification: str = ""
    telephone: str = ""
    localite: str = ""
    village: str = ""
    sous_prefecture: str = ""
    department: str = ""
    region: str = ""
    membre_groupe: bool = False
    statut_foncier: str = ""  # proprietaire, metayer, locataire

class PDCMenage(BaseModel):
    taille_menage: int = 0
    nombre_femmes: int = 0
    nombre_enfants: int = 0
    enfants_scolarises: int = 0
    travailleurs_permanents: int = 0
    travailleurs_temporaires: int = 0
    sources_revenus_autres: List[str] = []
    depenses_mensuelles: float = 0
    acces_banque: bool = False
    mobile_money: bool = False

class PDCParcelle(BaseModel):
    nom_parcelle: str = ""
    superficie_ha: float = 0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    polygone_gps: Optional[List[dict]] = None
    annee_creation: Optional[int] = None
    age_arbres_ans: Optional[int] = None
    densite_arbres_ha: Optional[int] = None
    variete_cacao: str = ""
    rendement_estime_kg_ha: float = 0
    cultures_associees: List[str] = []
    etat_sanitaire: str = ""  # bon, moyen, mauvais
    photo_parcelle_url: Optional[str] = None
    croquis_geojson: Optional[dict] = None

class PDCArbresOmbrage(BaseModel):
    nombre_total: int = 0
    densite_par_ha: float = 0
    especes: List[str] = []
    nombre_especes: int = 0
    strate_haute: int = 0
    strate_moyenne: int = 0
    strate_basse: int = 0
    conforme_agroforesterie: bool = False  # 25-40 arbres/ha, min 3 especes

class PDCMaterielAgricole(BaseModel):
    outils: List[str] = []
    equipements_protection: List[str] = []
    produits_phytosanitaires: List[str] = []
    engrais: List[str] = []
    acces_intrants: bool = False

class PDCMatriceStrategique(BaseModel):
    objectif_rendement_kg_ha: float = 0
    horizon_annees: int = 5
    investissements_prevus: List[dict] = []
    risques_identifies: List[str] = []
    actions_prioritaires: List[str] = []
    cout_total_estime: float = 0

class PDCMatriceAnnuelle(BaseModel):
    annee: int = 0
    activites: List[dict] = []
    budget_prevu: float = 0
    objectif_rendement: float = 0
    indicateurs_suivi: List[str] = []

class PDCSignature(BaseModel):
    signataire: str = ""
    role: str = ""
    date_signature: Optional[str] = None
    signature_data: Optional[str] = None  # base64 ou confirmation

class PDCCreate(BaseModel):
    farmer_id: Optional[str] = None
    identification: PDCIdentification = PDCIdentification()
    menage: PDCMenage = PDCMenage()
    parcelles: List[PDCParcelle] = []
    arbres_ombrage: PDCArbresOmbrage = PDCArbresOmbrage()
    materiel_agricole: PDCMaterielAgricole = PDCMaterielAgricole()
    matrice_strategique: PDCMatriceStrategique = PDCMatriceStrategique()
    matrices_annuelles: List[PDCMatriceAnnuelle] = []
    pratiques_durables: dict = {}
    signatures: List[PDCSignature] = []
    notes: str = ""

class PDCUpdate(BaseModel):
    identification: Optional[PDCIdentification] = None
    menage: Optional[PDCMenage] = None
    parcelles: Optional[List[PDCParcelle]] = None
    arbres_ombrage: Optional[PDCArbresOmbrage] = None
    materiel_agricole: Optional[PDCMaterielAgricole] = None
    matrice_strategique: Optional[PDCMatriceStrategique] = None
    matrices_annuelles: Optional[List[PDCMatriceAnnuelle]] = None
    pratiques_durables: Optional[dict] = None
    signatures: Optional[List[PDCSignature]] = None
    notes: Optional[str] = None


# ============= HELPERS =============

def calculate_pdc_conformite(pdc: dict) -> float:
    """Calcule le % de conformité du PDC selon ARS 1000-1"""
    total_fields = 0
    filled_fields = 0

    # Identification (10 champs)
    ident = pdc.get("identification", {})
    for f in ["nom", "prenoms", "genre", "numero_identification", "telephone",
              "localite", "village", "sous_prefecture", "department", "region"]:
        total_fields += 1
        if ident.get(f):
            filled_fields += 1

    # Ménage (5 champs clés)
    menage = pdc.get("menage", {})
    for f in ["taille_menage", "nombre_enfants", "enfants_scolarises",
              "travailleurs_permanents", "acces_banque"]:
        total_fields += 1
        if menage.get(f) is not None and menage.get(f) != 0 and menage.get(f) != "":
            filled_fields += 1

    # Parcelles (au moins 1 parcelle avec GPS)
    parcelles = pdc.get("parcelles", [])
    total_fields += 3
    if len(parcelles) > 0:
        filled_fields += 1
        p = parcelles[0]
        if p.get("latitude") and p.get("longitude"):
            filled_fields += 1
        if p.get("superficie_ha", 0) > 0:
            filled_fields += 1

    # Arbres ombrage
    arbres = pdc.get("arbres_ombrage", {})
    total_fields += 3
    if arbres.get("nombre_total", 0) > 0:
        filled_fields += 1
    if arbres.get("nombre_especes", 0) >= 3:
        filled_fields += 1
    if arbres.get("conforme_agroforesterie"):
        filled_fields += 1

    # Matériel agricole
    mat = pdc.get("materiel_agricole", {})
    total_fields += 2
    if len(mat.get("outils", [])) > 0:
        filled_fields += 1
    if len(mat.get("equipements_protection", [])) > 0:
        filled_fields += 1

    # Matrice stratégique
    strat = pdc.get("matrice_strategique", {})
    total_fields += 2
    if strat.get("objectif_rendement_kg_ha", 0) > 0:
        filled_fields += 1
    if len(strat.get("actions_prioritaires", [])) > 0:
        filled_fields += 1

    # Signatures
    sigs = pdc.get("signatures", [])
    total_fields += 1
    if len(sigs) > 0:
        filled_fields += 1

    if total_fields == 0:
        return 0.0
    return round((filled_fields / total_fields) * 100, 1)


def serialize_pdc(pdc: dict) -> dict:
    """Serialize PDC for JSON response"""
    return {
        "id": str(pdc["_id"]),
        "farmer_id": pdc.get("farmer_id", ""),
        "coop_id": pdc.get("coop_id", ""),
        "identification": pdc.get("identification", {}),
        "menage": pdc.get("menage", {}),
        "parcelles": pdc.get("parcelles", []),
        "arbres_ombrage": pdc.get("arbres_ombrage", {}),
        "materiel_agricole": pdc.get("materiel_agricole", {}),
        "matrice_strategique": pdc.get("matrice_strategique", {}),
        "matrices_annuelles": pdc.get("matrices_annuelles", []),
        "pratiques_durables": pdc.get("pratiques_durables", {}),
        "signatures": pdc.get("signatures", []),
        "notes": pdc.get("notes", ""),
        "statut": pdc.get("statut", "brouillon"),
        "pourcentage_conformite": pdc.get("pourcentage_conformite", 0),
        "created_at": pdc.get("created_at", ""),
        "updated_at": pdc.get("updated_at", ""),
        "validated_at": pdc.get("validated_at"),
        "validated_by": pdc.get("validated_by"),
    }


# ============= FARMER ENDPOINTS =============

@router.post("")
async def create_pdc(data: PDCCreate, current_user: dict = Depends(get_current_user)):
    """Créer un nouveau PDC (par le planteur ou l'agent terrain)"""
    user_type = current_user.get("user_type", "")
    user_id = str(current_user["_id"])

    farmer_id = data.farmer_id or user_id
    coop_id = ""

    if user_type in ("farmer", "planteur", "producteur"):
        farmer_id = user_id
        member = await db.coop_members.find_one({"user_id": user_id})
        if member:
            coop_id = str(member.get("coop_id", ""))
    elif user_type in ("field_agent", "agent_terrain"):
        coop_id = current_user.get("cooperative_id", "")
        if not data.farmer_id:
            raise HTTPException(status_code=400, detail="farmer_id requis pour un agent")
    elif user_type in ("cooperative", "admin", "super_admin"):
        coop_id = str(current_user["_id"]) if user_type == "cooperative" else ""
    else:
        raise HTTPException(status_code=403, detail="Non autorisé")

    # Check existing PDC
    existing = await db.pdc.find_one({"farmer_id": farmer_id, "statut": {"$ne": "archive"}})
    if existing:
        raise HTTPException(status_code=409, detail="Un PDC actif existe déjà pour ce planteur")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "farmer_id": farmer_id,
        "coop_id": coop_id,
        "created_by": user_id,
        "identification": data.identification.model_dump(),
        "menage": data.menage.model_dump(),
        "parcelles": [p.model_dump() for p in data.parcelles],
        "arbres_ombrage": data.arbres_ombrage.model_dump(),
        "materiel_agricole": data.materiel_agricole.model_dump(),
        "matrice_strategique": data.matrice_strategique.model_dump(),
        "matrices_annuelles": [m.model_dump() for m in data.matrices_annuelles],
        "pratiques_durables": data.pratiques_durables,
        "signatures": [s.model_dump() for s in data.signatures],
        "notes": data.notes,
        "statut": "brouillon",
        "pourcentage_conformite": 0,
        "created_at": now,
        "updated_at": now,
        "validated_at": None,
        "validated_by": None,
    }

    doc["pourcentage_conformite"] = calculate_pdc_conformite(doc)
    result = await db.pdc.insert_one(doc)

    doc["_id"] = result.inserted_id
    return serialize_pdc(doc)


@router.get("/my-pdc")
async def get_my_pdc(current_user: dict = Depends(get_current_user)):
    """Récupérer le PDC du planteur connecté"""
    user_id = str(current_user["_id"])
    pdc = await db.pdc.find_one({"farmer_id": user_id, "statut": {"$ne": "archive"}})
    if not pdc:
        return None
    return serialize_pdc(pdc)


@router.get("/farmer/{farmer_id}")
async def get_farmer_pdc(farmer_id: str, current_user: dict = Depends(get_current_user)):
    """Récupérer le PDC d'un planteur spécifique"""
    pdc = await db.pdc.find_one({"farmer_id": farmer_id, "statut": {"$ne": "archive"}})
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC introuvable")
    return serialize_pdc(pdc)


@router.put("/{pdc_id}")
async def update_pdc(pdc_id: str, data: PDCUpdate, current_user: dict = Depends(get_current_user)):
    """Mettre à jour un PDC"""
    if not ObjectId.is_valid(pdc_id):
        raise HTTPException(status_code=400, detail="ID invalide")

    pdc = await db.pdc.find_one({"_id": ObjectId(pdc_id)})
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC introuvable")

    user_id = str(current_user["_id"])
    user_type = current_user.get("user_type", "")

    # Vérifier les droits
    if user_type in ("farmer", "planteur", "producteur") and pdc.get("farmer_id") != user_id:
        raise HTTPException(status_code=403, detail="Non autorisé")

    if pdc.get("statut") == "valide":
        raise HTTPException(status_code=400, detail="PDC déjà validé, modification impossible")

    update_data = {}
    for field, value in data.model_dump(exclude_none=True).items():
        if isinstance(value, list):
            update_data[field] = [v.model_dump() if hasattr(v, 'model_dump') else v for v in value]
        elif hasattr(value, 'model_dump'):
            update_data[field] = value.model_dump()
        else:
            update_data[field] = value

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Recalculate conformite
    merged = {**pdc, **update_data}
    update_data["pourcentage_conformite"] = calculate_pdc_conformite(merged)

    await db.pdc.update_one({"_id": ObjectId(pdc_id)}, {"$set": update_data})

    updated = await db.pdc.find_one({"_id": ObjectId(pdc_id)})
    return serialize_pdc(updated)


# ============= COOPERATIVE ENDPOINTS =============

@router.get("/cooperative/all")
async def get_coop_pdcs(
    current_user: dict = Depends(get_current_user),
    statut: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Liste de tous les PDC de la coopérative"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])

    query = {"coop_id": coop_id}
    if statut:
        query["statut"] = statut
    if search:
        query["$or"] = [
            {"identification.nom": {"$regex": search, "$options": "i"}},
            {"identification.prenoms": {"$regex": search, "$options": "i"}},
            {"identification.village": {"$regex": search, "$options": "i"}},
        ]

    total = await db.pdc.count_documents(query)
    skip = (page - 1) * limit
    pdcs = await db.pdc.find(query).sort("updated_at", -1).skip(skip).limit(limit).to_list(limit)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pdcs": [serialize_pdc(p) for p in pdcs]
    }


@router.post("/{pdc_id}/validate")
async def validate_pdc(pdc_id: str, current_user: dict = Depends(get_current_user)):
    """Valider un PDC (par la coopérative)"""
    verify_cooperative(current_user)

    if not ObjectId.is_valid(pdc_id):
        raise HTTPException(status_code=400, detail="ID invalide")

    pdc = await db.pdc.find_one({"_id": ObjectId(pdc_id)})
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC introuvable")

    now = datetime.now(timezone.utc).isoformat()
    await db.pdc.update_one(
        {"_id": ObjectId(pdc_id)},
        {"$set": {
            "statut": "valide",
            "validated_at": now,
            "validated_by": str(current_user["_id"]),
            "updated_at": now
        }}
    )

    updated = await db.pdc.find_one({"_id": ObjectId(pdc_id)})
    return serialize_pdc(updated)


@router.post("/{pdc_id}/sign")
async def sign_pdc(
    pdc_id: str,
    signature: PDCSignature,
    current_user: dict = Depends(get_current_user)
):
    """Ajouter une signature au PDC"""
    if not ObjectId.is_valid(pdc_id):
        raise HTTPException(status_code=400, detail="ID invalide")

    pdc = await db.pdc.find_one({"_id": ObjectId(pdc_id)})
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC introuvable")

    sig = signature.model_dump()
    sig["date_signature"] = sig.get("date_signature") or datetime.now(timezone.utc).isoformat()

    now = datetime.now(timezone.utc).isoformat()
    await db.pdc.update_one(
        {"_id": ObjectId(pdc_id)},
        {
            "$push": {"signatures": sig},
            "$set": {"updated_at": now}
        }
    )

    updated = await db.pdc.find_one({"_id": ObjectId(pdc_id)})
    return serialize_pdc(updated)


@router.get("/cooperative/stats")
async def get_coop_pdc_stats(current_user: dict = Depends(get_current_user)):
    """Statistiques PDC pour la coopérative"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])

    total = await db.pdc.count_documents({"coop_id": coop_id})
    brouillons = await db.pdc.count_documents({"coop_id": coop_id, "statut": "brouillon"})
    soumis = await db.pdc.count_documents({"coop_id": coop_id, "statut": "soumis"})
    valides = await db.pdc.count_documents({"coop_id": coop_id, "statut": "valide"})

    pipeline = [
        {"$match": {"coop_id": coop_id}},
        {"$group": {"_id": None, "avg_conformite": {"$avg": "$pourcentage_conformite"}}}
    ]
    agg = await db.pdc.aggregate(pipeline).to_list(1)
    avg_conformite = round(agg[0]["avg_conformite"], 1) if agg and agg[0].get("avg_conformite") else 0

    return {
        "total": total,
        "brouillons": brouillons,
        "soumis": soumis,
        "valides": valides,
        "pourcentage_conformite_moyen": avg_conformite
    }


@router.post("/{pdc_id}/submit")
async def submit_pdc(pdc_id: str, current_user: dict = Depends(get_current_user)):
    """Soumettre un PDC pour validation"""
    if not ObjectId.is_valid(pdc_id):
        raise HTTPException(status_code=400, detail="ID invalide")

    pdc = await db.pdc.find_one({"_id": ObjectId(pdc_id)})
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC introuvable")

    if pdc.get("statut") not in ("brouillon",):
        raise HTTPException(status_code=400, detail="Seuls les brouillons peuvent être soumis")

    now = datetime.now(timezone.utc).isoformat()
    await db.pdc.update_one(
        {"_id": ObjectId(pdc_id)},
        {"$set": {"statut": "soumis", "updated_at": now}}
    )

    updated = await db.pdc.find_one({"_id": ObjectId(pdc_id)})
    return serialize_pdc(updated)
