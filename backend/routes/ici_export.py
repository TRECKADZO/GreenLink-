# ICI Notifications & Export Service
# Service pour notifications push alertes critiques et export données

from fastapi import APIRouter, HTTPException, Depends, Query, Response
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel
import json
import csv
import io
import logging

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ici-export", tags=["ICI Export & Notifications"])

# ============= AUTHENTICATION =============

async def get_admin_or_coop_user(current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') not in ['admin', 'super_admin', 'cooperative']:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs ou coopératives")
    return current_user

# ============= EXPORT CSV =============

@router.get("/alerts/csv")
async def export_alerts_csv(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Exporter les alertes ICI en CSV"""
    
    query = {}
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    if date_from:
        query["created_at"] = {"$gte": datetime.fromisoformat(date_from)}
    if date_to:
        if "created_at" in query:
            query["created_at"]["$lte"] = datetime.fromisoformat(date_to)
        else:
            query["created_at"] = {"$lte": datetime.fromisoformat(date_to)}
    
    alerts = await db.ici_alerts.find(query).sort("created_at", -1).to_list(5000)
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "ID", "Date", "Type", "Sévérité", "Producteur ID", 
        "Message", "Statut", "Résolu", "Date Résolution"
    ])
    
    # Data
    for alert in alerts:
        writer.writerow([
            str(alert.get("_id", "")),
            alert.get("created_at", "").isoformat() if alert.get("created_at") else "",
            alert.get("type", ""),
            alert.get("severity", ""),
            alert.get("farmer_id", ""),
            alert.get("message", ""),
            alert.get("status", ""),
            "Oui" if alert.get("resolved") else "Non",
            alert.get("resolved_at", "").isoformat() if alert.get("resolved_at") else ""
        ])
    
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=alertes_ici_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )

@router.get("/ssrte-visits/csv")
async def export_ssrte_visits_csv(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    niveau_risque: Optional[str] = None,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Exporter les visites SSRTE en CSV"""
    
    query = {}
    if niveau_risque:
        query["niveau_risque"] = niveau_risque
    if date_from:
        query["date_visite"] = {"$gte": datetime.fromisoformat(date_from)}
    if date_to:
        if "date_visite" in query:
            query["date_visite"]["$lte"] = datetime.fromisoformat(date_to)
        else:
            query["date_visite"] = {"$lte": datetime.fromisoformat(date_to)}
    
    visits = await db.ssrte_visits.find(query).sort("date_visite", -1).to_list(5000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "ID", "Date Visite", "Producteur ID", "Enfants Observés",
        "Niveau Risque", "Tâches Dangereuses", "Support Fourni",
        "Visite Suivi Requise"
    ])
    
    for visit in visits:
        writer.writerow([
            str(visit.get("_id", "")),
            visit.get("date_visite", "").isoformat() if visit.get("date_visite") else "",
            visit.get("farmer_id", ""),
            visit.get("enfants_observes_travaillant", 0),
            visit.get("niveau_risque", ""),
            "; ".join(visit.get("taches_dangereuses_observees", [])),
            "; ".join(visit.get("support_fourni", [])),
            "Oui" if visit.get("visite_suivi_requise") else "Non"
        ])
    
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=visites_ssrte_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )

@router.get("/profiles/csv")
async def export_ici_profiles_csv(
    niveau_risque: Optional[str] = None,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Exporter les profils ICI en CSV"""
    
    query = {}
    if niveau_risque:
        query["niveau_risque"] = niveau_risque
    
    profiles = await db.ici_profiles.find(query).to_list(5000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Producteur ID", "Genre", "Date Naissance", "Niveau Education",
        "Taille Ménage", "Nombre Enfants", "Catégorie Zone", 
        "Niveau Risque", "Score Risque", "SSRTE Visité", "Dernière MAJ"
    ])
    
    for profile in profiles:
        zone = profile.get("zone_risque", {})
        children = profile.get("household_children", {})
        writer.writerow([
            profile.get("farmer_id", ""),
            profile.get("genre", ""),
            profile.get("date_naissance", ""),
            profile.get("niveau_education", ""),
            profile.get("taille_menage", ""),
            children.get("total_enfants", "") if children else "",
            zone.get("categorie", ""),
            profile.get("niveau_risque", zone.get("niveau_risque", "")),
            profile.get("risk_score", ""),
            "Oui" if profile.get("ssrte_visite_effectuee") else "Non",
            profile.get("updated_at", "").isoformat() if profile.get("updated_at") else ""
        ])
    
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=profils_ici_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )

# ============= EXPORT JSON =============

@router.get("/full-report/json")
async def export_full_report_json(
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Exporter le rapport ICI complet en JSON"""
    
    # Récupérer toutes les données
    profiles = await db.ici_profiles.find({}).to_list(5000)
    visits = await db.ssrte_visits.find({}).to_list(5000)
    alerts = await db.ici_alerts.find({}).to_list(5000)
    
    # Calculer les statistiques
    total_profiles = len(profiles)
    risk_distribution = {
        "eleve": len([p for p in profiles if p.get("niveau_risque") == "ÉLEVÉ"]),
        "modere": len([p for p in profiles if p.get("niveau_risque") == "MODÉRÉ"]),
        "faible": len([p for p in profiles if p.get("niveau_risque") == "FAIBLE"])
    }
    
    total_children = sum(
        p.get("household_children", {}).get("total_enfants", 0) 
        for p in profiles if p.get("household_children")
    )
    
    report = {
        "meta": {
            "generated_at": datetime.utcnow().isoformat(),
            "generated_by": current_user.get("full_name", "Admin"),
            "format_version": "1.0"
        },
        "summary": {
            "total_producteurs_profiles": total_profiles,
            "total_visites_ssrte": len(visits),
            "total_alertes": len(alerts),
            "alertes_non_resolues": len([a for a in alerts if not a.get("resolved")]),
            "distribution_risques": risk_distribution,
            "total_enfants_declares": total_children
        },
        "profiles": [
            {
                "farmer_id": p.get("farmer_id"),
                "genre": p.get("genre"),
                "zone_risque": p.get("zone_risque"),
                "niveau_risque": p.get("niveau_risque"),
                "risk_score": p.get("risk_score"),
                "taille_menage": p.get("taille_menage"),
                "enfants": p.get("household_children", {}).get("total_enfants", 0) if p.get("household_children") else 0
            }
            for p in profiles
        ],
        "visits": [
            {
                "id": str(v.get("_id")),
                "farmer_id": v.get("farmer_id"),
                "date": v.get("date_visite").isoformat() if v.get("date_visite") else None,
                "enfants_observes": v.get("enfants_observes_travaillant", 0),
                "niveau_risque": v.get("niveau_risque"),
                "taches_dangereuses_count": v.get("taches_dangereuses_count", 0)
            }
            for v in visits
        ],
        "alerts": [
            {
                "id": str(a.get("_id")),
                "type": a.get("type"),
                "severity": a.get("severity"),
                "message": a.get("message"),
                "resolved": a.get("resolved", False)
            }
            for a in alerts
        ]
    }
    
    return report

# ============= NOTIFICATIONS PUSH =============

class NotificationPreferences(BaseModel):
    email_alerts: bool = True
    push_alerts: bool = True
    sms_alerts: bool = False
    min_severity: str = "high"  # low, medium, high, critical

@router.post("/notifications/preferences")
async def update_notification_preferences(
    prefs: NotificationPreferences,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Mettre à jour les préférences de notification"""
    
    await db.notification_preferences.update_one(
        {"user_id": str(current_user["_id"])},
        {
            "$set": {
                "email_alerts": prefs.email_alerts,
                "push_alerts": prefs.push_alerts,
                "sms_alerts": prefs.sms_alerts,
                "min_severity": prefs.min_severity,
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return {"message": "Préférences mises à jour", "preferences": prefs.dict()}

@router.get("/notifications/preferences")
async def get_notification_preferences(
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Obtenir les préférences de notification"""
    
    prefs = await db.notification_preferences.find_one({"user_id": str(current_user["_id"])})
    
    if not prefs:
        # Default preferences
        return {
            "email_alerts": True,
            "push_alerts": True,
            "sms_alerts": False,
            "min_severity": "high"
        }
    
    return {
        "email_alerts": prefs.get("email_alerts", True),
        "push_alerts": prefs.get("push_alerts", True),
        "sms_alerts": prefs.get("sms_alerts", False),
        "min_severity": prefs.get("min_severity", "high")
    }

async def send_push_notification(user_id: str, title: str, message: str, data: dict = None):
    """Envoyer une notification push (stockée en DB pour récupération)"""
    
    notification = {
        "user_id": user_id,
        "title": title,
        "message": message,
        "data": data or {},
        "type": "ici_alert",
        "created_at": datetime.utcnow(),
        "is_read": False,
        "is_push": True
    }
    
    await db.notifications.insert_one(notification)
    logger.info(f"Push notification sent to user {user_id}: {title}")
    
    return True

@router.get("/notifications/unread")
async def get_unread_notifications(
    current_user: dict = Depends(get_current_user)
):
    """Obtenir les notifications non lues"""
    
    notifications = await db.notifications.find({
        "user_id": str(current_user["_id"]),
        "is_read": False,
        "type": "ici_alert"
    }).sort("created_at", -1).to_list(50)
    
    return {
        "count": len(notifications),
        "notifications": [
            {
                "id": str(n["_id"]),
                "title": n.get("title"),
                "message": n.get("message"),
                "created_at": n.get("created_at"),
                "data": n.get("data", {})
            }
            for n in notifications
        ]
    }

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Marquer une notification comme lue"""
    from bson import ObjectId
    
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": str(current_user["_id"])},
        {"$set": {"is_read": True, "read_at": datetime.utcnow()}}
    )
    
    return {"message": "Notification marquée comme lue"}

# ============= COMPARATIVE DASHBOARD =============

@router.get("/cooperatives/compare")
async def compare_cooperatives(
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Dashboard comparatif inter-coopératives (admin seulement)"""
    
    if current_user.get('user_type') not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Réservé aux administrateurs")
    
    # Récupérer toutes les coopératives
    coops = await db.users.find({"user_type": "cooperative"}).to_list(100)
    
    comparison_data = []
    
    for coop in coops:
        coop_id = str(coop["_id"])
        
        # Compter les membres
        members_count = await db.coop_members.count_documents({"cooperative_id": coop_id})
        
        # Récupérer les profils ICI des membres
        members = await db.coop_members.find({"cooperative_id": coop_id}).to_list(1000)
        member_ids = [str(m["_id"]) for m in members]
        
        # Profils ICI
        ici_profiles = await db.ici_profiles.find({"farmer_id": {"$in": member_ids}}).to_list(1000)
        
        # Visites SSRTE
        ssrte_visits = await db.ssrte_visits.find({"farmer_id": {"$in": member_ids}}).to_list(1000)
        
        # Alertes
        alerts = await db.ici_alerts.find({
            "farmer_id": {"$in": member_ids},
            "resolved": False
        }).to_list(1000)
        
        # Calculer les métriques
        high_risk_count = len([p for p in ici_profiles if p.get("niveau_risque") == "ÉLEVÉ"])
        
        comparison_data.append({
            "coop_id": coop_id,
            "coop_name": coop.get("coop_name", coop.get("full_name", "N/A")),
            "coop_code": coop.get("coop_code", "N/A"),
            "region": coop.get("headquarters_region", "N/A"),
            "metrics": {
                "total_membres": members_count,
                "profils_ici_complets": len(ici_profiles),
                "taux_completion_ici": round(len(ici_profiles) / members_count * 100, 1) if members_count > 0 else 0,
                "visites_ssrte": len(ssrte_visits),
                "taux_couverture_ssrte": round(len(set(v.get("farmer_id") for v in ssrte_visits)) / members_count * 100, 1) if members_count > 0 else 0,
                "alertes_actives": len(alerts),
                "producteurs_risque_eleve": high_risk_count,
                "taux_risque_eleve": round(high_risk_count / len(ici_profiles) * 100, 1) if ici_profiles else 0
            }
        })
    
    # Trier par taux de complétion ICI (décroissant)
    comparison_data.sort(key=lambda x: x["metrics"]["taux_completion_ici"], reverse=True)
    
    # Calculer les moyennes nationales
    total_membres = sum(c["metrics"]["total_membres"] for c in comparison_data)
    total_ici = sum(c["metrics"]["profils_ici_complets"] for c in comparison_data)
    total_ssrte = sum(c["metrics"]["visites_ssrte"] for c in comparison_data)
    
    return {
        "generated_at": datetime.utcnow().isoformat(),
        "total_cooperatives": len(comparison_data),
        "national_averages": {
            "avg_membres_par_coop": round(total_membres / len(comparison_data), 1) if comparison_data else 0,
            "avg_taux_completion_ici": round(total_ici / total_membres * 100, 1) if total_membres > 0 else 0,
            "avg_visites_ssrte_par_coop": round(total_ssrte / len(comparison_data), 1) if comparison_data else 0
        },
        "cooperatives": comparison_data,
        "rankings": {
            "meilleur_taux_ici": comparison_data[0]["coop_name"] if comparison_data else "N/A",
            "plus_de_visites_ssrte": max(comparison_data, key=lambda x: x["metrics"]["visites_ssrte"])["coop_name"] if comparison_data else "N/A"
        }
    }

# ============= OFFLINE SYNC SUPPORT =============

class OfflineSyncPayload(BaseModel):
    visits: List[dict]
    sync_timestamp: datetime

@router.post("/offline/sync")
async def sync_offline_data(
    payload: OfflineSyncPayload,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Synchroniser les données collectées hors-ligne"""
    
    synced_count = 0
    errors = []
    
    for visit in payload.visits:
        try:
            # Vérifier si la visite existe déjà (par offline_id si fourni)
            offline_id = visit.get("offline_id")
            if offline_id:
                existing = await db.ssrte_visits.find_one({"offline_id": offline_id})
                if existing:
                    continue  # Skip duplicates
            
            # Préparer la visite
            visit_doc = {
                "farmer_id": visit.get("farmer_id"),
                "date_visite": datetime.fromisoformat(visit.get("date_visite")) if visit.get("date_visite") else datetime.utcnow(),
                "enfants_observes_travaillant": visit.get("enfants_observes_travaillant", 0),
                "taches_dangereuses_observees": visit.get("taches_dangereuses_observees", []),
                "support_fourni": visit.get("support_fourni", []),
                "niveau_risque": visit.get("niveau_risque", "faible"),
                "recommandations": visit.get("recommandations", []),
                "visite_suivi_requise": visit.get("visite_suivi_requise", False),
                "recorded_by": str(current_user["_id"]),
                "recorded_at": datetime.utcnow(),
                "synced_from_offline": True,
                "offline_id": offline_id,
                "offline_recorded_at": visit.get("offline_recorded_at"),
                "taches_dangereuses_count": len(visit.get("taches_dangereuses_observees", []))
            }
            
            await db.ssrte_visits.insert_one(visit_doc)
            synced_count += 1
            
            # Générer alerte si nécessaire
            if visit.get("niveau_risque") in ["eleve", "critique"] or visit.get("enfants_observes_travaillant", 0) > 0:
                from routes.ici_data_collection import create_alert
                await create_alert(
                    alert_type="ssrte_offline_sync",
                    severity="high" if visit.get("niveau_risque") == "eleve" else "critical",
                    farmer_id=visit.get("farmer_id"),
                    message=f"Visite SSRTE synchronisée (offline): {visit.get('enfants_observes_travaillant', 0)} enfants observés, risque {visit.get('niveau_risque')}",
                    data={"synced_at": datetime.utcnow().isoformat()}
                )
                
        except Exception as e:
            errors.append({"visit": visit.get("offline_id", "unknown"), "error": str(e)})
            logger.error(f"Error syncing offline visit: {e}")
    
    return {
        "message": f"{synced_count} visites synchronisées avec succès",
        "synced_count": synced_count,
        "errors_count": len(errors),
        "errors": errors[:10] if errors else []  # Limit error details
    }

@router.get("/offline/pending")
async def get_pending_sync_data(
    since: Optional[str] = None,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Obtenir les données à synchroniser pour le mode offline"""
    
    # Récupérer les membres de la coopérative pour sync local
    if current_user.get("user_type") == "cooperative":
        coop_id = str(current_user["_id"])
        members = await db.coop_members.find({"cooperative_id": coop_id}).to_list(1000)
    else:
        members = []
    
    # Récupérer les tâches dangereuses de référence
    from routes.ici_data_collection import TACHES_DANGEREUSES
    
    return {
        "sync_timestamp": datetime.utcnow().isoformat(),
        "reference_data": {
            "taches_dangereuses": TACHES_DANGEREUSES,
            "types_support": [
                "Kit scolaire distribué",
                "Certificat de naissance aidé",
                "Inscription école facilitée",
                "Formation professionnelle",
                "Sensibilisation famille",
                "Suivi psychosocial",
                "Aide alimentaire",
                "Référencement services sociaux"
            ],
            "niveaux_risque": ["faible", "modere", "eleve", "critique"]
        },
        "members": [
            {
                "id": str(m["_id"]),
                "full_name": m.get("full_name", m.get("name", "")),
                "phone": m.get("phone_number", m.get("phone", "")),
                "village": m.get("village", "")
            }
            for m in members
        ]
    }
