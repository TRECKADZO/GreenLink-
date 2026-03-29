# Cooperative Subscription Models for GreenLink
# Business Model:
# - 6-month FREE trial for cooperatives (full Pro access)
# - After trial: Starter (50K), Pro (120K), Enterprise (250K) FCFA/month
# - Strong REDD+ integration at all levels

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
from enum import Enum


class CoopPlan(str, Enum):
    TRIAL = "coop_trial"          # 6 mois gratuits (acces Pro)
    STARTER = "coop_starter"      # 50 000 FCFA/mois - jusqu'a 400 membres
    PRO = "coop_pro"              # 120 000 FCFA/mois - jusqu'a 800 membres
    ENTERPRISE = "coop_enterprise" # 250 000 FCFA/mois - membres illimites


class CoopSubStatus(str, Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING_PAYMENT = "pending_payment"


COOP_TRIAL_DAYS = 180  # 6 mois

COOP_PLAN_PRICING = {
    CoopPlan.TRIAL: {"monthly": 0, "yearly": 0, "max_members": 800},
    CoopPlan.STARTER: {"monthly": 50000, "yearly": 500000, "max_members": 400},
    CoopPlan.PRO: {"monthly": 120000, "yearly": 1200000, "max_members": 800},
    CoopPlan.ENTERPRISE: {"monthly": 250000, "yearly": 2500000, "max_members": None},
}

COOP_PLAN_FEATURES = {
    CoopPlan.TRIAL: {
        "dashboard_complet": True,
        "rapports_ars1000": True,
        "analyse_ars_niveaux": True,
        "alertes_ssrte": True,
        "rapports_ssrte_ici": True,
        "redd_avance": True,
        "redd_estimation_emissions": True,
        "redd_suivi_agroforesterie": True,
        "redd_zero_deforestation": True,
        "redd_donnees_mrv": True,
        "export_pdf_excel": True,
        "alertes_avancees": True,
        "support_prioritaire": True,
        "api_personnalisee": False,
        "formation_agents_redd": False,
        "co_branding": False,
        "analyse_carbone_agregee": False,
    },
    CoopPlan.STARTER: {
        "dashboard_complet": False,
        "rapports_ars1000": True,
        "analyse_ars_niveaux": False,
        "alertes_ssrte": True,
        "rapports_ssrte_ici": False,
        "redd_avance": False,
        "redd_estimation_emissions": False,
        "redd_suivi_agroforesterie": False,
        "redd_zero_deforestation": False,
        "redd_donnees_mrv": False,
        "redd_simplifie": True,
        "export_pdf_excel": False,
        "alertes_avancees": False,
        "support_prioritaire": False,
        "api_personnalisee": False,
        "formation_agents_redd": False,
        "co_branding": False,
        "analyse_carbone_agregee": False,
    },
    CoopPlan.PRO: {
        "dashboard_complet": True,
        "rapports_ars1000": True,
        "analyse_ars_niveaux": True,
        "alertes_ssrte": True,
        "rapports_ssrte_ici": True,
        "redd_avance": True,
        "redd_estimation_emissions": True,
        "redd_suivi_agroforesterie": True,
        "redd_zero_deforestation": True,
        "redd_donnees_mrv": True,
        "redd_simplifie": True,
        "export_pdf_excel": True,
        "alertes_avancees": True,
        "support_prioritaire": True,
        "api_personnalisee": False,
        "formation_agents_redd": False,
        "co_branding": False,
        "analyse_carbone_agregee": False,
    },
    CoopPlan.ENTERPRISE: {
        "dashboard_complet": True,
        "rapports_ars1000": True,
        "analyse_ars_niveaux": True,
        "alertes_ssrte": True,
        "rapports_ssrte_ici": True,
        "redd_avance": True,
        "redd_estimation_emissions": True,
        "redd_suivi_agroforesterie": True,
        "redd_zero_deforestation": True,
        "redd_donnees_mrv": True,
        "redd_simplifie": True,
        "export_pdf_excel": True,
        "alertes_avancees": True,
        "support_prioritaire": True,
        "api_personnalisee": True,
        "formation_agents_redd": True,
        "co_branding": True,
        "analyse_carbone_agregee": True,
    },
}


# Notification schedule: 30, 15, 7 days before trial end
TRIAL_NOTIFICATION_DAYS = [30, 15, 7]


def create_coop_subscription(user_id: str, cooperative_name: str = "") -> dict:
    """Create a 6-month trial subscription for a cooperative"""
    now = datetime.utcnow()
    trial_end = now + timedelta(days=COOP_TRIAL_DAYS)

    return {
        "user_id": user_id,
        "cooperative_name": cooperative_name,
        "plan": CoopPlan.TRIAL.value,
        "status": CoopSubStatus.TRIAL.value,
        "is_trial": True,
        "trial_start": now,
        "trial_end": trial_end,
        "start_date": now,
        "end_date": trial_end,
        "billing_cycle": "monthly",
        "price_xof": 0,
        "auto_upgrade_plan": CoopPlan.PRO.value,
        "notifications_sent": [],
        "chosen_plan": None,
        "payment_method": None,
        "payment_history": [],
        "created_at": now,
        "updated_at": now,
    }


def get_coop_sub_status(sub: dict) -> dict:
    """Compute current status of a cooperative subscription"""
    now = datetime.utcnow()
    status = sub.get("status")
    plan = sub.get("plan")

    if status == CoopSubStatus.CANCELLED.value:
        return {
            "is_active": False, "is_trial": False, "days_remaining": 0,
            "status": CoopSubStatus.CANCELLED.value,
            "message": "Abonnement annule.",
        }

    if sub.get("is_trial"):
        trial_end = sub.get("trial_end")
        if trial_end:
            if isinstance(trial_end, str):
                trial_end = datetime.fromisoformat(trial_end.replace('Z', '+00:00'))
            if now < trial_end:
                days_remaining = (trial_end - now).days
                return {
                    "is_active": True, "is_trial": True,
                    "days_remaining": days_remaining,
                    "trial_end": trial_end.isoformat(),
                    "status": CoopSubStatus.TRIAL.value,
                    "message": f"Essai gratuit : {days_remaining} jours restants",
                }
            else:
                return {
                    "is_active": False, "is_trial": False, "days_remaining": 0,
                    "status": CoopSubStatus.EXPIRED.value,
                    "message": "Periode d'essai terminee. Choisissez un abonnement pour continuer.",
                }

    # Paid plan
    end_date = sub.get("end_date")
    if end_date:
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        if now < end_date:
            days_remaining = (end_date - now).days
            return {
                "is_active": True, "is_trial": False,
                "days_remaining": days_remaining,
                "status": CoopSubStatus.ACTIVE.value,
            }
        else:
            return {
                "is_active": False, "is_trial": False, "days_remaining": 0,
                "status": CoopSubStatus.EXPIRED.value,
                "message": "Abonnement expire. Renouvelez pour continuer.",
            }

    return {"is_active": status == CoopSubStatus.ACTIVE.value, "is_trial": False, "status": status}
