# WebSocket Routes - Points d'entrée WebSocket pour le dashboard temps réel

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException
from typing import Optional, List
import json
import logging
import jwt
import os
from datetime import datetime

from database import db
from services.websocket_manager import manager, WebSocketMessageTypes, send_alert_notification, send_stats_update
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')

async def verify_ws_token(token: str) -> dict:
    """Vérifier le token JWT pour WebSocket"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if not user_id:
            return None
        
        from bson import ObjectId
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return None
        
        return {
            "_id": str(user["_id"]),
            "user_type": user.get("user_type"),
            "full_name": user.get("full_name")
        }
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


@router.websocket("/ws/dashboard")
async def websocket_dashboard(
    websocket: WebSocket,
    token: str = Query(...),
    channels: str = Query(default="alerts,stats")
):
    """
    WebSocket pour le dashboard temps réel
    
    Channels disponibles:
    - alerts: Notifications d'alertes ICI
    - stats: Mises à jour statistiques
    - ssrte: Notifications visites SSRTE
    
    Messages entrants supportés:
    - {"type": "subscribe", "channel": "alerts"}
    - {"type": "unsubscribe", "channel": "stats"}
    - {"type": "ping"}
    """
    
    # Vérifier l'authentification
    user = await verify_ws_token(token)
    if not user:
        await websocket.close(code=4001, reason="Authentication failed")
        return
    
    # Vérifier les permissions (admin ou cooperative)
    if user.get('user_type') not in ['admin', 'super_admin', 'cooperative']:
        await websocket.close(code=4003, reason="Access denied")
        return
    
    # Parser les channels
    channel_list = [c.strip() for c in channels.split(',') if c.strip()]
    
    try:
        # Connecter
        await manager.connect(websocket, user["_id"], channel_list)
        
        # Envoyer les stats initiales
        initial_stats = await get_realtime_stats()
        await websocket.send_json({
            "type": "initial_data",
            "stats": initial_stats,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Écouter les messages
        while True:
            try:
                data = await websocket.receive_json()
                await handle_ws_message(websocket, user, data)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": WebSocketMessageTypes.ERROR,
                    "message": "Invalid JSON format"
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(f"WebSocket disconnected: {user['_id']}")


async def handle_ws_message(websocket: WebSocket, user: dict, data: dict):
    """Traiter un message WebSocket entrant"""
    
    msg_type = data.get("type")
    
    if msg_type == "ping":
        await websocket.send_json({
            "type": "pong",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    elif msg_type == "subscribe":
        channel = data.get("channel")
        if channel:
            if channel not in manager.channel_connections:
                manager.channel_connections[channel] = set()
            manager.channel_connections[channel].add(websocket)
            await websocket.send_json({
                "type": "subscribed",
                "channel": channel
            })
    
    elif msg_type == "unsubscribe":
        channel = data.get("channel")
        if channel and channel in manager.channel_connections:
            manager.channel_connections[channel].discard(websocket)
            await websocket.send_json({
                "type": "unsubscribed",
                "channel": channel
            })
    
    elif msg_type == "get_stats":
        stats = await get_realtime_stats()
        await websocket.send_json({
            "type": WebSocketMessageTypes.STATS_UPDATE,
            "data": stats,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    elif msg_type == "get_alerts":
        alerts = await get_recent_alerts()
        await websocket.send_json({
            "type": "alerts_list",
            "data": alerts,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    else:
        await websocket.send_json({
            "type": WebSocketMessageTypes.ERROR,
            "message": f"Unknown message type: {msg_type}"
        })


async def get_realtime_stats() -> dict:
    """Obtenir les statistiques en temps réel"""
    
    total_farmers = await db.users.count_documents({"user_type": "farmer"})
    total_coops = await db.users.count_documents({"user_type": "cooperative"})
    total_profiles = await db.ici_profiles.count_documents({})
    total_visits = await db.ssrte_visits.count_documents({})
    
    alerts_unresolved = await db.ici_alerts.count_documents({"resolved": False})
    alerts_critical = await db.ici_alerts.count_documents({"severity": "critical", "resolved": False})
    alerts_high = await db.ici_alerts.count_documents({"severity": "high", "resolved": False})
    alerts_new = await db.ici_alerts.count_documents({"status": "new"})
    
    # Distribution des risques
    risk_high = await db.ici_profiles.count_documents({"niveau_risque": "ÉLEVÉ"})
    risk_medium = await db.ici_profiles.count_documents({"niveau_risque": "MODÉRÉ"})
    risk_low = await db.ici_profiles.count_documents({"niveau_risque": "FAIBLE"})
    
    # Couverture SSRTE
    farmers_with_ssrte = await db.ici_profiles.count_documents({"ssrte_visite_effectuee": True})
    taux_ssrte = (farmers_with_ssrte / total_farmers * 100) if total_farmers > 0 else 0
    
    return {
        "overview": {
            "total_farmers": total_farmers,
            "total_cooperatives": total_coops,
            "total_ici_profiles": total_profiles,
            "total_ssrte_visits": total_visits
        },
        "alerts": {
            "unresolved": alerts_unresolved,
            "critical": alerts_critical,
            "high": alerts_high,
            "new": alerts_new
        },
        "risk_distribution": {
            "high": risk_high,
            "medium": risk_medium,
            "low": risk_low,
            "high_percentage": round(risk_high / total_profiles * 100, 1) if total_profiles > 0 else 0
        },
        "ssrte_coverage": {
            "visited": farmers_with_ssrte,
            "total": total_farmers,
            "percentage": round(taux_ssrte, 1)
        },
        "connections": manager.get_connection_count()
    }


async def get_recent_alerts(limit: int = 10) -> list:
    """Obtenir les alertes récentes"""
    
    alerts = await db.ici_alerts.find(
        {"resolved": False}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [
        {
            "id": str(a["_id"]),
            "type": a.get("type"),
            "severity": a.get("severity"),
            "message": a.get("message"),
            "farmer_id": a.get("farmer_id"),
            "status": a.get("status"),
            "created_at": a.get("created_at").isoformat() if a.get("created_at") else None
        }
        for a in alerts
    ]


# ============= API REST pour déclencher les notifications =============

@router.post("/api/ws/notify-alert")
async def notify_alert_via_ws(alert_data: dict, current_user: dict = Depends(get_current_user)):
    """API interne pour notifier une nouvelle alerte via WebSocket"""
    await send_alert_notification(alert_data)
    return {"status": "notified", "connections": manager.get_connection_count()}


@router.post("/api/ws/broadcast-stats")
async def broadcast_stats_via_ws(current_user: dict = Depends(get_current_user)):
    """API interne pour diffuser les stats via WebSocket"""
    stats = await get_realtime_stats()
    await send_stats_update(stats)
    return {"status": "broadcasted", "stats": stats}


@router.get("/api/ws/connections")
async def get_ws_connections(current_user: dict = Depends(get_current_user)):
    """Obtenir l'état des connexions WebSocket"""
    return manager.get_connection_count()
