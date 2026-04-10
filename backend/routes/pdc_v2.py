"""
PDC v2 - Plan de Developpement de la Cacaoyere (Stepper 3 etapes / 8 fiches)
GreenLink Agritech - Cote d'Ivoire

Etape 1 (Annexe 1) : Collecte de donnees - Agent Terrain
  Fiche 1: Profil du producteur et du menage
  Fiche 2: Profil de l'exploitation
  Fiche 3: Informations sur la cacaoyere
  Fiche 4: Profil socio-economique du producteur

Etape 2 (Annexe 2) : Analyse des donnees - Cooperative (Agronome)
  Fiche 5: Analyse des problemes

Etape 3 (Annexe 3) : Planification - Cooperative (Agronome)
  Fiche 6: Matrice de planification strategique
  Fiche 7: Matrice du programme annuel d'action
  Fiche 8: Tableau de determination des moyens et des couts
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pdc-v2", tags=["PDC v2 - Stepper"])


# ============= MODELS =============

class PDCCreateRequest(BaseModel):
    farmer_id: str


class Step1Data(BaseModel):
    fiche1: Optional[dict] = None
    fiche2: Optional[dict] = None
    fiche3: Optional[dict] = None
    fiche4: Optional[dict] = None


class Step2Data(BaseModel):
    fiche5: Optional[dict] = None


class Step3Data(BaseModel):
    fiche6: Optional[dict] = None
    fiche7: Optional[dict] = None
    fiche8: Optional[dict] = None


# ============= HELPERS =============

STEP1_ROLES = ("field_agent", "agent_terrain", "cooperative", "admin")
STEP2_ROLES = ("cooperative", "admin")
STEP3_ROLES = ("cooperative", "admin")
VALIDATE_ROLES = ("cooperative", "admin")
READONLY_ROLES = ("farmer", "planteur", "producteur")


def get_user_type(user: dict) -> str:
    return user.get("user_type", "")


def get_user_id(user: dict) -> str:
    return str(user["_id"])


def serialize_pdc_v2(pdc: dict) -> dict:
    result = {
        "id": str(pdc["_id"]),
        "farmer_id": pdc.get("farmer_id", ""),
        "farmer_name": pdc.get("farmer_name", ""),
        "coop_id": pdc.get("coop_id", ""),
        "created_by": pdc.get("created_by", ""),
        "current_step": pdc.get("current_step", 1),
        "statut": pdc.get("statut", "brouillon"),
        "step1": pdc.get("step1", {}),
        "step2": pdc.get("step2", {}),
        "step3": pdc.get("step3", {}),
        "validated_at": pdc.get("validated_at"),
        "validated_by": pdc.get("validated_by"),
        "validated_by_name": pdc.get("validated_by_name"),
        "created_at": pdc.get("created_at", ""),
        "updated_at": pdc.get("updated_at", ""),
    }
    return result


async def check_pdc_access(pdc: dict, user: dict):
    """Verify user has access to this PDC based on role"""
    user_type = get_user_type(user)
    user_id = get_user_id(user)

    if user_type in ("admin", "super_admin"):
        return True

    if user_type in ("farmer", "planteur", "producteur"):
        if pdc.get("farmer_id") != user_id:
            raise HTTPException(status_code=403, detail="Acces refuse")
        return True

    if user_type == "cooperative":
        if pdc.get("coop_id") != user_id:
            raise HTTPException(status_code=403, detail="Ce PDC n'appartient pas a votre cooperative")
        return True

    if user_type in ("field_agent", "agent_terrain"):
        coop_id = user.get("cooperative_id", "")
        if pdc.get("coop_id") != coop_id:
            raise HTTPException(status_code=403, detail="Acces refuse")
        return True

    raise HTTPException(status_code=403, detail="Role non autorise")


async def get_pdc_or_404(pdc_id: str) -> dict:
    if not ObjectId.is_valid(pdc_id):
        raise HTTPException(status_code=400, detail="ID invalide")
    pdc = await db.pdc_v2.find_one({"_id": ObjectId(pdc_id)})
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC introuvable")
    return pdc


# ============= ENDPOINTS =============

@router.post("")
async def create_pdc(data: PDCCreateRequest, current_user: dict = Depends(get_current_user)):
    """Creer un nouveau PDC pour un planteur"""
    user_type = get_user_type(current_user)
    user_id = get_user_id(current_user)

    if user_type not in (*STEP1_ROLES, "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Non autorise a creer un PDC")

    farmer_id = data.farmer_id
    if not farmer_id:
        raise HTTPException(status_code=400, detail="farmer_id requis")

    # Check farmer exists
    farmer = await db.users.find_one({"_id": ObjectId(farmer_id)})
    if not farmer:
        # Try coop_members
        member = await db.coop_members.find_one({"_id": ObjectId(farmer_id)})
        if not member:
            raise HTTPException(status_code=404, detail="Planteur introuvable")
        farmer_name = member.get("full_name", member.get("name", ""))
        coop_id_resolved = str(member.get("coop_id", ""))
    else:
        farmer_name = farmer.get("full_name", "")
        coop_id_resolved = ""

    # Determine coop_id
    if user_type == "cooperative":
        coop_id = user_id
    elif user_type in ("field_agent", "agent_terrain"):
        coop_id = current_user.get("cooperative_id", "")
    else:
        coop_id = coop_id_resolved

    # Check no active PDC v2 for this farmer
    existing = await db.pdc_v2.find_one({
        "farmer_id": farmer_id,
        "statut": {"$nin": ["archive"]}
    })
    if existing:
        raise HTTPException(status_code=409, detail="Un PDC actif existe deja pour ce planteur")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "farmer_id": farmer_id,
        "farmer_name": farmer_name,
        "coop_id": coop_id,
        "created_by": user_id,
        "current_step": 1,
        "statut": "brouillon",
        "step1": {
            "fiche1": {"enqueteur": {}, "producteur": {}, "membres_menage": []},
            "fiche2": {"coordonnees_gps": {}, "carte_parcelle": {"polygon": [], "arbres_ombrage": [], "map_snapshot": None}, "cultures": [], "materiels": [], "arbres": []},
            "fiche3": {"etat_cacaoyere": {}, "maladies": [], "etat_sol": {}, "recolte_post_recolte": {}, "engrais": [], "phytosanitaires": [], "gestion_emballages": ""},
            "fiche4": {"epargne": [], "production_cacao": [], "autres_revenus": [], "depenses": [], "main_oeuvre": []},
        },
        "step2": {
            "fiche5": {"analyses": []},
        },
        "step3": {
            "fiche6": {"axes": []},
            "fiche7": {"actions": []},
            "fiche8": {"moyens": []},
        },
        "validated_at": None,
        "validated_by": None,
        "validated_by_name": None,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.pdc_v2.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_pdc_v2(doc)


@router.get("/list")
async def list_pdcs(
    current_user: dict = Depends(get_current_user),
    statut: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Lister les PDC selon le role"""
    user_type = get_user_type(current_user)
    user_id = get_user_id(current_user)

    query = {}

    if user_type in ("farmer", "planteur", "producteur"):
        query["farmer_id"] = user_id
    elif user_type == "cooperative":
        query["coop_id"] = user_id
    elif user_type in ("field_agent", "agent_terrain"):
        coop_id = current_user.get("cooperative_id", "")
        query["coop_id"] = coop_id
    elif user_type not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Role non autorise")

    if statut:
        query["statut"] = statut
    if search:
        query["$or"] = [
            {"farmer_name": {"$regex": search, "$options": "i"}},
            {"step1.fiche1.producteur.nom": {"$regex": search, "$options": "i"}},
            {"step1.fiche1.producteur.prenoms": {"$regex": search, "$options": "i"}},
        ]

    total = await db.pdc_v2.count_documents(query)
    skip = (page - 1) * limit
    pdcs = await db.pdc_v2.find(query).sort("updated_at", -1).skip(skip).limit(limit).to_list(limit)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pdcs": [serialize_pdc_v2(p) for p in pdcs],
    }


@router.get("/{pdc_id}")
async def get_pdc(pdc_id: str, current_user: dict = Depends(get_current_user)):
    """Recuperer un PDC par ID"""
    pdc = await get_pdc_or_404(pdc_id)
    await check_pdc_access(pdc, current_user)

    user_type = get_user_type(current_user)
    # Planteur ne voit le PDC complet qu'apres validation
    if user_type in READONLY_ROLES and pdc.get("statut") != "valide":
        raise HTTPException(status_code=403, detail="Le PDC n'est pas encore valide. Vous pourrez le consulter apres validation par l'agronome.")

    return serialize_pdc_v2(pdc)


@router.put("/{pdc_id}/step1")
async def save_step1(pdc_id: str, data: Step1Data, current_user: dict = Depends(get_current_user)):
    """Sauvegarder l'etape 1 (Annexe 1 - Collecte de donnees)"""
    user_type = get_user_type(current_user)
    if user_type not in STEP1_ROLES:
        raise HTTPException(status_code=403, detail="Seul l'agent terrain ou la cooperative peut remplir l'etape 1")

    pdc = await get_pdc_or_404(pdc_id)
    await check_pdc_access(pdc, current_user)

    if pdc.get("statut") == "valide":
        raise HTTPException(status_code=400, detail="PDC deja valide, modification impossible")

    # Cooperative cannot modify step 1 once agent has submitted it
    if user_type in STEP2_ROLES and pdc.get("current_step", 1) >= 2:
        raise HTTPException(status_code=403, detail="L'etape 1 a ete soumise par l'agent terrain. Lecture seule pour l'agronome.")

    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    step1 = pdc.get("step1", {})
    if data.fiche1 is not None:
        step1["fiche1"] = data.fiche1
    if data.fiche2 is not None:
        step1["fiche2"] = data.fiche2
    if data.fiche3 is not None:
        step1["fiche3"] = data.fiche3
    if data.fiche4 is not None:
        step1["fiche4"] = data.fiche4
    update["step1"] = step1

    # Advance step if at least some data
    if pdc.get("current_step", 1) < 2:
        has_data = any([data.fiche1, data.fiche2, data.fiche3, data.fiche4])
        if has_data:
            update["current_step"] = 1
            update["statut"] = "etape1_en_cours"

    await db.pdc_v2.update_one({"_id": ObjectId(pdc_id)}, {"$set": update})
    updated = await db.pdc_v2.find_one({"_id": ObjectId(pdc_id)})
    return serialize_pdc_v2(updated)


@router.post("/{pdc_id}/submit-step1")
async def submit_step1(pdc_id: str, current_user: dict = Depends(get_current_user)):
    """Soumettre l'etape 1 pour passer a l'etape 2"""
    user_type = get_user_type(current_user)
    if user_type not in STEP1_ROLES:
        raise HTTPException(status_code=403, detail="Non autorise")

    pdc = await get_pdc_or_404(pdc_id)
    await check_pdc_access(pdc, current_user)

    now = datetime.now(timezone.utc).isoformat()
    await db.pdc_v2.update_one(
        {"_id": ObjectId(pdc_id)},
        {"$set": {
            "current_step": 2,
            "statut": "etape1_complete",
            "updated_at": now,
        }}
    )
    updated = await db.pdc_v2.find_one({"_id": ObjectId(pdc_id)})
    return serialize_pdc_v2(updated)


@router.put("/{pdc_id}/step2")
async def save_step2(pdc_id: str, data: Step2Data, current_user: dict = Depends(get_current_user)):
    """Sauvegarder l'etape 2 (Annexe 2 - Analyse des donnees)"""
    user_type = get_user_type(current_user)
    if user_type not in STEP2_ROLES:
        raise HTTPException(status_code=403, detail="Seule la cooperative (agronome) peut remplir l'etape 2")

    pdc = await get_pdc_or_404(pdc_id)
    await check_pdc_access(pdc, current_user)

    if pdc.get("statut") == "valide":
        raise HTTPException(status_code=400, detail="PDC deja valide")

    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    step2 = pdc.get("step2", {})
    if data.fiche5 is not None:
        step2["fiche5"] = data.fiche5
    update["step2"] = step2
    update["statut"] = "etape2_en_cours"

    await db.pdc_v2.update_one({"_id": ObjectId(pdc_id)}, {"$set": update})
    updated = await db.pdc_v2.find_one({"_id": ObjectId(pdc_id)})
    return serialize_pdc_v2(updated)


@router.post("/{pdc_id}/submit-step2")
async def submit_step2(pdc_id: str, current_user: dict = Depends(get_current_user)):
    """Soumettre l'etape 2 pour passer a l'etape 3"""
    user_type = get_user_type(current_user)
    if user_type not in STEP2_ROLES:
        raise HTTPException(status_code=403, detail="Non autorise")

    pdc = await get_pdc_or_404(pdc_id)
    await check_pdc_access(pdc, current_user)

    now = datetime.now(timezone.utc).isoformat()
    await db.pdc_v2.update_one(
        {"_id": ObjectId(pdc_id)},
        {"$set": {
            "current_step": 3,
            "statut": "etape2_complete",
            "updated_at": now,
        }}
    )
    updated = await db.pdc_v2.find_one({"_id": ObjectId(pdc_id)})
    return serialize_pdc_v2(updated)


@router.put("/{pdc_id}/step3")
async def save_step3(pdc_id: str, data: Step3Data, current_user: dict = Depends(get_current_user)):
    """Sauvegarder l'etape 3 (Annexe 3 - Planification)"""
    user_type = get_user_type(current_user)
    if user_type not in STEP3_ROLES:
        raise HTTPException(status_code=403, detail="Seule la cooperative (agronome) peut remplir l'etape 3")

    pdc = await get_pdc_or_404(pdc_id)
    await check_pdc_access(pdc, current_user)

    if pdc.get("statut") == "valide":
        raise HTTPException(status_code=400, detail="PDC deja valide")

    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    step3 = pdc.get("step3", {})
    if data.fiche6 is not None:
        step3["fiche6"] = data.fiche6
    if data.fiche7 is not None:
        step3["fiche7"] = data.fiche7
    if data.fiche8 is not None:
        step3["fiche8"] = data.fiche8
    update["step3"] = step3
    update["statut"] = "etape3_en_cours"

    await db.pdc_v2.update_one({"_id": ObjectId(pdc_id)}, {"$set": update})
    updated = await db.pdc_v2.find_one({"_id": ObjectId(pdc_id)})
    return serialize_pdc_v2(updated)


@router.post("/{pdc_id}/validate")
async def validate_pdc(pdc_id: str, current_user: dict = Depends(get_current_user)):
    """Valider le PDC (par la cooperative / agronome)"""
    user_type = get_user_type(current_user)
    if user_type not in VALIDATE_ROLES:
        raise HTTPException(status_code=403, detail="Seule la cooperative peut valider un PDC")

    pdc = await get_pdc_or_404(pdc_id)
    await check_pdc_access(pdc, current_user)

    if pdc.get("statut") == "valide":
        raise HTTPException(status_code=400, detail="PDC deja valide")

    now = datetime.now(timezone.utc).isoformat()
    user_id = get_user_id(current_user)
    user_name = current_user.get("full_name", current_user.get("coop_name", ""))

    await db.pdc_v2.update_one(
        {"_id": ObjectId(pdc_id)},
        {"$set": {
            "statut": "valide",
            "current_step": 3,
            "validated_at": now,
            "validated_by": user_id,
            "validated_by_name": user_name,
            "updated_at": now,
        }}
    )

    # Create notification for farmer
    farmer_id = pdc.get("farmer_id", "")
    if farmer_id:
        await db.notifications.insert_one({
            "user_id": farmer_id,
            "type": "pdc_validated",
            "title": "PDC Valide",
            "message": f"Votre Plan de Developpement de la Cacaoyere a ete valide par {user_name}. Vous pouvez maintenant le consulter et telecharger le PDF.",
            "read": False,
            "created_at": now,
        })

    updated = await db.pdc_v2.find_one({"_id": ObjectId(pdc_id)})
    return serialize_pdc_v2(updated)


@router.get("/stats/overview")
async def pdc_stats(current_user: dict = Depends(get_current_user)):
    """Statistiques PDC pour la cooperative"""
    user_type = get_user_type(current_user)
    user_id = get_user_id(current_user)

    query = {}
    if user_type == "cooperative":
        query["coop_id"] = user_id
    elif user_type in ("field_agent", "agent_terrain"):
        query["coop_id"] = current_user.get("cooperative_id", "")
    elif user_type not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Non autorise")

    total = await db.pdc_v2.count_documents(query)
    brouillons = await db.pdc_v2.count_documents({**query, "statut": {"$in": ["brouillon", "etape1_en_cours"]}})
    etape1 = await db.pdc_v2.count_documents({**query, "statut": "etape1_complete"})
    etape2 = await db.pdc_v2.count_documents({**query, "statut": {"$in": ["etape2_en_cours", "etape2_complete"]}})
    etape3 = await db.pdc_v2.count_documents({**query, "statut": "etape3_en_cours"})
    valides = await db.pdc_v2.count_documents({**query, "statut": "valide"})

    return {
        "total": total,
        "brouillons": brouillons,
        "etape1_complete": etape1,
        "etape2_en_cours": etape2,
        "etape3_en_cours": etape3,
        "valides": valides,
    }


@router.delete("/{pdc_id}")
async def delete_pdc(pdc_id: str, current_user: dict = Depends(get_current_user)):
    """Supprimer un PDC (archive)"""
    user_type = get_user_type(current_user)
    if user_type not in ("cooperative", "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Non autorise")

    pdc = await get_pdc_or_404(pdc_id)
    await check_pdc_access(pdc, current_user)

    if pdc.get("statut") == "valide":
        raise HTTPException(status_code=400, detail="Impossible de supprimer un PDC valide")

    now = datetime.now(timezone.utc).isoformat()
    await db.pdc_v2.update_one(
        {"_id": ObjectId(pdc_id)},
        {"$set": {"statut": "archive", "updated_at": now}}
    )
    return {"message": "PDC archive"}


@router.get("/members/available")
async def get_available_members(current_user: dict = Depends(get_current_user)):
    """Lister les membres de la cooperative sans PDC v2 actif"""
    user_type = get_user_type(current_user)
    user_id = get_user_id(current_user)

    if user_type == "cooperative":
        coop_id = user_id
    elif user_type in ("field_agent", "agent_terrain"):
        coop_id = current_user.get("cooperative_id", "")
    elif user_type in ("admin", "super_admin"):
        coop_id = None
    else:
        raise HTTPException(status_code=403, detail="Non autorise")

    query = {}
    if coop_id:
        query["coop_id"] = coop_id

    members = await db.coop_members.find(query, {"_id": 1, "full_name": 1, "name": 1, "phone": 1, "village": 1}).to_list(500)

    # Get farmer_ids that already have active PDC v2
    existing_pdc_farmer_ids = set()
    pdc_query = {"statut": {"$nin": ["archive"]}}
    if coop_id:
        pdc_query["coop_id"] = coop_id
    async for p in db.pdc_v2.find(pdc_query, {"farmer_id": 1}):
        existing_pdc_farmer_ids.add(p.get("farmer_id", ""))

    available = []
    for m in members:
        mid = str(m["_id"])
        if mid not in existing_pdc_farmer_ids:
            available.append({
                "id": mid,
                "full_name": m.get("full_name", m.get("name", "")),
                "phone": m.get("phone", ""),
                "village": m.get("village", ""),
            })

    return available
