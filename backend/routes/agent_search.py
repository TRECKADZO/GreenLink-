"""
Routes sécurisées pour les agents terrain - Recherche par téléphone
GreenLink Agritech - Côte d'Ivoire
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
import logging
import re

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agent", tags=["Agent Terrain"])


# ============= SECURITE: Middleware vérification rôle agent =============

async def verify_agent_role(current_user: dict = Depends(get_current_user)):
    """
    Middleware de sécurité: vérifie que l'utilisateur est un agent terrain autorisé.
    Accepte: field_agent, cooperative, admin
    Refuse: producteur, acheteur, entreprise_rse, fournisseur
    """
    user_type = current_user.get("user_type", "")
    roles = current_user.get("roles", [])

    allowed_types = ["field_agent", "cooperative", "admin", "super_admin"]
    allowed_roles = ["field_agent", "ssrte_agent"]

    has_valid_type = user_type in allowed_types
    has_valid_role = any(r in roles for r in allowed_roles)

    if not has_valid_type and not has_valid_role:
        # SECURITE: Log la tentative d'accès non autorisé
        await _log_audit(
            user_id=str(current_user.get("_id", "")),
            action="ACCESS_DENIED",
            target_phone="N/A",
            details=f"Tentative d'accès non autorisée par user_type={user_type}",
            ip_address="unknown"
        )
        raise HTTPException(
            status_code=403,
            detail="Accès réservé aux agents terrain autorisés"
        )

    return current_user


def _get_agent_zone_filter(agent: dict) -> dict:
    """
    Construit le filtre de zone pour limiter la visibilité de l'agent.
    L'agent ne peut voir que les planteurs de sa zone/coopérative.
    """
    coop_id = agent.get("cooperative_id") or agent.get("coop_id")
    zone = agent.get("zone")
    village_coverage = agent.get("village_coverage", [])
    user_type = agent.get("user_type")

    # Admin voit tout
    if user_type in ["admin", "super_admin"]:
        return {}

    filters = []

    # Filtre par coopérative
    if coop_id:
        coop_id_str = str(coop_id)
        filters.append({"$or": [
            {"coop_id": coop_id_str},
            {"coop_id": ObjectId(coop_id_str) if ObjectId.is_valid(coop_id_str) else coop_id_str},
            {"cooperative_id": coop_id_str}
        ]})

    # Filtre par zone géographique
    if zone:
        filters.append({"$or": [
            {"zone": zone},
            {"village": {"$regex": zone, "$options": "i"}},
            {"department": {"$regex": zone, "$options": "i"}}
        ]})

    # Filtre par villages couverts
    if village_coverage:
        filters.append({"village": {"$in": village_coverage}})

    if filters:
        return {"$and": filters} if len(filters) > 1 else filters[0]

    # Coopérative: filtre par son propre ID
    if user_type == "cooperative":
        coop_own_id = str(agent.get("_id", ""))
        return {"$or": [
            {"coop_id": coop_own_id},
            {"cooperative_id": coop_own_id}
        ]}

    return {}


# ============= AUDIT LOGGING =============

async def _log_audit(
    user_id: str,
    action: str,
    target_phone: str,
    details: str = "",
    ip_address: str = "unknown",
    target_farmer_id: str = None
):
    """
    Enregistre un log d'audit pour traçabilité SSRTE/RGPD.
    Chaque accès aux données planteur est tracé.
    """
    audit_doc = {
        "user_id": user_id,
        "action": action,
        "target_phone": target_phone,
        "target_farmer_id": target_farmer_id,
        "details": details,
        "ip_address": ip_address,
        "timestamp": datetime.now(timezone.utc),
        "app": "greenlink_agent_terrain"
    }
    await db.audit_logs.insert_one(audit_doc)


# ============= ENDPOINTS API =============

@router.get("/search")
async def search_farmer_by_phone(
    request: Request,
    phone: str = Query(..., description="Numéro de téléphone du planteur (ex: 0701234567 ou +2250701234567)"),
    current_user: dict = Depends(verify_agent_role)
):
    """
    Recherche un planteur par son numéro de téléphone.

    SECURITE:
    - Rôle agent vérifié via middleware JWT
    - Filtrage par zone/coopérative de l'agent
    - Audit log de chaque recherche
    - Seules les informations nécessaires sont retournées
    """
    agent_id = str(current_user.get("_id", ""))
    client_ip = request.client.host if request.client else "unknown"

    # Normaliser le numéro de téléphone
    normalized = _normalize_phone(phone)
    if not normalized:
        await _log_audit(agent_id, "SEARCH_INVALID_PHONE", phone, "Format invalide", client_ip)
        raise HTTPException(status_code=400, detail="Format de numéro invalide. Utilisez: 0701234567 ou +2250701234567")

    # Construire le filtre de zone
    zone_filter = _get_agent_zone_filter(current_user)

    # Recherche dans coop_members
    phone_patterns = _get_phone_patterns(normalized)
    phone_query = {"$or": [{"phone_number": p} for p in phone_patterns]}

    if zone_filter:
        member_query = {"$and": [phone_query, zone_filter]}
    else:
        member_query = phone_query

    member = await db.coop_members.find_one(member_query, {"_id": 1, "full_name": 1, "phone_number": 1, "village": 1, "department": 1, "zone": 1, "cni_number": 1, "status": 1, "is_active": 1, "coop_id": 1, "user_id": 1, "created_at": 1, "consent_given": 1, "parcels_count": 1, "total_hectares": 1})

    # Aussi rechercher dans la collection users (farmers)
    user_farmer = None
    if not member:
        user_query = {"$and": [
            phone_query,
            {"user_type": {"$in": ["farmer", "producteur"]}}
        ]}
        user_farmer = await db.users.find_one(user_query, {"_id": 1, "full_name": 1, "phone_number": 1, "village": 1, "department": 1, "user_type": 1, "farm_size": 1, "crops": 1, "created_at": 1, "cooperative_id": 1})

    if not member and not user_farmer:
        await _log_audit(agent_id, "SEARCH_NOT_FOUND", normalized, "Planteur non trouvé dans le périmètre", client_ip)
        return {
            "found": False,
            "message": "Aucun planteur trouvé avec ce numéro dans votre périmètre"
        }

    # Construire la réponse
    if member:
        farmer_id = str(member["_id"])
        farmer_data = {
            "id": farmer_id,
            "source": "coop_members",
            "full_name": member.get("full_name", ""),
            "phone_number": member.get("phone_number", ""),
            "village": member.get("village", ""),
            "department": member.get("department", ""),
            "zone": member.get("zone", ""),
            "cni_number": member.get("cni_number", ""),
            "status": member.get("status", ""),
            "is_active": member.get("is_active", True),
            "consent_given": member.get("consent_given", False),
            "parcels_count": member.get("parcels_count", 0),
            "total_hectares": member.get("total_hectares", 0),
            "created_at": member.get("created_at", "")
        }

        # Récupérer les parcelles
        parcels = await _get_farmer_parcels(member.get("user_id") or farmer_id)
        farmer_data["parcels"] = parcels

        # Récupérer la coopérative
        coop_name = await _get_cooperative_name(member.get("coop_id"))
        farmer_data["cooperative_name"] = coop_name

    else:
        farmer_id = str(user_farmer["_id"])
        farmer_data = {
            "id": farmer_id,
            "source": "users",
            "full_name": user_farmer.get("full_name", ""),
            "phone_number": user_farmer.get("phone_number", ""),
            "village": user_farmer.get("village", ""),
            "department": user_farmer.get("department", ""),
            "zone": "",
            "cni_number": "",
            "status": "active",
            "is_active": True,
            "consent_given": True,
            "parcels_count": 0,
            "total_hectares": user_farmer.get("farm_size", 0),
            "created_at": user_farmer.get("created_at", "")
        }

        parcels = await _get_farmer_parcels(farmer_id)
        farmer_data["parcels"] = parcels
        farmer_data["parcels_count"] = len(parcels)

        coop_name = await _get_cooperative_name(user_farmer.get("cooperative_id"))
        farmer_data["cooperative_name"] = coop_name

    # SECURITE: Audit log de l'accès réussi
    await _log_audit(
        user_id=agent_id,
        action="SEARCH_SUCCESS",
        target_phone=normalized,
        details=f"Fiche planteur consultée: {farmer_data.get('full_name', 'N/A')}",
        ip_address=client_ip,
        target_farmer_id=farmer_id
    )

    return {
        "found": True,
        "farmer": farmer_data
    }


@router.get("/farmer/{farmer_id}/details")
async def get_farmer_full_details(
    farmer_id: str,
    request: Request,
    current_user: dict = Depends(verify_agent_role)
):
    """
    Fiche complète d'un planteur pour l'agent terrain.
    Inclut: infos personnelles, parcelles, historique récoltes, primes carbone.
    """
    agent_id = str(current_user.get("_id", ""))
    client_ip = request.client.host if request.client else "unknown"

    # Chercher dans coop_members d'abord
    member = await db.coop_members.find_one({"_id": ObjectId(farmer_id)})
    farmer_user = None

    if not member:
        farmer_user = await db.users.find_one({
            "_id": ObjectId(farmer_id),
            "user_type": {"$in": ["farmer", "producteur"]}
        })

    if not member and not farmer_user:
        await _log_audit(agent_id, "VIEW_NOT_FOUND", "N/A", f"Planteur {farmer_id} non trouvé", client_ip, farmer_id)
        raise HTTPException(status_code=404, detail="Planteur non trouvé")

    # Vérification de zone
    zone_filter = _get_agent_zone_filter(current_user)
    if zone_filter and member:
        check = await db.coop_members.find_one({"_id": ObjectId(farmer_id), **zone_filter})
        if not check:
            await _log_audit(agent_id, "VIEW_ZONE_DENIED", "N/A", f"Hors périmètre: {farmer_id}", client_ip, farmer_id)
            raise HTTPException(status_code=403, detail="Ce planteur n'est pas dans votre périmètre")

    source = member or farmer_user
    source_id = str(source["_id"])
    lookup_id = member.get("user_id") or source_id if member else source_id

    # Parcelles
    parcels = await _get_farmer_parcels(lookup_id)

    # Récoltes
    harvests = await db.harvests.find({"farmer_id": lookup_id}).sort("created_at", -1).to_list(50)
    harvests_data = [{
        "id": str(h["_id"]),
        "crop_type": h.get("crop_type", "cacao"),
        "quantity_kg": h.get("quantity_kg", 0),
        "carbon_premium": h.get("carbon_premium", 0),
        "date": str(h.get("created_at", ""))
    } for h in harvests]

    # Visites SSRTE
    ssrte_visits = await db.ssrte_visits.find({"farmer_id": lookup_id}).sort("visit_date", -1).to_list(20)
    visits_data = [{
        "id": str(v["_id"]),
        "visit_date": str(v.get("visit_date", v.get("date_visite", ""))),
        "date_visite": str(v.get("date_visite", v.get("visit_date", ""))),
        "agent_name": v.get("agent_name", ""),
        "status": v.get("status", ""),
        "risk_level": v.get("risk_level", v.get("niveau_risque", "")),
        "niveau_risque": v.get("niveau_risque", v.get("risk_level", "faible")),
        "taille_menage": v.get("taille_menage", 0),
        "nombre_enfants": v.get("nombre_enfants", 0),
        "liste_enfants": v.get("liste_enfants", []),
        "conditions_vie": v.get("conditions_vie", ""),
        "eau_courante": v.get("eau_courante", False),
        "electricite": v.get("electricite", False),
        "distance_ecole_km": v.get("distance_ecole_km"),
        "enfants_observes_travaillant": v.get("enfants_observes_travaillant", 0),
        "taches_dangereuses_observees": v.get("taches_dangereuses_observees", []),
        "taches_dangereuses_count": v.get("taches_dangereuses_count", 0),
        "support_fourni": v.get("support_fourni", []),
        "recommandations": v.get("recommandations", []),
        "visite_suivi_requise": v.get("visite_suivi_requise", False),
        "observations": v.get("observations", ""),
    } for v in ssrte_visits]

    # Coopérative
    coop_name = await _get_cooperative_name(
        (member or {}).get("coop_id") or (farmer_user or {}).get("cooperative_id")
    )

    result = {
        "id": source_id,
        "full_name": source.get("full_name", ""),
        "phone_number": source.get("phone_number", ""),
        "village": source.get("village", ""),
        "department": source.get("department", ""),
        "zone": source.get("zone", ""),
        "cni_number": source.get("cni_number", "") if member else "",
        "status": source.get("status", "active"),
        "consent_given": source.get("consent_given", True),
        "cooperative_name": coop_name,
        "created_at": str(source.get("created_at", "")),
        "parcels": parcels,
        "parcels_count": len(parcels),
        "total_hectares": round(sum(p.get("area_hectares", 0) for p in parcels), 2),
        "harvests": harvests_data,
        "total_premium_earned": round(sum(h.get("carbon_premium", 0) for h in harvests_data), 2),
        "ssrte_visits": visits_data,
        "ssrte_visits_count": len(visits_data)
    }

    await _log_audit(agent_id, "VIEW_DETAILS", source.get("phone_number", ""), f"Fiche complète consultée", client_ip, source_id)

    return result


@router.get("/audit-logs")
async def get_agent_audit_logs(
    request: Request,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(verify_agent_role)
):
    """
    Historique des accès de l'agent (audit trail personnel).
    Seul l'agent voit ses propres logs. L'admin voit tout.
    """
    agent_id = str(current_user.get("_id", ""))
    user_type = current_user.get("user_type", "")

    query = {}
    if user_type not in ["admin", "super_admin"]:
        query["user_id"] = agent_id

    total = await db.audit_logs.count_documents(query)
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)

    # Serialize datetimes
    for log in logs:
        if isinstance(log.get("timestamp"), datetime):
            log["timestamp"] = log["timestamp"].isoformat()

    return {
        "total": total,
        "logs": logs
    }


@router.get("/dashboard/stats")
async def get_agent_search_stats(
    current_user: dict = Depends(verify_agent_role)
):
    """
    Statistiques de l'agent terrain: recherches effectuées, planteurs consultés, etc.
    """
    agent_id = str(current_user.get("_id", ""))
    user_type = current_user.get("user_type", "")

    query = {} if user_type in ["admin", "super_admin"] else {"user_id": agent_id}

    total_searches = await db.audit_logs.count_documents({**query, "action": "SEARCH_SUCCESS"})
    total_views = await db.audit_logs.count_documents({**query, "action": "VIEW_DETAILS"})
    denied_attempts = await db.audit_logs.count_documents({**query, "action": {"$in": ["ACCESS_DENIED", "VIEW_ZONE_DENIED"]}})
    not_found = await db.audit_logs.count_documents({**query, "action": "SEARCH_NOT_FOUND"})

    # Zone info
    zone_filter = _get_agent_zone_filter(current_user)
    farmers_in_zone = 0
    if zone_filter:
        farmers_in_zone = await db.coop_members.count_documents(zone_filter)
    elif user_type == "cooperative":
        coop_id = str(current_user.get("_id", ""))
        farmers_in_zone = await db.coop_members.count_documents({
            "$or": [{"coop_id": coop_id}, {"cooperative_id": coop_id}]
        })

    return {
        "total_searches": total_searches,
        "total_views": total_views,
        "denied_attempts": denied_attempts,
        "not_found_searches": not_found,
        "farmers_in_zone": farmers_in_zone,
        "agent_zone": current_user.get("zone", "Non définie"),
        "agent_name": current_user.get("full_name", "")
    }


# ============= FONCTIONS UTILITAIRES =============

def _normalize_phone(phone: str) -> str:
    """Normalise un numéro de téléphone ivoirien"""
    phone = phone.strip().replace(" ", "").replace("-", "").replace(".", "")

    if not re.match(r'^[\+\d]{8,15}$', phone):
        return ""

    # Supprimer le préfixe +225 pour normaliser
    if phone.startswith("+225"):
        phone = phone[4:]
    elif phone.startswith("225"):
        phone = phone[3:]
    elif phone.startswith("00225"):
        phone = phone[5:]

    # Format local: 10 chiffres (0X XXXXXXXX) ou 8-10 chiffres
    if phone.startswith("0") and len(phone) == 10:
        return phone

    if len(phone) == 10 and not phone.startswith("0"):
        return phone

    if len(phone) == 8:
        return phone

    return phone


def _get_phone_patterns(normalized: str) -> list:
    """Génère toutes les variantes possibles d'un numéro pour la recherche"""
    patterns = [normalized]

    # Ajouter +225 prefix
    clean = normalized.lstrip("0")
    if not normalized.startswith("+"):
        patterns.append(f"+225{normalized}")
        patterns.append(f"+225{clean}")

    # Sans le 0 initial
    if normalized.startswith("0"):
        patterns.append(normalized[1:])
        patterns.append(f"+225{normalized[1:]}")

    # Avec 0 initial si absent
    if not normalized.startswith("0") and len(normalized) <= 10:
        patterns.append(f"0{normalized}")
        patterns.append(f"+2250{normalized}")

    return list(set(patterns))


async def _get_farmer_parcels(farmer_id: str) -> list:
    """Récupère les parcelles d'un planteur"""
    parcels_query = {"$or": [
        {"farmer_id": farmer_id},
        {"member_id": farmer_id}
    ]}
    parcels = await db.parcels.find(parcels_query).to_list(100)

    return [{
        "id": str(p["_id"]),
        "location": p.get("location", ""),
        "village": p.get("village", ""),
        "area_hectares": p.get("area_hectares", 0),
        "crop_type": p.get("crop_type", "cacao"),
        "carbon_score": p.get("carbon_score", 0),
        "co2_captured_tonnes": p.get("co2_captured_tonnes", 0),
        "verification_status": p.get("verification_status", "pending"),
        "gps_coordinates": p.get("gps_coordinates"),
        "certification": p.get("certification", ""),
        "created_at": str(p.get("created_at", ""))
    } for p in parcels]


async def _get_cooperative_name(coop_id) -> str:
    """Récupère le nom d'une coopérative par son ID"""
    if not coop_id:
        return "Non affilié"

    coop_id_str = str(coop_id)
    try:
        coop = await db.users.find_one(
            {"_id": ObjectId(coop_id_str)},
            {"full_name": 1, "coop_name": 1}
        )
        if coop:
            return coop.get("coop_name") or coop.get("full_name", "Coopérative")
    except Exception:
        pass

    return "Non affilié"


# ============= SYNCHRONISATION OFFLINE =============

@router.get("/sync/download")
async def download_zone_data(
    request: Request,
    current_user: dict = Depends(verify_agent_role)
):
    """
    Télécharger toutes les données de la zone de l'agent pour le mode offline.
    Retourne: planteurs + parcelles + visites SSRTE récentes.
    Utilisé par IndexedDB côté client pour le cache offline-first.
    """
    agent_id = str(current_user.get("_id", ""))
    client_ip = request.client.host if request.client else "unknown"

    zone_filter = _get_agent_zone_filter(current_user)

    members = await db.coop_members.find(zone_filter).to_list(2000)

    farmers_data = []
    all_parcels = []

    for m in members:
        mid = str(m["_id"])
        lookup_id = m.get("user_id") or mid
        parcels = await _get_farmer_parcels(lookup_id)
        all_parcels.extend(parcels)
        coop_name = await _get_cooperative_name(m.get("coop_id"))

        farmers_data.append({
            "id": mid,
            "full_name": m.get("full_name", ""),
            "phone_number": m.get("phone_number", ""),
            "village": m.get("village", ""),
            "department": m.get("department", ""),
            "zone": m.get("zone", ""),
            "cni_number": m.get("cni_number", ""),
            "status": m.get("status", "active"),
            "is_active": m.get("is_active", True),
            "consent_given": m.get("consent_given", False),
            "cooperative_name": coop_name,
            "parcels_count": len(parcels),
            "total_hectares": round(sum(p.get("area_hectares", 0) for p in parcels), 2),
            "parcels": parcels,
            "created_at": str(m.get("created_at", ""))
        })

    # Visites SSRTE récentes (30 jours)
    from datetime import timedelta
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    farmer_ids = [f["id"] for f in farmers_data]
    user_ids = [m.get("user_id") for m in members if m.get("user_id")]
    lookup_ids = list(set(farmer_ids + [uid for uid in user_ids if uid]))

    ssrte_visits = []
    if lookup_ids:
        visits = await db.ssrte_visits.find({
            "farmer_id": {"$in": lookup_ids},
            "visit_date": {"$gte": thirty_days_ago}
        }).to_list(500)
        ssrte_visits = [{
            "id": str(v["_id"]),
            "farmer_id": v.get("farmer_id", ""),
            "visit_date": str(v.get("visit_date", "")),
            "agent_name": v.get("agent_name", ""),
            "status": v.get("status", ""),
            "risk_level": v.get("risk_level", "")
        } for v in visits]

    sync_time = datetime.now(timezone.utc).isoformat()

    await _log_audit(
        agent_id, "SYNC_DOWNLOAD", "ALL",
        f"Téléchargement zone: {len(farmers_data)} planteurs, {len(all_parcels)} parcelles",
        client_ip
    )

    return {
        "sync_timestamp": sync_time,
        "data_version": sync_time,
        "farmers": farmers_data,
        "farmers_count": len(farmers_data),
        "parcels_count": len(all_parcels),
        "ssrte_visits": ssrte_visits,
        "agent_zone": current_user.get("zone", "Non définie"),
        "agent_name": current_user.get("full_name", "")
    }


class OfflineAction(BaseModel):
    action_type: str
    farmer_id: Optional[str] = None
    data: dict = {}
    timestamp: str
    offline_id: str


class SyncUploadRequest(BaseModel):
    actions: list
    sync_timestamp: str


@router.post("/sync/upload")
async def upload_offline_actions(
    request: Request,
    payload: SyncUploadRequest,
    current_user: dict = Depends(verify_agent_role)
):
    """
    Synchroniser les actions effectuées hors-ligne.
    """
    agent_id = str(current_user.get("_id", ""))
    client_ip = request.client.host if request.client else "unknown"

    results = []
    errors = []

    for action in payload.actions:
        action_type = action.get("action_type", "")
        offline_id = action.get("offline_id", "")
        data = action.get("data", {})
        farmer_id = action.get("farmer_id")

        try:
            if offline_id:
                existing = await db.sync_log.find_one({"offline_id": offline_id})
                if existing:
                    results.append({"offline_id": offline_id, "status": "already_synced"})
                    continue

            if action_type == "parcel_verification":
                parcel_id = data.get("parcel_id")
                if parcel_id:
                    await db.parcels.update_one(
                        {"_id": ObjectId(parcel_id)},
                        {"$set": {
                            "verification_status": data.get("status", "verified"),
                            "verified_by": agent_id,
                            "verified_at": datetime.now(timezone.utc),
                            "verification_notes": data.get("notes", ""),
                            "verified_gps_coordinates": data.get("gps_coordinates"),
                            "verification_photos": data.get("photos", [])
                        }}
                    )
            elif action_type == "ssrte_visit":
                # Store ALL SSRTE data from the offline form
                visit_doc = {
                    "farmer_id": farmer_id,
                    "agent_id": agent_id,
                    "agent_name": current_user.get("full_name", ""),
                    "date_visite": data.get("date_visite", action.get("timestamp", datetime.now(timezone.utc).isoformat())),
                    "visit_date": datetime.fromisoformat(action.get("timestamp", datetime.now(timezone.utc).isoformat())),
                    "taille_menage": data.get("taille_menage", 0),
                    "nombre_enfants": data.get("nombre_enfants", 0),
                    "liste_enfants": data.get("liste_enfants", []),
                    "conditions_vie": data.get("conditions_vie", ""),
                    "eau_courante": data.get("eau_courante", False),
                    "electricite": data.get("electricite", False),
                    "distance_ecole_km": data.get("distance_ecole_km"),
                    "enfants_observes_travaillant": data.get("enfants_observes_travaillant", 0),
                    "taches_dangereuses_observees": data.get("taches_dangereuses_observees", []),
                    "support_fourni": data.get("support_fourni", []),
                    "niveau_risque": data.get("niveau_risque", "faible"),
                    "recommandations": data.get("recommandations", []),
                    "visite_suivi_requise": data.get("visite_suivi_requise", False),
                    "observations": data.get("observations", ""),
                    "created_at": datetime.now(timezone.utc),
                    "synced_from_offline": True
                }
                await db.ssrte_visits.insert_one(visit_doc)
            elif action_type == "search_log":
                await _log_audit(
                    agent_id, "SEARCH_OFFLINE",
                    data.get("phone", "N/A"),
                    f"Recherche offline: {data.get('farmer_name', 'N/A')}",
                    "offline"
                )
            elif action_type == "register_farmer":
                # Inscription d'un planteur depuis le mode offline
                import hashlib as _hl
                nom = data.get("nom_complet", "").strip()
                telephone = data.get("telephone", "").strip()
                village = data.get("village", "").strip()
                pin = data.get("pin", "")
                if nom and telephone:
                    existing = await db.ussd_registrations.find_one({
                        "phone_number": {"$regex": telephone[-9:] + "$"}
                    })
                    if not existing:
                        pin_hash = _hl.sha256(pin.encode()).hexdigest() if pin else ""
                        reg_doc = {
                            "full_name": nom,
                            "nom_complet": nom,
                            "phone_number": telephone,
                            "cooperative_code": data.get("cooperative_code", ""),
                            "village": village,
                            "pin_hash": pin_hash,
                            "hectares_approx": float(data["hectares"]) if data.get("hectares") else None,
                            "user_type": "producteur",
                            "registered_via": "agent_offline",
                            "registered_by_agent": agent_id,
                            "status": "active",
                            "created_at": datetime.now(timezone.utc),
                            "synced_from_offline": True
                        }
                        await db.ussd_registrations.insert_one(reg_doc)

                        # Also create coop_member and assign to agent
                        try:
                            agent_record = await db.coop_agents.find_one({"user_id": agent_id})
                            coop_id = agent_record.get("coop_id", "") if agent_record else ""
                            member_doc = {
                                "coop_id": coop_id,
                                "full_name": nom,
                                "phone_number": telephone,
                                "village": village,
                                "status": "active",
                                "is_active": True,
                                "pin_hash": pin_hash,
                                "hectares_approx": float(data["hectares"]) if data.get("hectares") else None,
                                "created_at": datetime.now(timezone.utc),
                                "created_by": agent_id,
                                "registered_via": "agent_offline",
                            }
                            member_result = await db.coop_members.insert_one(member_doc)
                            member_id = str(member_result.inserted_id)
                            if agent_record:
                                await db.coop_agents.update_one(
                                    {"_id": agent_record["_id"]},
                                    {"$addToSet": {"assigned_farmers": member_id}}
                                )
                        except Exception as e:
                            logger.error(f"Sync register_farmer coop_member error: {e}")
            elif action_type == "redd_visit":
                # Visite REDD+ depuis le mode offline — store in redd_tracking_visits
                practices = data.get("practices_verified", [])
                # Calculate REDD score
                total_conforme = sum(1 for p in practices if p.get("status") == "conforme")
                total_partiel = sum(1 for p in practices if p.get("status") == "partiellement")
                total_non_conf = sum(1 for p in practices if p.get("status") == "non_conforme")
                total_checked = total_conforme + total_partiel + total_non_conf
                redd_score = 0
                for p in practices:
                    s = p.get("status", "")
                    if s == "non_applicable": continue
                    cat = p.get("category", "")
                    w = {"agroforesterie": 0.75, "zero_deforestation": 0.5, "gestion_sols": 0.5, "restauration": 0.375, "tracabilite": 0.25}.get(cat, 0.3)
                    if s == "conforme": redd_score += w
                    elif s == "partiellement": redd_score += w * 0.5
                redd_score = min(round(redd_score, 1), 10)
                redd_level = "Excellence" if redd_score >= 8 else "Avance" if redd_score >= 6 else "Intermediaire" if redd_score >= 4 else "Debutant" if redd_score >= 2 else "Non conforme"

                agent_record = await db.coop_agents.find_one({"user_id": agent_id})
                coop_id = agent_record.get("coop_id", "") if agent_record else ""

                redd_doc = {
                    "farmer_id": data.get("farmer_id", ""),
                    "farmer_name": data.get("farmer_name", ""),
                    "farmer_phone": data.get("farmer_phone", ""),
                    "coop_id": coop_id,
                    "cooperative_id": coop_id,
                    "agent_id": agent_id,
                    "agent_name": current_user.get("full_name", ""),
                    "date_visite": action.get("timestamp", datetime.now(timezone.utc).isoformat()),
                    "practices_verified": practices,
                    "superficie_verifiee": data.get("superficie_verifiee", 0),
                    "arbres_comptes": data.get("arbres_comptes", 0),
                    "observations": data.get("observations", ""),
                    "recommandations": data.get("recommandations", ""),
                    "suivi_requis": data.get("suivi_requis", False),
                    "redd_score": redd_score,
                    "redd_level": redd_level,
                    "total_practices_checked": total_checked,
                    "conformity_percentage": round((total_conforme + total_partiel * 0.5) / max(total_checked, 1) * 100) if total_checked else 0,
                    "created_at": datetime.now(timezone.utc),
                    "synced_from_offline": True
                }
                await db.redd_tracking_visits.insert_one(redd_doc)

            await db.sync_log.insert_one({
                "offline_id": offline_id,
                "action_type": action_type,
                "agent_id": agent_id,
                "synced_at": datetime.now(timezone.utc)
            })
            results.append({"offline_id": offline_id, "status": "synced"})

        except Exception as e:
            logger.error(f"Sync error for {offline_id}: {e}")
            errors.append({"offline_id": offline_id, "status": "error", "message": str(e)})

    await _log_audit(
        agent_id, "SYNC_UPLOAD", "ALL",
        f"Upload: {len(results)} réussies, {len(errors)} erreurs",
        client_ip
    )

    return {
        "synced": len(results),
        "errors": len(errors),
        "results": results + errors
    }


@router.get("/sync/status")
async def get_sync_status(
    current_user: dict = Depends(verify_agent_role)
):
    """Statut de synchronisation de l'agent."""
    agent_id = str(current_user.get("_id", ""))

    last_download = await db.audit_logs.find_one(
        {"user_id": agent_id, "action": "SYNC_DOWNLOAD"},
        sort=[("timestamp", -1)]
    )
    last_upload = await db.audit_logs.find_one(
        {"user_id": agent_id, "action": "SYNC_UPLOAD"},
        sort=[("timestamp", -1)]
    )

    return {
        "last_download": last_download["timestamp"].isoformat() if last_download and isinstance(last_download.get("timestamp"), datetime) else None,
        "last_upload": last_upload["timestamp"].isoformat() if last_upload and isinstance(last_upload.get("timestamp"), datetime) else None,
        "total_synced_actions": await db.sync_log.count_documents({"agent_id": agent_id})
    }



@router.post("/photos")
async def save_geolocated_photos(
    request: Request,
    current_user: dict = Depends(verify_agent_role)
):
    """Sauvegarder les metadonnees de photos geolocalisees pour un planteur."""
    data = await request.json()
    agent_id = str(current_user.get("_id", ""))
    farmer_id = data.get("farmer_id", "")
    farmer_name = data.get("farmer_name", "")
    photos = data.get("photos", [])

    if not photos:
        raise HTTPException(status_code=400, detail="Aucune photo fournie")

    doc = {
        "agent_id": agent_id,
        "agent_name": current_user.get("full_name", ""),
        "farmer_id": farmer_id,
        "farmer_name": farmer_name,
        "photos": photos,
        "photo_count": len(photos),
        "created_at": datetime.now(timezone.utc)
    }
    await db.agent_photos.insert_one(doc)

    return {
        "success": True,
        "message": f"{len(photos)} photo(s) enregistree(s)",
        "farmer_id": farmer_id
    }
