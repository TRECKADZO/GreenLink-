"""
ARS 1000-3 - Certification & Agroforesterie
GreenLink Agritech - Côte d'Ivoire

Niveaux de certification (Bronze/Argent/Or), audits, conformité,
inventaire arbres d'ombrage, réclamations et risques
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user
from routes.cooperative import verify_cooperative

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ars1000/certification", tags=["ARS 1000 - Certification"])


# ============= MODELS =============

class NonConformite(BaseModel):
    code: str = ""
    description: str = ""
    type: str = "mineure"  # majeure, mineure
    exigence_ref: str = ""
    actions_correctives: str = ""
    date_detection: Optional[str] = None
    date_resolution: Optional[str] = None
    statut: str = "ouverte"  # ouverte, en_cours, resolue

class AuditRecord(BaseModel):
    type_audit: str = ""  # initial, surveillance, renouvellement, inopiné
    date_audit: str = ""
    auditeur: str = ""
    scope: str = ""
    resultats: str = ""
    non_conformites: List[NonConformite] = []
    recommandations: str = ""
    decision: str = ""  # favorable, defavorable, en_attente

class CertificationCreate(BaseModel):
    niveau: str = "bronze"  # bronze, argent, or
    notes: str = ""

class Reclamation(BaseModel):
    objet: str = ""
    description: str = ""
    plaignant: str = ""
    date_reclamation: Optional[str] = None
    priorite: str = "moyenne"  # basse, moyenne, haute
    actions_prises: str = ""

class RisqueImpartialite(BaseModel):
    activite: str = ""
    risque_identifie: str = ""
    causes: str = ""
    consequences: str = ""
    probabilite: int = 1  # 1-5
    gravite: int = 1  # 1-5
    mesures_attenuation: str = ""

class ArbreOmbrageCreate(BaseModel):
    parcelle_id: Optional[str] = None
    espece: str = ""
    nombre: int = 0
    strate: str = ""  # haute, moyenne, basse
    hauteur_m: Optional[float] = None
    diametre_cm: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# ============= HELPERS =============

def get_certification_requirements(niveau: str) -> dict:
    """Retourne les exigences par niveau ARS 1000-3"""
    levels = {
        "bronze": {
            "label": "Bronze",
            "ars1000_1_pct": 38,
            "ars1000_2_pct": 78,
            "delai_mois": 12,
            "description": "Niveau initial - 12 mois après inscription"
        },
        "argent": {
            "label": "Argent",
            "ars1000_1_pct": 90,
            "ars1000_2_pct": 100,
            "delai_mois": 60,
            "description": "Niveau intermédiaire - 5 ans après Bronze"
        },
        "or": {
            "label": "Or",
            "ars1000_1_pct": 100,
            "ars1000_2_pct": 100,
            "delai_mois": 120,
            "description": "Niveau supérieur - 10 ans après inscription"
        }
    }
    return levels.get(niveau, levels["bronze"])


def calculate_certification_level(pdc_conformite: float, qualite_conformite: float) -> str:
    """Détermine le niveau de certification basé sur la conformité"""
    if pdc_conformite >= 100 and qualite_conformite >= 100:
        return "or"
    elif pdc_conformite >= 90 and qualite_conformite >= 100:
        return "argent"
    elif pdc_conformite >= 38 and qualite_conformite >= 78:
        return "bronze"
    else:
        return "non_certifie"


def serialize_certification(cert: dict) -> dict:
    return {
        "id": str(cert["_id"]),
        "coop_id": cert.get("coop_id", ""),
        "niveau": cert.get("niveau", "bronze"),
        "niveau_info": get_certification_requirements(cert.get("niveau", "bronze")),
        "pourcentage_conformite_ars1": cert.get("pourcentage_conformite_ars1", 0),
        "pourcentage_conformite_ars2": cert.get("pourcentage_conformite_ars2", 0),
        "pourcentage_conformite_global": cert.get("pourcentage_conformite_global", 0),
        "cycle_audit": cert.get("cycle_audit", []),
        "non_conformites": cert.get("non_conformites", []),
        "reclamations": cert.get("reclamations", []),
        "risques": cert.get("risques", []),
        "alertes": cert.get("alertes", []),
        "date_certification": cert.get("date_certification"),
        "date_expiration": cert.get("date_expiration"),
        "notes": cert.get("notes", ""),
        "created_at": cert.get("created_at", ""),
        "updated_at": cert.get("updated_at", ""),
    }


# ============= CERTIFICATION ENDPOINTS =============

@router.get("/dashboard")
async def get_certification_dashboard(current_user: dict = Depends(get_current_user)):
    """Tableau de bord certification ARS 1000 de la coopérative"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])

    cert = await db.certification.find_one({"coop_id": coop_id})
    
    if not cert:
        # Auto-create certification entry
        now = datetime.now(timezone.utc).isoformat()
        cert = {
            "coop_id": coop_id,
            "niveau": "non_certifie",
            "pourcentage_conformite_ars1": 0,
            "pourcentage_conformite_ars2": 0,
            "pourcentage_conformite_global": 0,
            "cycle_audit": [],
            "non_conformites": [],
            "reclamations": [],
            "risques": [],
            "alertes": [],
            "date_certification": None,
            "date_expiration": None,
            "notes": "",
            "created_at": now,
            "updated_at": now,
        }
        result = await db.certification.insert_one(cert)
        cert["_id"] = result.inserted_id

    # Calculate real-time conformity from PDCs and Lots
    pdc_pipeline = [
        {"$match": {"coop_id": coop_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$pourcentage_conformite"}, "total": {"$sum": 1}}}
    ]
    pdc_agg = await db.pdc.aggregate(pdc_pipeline).to_list(1)
    pdc_pct = round(pdc_agg[0]["avg"], 1) if pdc_agg and pdc_agg[0].get("avg") else 0
    total_pdcs = pdc_agg[0]["total"] if pdc_agg else 0

    lots_pipeline = [
        {"$match": {"coop_id": coop_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$controles_qualite.score_qualite_global"}, "total": {"$sum": 1}}}
    ]
    lots_agg = await db.lots_traceabilite.aggregate(lots_pipeline).to_list(1)
    qualite_pct = round(lots_agg[0]["avg"], 1) if lots_agg and lots_agg[0].get("avg") else 0
    total_lots = lots_agg[0]["total"] if lots_agg else 0

    # Calculate niveau
    suggested_niveau = calculate_certification_level(pdc_pct, qualite_pct)
    global_pct = round((pdc_pct + qualite_pct) / 2, 1) if (pdc_pct + qualite_pct) > 0 else 0

    # Update cert
    await db.certification.update_one(
        {"_id": cert["_id"]},
        {"$set": {
            "pourcentage_conformite_ars1": pdc_pct,
            "pourcentage_conformite_ars2": qualite_pct,
            "pourcentage_conformite_global": global_pct,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    cert["pourcentage_conformite_ars1"] = pdc_pct
    cert["pourcentage_conformite_ars2"] = qualite_pct
    cert["pourcentage_conformite_global"] = global_pct

    # Arbres ombrage stats
    arbres_count = await db.arbres_ombrage.count_documents({"coop_id": coop_id})
    arbres_pipeline = [
        {"$match": {"coop_id": coop_id}},
        {"$group": {
            "_id": None,
            "total_arbres": {"$sum": "$nombre"},
            "especes": {"$addToSet": "$espece"}
        }}
    ]
    arbres_agg = await db.arbres_ombrage.aggregate(arbres_pipeline).to_list(1)
    total_arbres = arbres_agg[0]["total_arbres"] if arbres_agg else 0
    nb_especes = len(arbres_agg[0]["especes"]) if arbres_agg else 0

    # NC counts
    nc_ouvertes = len([nc for nc in cert.get("non_conformites", []) if nc.get("statut") == "ouverte"])

    return {
        "certification": serialize_certification(cert),
        "niveau_suggere": suggested_niveau,
        "niveau_info": get_certification_requirements(suggested_niveau),
        "stats": {
            "total_pdcs": total_pdcs,
            "conformite_ars1": pdc_pct,
            "total_lots": total_lots,
            "conformite_ars2": qualite_pct,
            "conformite_global": global_pct,
            "total_arbres_ombrage": total_arbres,
            "nombre_especes": nb_especes,
            "nc_ouvertes": nc_ouvertes,
        }
    }


@router.post("/audit")
async def add_audit(audit: AuditRecord, current_user: dict = Depends(get_current_user)):
    """Enregistrer un audit"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])

    audit_data = audit.model_dump()
    audit_data["date_audit"] = audit_data.get("date_audit") or datetime.now(timezone.utc).isoformat()

    now = datetime.now(timezone.utc).isoformat()
    await db.certification.update_one(
        {"coop_id": coop_id},
        {
            "$push": {"cycle_audit": audit_data},
            "$set": {"updated_at": now}
        },
        upsert=True
    )

    return {"message": "Audit enregistré", "audit": audit_data}


@router.post("/non-conformite")
async def add_non_conformite(nc: NonConformite, current_user: dict = Depends(get_current_user)):
    """Ajouter une non-conformité"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])

    nc_data = nc.model_dump()
    nc_data["date_detection"] = nc_data.get("date_detection") or datetime.now(timezone.utc).isoformat()
    nc_data["id"] = str(ObjectId())

    now = datetime.now(timezone.utc).isoformat()
    await db.certification.update_one(
        {"coop_id": coop_id},
        {
            "$push": {"non_conformites": nc_data},
            "$set": {"updated_at": now}
        },
        upsert=True
    )

    # Generate alert if major
    if nc.type == "majeure":
        alerte = {
            "type": "non_conformite_majeure",
            "message": f"NC majeure détectée: {nc.description}",
            "date": now,
            "lue": False
        }
        await db.certification.update_one(
            {"coop_id": coop_id},
            {"$push": {"alertes": alerte}}
        )

    return {"message": "Non-conformité ajoutée", "nc": nc_data}


@router.post("/reclamation")
async def add_reclamation(rec: Reclamation, current_user: dict = Depends(get_current_user)):
    """Ajouter une réclamation"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])

    rec_data = rec.model_dump()
    rec_data["date_reclamation"] = rec_data.get("date_reclamation") or datetime.now(timezone.utc).isoformat()
    rec_data["id"] = str(ObjectId())
    rec_data["statut"] = "ouverte"

    now = datetime.now(timezone.utc).isoformat()
    await db.certification.update_one(
        {"coop_id": coop_id},
        {
            "$push": {"reclamations": rec_data},
            "$set": {"updated_at": now}
        },
        upsert=True
    )

    return {"message": "Réclamation enregistrée", "reclamation": rec_data}


@router.post("/risque")
async def add_risque(risque: RisqueImpartialite, current_user: dict = Depends(get_current_user)):
    """Ajouter un risque d'impartialité"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])

    risque_data = risque.model_dump()
    risque_data["id"] = str(ObjectId())
    risque_data["score"] = risque.probabilite * risque.gravite
    risque_data["date_creation"] = datetime.now(timezone.utc).isoformat()

    now = datetime.now(timezone.utc).isoformat()
    await db.certification.update_one(
        {"coop_id": coop_id},
        {
            "$push": {"risques": risque_data},
            "$set": {"updated_at": now}
        },
        upsert=True
    )

    return {"message": "Risque enregistré", "risque": risque_data}


# ============= ARBRES OMBRAGE ENDPOINTS =============

@router.post("/arbres-ombrage")
async def add_arbre(arbre: ArbreOmbrageCreate, current_user: dict = Depends(get_current_user)):
    """Ajouter un inventaire d'arbres d'ombrage"""
    user_type = current_user.get("user_type", "")
    user_id = str(current_user["_id"])

    coop_id = ""
    if user_type in ("cooperative",):
        coop_id = user_id
    elif user_type in ("field_agent", "agent_terrain"):
        coop_id = current_user.get("cooperative_id", "")
    elif user_type in ("farmer", "planteur"):
        member = await db.coop_members.find_one({"user_id": user_id})
        if member:
            coop_id = str(member.get("coop_id", ""))

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "coop_id": coop_id,
        "parcelle_id": arbre.parcelle_id or "",
        "espece": arbre.espece,
        "nombre": arbre.nombre,
        "strate": arbre.strate,
        "hauteur_m": arbre.hauteur_m,
        "diametre_cm": arbre.diametre_cm,
        "latitude": arbre.latitude,
        "longitude": arbre.longitude,
        "created_by": user_id,
        "created_at": now,
    }

    result = await db.arbres_ombrage.insert_one(doc)
    doc["_id"] = result.inserted_id

    return {
        "id": str(doc["_id"]),
        "espece": doc["espece"],
        "nombre": doc["nombre"],
        "strate": doc["strate"],
        "created_at": doc["created_at"],
    }


@router.get("/arbres-ombrage")
async def get_arbres(
    current_user: dict = Depends(get_current_user),
    parcelle_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200)
):
    """Liste des arbres d'ombrage"""
    user_type = current_user.get("user_type", "")
    user_id = str(current_user["_id"])

    query = {}
    if user_type in ("cooperative",):
        query["coop_id"] = user_id
    elif user_type in ("field_agent", "agent_terrain"):
        query["coop_id"] = current_user.get("cooperative_id", "")
    elif user_type in ("farmer", "planteur"):
        query["created_by"] = user_id

    if parcelle_id:
        query["parcelle_id"] = parcelle_id

    total = await db.arbres_ombrage.count_documents(query)
    skip = (page - 1) * limit
    arbres = await db.arbres_ombrage.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    return {"total": total, "arbres": arbres}


@router.get("/arbres-ombrage/stats")
async def get_arbres_stats(
    current_user: dict = Depends(get_current_user),
    parcelle_id: Optional[str] = Query(None)
):
    """Statistiques agroforesterie"""
    user_type = current_user.get("user_type", "")
    user_id = str(current_user["_id"])

    match_q = {}
    if user_type in ("cooperative",):
        match_q["coop_id"] = user_id
    elif user_type in ("field_agent", "agent_terrain"):
        match_q["coop_id"] = current_user.get("cooperative_id", "")
    
    if parcelle_id:
        match_q["parcelle_id"] = parcelle_id

    pipeline = [
        {"$match": match_q},
        {"$group": {
            "_id": None,
            "total_arbres": {"$sum": "$nombre"},
            "especes": {"$addToSet": "$espece"},
            "strate_haute": {"$sum": {"$cond": [{"$eq": ["$strate", "haute"]}, "$nombre", 0]}},
            "strate_moyenne": {"$sum": {"$cond": [{"$eq": ["$strate", "moyenne"]}, "$nombre", 0]}},
            "strate_basse": {"$sum": {"$cond": [{"$eq": ["$strate", "basse"]}, "$nombre", 0]}},
        }}
    ]
    agg = await db.arbres_ombrage.aggregate(pipeline).to_list(1)

    if not agg:
        return {
            "total_arbres": 0,
            "nombre_especes": 0,
            "especes": [],
            "strate_haute": 0,
            "strate_moyenne": 0,
            "strate_basse": 0,
            "densite_par_ha": 0,
            "conforme_agroforesterie": False,
            "conformite_details": {
                "densite_ok": False,
                "especes_ok": False,
                "strates_ok": False,
            }
        }

    data = agg[0]
    total = data["total_arbres"]
    especes = data["especes"]
    nb_especes = len(especes)

    # Get total superficie from PDCs
    pdc_pipeline = [
        {"$match": {"coop_id": match_q.get("coop_id", "")}},
        {"$unwind": "$parcelles"},
        {"$group": {"_id": None, "total_ha": {"$sum": "$parcelles.superficie_ha"}}}
    ]
    pdc_agg = await db.pdc.aggregate(pdc_pipeline).to_list(1)
    total_ha = pdc_agg[0]["total_ha"] if pdc_agg else 1

    densite = round(total / max(total_ha, 0.1), 1)
    densite_ok = 25 <= densite <= 40
    especes_ok = nb_especes >= 3
    strates_ok = data["strate_haute"] > 0 and data["strate_moyenne"] > 0 and data["strate_basse"] > 0

    return {
        "total_arbres": total,
        "nombre_especes": nb_especes,
        "especes": especes,
        "strate_haute": data["strate_haute"],
        "strate_moyenne": data["strate_moyenne"],
        "strate_basse": data["strate_basse"],
        "densite_par_ha": densite,
        "superficie_totale_ha": round(total_ha, 2),
        "conforme_agroforesterie": densite_ok and especes_ok and strates_ok,
        "conformite_details": {
            "densite_ok": densite_ok,
            "densite_requise": "25-40 arbres/ha",
            "especes_ok": especes_ok,
            "especes_requises": "min 3 espèces",
            "strates_ok": strates_ok,
            "strates_requises": "3 strates (haute, moyenne, basse)",
        }
    }


# ============= GESTION STATUTS RECLAMATIONS/RISQUES =============

@router.put("/reclamation/{rec_id}/status")
async def update_reclamation_status(rec_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    """Modifier le statut d'une réclamation (ouverte -> en_cours -> resolue/fermee)"""
    user_type = current_user.get("user_type", "")
    if user_type not in ("cooperative", "admin"):
        raise HTTPException(status_code=403, detail="Non autorisé")

    coop_id = str(current_user["_id"]) if user_type == "cooperative" else ""
    new_status = body.get("statut", "")
    if new_status not in ("ouverte", "en_cours", "resolue", "fermee"):
        raise HTTPException(status_code=400, detail="Statut invalide")

    actions = body.get("actions_prises", "")
    now = datetime.now(timezone.utc).isoformat()

    result = await db.certification.update_one(
        {"coop_id": coop_id, "reclamations.id": rec_id},
        {"$set": {
            "reclamations.$.statut": new_status,
            "reclamations.$.actions_prises": actions,
            "reclamations.$.date_resolution": now if new_status in ("resolue", "fermee") else "",
            "updated_at": now,
        }}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Réclamation introuvable")

    return {"message": f"Statut mis à jour: {new_status}", "id": rec_id}


@router.delete("/reclamation/{rec_id}")
async def delete_reclamation(rec_id: str, current_user: dict = Depends(get_current_user)):
    """Supprimer une réclamation"""
    user_type = current_user.get("user_type", "")
    if user_type not in ("cooperative", "admin"):
        raise HTTPException(status_code=403, detail="Non autorisé")

    coop_id = str(current_user["_id"]) if user_type == "cooperative" else ""

    result = await db.certification.update_one(
        {"coop_id": coop_id},
        {"$pull": {"reclamations": {"id": rec_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Réclamation introuvable")

    return {"message": "Réclamation supprimée"}


@router.put("/risque/{risque_id}/status")
async def update_risque_status(risque_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    """Modifier le statut d'un risque"""
    user_type = current_user.get("user_type", "")
    if user_type not in ("cooperative", "admin"):
        raise HTTPException(status_code=403, detail="Non autorisé")

    coop_id = str(current_user["_id"]) if user_type == "cooperative" else ""
    new_status = body.get("statut", "")
    if new_status not in ("identifie", "en_traitement", "attenue", "ferme"):
        raise HTTPException(status_code=400, detail="Statut invalide")

    now = datetime.now(timezone.utc).isoformat()

    result = await db.certification.update_one(
        {"coop_id": coop_id, "risques.id": risque_id},
        {"$set": {
            "risques.$.statut": new_status,
            "risques.$.date_mise_a_jour": now,
            "updated_at": now,
        }}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Risque introuvable")

    return {"message": f"Statut risque mis à jour: {new_status}", "id": risque_id}


@router.delete("/risque/{risque_id}")
async def delete_risque(risque_id: str, current_user: dict = Depends(get_current_user)):
    """Supprimer un risque"""
    user_type = current_user.get("user_type", "")
    if user_type not in ("cooperative", "admin"):
        raise HTTPException(status_code=403, detail="Non autorisé")

    coop_id = str(current_user["_id"]) if user_type == "cooperative" else ""

    result = await db.certification.update_one(
        {"coop_id": coop_id},
        {"$pull": {"risques": {"id": risque_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Risque introuvable")

    return {"message": "Risque supprimé"}


# ============= DECLARATION IMPARTIALITE =============

class DeclarationImpartialite(BaseModel):
    signataire_nom: str = ""
    signataire_fonction: str = ""
    engagement: str = "Je m'engage à exercer mes activités en toute impartialité"
    conflits_interets: str = ""
    mesures_preventives: str = ""

@router.post("/impartialite")
async def add_declaration_impartialite(data: DeclarationImpartialite, current_user: dict = Depends(get_current_user)):
    """Ajouter une déclaration d'impartialité"""
    user_type = current_user.get("user_type", "")
    if user_type not in ("cooperative", "admin"):
        raise HTTPException(status_code=403, detail="Non autorisé")

    coop_id = str(current_user["_id"]) if user_type == "cooperative" else ""
    now = datetime.now(timezone.utc).isoformat()

    decl = data.model_dump()
    decl["id"] = str(ObjectId())
    decl["date_signature"] = now
    decl["signe_par"] = str(current_user["_id"])

    await db.certification.update_one(
        {"coop_id": coop_id},
        {
            "$push": {"declarations_impartialite": decl},
            "$set": {"updated_at": now}
        },
        upsert=True
    )

    return {"message": "Déclaration d'impartialité enregistrée", "declaration": decl}


@router.get("/impartialite")
async def get_declarations_impartialite(current_user: dict = Depends(get_current_user)):
    """Liste des déclarations d'impartialité"""
    user_type = current_user.get("user_type", "")
    coop_id = str(current_user["_id"]) if user_type == "cooperative" else ""

    cert = await db.certification.find_one({"coop_id": coop_id})
    if not cert:
        return {"declarations": []}

    return {"declarations": cert.get("declarations_impartialite", [])}

