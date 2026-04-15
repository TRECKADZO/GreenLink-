"""
Harvest Marketplace API - Marketplace des Récoltes
Permet aux producteurs/coopératives d'exposer leurs récoltes aux acheteurs (négociants, exportateurs)
Avec grades de qualité, certifications, et traçabilité complète
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from bson import ObjectId
from database import db
from routes.auth import get_current_user
import uuid

router = APIRouter(prefix="/api/harvest-marketplace", tags=["harvest-marketplace"])

# ============= MODELS =============

class HarvestListing(BaseModel):
    """Annonce de récolte sur le marketplace - Normes Internationales"""
    # === IDENTIFICATION ===
    crop_type: str = Field(..., description="Type: cacao, cafe, anacarde")
    variety: Optional[str] = Field(None, description="Variété: Forastero, Criollo, Trinitario (cacao), Robusta, Arabica (café)")
    
    # === QUANTITÉ & PRIX ===
    quantity_kg: float = Field(..., gt=0)
    price_per_kg: float = Field(..., gt=0)
    min_order_kg: Optional[float] = Field(50)
    currency: str = Field(default="XOF")
    incoterm: Optional[str] = Field(None, description="FOB, CIF, EXW, FCA")
    
    # === QUALITÉ - NORMES INTERNATIONALES ===
    # Cacao (ICCO Standards)
    grade: str = Field(..., description="Grade qualité selon normes internationales")
    bean_count: Optional[int] = Field(None, description="Grainage: fèves/100g (standard ICCO: 100 max)")
    moisture_rate: Optional[float] = Field(None, description="Taux d'humidité % (ICCO: max 7.5%)")
    defect_rate: Optional[float] = Field(None, description="Taux de défauts % (moisissures, ardoisées)")
    fat_content: Optional[float] = Field(None, description="Teneur en matière grasse %")
    fermentation_days: Optional[int] = Field(None, description="Jours de fermentation")
    drying_method: Optional[str] = Field(None, description="Méthode séchage: solaire, artificiel")
    
    # Café (ICO/SCA Standards)
    sca_score: Optional[float] = Field(None, description="Score SCA (0-100)")
    screen_size: Optional[str] = Field(None, description="Calibre: 14-18")
    processing_method: Optional[str] = Field(None, description="Lavé, naturel, honey")
    altitude: Optional[str] = Field(None, description="Altitude de culture (m)")
    
    # Anacarde (AFI Standards)
    kor: Optional[float] = Field(None, description="Kernel Output Ratio (lbs/80kg)")
    nut_count: Optional[str] = Field(None, description="Classification W180-W450")
    
    # === CERTIFICATIONS ===
    certifications: List[str] = Field(default=[])
    certification_documents: List[str] = Field(default=[], description="URLs des certificats")
    
    # === TRAÇABILITÉ ===
    origin_country: str = Field(default="CI", description="Code ISO pays")
    origin_region: str = Field(default="")
    origin_village: Optional[str] = Field(None)
    cooperative_id: Optional[str] = Field(None)
    producer_count: Optional[int] = Field(None, description="Nombre de producteurs")
    plot_ids: List[str] = Field(default=[], description="IDs des parcelles tracées")
    gps_coordinates: Optional[str] = Field(None)
    
    # === CONFORMITÉ RÉGLEMENTAIRE ===
    eudr_compliant: bool = Field(default=False, description="Conformité EUDR")
    eudr_reference: Optional[str] = Field(None, description="Référence due diligence EUDR")
    deforestation_free: bool = Field(default=False)
    child_labor_free: bool = Field(default=False, description="Certification ICI/SSRTE")
    
    # === LOGISTIQUE ===
    harvest_date: Optional[str] = Field(None)
    available_from: Optional[str] = Field(None)
    packaging: Optional[str] = Field(None, description="Sacs jute 60kg, big bags, etc.")
    storage_conditions: Optional[str] = Field(None)
    
    # === LOCALISATION ===
    location: str
    department: str
    warehouse_location: Optional[str] = Field(None)
    
    # === DESCRIPTION ===
    description: Optional[str] = None
    photos: List[str] = Field(default=[])
    lab_analysis_url: Optional[str] = Field(None, description="Rapport analyse laboratoire")
    
class QuoteRequest(BaseModel):
    """Demande de devis sur une annonce (comme RSE)"""
    listing_id: str
    company_name: str
    contact_name: str
    contact_email: str
    contact_phone: str
    quantity_requested_kg: float
    delivery_location: str
    delivery_date_preferred: Optional[str] = None
    incoterm_preferred: Optional[str] = Field(None, description="FOB, CIF, EXW, FCA")
    quality_requirements: Optional[str] = None
    certifications_required: List[str] = Field(default=[])
    additional_message: Optional[str] = None
    company_type: Optional[str] = Field(None, description="Négociant, Exportateur, Transformateur, Industriel")

# ============= CERTIFICATIONS =============
CERTIFICATIONS = [
    {"id": "fairtrade", "name": "Fairtrade", "icon": "🤝", "color": "#00B140"},
    {"id": "rainforest", "name": "Rainforest Alliance", "icon": "🌿", "color": "#6EB43F"},
    {"id": "utz", "name": "UTZ Certified", "icon": "✓", "color": "#F5A623"},
    {"id": "bio", "name": "Agriculture Biologique", "icon": "🌱", "color": "#7CB342"},
    {"id": "eudr", "name": "EUDR Compliant", "icon": "🇪🇺", "color": "#003399"},
    {"id": "organic", "name": "Organic", "icon": "🍃", "color": "#4CAF50"},
]

GRADES = {
    "cacao": [
        {"id": "grade_1", "name": "Grade 1 (Premium)", "description": "Fèves parfaites, <5% défauts", "color": "#FFD700"},
        {"id": "grade_2", "name": "Grade 2 (Standard)", "description": "Bonne qualité, <10% défauts", "color": "#C0C0C0"},
        {"id": "grade_3", "name": "Grade 3", "description": "Qualité acceptable", "color": "#CD7F32"},
    ],
    "cafe": [
        {"id": "specialty", "name": "Specialty (80+)", "description": "Score SCA >80", "color": "#FFD700"},
        {"id": "premium", "name": "Premium (75-79)", "description": "Score SCA 75-79", "color": "#C0C0C0"},
        {"id": "commercial", "name": "Commercial", "description": "Score SCA <75", "color": "#CD7F32"},
    ],
    "anacarde": [
        {"id": "w180", "name": "W180 (Premium)", "description": "180 noix/kg", "color": "#FFD700"},
        {"id": "w240", "name": "W240 (Standard)", "description": "240 noix/kg", "color": "#C0C0C0"},
        {"id": "w320", "name": "W320", "description": "320 noix/kg", "color": "#CD7F32"},
        {"id": "w450", "name": "W450", "description": "450 noix/kg", "color": "#8B4513"},
    ]
}

# ============= ENDPOINTS =============

@router.get("/certifications")
async def get_certifications():
    """Liste des certifications disponibles"""
    return CERTIFICATIONS

@router.get("/grades/{crop_type}")
async def get_grades(crop_type: str):
    """Liste des grades par type de culture"""
    if crop_type not in GRADES:
        raise HTTPException(status_code=400, detail="Type de culture invalide")
    return GRADES[crop_type]

@router.post("/listings")
async def create_listing(
    listing: HarvestListing,
    current_user: dict = Depends(get_current_user)
):
    """Créer une annonce de récolte"""
    user_type = current_user.get("user_type")
    if user_type not in ["producteur", "cooperative", "admin"]:
        raise HTTPException(status_code=403, detail="Seuls les producteurs et coopératives peuvent créer des annonces")
    
    listing_dict = listing.dict()
    listing_dict["listing_id"] = f"HRV-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    listing_dict["seller_id"] = current_user["_id"]
    listing_dict["seller_name"] = current_user.get("full_name") or current_user.get("cooperative_name", "")
    listing_dict["seller_type"] = user_type
    listing_dict["status"] = "active"
    listing_dict["views_count"] = 0
    listing_dict["offers_count"] = 0
    listing_dict["created_at"] = datetime.utcnow()
    listing_dict["updated_at"] = datetime.utcnow()
    listing_dict["expires_at"] = datetime.utcnow() + timedelta(days=30)
    
    result = await db.harvest_listings.insert_one(listing_dict)
    listing_dict["_id"] = str(result.inserted_id)
    
    return {"message": "Annonce créée avec succès", "listing": listing_dict}

@router.get("/listings")
async def get_listings(
    crop_type: Optional[str] = None,
    grade: Optional[str] = None,
    certification: Optional[str] = None,
    min_quantity: Optional[float] = None,
    max_price: Optional[float] = None,
    department: Optional[str] = None,
    sort_by: str = "created_at",
    limit: int = 50
):
    """Liste des annonces avec filtres"""
    query = {"status": "active", "expires_at": {"$gt": datetime.utcnow()}}
    
    if crop_type:
        query["crop_type"] = crop_type
    if grade:
        query["grade"] = grade
    if certification:
        query["certifications"] = certification
    if min_quantity:
        query["quantity_kg"] = {"$gte": min_quantity}
    if max_price:
        query["price_per_kg"] = {"$lte": max_price}
    if department:
        query["department"] = department
    
    sort_order = -1 if sort_by in ["created_at", "price_per_kg", "quantity_kg"] else 1
    
    listings = await db.harvest_listings.find(query).sort(sort_by, sort_order).limit(limit).to_list(limit)
    
    for listing in listings:
        listing["_id"] = str(listing["_id"])
        # Increment view count
        await db.harvest_listings.update_one(
            {"_id": ObjectId(listing["_id"])},
            {"$inc": {"views_count": 1}}
        )
    
    return listings

@router.get("/listings/{listing_id}")
async def get_listing_detail(listing_id: str):
    """Détail d'une annonce"""
    listing = await db.harvest_listings.find_one({"listing_id": listing_id})
    if not listing:
        # Try by ObjectId
        try:
            listing = await db.harvest_listings.find_one({"_id": ObjectId(listing_id)})
        except Exception:
            pass
    
    if not listing:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    listing["_id"] = str(listing["_id"])
    
    # Get seller info
    seller = await db.users.find_one({"_id": ObjectId(listing["seller_id"])}, {"_id": 0, "password": 0})
    if seller:
        listing["seller_info"] = {
            "name": seller.get("full_name") or seller.get("cooperative_name"),
            "phone": seller.get("phone_number"),
            "location": seller.get("location"),
            "verified": seller.get("is_verified", False)
        }
    
    return listing

@router.get("/my-listings")
async def get_my_listings(current_user: dict = Depends(get_current_user)):
    """Mes annonces"""
    listings = await db.harvest_listings.find({"seller_id": current_user["_id"]}).sort("created_at", -1).to_list(100)
    return [{**l, "_id": str(l["_id"])} for l in listings]

@router.put("/listings/{listing_id}")
async def update_listing(
    listing_id: str,
    listing: HarvestListing,
    current_user: dict = Depends(get_current_user)
):
    """Mettre à jour une annonce"""
    existing = await db.harvest_listings.find_one({"listing_id": listing_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if existing["seller_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez modifier que vos propres annonces")
    
    update_data = listing.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    await db.harvest_listings.update_one(
        {"listing_id": listing_id},
        {"$set": update_data}
    )
    
    return {"message": "Annonce mise à jour"}

@router.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str, current_user: dict = Depends(get_current_user)):
    """Supprimer/désactiver une annonce"""
    existing = await db.harvest_listings.find_one({"listing_id": listing_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if existing["seller_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez supprimer que vos propres annonces")
    
    await db.harvest_listings.update_one(
        {"listing_id": listing_id},
        {"$set": {"status": "deleted", "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Annonce supprimée"}

# ============= QUOTE REQUESTS (Demandes de devis) =============

@router.post("/quote-requests")
async def create_quote_request(
    request: QuoteRequest,
    current_user: dict = Depends(get_current_user)
):
    """Créer une demande de devis (comme RSE)"""
    listing = await db.harvest_listings.find_one({"listing_id": request.listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if listing["status"] != "active":
        raise HTTPException(status_code=400, detail="Cette annonce n'est plus disponible")
    
    # Check if requester is not the seller
    if listing["seller_id"] == current_user["_id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas demander un devis sur votre propre annonce")
    
    quote_dict = request.dict()
    quote_dict["quote_id"] = f"QTE-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    quote_dict["requester_id"] = current_user["_id"]
    quote_dict["requester_user_type"] = current_user.get("user_type")
    quote_dict["seller_id"] = listing["seller_id"]
    quote_dict["seller_name"] = listing["seller_name"]
    quote_dict["crop_type"] = listing["crop_type"]
    quote_dict["grade"] = listing["grade"]
    quote_dict["listing_price_per_kg"] = listing["price_per_kg"]
    quote_dict["status"] = "pending"
    quote_dict["created_at"] = datetime.utcnow()
    quote_dict["estimated_value"] = request.quantity_requested_kg * listing["price_per_kg"]
    
    result = await db.quote_requests.insert_one(quote_dict)
    quote_dict["_id"] = str(result.inserted_id)
    
    # Increment quote count
    await db.harvest_listings.update_one(
        {"listing_id": request.listing_id},
        {"$inc": {"quotes_count": 1}}
    )
    
    # Create notification for seller
    await db.notifications.insert_one({
        "user_id": listing["seller_id"],
        "title": "Nouvelle demande de devis",
        "message": f"{request.company_name} demande un devis pour {request.quantity_requested_kg:,.0f} kg de {listing['crop_type']} ({listing['grade']})",
        "type": "quote_request",
        "action_url": f"/marketplace/quotes/{quote_dict['quote_id']}",
        "created_at": datetime.utcnow(),
        "is_read": False
    })
    
    return {"message": "Demande de devis envoyée avec succès", "quote": quote_dict}

@router.get("/quote-requests/received")
async def get_received_quotes(current_user: dict = Depends(get_current_user)):
    """Demandes de devis reçues sur mes annonces"""
    quotes = await db.quote_requests.find({"seller_id": current_user["_id"]}).sort("created_at", -1).to_list(100)
    
    for quote in quotes:
        quote["_id"] = str(quote["_id"])
        listing = await db.harvest_listings.find_one({"listing_id": quote["listing_id"]})
        if listing:
            quote["listing"] = {
                "crop_type": listing["crop_type"],
                "grade": listing["grade"],
                "variety": listing.get("variety"),
                "certifications": listing.get("certifications", []),
                "price_per_kg": listing["price_per_kg"],
                "quantity_kg": listing["quantity_kg"]
            }
    
    return quotes

@router.get("/quote-requests/sent")
async def get_sent_quotes(current_user: dict = Depends(get_current_user)):
    """Mes demandes de devis envoyées"""
    quotes = await db.quote_requests.find({"requester_id": current_user["_id"]}).sort("created_at", -1).to_list(100)
    return [{**q, "_id": str(q["_id"])} for q in quotes]

@router.put("/quote-requests/{quote_id}/respond")
async def respond_to_quote(
    quote_id: str,
    action: str,
    proposed_price: Optional[float] = None,
    validity_days: Optional[int] = None,
    response_message: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Répondre à une demande de devis: envoyer devis, refuser, ou demander précisions"""
    quote = await db.quote_requests.find_one({"quote_id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Demande de devis non trouvée")
    
    if quote["seller_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez répondre qu'à vos propres demandes")
    
    if action not in ["send_quote", "reject", "request_info"]:
        raise HTTPException(status_code=400, detail="Action invalide")
    
    update_data = {
        "status": "quoted" if action == "send_quote" else action,
        "responded_at": datetime.utcnow(),
        "response_message": response_message
    }
    
    if action == "send_quote":
        if not proposed_price:
            raise HTTPException(status_code=400, detail="Prix proposé requis pour envoyer un devis")
        update_data["quoted_price_per_kg"] = proposed_price
        update_data["quoted_total"] = proposed_price * quote["quantity_requested_kg"]
        update_data["quote_validity_days"] = validity_days or 15
        update_data["quote_expires_at"] = datetime.utcnow() + timedelta(days=validity_days or 15)
    
    await db.quote_requests.update_one(
        {"quote_id": quote_id},
        {"$set": update_data}
    )
    
    # Notify requester
    status_messages = {
        "send_quote": f"Devis reçu: {proposed_price:,.0f} FCFA/kg",
        "reject": "Demande de devis déclinée",
        "request_info": "Le vendeur demande des précisions"
    }
    
    await db.notifications.insert_one({
        "user_id": quote["requester_id"],
        "title": status_messages[action],
        "message": f"Réponse à votre demande de devis pour {quote['crop_type']}",
        "type": "quote_response",
        "action_url": f"/marketplace/quotes/{quote_id}",
        "created_at": datetime.utcnow(),
        "is_read": False
    })
    
    return {"message": f"Réponse envoyée: {action}"}

# ============= MARKET STATS =============

@router.get("/stats")
async def get_marketplace_stats():
    """Statistiques globales du marketplace"""
    pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {
            "_id": "$crop_type",
            "total_listings": {"$sum": 1},
            "total_quantity_kg": {"$sum": "$quantity_kg"},
            "avg_price": {"$avg": "$price_per_kg"},
            "min_price": {"$min": "$price_per_kg"},
            "max_price": {"$max": "$price_per_kg"},
            "total_value": {"$sum": {"$multiply": ["$quantity_kg", "$price_per_kg"]}}
        }}
    ]
    
    stats_by_crop = await db.harvest_listings.aggregate(pipeline).to_list(100)
    
    # Overall stats
    total_listings = await db.harvest_listings.count_documents({"status": "active"})
    total_quotes = await db.quote_requests.count_documents({})
    quoted_requests = await db.quote_requests.count_documents({"status": "quoted"})
    
    # Certifications distribution
    cert_pipeline = [
        {"$match": {"status": "active"}},
        {"$unwind": "$certifications"},
        {"$group": {"_id": "$certifications", "count": {"$sum": 1}}}
    ]
    certifications_dist = await db.harvest_listings.aggregate(cert_pipeline).to_list(100)
    
    # Grade distribution
    grade_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": {"crop": "$crop_type", "grade": "$grade"}, "count": {"$sum": 1}}}
    ]
    grades_dist = await db.harvest_listings.aggregate(grade_pipeline).to_list(100)
    
    return {
        "total_active_listings": total_listings,
        "total_quote_requests": total_quotes,
        "conversion_rate": round((quoted_requests / max(total_quotes, 1)) * 100, 1),
        "stats_by_crop": {s["_id"]: {**s, "_id": None} for s in stats_by_crop},
        "certifications_distribution": {c["_id"]: c["count"] for c in certifications_dist},
        "grades_distribution": grades_dist
    }

@router.get("/price-trends")
async def get_price_trends(crop_type: str, days: int = 30):
    """Tendances des prix sur les derniers jours"""
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    pipeline = [
        {"$match": {"crop_type": crop_type, "created_at": {"$gte": cutoff}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "avg_price": {"$avg": "$price_per_kg"},
            "volume": {"$sum": "$quantity_kg"},
            "listings_count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    trends = await db.harvest_listings.aggregate(pipeline).to_list(100)
    
    return {
        "crop_type": crop_type,
        "period_days": days,
        "price_trends": trends
    }

# ============= ADMIN ANALYTICS =============

@router.get("/admin/analytics")
async def get_admin_analytics(current_user: dict = Depends(get_current_user)):
    """Analytics avancées pour Super Admin"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    # Total volume and value
    volume_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {
            "_id": None,
            "total_volume_kg": {"$sum": "$quantity_kg"},
            "total_value_xof": {"$sum": {"$multiply": ["$quantity_kg", "$price_per_kg"]}},
            "total_listings": {"$sum": 1},
            "avg_price": {"$avg": "$price_per_kg"}
        }}
    ]
    volume_stats = await db.harvest_listings.aggregate(volume_pipeline).to_list(1)
    volume = volume_stats[0] if volume_stats else {}
    
    # By certification
    cert_value_pipeline = [
        {"$match": {"status": "active"}},
        {"$unwind": "$certifications"},
        {"$group": {
            "_id": "$certifications",
            "volume_kg": {"$sum": "$quantity_kg"},
            "value_xof": {"$sum": {"$multiply": ["$quantity_kg", "$price_per_kg"]}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"value_xof": -1}}
    ]
    cert_stats = await db.harvest_listings.aggregate(cert_value_pipeline).to_list(100)
    
    # By department
    dept_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {
            "_id": "$department",
            "volume_kg": {"$sum": "$quantity_kg"},
            "value_xof": {"$sum": {"$multiply": ["$quantity_kg", "$price_per_kg"]}},
            "listings": {"$sum": 1}
        }},
        {"$sort": {"volume_kg": -1}},
        {"$limit": 10}
    ]
    dept_stats = await db.harvest_listings.aggregate(dept_pipeline).to_list(10)
    
    # Top sellers
    seller_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {
            "_id": "$seller_id",
            "seller_name": {"$first": "$seller_name"},
            "seller_type": {"$first": "$seller_type"},
            "total_volume": {"$sum": "$quantity_kg"},
            "total_value": {"$sum": {"$multiply": ["$quantity_kg", "$price_per_kg"]}},
            "listings_count": {"$sum": 1}
        }},
        {"$sort": {"total_value": -1}},
        {"$limit": 10}
    ]
    top_sellers = await db.harvest_listings.aggregate(seller_pipeline).to_list(10)
    
    # Quotes analytics
    quotes_pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_value": {"$sum": "$estimated_value"}
        }}
    ]
    quotes_stats = await db.quote_requests.aggregate(quotes_pipeline).to_list(10)
    
    # Recent activity
    recent_listings = await db.harvest_listings.find({"status": "active"}).sort("created_at", -1).limit(5).to_list(5)
    recent_quotes = await db.quote_requests.find().sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "overview": {
            "total_volume_kg": volume.get("total_volume_kg", 0),
            "total_volume_tonnes": round(volume.get("total_volume_kg", 0) / 1000, 2),
            "total_value_xof": volume.get("total_value_xof", 0),
            "total_listings": volume.get("total_listings", 0),
            "avg_price_per_kg": round(volume.get("avg_price", 0), 0)
        },
        "by_certification": cert_stats,
        "by_department": dept_stats,
        "top_sellers": top_sellers,
        "quotes_by_status": {s["_id"]: {"count": s["count"], "value": s["total_value"]} for s in quotes_stats},
        "recent_activity": {
            "listings": [{**l, "_id": str(l["_id"])} for l in recent_listings],
            "quotes": [{**q, "_id": str(q["_id"])} for q in recent_quotes]
        }
    }
