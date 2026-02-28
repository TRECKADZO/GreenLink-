# ICI Data Collection & Alert System
# Système de collecte de données et d'alertes basé sur les indicateurs ICI
# Pour alimentation automatique des métriques du dashboard

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ici-data", tags=["ICI Data Collection"])

# ============= AUTHENTICATION =============

async def get_admin_or_coop_user(current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') not in ['admin', 'super_admin', 'cooperative']:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs ou coopératives")
    return current_user

# ============= MODÈLES DE DONNÉES ICI =============

class HouseholdChildData(BaseModel):
    """Données sur les enfants du ménage pour le SSRTE"""
    total_enfants: int = Field(ge=0, description="Nombre total d'enfants dans le ménage")
    enfants_5_11_ans: int = Field(ge=0, default=0, description="Enfants de 5 à 11 ans")
    enfants_12_14_ans: int = Field(ge=0, default=0, description="Enfants de 12 à 14 ans")
    enfants_15_17_ans: int = Field(ge=0, default=0, description="Enfants de 15 à 17 ans")
    enfants_scolarises: int = Field(ge=0, default=0, description="Enfants actuellement scolarisés")
    enfants_travaillant_exploitation: int = Field(ge=0, default=0, description="Enfants travaillant sur l'exploitation")
    taches_effectuees: List[str] = Field(default=[], description="Tâches effectuées par les enfants")

class LaborForceData(BaseModel):
    """Données sur la main-d'œuvre agricole"""
    travailleurs_permanents: int = Field(ge=0, default=0)
    travailleurs_saisonniers: int = Field(ge=0, default=0)
    travailleurs_avec_contrat: int = Field(ge=0, default=0)
    salaire_journalier_moyen_fcfa: int = Field(ge=0, default=0)
    utilise_main_oeuvre_familiale: bool = True

class FarmerICIProfile(BaseModel):
    """Profil ICI complet d'un producteur"""
    # Données démographiques
    date_naissance: Optional[str] = None
    genre: Optional[str] = Field(None, description="homme/femme")
    niveau_education: Optional[str] = Field(None, description="aucun/primaire/secondaire/superieur")
    peut_lire_ecrire: bool = True
    
    # Données ménage
    taille_menage: int = Field(default=4, ge=1)
    household_children: Optional[HouseholdChildData] = None
    
    # Main-d'œuvre
    labor_force: Optional[LaborForceData] = None
    
    # Pratiques
    utilise_pesticides: bool = False
    formation_securite_recue: bool = False
    membre_groupe_epargne: bool = False
    
    # Conformité
    ssrte_visite_effectuee: bool = False
    date_derniere_visite_ssrte: Optional[str] = None
    consent_rgpd: bool = True

class SSRTEVisitReport(BaseModel):
    """Rapport de visite SSRTE"""
    farmer_id: str
    date_visite: datetime = Field(default_factory=datetime.utcnow)
    agent_id: Optional[str] = None
    
    # Observations enfants
    enfants_observes_travaillant: int = Field(ge=0, default=0)
    taches_dangereuses_observees: List[str] = Field(default=[])
    
    # Actions de support prises
    support_fourni: List[str] = Field(default=[])
    kit_scolaire_distribue: bool = False
    certificat_naissance_aide: bool = False
    
    # Évaluation
    niveau_risque: str = Field(default="faible", description="faible/modere/eleve/critique")
    recommandations: List[str] = Field(default=[])
    visite_suivi_requise: bool = False

# ============= DÉFINITION DES TÂCHES DANGEREUSES (Convention OIT 182) =============

TACHES_DANGEREUSES = [
    {"code": "TD1", "nom": "Port de charges lourdes", "description": "Porter des charges > 20kg", "severite": "elevee"},
    {"code": "TD2", "nom": "Utilisation outils tranchants", "description": "Machettes, couteaux sans protection", "severite": "elevee"},
    {"code": "TD3", "nom": "Manipulation pesticides", "description": "Contact avec produits chimiques", "severite": "critique"},
    {"code": "TD4", "nom": "Longues heures de travail", "description": "> 6h/jour pour < 15 ans", "severite": "elevee"},
    {"code": "TD5", "nom": "Travail de nuit", "description": "Travail après 18h", "severite": "modere"},
    {"code": "TD6", "nom": "Brûlage des champs", "description": "Exposition fumée/feu", "severite": "elevee"},
    {"code": "TD7", "nom": "Grimpée arbres dangereux", "description": "Sans équipement sécurité", "severite": "elevee"},
    {"code": "TD8", "nom": "Transport charges animaux", "description": "Risque accidents", "severite": "modere"},
]

# ============= CLASSIFICATION ZONES À RISQUE =============

import unicodedata

def normalize_text(text: str) -> str:
    """Normalise le texte en supprimant les accents pour comparaison"""
    if not text:
        return ""
    # Décompose les caractères accentués et supprime les diacritiques
    nfkd = unicodedata.normalize('NFKD', text)
    return ''.join([c for c in nfkd if not unicodedata.combining(c)]).lower()

def get_zone_risk_category(department: str) -> dict:
    """Retourne la catégorie de risque ICI selon le département"""
    from routes.ici_analytics import CATEGORIES_ZONES
    
    # Normaliser le département recherché
    dept_normalized = normalize_text(department)
    
    for cat_key, cat_data in CATEGORIES_ZONES.items():
        for dept in cat_data.get("departements", []):
            if normalize_text(dept) == dept_normalized:
                return {
                    "categorie": cat_key,
                    "niveau_risque": cat_data.get("risque_travail_enfants", "INCONNU"),
                    "priorite_intervention": cat_data.get("priorite_intervention", 0),
                    "part_production": cat_data.get("part_production_nationale", 0)
                }
    
    # Département non classifié
    return {
        "categorie": "non_classifie",
        "niveau_risque": "À ÉVALUER",
        "priorite_intervention": 0,
        "part_production": 0
    }

# ============= ENDPOINTS COLLECTE DONNÉES =============

@router.post("/farmers/{farmer_id}/ici-profile")
async def update_farmer_ici_profile(
    farmer_id: str,
    profile: FarmerICIProfile,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Mettre à jour le profil ICI d'un producteur"""
    
    # Vérifier que le producteur existe
    farmer = await db.users.find_one({"_id": ObjectId(farmer_id)})
    if not farmer:
        # Chercher dans coop_members
        farmer = await db.coop_members.find_one({"_id": ObjectId(farmer_id)})
    
    if not farmer:
        raise HTTPException(status_code=404, detail="Producteur non trouvé")
    
    # Déterminer la zone de risque
    department = farmer.get("department") or farmer.get("village", "")
    zone_risk = get_zone_risk_category(department)
    
    # Calculer le score de risque travail enfants
    risk_score = 0
    if profile.household_children:
        if profile.household_children.enfants_travaillant_exploitation > 0:
            risk_score += 30
        if profile.household_children.enfants_5_11_ans > 0 and profile.household_children.enfants_travaillant_exploitation > 0:
            risk_score += 20
        for tache in profile.household_children.taches_effectuees:
            if any(td["code"] in tache or td["nom"].lower() in tache.lower() for td in TACHES_DANGEREUSES):
                risk_score += 15
    
    if not profile.formation_securite_recue:
        risk_score += 10
    
    if zone_risk["priorite_intervention"] == 1:
        risk_score += 15
    
    # Normaliser le score (0-100)
    risk_score = min(100, risk_score)
    
    # Déterminer le niveau de risque
    if risk_score >= 60:
        niveau_risque = "ÉLEVÉ"
    elif risk_score >= 30:
        niveau_risque = "MODÉRÉ"
    else:
        niveau_risque = "FAIBLE"
    
    # Préparer les données à sauvegarder
    ici_data = profile.dict()
    ici_data["zone_risque"] = zone_risk
    ici_data["risk_score"] = risk_score
    ici_data["niveau_risque"] = niveau_risque
    ici_data["updated_at"] = datetime.utcnow()
    ici_data["updated_by"] = current_user["_id"]
    
    # Sauvegarder dans la collection ici_profiles
    await db.ici_profiles.update_one(
        {"farmer_id": farmer_id},
        {"$set": ici_data},
        upsert=True
    )
    
    # Mettre à jour le profil utilisateur avec les données clés
    update_fields = {
        "ici_profile_complete": True,
        "ici_risk_level": niveau_risque,
        "ici_risk_score": risk_score,
        "ici_last_updated": datetime.utcnow()
    }
    
    if farmer.get("user_type"):  # C'est un user
        await db.users.update_one({"_id": ObjectId(farmer_id)}, {"$set": update_fields})
    else:  # C'est un coop_member
        await db.coop_members.update_one({"_id": ObjectId(farmer_id)}, {"$set": update_fields})
    
    # Générer alerte si risque élevé
    if niveau_risque == "ÉLEVÉ":
        await create_alert(
            alert_type="child_labor_risk",
            severity="high",
            farmer_id=farmer_id,
            message=f"Risque élevé de travail des enfants détecté (score: {risk_score})",
            data={"risk_score": risk_score, "taches_dangereuses": profile.household_children.taches_effectuees if profile.household_children else []}
        )
    
    return {
        "message": "Profil ICI mis à jour avec succès",
        "farmer_id": farmer_id,
        "risk_score": risk_score,
        "niveau_risque": niveau_risque,
        "zone_risque": zone_risk,
        "alerte_generee": niveau_risque == "ÉLEVÉ"
    }

@router.post("/ssrte/visit")
async def record_ssrte_visit(
    visit: SSRTEVisitReport,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Enregistrer une visite SSRTE"""
    
    visit_dict = visit.dict()
    visit_dict["recorded_by"] = str(current_user["_id"])
    visit_dict["recorded_at"] = datetime.utcnow()
    
    # Ajouter l'ID de la coopérative si l'utilisateur est une coopérative
    if current_user.get('user_type') == 'cooperative':
        visit_dict["cooperative_id"] = str(current_user["_id"])
    
    # Ajouter le nom de l'agent (nom de la coopérative ou de l'admin)
    visit_dict["agent_name"] = current_user.get("full_name") or current_user.get("coop_name") or "Agent"
    visit_dict["agent_id"] = str(current_user["_id"])
    
    # Récupérer le nom du producteur
    farmer = await db.users.find_one({"_id": ObjectId(visit.farmer_id)})
    if not farmer:
        farmer = await db.coop_members.find_one({"_id": ObjectId(visit.farmer_id)})
    if farmer:
        visit_dict["farmer_name"] = farmer.get("full_name") or farmer.get("name") or "Producteur"
    
    # Calculer le nombre de tâches dangereuses
    taches_dangereuses_count = len([
        t for t in visit.taches_dangereuses_observees 
        if any(td["code"] in t or td["nom"].lower() in t.lower() for td in TACHES_DANGEREUSES)
    ])
    
    visit_dict["taches_dangereuses_count"] = taches_dangereuses_count
    
    result = await db.ssrte_visits.insert_one(visit_dict)
    
    # Mettre à jour le profil producteur
    await db.ici_profiles.update_one(
        {"farmer_id": visit.farmer_id},
        {
            "$set": {
                "ssrte_visite_effectuee": True,
                "date_derniere_visite_ssrte": visit.date_visite.isoformat(),
                "dernier_niveau_risque_ssrte": visit.niveau_risque
            },
            "$inc": {"total_visites_ssrte": 1}
        },
        upsert=True
    )
    
    # Générer alerte si niveau critique ou tâches dangereuses observées
    if visit.niveau_risque in ["eleve", "critique"] or visit.enfants_observes_travaillant > 0:
        await create_alert(
            alert_type="ssrte_urgent",
            severity="critical" if visit.niveau_risque == "critique" else "high",
            farmer_id=visit.farmer_id,
            message=f"Visite SSRTE: {visit.enfants_observes_travaillant} enfants observés travaillant, niveau risque: {visit.niveau_risque}",
            data={
                "visit_id": str(result.inserted_id),
                "enfants_observes": visit.enfants_observes_travaillant,
                "taches_dangereuses": visit.taches_dangereuses_observees
            }
        )
    
    return {
        "message": "Visite SSRTE enregistrée",
        "visit_id": str(result.inserted_id),
        "niveau_risque": visit.niveau_risque,
        "enfants_observes_travaillant": visit.enfants_observes_travaillant,
        "alerte_generee": visit.niveau_risque in ["eleve", "critique"] or visit.enfants_observes_travaillant > 0
    }

@router.get("/farmers/{farmer_id}/ici-profile")
async def get_farmer_ici_profile(
    farmer_id: str,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Obtenir le profil ICI d'un producteur"""
    
    profile = await db.ici_profiles.find_one({"farmer_id": farmer_id})
    
    if not profile:
        return {
            "farmer_id": farmer_id,
            "profile_complete": False,
            "message": "Profil ICI non encore renseigné"
        }
    
    profile["_id"] = str(profile["_id"])
    return profile

@router.get("/ssrte/visits")
async def get_ssrte_visits(
    farmer_id: Optional[str] = None,
    niveau_risque: Optional[str] = None,
    date_from: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Liste des visites SSRTE"""
    
    query = {}
    if farmer_id:
        query["farmer_id"] = farmer_id
    if niveau_risque:
        query["niveau_risque"] = niveau_risque
    if date_from:
        query["date_visite"] = {"$gte": datetime.fromisoformat(date_from)}
    
    visits = await db.ssrte_visits.find(query).sort("date_visite", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.ssrte_visits.count_documents(query)
    
    return {
        "total": total,
        "visits": [{
            "id": str(v["_id"]),
            "farmer_id": v.get("farmer_id"),
            "date_visite": v.get("date_visite"),
            "niveau_risque": v.get("niveau_risque"),
            "enfants_observes_travaillant": v.get("enfants_observes_travaillant", 0),
            "taches_dangereuses_count": v.get("taches_dangereuses_count", 0),
            "support_fourni": v.get("support_fourni", [])
        } for v in visits]
    }

# ============= SYSTÈME D'ALERTES =============

async def create_alert(
    alert_type: str,
    severity: str,
    farmer_id: str,
    message: str,
    data: dict = None
):
    """Créer une alerte dans le système et envoyer les notifications push"""
    
    alert_doc = {
        "type": alert_type,
        "severity": severity,  # low, medium, high, critical
        "farmer_id": farmer_id,
        "message": message,
        "data": data or {},
        "status": "new",
        "created_at": datetime.utcnow(),
        "acknowledged": False,
        "acknowledged_by": None,
        "acknowledged_at": None,
        "resolved": False,
        "resolved_by": None,
        "resolved_at": None
    }
    
    result = await db.ici_alerts.insert_one(alert_doc)
    alert_id = str(result.inserted_id)
    
    # Notifier les admins si sévérité critique ou haute
    if severity in ["critical", "high"]:
        # Récupérer les admins
        admins = await db.users.find({"user_type": {"$in": ["admin", "super_admin"]}}).to_list(100)
        
        for admin in admins:
            await db.notifications.insert_one({
                "user_id": str(admin["_id"]),
                "title": f"Alerte ICI - {severity.upper()}",
                "message": message,
                "type": "ici_alert",
                "alert_id": alert_id,
                "created_at": datetime.utcnow(),
                "is_read": False
            })
        
        # Envoyer push notifications pour alertes critiques
        try:
            from services.push_notifications import push_service
            alert_doc["_id"] = alert_id
            await push_service.send_critical_alert_notification(alert_doc)
            logger.info(f"Push notification sent for alert: {alert_id}")
        except Exception as e:
            logger.error(f"Failed to send push notification: {e}")
    
    logger.warning(f"ICI Alert created: {alert_type} - {severity} - {message}")
    
    return alert_id

@router.get("/alerts")
async def get_ici_alerts(
    status: Optional[str] = Query(None, description="new/acknowledged/resolved"),
    severity: Optional[str] = None,
    alert_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Liste des alertes ICI"""
    
    query = {}
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    if alert_type:
        query["type"] = alert_type
    
    alerts = await db.ici_alerts.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.ici_alerts.count_documents(query)
    
    # Statistiques
    stats = {
        "total_new": await db.ici_alerts.count_documents({"status": "new"}),
        "total_critical": await db.ici_alerts.count_documents({"severity": "critical", "resolved": False}),
        "total_high": await db.ici_alerts.count_documents({"severity": "high", "resolved": False})
    }
    
    return {
        "total": total,
        "stats": stats,
        "alerts": [{
            "id": str(a["_id"]),
            "type": a.get("type"),
            "severity": a.get("severity"),
            "farmer_id": a.get("farmer_id"),
            "message": a.get("message"),
            "status": a.get("status"),
            "created_at": a.get("created_at"),
            "acknowledged": a.get("acknowledged", False),
            "resolved": a.get("resolved", False)
        } for a in alerts]
    }

@router.put("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Prendre en charge une alerte"""
    
    result = await db.ici_alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {
            "$set": {
                "status": "acknowledged",
                "acknowledged": True,
                "acknowledged_by": current_user["_id"],
                "acknowledged_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")
    
    return {"message": "Alerte prise en charge", "alert_id": alert_id}

@router.put("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    resolution_note: str = "",
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Marquer une alerte comme résolue"""
    
    result = await db.ici_alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {
            "$set": {
                "status": "resolved",
                "resolved": True,
                "resolved_by": current_user["_id"],
                "resolved_at": datetime.utcnow(),
                "resolution_note": resolution_note
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")
    
    return {"message": "Alerte résolue", "alert_id": alert_id}

# ============= CALCUL AUTOMATIQUE DES MÉTRIQUES =============

@router.get("/metrics/calculate")
async def calculate_ici_metrics(
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Calculer les métriques ICI à partir des données collectées"""
    
    # Total producteurs avec profil ICI
    total_profiles = await db.ici_profiles.count_documents({})
    
    # Profils par niveau de risque
    risk_levels = {
        "eleve": await db.ici_profiles.count_documents({"niveau_risque": "ÉLEVÉ"}),
        "modere": await db.ici_profiles.count_documents({"niveau_risque": "MODÉRÉ"}),
        "faible": await db.ici_profiles.count_documents({"niveau_risque": "FAIBLE"})
    }
    
    # Visites SSRTE
    total_visits = await db.ssrte_visits.count_documents({})
    visits_last_month = await db.ssrte_visits.count_documents({
        "date_visite": {"$gte": datetime.utcnow() - timedelta(days=30)}
    })
    
    # Enfants identifiés en travail
    pipeline = [
        {"$match": {"household_children.enfants_travaillant_exploitation": {"$gt": 0}}},
        {"$group": {
            "_id": None,
            "total_menages": {"$sum": 1},
            "total_enfants_travaillant": {"$sum": "$household_children.enfants_travaillant_exploitation"}
        }}
    ]
    
    child_labor_stats = await db.ici_profiles.aggregate(pipeline).to_list(1)
    
    if child_labor_stats:
        menages_avec_enfants_travaillant = child_labor_stats[0].get("total_menages", 0)
        total_enfants_travaillant = child_labor_stats[0].get("total_enfants_travaillant", 0)
    else:
        menages_avec_enfants_travaillant = 0
        total_enfants_travaillant = 0
    
    # Alertes actives
    alertes_actives = await db.ici_alerts.count_documents({"resolved": False})
    alertes_critiques = await db.ici_alerts.count_documents({"severity": "critical", "resolved": False})
    
    # Taux de couverture SSRTE
    farmers_with_ssrte = await db.ici_profiles.count_documents({"ssrte_visite_effectuee": True})
    total_farmers = await db.users.count_documents({"user_type": "producteur"})
    total_farmers += await db.coop_members.count_documents({})
    
    taux_couverture_ssrte = (farmers_with_ssrte / total_farmers * 100) if total_farmers > 0 else 0
    
    return {
        "generated_at": datetime.utcnow().isoformat(),
        "couverture": {
            "total_producteurs": total_farmers,
            "profils_ici_complets": total_profiles,
            "taux_completion_profil": round(total_profiles / total_farmers * 100, 1) if total_farmers > 0 else 0
        },
        "risques": {
            "distribution": risk_levels,
            "pourcentage_risque_eleve": round(risk_levels["eleve"] / total_profiles * 100, 1) if total_profiles > 0 else 0
        },
        "travail_enfants": {
            "menages_avec_enfants_travaillant": menages_avec_enfants_travaillant,
            "total_enfants_identifies": total_enfants_travaillant,
            "pourcentage_menages": round(menages_avec_enfants_travaillant / total_profiles * 100, 1) if total_profiles > 0 else 0
        },
        "ssrte": {
            "visites_totales": total_visits,
            "visites_dernier_mois": visits_last_month,
            "producteurs_visites": farmers_with_ssrte,
            "taux_couverture": round(taux_couverture_ssrte, 1)
        },
        "alertes": {
            "actives": alertes_actives,
            "critiques": alertes_critiques
        }
    }

# ============= ENDPOINT TÂCHES DANGEREUSES =============

@router.get("/reference/dangerous-tasks")
async def get_dangerous_tasks_reference():
    """Liste de référence des tâches dangereuses (Convention OIT 182)"""
    return {
        "source": "Convention OIT 182 - Pires formes de travail des enfants",
        "taches": TACHES_DANGEREUSES
    }

# ============= RAPPORT HEBDOMADAIRE =============

@router.post("/reports/weekly-summary")
async def generate_weekly_summary(
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Générer et envoyer le rapport hebdomadaire ICI aux administrateurs"""
    
    # Calculer les métriques
    metrics = await calculate_ici_metrics(current_user)
    
    # Créer une entrée de rapport
    report_doc = {
        "type": "weekly_ici_summary",
        "generated_at": datetime.utcnow(),
        "generated_by": current_user["_id"],
        "metrics": metrics,
        "period_start": datetime.utcnow() - timedelta(days=7),
        "period_end": datetime.utcnow()
    }
    
    await db.ici_reports.insert_one(report_doc)
    
    # Notifier les admins
    admins = await db.users.find({"user_type": {"$in": ["admin", "super_admin"]}}).to_list(100)
    
    for admin in admins:
        await db.notifications.insert_one({
            "user_id": str(admin["_id"]),
            "title": "Rapport ICI Hebdomadaire",
            "message": f"Nouveau rapport généré. Alertes critiques: {metrics['alertes']['critiques']}, Couverture SSRTE: {metrics['ssrte']['taux_couverture']}%",
            "type": "ici_report",
            "created_at": datetime.utcnow(),
            "is_read": False
        })
    
    return {
        "message": "Rapport hebdomadaire généré et envoyé",
        "metrics_summary": {
            "alertes_critiques": metrics["alertes"]["critiques"],
            "taux_couverture_ssrte": metrics["ssrte"]["taux_couverture"],
            "enfants_identifies": metrics["travail_enfants"]["total_enfants_identifies"]
        }
    }
