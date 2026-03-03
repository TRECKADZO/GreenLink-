"""
Marketplace Analytics API - Métriques Avancées Bourse des Récoltes
Analytics de classe mondiale pour matières premières agricoles (Cacao, Café, Anacarde)
Inspiré des standards ICCO, ICO, et AFI
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta, timezone
from typing import Optional
from bson import ObjectId
from database import db
from routes.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/marketplace-analytics", tags=["marketplace-analytics"])

# Prix de référence internationaux simulés (en production: API externe)
INTERNATIONAL_PRICES = {
    "cacao": {
        "icco_daily": 3250,  # USD/tonne
        "icco_previous": 3180,
        "london_futures": 3320,
        "new_york_futures": 3280,
        "currency_rate": 600,  # USD to FCFA
    },
    "cafe": {
        "ico_composite": 185,  # USD/100lb (cents)
        "ico_previous": 178,
        "arabica_ny": 192,
        "robusta_london": 2450,  # USD/tonne
        "currency_rate": 600,
    },
    "anacarde": {
        "afi_benchmark": 1450,  # USD/tonne (RCN)
        "afi_previous": 1420,
        "kernel_w320": 8500,  # USD/tonne
        "currency_rate": 600,
    }
}


def calculate_local_to_international_premium(local_price_fcfa_kg: float, crop_type: str) -> dict:
    """Calculer la prime/décote par rapport aux prix internationaux"""
    if crop_type.lower() == "cacao":
        intl_price_usd_tonne = INTERNATIONAL_PRICES["cacao"]["icco_daily"]
        rate = INTERNATIONAL_PRICES["cacao"]["currency_rate"]
        intl_price_fcfa_kg = (intl_price_usd_tonne * rate) / 1000
    elif crop_type.lower() in ["cafe", "café"]:
        intl_price_usd_tonne = INTERNATIONAL_PRICES["cafe"]["robusta_london"]
        rate = INTERNATIONAL_PRICES["cafe"]["currency_rate"]
        intl_price_fcfa_kg = (intl_price_usd_tonne * rate) / 1000
    elif crop_type.lower() == "anacarde":
        intl_price_usd_tonne = INTERNATIONAL_PRICES["anacarde"]["afi_benchmark"]
        rate = INTERNATIONAL_PRICES["anacarde"]["currency_rate"]
        intl_price_fcfa_kg = (intl_price_usd_tonne * rate) / 1000
    else:
        return {"premium_percent": 0, "premium_fcfa": 0}
    
    premium_fcfa = local_price_fcfa_kg - intl_price_fcfa_kg
    premium_percent = ((local_price_fcfa_kg / intl_price_fcfa_kg) - 1) * 100 if intl_price_fcfa_kg > 0 else 0
    
    return {
        "premium_percent": round(premium_percent, 2),
        "premium_fcfa": round(premium_fcfa, 2),
        "intl_price_fcfa_kg": round(intl_price_fcfa_kg, 2)
    }


@router.get("/dashboard")
async def get_marketplace_dashboard(
    current_user: dict = Depends(get_current_user)
):
    """
    Dashboard complet des métriques de la Bourse des Récoltes
    Métriques à haute valeur marchande pour matières premières
    """
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # ============= 1. INDICES DE MARCHÉ =============
    
    # Récupérer toutes les annonces actives
    active_listings = await db.harvest_listings.find({
        "status": "active",
        "expires_at": {"$gt": now}
    }).to_list(1000)
    
    # Calculer les prix moyens par produit
    price_by_crop = {}
    volume_by_crop = {}
    quality_by_crop = {}
    
    for listing in active_listings:
        crop = listing.get("crop_type", "autre").lower()
        price = listing.get("price_per_kg", 0)
        qty = listing.get("quantity_kg", 0)
        grade = listing.get("grade", "")
        humidity = listing.get("quality_metrics", {}).get("humidity_percent", 0)
        bean_count = listing.get("quality_metrics", {}).get("bean_count", 0)
        
        if crop not in price_by_crop:
            price_by_crop[crop] = {"prices": [], "total_volume": 0, "total_value": 0}
            volume_by_crop[crop] = {"quantities": [], "grades": {}}
            quality_by_crop[crop] = {"humidity": [], "bean_count": []}
        
        if price > 0:
            price_by_crop[crop]["prices"].append(price)
            price_by_crop[crop]["total_volume"] += qty
            price_by_crop[crop]["total_value"] += price * qty
        
        volume_by_crop[crop]["quantities"].append(qty)
        if grade:
            volume_by_crop[crop]["grades"][grade] = volume_by_crop[crop]["grades"].get(grade, 0) + 1
        
        if humidity > 0:
            quality_by_crop[crop]["humidity"].append(humidity)
        if bean_count > 0:
            quality_by_crop[crop]["bean_count"].append(bean_count)
    
    # Construire les indices de marché
    market_indices = {}
    for crop, data in price_by_crop.items():
        if data["prices"]:
            avg_price = sum(data["prices"]) / len(data["prices"])
            min_price = min(data["prices"])
            max_price = max(data["prices"])
            premium_data = calculate_local_to_international_premium(avg_price, crop)
            
            market_indices[crop] = {
                "avg_price_fcfa_kg": round(avg_price, 2),
                "min_price": round(min_price, 2),
                "max_price": round(max_price, 2),
                "price_spread": round(max_price - min_price, 2),
                "price_spread_percent": round(((max_price - min_price) / avg_price) * 100, 2) if avg_price > 0 else 0,
                "total_volume_kg": data["total_volume"],
                "total_volume_tonnes": round(data["total_volume"] / 1000, 2),
                "total_market_value_fcfa": round(data["total_value"], 0),
                "total_market_value_millions": round(data["total_value"] / 1000000, 2),
                "listings_count": len(data["prices"]),
                "international_comparison": premium_data
            }
    
    # ============= 2. MÉTRIQUES DE LIQUIDITÉ =============
    
    # Demandes de devis
    total_quote_requests = await db.harvest_quote_requests.count_documents({})
    quotes_this_week = await db.harvest_quote_requests.count_documents({
        "created_at": {"$gte": week_ago}
    })
    quotes_this_month = await db.harvest_quote_requests.count_documents({
        "created_at": {"$gte": month_ago}
    })
    
    # Statuts des devis
    quotes_by_status = {}
    async for doc in db.harvest_quote_requests.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]):
        quotes_by_status[doc["_id"]] = doc["count"]
    
    pending_quotes = quotes_by_status.get("pending", 0)
    quoted_count = quotes_by_status.get("quoted", 0)
    accepted_count = quotes_by_status.get("accepted", 0)
    
    conversion_rate = round((accepted_count / total_quote_requests * 100), 2) if total_quote_requests > 0 else 0
    response_rate = round(((quoted_count + accepted_count) / total_quote_requests * 100), 2) if total_quote_requests > 0 else 0
    
    liquidity_metrics = {
        "total_quote_requests": total_quote_requests,
        "quotes_this_week": quotes_this_week,
        "quotes_this_month": quotes_this_month,
        "pending_quotes": pending_quotes,
        "quoted_count": quoted_count,
        "accepted_count": accepted_count,
        "conversion_rate_percent": conversion_rate,
        "response_rate_percent": response_rate,
        "avg_quotes_per_day": round(quotes_this_month / 30, 2) if quotes_this_month > 0 else 0,
        "market_velocity": "active" if quotes_this_week > 5 else "moderate" if quotes_this_week > 0 else "low"
    }
    
    # ============= 3. CERTIFICATIONS & CONFORMITÉ =============
    
    certifications_count = {
        "fairtrade": 0,
        "rainforest": 0,
        "utz": 0,
        "bio": 0,
        "eudr": 0,
        "ici_certified": 0
    }
    
    total_with_certs = 0
    eudr_compliant = 0
    
    for listing in active_listings:
        certs = listing.get("certifications", [])
        if certs:
            total_with_certs += 1
            for cert in certs:
                cert_lower = cert.lower()
                if cert_lower in certifications_count:
                    certifications_count[cert_lower] += 1
        
        if listing.get("eudr_compliant"):
            eudr_compliant += 1
    
    total_listings = len(active_listings)
    certification_metrics = {
        "total_certified_listings": total_with_certs,
        "certification_rate_percent": round((total_with_certs / total_listings * 100), 2) if total_listings > 0 else 0,
        "eudr_compliant_count": eudr_compliant,
        "eudr_compliance_rate": round((eudr_compliant / total_listings * 100), 2) if total_listings > 0 else 0,
        "by_certification": certifications_count,
        "premium_potential": "high" if certifications_count["fairtrade"] > 0 or certifications_count["rainforest"] > 0 else "medium"
    }
    
    # ============= 4. QUALITÉ PRODUITS =============
    
    quality_metrics = {}
    for crop, data in quality_by_crop.items():
        quality_metrics[crop] = {
            "avg_humidity": round(sum(data["humidity"]) / len(data["humidity"]), 2) if data["humidity"] else 0,
            "min_humidity": round(min(data["humidity"]), 2) if data["humidity"] else 0,
            "max_humidity": round(max(data["humidity"]), 2) if data["humidity"] else 0,
            "avg_bean_count": round(sum(data["bean_count"]) / len(data["bean_count"]), 0) if data["bean_count"] else 0,
            "quality_grade": "premium" if (sum(data["humidity"]) / len(data["humidity"]) if data["humidity"] else 10) < 8 else "standard"
        }
    
    # Distribution des grades
    grade_distribution = {}
    for crop, data in volume_by_crop.items():
        grade_distribution[crop] = data["grades"]
    
    # ============= 5. VENDEURS & ACHETEURS =============
    
    # Vendeurs uniques
    unique_sellers = set()
    seller_types = {"cooperative": 0, "producer": 0}
    
    for listing in active_listings:
        seller_id = listing.get("seller_id")
        if seller_id:
            unique_sellers.add(seller_id)
        seller_type = listing.get("seller_type", "producer")
        seller_types[seller_type] = seller_types.get(seller_type, 0) + 1
    
    # Acheteurs actifs (ceux qui ont fait des demandes de devis)
    unique_buyers_pipeline = [
        {"$group": {"_id": "$buyer_id"}},
        {"$count": "total"}
    ]
    buyers_result = await db.harvest_quote_requests.aggregate(unique_buyers_pipeline).to_list(1)
    unique_buyers = buyers_result[0]["total"] if buyers_result else 0
    
    participants_metrics = {
        "active_sellers": len(unique_sellers),
        "seller_types": seller_types,
        "cooperative_share": round((seller_types.get("cooperative", 0) / total_listings * 100), 2) if total_listings > 0 else 0,
        "active_buyers": unique_buyers,
        "buyer_seller_ratio": round(unique_buyers / len(unique_sellers), 2) if unique_sellers else 0
    }
    
    # ============= 6. TENDANCES & PRÉVISIONS =============
    
    # Nouvelles annonces cette semaine vs semaine dernière
    new_listings_this_week = await db.harvest_listings.count_documents({
        "created_at": {"$gte": week_ago}
    })
    
    two_weeks_ago = now - timedelta(days=14)
    new_listings_last_week = await db.harvest_listings.count_documents({
        "created_at": {"$gte": two_weeks_ago, "$lt": week_ago}
    })
    
    listing_trend = "increasing" if new_listings_this_week > new_listings_last_week else "decreasing" if new_listings_this_week < new_listings_last_week else "stable"
    
    trends = {
        "new_listings_this_week": new_listings_this_week,
        "new_listings_last_week": new_listings_last_week,
        "listing_trend": listing_trend,
        "week_over_week_change": round(((new_listings_this_week - new_listings_last_week) / new_listings_last_week * 100), 2) if new_listings_last_week > 0 else 0,
        "market_sentiment": "bullish" if listing_trend == "increasing" and conversion_rate > 10 else "bearish" if conversion_rate < 5 else "neutral"
    }
    
    # ============= 7. RÉFÉRENCES INTERNATIONALES =============
    
    international_benchmarks = {
        "cacao": {
            "icco_daily_usd_tonne": INTERNATIONAL_PRICES["cacao"]["icco_daily"],
            "icco_change_percent": round(((INTERNATIONAL_PRICES["cacao"]["icco_daily"] - INTERNATIONAL_PRICES["cacao"]["icco_previous"]) / INTERNATIONAL_PRICES["cacao"]["icco_previous"] * 100), 2),
            "london_futures": INTERNATIONAL_PRICES["cacao"]["london_futures"],
            "new_york_futures": INTERNATIONAL_PRICES["cacao"]["new_york_futures"],
            "local_equivalent_fcfa_kg": round((INTERNATIONAL_PRICES["cacao"]["icco_daily"] * INTERNATIONAL_PRICES["cacao"]["currency_rate"]) / 1000, 2)
        },
        "cafe": {
            "ico_composite_cents_lb": INTERNATIONAL_PRICES["cafe"]["ico_composite"],
            "ico_change_percent": round(((INTERNATIONAL_PRICES["cafe"]["ico_composite"] - INTERNATIONAL_PRICES["cafe"]["ico_previous"]) / INTERNATIONAL_PRICES["cafe"]["ico_previous"] * 100), 2),
            "robusta_london_usd_tonne": INTERNATIONAL_PRICES["cafe"]["robusta_london"],
            "arabica_ny_cents_lb": INTERNATIONAL_PRICES["cafe"]["arabica_ny"],
            "local_equivalent_fcfa_kg": round((INTERNATIONAL_PRICES["cafe"]["robusta_london"] * INTERNATIONAL_PRICES["cafe"]["currency_rate"]) / 1000, 2)
        },
        "anacarde": {
            "afi_rcn_usd_tonne": INTERNATIONAL_PRICES["anacarde"]["afi_benchmark"],
            "afi_change_percent": round(((INTERNATIONAL_PRICES["anacarde"]["afi_benchmark"] - INTERNATIONAL_PRICES["anacarde"]["afi_previous"]) / INTERNATIONAL_PRICES["anacarde"]["afi_previous"] * 100), 2),
            "kernel_w320_usd_tonne": INTERNATIONAL_PRICES["anacarde"]["kernel_w320"],
            "local_equivalent_fcfa_kg": round((INTERNATIONAL_PRICES["anacarde"]["afi_benchmark"] * INTERNATIONAL_PRICES["anacarde"]["currency_rate"]) / 1000, 2)
        },
        "exchange_rate_usd_xof": INTERNATIONAL_PRICES["cacao"]["currency_rate"],
        "last_updated": now.isoformat()
    }
    
    # ============= 8. RÉSUMÉ EXÉCUTIF =============
    
    total_market_value = sum(
        data.get("total_market_value_fcfa", 0) 
        for data in market_indices.values()
    )
    total_volume_tonnes = sum(
        data.get("total_volume_tonnes", 0) 
        for data in market_indices.values()
    )
    
    executive_summary = {
        "total_active_listings": total_listings,
        "total_market_value_fcfa": total_market_value,
        "total_market_value_display": f"{round(total_market_value/1000000, 2)} M FCFA",
        "total_volume_tonnes": total_volume_tonnes,
        "total_volume_display": f"{total_volume_tonnes} T",
        "dominant_crop": max(market_indices.keys(), key=lambda k: market_indices[k].get("total_volume_kg", 0)) if market_indices else None,
        "market_health_score": min(100, int((conversion_rate * 2) + (certification_metrics["certification_rate_percent"] * 0.5) + (participants_metrics["active_buyers"] * 5))),
        "key_insights": []
    }
    
    # Générer des insights
    if conversion_rate > 15:
        executive_summary["key_insights"].append("Fort taux de conversion - marché dynamique")
    if certification_metrics["eudr_compliance_rate"] > 80:
        executive_summary["key_insights"].append("Excellente conformité EUDR - prêt pour l'export UE")
    if participants_metrics["active_buyers"] > participants_metrics["active_sellers"]:
        executive_summary["key_insights"].append("Demande supérieure à l'offre - opportunité pour les vendeurs")
    if not executive_summary["key_insights"]:
        executive_summary["key_insights"].append("Marché en développement - potentiel de croissance")
    
    return {
        "timestamp": now.isoformat(),
        "executive_summary": executive_summary,
        "market_indices": market_indices,
        "liquidity_metrics": liquidity_metrics,
        "certification_metrics": certification_metrics,
        "quality_metrics": quality_metrics,
        "grade_distribution": grade_distribution,
        "participants_metrics": participants_metrics,
        "trends": trends,
        "international_benchmarks": international_benchmarks
    }


@router.get("/price-history/{crop_type}")
async def get_price_history(
    crop_type: str,
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Historique des prix pour un produit"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Agrégation par jour
    pipeline = [
        {
            "$match": {
                "crop_type": {"$regex": crop_type, "$options": "i"},
                "created_at": {"$gte": start_date}
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                },
                "avg_price": {"$avg": "$price_per_kg"},
                "min_price": {"$min": "$price_per_kg"},
                "max_price": {"$max": "$price_per_kg"},
                "volume": {"$sum": "$quantity_kg"},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.harvest_listings.aggregate(pipeline).to_list(100)
    
    return {
        "crop_type": crop_type,
        "period_days": days,
        "data_points": len(results),
        "history": [
            {
                "date": r["_id"],
                "avg_price": round(r["avg_price"], 2),
                "min_price": round(r["min_price"], 2),
                "max_price": round(r["max_price"], 2),
                "volume_kg": r["volume"],
                "listings_count": r["count"]
            }
            for r in results
        ]
    }


@router.get("/top-listings")
async def get_top_listings(
    limit: int = 10,
    sort_by: str = "value",  # value, volume, price
    current_user: dict = Depends(get_current_user)
):
    """Top annonces par valeur, volume ou prix"""
    now = datetime.now(timezone.utc)
    
    sort_field = {
        "value": {"$multiply": ["$price_per_kg", "$quantity_kg"]},
        "volume": "$quantity_kg",
        "price": "$price_per_kg"
    }.get(sort_by, "$quantity_kg")
    
    pipeline = [
        {
            "$match": {
                "status": "active",
                "expires_at": {"$gt": now}
            }
        },
        {
            "$addFields": {
                "total_value": {"$multiply": ["$price_per_kg", "$quantity_kg"]}
            }
        },
        {"$sort": {"total_value" if sort_by == "value" else sort_by.replace("volume", "quantity_kg").replace("price", "price_per_kg"): -1}},
        {"$limit": limit}
    ]
    
    listings = await db.harvest_listings.aggregate(pipeline).to_list(limit)
    
    return {
        "sort_by": sort_by,
        "count": len(listings),
        "listings": [
            {
                "listing_id": l.get("listing_id"),
                "crop_type": l.get("crop_type"),
                "grade": l.get("grade"),
                "quantity_kg": l.get("quantity_kg"),
                "price_per_kg": l.get("price_per_kg"),
                "total_value_fcfa": round(l.get("total_value", 0), 0),
                "seller_name": l.get("seller_name"),
                "certifications": l.get("certifications", []),
                "department": l.get("department")
            }
            for l in listings
        ]
    }


@router.get("/regional-analysis")
async def get_regional_analysis(
    current_user: dict = Depends(get_current_user)
):
    """Analyse régionale du marché"""
    now = datetime.now(timezone.utc)
    
    pipeline = [
        {
            "$match": {
                "status": "active",
                "expires_at": {"$gt": now}
            }
        },
        {
            "$group": {
                "_id": "$department",
                "listings_count": {"$sum": 1},
                "total_volume_kg": {"$sum": "$quantity_kg"},
                "avg_price": {"$avg": "$price_per_kg"},
                "total_value": {"$sum": {"$multiply": ["$price_per_kg", "$quantity_kg"]}},
                "crops": {"$addToSet": "$crop_type"}
            }
        },
        {"$sort": {"total_volume_kg": -1}}
    ]
    
    regions = await db.harvest_listings.aggregate(pipeline).to_list(50)
    
    return {
        "total_regions": len(regions),
        "regions": [
            {
                "department": r["_id"] or "Non spécifié",
                "listings_count": r["listings_count"],
                "total_volume_tonnes": round(r["total_volume_kg"] / 1000, 2),
                "avg_price_fcfa_kg": round(r["avg_price"], 2),
                "total_market_value_fcfa": round(r["total_value"], 0),
                "crops_available": r["crops"]
            }
            for r in regions
        ]
    }
