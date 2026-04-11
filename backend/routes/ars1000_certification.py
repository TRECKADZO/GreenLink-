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

    # Calculate real-time conformity from PDC v2 and Lots
    # PDC v2: count fiches filled per step
    pdc_v2_cursor = db.pdc_v2.find({"coop_id": coop_id, "statut": {"$nin": ["archive"]}})
    pdc_v2_list = await pdc_v2_cursor.to_list(500)
    total_pdcs = len(pdc_v2_list)

    # Calculate PDC conformity based on fiche completion
    if total_pdcs > 0:
        total_score = 0
        for p in pdc_v2_list:
            s1 = p.get("step1", {})
            s2 = p.get("step2", {})
            s3 = p.get("step3", {})
            fiches_filled = 0
            # Fiche 1: producteur info
            f1 = s1.get("fiche1", {})
            if f1.get("producteur", {}).get("nom") or (f1.get("membres_menage") and len(f1["membres_menage"]) > 0):
                fiches_filled += 1
            # Fiche 2: exploitation (cultures or arbres or carte)
            f2 = s1.get("fiche2", {})
            if f2.get("cultures") or f2.get("arbres") or (f2.get("carte_parcelle", {}).get("polygon") and len(f2["carte_parcelle"]["polygon"]) > 0):
                fiches_filled += 1
            # Fiche 3: cacaoyere
            f3 = s1.get("fiche3", {})
            if f3.get("etat_cacaoyere", {}).get("dispositif_plantation") or f3.get("maladies"):
                fiches_filled += 1
            # Fiche 4: socio-economique
            f4 = s1.get("fiche4", {})
            if f4.get("epargne") or f4.get("production_cacao") or f4.get("main_oeuvre"):
                fiches_filled += 1
            # Fiche 5: analyse
            f5 = s2.get("fiche5", {})
            if f5.get("analyses") and len(f5["analyses"]) > 0:
                fiches_filled += 1
            # Fiche 6: planification
            f6 = s3.get("fiche6", {})
            if f6.get("axes") and len(f6["axes"]) > 0:
                fiches_filled += 1
            # Fiche 7: programme annuel
            f7 = s3.get("fiche7", {})
            if f7.get("actions") and len(f7["actions"]) > 0:
                fiches_filled += 1
            # Fiche 8: moyens et couts
            f8 = s3.get("fiche8", {})
            if f8.get("moyens") and len(f8["moyens"]) > 0:
                fiches_filled += 1
            total_score += round(fiches_filled / 8 * 100)
        pdc_pct = round(total_score / total_pdcs, 1)
    else:
        pdc_pct = 0

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

    # Arbres ombrage stats — from PDC v2 fiche2 arbres + carte_parcelle
    total_arbres = 0
    especes_set = set()
    for p in pdc_v2_list:
        f2 = p.get("step1", {}).get("fiche2", {})
        arbres = f2.get("arbres", [])
        carte_arbres = (f2.get("carte_parcelle") or {}).get("arbres_ombrage", [])
        total_arbres += len(arbres) + len(carte_arbres)
        for a in arbres:
            nom = (a.get("nom_botanique") or a.get("nom_local") or "").strip().lower()
            if nom and nom != "-":
                especes_set.add(nom)
        for a in carte_arbres:
            nom = (a.get("nom") or a.get("espece") or "").strip().lower()
            if nom and nom != "-" and nom != "arbre":
                especes_set.add(nom)
    nb_especes = len(especes_set)

    # Also check legacy arbres_ombrage collection
    legacy_arbres_agg = await db.arbres_ombrage.aggregate([
        {"$match": {"coop_id": coop_id}},
        {"$group": {"_id": None, "total": {"$sum": "$nombre"}, "especes": {"$addToSet": "$espece"}}}
    ]).to_list(1)
    if legacy_arbres_agg:
        total_arbres += legacy_arbres_agg[0].get("total", 0)
        for e in legacy_arbres_agg[0].get("especes", []):
            if e:
                especes_set.add(e.lower())
        nb_especes = len(especes_set)

    # NC counts
    nc_ouvertes = len([nc for nc in cert.get("non_conformites", []) if nc.get("statut") == "ouverte"])

    # PDC validés
    pdc_valides = len([p for p in pdc_v2_list if p.get("statut") == "valide"])

    # Score ombrage moyen (from PDC v2)
    shade_scores = []
    try:
        from routes.carbon_score_engine import calculate_shade_score_ars1000
        for p in pdc_v2_list:
            f2 = p.get("step1", {}).get("fiche2", {})
            f3 = p.get("step1", {}).get("fiche3", {})
            arbres = f2.get("arbres", [])
            carte_a = (f2.get("carte_parcelle") or {}).get("arbres_ombrage", [])
            n_arbres = len(arbres) + len(carte_a)
            if n_arbres > 0:
                esp = set()
                for a in arbres:
                    nm = (a.get("nom_botanique") or a.get("nom_local") or "").strip().lower()
                    if nm and nm != "-":
                        esp.add(nm)
                for a in carte_a:
                    nm = (a.get("nom") or a.get("espece") or "").strip().lower()
                    if nm and nm != "-" and nm != "arbre":
                        esp.add(nm)
                sup = sum(float(c.get("superficie_ha", 0) or 0) for c in f2.get("cultures", [])) or 1.0
                s3_count = sum(1 for a in arbres if float(a.get("circonference", 0) or 0) >= 200)
                shade_r = calculate_shade_score_ars1000(
                    nombre_arbres_ombrage=n_arbres, superficie_ha=sup,
                    nombre_especes=len(esp), has_strate3=s3_count > 0,
                    evaluation_agent=(f3.get("etat_cacaoyere") or {}).get("ombrage", ""),
                )
                shade_scores.append(shade_r["score"])
    except Exception:
        pass
    score_ombrage_moyen = round(sum(shade_scores) / len(shade_scores), 1) if shade_scores else 0
    pdc_conformes_ombrage = len([s for s in shade_scores if s >= 60])

    # Total récoltes kg
    recolte_agg = await db.ars1000_declarations_recoltes.aggregate([
        {"$match": {"coop_id": coop_id, "statut": "validee"}},
        {"$group": {"_id": None, "total_kg": {"$sum": "$quantite_kg"}}}
    ]).to_list(1)
    total_kg_recoltes = recolte_agg[0]["total_kg"] if recolte_agg else 0

    return {
        "certification": serialize_certification(cert),
        "niveau_suggere": suggested_niveau,
        "niveau_info": get_certification_requirements(suggested_niveau),
        "total_pdc": total_pdcs,
        "pdc_valides": pdc_valides,
        "total_kg_recoltes": total_kg_recoltes,
        "stats": {
            "total_pdcs": total_pdcs,
            "pdc_valides": pdc_valides,
            "conformite_ars1": pdc_pct,
            "total_lots": total_lots,
            "conformite_ars2": qualite_pct,
            "conformite_global": global_pct,
            "total_arbres_ombrage": total_arbres,
            "nombre_especes": nb_especes,
            "nc_ouvertes": nc_ouvertes,
            "total_kg_recoltes": total_kg_recoltes,
            "score_ombrage_moyen": score_ombrage_moyen,
            "pdc_conformes_ombrage": pdc_conformes_ombrage,
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
    """Ajouter une réclamation (coopérative ou agriculteur)"""
    user_type = current_user.get("user_type", "")
    user_id = str(current_user["_id"])

    if user_type in ("cooperative", "admin"):
        coop_id = user_id
    elif user_type in ("farmer", "planteur", "producteur"):
        member = await db.coop_members.find_one({"user_id": user_id})
        coop_id = str(member.get("coop_id", "")) if member else ""
    else:
        raise HTTPException(status_code=403, detail="Non autorisé")

    rec_data = rec.model_dump()
    rec_data["date_reclamation"] = rec_data.get("date_reclamation") or datetime.now(timezone.utc).isoformat()
    rec_data["id"] = str(ObjectId())
    rec_data["statut"] = "ouverte"
    rec_data["farmer_id"] = user_id if user_type in ("farmer", "planteur", "producteur") else ""
    rec_data["farmer_name"] = current_user.get("full_name", "") if user_type in ("farmer", "planteur", "producteur") else ""
    rec_data["source"] = "agriculteur" if user_type in ("farmer", "planteur", "producteur") else "cooperative"

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


@router.get("/reclamations/farmer")
async def get_farmer_reclamations(current_user: dict = Depends(get_current_user)):
    """Réclamations d'un agriculteur"""
    user_id = str(current_user["_id"])
    member = await db.coop_members.find_one({"user_id": user_id})
    coop_id = str(member.get("coop_id", "")) if member else ""

    cert = await db.certification.find_one({"coop_id": coop_id})
    if not cert:
        return {"reclamations": []}

    all_recs = cert.get("reclamations", [])
    farmer_recs = [r for r in all_recs if r.get("farmer_id") == user_id]
    return {"reclamations": farmer_recs}


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

