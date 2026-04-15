# Carbon Credit Sales & Revenue API Routes
# Implements GreenLink's carbon credit business model

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import logging
import uuid

from database import db
from routes.auth import get_current_user
from carbon_business_model import (
    CarbonCreditCalculation,
    CarbonCredit,
    CarbonSale,
    RevenueDistribution,
    CreditQuality,
    CreditStatus,
    BuyerType,
    calculate_sequestration_rate,
    calculate_credit_price,
    calculate_revenue_distribution,
    calculate_farmer_premium_per_kg,
    project_annual_revenue,
    MARKET_PRICING,
    BUYER_PRICING,
    USD_TO_XOF,
    GREENLINK_MARGIN_RATE,
    FARMER_SHARE_RATE,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/carbon", tags=["carbon-credits"])


# =============================================================================
# CREDIT CALCULATION & GENERATION
# =============================================================================

@router.post("/calculate-credits")
async def calculate_parcel_credits(
    data: CarbonCreditCalculation,
    current_user: dict = Depends(get_current_user)
):
    """
    Calculate potential carbon credits for a parcel based on farming practices
    Returns estimated tonnes CO2 and potential revenue
    """
    # Calculate sequestration
    result = calculate_sequestration_rate(data)
    
    # Calculate potential prices for different buyers
    quality = CreditQuality(result["quality"])
    pricing = {}
    for buyer_type in BuyerType:
        price_info = calculate_credit_price(quality, buyer_type)
        pricing[buyer_type.value] = {
            "price_per_tonne_usd": price_info["price_per_tonne_usd"],
            "total_potential_usd": round(result["total_tonnes_co2"] * price_info["price_per_tonne_usd"], 2),
            "total_potential_xof": round(result["total_tonnes_co2"] * price_info["price_per_tonne_usd"] * USD_TO_XOF, 0)
        }
    
    # Calculate farmer premium
    avg_price = MARKET_PRICING[quality]["default"]
    premium = calculate_farmer_premium_per_kg(
        result["total_tonnes_co2"],
        avg_price,
        data.area_hectares
    )
    
    return {
        "calculation": result,
        "pricing_by_buyer": pricing,
        "farmer_premium": premium,
        "message": f"Potentiel: {result['total_tonnes_co2']} tonnes CO2/an, "
                   f"soit ~{premium['premium_per_kg_xof']} XOF/kg de prime carbone"
    }


@router.post("/generate-credits/{parcel_id}")
async def generate_credits_for_parcel(
    parcel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate carbon credits for a verified parcel
    Only cooperative admins and admins can do this
    """
    if current_user.get("user_type") not in ["cooperative", "admin"]:
        raise HTTPException(status_code=403, detail="Accès réservé aux coopératives et administrateurs")
    
    # Get parcel data
    parcel = await db.parcels.find_one({"_id": ObjectId(parcel_id)})
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcelle non trouvée")
    
    # Check if parcel is verified
    if not parcel.get("is_verified"):
        raise HTTPException(status_code=400, detail="La parcelle doit être vérifiée avant de générer des crédits")
    
    # Prepare calculation data
    calc_data = CarbonCreditCalculation(
        parcel_id=parcel_id,
        farmer_id=str(parcel.get("farmer_id", parcel.get("member_id", ""))),
        cooperative_id=str(parcel.get("cooperative_id", current_user.get("_id", ""))),
        area_hectares=parcel.get("size_hectares", parcel.get("area", 1)),
        crop_type=parcel.get("crop_type", "cacao"),
        shade_trees_count=parcel.get("trees_count", parcel.get("tree_count", 0)),
        tree_height_avg_meters=parcel.get("tree_height_avg", 8),
        organic_certified=parcel.get("certifications", {}).get("organic", False),
        uses_chemical_fertilizers=not parcel.get("organic", True),
        soil_residues_kept=parcel.get("practices", {}).get("soil_residues", True),
        has_cover_crops=parcel.get("practices", {}).get("cover_crops", False),
        tree_species_diversity=parcel.get("tree_species_count", 3),
        gps_verified=bool(parcel.get("gps_coordinates") or parcel.get("location")),
        drone_verified=parcel.get("drone_verified", False)
    )
    
    # Calculate credits
    result = calculate_sequestration_rate(calc_data)
    
    # Create credit record
    credit = {
        "parcel_id": parcel_id,
        "farmer_id": calc_data.farmer_id,
        "cooperative_id": calc_data.cooperative_id,
        "vintage_year": datetime.utcnow().year,
        "tonnes_co2": result["total_tonnes_co2"],
        "quality": result["quality"],
        "status": CreditStatus.VERIFIED.value,
        "sequestration_breakdown": result["breakdown"],
        "area_hectares": calc_data.area_hectares,
        "rate_per_hectare": result["rate_per_hectare"],
        "verification_method": "gps_verified" if calc_data.gps_verified else "self_declared",
        "verified_by": str(current_user["_id"]),
        "verified_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "serial_number": f"GL-{datetime.utcnow().year}-{uuid.uuid4().hex[:8].upper()}"
    }
    
    result_insert = await db.carbon_credits.insert_one(credit)
    credit["_id"] = str(result_insert.inserted_id)
    
    # Update parcel with credit info
    await db.parcels.update_one(
        {"_id": ObjectId(parcel_id)},
        {
            "$set": {
                "carbon_credit_id": str(result_insert.inserted_id),
                "carbon_tonnes_annual": result["total_tonnes_co2"],
                "carbon_rate_per_ha": result["rate_per_hectare"],
                "carbon_quality": result["quality"],
                "carbon_updated_at": datetime.utcnow()
            }
        }
    )
    
    logger.info(f"Generated {result['total_tonnes_co2']} tonnes CO2 credits for parcel {parcel_id}")
    
    return {
        "success": True,
        "credit": credit,
        "message": f"Crédits générés: {result['total_tonnes_co2']} tonnes CO2 (qualité: {result['quality']})"
    }


# =============================================================================
# CREDIT AGGREGATION
# =============================================================================

@router.get("/credits/available")
async def get_available_credits(
    cooperative_id: Optional[str] = None,
    quality: Optional[str] = None,
    min_tonnes: float = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get available (unsold) carbon credits for sale"""
    query = {"status": {"$in": [CreditStatus.VERIFIED.value, CreditStatus.LISTED.value]}}
    
    if cooperative_id:
        query["cooperative_id"] = cooperative_id
    elif current_user.get("user_type") == "cooperative":
        query["cooperative_id"] = str(current_user["_id"])
    
    if quality:
        query["quality"] = quality
    
    credits = await db.carbon_credits.find(query).to_list(1000)
    
    # Aggregate by quality
    aggregated = {}
    for credit in credits:
        q = credit.get("quality", "standard")
        if q not in aggregated:
            aggregated[q] = {
                "quality": q,
                "total_tonnes": 0,
                "credit_count": 0,
                "credits": []
            }
        aggregated[q]["total_tonnes"] += credit.get("tonnes_co2", 0)
        aggregated[q]["credit_count"] += 1
        credit["_id"] = str(credit["_id"])
        aggregated[q]["credits"].append(credit)
    
    # Calculate potential revenue
    for q, data in aggregated.items():
        try:
            quality_enum = CreditQuality(q)
            price_info = calculate_credit_price(quality_enum, BuyerType.CORPORATE)
            data["potential_revenue_usd"] = round(data["total_tonnes"] * price_info["price_per_tonne_usd"], 2)
            data["potential_revenue_xof"] = round(data["potential_revenue_usd"] * USD_TO_XOF, 0)
            data["price_per_tonne_usd"] = price_info["price_per_tonne_usd"]
        except Exception:
            pass
    
    total_tonnes = sum(d["total_tonnes"] for d in aggregated.values())
    
    return {
        "total_available_tonnes": round(total_tonnes, 2),
        "by_quality": list(aggregated.values()),
        "total_credits": len(credits)
    }


@router.get("/credits/aggregated-by-coop")
async def get_credits_aggregated_by_cooperative(
    current_user: dict = Depends(get_current_user)
):
    """Get carbon credits aggregated by cooperative (admin view)"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    pipeline = [
        {"$match": {"status": {"$in": ["verified", "listed"]}}},
        {"$group": {
            "_id": "$cooperative_id",
            "total_tonnes": {"$sum": "$tonnes_co2"},
            "credit_count": {"$sum": 1},
            "avg_quality": {"$first": "$quality"}
        }},
        {"$sort": {"total_tonnes": -1}}
    ]
    
    results = await db.carbon_credits.aggregate(pipeline).to_list(100)
    
    # Enrich with cooperative names
    for r in results:
        coop_id = r["_id"]
        if coop_id:
            coop = await db.users.find_one({"_id": ObjectId(coop_id)})
            r["cooperative_name"] = coop.get("coop_name", coop.get("full_name", "")) if coop else "Inconnu"
        else:
            r["cooperative_name"] = "Non affilié"
        r["cooperative_id"] = r.pop("_id")
    
    total = sum(r["total_tonnes"] for r in results)
    
    return {
        "cooperatives": results,
        "total_tonnes_all": round(total, 2),
        "total_cooperatives": len(results)
    }


# =============================================================================
# SALES MANAGEMENT
# =============================================================================

class SaleRequest(BaseModel):
    credit_ids: List[str]
    buyer_type: str
    buyer_name: str
    buyer_id: Optional[str] = None
    price_per_tonne_usd: Optional[float] = None  # Custom price or use default
    contract_ref: Optional[str] = None
    notes: Optional[str] = None


@router.post("/sales/create")
async def create_carbon_sale(
    sale_request: SaleRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new carbon credit sale
    Only admins can create sales
    """
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    # Validate buyer type
    try:
        buyer_type = BuyerType(sale_request.buyer_type)
    except (ValueError, KeyError):
        raise HTTPException(status_code=400, detail="Type d'acheteur invalide")
    
    # Get credits
    credits = []
    total_tonnes = 0
    farmer_credits = []
    
    for credit_id in sale_request.credit_ids:
        credit = await db.carbon_credits.find_one({"_id": ObjectId(credit_id)})
        if not credit:
            raise HTTPException(status_code=404, detail=f"Crédit {credit_id} non trouvé")
        if credit.get("status") not in ["verified", "listed"]:
            raise HTTPException(status_code=400, detail=f"Crédit {credit_id} n'est pas disponible à la vente")
        
        credits.append(credit)
        total_tonnes += credit.get("tonnes_co2", 0)
        
        # Get farmer info for distribution
        farmer_id = credit.get("farmer_id")
        farmer = await db.users.find_one({"_id": ObjectId(farmer_id)}) if farmer_id else None
        farmer_credits.append({
            "credit_id": credit_id,
            "farmer_id": farmer_id,
            "farmer_name": farmer.get("full_name", "") if farmer else "",
            "cooperative_id": credit.get("cooperative_id"),
            "tonnes_co2": credit.get("tonnes_co2", 0),
            "area_hectares": credit.get("area_hectares", 1)
        })
    
    # Determine quality (use lowest quality of all credits)
    qualities = [c.get("quality", "standard") for c in credits]
    sale_quality = min(qualities, key=lambda q: ["standard", "verified", "premium", "biochar"].index(q) if q in ["standard", "verified", "premium", "biochar"] else 0)
    
    # Calculate price
    if sale_request.price_per_tonne_usd:
        price_per_tonne = sale_request.price_per_tonne_usd
    else:
        price_info = calculate_credit_price(CreditQuality(sale_quality), buyer_type)
        price_per_tonne = price_info["price_per_tonne_usd"]
    
    # Calculate distribution
    distribution = calculate_revenue_distribution(total_tonnes, price_per_tonne, farmer_credits)
    
    # Create sale record
    sale = {
        "credit_ids": sale_request.credit_ids,
        "total_tonnes_co2": total_tonnes,
        "quality": sale_quality,
        "buyer_type": buyer_type.value,
        "buyer_name": sale_request.buyer_name,
        "buyer_id": sale_request.buyer_id,
        "price_per_tonne_usd": price_per_tonne,
        "total_gross_usd": distribution.total_gross_usd,
        "total_gross_xof": distribution.total_gross_xof,
        "distribution": distribution.dict(),
        "status": "pending",
        "contract_ref": sale_request.contract_ref,
        "notes": sale_request.notes,
        "created_by": str(current_user["_id"]),
        "sale_date": datetime.utcnow(),
        "created_at": datetime.utcnow()
    }
    
    result = await db.carbon_sales.insert_one(sale)
    sale["_id"] = str(result.inserted_id)
    
    # Update credits status
    for credit_id in sale_request.credit_ids:
        await db.carbon_credits.update_one(
            {"_id": ObjectId(credit_id)},
            {"$set": {"status": "sold", "sale_id": str(result.inserted_id), "updated_at": datetime.utcnow()}}
        )
    
    logger.info(f"Carbon sale created: {total_tonnes} tonnes at {price_per_tonne} USD/t, total {distribution.total_gross_usd} USD")
    
    return {
        "success": True,
        "sale": sale,
        "summary": {
            "total_tonnes": total_tonnes,
            "gross_revenue_usd": distribution.total_gross_usd,
            "gross_revenue_xof": distribution.total_gross_xof,
            "greenlink_margin_usd": distribution.greenlink_share_usd,
            "farmers_share_usd": distribution.farmers_share_usd,
            "farmer_count": len(farmer_credits)
        }
    }


@router.post("/sales/{sale_id}/confirm-payment")
async def confirm_sale_payment(
    sale_id: str,
    payment_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Confirm payment received for a carbon sale
    This triggers the distribution to farmers
    """
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    sale = await db.carbon_sales.find_one({"_id": ObjectId(sale_id)})
    if not sale:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    if sale.get("status") not in ["pending", "confirmed"]:
        raise HTTPException(status_code=400, detail="Cette vente ne peut pas être confirmée")
    
    # Update sale status
    await db.carbon_sales.update_one(
        {"_id": ObjectId(sale_id)},
        {
            "$set": {
                "status": "paid",
                "payment_date": datetime.utcnow(),
                "payment_ref": payment_data.get("payment_ref"),
                "payment_method": payment_data.get("payment_method"),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Create farmer premium distributions
    distribution = sale.get("distribution", {})
    farmer_distributions = distribution.get("farmer_distributions", [])
    
    for fd in farmer_distributions:
        # Create distribution record
        await db.carbon_distributions.insert_one({
            "sale_id": sale_id,
            "farmer_id": fd.get("farmer_id"),
            "farmer_name": fd.get("farmer_name"),
            "cooperative_id": fd.get("cooperative_id"),
            "tonnes_co2": fd.get("tonnes_co2"),
            "amount_usd": fd.get("share_usd"),
            "amount_xof": fd.get("share_xof"),
            "premium_per_kg_xof": fd.get("premium_per_kg_xof"),
            "status": "pending",  # Will be paid via Orange Money
            "created_at": datetime.utcnow()
        })
    
    # Update credits to retired status
    for credit_id in sale.get("credit_ids", []):
        await db.carbon_credits.update_one(
            {"_id": ObjectId(credit_id)},
            {"$set": {"status": "retired", "updated_at": datetime.utcnow()}}
        )
    
    logger.info(f"Payment confirmed for sale {sale_id}, {len(farmer_distributions)} farmer distributions created")
    
    return {
        "success": True,
        "message": f"Paiement confirmé. {len(farmer_distributions)} distributions aux agriculteurs créées.",
        "distributions_created": len(farmer_distributions),
        "total_to_farmers_xof": distribution.get("farmers_share_xof", 0)
    }


@router.get("/sales")
async def get_carbon_sales(
    status: Optional[str] = None,
    year: Optional[int] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get carbon sales history"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    query = {}
    if status:
        query["status"] = status
    if year:
        query["sale_date"] = {
            "$gte": datetime(year, 1, 1),
            "$lt": datetime(year + 1, 1, 1)
        }
    
    sales = await db.carbon_sales.find(query).sort("sale_date", -1).limit(limit).to_list(limit)
    
    for sale in sales:
        sale["_id"] = str(sale["_id"])
    
    # Calculate totals
    total_tonnes = sum(s.get("total_tonnes_co2", 0) for s in sales)
    total_gross = sum(s.get("total_gross_usd", 0) for s in sales)
    total_greenlink = sum(s.get("distribution", {}).get("greenlink_share_usd", 0) for s in sales)
    
    return {
        "sales": sales,
        "summary": {
            "total_sales": len(sales),
            "total_tonnes_sold": round(total_tonnes, 2),
            "total_gross_usd": round(total_gross, 2),
            "total_gross_xof": round(total_gross * USD_TO_XOF, 0),
            "greenlink_total_margin_usd": round(total_greenlink, 2),
            "greenlink_total_margin_xof": round(total_greenlink * USD_TO_XOF, 0)
        }
    }


# =============================================================================
# REVENUE PROJECTIONS & ANALYTICS
# =============================================================================

@router.get("/analytics/revenue-projection")
async def get_revenue_projection(
    num_farmers: int = Query(1000, description="Nombre de planteurs"),
    avg_hectares: float = Query(2.5, description="Hectares moyens par planteur"),
    avg_trees: int = Query(48, description="Arbres moyens par hectare"),
    price_usd: float = Query(30, description="Prix par tonne CO2 en USD"),
    current_user: dict = Depends(get_current_user)
):
    """
    Calculate revenue projections for GreenLink carbon business
    
    Example: 1,000 farmers = ~144,000 USD gross, ~36,000 USD margin
    """
    projection = project_annual_revenue(
        num_farmers=num_farmers,
        avg_hectares_per_farmer=avg_hectares,
        avg_trees_per_ha=avg_trees,
        price_per_tonne_usd=price_usd
    )
    
    return projection


@router.get("/analytics/dashboard")
async def get_carbon_dashboard(
    current_user: dict = Depends(get_current_user)
):
    """
    Get carbon business dashboard with key metrics
    """
    # Total credits generated
    total_credits = await db.carbon_credits.count_documents({})
    total_tonnes = 0
    credits_by_status = {}
    
    pipeline_status = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "tonnes": {"$sum": "$tonnes_co2"}
        }}
    ]
    status_results = await db.carbon_credits.aggregate(pipeline_status).to_list(10)
    for r in status_results:
        credits_by_status[r["_id"]] = {"count": r["count"], "tonnes": r["tonnes"]}
        total_tonnes += r["tonnes"]
    
    # Sales summary
    sales_pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "gross_usd": {"$sum": "$total_gross_usd"},
            "tonnes": {"$sum": "$total_tonnes_co2"}
        }}
    ]
    sales_results = await db.carbon_sales.aggregate(sales_pipeline).to_list(10)
    
    total_sales_usd = 0
    total_sold_tonnes = 0
    sales_by_status = {}
    for r in sales_results:
        sales_by_status[r["_id"]] = {
            "count": r["count"],
            "gross_usd": r["gross_usd"],
            "tonnes": r["tonnes"]
        }
        if r["_id"] in ["paid", "completed"]:
            total_sales_usd += r["gross_usd"]
            total_sold_tonnes += r["tonnes"]
    
    # Farmer distributions
    pending_distributions = await db.carbon_distributions.count_documents({"status": "pending"})
    paid_distributions = await db.carbon_distributions.count_documents({"status": "paid"})
    
    # Market pricing info
    pricing_info = {
        quality.value: {
            "min": MARKET_PRICING[quality]["min"],
            "max": MARKET_PRICING[quality]["max"],
            "default": MARKET_PRICING[quality]["default"]
        } for quality in CreditQuality
    }
    
    return {
        "credits": {
            "total_generated": total_credits,
            "total_tonnes": round(total_tonnes, 2),
            "by_status": credits_by_status,
            "available_for_sale": credits_by_status.get("verified", {}).get("tonnes", 0) + 
                                  credits_by_status.get("listed", {}).get("tonnes", 0)
        },
        "sales": {
            "total_revenue_usd": round(total_sales_usd, 2),
            "total_revenue_xof": round(total_sales_usd * USD_TO_XOF, 0),
            "total_tonnes_sold": round(total_sold_tonnes, 2),
            "by_status": sales_by_status
        },
        "distributions": {
            "pending": pending_distributions,
            "paid": paid_distributions
        },
        "market_pricing_usd": pricing_info,
    }


@router.get("/market-prices")
async def get_market_prices():
    """Get current carbon credit market prices"""
    prices = []
    for quality in CreditQuality:
        pricing = MARKET_PRICING[quality]
        prices.append({
            "quality": quality.value,
            "quality_name": {
                "standard": "Standard",
                "verified": "Vérifié (Verra VCS)",
                "premium": "Premium (Gold Standard)",
                "biochar": "Biochar Amélioré"
            }.get(quality.value, quality.value),
            "price_range_usd": f"{pricing['min']}-{pricing['max']} USD/t",
            "default_price_usd": pricing["default"],
            "default_price_xof": pricing["default"] * USD_TO_XOF
        })
    
    buyers = []
    for buyer_type in BuyerType:
        multiplier = BUYER_PRICING[buyer_type]
        buyers.append({
            "type": buyer_type.value,
            "type_name": {
                "fcpf": "FCPF Banque Mondiale (subventionné)",
                "emergent": "Emergent Fund",
                "corporate": "Acheteurs Corporatifs (Nestlé, Cargill...)",
                "voluntary": "Marché Volontaire",
                "institutional": "Investisseurs Institutionnels"
            }.get(buyer_type.value, buyer_type.value),
            "price_multiplier": multiplier,
            "example_price_usd": round(20 * multiplier, 2)  # Based on verified default
        })
    
    return {
        "quality_tiers": prices,
        "buyer_types": buyers,
        "notes": {
            "source": "Basé sur FAO Ex-Act, Cool Farm Tool, et marchés CI 2025-2026",
            "fcpf_historical": "CI a vendu 10 Mt CO2 via FCPF pour 50M USD (~5 USD/t)",
            "premium_potential": "Crédits haute intégrité avec co-bénéfices sociaux: 25-40 USD/t"
        }
    }
