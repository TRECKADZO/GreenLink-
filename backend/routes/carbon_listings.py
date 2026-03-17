"""
Carbon Credit Listings API - Soumission et Approbation des Crédits Carbone
Workflow: Coopérative soumet (quantité uniquement) -> Super Admin fixe le prix et approuve -> Crédit publié

Modèle de répartition des revenus:
- Prix de vente fixé par le Super Admin
- 30% frais de service
- 70% restants répartis: 70% agriculteurs, 25% GreenLink, 5% coopérative
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from routes.auth import get_current_user
import uuid

router = APIRouter(prefix="/api/carbon-listings", tags=["carbon-listings"])

# ============= CONSTANTES RÉPARTITION =============
FEES_RATE = 0.30          # 30% frais de service
FARMER_SHARE = 0.70       # 70% de la part nette → agriculteurs
GREENLINK_SHARE = 0.25    # 25% de la part nette → GreenLink
COOP_SHARE = 0.05         # 5% de la part nette → coopérative


def calculate_premium_distribution(price_per_tonne: float, quantity_tonnes: float):
    """Calcule la répartition des revenus selon le modèle GreenLink"""
    total_revenue = price_per_tonne * quantity_tonnes
    fees = total_revenue * FEES_RATE
    net_amount = total_revenue - fees  # 70% restants
    return {
        "total_revenue": round(total_revenue),
        "fees": round(fees),
        "fees_rate": FEES_RATE,
        "net_amount": round(net_amount),
        "farmer_premium": round(net_amount * FARMER_SHARE),
        "farmer_rate": FARMER_SHARE,
        "greenlink_revenue": round(net_amount * GREENLINK_SHARE),
        "greenlink_rate": GREENLINK_SHARE,
        "coop_commission": round(net_amount * COOP_SHARE),
        "coop_rate": COOP_SHARE,
    }


# ============= MODELS =============

class CarbonListingCreate(BaseModel):
    credit_type: str = Field(..., description="Type: Agroforesterie, Reforestation, Agriculture Régénérative, Conservation")
    project_name: str = Field(..., description="Nom du projet carbone")
    project_description: str = Field(..., description="Description détaillée du projet")
    verification_standard: str = Field(..., description="Verra VCS, Gold Standard, Plan Vivo")
    quantity_tonnes_co2: float = Field(..., gt=0)
    vintage_year: int = Field(..., description="Année du vintage")
    region: str = Field(default="")
    department: str = Field(default="")
    methodology: Optional[str] = Field(None, description="Méthodologie utilisée")
    area_hectares: Optional[float] = Field(None, description="Surface couverte en hectares")
    trees_planted: Optional[int] = Field(None, description="Nombre d'arbres plantés")
    farmers_involved: Optional[int] = Field(None, description="Nombre de producteurs impliqués")
    biodiversity_impact: Optional[str] = Field(None)
    social_impact: Optional[str] = Field(None)
    monitoring_plan: Optional[str] = Field(None, description="Plan de suivi MRV")
    documentation_urls: List[str] = Field(default=[])


class AdminAction(BaseModel):
    action: str = Field(..., description="approve or reject")
    price_per_tonne: Optional[float] = Field(None, description="Prix par tonne fixé par le Super Admin (requis pour approbation)")
    admin_note: Optional[str] = None


class CarbonPriceUpdate(BaseModel):
    default_price_per_tonne: float = Field(..., gt=0)


# ============= ENDPOINTS =============

@router.post("/submit")
async def submit_carbon_listing(
    listing: CarbonListingCreate,
    current_user: dict = Depends(get_current_user)
):
    """Soumettre des crédits carbone pour approbation par le Super Admin (quantité uniquement, le prix est fixé par l'admin)"""
    user_type = current_user.get("user_type")
    if user_type not in ["cooperative", "producteur", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Seuls les coopératives et producteurs peuvent soumettre des crédits carbone"
        )

    listing_dict = listing.dict()
    listing_dict["listing_id"] = f"CRB-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    listing_dict["submitter_id"] = current_user["_id"]
    listing_dict["submitter_name"] = current_user.get("full_name") or current_user.get("coop_name") or current_user.get("cooperative_name", "")
    listing_dict["submitter_type"] = user_type
    listing_dict["status"] = "pending_approval"
    listing_dict["price_per_tonne"] = None  # Le prix sera fixé par l'admin
    listing_dict["created_at"] = datetime.now(timezone.utc)
    listing_dict["updated_at"] = datetime.now(timezone.utc)

    result = await db.carbon_listings.insert_one(listing_dict)
    listing_dict.pop("_id", None)

    await db.notifications.insert_one({
        "user_id": "admin",
        "title": "Nouveau crédit carbone soumis",
        "message": f"{listing_dict['submitter_name']} soumet {listing.quantity_tonnes_co2} t CO2 ({listing.verification_standard})",
        "type": "carbon_listing_pending",
        "action_url": "/admin/carbon-approvals",
        "created_at": datetime.now(timezone.utc),
        "is_read": False
    })

    return {
        "message": "Crédits carbone soumis pour approbation. Le Super Admin fixera le prix de vente.",
        "listing_id": listing_dict["listing_id"],
        "status": "pending_approval"
    }


@router.get("/my")
async def get_my_listings(current_user: dict = Depends(get_current_user)):
    """Mes soumissions de crédits carbone"""
    listings = await db.carbon_listings.find(
        {"submitter_id": current_user["_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    for l in listings:
        if isinstance(l.get("created_at"), datetime):
            l["created_at"] = l["created_at"].isoformat()
        if isinstance(l.get("updated_at"), datetime):
            l["updated_at"] = l["updated_at"].isoformat()
        # Add premium breakdown if approved
        if l.get("status") == "approved" and l.get("price_per_tonne"):
            l["premium_distribution"] = calculate_premium_distribution(
                l["price_per_tonne"], l["quantity_tonnes_co2"]
            )

    return listings


@router.get("/pending")
async def get_pending_listings(current_user: dict = Depends(get_current_user)):
    """[Admin] Liste des crédits en attente d'approbation"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    listings = await db.carbon_listings.find(
        {"status": "pending_approval"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    # Get default price
    config = await db.carbon_config.find_one({"key": "default_price"})
    default_price = config.get("value", 15000) if config else 15000

    for l in listings:
        if isinstance(l.get("created_at"), datetime):
            l["created_at"] = l["created_at"].isoformat()
        if isinstance(l.get("updated_at"), datetime):
            l["updated_at"] = l["updated_at"].isoformat()
        l["suggested_price_per_tonne"] = default_price

    return listings


@router.get("/all")
async def get_all_listings(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """[Admin] Toutes les soumissions"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    query = {}
    if status:
        query["status"] = status

    listings = await db.carbon_listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)

    for l in listings:
        if isinstance(l.get("created_at"), datetime):
            l["created_at"] = l["created_at"].isoformat()
        if isinstance(l.get("updated_at"), datetime):
            l["updated_at"] = l["updated_at"].isoformat()
        if l.get("price_per_tonne") and l.get("quantity_tonnes_co2"):
            l["premium_distribution"] = calculate_premium_distribution(
                l["price_per_tonne"], l["quantity_tonnes_co2"]
            )

    return listings


@router.put("/{listing_id}/review")
async def review_carbon_listing(
    listing_id: str,
    action: AdminAction,
    current_user: dict = Depends(get_current_user)
):
    """[Admin] Approuver (avec prix) ou rejeter une soumission"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    if action.action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action invalide: approve ou reject")

    listing = await db.carbon_listings.find_one({"listing_id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Soumission non trouvée")

    if listing["status"] != "pending_approval":
        raise HTTPException(status_code=400, detail="Cette soumission a déjà été traitée")

    now = datetime.now(timezone.utc)

    if action.action == "approve":
        if not action.price_per_tonne or action.price_per_tonne <= 0:
            raise HTTPException(
                status_code=400,
                detail="Le prix par tonne est obligatoire pour l'approbation"
            )

        price = action.price_per_tonne
        qty = listing["quantity_tonnes_co2"]
        distribution = calculate_premium_distribution(price, qty)

        await db.carbon_listings.update_one(
            {"listing_id": listing_id},
            {"$set": {
                "status": "approved",
                "price_per_tonne": price,
                "premium_distribution": distribution,
                "reviewed_by": current_user["_id"],
                "reviewed_at": now,
                "admin_note": action.admin_note,
                "updated_at": now
            }}
        )

        # Create the actual carbon credit on the marketplace
        carbon_credit = {
            "credit_type": listing["credit_type"],
            "project_name": listing["project_name"],
            "project_description": listing["project_description"],
            "verification_standard": listing["verification_standard"],
            "quantity_tonnes_co2": qty,
            "price_per_tonne": price,
            "vintage_year": listing["vintage_year"],
            "region": listing["region"],
            "project_location": listing.get("department") or listing.get("region", "Côte d'Ivoire"),
            "impact_metrics": {
                "trees_planted": listing.get("trees_planted") or 0,
                "farmers_benefited": listing.get("farmers_involved") or 0,
                "area_hectares": listing.get("area_hectares") or 0
            },
            "department": listing.get("department", ""),
            "methodology": listing.get("methodology"),
            "area_hectares": listing.get("area_hectares"),
            "trees_planted": listing.get("trees_planted"),
            "farmers_involved": listing.get("farmers_involved"),
            "premium_distribution": distribution,
            "status": "available",
            "seller_id": listing["submitter_id"],
            "seller_name": listing["submitter_name"],
            "seller_type": listing["submitter_type"],
            "source_listing_id": listing_id,
            "created_at": now,
            "updated_at": now
        }
        await db.carbon_credits.insert_one(carbon_credit)

        # Notify submitter with premium breakdown
        await db.notifications.insert_one({
            "user_id": listing["submitter_id"],
            "title": "Crédits carbone approuvés",
            "message": (
                f"Vos {qty} t CO2 sont en vente à {price:,.0f} XOF/tonne. "
                f"Prime producteurs: {distribution['farmer_premium']:,.0f} XOF"
            ),
            "type": "carbon_listing_approved",
            "action_url": "/carbon-marketplace",
            "created_at": now,
            "is_read": False
        })

        return {
            "message": "Crédits carbone approuvés et publiés sur le marché",
            "price_per_tonne": price,
            "premium_distribution": distribution
        }

    else:
        await db.carbon_listings.update_one(
            {"listing_id": listing_id},
            {"$set": {
                "status": "rejected",
                "reviewed_by": current_user["_id"],
                "reviewed_at": now,
                "admin_note": action.admin_note,
                "updated_at": now
            }}
        )

        await db.notifications.insert_one({
            "user_id": listing["submitter_id"],
            "title": "Crédits carbone non approuvés",
            "message": f"Votre soumission n'a pas été approuvée. {action.admin_note or ''}",
            "type": "carbon_listing_rejected",
            "action_url": "/carbon-marketplace",
            "created_at": now,
            "is_read": False
        })

        return {"message": "Soumission rejetée"}


# ============= PRIX CARBONE (ADMIN) =============

@router.get("/carbon-price")
async def get_carbon_price():
    """Prix par défaut du carbone fixé par le Super Admin"""
    config = await db.carbon_config.find_one({"key": "default_price"})
    return {
        "default_price_per_tonne": config.get("value", 15000) if config else 15000,
        "currency": "XOF",
        "last_updated": config.get("updated_at").isoformat() if config and config.get("updated_at") else None
    }


@router.put("/carbon-price")
async def update_carbon_price(
    data: CarbonPriceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """[Admin] Mettre à jour le prix par défaut du carbone"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    await db.carbon_config.update_one(
        {"key": "default_price"},
        {"$set": {
            "key": "default_price",
            "value": data.default_price_per_tonne,
            "updated_by": current_user["_id"],
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )

    return {
        "message": f"Prix carbone mis à jour: {data.default_price_per_tonne:,.0f} XOF/tonne",
        "default_price_per_tonne": data.default_price_per_tonne
    }


# ============= SIMULATION PRIME =============

@router.get("/simulate-premium")
async def simulate_premium(
    quantity_tonnes: float = Query(..., gt=0),
    price_per_tonne: Optional[float] = None
):
    """Simuler la répartition des primes pour une quantité donnée"""
    if not price_per_tonne:
        config = await db.carbon_config.find_one({"key": "default_price"})
        price_per_tonne = config.get("value", 15000) if config else 15000

    distribution = calculate_premium_distribution(price_per_tonne, quantity_tonnes)
    distribution["price_per_tonne"] = price_per_tonne
    distribution["quantity_tonnes"] = quantity_tonnes
    return distribution


@router.get("/stats")
async def get_carbon_listing_stats():
    """Statistiques des soumissions de crédits carbone"""
    pending = await db.carbon_listings.count_documents({"status": "pending_approval"})
    approved = await db.carbon_listings.count_documents({"status": "approved"})
    rejected = await db.carbon_listings.count_documents({"status": "rejected"})

    pipeline = [
        {"$match": {"status": "approved"}},
        {"$group": {
            "_id": None,
            "total_tonnes": {"$sum": "$quantity_tonnes_co2"},
            "total_value": {"$sum": {"$multiply": ["$quantity_tonnes_co2", "$price_per_tonne"]}}
        }}
    ]
    agg = await db.carbon_listings.aggregate(pipeline).to_list(1)
    totals = agg[0] if agg else {"total_tonnes": 0, "total_value": 0}

    # Get default price
    config = await db.carbon_config.find_one({"key": "default_price"})
    default_price = config.get("value", 15000) if config else 15000

    return {
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "total_tonnes_approved": totals.get("total_tonnes", 0),
        "total_value_approved": totals.get("total_value", 0),
        "default_price_per_tonne": default_price,
        "distribution_model": {
            "fees_rate": "30%",
            "farmer_share": "70% du net",
            "greenlink_share": "25% du net",
            "coop_share": "5% du net"
        }
    }
