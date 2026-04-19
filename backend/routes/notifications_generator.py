# Notifications Generator for Cooperative Dashboard
# Automatically creates in-app notifications for key ARS 1000 events:
# - Upcoming audits (within 30 days)
# - Missing mandatory trainings (< 12 themes covered)
# - Critical non-conformities (open)
# - Critical risks (EFR rouge / niveau Critique)
# - Members pending validation > 7 days
# - PDC expiring (validated > 10 months ago)

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import logging
from typing import Optional

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications-generator"])

DEDUP_WINDOW_HOURS = 24  # Don't recreate same-type notification within 24h


async def _already_notified(user_id: str, notif_type: str, subject_id: str = "") -> bool:
    """Check if a similar notification was created within the dedup window."""
    since = datetime.now(timezone.utc) - timedelta(hours=DEDUP_WINDOW_HOURS)
    query = {
        "user_id": user_id,
        "type": notif_type,
        "created_at": {"$gte": since},
    }
    if subject_id:
        query["subject_id"] = subject_id
    count = await db.notifications.count_documents(query)
    return count > 0


async def _create_notification(
    user_id: str,
    notif_type: str,
    title: str,
    message: str,
    action_url: str,
    priority: str = "info",
    subject_id: str = "",
) -> Optional[dict]:
    """Insert a notification if not already sent recently."""
    if await _already_notified(user_id, notif_type, subject_id):
        return None
    doc = {
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "action_url": action_url,
        "priority": priority,
        "subject_id": subject_id,
        "is_read": False,
        "created_at": datetime.now(timezone.utc),
    }
    await db.notifications.insert_one(doc)
    return doc


async def _gen_audit_upcoming(coop_id: str) -> int:
    """Notify for audits scheduled within next 30 days."""
    sessions = await db.audit_sessions.find(
        {"coop_id": coop_id, "statut": {"$ne": "cloture"}}
    ).to_list(50)
    today = datetime.now(timezone.utc).date()
    horizon = today + timedelta(days=30)
    count = 0
    for s in sessions:
        date_str = s.get("date_debut", "")
        if not date_str:
            continue
        try:
            dt = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
        except ValueError:
            continue
        if today <= dt <= horizon:
            days_left = (dt - today).days
            created = await _create_notification(
                user_id=coop_id,
                notif_type="audit_upcoming",
                title=f"Audit ARS 1000 dans {days_left} jour(s)",
                message=f"Session du {date_str[:10]} — Préparez la documentation et l'équipe.",
                action_url="/cooperative/audit",
                priority="important",
                subject_id=str(s.get("_id", "")),
            )
            if created:
                count += 1
    return count


async def _gen_formation_missing(coop_id: str) -> int:
    """Notify if less than 12 mandatory training themes have programmed sessions."""
    programmes = await db.formation_programmes.count_documents({"coop_id": coop_id})
    if programmes < 12:
        missing = 12 - programmes
        created = await _create_notification(
            user_id=coop_id,
            notif_type="formation_missing",
            title=f"{missing} formation(s) obligatoire(s) manquante(s)",
            message="ARS 1000 impose 12 thèmes de formation annuels. Programmez les sessions manquantes.",
            action_url="/cooperative/formation/programme",
            priority="important",
            subject_id="formation_coverage",
        )
        if created:
            return 1
    return 0


async def _gen_nc_critiques(coop_id: str) -> int:
    """Notify for open critical non-conformities."""
    ncs = await db.audit_non_conformites.find({
        "coop_id": coop_id,
        "statut": {"$in": ["ouvert", "en_cours"]},
        "priorite": {"$in": ["haute", "critique", "majeure"]},
    }).limit(20).to_list(20)
    count = 0
    for nc in ncs:
        created = await _create_notification(
            user_id=coop_id,
            notif_type="nc_critique",
            title="Non-conformité critique ouverte",
            message=nc.get("description", nc.get("titre", "NC à traiter en priorité")),
            action_url="/cooperative/audit/non-conformites",
            priority="critique",
            subject_id=str(nc.get("_id", "")),
        )
        if created:
            count += 1
    return count


async def _gen_risques_critiques(coop_id: str) -> int:
    """Notify for critical risks (niveau Critique or EFR rouge)."""
    risques = await db.risques_registre.find({
        "coop_id": coop_id,
        "$or": [
            {"niveau": "Critique"},
            {"efr_color": "rouge"},
        ],
        "statut": {"$ne": "resolu"},
    }).limit(20).to_list(20)
    count = 0
    for r in risques:
        created = await _create_notification(
            user_id=coop_id,
            notif_type="risque_critique",
            title="Risque critique à traiter",
            message=f"{r.get('risque_titre', r.get('titre', 'Risque'))} — {r.get('categorie', '')}",
            action_url="/cooperative/risques",
            priority="critique",
            subject_id=r.get("risque_id") or str(r.get("_id", "")),
        )
        if created:
            count += 1
    return count


async def _gen_members_pending(coop_id: str) -> int:
    """Notify if more than 5 members are pending validation for > 7 days."""
    try:
        coop_oid = ObjectId(coop_id)
    except Exception:
        return 0
    threshold = datetime.now(timezone.utc) - timedelta(days=7)
    pending = await db.coop_members.count_documents({
        "cooperative_id": coop_oid,
        "status": "pending_validation",
        "created_at": {"$lte": threshold},
    })
    if pending >= 5:
        created = await _create_notification(
            user_id=coop_id,
            notif_type="members_pending",
            title=f"{pending} adhésion(s) en attente depuis > 7 jours",
            message="Validez rapidement les dossiers pour activer les membres.",
            action_url="/cooperative/membres",
            priority="important",
            subject_id="members_pending_batch",
        )
        if created:
            return 1
    return 0


async def _gen_pdc_renouveler(coop_id: str) -> int:
    """Notify for PDCs validated > 10 months ago (approaching 12-month validity)."""
    threshold = datetime.now(timezone.utc) - timedelta(days=300)
    pdcs = await db.pdc_v2.find({
        "coop_id": coop_id,
        "statut": "valide",
    }).limit(50).to_list(50)
    count = 0
    for p in pdcs:
        valide_le = p.get("validated_at") or p.get("date_validation") or p.get("updated_at")
        if isinstance(valide_le, str):
            try:
                valide_le = datetime.fromisoformat(valide_le.replace("Z", "+00:00"))
            except ValueError:
                continue
        if not isinstance(valide_le, datetime):
            continue
        if valide_le.tzinfo is None:
            valide_le = valide_le.replace(tzinfo=timezone.utc)
        if valide_le <= threshold:
            created = await _create_notification(
                user_id=coop_id,
                notif_type="pdc_renouveler",
                title="PDC à renouveler bientôt",
                message=f"PDC de {p.get('producteur_nom', 'producteur')} arrive à échéance (validité 12 mois).",
                action_url="/cooperative/pdc-v2",
                priority="info",
                subject_id=str(p.get("_id", "")),
            )
            if created:
                count += 1
    return count


@router.post("/generate")
async def generate_notifications(current_user: dict = Depends(get_current_user)):
    """
    Scan coop data and create in-app notifications for 6 critical ARS 1000 events.
    Deduplicated within a 24h window. Called by the cooperative dashboard on load.
    """
    if current_user.get("user_type") != "cooperative":
        raise HTTPException(status_code=403, detail="Réservé aux coopératives")

    coop_id = str(current_user["_id"])
    results = {}
    try:
        results["audit_upcoming"] = await _gen_audit_upcoming(coop_id)
        results["formation_missing"] = await _gen_formation_missing(coop_id)
        results["nc_critique"] = await _gen_nc_critiques(coop_id)
        results["risque_critique"] = await _gen_risques_critiques(coop_id)
        results["members_pending"] = await _gen_members_pending(coop_id)
        results["pdc_renouveler"] = await _gen_pdc_renouveler(coop_id)
    except Exception as e:
        logger.exception("Notification generation error")
        raise HTTPException(status_code=500, detail=f"Erreur génération: {e}")

    total = sum(results.values())
    return {"success": True, "created": total, "by_type": results}
