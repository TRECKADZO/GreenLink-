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
