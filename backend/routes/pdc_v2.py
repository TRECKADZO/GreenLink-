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


async def find_member_adhesion(farmer_id: str, farmer_name: str = "", phone: str = "", coop_id: str = ""):
    """
    Lookup an existing adhesion (membres_adhesions) that matches the farmer.
    Tries in priority: farmer_id -> phone -> full_name within same coop.
    Returns the adhesion doc or None.
    """
    # Try direct ID match (member._id as string, or adhesion linked by farmer_id field)
    try:
        adh = await db.membres_adhesions.find_one({"farmer_id": farmer_id})
        if adh:
            return adh
    except Exception:
        pass

    # If farmer_id looks like ObjectId, try member_id
    try:
        adh = await db.membres_adhesions.find_one({"member_id": farmer_id})
        if adh:
            return adh
    except Exception:
        pass

    # Phone match within coop
    if phone:
        query = {"$or": [{"phone_number": phone}, {"contact": phone}]}
        if coop_id:
            query["coop_id"] = coop_id
        adh = await db.membres_adhesions.find_one(query)
        if adh:
            return adh

    # Name match within coop (exact, case-insensitive)
    if farmer_name:
        query = {"full_name": {"$regex": f"^{farmer_name.strip()}$", "$options": "i"}}
        if coop_id:
            query["coop_id"] = coop_id
        adh = await db.membres_adhesions.find_one(query)
        if adh:
            return adh

    return None


def build_prefilled_step1(adhesion: dict) -> dict:
    """Map adhesion fields into PDC Step 1 structure (fiche1-4)."""
    a = adhesion or {}

    producteur = {
        "nom": a.get("full_name", ""),
        "code_national": a.get("code_national_ccc", "") or a.get("code_membre", "") or a.get("cni_number", ""),
        "delegation_regionale": a.get("loc_region", "") or a.get("zone", ""),
        "departement": a.get("loc_departement", "") or a.get("department", ""),
        "sous_prefecture": a.get("loc_sous_prefecture", ""),
        "village": a.get("village", "") or a.get("localite", ""),
        "campement": a.get("campement", ""),
        "telephone": a.get("contact", "") or a.get("phone_number", ""),
        "date_naissance": a.get("date_naissance", ""),
        "sexe": a.get("sexe", ""),
        "cni": a.get("cni_number", ""),
        "section": a.get("section", ""),
        "numero_enregistrement": a.get("numero_enregistrement", ""),
    }

    # Household members
    membres_menage = []
    for m in a.get("membres_menage", []) or []:
        if not isinstance(m, dict):
            continue
        membres_menage.append({
            "nom": m.get("full_name", "") or m.get("nom", ""),
            "date_naissance": m.get("date_naissance", ""),
            "sexe": m.get("sexe", ""),
            "statut_famille": m.get("relation", "") or m.get("statut_famille", ""),
            "scolarise": m.get("scolarise", ""),
            "travaille_plantation": m.get("travaille_plantation", ""),
        })

    # Cultures
    cultures = []
    if a.get("superficie_ha"):
        cultures.append({
            "libelle": a.get("culture", "Cacao"),
            "superficie_ha": a.get("superficie_ha"),
        })
    for ac in (a.get("autres_cultures") or []):
        if isinstance(ac, dict):
            cultures.append({
                "libelle": ac.get("nom", "") or ac.get("libelle", ""),
                "superficie_ha": ac.get("superficie", "") or ac.get("superficie_ha", ""),
            })
        elif isinstance(ac, str):
            cultures.append({"libelle": ac, "superficie_ha": ""})

    # GPS from adhesion
    gps = {
        "latitude": a.get("gps_latitude", ""),
        "longitude": a.get("gps_longitude", ""),
        "sous_prefecture": a.get("loc_sous_prefecture", ""),
    }

    # Production cacao
    prod_cacao = []
    if a.get("recolte_precedente_kg") or a.get("volume_vendu_precedent_kg") or a.get("estimation_rendement_kg_ha"):
        prod_cacao.append({
            "annee": (a.get("date_audit_interne") or "")[:4],
            "production_kg": a.get("recolte_precedente_kg", ""),
            "volume_vendu_kg": a.get("volume_vendu_precedent_kg", ""),
            "rendement_kg_ha": a.get("estimation_rendement_kg_ha", ""),
        })

    # Main d'oeuvre (travailleurs)
    main_oeuvre = []
    for t in (a.get("travailleurs_liste") or []):
        if not isinstance(t, dict):
            continue
        main_oeuvre.append({
            "type": "permanent",
            "nom": t.get("full_name", "") or t.get("nom", ""),
            "nombre": 1,
            "statut": t.get("statut", ""),
        })

    return {
        "fiche1": {
            "enqueteur": {},
            "producteur": producteur,
            "membres_menage": membres_menage,
            "_prefilled_from_adhesion": True,
            "_adhesion_id": a.get("adhesion_id", ""),
            "_code_membre": a.get("code_membre", ""),
        },
        "fiche2": {
            "coordonnees_gps": gps,
            "carte_parcelle": {"polygon": [], "arbres_ombrage": [], "map_snapshot": None},
            "cultures": cultures,
            "materiels": [],
            "arbres": [],
            "code_cacaoyere": a.get("code_cacaoyere", ""),
            "date_creation_cacaoyere": a.get("date_creation_cacaoyere", ""),
            "densite_pieds": a.get("densite_pieds", ""),
            "nombre_parcelles": a.get("nombre_parcelles") or a.get("nombre_champs"),
        },
        "fiche3": {
            "etat_cacaoyere": {},
            "maladies": [],
            "etat_sol": {},
            "recolte_post_recolte": {},
            "engrais": [],
            "phytosanitaires": [],
            "gestion_emballages": "",
        },
        "fiche4": {
            "epargne": [],
            "production_cacao": prod_cacao,
            "autres_revenus": [],
            "depenses": [],
            "main_oeuvre": main_oeuvre,
        },
    }


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
        # farmer_id in PDC = coop_member._id, not users._id
        if pdc.get("farmer_id") == user_id:
            return True
        # Check via coop_members link
        member = await db.coop_members.find_one({"user_id": user_id}, {"_id": 1})
        if member and pdc.get("farmer_id") == str(member["_id"]):
            return True
        raise HTTPException(status_code=403, detail="Acces refuse")

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
    member = None
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

    # Try to auto-prefill Step 1 from the member's adhesion form
    farmer_phone = (farmer.get("phone_number") if farmer else None) or (member.get("phone_number") if member else "")
    adhesion = await find_member_adhesion(
        farmer_id=farmer_id,
        farmer_name=farmer_name,
        phone=farmer_phone or "",
        coop_id=coop_id,
    )
    if adhesion:
        step1 = build_prefilled_step1(adhesion)
    else:
        step1 = {
            "fiche1": {"enqueteur": {}, "producteur": {}, "membres_menage": []},
            "fiche2": {"coordonnees_gps": {}, "carte_parcelle": {"polygon": [], "arbres_ombrage": [], "map_snapshot": None}, "cultures": [], "materiels": [], "arbres": []},
            "fiche3": {"etat_cacaoyere": {}, "maladies": [], "etat_sol": {}, "recolte_post_recolte": {}, "engrais": [], "phytosanitaires": [], "gestion_emballages": ""},
            "fiche4": {"epargne": [], "production_cacao": [], "autres_revenus": [], "depenses": [], "main_oeuvre": []},
        }

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "farmer_id": farmer_id,
        "farmer_name": farmer_name,
        "coop_id": coop_id,
        "created_by": user_id,
        "current_step": 1,
        "statut": "brouillon",
        "prefilled_from_adhesion": bool(adhesion),
        "step1": step1,
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
    farmer_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Lister les PDC selon le role"""
    user_type = get_user_type(current_user)
    user_id = get_user_id(current_user)

    query = {}

    if user_type in ("farmer", "planteur", "producteur"):
        # Farmer's user_id != member_id — find the linked coop_member first
        member = await db.coop_members.find_one({"user_id": user_id}, {"_id": 1})
        if member:
            query["farmer_id"] = str(member["_id"])
        else:
            query["farmer_id"] = user_id  # fallback
    elif user_type == "cooperative":
        query["coop_id"] = user_id
    elif user_type in ("field_agent", "agent_terrain"):
        coop_id = current_user.get("cooperative_id", "")
        query["coop_id"] = coop_id
    elif user_type not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Role non autorise")

    # Filter by specific farmer
    if farmer_id:
        query["farmer_id"] = farmer_id

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
    result = serialize_pdc_v2(pdc)
    # Planteur ne voit son PDC QUE quand l'etape 3 est terminee (etape3_en_cours, valide)
    if user_type in READONLY_ROLES:
        if pdc.get("current_step", 1) < 3 and pdc.get("statut") != "valide":
            raise HTTPException(status_code=403, detail="Votre PDC n'est pas encore disponible. La cooperative doit completer les etapes 2 et 3.")

    return result


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


@router.get("/{pdc_id}/shade-score")
async def get_pdc_shade_score(pdc_id: str, current_user: dict = Depends(get_current_user)):
    """Calcule le score ombrage ARS 1000 en temps reel a partir des donnees du PDC"""
    pdc = await get_pdc_or_404(pdc_id)
    await check_pdc_access(pdc, current_user)

    from routes.carbon_score_engine import calculate_shade_score_ars1000

    step1 = pdc.get("step1", {})
    f2 = step1.get("fiche2", {})
    f3 = step1.get("fiche3", {})

    # Count trees from fiche2 arbres list + carte arbres_ombrage
    arbres_list = f2.get("arbres", [])
    carte = f2.get("carte_parcelle", {})
    arbres_carte = carte.get("arbres_ombrage", [])

    # Total shade trees: unique trees from both sources
    total_arbres = len(arbres_list) + len(arbres_carte)

    # Count unique species from arbres list (nom_botanique or nom_local)
    especes = set()
    for a in arbres_list:
        nom = (a.get("nom_botanique") or a.get("nom_local") or "").strip().lower()
        if nom and nom != "-":
            especes.add(nom)
    for a in arbres_carte:
        nom = (a.get("nom") or a.get("espece") or "").strip().lower()
        if nom and nom != "-" and nom != "arbre":
            especes.add(nom)

    # Get superficie from cultures
    cultures = f2.get("cultures", [])
    superficie = 0
    for c in cultures:
        try:
            sup = float(c.get("superficie_ha", 0) or 0)
            superficie += sup
        except (ValueError, TypeError):
            pass
    if superficie <= 0:
        superficie = 1.0  # default 1 ha

    # Strate breakdown from arbres list (using decision field or circumference)
    s1 = s2 = s3 = 0
    for a in arbres_list:
        circ = 0
        try:
            circ = float(a.get("circonference", 0) or 0)
        except (ValueError, TypeError):
            pass
        if circ >= 200:  # >200cm circ ~ >30m height
            s3 += 1
        elif circ >= 50:
            s2 += 1
        else:
            s1 += 1

    # Add carte trees (strate info from GPS trees if available)
    for a in arbres_carte:
        strate = a.get("strate", "")
        if strate == "3" or a.get("hauteur", 0) and float(a.get("hauteur", 0)) > 30:
            s3 += 1
        elif strate == "2":
            s2 += 1
        else:
            s1 += 1

    # Agent evaluation from fiche3
    etat = f3.get("etat_cacaoyere", {})
    evaluation = etat.get("ombrage", "")

    result = calculate_shade_score_ars1000(
        nombre_arbres_ombrage=total_arbres,
        superficie_ha=superficie,
        nombre_especes=len(especes),
        has_strate3=s3 > 0,
        evaluation_agent=evaluation,
        arbres_par_strate={"strate1": s1, "strate2": s2, "strate3": s3},
    )

    # Add context
    result["pdc_id"] = pdc_id
    result["superficie_ha"] = superficie
    result["total_arbres_detectes"] = total_arbres
    result["especes_detectees"] = list(especes)

    # Calculate premium impact
    from routes.carbon_premiums import DEFAULT_RATE_PER_HA
    shade_bonus_pts = round(min((result["score"] / 100) * 1.0, 1.0), 2)
    prime_impact_fcfa = round(shade_bonus_pts * DEFAULT_RATE_PER_HA * superficie)
    result["impact_prime"] = {
        "bonus_score_carbone": shade_bonus_pts,
        "prime_supplementaire_fcfa": prime_impact_fcfa,
        "message": f"+ {prime_impact_fcfa:,} FCFA grâce à la couverture ombragée (densité {result['densite_arbres_ha']} arbres/ha, {len(especes)} espèces)" if prime_impact_fcfa > 0 else "Aucun bonus ombrage"
    }

    return result




# ============= SYNC PDC -> ADHESION (bidirectional) =============

@router.post("/{pdc_id}/sync-to-adhesion")
async def sync_pdc_to_adhesion(pdc_id: str, current_user: dict = Depends(get_current_user)):
    """
    Pousse les donnees modifiees du PDC (Step 1 : producteur, cacaoyere, cultures,
    GPS, menage, production, main d'oeuvre) vers la fiche d'adhesion liee.
    Utile quand l'agent terrain corrige sur le terrain et veut maintenir les deux
    registres coherents pour les audits ARS 1000.
    """
    pdc = await db.pdc_v2.find_one({"_id": ObjectId(pdc_id)})
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC introuvable")

    # Permissions: cooperative owner or field_agent of same coop
    user_type = get_user_type(current_user)
    coop_id = str(pdc.get("coop_id", ""))
    if user_type == "cooperative" and str(current_user["_id"]) != coop_id:
        raise HTTPException(status_code=403, detail="Acces refuse")
    if user_type in ("field_agent", "agent_terrain") and str(current_user.get("cooperative_id", "")) != coop_id:
        raise HTTPException(status_code=403, detail="Acces refuse")
    if user_type not in ("cooperative", "field_agent", "agent_terrain", "admin"):
        raise HTTPException(status_code=403, detail="Role non autorise")

    # Lookup adhesion: by _adhesion_id stored during prefill, else by farmer
    step1 = pdc.get("step1") or {}
    f1 = step1.get("fiche1") or {}
    f2 = step1.get("fiche2") or {}
    f4 = step1.get("fiche4") or {}

    producteur = f1.get("producteur") or {}
    gps = (f2.get("coordonnees_gps") or {})
    cultures = f2.get("cultures") or []
    menage = f1.get("membres_menage") or []
    prod_cacao = f4.get("production_cacao") or []
    main_oeuvre = f4.get("main_oeuvre") or []

    adhesion_id = f1.get("_adhesion_id")
    adhesion = None
    if adhesion_id:
        adhesion = await db.membres_adhesions.find_one({"adhesion_id": adhesion_id})
    if not adhesion:
        adhesion = await find_member_adhesion(
            farmer_id=pdc.get("farmer_id", ""),
            farmer_name=pdc.get("farmer_name", "") or producteur.get("nom", ""),
            phone=producteur.get("telephone", ""),
            coop_id=coop_id,
        )
    if not adhesion:
        raise HTTPException(status_code=404, detail="Aucune fiche d'adhesion correspondante trouvee")

    # Build the update payload (only set fields that are non-empty in PDC)
    updates = {}

    def setf(key, value):
        if value not in (None, "", []):
            updates[key] = value

    # Producer
    setf("full_name", producteur.get("nom"))
    setf("code_membre", producteur.get("code_national"))
    setf("cni_number", producteur.get("cni"))
    setf("sexe", producteur.get("sexe"))
    setf("date_naissance", producteur.get("date_naissance"))
    setf("loc_region", producteur.get("delegation_regionale"))
    setf("loc_departement", producteur.get("departement"))
    setf("loc_sous_prefecture", producteur.get("sous_prefecture"))
    setf("village", producteur.get("village"))
    setf("campement", producteur.get("campement"))
    setf("contact", producteur.get("telephone"))
    setf("numero_enregistrement", producteur.get("numero_enregistrement"))
    setf("section", producteur.get("section"))

    # GPS + cacaoyère
    setf("gps_latitude", gps.get("latitude"))
    setf("gps_longitude", gps.get("longitude"))
    setf("code_cacaoyere", f2.get("code_cacaoyere"))
    setf("date_creation_cacaoyere", f2.get("date_creation_cacaoyere"))
    setf("densite_pieds", f2.get("densite_pieds"))
    setf("nombre_parcelles", f2.get("nombre_parcelles"))

    # Cultures
    if cultures:
        main = cultures[0]
        if main.get("libelle"):
            updates["culture"] = main.get("libelle")
        if main.get("superficie_ha"):
            updates["superficie_ha"] = main.get("superficie_ha")
        if len(cultures) > 1:
            updates["autres_cultures"] = [
                {"nom": c.get("libelle", ""), "superficie": c.get("superficie_ha", "")}
                for c in cultures[1:]
            ]

    # Household
    if menage:
        updates["membres_menage"] = [
            {
                "full_name": p.get("nom", ""),
                "date_naissance": p.get("date_naissance", ""),
                "sexe": p.get("sexe", ""),
                "relation": p.get("statut_famille", ""),
                "scolarise": p.get("scolarise", ""),
                "travaille_plantation": p.get("travaille_plantation", ""),
            }
            for p in menage
        ]

    # Production history
    if prod_cacao:
        first = prod_cacao[0]
        setf("recolte_precedente_kg", first.get("production_kg"))
        setf("volume_vendu_precedent_kg", first.get("volume_vendu_kg"))
        setf("estimation_rendement_kg_ha", first.get("rendement_kg_ha"))

    # Workers
    permanents = [t for t in main_oeuvre if (t.get("type") == "permanent" and t.get("nom"))]
    if permanents:
        updates["travailleurs_liste"] = [
            {"full_name": t.get("nom", ""), "statut": t.get("statut", "")} for t in permanents
        ]

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["last_synced_from_pdc_id"] = pdc_id
    updates["last_synced_from_pdc_at"] = updates["updated_at"]

    if not updates or len(updates) == 3:  # only timestamps
        raise HTTPException(status_code=400, detail="Aucune donnee a synchroniser")

    await db.membres_adhesions.update_one(
        {"_id": adhesion["_id"]},
        {"$set": updates},
    )

    # Also tag the PDC so UI knows last sync time
    await db.pdc_v2.update_one(
        {"_id": ObjectId(pdc_id)},
        {"$set": {"last_synced_to_adhesion_at": updates["updated_at"]}},
    )

    return {
        "success": True,
        "adhesion_id": adhesion.get("adhesion_id", ""),
        "fields_updated": sorted([k for k in updates.keys() if k not in ("updated_at", "last_synced_from_pdc_id", "last_synced_from_pdc_at")]),
        "synced_at": updates["updated_at"],
    }
