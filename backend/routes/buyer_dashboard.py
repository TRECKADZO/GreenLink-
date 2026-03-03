"""
Buyer Dashboard API - Tableau de bord Acheteur
Historique des devis, favoris, alertes personnalisées
"""
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from bson import ObjectId
from database import db
from routes.auth import get_current_user
import uuid

router = APIRouter(prefix="/api/buyer", tags=["buyer-dashboard"])

# ============= MODELS =============

class BuyerAlert(BaseModel):
    """Alerte personnalisée pour nouveaux produits"""
    name: str = Field(..., description="Nom de l'alerte")
    crop_types: List[str] = Field(default=[])
    min_quantity_kg: Optional[float] = None
    max_price_per_kg: Optional[float] = None
    certifications_required: List[str] = Field(default=[])
    grades: List[str] = Field(default=[])
    departments: List[str] = Field(default=[])
    eudr_required: bool = False
    is_active: bool = True

class BuyerProfile(BaseModel):
    """Profil acheteur enrichi"""
    company_name: str
    company_type: str  # negociant, exportateur, transformateur, industriel
    contact_name: str
    contact_email: str
    contact_phone: str
    address: Optional[str] = None
    country: str = "CI"
    preferred_incoterms: List[str] = Field(default=[])
    preferred_certifications: List[str] = Field(default=[])
    annual_volume_target_kg: Optional[float] = None

# ============= BUYER PROFILE =============

@router.get("/profile")
async def get_buyer_profile(current_user: dict = Depends(get_current_user)):
    """Obtenir le profil acheteur"""
    profile = await db.buyer_profiles.find_one({"user_id": current_user["_id"]})
    if profile:
        profile["_id"] = str(profile["_id"])
    return profile or {}

@router.post("/profile")
async def create_or_update_profile(
    profile: BuyerProfile,
    current_user: dict = Depends(get_current_user)
):
    """Créer ou mettre à jour le profil acheteur"""
    profile_dict = profile.dict()
    profile_dict["user_id"] = current_user["_id"]
    profile_dict["updated_at"] = datetime.utcnow()
    
    existing = await db.buyer_profiles.find_one({"user_id": current_user["_id"]})
    if existing:
        await db.buyer_profiles.update_one(
            {"user_id": current_user["_id"]},
            {"$set": profile_dict}
        )
    else:
        profile_dict["created_at"] = datetime.utcnow()
        await db.buyer_profiles.insert_one(profile_dict)
    
    return {"message": "Profil mis à jour avec succès"}

# ============= DASHBOARD STATS =============

@router.get("/dashboard")
async def get_buyer_dashboard(current_user: dict = Depends(get_current_user)):
    """Tableau de bord acheteur avec statistiques"""
    user_id = current_user["_id"]
    
    # Quote requests stats
    total_quotes = await db.quote_requests.count_documents({"requester_id": user_id})
    pending_quotes = await db.quote_requests.count_documents({"requester_id": user_id, "status": "pending"})
    quoted_requests = await db.quote_requests.count_documents({"requester_id": user_id, "status": "quoted"})
    
    # Calculate total requested volume
    volume_pipeline = [
        {"$match": {"requester_id": user_id}},
        {"$group": {
            "_id": None,
            "total_volume": {"$sum": "$quantity_requested_kg"},
            "total_estimated_value": {"$sum": "$estimated_value"}
        }}
    ]
    volume_stats = await db.quote_requests.aggregate(volume_pipeline).to_list(1)
    volume = volume_stats[0] if volume_stats else {}
    
    # Favorites count
    favorites_count = await db.buyer_favorites.count_documents({"user_id": user_id})
    
    # Active alerts count
    alerts_count = await db.buyer_alerts.count_documents({"user_id": user_id, "is_active": True})
    
    # Recent quotes
    recent_quotes = await db.quote_requests.find(
        {"requester_id": user_id}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for quote in recent_quotes:
        quote["_id"] = str(quote["_id"])
    
    # Unread notifications
    unread_notifications = await db.notifications.count_documents({
        "user_id": user_id,
        "is_read": False,
        "type": {"$in": ["quote_response", "new_listing_alert"]}
    })
    
    # Market overview
    active_listings = await db.harvest_listings.count_documents({"status": "active"})
    
    return {
        "stats": {
            "total_quote_requests": total_quotes,
            "pending_quotes": pending_quotes,
            "quotes_received": quoted_requests,
            "total_volume_requested_kg": volume.get("total_volume", 0),
            "total_estimated_value": volume.get("total_estimated_value", 0),
            "favorites_count": favorites_count,
            "active_alerts": alerts_count,
            "unread_notifications": unread_notifications
        },
        "market": {
            "active_listings": active_listings
        },
        "recent_quotes": recent_quotes
    }

# ============= QUOTE HISTORY =============

@router.get("/quotes")
async def get_quote_history(
    status: Optional[str] = None,
    crop_type: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Historique des demandes de devis"""
    query = {"requester_id": current_user["_id"]}
    
    if status:
        query["status"] = status
    if crop_type:
        query["crop_type"] = crop_type
    
    quotes = await db.quote_requests.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Enrich with listing info
    for quote in quotes:
        quote["_id"] = str(quote["_id"])
        listing = await db.harvest_listings.find_one({"listing_id": quote["listing_id"]})
        if listing:
            quote["listing_details"] = {
                "crop_type": listing["crop_type"],
                "grade": listing["grade"],
                "variety": listing.get("variety"),
                "certifications": listing.get("certifications", []),
                "seller_name": listing["seller_name"],
                "current_price": listing["price_per_kg"],
                "available_quantity": listing["quantity_kg"],
                "status": listing["status"]
            }
    
    return quotes

@router.get("/quotes/{quote_id}")
async def get_quote_detail(quote_id: str, current_user: dict = Depends(get_current_user)):
    """Détail d'une demande de devis"""
    quote = await db.quote_requests.find_one({
        "quote_id": quote_id,
        "requester_id": current_user["_id"]
    })
    
    if not quote:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    quote["_id"] = str(quote["_id"])
    
    # Get full listing info
    listing = await db.harvest_listings.find_one({"listing_id": quote["listing_id"]})
    if listing:
        listing["_id"] = str(listing["_id"])
        quote["listing"] = listing
    
    return quote

# ============= FAVORITES =============

@router.post("/favorites/{listing_id}")
async def add_to_favorites(listing_id: str, current_user: dict = Depends(get_current_user)):
    """Ajouter une annonce aux favoris"""
    # Check if listing exists
    listing = await db.harvest_listings.find_one({"listing_id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    # Check if already favorited
    existing = await db.buyer_favorites.find_one({
        "user_id": current_user["_id"],
        "listing_id": listing_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Déjà dans vos favoris")
    
    await db.buyer_favorites.insert_one({
        "user_id": current_user["_id"],
        "listing_id": listing_id,
        "crop_type": listing["crop_type"],
        "seller_name": listing["seller_name"],
        "price_per_kg": listing["price_per_kg"],
        "added_at": datetime.utcnow()
    })
    
    return {"message": "Ajouté aux favoris"}

@router.delete("/favorites/{listing_id}")
async def remove_from_favorites(listing_id: str, current_user: dict = Depends(get_current_user)):
    """Retirer une annonce des favoris"""
    result = await db.buyer_favorites.delete_one({
        "user_id": current_user["_id"],
        "listing_id": listing_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favori non trouvé")
    
    return {"message": "Retiré des favoris"}

@router.get("/favorites")
async def get_favorites(current_user: dict = Depends(get_current_user)):
    """Liste des favoris avec détails actualisés"""
    favorites = await db.buyer_favorites.find(
        {"user_id": current_user["_id"]}
    ).sort("added_at", -1).to_list(100)
    
    result = []
    for fav in favorites:
        fav["_id"] = str(fav["_id"])
        # Get current listing info
        listing = await db.harvest_listings.find_one({"listing_id": fav["listing_id"]})
        if listing:
            listing["_id"] = str(listing["_id"])
            fav["listing"] = listing
            fav["price_changed"] = listing["price_per_kg"] != fav.get("price_per_kg")
            fav["is_available"] = listing["status"] == "active"
        else:
            fav["is_available"] = False
        result.append(fav)
    
    return result

# ============= ALERTS =============

@router.post("/alerts")
async def create_alert(
    alert: BuyerAlert,
    current_user: dict = Depends(get_current_user)
):
    """Créer une alerte pour nouveaux produits"""
    alert_dict = alert.dict()
    alert_dict["alert_id"] = f"ALT-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    alert_dict["user_id"] = current_user["_id"]
    alert_dict["created_at"] = datetime.utcnow()
    alert_dict["last_triggered"] = None
    alert_dict["trigger_count"] = 0
    
    result = await db.buyer_alerts.insert_one(alert_dict)
    alert_dict["_id"] = str(result.inserted_id)
    
    return {"message": "Alerte créée avec succès", "alert": alert_dict}

@router.get("/alerts")
async def get_alerts(current_user: dict = Depends(get_current_user)):
    """Liste des alertes"""
    alerts = await db.buyer_alerts.find(
        {"user_id": current_user["_id"]}
    ).sort("created_at", -1).to_list(50)
    
    return [{**a, "_id": str(a["_id"])} for a in alerts]

@router.put("/alerts/{alert_id}")
async def update_alert(
    alert_id: str,
    alert: BuyerAlert,
    current_user: dict = Depends(get_current_user)
):
    """Mettre à jour une alerte"""
    existing = await db.buyer_alerts.find_one({
        "alert_id": alert_id,
        "user_id": current_user["_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")
    
    await db.buyer_alerts.update_one(
        {"alert_id": alert_id},
        {"$set": {**alert.dict(), "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Alerte mise à jour"}

@router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    """Supprimer une alerte"""
    result = await db.buyer_alerts.delete_one({
        "alert_id": alert_id,
        "user_id": current_user["_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")
    
    return {"message": "Alerte supprimée"}

@router.put("/alerts/{alert_id}/toggle")
async def toggle_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    """Activer/désactiver une alerte"""
    alert = await db.buyer_alerts.find_one({
        "alert_id": alert_id,
        "user_id": current_user["_id"]
    })
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")
    
    new_status = not alert.get("is_active", True)
    await db.buyer_alerts.update_one(
        {"alert_id": alert_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {"message": f"Alerte {'activée' if new_status else 'désactivée'}", "is_active": new_status}

# ============= MATCHING LISTINGS =============

@router.get("/matching-listings")
async def get_matching_listings(current_user: dict = Depends(get_current_user)):
    """Annonces correspondant aux critères des alertes actives"""
    alerts = await db.buyer_alerts.find({
        "user_id": current_user["_id"],
        "is_active": True
    }).to_list(50)
    
    if not alerts:
        return {"matches": [], "message": "Aucune alerte active"}
    
    all_matches = []
    
    for alert in alerts:
        query = {"status": "active"}
        
        if alert.get("crop_types"):
            query["crop_type"] = {"$in": alert["crop_types"]}
        if alert.get("min_quantity_kg"):
            query["quantity_kg"] = {"$gte": alert["min_quantity_kg"]}
        if alert.get("max_price_per_kg"):
            query["price_per_kg"] = {"$lte": alert["max_price_per_kg"]}
        if alert.get("certifications_required"):
            query["certifications"] = {"$all": alert["certifications_required"]}
        if alert.get("grades"):
            query["grade"] = {"$in": alert["grades"]}
        if alert.get("departments"):
            query["department"] = {"$in": alert["departments"]}
        if alert.get("eudr_required"):
            query["eudr_compliant"] = True
        
        matches = await db.harvest_listings.find(query).limit(10).to_list(10)
        
        for match in matches:
            match["_id"] = str(match["_id"])
            match["matched_alert"] = {
                "alert_id": alert["alert_id"],
                "name": alert["name"]
            }
            all_matches.append(match)
    
    # Remove duplicates by listing_id
    seen = set()
    unique_matches = []
    for m in all_matches:
        if m["listing_id"] not in seen:
            seen.add(m["listing_id"])
            unique_matches.append(m)
    
    return {"matches": unique_matches[:20], "total_alerts": len(alerts)}

# ============= NOTIFICATIONS =============

@router.get("/notifications")
async def get_buyer_notifications(
    unread_only: bool = False,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Notifications acheteur (réponses devis, alertes)"""
    query = {
        "user_id": current_user["_id"],
        "type": {"$in": ["quote_response", "new_listing_alert", "price_alert", "favorite_update"]}
    }
    
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [{**n, "_id": str(n["_id"])} for n in notifications]

@router.put("/notifications/mark-read")
async def mark_notifications_read(
    notification_ids: List[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Marquer les notifications comme lues"""
    query = {"user_id": current_user["_id"]}
    
    if notification_ids:
        query["_id"] = {"$in": [ObjectId(nid) for nid in notification_ids]}
    
    result = await db.notifications.update_many(query, {"$set": {"is_read": True}})
    
    return {"message": f"{result.modified_count} notification(s) marquée(s) comme lue(s)"}

# ============= MARKET INSIGHTS =============

@router.get("/market-insights")
async def get_market_insights(current_user: dict = Depends(get_current_user)):
    """Aperçu du marché pour l'acheteur"""
    # Price trends by crop
    price_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {
            "_id": "$crop_type",
            "avg_price": {"$avg": "$price_per_kg"},
            "min_price": {"$min": "$price_per_kg"},
            "max_price": {"$max": "$price_per_kg"},
            "total_volume": {"$sum": "$quantity_kg"},
            "listings_count": {"$sum": 1}
        }}
    ]
    price_stats = await db.harvest_listings.aggregate(price_pipeline).to_list(10)
    
    # Top certifications
    cert_pipeline = [
        {"$match": {"status": "active"}},
        {"$unwind": "$certifications"},
        {"$group": {
            "_id": "$certifications",
            "count": {"$sum": 1},
            "total_volume": {"$sum": "$quantity_kg"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    cert_stats = await db.harvest_listings.aggregate(cert_pipeline).to_list(10)
    
    # Top regions
    region_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {
            "_id": "$department",
            "listings": {"$sum": 1},
            "volume": {"$sum": "$quantity_kg"},
            "avg_price": {"$avg": "$price_per_kg"}
        }},
        {"$sort": {"volume": -1}},
        {"$limit": 10}
    ]
    region_stats = await db.harvest_listings.aggregate(region_pipeline).to_list(10)
    
    # Recent new listings (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    new_listings = await db.harvest_listings.count_documents({
        "status": "active",
        "created_at": {"$gte": week_ago}
    })
    
    return {
        "price_by_crop": {s["_id"]: {**s, "_id": None} for s in price_stats},
        "top_certifications": cert_stats,
        "top_regions": region_stats,
        "new_listings_this_week": new_listings
    }
