"""
Helper pour envoyer des notifications email de maniere non-bloquante.
Utilise asyncio.create_task pour fire-and-forget.
"""
import asyncio
import logging
from bson import ObjectId

logger = logging.getLogger(__name__)


async def get_coop_email(db, coop_id):
    """Recupere l'email d'une cooperative a partir de son ID."""
    if not coop_id:
        return None, None
    try:
        coop_id_obj = ObjectId(str(coop_id)) if not isinstance(coop_id, ObjectId) else coop_id
        coop = await db.users.find_one({"_id": coop_id_obj})
        if coop and coop.get("email"):
            return coop.get("email"), coop.get("coop_name") or coop.get("full_name") or "Cooperative"
    except Exception as e:
        logger.error(f"[NOTIF] Erreur lookup coop email: {e}")
    return None, None


async def get_user_email(db, user_id):
    """Recupere l'email et le nom d'un utilisateur."""
    if not user_id:
        return None, None
    try:
        user_id_obj = ObjectId(str(user_id)) if not isinstance(user_id, ObjectId) else user_id
        user = await db.users.find_one({"_id": user_id_obj})
        if user and user.get("email"):
            return user.get("email"), user.get("full_name") or "Utilisateur"
    except Exception as e:
        logger.error(f"[NOTIF] Erreur lookup user email: {e}")
    return None, None


async def get_agent_email(db, agent_id):
    """Recupere l'email d'un agent (dans users ou coop_agents)."""
    if not agent_id:
        return None, None
    try:
        agent_id_obj = ObjectId(str(agent_id)) if not isinstance(agent_id, ObjectId) else agent_id
        # Try users collection first
        user = await db.users.find_one({"_id": agent_id_obj})
        if user and user.get("email"):
            return user.get("email"), user.get("full_name") or "Agent"
        # Try coop_agents
        agent = await db.coop_agents.find_one({"_id": agent_id_obj})
        if agent and agent.get("email"):
            return agent.get("email"), agent.get("full_name") or "Agent"
        # Try via user_id field in coop_agents
        agent = await db.coop_agents.find_one({"user_id": str(agent_id)})
        if agent:
            user = await db.users.find_one({"_id": ObjectId(agent["user_id"])}) if agent.get("user_id") else None
            if user and user.get("email"):
                return user.get("email"), user.get("full_name") or "Agent"
    except Exception as e:
        logger.error(f"[NOTIF] Erreur lookup agent email: {e}")
    return None, None


def fire_and_forget_email(send_fn, *args, **kwargs):
    """Lance l'envoi d'email en tache de fond sans bloquer la requete."""
    try:
        send_fn(*args, **kwargs)
    except Exception as e:
        logger.error(f"[NOTIF] Erreur envoi email fire-and-forget: {e}")


async def send_notification_email_async(db, notification_type, **kwargs):
    """
    Point d'entree unique pour toutes les notifications email.
    Appeler avec asyncio.create_task() pour ne pas bloquer.
    """
    from services.email_service import (
        send_welcome_email,
        send_new_member_activated_email,
        send_harvest_notification_email,
        send_ssrte_visit_notification_email,
        send_ssrte_critical_alert_email,
        send_farmer_assigned_notification_email,
        send_parcel_verified_notification_email,
    )

    try:
        if notification_type == "member_activated":
            coop_email, coop_name = await get_coop_email(db, kwargs.get("coop_id"))
            member_email = kwargs.get("member_email")
            member_name = kwargs.get("member_name", "Membre")
            member_phone = kwargs.get("member_phone", "")
            village = kwargs.get("village")
            user_type = kwargs.get("user_type", "producteur")
            # Email de bienvenue au membre
            if member_email:
                await asyncio.to_thread(send_welcome_email, member_email, member_name, user_type)
                logger.info(f"[NOTIF] Email bienvenue envoye a {member_email}")
            # Notification a la cooperative
            if coop_email:
                await asyncio.to_thread(send_new_member_activated_email, coop_email, coop_name, member_name, member_phone, village)
                logger.info(f"[NOTIF] Email nouveau membre envoye a coop {coop_email}")

        elif notification_type == "harvest_declared":
            coop_email, coop_name = await get_coop_email(db, kwargs.get("coop_id"))
            if coop_email:
                await asyncio.to_thread(
                    send_harvest_notification_email,
                    coop_email, coop_name,
                    kwargs.get("farmer_name", "Producteur"),
                    kwargs.get("quantity_kg", 0),
                    kwargs.get("crop_type", "cacao"),
                    kwargs.get("carbon_premium", 0),
                    kwargs.get("original_quantity"),
                    kwargs.get("unit")
                )
                logger.info(f"[NOTIF] Email recolte envoye a coop {coop_email}")

        elif notification_type == "ssrte_visit":
            coop_email, coop_name = await get_coop_email(db, kwargs.get("coop_id"))
            if coop_email:
                await asyncio.to_thread(
                    send_ssrte_visit_notification_email,
                    coop_email, coop_name,
                    kwargs.get("agent_name", "Agent"),
                    kwargs.get("farmer_name", "Producteur"),
                    kwargs.get("risk_level", "moyen"),
                    kwargs.get("children_working", 0)
                )
                logger.info(f"[NOTIF] Email visite SSRTE envoye a coop {coop_email}")

        elif notification_type == "ssrte_critical_alert":
            coop_email, coop_name = await get_coop_email(db, kwargs.get("coop_id"))
            if coop_email:
                await asyncio.to_thread(
                    send_ssrte_critical_alert_email,
                    coop_email, coop_name,
                    kwargs.get("agent_name", "Agent"),
                    kwargs.get("farmer_name", "Producteur"),
                    kwargs.get("risk_level", "eleve"),
                    kwargs.get("children_working", 0),
                    kwargs.get("dangerous_tasks", []),
                    kwargs.get("children_details", []),
                    kwargs.get("conditions_vie"),
                    kwargs.get("observations")
                )
                logger.info(f"[NOTIF] ALERTE CRITIQUE SSRTE envoyee a coop {coop_email}")

        elif notification_type == "farmer_assigned":
            agent_email, agent_name = await get_agent_email(db, kwargs.get("agent_id"))
            if agent_email:
                await asyncio.to_thread(
                    send_farmer_assigned_notification_email,
                    agent_email, agent_name,
                    kwargs.get("farmer_names", []),
                    kwargs.get("assigned_by", "Administrateur")
                )
                logger.info(f"[NOTIF] Email assignation envoye a agent {agent_email}")

        elif notification_type == "parcel_verified":
            farmer_email, farmer_name = await get_user_email(db, kwargs.get("farmer_id"))
            if farmer_email:
                await asyncio.to_thread(
                    send_parcel_verified_notification_email,
                    farmer_email, farmer_name,
                    kwargs.get("parcel_location", ""),
                    kwargs.get("status", "verified"),
                    kwargs.get("carbon_score"),
                    kwargs.get("notes")
                )
                logger.info(f"[NOTIF] Email parcelle verifiee envoye a {farmer_email}")

    except Exception as e:
        logger.error(f"[NOTIF] Erreur notification {notification_type}: {e}")
