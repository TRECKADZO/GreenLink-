"""
Gestion des Ecarts - Discrepancy Management
Compare declared vs measured data and classify discrepancies.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
from bson import ObjectId
from typing import Optional, List
import logging

from routes.auth import get_current_user
from database import db

logger = logging.getLogger(__name__)
router = APIRouter()

# ============= CONSTANTS =============
SEUIL_FAIBLE = 15.0      # < 15% = faible
SEUIL_MOYEN = 30.0       # 15-30% = moyen
# > 30% = important

CAMPAGNE_ACTUELLE = "2025-2026"

IMPACT_PRIME = {
    "faible": {"label": "Ajustee legerement", "coefficient": 0.95},
    "moyen": {"label": "Ajustee moderement", "coefficient": 0.80},
    "important": {"label": "Reduite ou suspendue", "coefficient": 0.50},
}


# ============= ENGINE =============

def calc_ecart_pct(declare, mesure):
    """Calculate percentage difference. Returns 0 if both are 0 or None."""
    if declare is None or mesure is None:
        return None
    d = float(declare)
    m = float(mesure)
    if d == 0 and m == 0:
        return 0.0
    if d == 0:
        return 100.0
    return round(abs(d - m) / d * 100, 1)


def classify(ecart_pct):
    """Classify a discrepancy percentage."""
    if ecart_pct is None:
        return None
    if ecart_pct < SEUIL_FAIBLE:
        return "faible"
    elif ecart_pct < SEUIL_MOYEN:
        return "moyen"
    return "important"


def compute_discrepancies(parcel_declared: dict, agent_measured: dict):
    """
    Compare declared parcel data with agent-measured data.
    Returns list of field-level discrepancies and global classification.
    """
    ecarts = []

    # 1. Surface (hectares)
    d_surface = parcel_declared.get("area_hectares") or parcel_declared.get("superficie")
    m_surface = agent_measured.get("corrected_area_hectares") or agent_measured.get("area_hectares")
    if d_surface is not None and m_surface is not None:
        pct = calc_ecart_pct(d_surface, m_surface)
        if pct is not None and pct > 0:
            ecarts.append({
                "champ": "surface_hectares",
                "label": "Surface (hectares)",
                "declare": float(d_surface),
                "mesure": float(m_surface),
                "ecart_pct": pct,
                "classification": classify(pct),
            })

    # 2. Total trees
    d_arbres = parcel_declared.get("nombre_arbres", 0) or 0
    m_total = 0
    m_p = agent_measured.get("arbres_petits")
    m_m = agent_measured.get("arbres_moyens")
    m_g = agent_measured.get("arbres_grands")
    if m_p is not None or m_m is not None or m_g is not None:
        m_total = int(m_p or 0) + int(m_m or 0) + int(m_g or 0)
    else:
        m_total = int(agent_measured.get("nombre_arbres") or 0)

    if d_arbres > 0 or m_total > 0:
        pct = calc_ecart_pct(d_arbres, m_total)
        if pct is not None and pct > 0:
            ecarts.append({
                "champ": "nombre_arbres_total",
                "label": "Nombre total d'arbres ombrages",
                "declare": int(d_arbres),
                "mesure": m_total,
                "ecart_pct": pct,
                "classification": classify(pct),
            })

    # 3. Trees by strata
    strate_map = [
        ("arbres_grands", "arbres_grands", "Arbres Strate 3 (>30m)"),
        ("arbres_moyens", "arbres_moyens", "Arbres Strate 2 (5-30m)"),
        ("arbres_petits", "arbres_petits", "Arbres Strate 1 (3-5m)"),
    ]
    for d_key, m_key, label in strate_map:
        d_val = parcel_declared.get(d_key, 0) or 0
        m_val = int(agent_measured.get(m_key) or 0)
        if d_val > 0 or m_val > 0:
            pct = calc_ecart_pct(d_val, m_val)
            if pct is not None and pct > 0:
                ecarts.append({
                    "champ": m_key,
                    "label": label,
                    "declare": int(d_val),
                    "mesure": m_val,
                    "ecart_pct": pct,
                    "classification": classify(pct),
                })

    # 4. Burning practice (boolean)
    d_brulage = parcel_declared.get("pratique_brulage")
    m_brulage = agent_measured.get("pratique_brulage")
    if d_brulage is not None and m_brulage is not None and d_brulage != m_brulage:
        ecarts.append({
            "champ": "pratique_brulage",
            "label": "Pratique du brulage",
            "declare": "Oui" if d_brulage else "Non",
            "mesure": "Oui" if m_brulage else "Non",
            "ecart_pct": 100.0,
            "classification": "important",
        })

    # 5. Shade coverage
    d_couv = parcel_declared.get("couverture_ombragee", 0) or 0
    m_couv = float(agent_measured.get("couverture_ombragee") or 0)
    if d_couv > 0 or m_couv > 0:
        pct = calc_ecart_pct(d_couv, m_couv)
        if pct is not None and pct > 0:
            ecarts.append({
                "champ": "couverture_ombragee",
                "label": "Couverture ombragee (%)",
                "declare": float(d_couv),
                "mesure": m_couv,
                "ecart_pct": pct,
                "classification": classify(pct),
            })

    # Global classification = worst-case
    classifications = [e["classification"] for e in ecarts if e.get("classification")]
    if "important" in classifications:
        global_class = "important"
    elif "moyen" in classifications:
        global_class = "moyen"
    elif "faible" in classifications:
        global_class = "faible"
    else:
        global_class = None  # No discrepancies

    return ecarts, global_class


async def create_discrepancy_record(
    parcel_id: str, parcel: dict, agent_data: dict,
    agent_id: str, agent_name: str, coop_id: str
):
    """
    Create a discrepancy record after a parcel verification.
    Returns the discrepancy document or None if no ecarts.
    """
    ecarts, global_class = compute_discrepancies(parcel, agent_data)

    if not ecarts:
        return None

    # Get farmer info
    farmer_id = str(parcel.get("farmer_id", ""))
    farmer = None
    if farmer_id:
        farmer = await db.coop_members.find_one({"user_id": farmer_id}, {"_id": 0, "full_name": 1, "phone_number": 1})
        if not farmer:
            farmer = await db.coop_members.find_one({"_id": ObjectId(farmer_id)}, {"_id": 0, "full_name": 1, "phone_number": 1}) if ObjectId.is_valid(farmer_id) else None

    # Calculate premium impact
    impact = IMPACT_PRIME.get(global_class, IMPACT_PRIME["faible"])
    area = float(agent_data.get("corrected_area_hectares") or parcel.get("area_hectares", 0))
    carbon_score = parcel.get("carbon_score", 5.0)
    prime_base = round(area * carbon_score * 2.5 * 1000, 0)  # XOF per tonne
    prime_ajustee = round(prime_base * impact["coefficient"], 0)

    # Determine status
    if global_class == "important":
        statut = "verification_renforcee"
    elif global_class == "moyen":
        statut = "en_attente_validation"
    else:
        statut = "corrige_auto"

    doc = {
        "parcel_id": parcel_id,
        "farmer_id": farmer_id,
        "farmer_name": farmer.get("full_name", "Inconnu") if farmer else "Inconnu",
        "farmer_phone": farmer.get("phone_number", "") if farmer else "",
        "coop_id": coop_id,
        "agent_id": agent_id,
        "agent_name": agent_name,
        "parcelle_location": parcel.get("location", ""),
        "campagne": CAMPAGNE_ACTUELLE,
        "ecarts": ecarts,
        "nb_ecarts": len(ecarts),
        "classification_globale": global_class,
        "impact_prime": impact["label"],
        "impact_coefficient": impact["coefficient"],
        "prime_estimee_avant": prime_base,
        "prime_estimee_apres": prime_ajustee,
        "commentaire_agent": agent_data.get("verification_notes", ""),
        "statut": statut,
        "notification_envoyee": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await db.discrepancies.insert_one(doc)
    doc_id = str(result.inserted_id)

    # Send notification to farmer
    await _notify_farmer(doc, farmer_id, parcel)

    # Create in-app notification for cooperative
    if global_class in ("moyen", "important"):
        await _notify_cooperative(doc, coop_id, global_class)

    # Update discrepancy flag on the parcel
    await db.parcels.update_one(
        {"_id": ObjectId(parcel_id)},
        {"$set": {
            "has_discrepancy": True,
            "discrepancy_id": doc_id,
            "discrepancy_classification": global_class,
            "prime_coefficient": impact["coefficient"],
        }}
    )

    # Mark notification sent
    await db.discrepancies.update_one(
        {"_id": result.inserted_id},
        {"$set": {"notification_envoyee": True}}
    )

    logger.info(f"[ECART] Parcel {parcel_id} — {global_class} ({len(ecarts)} ecarts) — Prime: {prime_base} -> {prime_ajustee} XOF")
    return {**doc, "id": doc_id, "_id": None}


async def _notify_farmer(disc, farmer_id, parcel):
    """Send notification to farmer about the discrepancy."""
    try:
        # Find main surface discrepancy for message
        surface_ecart = next((e for e in disc["ecarts"] if e["champ"] == "surface_hectares"), None)
        if surface_ecart:
            msg = (
                f"Verification parcelle: Votre declaration de {surface_ecart['declare']} ha "
                f"a ete verifiee. Nous avons enregistre {surface_ecart['mesure']} ha. "
                f"Votre prime a ete ajustee ({disc['impact_prime'].lower()})."
            )
        else:
            msg = (
                f"Verification parcelle ({disc['parcelle_location']}): "
                f"Des ecarts ont ete constates ({disc['classification_globale']}). "
                f"Votre prime a ete ajustee ({disc['impact_prime'].lower()})."
            )

        # Store in-app notification
        await db.notifications.insert_one({
            "user_id": farmer_id,
            "type": "ecart_verification",
            "title": "Resultat de verification",
            "message": msg,
            "data": {
                "parcel_id": disc["parcel_id"],
                "classification": disc["classification_globale"],
            },
            "read": False,
            "created_at": datetime.utcnow()
        })

        # Also store as USSD message for next login
        await db.ussd_messages.insert_one({
            "farmer_id": farmer_id,
            "phone": disc.get("farmer_phone", ""),
            "message": msg,
            "type": "ecart",
            "read": False,
            "created_at": datetime.utcnow()
        })

    except Exception as e:
        logger.error(f"[ECART] Notification error: {e}")


async def _notify_cooperative(disc, coop_id, classification):
    """Notify cooperative about medium/important discrepancies."""
    try:
        severity = "Ecart important" if classification == "important" else "Ecart moyen"
        msg = (
            f"{severity} detecte sur la parcelle {disc['parcelle_location']} "
            f"de {disc['farmer_name']}. {disc['nb_ecarts']} ecart(s) constate(s). "
        )
        if classification == "important":
            msg += "Verification renforcee requise."
        else:
            msg += "Validation requise."

        await db.notifications.insert_one({
            "user_id": coop_id,
            "type": "ecart_cooperative",
            "title": severity,
            "message": msg,
            "data": {
                "parcel_id": disc["parcel_id"],
                "farmer_id": disc["farmer_id"],
                "classification": classification,
            },
            "read": False,
            "created_at": datetime.utcnow()
        })
    except Exception as e:
        logger.error(f"[ECART] Coop notification error: {e}")


# ============= API ENDPOINTS =============

def verify_cooperative_access(user):
    if user.get("user_type") not in ("cooperative", "admin"):
        raise HTTPException(status_code=403, detail="Acces reserve aux cooperatives et admins")


@router.get("/cooperative")
async def get_cooperative_discrepancies(
    classification: Optional[str] = Query(None, description="faible|moyen|important"),
    campagne: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Dashboard cooperatif des ecarts — filtrable par classification et campagne."""
    verify_cooperative_access(current_user)

    query = {}
    if current_user.get("user_type") == "cooperative":
        query["coop_id"] = current_user["_id"]
    if classification:
        query["classification_globale"] = classification
    if campagne:
        query["campagne"] = campagne

    total = await db.discrepancies.count_documents(query)
    skip = (page - 1) * limit

    records = await db.discrepancies.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    # Add string ID from _id before projection
    raw = await db.discrepancies.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for r in raw:
        r["id"] = str(r.pop("_id"))

    # Stats
    stats_pipeline = [
        {"$match": {"coop_id": query.get("coop_id", {"$exists": True})} if "coop_id" in query else {"$match": {}}},
        {"$group": {
            "_id": "$classification_globale",
            "count": {"$sum": 1},
            "perte_prime_total": {"$sum": {"$subtract": ["$prime_estimee_avant", "$prime_estimee_apres"]}}
        }}
    ]
    stats_raw = await db.discrepancies.aggregate([
        {"$match": query},
        {"$group": {
            "_id": "$classification_globale",
            "count": {"$sum": 1},
            "perte_prime": {"$sum": {"$subtract": ["$prime_estimee_avant", "$prime_estimee_apres"]}}
        }}
    ]).to_list(10)

    stats = {
        "faible": {"count": 0, "perte_prime": 0},
        "moyen": {"count": 0, "perte_prime": 0},
        "important": {"count": 0, "perte_prime": 0},
    }
    for s in stats_raw:
        if s["_id"] in stats:
            stats[s["_id"]] = {"count": s["count"], "perte_prime": round(s["perte_prime"], 0)}

    return {
        "ecarts": raw,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "stats": stats
    }


@router.get("/farmer/{farmer_id}")
async def get_farmer_discrepancy_history(
    farmer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Historique des ecarts d'un planteur."""
    records = await db.discrepancies.find(
        {"farmer_id": farmer_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    raw = await db.discrepancies.find({"farmer_id": farmer_id}).sort("created_at", -1).to_list(50)
    for r in raw:
        r["id"] = str(r.pop("_id"))

    return {"historique": raw, "total": len(raw)}


@router.get("/parcel/{parcel_id}")
async def get_parcel_discrepancy(
    parcel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Detail des ecarts pour une parcelle."""
    disc = await db.discrepancies.find_one({"parcel_id": parcel_id})
    if not disc:
        return {"ecart": None, "message": "Aucun ecart enregistre pour cette parcelle"}
    disc["id"] = str(disc.pop("_id"))
    return {"ecart": disc}


@router.put("/{discrepancy_id}/validate")
async def validate_discrepancy(
    discrepancy_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Cooperative validates a medium discrepancy or confirms reinforced verification."""
    verify_cooperative_access(current_user)

    if not ObjectId.is_valid(discrepancy_id):
        raise HTTPException(status_code=400, detail="ID invalide")

    disc = await db.discrepancies.find_one({"_id": ObjectId(discrepancy_id)})
    if not disc:
        raise HTTPException(status_code=404, detail="Ecart non trouve")

    action = data.get("action", "valider")  # valider | rejeter | verification_renforcee
    commentaire = data.get("commentaire", "")

    update = {
        "updated_at": datetime.utcnow(),
        "validated_by": current_user["_id"],
        "validated_at": datetime.utcnow(),
        "commentaire_cooperative": commentaire,
    }

    if action == "valider":
        update["statut"] = "valide"
    elif action == "rejeter":
        update["statut"] = "rejete"
        # Restore full premium
        update["impact_coefficient"] = 1.0
        update["prime_estimee_apres"] = disc["prime_estimee_avant"]
        update["impact_prime"] = "Aucun impact (ecart rejete)"
        await db.parcels.update_one(
            {"_id": ObjectId(disc["parcel_id"])},
            {"$set": {"prime_coefficient": 1.0, "discrepancy_classification": None}}
        )
    elif action == "verification_renforcee":
        update["statut"] = "verification_renforcee"

    await db.discrepancies.update_one(
        {"_id": ObjectId(discrepancy_id)},
        {"$set": update}
    )

    return {"message": f"Ecart {update['statut']}", "statut": update["statut"]}
