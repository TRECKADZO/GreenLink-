# Agent Geolocation API - Suivi GPS temps réel des agents terrain
# Pour la carte de surveillance et dispatch rapide

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agents/geo", tags=["Agent Geolocation"])


# ============= SCHEMAS =============

class LocationUpdate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: Optional[float] = None  # Précision en mètres
    altitude: Optional[float] = None
    speed: Optional[float] = None  # Vitesse en m/s
    heading: Optional[float] = None  # Direction en degrés
    battery_level: Optional[int] = None  # Niveau batterie 0-100
    is_moving: Optional[bool] = False
    activity_type: Optional[str] = None  # "stationary", "walking", "driving"


class AgentLocation(BaseModel):
    agent_id: str
    agent_name: str
    agent_type: str  # "field_agent", "carbon_auditor", "ssrte_agent"
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    last_update: datetime
    is_online: bool = True
    battery_level: Optional[int] = None
    current_activity: Optional[str] = None
    cooperative_name: Optional[str] = None


# ============= ENDPOINTS =============

@router.post("/update")
async def update_location(
    location: LocationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Mettre à jour la position GPS de l'agent connecté.
    Appelé périodiquement par l'application mobile.
    """
    user_type = current_user.get("user_type", "")
    roles = current_user.get("roles", [])
    
    # Vérifier que c'est bien un agent terrain
    valid_types = ["field_agent", "carbon_auditor", "ssrte_agent"]
    is_valid = user_type in valid_types or any(r in valid_types for r in roles)
    
    if not is_valid and user_type not in ["admin", "super_admin", "cooperative"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les agents terrain peuvent envoyer leur position"
        )
    
    # Préparer le document de localisation
    location_doc = {
        "agent_id": str(current_user["_id"]),
        "agent_name": current_user.get("full_name", "Agent"),
        "agent_type": user_type,
        "roles": roles,
        "cooperative_id": current_user.get("cooperative_id"),
        "latitude": location.latitude,
        "longitude": location.longitude,
        "accuracy": location.accuracy,
        "altitude": location.altitude,
        "speed": location.speed,
        "heading": location.heading,
        "battery_level": location.battery_level,
        "is_moving": location.is_moving,
        "activity_type": location.activity_type,
        "timestamp": datetime.now(timezone.utc),
        "is_online": True
    }
    
    # Upsert dans la collection des positions actuelles
    await db.agent_locations.update_one(
        {"agent_id": str(current_user["_id"])},
        {"$set": location_doc},
        upsert=True
    )
    
    # Ajouter à l'historique des positions
    await db.agent_location_history.insert_one({
        **location_doc,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Diffuser via WebSocket
    try:
        from services.websocket_manager import manager
        await manager.broadcast_to_channel("geo", {
            "type": "agent_location_update",
            "data": {
                "agent_id": str(current_user["_id"]),
                "agent_name": current_user.get("full_name"),
                "agent_type": user_type,
                "latitude": location.latitude,
                "longitude": location.longitude,
                "accuracy": location.accuracy,
                "battery_level": location.battery_level,
                "is_moving": location.is_moving,
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"[GEO] WebSocket broadcast failed: {e}")
    
    logger.info(f"[GEO] Location updated for agent: {current_user.get('full_name')} at ({location.latitude}, {location.longitude})")
    
    return {
        "success": True,
        "message": "Position mise à jour",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/agents", response_model=List[AgentLocation])
async def get_all_agent_locations(
    agent_type: Optional[str] = None,
    cooperative_id: Optional[str] = None,
    online_only: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """
    Récupérer les positions de tous les agents terrain.
    Filtrable par type d'agent et coopérative.
    """
    # Vérifier les permissions
    user_type = current_user.get("user_type", "")
    if user_type not in ["admin", "super_admin", "cooperative"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs et coopératives"
        )
    
    # Construire le filtre
    query = {}
    
    if agent_type:
        query["$or"] = [
            {"agent_type": agent_type},
            {"roles": agent_type}
        ]
    
    if cooperative_id:
        query["cooperative_id"] = cooperative_id
    elif user_type == "cooperative":
        # Une coopérative ne voit que ses propres agents
        query["cooperative_id"] = str(current_user["_id"])
    
    if online_only:
        # Considérer en ligne si mise à jour < 10 minutes
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
        query["timestamp"] = {"$gte": cutoff}
    
    # Récupérer les positions
    locations = await db.agent_locations.find(query).to_list(500)
    
    # Enrichir avec les infos de coopérative
    result = []
    for loc in locations:
        coop_name = None
        if loc.get("cooperative_id"):
            coop = await db.users.find_one(
                {"_id": ObjectId(loc["cooperative_id"])},
                {"company_name": 1, "full_name": 1}
            )
            if coop:
                coop_name = coop.get("company_name") or coop.get("full_name")
        
        # Vérifier si en ligne (< 10 min depuis dernière MAJ)
        is_online = True
        if loc.get("timestamp"):
            age = datetime.now(timezone.utc) - loc["timestamp"].replace(tzinfo=timezone.utc) if loc["timestamp"].tzinfo is None else datetime.now(timezone.utc) - loc["timestamp"]
            is_online = age.total_seconds() < 600  # 10 minutes
        
        result.append(AgentLocation(
            agent_id=loc["agent_id"],
            agent_name=loc.get("agent_name", "Agent"),
            agent_type=loc.get("agent_type", "field_agent"),
            latitude=loc["latitude"],
            longitude=loc["longitude"],
            accuracy=loc.get("accuracy"),
            last_update=loc.get("timestamp", datetime.now(timezone.utc)),
            is_online=is_online,
            battery_level=loc.get("battery_level"),
            current_activity=loc.get("activity_type"),
            cooperative_name=coop_name
        ))
    
    return result


@router.get("/agent/{agent_id}")
async def get_agent_location(
    agent_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer la position d'un agent spécifique"""
    location = await db.agent_locations.find_one({"agent_id": agent_id})
    
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Position de l'agent non trouvée"
        )
    
    return {
        "agent_id": location["agent_id"],
        "agent_name": location.get("agent_name"),
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "accuracy": location.get("accuracy"),
        "battery_level": location.get("battery_level"),
        "is_moving": location.get("is_moving"),
        "last_update": location.get("timestamp"),
        "activity_type": location.get("activity_type")
    }


@router.get("/agent/{agent_id}/history")
async def get_agent_location_history(
    agent_id: str,
    hours: int = 24,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer l'historique des positions d'un agent"""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    history = await db.agent_location_history.find({
        "agent_id": agent_id,
        "created_at": {"$gte": cutoff}
    }).sort("created_at", 1).to_list(1000)
    
    return {
        "agent_id": agent_id,
        "period_hours": hours,
        "points_count": len(history),
        "track": [
            {
                "latitude": h["latitude"],
                "longitude": h["longitude"],
                "timestamp": h.get("created_at"),
                "accuracy": h.get("accuracy"),
                "speed": h.get("speed")
            }
            for h in history
        ]
    }


@router.post("/offline")
async def mark_agent_offline(
    current_user: dict = Depends(get_current_user)
):
    """Marquer l'agent comme hors ligne (appelé à la déconnexion)"""
    await db.agent_locations.update_one(
        {"agent_id": str(current_user["_id"])},
        {"$set": {"is_online": False, "offline_at": datetime.now(timezone.utc)}}
    )
    
    # Diffuser via WebSocket
    try:
        from services.websocket_manager import manager
        await manager.broadcast_to_channel("geo", {
            "type": "agent_offline",
            "data": {
                "agent_id": str(current_user["_id"]),
                "agent_name": current_user.get("full_name")
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"[GEO] WebSocket broadcast failed: {e}")
    
    return {"success": True, "message": "Agent marqué hors ligne"}


@router.get("/stats")
async def get_geolocation_stats(
    current_user: dict = Depends(get_current_user)
):
    """Statistiques de géolocalisation"""
    # Agents en ligne (mise à jour < 10 min)
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
    
    online_count = await db.agent_locations.count_documents({
        "timestamp": {"$gte": cutoff}
    })
    
    total_agents = await db.agent_locations.count_documents({})
    
    # Par type d'agent
    by_type = await db.agent_locations.aggregate([
        {"$match": {"timestamp": {"$gte": cutoff}}},
        {"$group": {
            "_id": "$agent_type",
            "count": {"$sum": 1}
        }}
    ]).to_list(10)
    
    return {
        "total_tracked": total_agents,
        "online_now": online_count,
        "offline": total_agents - online_count,
        "by_type": {item["_id"]: item["count"] for item in by_type},
        "last_updated": datetime.now(timezone.utc).isoformat()
    }


# ============= BATCH & TRAJECTOIRES =============

class BatchLocationRequest(BaseModel):
    locations: List[LocationUpdate]


@router.post("/batch")
async def batch_location_update(
    request: BatchLocationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Envoyer plusieurs positions en batch (synchronisation hors ligne).
    Utilisé par l'app mobile pour sync les positions cachées.
    """
    if not request.locations:
        return {"success": True, "synced": 0}
    
    synced_count = 0
    
    for location in request.locations:
        try:
            # Ajouter à l'historique
            await db.agent_location_history.insert_one({
                "agent_id": str(current_user["_id"]),
                "agent_name": current_user.get("full_name"),
                "agent_type": current_user.get("user_type"),
                "latitude": location.latitude,
                "longitude": location.longitude,
                "accuracy": location.accuracy,
                "altitude": location.altitude,
                "speed": location.speed,
                "heading": location.heading,
                "battery_level": location.battery_level,
                "is_moving": location.is_moving,
                "activity_type": location.activity_type,
                "created_at": datetime.now(timezone.utc)
            })
            synced_count += 1
        except Exception as e:
            logger.error(f"[GEO] Batch sync error: {e}")
    
    # Mettre à jour la dernière position
    if request.locations:
        last_loc = request.locations[-1]
        await db.agent_locations.update_one(
            {"agent_id": str(current_user["_id"])},
            {"$set": {
                "latitude": last_loc.latitude,
                "longitude": last_loc.longitude,
                "accuracy": last_loc.accuracy,
                "timestamp": datetime.now(timezone.utc),
                "is_online": True
            }},
            upsert=True
        )
    
    logger.info(f"[GEO] Batch sync: {synced_count}/{len(request.locations)} positions for {current_user.get('full_name')}")
    
    return {
        "success": True,
        "synced": synced_count,
        "total": len(request.locations)
    }


@router.get("/trajectories")
async def get_all_trajectories(
    hours: int = 24,
    agent_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Récupérer les trajectoires de tous les agents pour affichage sur carte.
    Retourne les polylines pour chaque agent.
    """
    user_type = current_user.get("user_type", "")
    if user_type not in ["admin", "super_admin", "cooperative"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs et coopératives"
        )
    
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    # Filtrer par type si spécifié
    match_query = {"created_at": {"$gte": cutoff}}
    if agent_type:
        match_query["agent_type"] = agent_type
    
    # Si coopérative, limiter à ses agents
    if user_type == "cooperative":
        match_query["cooperative_id"] = str(current_user["_id"])
    
    # Agréger par agent
    pipeline = [
        {"$match": match_query},
        {"$sort": {"created_at": 1}},
        {"$group": {
            "_id": "$agent_id",
            "agent_name": {"$first": "$agent_name"},
            "agent_type": {"$first": "$agent_type"},
            "points": {"$push": {
                "lat": "$latitude",
                "lng": "$longitude",
                "time": "$created_at",
                "speed": "$speed"
            }},
            "total_points": {"$sum": 1},
            "start_time": {"$first": "$created_at"},
            "end_time": {"$last": "$created_at"}
        }}
    ]
    
    trajectories = await db.agent_location_history.aggregate(pipeline).to_list(100)
    
    result = []
    for traj in trajectories:
        # Calculer la distance totale
        points = traj.get("points", [])
        total_distance = 0
        for i in range(1, len(points)):
            p1, p2 = points[i-1], points[i]
            total_distance += haversine_distance(p1["lat"], p1["lng"], p2["lat"], p2["lng"])
        
        result.append({
            "agent_id": traj["_id"],
            "agent_name": traj.get("agent_name"),
            "agent_type": traj.get("agent_type"),
            "polyline": [[p["lat"], p["lng"]] for p in points],
            "points_count": traj.get("total_points", 0),
            "start_time": traj.get("start_time"),
            "end_time": traj.get("end_time"),
            "total_distance_km": round(total_distance, 2)
        })
    
    return {
        "period_hours": hours,
        "trajectories": result,
        "total_agents": len(result)
    }


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculer la distance entre deux points GPS en km"""
    from math import radians, cos, sin, asin, sqrt
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371  # Rayon de la Terre en km
    
    return c * r


# ============= ALERTES DE PROXIMITÉ =============

class ProximityAlertRequest(BaseModel):
    latitude: float
    longitude: float
    radius_km: float = 5.0  # Rayon en km
    alert_type: str = "ssrte_case"  # Type d'alerte à chercher


@router.post("/proximity/check")
async def check_proximity_alerts(
    request: ProximityAlertRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Vérifier s'il y a des agents ou cas critiques à proximité.
    Utilisé pour dispatcher rapidement en cas d'urgence.
    """
    nearby_agents = []
    nearby_cases = []
    
    # Chercher les agents en ligne à proximité
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
    agents = await db.agent_locations.find({
        "timestamp": {"$gte": cutoff}
    }).to_list(500)
    
    for agent in agents:
        dist = haversine_distance(
            request.latitude, request.longitude,
            agent["latitude"], agent["longitude"]
        )
        if dist <= request.radius_km:
            nearby_agents.append({
                "agent_id": agent["agent_id"],
                "agent_name": agent.get("agent_name"),
                "agent_type": agent.get("agent_type"),
                "distance_km": round(dist, 2),
                "latitude": agent["latitude"],
                "longitude": agent["longitude"],
                "battery_level": agent.get("battery_level")
            })
    
    # Chercher les cas SSRTE critiques à proximité
    if request.alert_type == "ssrte_case":
        cases = await db.ssrte_cases.find({
            "status": {"$in": ["identified", "in_progress"]},
            "severity_score": {"$gte": 7}
        }).to_list(100)
        
        # Récupérer les positions des membres
        for case in cases:
            member = await db.coop_members.find_one({"_id": ObjectId(case.get("member_id"))})
            if member and member.get("gps_latitude") and member.get("gps_longitude"):
                dist = haversine_distance(
                    request.latitude, request.longitude,
                    member["gps_latitude"], member["gps_longitude"]
                )
                if dist <= request.radius_km:
                    nearby_cases.append({
                        "case_id": str(case["_id"]),
                        "child_name": case.get("child_name"),
                        "severity_score": case.get("severity_score"),
                        "status": case.get("status"),
                        "distance_km": round(dist, 2),
                        "member_name": member.get("full_name")
                    })
    
    # Trier par distance
    nearby_agents.sort(key=lambda x: x["distance_km"])
    nearby_cases.sort(key=lambda x: x["distance_km"])
    
    return {
        "center": {"latitude": request.latitude, "longitude": request.longitude},
        "radius_km": request.radius_km,
        "nearby_agents": nearby_agents[:20],  # Max 20
        "nearby_cases": nearby_cases[:10],    # Max 10
        "agents_count": len(nearby_agents),
        "cases_count": len(nearby_cases)
    }


@router.post("/proximity/alert")
async def send_proximity_alert(
    latitude: float,
    longitude: float,
    radius_km: float = 10.0,
    message: str = "Alerte de proximité",
    current_user: dict = Depends(get_current_user)
):
    """
    Envoyer une alerte push à tous les agents dans un rayon donné.
    Utilisé pour mobilisation rapide en cas d'urgence.
    """
    user_type = current_user.get("user_type", "")
    if user_type not in ["admin", "super_admin", "cooperative"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs et coopératives"
        )
    
    # Trouver les agents à proximité
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
    agents = await db.agent_locations.find({
        "timestamp": {"$gte": cutoff}
    }).to_list(500)
    
    target_agent_ids = []
    for agent in agents:
        dist = haversine_distance(latitude, longitude, agent["latitude"], agent["longitude"])
        if dist <= radius_km:
            target_agent_ids.append(agent["agent_id"])
    
    if not target_agent_ids:
        return {
            "success": False,
            "message": "Aucun agent trouvé dans le rayon spécifié",
            "agents_notified": 0
        }
    
    # Envoyer les notifications push
    try:
        from services.push_notifications import push_service
        
        # Récupérer les tokens des agents ciblés
        tokens = await push_service.get_device_tokens(user_ids=target_agent_ids)
        
        if tokens:
            await push_service.send_push_notification(
                tokens=tokens,
                title="🚨 Alerte de Proximité",
                body=message,
                data={
                    "type": "proximity_alert",
                    "latitude": latitude,
                    "longitude": longitude,
                    "radius_km": radius_km,
                    "sender": current_user.get("full_name")
                },
                priority="high"
            )
    except Exception as e:
        logger.error(f"[GEO] Proximity alert push failed: {e}")
    
    # Diffuser via WebSocket
    try:
        from services.websocket_manager import manager
        await manager.broadcast_to_channel("alerts", {
            "type": "proximity_alert",
            "data": {
                "latitude": latitude,
                "longitude": longitude,
                "radius_km": radius_km,
                "message": message,
                "sender": current_user.get("full_name"),
                "agents_notified": len(target_agent_ids)
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"[GEO] Proximity alert WebSocket failed: {e}")
    
    logger.info(f"[GEO] Proximity alert sent to {len(target_agent_ids)} agents by {current_user.get('full_name')}")
    
    return {
        "success": True,
        "message": "Alerte envoyée",
        "agents_notified": len(target_agent_ids),
        "agent_ids": target_agent_ids
    }

