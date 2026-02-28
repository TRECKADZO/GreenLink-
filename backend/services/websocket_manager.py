# WebSocket Manager - Gestion des connexions temps réel
# Pour dashboard temps réel avec alertes et statistiques

import asyncio
import json
import logging
from typing import Dict, Set, Optional
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Gestionnaire de connexions WebSocket"""
    
    def __init__(self):
        # Connexions actives par user_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Connexions par channel (ex: "alerts", "stats", "ssrte")
        self.channel_connections: Dict[str, Set[WebSocket]] = {}
        # Mapping websocket -> user_id
        self.websocket_users: Dict[WebSocket, str] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str, channels: list = None):
        """Accepter une nouvelle connexion WebSocket"""
        await websocket.accept()
        
        # Ajouter aux connexions utilisateur
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        
        # Mapper websocket -> user
        self.websocket_users[websocket] = user_id
        
        # Ajouter aux channels
        if channels:
            for channel in channels:
                if channel not in self.channel_connections:
                    self.channel_connections[channel] = set()
                self.channel_connections[channel].add(websocket)
        
        logger.info(f"WebSocket connected: user={user_id}, channels={channels}")
        
        # Envoyer message de bienvenue
        await websocket.send_json({
            "type": "connection_established",
            "user_id": user_id,
            "channels": channels or [],
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def disconnect(self, websocket: WebSocket):
        """Fermer une connexion WebSocket"""
        user_id = self.websocket_users.get(websocket)
        
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        # Retirer des channels
        for channel, connections in self.channel_connections.items():
            connections.discard(websocket)
        
        # Nettoyer le mapping
        if websocket in self.websocket_users:
            del self.websocket_users[websocket]
        
        logger.info(f"WebSocket disconnected: user={user_id}")
    
    async def send_to_user(self, user_id: str, message: dict):
        """Envoyer un message à un utilisateur spécifique"""
        if user_id in self.active_connections:
            disconnected = set()
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to user {user_id}: {e}")
                    disconnected.add(websocket)
            
            # Nettoyer les connexions mortes
            for ws in disconnected:
                self.disconnect(ws)
    
    async def broadcast_to_channel(self, channel: str, message: dict):
        """Diffuser un message à tous les abonnés d'un channel"""
        if channel in self.channel_connections:
            disconnected = set()
            for websocket in self.channel_connections[channel]:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to channel {channel}: {e}")
                    disconnected.add(websocket)
            
            # Nettoyer les connexions mortes
            for ws in disconnected:
                self.disconnect(ws)
    
    async def broadcast_all(self, message: dict):
        """Diffuser un message à toutes les connexions"""
        disconnected = set()
        for connections in self.active_connections.values():
            for websocket in connections:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting: {e}")
                    disconnected.add(websocket)
        
        for ws in disconnected:
            self.disconnect(ws)
    
    def get_connection_count(self) -> dict:
        """Obtenir les statistiques de connexion"""
        return {
            "total_users": len(self.active_connections),
            "total_connections": sum(len(c) for c in self.active_connections.values()),
            "channels": {
                channel: len(connections) 
                for channel, connections in self.channel_connections.items()
            }
        }


# Instance globale du gestionnaire
manager = ConnectionManager()


# ============= TYPES DE MESSAGES =============

class WebSocketMessageTypes:
    """Types de messages WebSocket"""
    
    # Alertes
    NEW_ALERT = "new_alert"
    ALERT_UPDATED = "alert_updated"
    ALERT_RESOLVED = "alert_resolved"
    
    # Statistiques
    STATS_UPDATE = "stats_update"
    METRICS_UPDATE = "metrics_update"
    
    # SSRTE
    NEW_VISIT = "new_ssrte_visit"
    VISIT_SYNCED = "visit_synced"
    
    # Système
    CONNECTION_ESTABLISHED = "connection_established"
    HEARTBEAT = "heartbeat"
    ERROR = "error"


# ============= FONCTIONS D'ENVOI =============

async def send_alert_notification(alert_data: dict, user_ids: list = None):
    """Envoyer une notification d'alerte"""
    message = {
        "type": WebSocketMessageTypes.NEW_ALERT,
        "data": alert_data,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if user_ids:
        for user_id in user_ids:
            await manager.send_to_user(user_id, message)
    else:
        await manager.broadcast_to_channel("alerts", message)


async def send_stats_update(stats_data: dict):
    """Envoyer une mise à jour des statistiques"""
    message = {
        "type": WebSocketMessageTypes.STATS_UPDATE,
        "data": stats_data,
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast_to_channel("stats", message)


async def send_ssrte_visit_notification(visit_data: dict):
    """Envoyer une notification de nouvelle visite SSRTE"""
    message = {
        "type": WebSocketMessageTypes.NEW_VISIT,
        "data": visit_data,
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast_to_channel("ssrte", message)


# ============= BACKGROUND TASKS =============

async def heartbeat_task():
    """Tâche de heartbeat pour garder les connexions actives"""
    while True:
        try:
            await asyncio.sleep(30)  # Toutes les 30 secondes
            message = {
                "type": WebSocketMessageTypes.HEARTBEAT,
                "timestamp": datetime.utcnow().isoformat(),
                "connections": manager.get_connection_count()
            }
            await manager.broadcast_all(message)
        except Exception as e:
            logger.error(f"Heartbeat error: {e}")


async def stats_broadcast_task(db):
    """Tâche de diffusion périodique des statistiques"""
    while True:
        try:
            await asyncio.sleep(60)  # Toutes les minutes
            
            # Calculer les stats
            total_alerts = await db.ici_alerts.count_documents({"resolved": False})
            critical_alerts = await db.ici_alerts.count_documents({"severity": "critical", "resolved": False})
            total_visits = await db.ssrte_visits.count_documents({})
            
            stats = {
                "alerts_unresolved": total_alerts,
                "alerts_critical": critical_alerts,
                "ssrte_visits_total": total_visits,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            await send_stats_update(stats)
            
        except Exception as e:
            logger.error(f"Stats broadcast error: {e}")
