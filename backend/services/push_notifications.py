# Push Notifications pour Alertes Critiques ICI
# Backend service pour envoyer des notifications push via Expo

import os
import logging
import httpx
from typing import List, Optional
from datetime import datetime
from database import db

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

class PushNotificationService:
    """Service pour envoyer des notifications push via Expo Push API"""
    
    def __init__(self):
        self.session = None
    
    async def _get_session(self):
        if self.session is None:
            self.session = httpx.AsyncClient(timeout=30.0)
        return self.session
    
    async def send_push_notification(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[dict] = None,
        priority: str = "high",
        channel_id: str = "default"
    ) -> dict:
        """
        Envoyer une notification push via Expo Push API
        
        Args:
            tokens: Liste de Expo push tokens
            title: Titre de la notification
            body: Corps de la notification
            data: Données additionnelles (pour navigation)
            priority: Priorité (default, normal, high)
            channel_id: Android channel ID
        """
        if not tokens:
            return {"success": False, "error": "No tokens provided"}
        
        # Construire les messages
        messages = []
        for token in tokens:
            if not token.startswith("ExponentPushToken["):
                continue
                
            message = {
                "to": token,
                "title": title,
                "body": body,
                "sound": "default",
                "priority": priority,
                "channelId": channel_id,
            }
            
            if data:
                message["data"] = data
            
            messages.append(message)
        
        if not messages:
            return {"success": False, "error": "No valid tokens"}
        
        try:
            session = await self._get_session()
            response = await session.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                }
            )
            
            result = response.json()
            
            # Log les résultats
            success_count = sum(1 for r in result.get("data", []) if r.get("status") == "ok")
            logger.info(f"Push notification sent: {success_count}/{len(messages)} successful")
            
            return {
                "success": True,
                "sent": len(messages),
                "successful": success_count,
                "results": result.get("data", [])
            }
            
        except Exception as e:
            logger.error(f"Error sending push notification: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_device_tokens(
        self,
        user_ids: Optional[List[str]] = None,
        user_types: Optional[List[str]] = None
    ) -> List[str]:
        """
        Récupérer les tokens de push des utilisateurs
        
        Args:
            user_ids: Liste d'IDs utilisateurs spécifiques
            user_types: Liste de types d'utilisateurs (admin, cooperative, farmer)
        """
        query = {"push_token": {"$exists": True, "$ne": None}}
        
        if user_ids:
            from bson import ObjectId
            query["_id"] = {"$in": [ObjectId(uid) for uid in user_ids]}
        
        if user_types:
            query["user_type"] = {"$in": user_types}
        
        users = await db.users.find(query, {"push_token": 1}).to_list(1000)
        tokens = [u["push_token"] for u in users if u.get("push_token")]
        
        return tokens
    
    async def send_critical_alert_notification(self, alert_data: dict) -> dict:
        """
        Envoyer une notification pour une alerte critique ICI
        
        Notifie les admins et coopératives concernées
        """
        severity = alert_data.get("severity", "medium")
        message = alert_data.get("message", "Nouvelle alerte ICI")
        farmer_id = alert_data.get("farmer_id")
        
        # Déterminer le titre selon la sévérité
        if severity == "critical":
            title = "🚨 ALERTE CRITIQUE ICI"
            priority = "high"
            channel_id = "alerts"
        elif severity == "high":
            title = "⚠️ Alerte Haute Priorité ICI"
            priority = "high"
            channel_id = "alerts"
        else:
            title = "📋 Nouvelle Alerte ICI"
            priority = "normal"
            channel_id = "default"
        
        # Récupérer les tokens des admins et coopératives
        tokens = await self.get_device_tokens(user_types=["admin", "super_admin", "cooperative"])
        
        # Données pour la navigation dans l'app
        data = {
            "type": "ici_alert",
            "alert_id": str(alert_data.get("_id", "")),
            "severity": severity,
            "screen": "ICIAlerts",
            "params": {"alertId": str(alert_data.get("_id", ""))}
        }
        
        if farmer_id:
            data["farmer_id"] = farmer_id
        
        # Envoyer la notification
        result = await self.send_push_notification(
            tokens=tokens,
            title=title,
            body=message[:200],  # Limiter la longueur
            data=data,
            priority=priority,
            channel_id=channel_id
        )
        
        # Logger dans la base
        await db.push_notifications_log.insert_one({
            "type": "ici_alert",
            "alert_data": alert_data,
            "tokens_count": len(tokens),
            "result": result,
            "created_at": datetime.utcnow()
        })
        
        return result
    
    async def send_ssrte_visit_notification(self, visit_data: dict) -> dict:
        """
        Notifier d'une nouvelle visite SSRTE
        """
        farmer_name = visit_data.get("farmer_name", "Producteur")
        risk_level = visit_data.get("niveau_risque", "faible")
        children_count = visit_data.get("enfants_observes_travaillant", 0)
        
        # Titre selon le niveau de risque
        if risk_level in ["critique", "eleve"]:
            title = f"⚠️ Visite SSRTE à risque - {farmer_name}"
            body = f"Niveau de risque: {risk_level.upper()}, {children_count} enfant(s) en travail détecté(s)"
            priority = "high"
        else:
            title = f"📋 Nouvelle visite SSRTE - {farmer_name}"
            body = f"Visite enregistrée avec niveau de risque {risk_level}"
            priority = "normal"
        
        # Notifier les admins seulement pour les cas à risque
        user_types = ["admin", "super_admin"]
        if risk_level in ["critique", "eleve"]:
            user_types.append("cooperative")
        
        tokens = await self.get_device_tokens(user_types=user_types)
        
        data = {
            "type": "ssrte_visit",
            "visit_id": str(visit_data.get("_id", "")),
            "risk_level": risk_level,
            "screen": "SSRTEVisits",
        }
        
        return await self.send_push_notification(
            tokens=tokens,
            title=title,
            body=body,
            data=data,
            priority=priority
        )
    
    async def send_ssrte_case_alert(self, case_data: dict) -> dict:
        """
        Envoyer une notification push pour un cas SSRTE critique
        Notifie immédiatement les responsables ICI pour intervention rapide
        """
        child_name = case_data.get("child_name", "Enfant")
        child_age = case_data.get("child_age", 0)
        labor_type = case_data.get("labor_type", "unknown")
        severity_score = case_data.get("severity_score", 0)
        member_name = case_data.get("member_name", "Producteur")
        cooperative_id = case_data.get("cooperative_id")
        
        # Mapper les types de travail
        labor_type_labels = {
            "worst_forms": "PIRE FORME",
            "hazardous": "DANGEREUX", 
            "light_work": "Léger",
            "none": "Aucun"
        }
        labor_label = labor_type_labels.get(labor_type, labor_type)
        
        # Déterminer la sévérité et le message
        if severity_score >= 8:
            title = "🚨 CAS SSRTE CRITIQUE DÉTECTÉ"
            emoji = "🚨"
            priority = "high"
            channel_id = "alerts"
        elif severity_score >= 5:
            title = "⚠️ Cas SSRTE Haute Priorité"
            emoji = "⚠️"
            priority = "high"
            channel_id = "alerts"
        else:
            title = "📋 Nouveau Cas SSRTE"
            emoji = "📋"
            priority = "normal"
            channel_id = "default"
        
        body = f"{emoji} {child_name} ({child_age} ans) - Travail {labor_label}\nProducteur: {member_name}\nSévérité: {severity_score}/10"
        
        # Récupérer les tokens (admins + coopérative concernée)
        user_types = ["admin", "super_admin"]
        tokens = await self.get_device_tokens(user_types=user_types)
        
        # Ajouter les tokens de la coopérative concernée si disponible
        if cooperative_id:
            coop_tokens = await self.get_device_tokens(user_ids=[cooperative_id])
            tokens.extend(coop_tokens)
        
        # Données pour la navigation
        data = {
            "type": "ssrte_case",
            "case_id": str(case_data.get("_id", "")),
            "severity_score": severity_score,
            "labor_type": labor_type,
            "screen": "SSRTECases",
            "params": {"caseId": str(case_data.get("_id", ""))}
        }
        
        # Envoyer la notification
        result = await self.send_push_notification(
            tokens=tokens,
            title=title,
            body=body[:200],
            data=data,
            priority=priority,
            channel_id=channel_id
        )
        
        # Logger dans la base
        await db.push_notifications_log.insert_one({
            "type": "ssrte_case_alert",
            "case_data": {
                "case_id": str(case_data.get("_id", "")),
                "child_name": child_name,
                "severity_score": severity_score,
                "labor_type": labor_type
            },
            "tokens_count": len(tokens),
            "result": result,
            "created_at": datetime.utcnow()
        })
        
        logger.info(f"[SSRTE] Push notification sent for case: {child_name}, severity: {severity_score}")
        
        return result
    
    async def broadcast_to_all_field_agents(self, title: str, body: str, data: dict = None) -> dict:
        """
        Diffuser un message à tous les agents de terrain (coopératives)
        """
        tokens = await self.get_device_tokens(user_types=["cooperative"])
        
        return await self.send_push_notification(
            tokens=tokens,
            title=title,
            body=body,
            data=data or {},
            priority="normal"
        )


# Instance singleton
push_service = PushNotificationService()


# ============= API Routes =============

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from routes.auth import get_current_user

router = APIRouter(prefix="/api/push-notifications", tags=["Push Notifications"])

class SendPushRequest(BaseModel):
    title: str
    body: str
    user_types: Optional[List[str]] = None
    user_ids: Optional[List[str]] = None
    data: Optional[dict] = None
    priority: str = "normal"

class AlertNotificationRequest(BaseModel):
    alert_id: str
    severity: str
    type: str
    message: str
    farmer_id: Optional[str] = None


async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.post("/send")
async def send_push_notification(
    request: SendPushRequest,
    current_user: dict = Depends(get_admin_user)
):
    """Envoyer une notification push personnalisée (admin only)"""
    tokens = await push_service.get_device_tokens(
        user_ids=request.user_ids,
        user_types=request.user_types
    )
    
    if not tokens:
        raise HTTPException(status_code=404, detail="No devices found for the specified criteria")
    
    result = await push_service.send_push_notification(
        tokens=tokens,
        title=request.title,
        body=request.body,
        data=request.data,
        priority=request.priority
    )
    
    return result


@router.post("/alert/critical")
async def send_critical_alert(
    request: AlertNotificationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Envoyer une notification pour une alerte critique ICI"""
    alert_data = {
        "_id": request.alert_id,
        "severity": request.severity,
        "type": request.type,
        "message": request.message,
        "farmer_id": request.farmer_id
    }
    
    result = await push_service.send_critical_alert_notification(alert_data)
    return result


@router.post("/broadcast/field-agents")
async def broadcast_to_field_agents(
    request: SendPushRequest,
    current_user: dict = Depends(get_admin_user)
):
    """Diffuser un message à tous les agents de terrain"""
    result = await push_service.broadcast_to_all_field_agents(
        title=request.title,
        body=request.body,
        data=request.data
    )
    return result


@router.get("/stats")
async def get_push_notification_stats(
    current_user: dict = Depends(get_admin_user)
):
    """Obtenir les statistiques des notifications push"""
    # Compter les devices enregistrés
    total_devices = await db.users.count_documents({"push_token": {"$exists": True, "$ne": None}})
    admin_devices = await db.users.count_documents({"push_token": {"$exists": True, "$ne": None}, "user_type": {"$in": ["admin", "super_admin"]}})
    coop_devices = await db.users.count_documents({"push_token": {"$exists": True, "$ne": None}, "user_type": "cooperative"})
    farmer_devices = await db.users.count_documents({"push_token": {"$exists": True, "$ne": None}, "user_type": "farmer"})
    
    # Dernières notifications envoyées
    recent_logs = await db.push_notifications_log.find().sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "registered_devices": {
            "total": total_devices,
            "admins": admin_devices,
            "cooperatives": coop_devices,
            "farmers": farmer_devices
        },
        "recent_notifications": [
            {
                "type": log.get("type"),
                "tokens_count": log.get("tokens_count"),
                "success": log.get("result", {}).get("success"),
                "sent_at": log.get("created_at")
            }
            for log in recent_logs
        ]
    }

    async def send_audit_mission_notification(
        self,
        auditor_id: str,
        mission_data: dict
    ) -> dict:
        """
        Envoyer une notification à un auditeur pour une nouvelle mission assignée
        
        Args:
            auditor_id: ID de l'auditeur
            mission_data: Données de la mission
        """
        # Récupérer le token de l'auditeur
        from bson import ObjectId
        
        auditor = await db.users.find_one(
            {"_id": ObjectId(auditor_id)},
            {"push_token": 1, "full_name": 1}
        )
        
        if not auditor or not auditor.get("push_token"):
            logger.info(f"No push token for auditor {auditor_id}")
            return {"success": False, "error": "No push token"}
        
        title = "🎯 Nouvelle Mission d'Audit"
        body = f"Mission: {mission_data.get('cooperative_name', 'Coopérative')}\n{mission_data.get('parcels_count', 0)} parcelles à auditer"
        
        if mission_data.get("deadline"):
            body += f"\nÉchéance: {mission_data.get('deadline')}"
        
        data = {
            "type": "audit_mission",
            "mission_id": str(mission_data.get("_id", "")),
            "cooperative_name": mission_data.get("cooperative_name"),
            "parcels_count": mission_data.get("parcels_count"),
            "screen": "AuditorMission",
            "params": {
                "missionId": str(mission_data.get("_id", ""))
            }
        }
        
        result = await self.send_push_notification(
            tokens=[auditor["push_token"]],
            title=title,
            body=body,
            data=data,
            priority="high",
            channel_id="audit_missions"
        )
        
        # Log notification
        await db.notification_logs.insert_one({
            "type": "audit_mission_assigned",
            "user_id": auditor_id,
            "mission_id": str(mission_data.get("_id", "")),
            "tokens_count": 1,
            "result": result,
            "created_at": datetime.utcnow()
        })
        
        return result

    async def send_audit_completed_notification(
        self,
        cooperative_id: str,
        audit_data: dict
    ) -> dict:
        """
        Notifier la coopérative qu'un audit a été complété sur une de ses parcelles
        """
        from bson import ObjectId
        
        # Récupérer le token de la coopérative
        coop = await db.users.find_one(
            {"_id": ObjectId(cooperative_id)},
            {"push_token": 1, "full_name": 1, "coop_name": 1}
        )
        
        if not coop or not coop.get("push_token"):
            return {"success": False, "error": "No push token"}
        
        recommendation = audit_data.get("recommendation", "unknown")
        if recommendation == "approved":
            title = "✅ Parcelle Approuvée"
            emoji = "✅"
        elif recommendation == "rejected":
            title = "❌ Parcelle Rejetée"
            emoji = "❌"
        else:
            title = "⚠️ Parcelle à Revoir"
            emoji = "⚠️"
        
        body = f"{emoji} {audit_data.get('parcel_location', 'Parcelle')}\nScore carbone: {audit_data.get('carbon_score', '-')}/10"
        
        data = {
            "type": "audit_completed",
            "audit_id": str(audit_data.get("_id", "")),
            "parcel_id": audit_data.get("parcel_id"),
            "recommendation": recommendation,
            "screen": "CoopDashboard"
        }
        
        return await self.send_push_notification(
            tokens=[coop["push_token"]],
            title=title,
            body=body,
            data=data,
            priority="normal",
            channel_id="audit_results"
        )

    async def notify_audit_completed(
        self,
        cooperative_id: str,
        parcel_location: str,
        recommendation: str,
        carbon_score: float,
        auditor_name: str
    ) -> dict:
        """
        Notifier la coopérative qu'un audit a été complété
        """
        from bson import ObjectId
        
        # Récupérer la coopérative
        coop = await db.users.find_one({"_id": ObjectId(cooperative_id)})
        if not coop or not coop.get("push_token"):
            logger.info(f"No push token for cooperative {cooperative_id}")
            return {"success": False, "error": "No push token"}
        
        # Construire le message selon la recommandation
        if recommendation == "approved":
            title = "✅ Audit Approuvé"
            emoji = "🎉"
        elif recommendation == "rejected":
            title = "❌ Audit Rejeté"
            emoji = "⚠️"
        else:
            title = "🔄 Audit À Revoir"
            emoji = "📋"
        
        body = f"{emoji} Parcelle \"{parcel_location}\" - Score carbone: {carbon_score}/10. Auditeur: {auditor_name}"
        
        data = {
            "type": "audit_result",
            "recommendation": recommendation,
            "carbon_score": carbon_score,
            "screen": "CoopDashboard"
        }
        
        result = await self.send_push_notification(
            tokens=[coop["push_token"]],
            title=title,
            body=body,
            data=data,
            priority="high" if recommendation == "rejected" else "normal",
            channel_id="audit_results"
        )
        
        # Log
        await db.push_notifications_log.insert_one({
            "type": "audit_completed",
            "cooperative_id": cooperative_id,
            "parcel_location": parcel_location,
            "recommendation": recommendation,
            "carbon_score": carbon_score,
            "result": result,
            "created_at": datetime.utcnow()
        })
        
        return result

    async def notify_new_badge_earned(
        self,
        auditor_id: str,
        badge: str,
        audits_completed: int
    ) -> dict:
        """
        Notifier un auditeur qu'il a obtenu un nouveau badge
        """
        from bson import ObjectId
        
        auditor = await db.users.find_one({"_id": ObjectId(auditor_id)})
        if not auditor or not auditor.get("push_token"):
            return {"success": False, "error": "No push token"}
        
        badge_names = {
            "starter": ("🌱 Débutant", "Félicitations pour votre premier audit!"),
            "bronze": ("🥉 Auditeur Bronze", "10 audits complétés! Continuez!"),
            "silver": ("🥈 Auditeur Argent", "50 audits! Vous êtes un expert!"),
            "gold": ("🥇 Auditeur Or", "100 audits! Performance exceptionnelle!")
        }
        
        badge_info = badge_names.get(badge, ("Badge", "Nouveau badge obtenu"))
        
        title = f"🏆 Nouveau Badge: {badge_info[0]}"
        body = f"{badge_info[1]} Total: {audits_completed} audits."
        
        return await self.send_push_notification(
            tokens=[auditor["push_token"]],
            title=title,
            body=body,
            data={"type": "badge_earned", "badge": badge, "screen": "AuditorDashboard"},
            priority="normal",
            channel_id="achievements"
        )

    async def send_new_message_notification(
        self,
        recipient_id: str,
        sender_name: str,
        message_preview: str,
        conversation_id: str,
        listing_title: str = None
    ) -> dict:
        """
        Envoyer une notification push pour un nouveau message dans la messagerie
        
        Args:
            recipient_id: ID du destinataire
            sender_name: Nom de l'expéditeur
            message_preview: Aperçu du message (premiers caractères)
            conversation_id: ID de la conversation
            listing_title: Titre de l'annonce liée (optionnel)
        """
        from bson import ObjectId
        
        # Récupérer le token du destinataire
        recipient = await db.users.find_one(
            {"_id": ObjectId(recipient_id)},
            {"push_token": 1, "full_name": 1}
        )
        
        if not recipient or not recipient.get("push_token"):
            logger.info(f"No push token for messaging recipient {recipient_id}")
            return {"success": False, "error": "No push token"}
        
        title = f"💬 {sender_name}"
        body = message_preview[:150]
        
        if listing_title:
            body = f"📦 {listing_title}\n{body}"
        
        data = {
            "type": "new_message",
            "conversation_id": conversation_id,
            "sender_name": sender_name,
            "screen": "Messaging",
            "params": {
                "conversationId": conversation_id
            }
        }
        
        result = await self.send_push_notification(
            tokens=[recipient["push_token"]],
            title=title,
            body=body,
            data=data,
            priority="high",
            channel_id="messages"
        )
        
        # Logger dans la base
        await db.push_notifications_log.insert_one({
            "type": "new_message",
            "recipient_id": recipient_id,
            "sender_name": sender_name,
            "conversation_id": conversation_id,
            "tokens_count": 1,
            "result": result,
            "created_at": datetime.utcnow()
        })
        
        logger.info(f"[Messaging] Push notification sent to {recipient_id} from {sender_name}")
        
        return result

    async def send_new_conversation_notification(
        self,
        seller_id: str,
        buyer_name: str,
        listing_title: str,
        conversation_id: str,
        initial_message: str
    ) -> dict:
        """
        Notifier un vendeur qu'un acheteur a initié une conversation
        """
        from bson import ObjectId
        
        seller = await db.users.find_one(
            {"_id": ObjectId(seller_id)},
            {"push_token": 1, "full_name": 1}
        )
        
        if not seller or not seller.get("push_token"):
            return {"success": False, "error": "No push token"}
        
        title = f"🆕 Nouveau contact: {buyer_name}"
        body = f"📦 {listing_title}\n\"{initial_message[:100]}...\""
        
        data = {
            "type": "new_conversation",
            "conversation_id": conversation_id,
            "buyer_name": buyer_name,
            "screen": "Messaging",
            "params": {
                "conversationId": conversation_id
            }
        }
        
        result = await self.send_push_notification(
            tokens=[seller["push_token"]],
            title=title,
            body=body,
            data=data,
            priority="high",
            channel_id="messages"
        )
        
        await db.push_notifications_log.insert_one({
            "type": "new_conversation",
            "seller_id": seller_id,
            "buyer_name": buyer_name,
            "conversation_id": conversation_id,
            "result": result,
            "created_at": datetime.utcnow()
        })
        
        return result


# Instance globale
push_service = PushNotificationService()