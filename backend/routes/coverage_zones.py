# Zones de couverture des coopératives - Polygones géographiques
# Pour la visualisation des territoires d'intervention sur la carte

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/zones", tags=["Coverage Zones"])


# ============= SCHEMAS =============

class ZoneCoordinate(BaseModel):
    lat: float
    lng: float

class CoverageZone(BaseModel):
    name: str
    cooperative_id: Optional[str] = None
    cooperative_name: Optional[str] = None
    region: str
    department: Optional[str] = None
    color: str = "#10b981"
    coordinates: List[ZoneCoordinate]
    area_km2: Optional[float] = None
    farmers_count: Optional[int] = 0
    agents_count: Optional[int] = 0

class CreateZoneRequest(BaseModel):
    name: str
    region: str
    department: Optional[str] = None
    color: Optional[str] = "#10b981"
    coordinates: List[ZoneCoordinate]


# Zones prédéfinies de Côte d'Ivoire (Régions cacaoyères principales)
IVORY_COAST_ZONES = [
    {
        "name": "Zone Gagnoa",
        "region": "Gôh",
        "department": "Gagnoa",
        "color": "#10b981",  # Emerald
        "coordinates": [
            {"lat": 6.35, "lng": -6.15},
            {"lat": 6.35, "lng": -5.75},
            {"lat": 6.00, "lng": -5.75},
            {"lat": 5.90, "lng": -5.95},
            {"lat": 6.00, "lng": -6.15},
        ]
    },
    {
        "name": "Zone Daloa",
        "region": "Haut-Sassandra",
        "department": "Daloa",
        "color": "#3b82f6",  # Blue
        "coordinates": [
            {"lat": 7.10, "lng": -6.70},
            {"lat": 7.10, "lng": -6.20},
            {"lat": 6.65, "lng": -6.20},
            {"lat": 6.65, "lng": -6.70},
        ]
    },
    {
        "name": "Zone Soubré",
        "region": "Nawa",
        "department": "Soubré",
        "color": "#f59e0b",  # Amber
        "coordinates": [
            {"lat": 6.00, "lng": -6.80},
            {"lat": 6.00, "lng": -6.40},
            {"lat": 5.55, "lng": -6.40},
            {"lat": 5.55, "lng": -6.80},
        ]
    },
    {
        "name": "Zone San-Pédro",
        "region": "San-Pédro",
        "department": "San-Pédro",
        "color": "#ef4444",  # Red
        "coordinates": [
            {"lat": 5.00, "lng": -6.90},
            {"lat": 5.00, "lng": -6.40},
            {"lat": 4.50, "lng": -6.40},
            {"lat": 4.50, "lng": -6.90},
        ]
    },
    {
        "name": "Zone Divo",
        "region": "Lôh-Djiboua",
        "department": "Divo",
        "color": "#8b5cf6",  # Purple
        "coordinates": [
            {"lat": 6.05, "lng": -5.55},
            {"lat": 6.05, "lng": -5.15},
            {"lat": 5.60, "lng": -5.15},
            {"lat": 5.60, "lng": -5.55},
        ]
    },
    {
        "name": "Zone Abengourou",
        "region": "Indénié-Djuablin",
        "department": "Abengourou",
        "color": "#06b6d4",  # Cyan
        "coordinates": [
            {"lat": 6.95, "lng": -3.70},
            {"lat": 6.95, "lng": -3.25},
            {"lat": 6.50, "lng": -3.25},
            {"lat": 6.50, "lng": -3.70},
        ]
    },
    {
        "name": "Zone Agboville",
        "region": "Agnéby-Tiassa",
        "department": "Agboville",
        "color": "#ec4899",  # Pink
        "coordinates": [
            {"lat": 6.10, "lng": -4.35},
            {"lat": 6.10, "lng": -3.95},
            {"lat": 5.75, "lng": -3.95},
            {"lat": 5.75, "lng": -4.35},
        ]
    },
    {
        "name": "Zone Bouaflé",
        "region": "Marahoué",
        "department": "Bouaflé",
        "color": "#14b8a6",  # Teal
        "coordinates": [
            {"lat": 7.10, "lng": -5.95},
            {"lat": 7.10, "lng": -5.55},
            {"lat": 6.70, "lng": -5.55},
            {"lat": 6.70, "lng": -5.95},
        ]
    },
    {
        "name": "Zone Issia",
        "region": "Haut-Sassandra",
        "department": "Issia",
        "color": "#f97316",  # Orange
        "coordinates": [
            {"lat": 6.70, "lng": -6.70},
            {"lat": 6.70, "lng": -6.30},
            {"lat": 6.35, "lng": -6.30},
            {"lat": 6.35, "lng": -6.70},
        ]
    },
    {
        "name": "Zone Duékoué",
        "region": "Guémon",
        "department": "Duékoué",
        "color": "#84cc16",  # Lime
        "coordinates": [
            {"lat": 6.95, "lng": -7.55},
            {"lat": 6.95, "lng": -7.15},
            {"lat": 6.55, "lng": -7.15},
            {"lat": 6.55, "lng": -7.55},
        ]
    }
]


# ============= ENDPOINTS =============

@router.get("/coverage")
async def get_coverage_zones(
    region: Optional[str] = None,
    cooperative_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Récupérer toutes les zones de couverture.
    Peut filtrer par région ou coopérative.
    """
    # Récupérer les zones depuis la base de données
    query = {}
    if region:
        query["region"] = region
    if cooperative_id:
        query["cooperative_id"] = cooperative_id
    
    db_zones = await db.coverage_zones.find(query).to_list(100)
    
    # Si aucune zone en base, retourner les zones par défaut
    if not db_zones:
        # Enrichir les zones par défaut avec les stats des coopératives
        zones = []
        cooperatives = await db.users.find({"user_type": "cooperative"}).to_list(100)
        
        for i, zone in enumerate(IVORY_COAST_ZONES):
            zone_data = {**zone}
            # Assigner une coopérative si disponible
            if i < len(cooperatives):
                coop = cooperatives[i]
                zone_data["cooperative_id"] = str(coop["_id"])
                zone_data["cooperative_name"] = coop.get("company_name") or coop.get("full_name")
                
                # Compter les membres et agents
                members_count = await db.coop_members.count_documents({"cooperative_id": str(coop["_id"])})
                agents_count = await db.users.count_documents({
                    "cooperative_id": str(coop["_id"]),
                    "user_type": {"$in": ["field_agent", "carbon_auditor", "ssrte_agent"]}
                })
                zone_data["farmers_count"] = members_count
                zone_data["agents_count"] = agents_count
            
            zones.append(zone_data)
        
        return {"zones": zones, "total": len(zones)}
    
    # Retourner les zones de la base
    zones = []
    for z in db_zones:
        zones.append({
            "id": str(z["_id"]),
            "name": z.get("name"),
            "region": z.get("region"),
            "department": z.get("department"),
            "color": z.get("color", "#10b981"),
            "coordinates": z.get("coordinates", []),
            "cooperative_id": z.get("cooperative_id"),
            "cooperative_name": z.get("cooperative_name"),
            "farmers_count": z.get("farmers_count", 0),
            "agents_count": z.get("agents_count", 0),
            "area_km2": z.get("area_km2")
        })
    
    return {"zones": zones, "total": len(zones)}


@router.post("/coverage")
async def create_coverage_zone(
    zone: CreateZoneRequest,
    current_user: dict = Depends(get_current_user)
):
    """Créer une nouvelle zone de couverture"""
    user_type = current_user.get("user_type", "")
    if user_type not in ["admin", "super_admin", "cooperative"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs et coopératives"
        )
    
    zone_doc = {
        "name": zone.name,
        "region": zone.region,
        "department": zone.department,
        "color": zone.color,
        "coordinates": [{"lat": c.lat, "lng": c.lng} for c in zone.coordinates],
        "created_by": str(current_user["_id"]),
        "created_at": datetime.now(timezone.utc)
    }
    
    # Si créé par une coopérative, lui assigner automatiquement
    if user_type == "cooperative":
        zone_doc["cooperative_id"] = str(current_user["_id"])
        zone_doc["cooperative_name"] = current_user.get("company_name") or current_user.get("full_name")
    
    result = await db.coverage_zones.insert_one(zone_doc)
    
    return {
        "success": True,
        "zone_id": str(result.inserted_id),
        "message": "Zone créée avec succès"
    }


@router.put("/coverage/{zone_id}/assign")
async def assign_zone_to_cooperative(
    zone_id: str,
    cooperative_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Assigner une zone à une coopérative"""
    user_type = current_user.get("user_type", "")
    if user_type not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs"
        )
    
    # Vérifier que la coopérative existe
    coop = await db.users.find_one({"_id": ObjectId(cooperative_id), "user_type": "cooperative"})
    if not coop:
        raise HTTPException(status_code=404, detail="Coopérative non trouvée")
    
    # Mettre à jour la zone
    result = await db.coverage_zones.update_one(
        {"_id": ObjectId(zone_id)},
        {"$set": {
            "cooperative_id": cooperative_id,
            "cooperative_name": coop.get("company_name") or coop.get("full_name"),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Zone non trouvée")
    
    return {"success": True, "message": "Zone assignée avec succès"}


@router.get("/coverage/stats")
async def get_coverage_stats(
    current_user: dict = Depends(get_current_user)
):
    """Statistiques globales de couverture"""
    zones_count = await db.coverage_zones.count_documents({})
    assigned_count = await db.coverage_zones.count_documents({"cooperative_id": {"$exists": True, "$ne": None}})
    
    # Stats par région
    regions_pipeline = [
        {"$group": {
            "_id": "$region",
            "count": {"$sum": 1},
            "farmers": {"$sum": "$farmers_count"},
            "agents": {"$sum": "$agents_count"}
        }}
    ]
    by_region = await db.coverage_zones.aggregate(regions_pipeline).to_list(50)
    
    return {
        "total_zones": zones_count if zones_count > 0 else len(IVORY_COAST_ZONES),
        "assigned_zones": assigned_count,
        "unassigned_zones": (zones_count if zones_count > 0 else len(IVORY_COAST_ZONES)) - assigned_count,
        "by_region": {r["_id"]: r for r in by_region} if by_region else {},
        "default_zones_count": len(IVORY_COAST_ZONES)
    }


@router.get("/regions")
async def get_ivory_coast_regions():
    """Liste des régions de Côte d'Ivoire pour référence"""
    regions = [
        {"name": "Gôh", "chef_lieu": "Gagnoa", "type": "cacaoyère"},
        {"name": "Haut-Sassandra", "chef_lieu": "Daloa", "type": "cacaoyère"},
        {"name": "Nawa", "chef_lieu": "Soubré", "type": "cacaoyère"},
        {"name": "San-Pédro", "chef_lieu": "San-Pédro", "type": "cacaoyère"},
        {"name": "Lôh-Djiboua", "chef_lieu": "Divo", "type": "cacaoyère"},
        {"name": "Indénié-Djuablin", "chef_lieu": "Abengourou", "type": "cacaoyère"},
        {"name": "Agnéby-Tiassa", "chef_lieu": "Agboville", "type": "cacaoyère"},
        {"name": "Marahoué", "chef_lieu": "Bouaflé", "type": "cacaoyère"},
        {"name": "Guémon", "chef_lieu": "Duékoué", "type": "cacaoyère"},
        {"name": "Cavally", "chef_lieu": "Guiglo", "type": "cacaoyère"},
        {"name": "Gbôklé", "chef_lieu": "Sassandra", "type": "cacaoyère"},
        {"name": "Tonkpi", "chef_lieu": "Man", "type": "cacaoyère"},
        {"name": "Mé", "chef_lieu": "Adzopé", "type": "cacaoyère"},
        {"name": "Sud-Comoé", "chef_lieu": "Aboisso", "type": "cacaoyère"},
        {"name": "Grands-Ponts", "chef_lieu": "Dabou", "type": "mixte"},
    ]
    return {"regions": regions, "total": len(regions)}
