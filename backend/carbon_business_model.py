# Carbon Credit Business Model for GreenLink
# Revenue model:
# Prix vente RSE = 30% frais + 70% (25% GreenLink + 70% agriculteurs + 5% cooperatives)
# Pricing: 5-40 USD/tCO2 depending on market and quality

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import math


class CreditQuality(str, Enum):
    STANDARD = "standard"          # Basic verification - 5-15 USD/t
    VERIFIED = "verified"          # Verra VCS verified - 15-25 USD/t  
    PREMIUM = "premium"            # Gold Standard + social co-benefits - 25-40 USD/t
    BIOCHAR = "biochar"            # Biochar enhanced - 40-60 USD/t


class CreditStatus(str, Enum):
    PENDING = "pending"            # Awaiting verification
    VERIFIED = "verified"          # Verified, ready for sale
    LISTED = "listed"              # Listed on market
    SOLD = "sold"                  # Sold to buyer
    RETIRED = "retired"            # Retired/used by buyer
    CANCELLED = "cancelled"        # Invalid/cancelled


class BuyerType(str, Enum):
    FCPF = "fcpf"                  # World Bank FCPF (subsidized ~5 USD/t)
    EMERGENT = "emergent"          # Emergent Fund
    CORPORATE = "corporate"        # Corporate buyers (Nestlé, Cargill, etc.)
    VOLUNTARY = "voluntary"        # Voluntary market buyers
    INSTITUTIONAL = "institutional" # Institutional investors


# =============================================================================
# CARBON CREDIT CALCULATION PARAMETERS (Based on FAO Ex-Act & Cool Farm Tool)
# =============================================================================

# CO2 sequestration rates per practice (tonnes CO2/ha/year)
SEQUESTRATION_RATES = {
    "shade_trees_per_ha": {
        "low": {"min_trees": 0, "max_trees": 20, "rate": 1.5},      # Low shade
        "medium": {"min_trees": 21, "max_trees": 40, "rate": 3.0},  # Medium shade
        "high": {"min_trees": 41, "max_trees": 80, "rate": 4.8},    # High shade (optimal)
        "very_high": {"min_trees": 81, "max_trees": 200, "rate": 6.0}  # Very high
    },
    "organic_practices": 0.5,        # No chemical fertilizers bonus
    "soil_residues": 0.3,            # Crop residues left on soil
    "cover_crops": 0.4,              # Cover crop usage
    "agroforestry_diversity": 0.3,   # Multiple tree species
    "biochar": 2.0,                  # Biochar application bonus
}

# Market pricing in USD per tonne CO2 (2025-2026 rates)
MARKET_PRICING = {
    CreditQuality.STANDARD: {"min": 5, "max": 15, "default": 10},
    CreditQuality.VERIFIED: {"min": 15, "max": 25, "default": 20},
    CreditQuality.PREMIUM: {"min": 25, "max": 40, "default": 30},
    CreditQuality.BIOCHAR: {"min": 40, "max": 60, "default": 50},
}

# Buyer type pricing multipliers
BUYER_PRICING = {
    BuyerType.FCPF: 0.25,           # Subsidized rate ~5 USD/t
    BuyerType.EMERGENT: 0.75,       # ~15-20 USD/t
    BuyerType.CORPORATE: 1.0,       # Market rate
    BuyerType.VOLUNTARY: 1.2,       # Premium for voluntary
    BuyerType.INSTITUTIONAL: 0.9,   # Bulk discount
}

# GreenLink business model parameters
# Distribution is % of NET REVENUE (after 30% fees)
GREENLINK_MARGIN_RATE = 0.25       # 25% margin for GreenLink (of NET)
FARMER_SHARE_RATE = 0.70           # 70% goes to farmers (of NET)
COOPERATIVE_SHARE_RATE = 0.05      # 5% for cooperative management (of NET)
# Total = 100% of NET

# Fee structure (% of GROSS revenue) - deducted first
FEES_RATE = 0.30                   # 30% frais de service
# Net = 70% of gross

# Backward-compatible COST_STRUCTURE (broken down for detailed reports)
COST_STRUCTURE = {
    "verification_audit": 0.10,     # 10% verification/audit
    "field_verification": 0.08,     # 8% drone/terrain verification
    "permanence_buffer": 0.07,      # 7% permanence buffer
    "operational": 0.05,            # 5% operational costs
}
# Total = 30% of gross = FEES_RATE

# USD to XOF conversion
USD_TO_XOF = 655  # 1 USD = 655 XOF (approximate)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class CarbonCreditCalculation(BaseModel):
    """Input for calculating carbon credits from a parcel"""
    parcel_id: str
    farmer_id: str
    cooperative_id: Optional[str] = None
    
    # Land characteristics
    area_hectares: float
    crop_type: str = "cacao"
    
    # Agroforestry practices
    shade_trees_count: int = 0
    tree_height_avg_meters: float = 0
    organic_certified: bool = False
    uses_chemical_fertilizers: bool = False
    soil_residues_kept: bool = False
    has_cover_crops: bool = False
    tree_species_diversity: int = 1  # Number of different tree species
    uses_biochar: bool = False
    
    # Verification
    gps_verified: bool = False
    drone_verified: bool = False
    last_audit_date: Optional[datetime] = None


class CarbonCredit(BaseModel):
    """A carbon credit unit"""
    id: Optional[str] = None
    parcel_id: str
    farmer_id: str
    cooperative_id: Optional[str] = None
    
    # Credit details
    vintage_year: int  # Year of generation
    tonnes_co2: float
    quality: CreditQuality = CreditQuality.STANDARD
    status: CreditStatus = CreditStatus.PENDING
    
    # Calculation breakdown
    sequestration_breakdown: Dict[str, float] = {}
    area_hectares: float
    rate_per_hectare: float
    
    # Verification
    verification_method: str = "self_declared"  # self_declared, gps, drone, audit
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    
    # Registry
    registry: Optional[str] = None  # verra, gold_standard, etc.
    serial_number: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CarbonSale(BaseModel):
    """A carbon credit sale transaction"""
    id: Optional[str] = None
    
    # Credits being sold
    credit_ids: List[str]
    total_tonnes_co2: float
    quality: CreditQuality
    
    # Buyer info
    buyer_type: BuyerType
    buyer_name: str
    buyer_id: Optional[str] = None
    
    # Pricing
    price_per_tonne_usd: float
    total_gross_usd: float
    total_gross_xof: float
    
    # Revenue distribution
    distribution: Dict[str, Any] = {}
    
    # Status
    status: str = "pending"  # pending, confirmed, paid, completed
    contract_ref: Optional[str] = None
    
    # Timestamps
    sale_date: datetime = Field(default_factory=datetime.utcnow)
    payment_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RevenueDistribution(BaseModel):
    """Revenue distribution from a carbon sale"""
    sale_id: str
    total_gross_usd: float
    total_gross_xof: float
    
    # Costs (deducted from gross)
    costs: Dict[str, float] = {}
    total_costs_usd: float = 0
    
    # Net after costs
    net_after_costs_usd: float = 0
    net_after_costs_xof: float = 0
    
    # Distribution
    greenlink_share_usd: float = 0
    greenlink_share_xof: float = 0
    greenlink_margin_rate: float = GREENLINK_MARGIN_RATE
    
    farmers_share_usd: float = 0
    farmers_share_xof: float = 0
    farmers_share_rate: float = FARMER_SHARE_RATE
    
    cooperative_share_usd: float = 0
    cooperative_share_xof: float = 0
    cooperative_share_rate: float = COOPERATIVE_SHARE_RATE
    
    # Per-farmer breakdown
    farmer_distributions: List[Dict[str, Any]] = []


# =============================================================================
# CALCULATION FUNCTIONS
# =============================================================================

def calculate_sequestration_rate(data: CarbonCreditCalculation) -> Dict[str, Any]:
    """
    Calculate CO2 sequestration rate based on farming practices
    Based on FAO Ex-Act and Cool Farm Tool adapted for Côte d'Ivoire
    
    Returns:
        Dict with rate per hectare and breakdown
    """
    breakdown = {}
    total_rate = 0.0
    
    # 1. Shade trees contribution (main factor)
    trees_per_ha = data.shade_trees_count / max(data.area_hectares, 0.1)
    
    for level, params in SEQUESTRATION_RATES["shade_trees_per_ha"].items():
        if params["min_trees"] <= trees_per_ha <= params["max_trees"]:
            # Apply height factor (trees >8m are fully effective)
            height_factor = min(data.tree_height_avg_meters / 8.0, 1.0) if data.tree_height_avg_meters > 0 else 0.5
            tree_rate = params["rate"] * height_factor
            breakdown["shade_trees"] = {
                "rate": tree_rate,
                "trees_per_ha": trees_per_ha,
                "level": level,
                "height_factor": height_factor
            }
            total_rate += tree_rate
            break
    
    # 2. Organic practices bonus
    if not data.uses_chemical_fertilizers:
        organic_rate = SEQUESTRATION_RATES["organic_practices"]
        if data.organic_certified:
            organic_rate *= 1.5  # 50% bonus for certification
        breakdown["organic_practices"] = organic_rate
        total_rate += organic_rate
    
    # 3. Soil residues
    if data.soil_residues_kept:
        breakdown["soil_residues"] = SEQUESTRATION_RATES["soil_residues"]
        total_rate += SEQUESTRATION_RATES["soil_residues"]
    
    # 4. Cover crops
    if data.has_cover_crops:
        breakdown["cover_crops"] = SEQUESTRATION_RATES["cover_crops"]
        total_rate += SEQUESTRATION_RATES["cover_crops"]
    
    # 5. Agroforestry diversity
    if data.tree_species_diversity > 2:
        diversity_bonus = SEQUESTRATION_RATES["agroforestry_diversity"] * min(data.tree_species_diversity / 5, 1.5)
        breakdown["agroforestry_diversity"] = diversity_bonus
        total_rate += diversity_bonus
    
    # 6. Biochar (premium practice)
    if data.uses_biochar:
        breakdown["biochar"] = SEQUESTRATION_RATES["biochar"]
        total_rate += SEQUESTRATION_RATES["biochar"]
    
    # Determine quality based on verification
    if data.drone_verified and data.last_audit_date:
        quality = CreditQuality.PREMIUM if data.uses_biochar else CreditQuality.VERIFIED
    elif data.gps_verified:
        quality = CreditQuality.VERIFIED
    else:
        quality = CreditQuality.STANDARD
    
    return {
        "rate_per_hectare": round(total_rate, 2),
        "total_tonnes_co2": round(total_rate * data.area_hectares, 2),
        "breakdown": breakdown,
        "quality": quality.value,
        "area_hectares": data.area_hectares
    }


def calculate_credit_price(quality: CreditQuality, buyer_type: BuyerType) -> Dict[str, float]:
    """Calculate the price per tonne CO2 based on quality and buyer"""
    base_pricing = MARKET_PRICING[quality]
    buyer_multiplier = BUYER_PRICING[buyer_type]
    
    price_usd = base_pricing["default"] * buyer_multiplier
    
    return {
        "price_per_tonne_usd": round(price_usd, 2),
        "price_per_tonne_xof": round(price_usd * USD_TO_XOF, 0),
        "base_price_usd": base_pricing["default"],
        "buyer_multiplier": buyer_multiplier
    }


def calculate_revenue_distribution(
    total_tonnes: float,
    price_per_tonne_usd: float,
    farmer_credits: List[Dict[str, Any]]
) -> RevenueDistribution:
    """
    Calculate how revenue is distributed between GreenLink, farmers, and cooperatives
    
    Model: Prix vente RSE = 30% frais + 70% (25% GreenLink + 70% agriculteurs + 5% cooperatives)
    
    1. Gross revenue from sale = 100%
    2. Deduct fees (30% of gross) = audits, verification, buffer, operational
    3. Net revenue (70% of gross) split into:
       - 25% GreenLink margin (= 17.5% of gross)
       - 70% Farmers pro-rata (= 49% of gross)
       - 5% Cooperatives (= 3.5% of gross)
    
    TOTAL = 30% fees + 70% net = 100%
    NET = 25% + 70% + 5% = 100%
    """
    # Gross revenue
    gross_usd = total_tonnes * price_per_tonne_usd
    gross_xof = gross_usd * USD_TO_XOF
    
    # Calculate costs (deducted from gross)
    costs = {}
    total_costs = 0
    for cost_name, rate in COST_STRUCTURE.items():
        cost_amount = gross_usd * rate
        costs[cost_name] = {
            "rate": f"{rate*100:.0f}%",
            "amount_usd": round(cost_amount, 2),
            "amount_xof": round(cost_amount * USD_TO_XOF, 0)
        }
        total_costs += cost_amount
    
    total_cost_rate = sum(COST_STRUCTURE.values())
    
    # Net after costs
    net_usd = gross_usd - total_costs
    net_xof = net_usd * USD_TO_XOF
    
    # Distribution of NET revenue
    greenlink_share = net_usd * GREENLINK_MARGIN_RATE
    farmers_pool = net_usd * FARMER_SHARE_RATE
    coop_share = net_usd * COOPERATIVE_SHARE_RATE
    
    # Calculate per-farmer distribution (pro-rata based on tonnes contributed)
    farmer_distributions = []
    for fc in farmer_credits:
        farmer_tonnes = fc.get("tonnes_co2", 0)
        farmer_proportion = farmer_tonnes / total_tonnes if total_tonnes > 0 else 0
        farmer_share_usd = farmers_pool * farmer_proportion
        
        farmer_distributions.append({
            "farmer_id": fc.get("farmer_id"),
            "farmer_name": fc.get("farmer_name", ""),
            "cooperative_id": fc.get("cooperative_id"),
            "tonnes_co2": farmer_tonnes,
            "proportion": round(farmer_proportion * 100, 2),
            "share_usd": round(farmer_share_usd, 2),
            "share_xof": round(farmer_share_usd * USD_TO_XOF, 0),
            # Premium per kg of cacao (assuming 2200 kg/ha average yield)
            "premium_per_kg_xof": round((farmer_share_usd * USD_TO_XOF) / (fc.get("area_hectares", 1) * 2200), 0)
        })
    
    return RevenueDistribution(
        sale_id="",
        total_gross_usd=round(gross_usd, 2),
        total_gross_xof=round(gross_xof, 0),
        costs=costs,
        total_costs_usd=round(total_costs, 2),
        net_after_costs_usd=round(net_usd, 2),
        net_after_costs_xof=round(net_xof, 0),
        greenlink_share_usd=round(greenlink_share, 2),
        greenlink_share_xof=round(greenlink_share * USD_TO_XOF, 0),
        farmers_share_usd=round(farmers_pool, 2),
        farmers_share_xof=round(farmers_pool * USD_TO_XOF, 0),
        cooperative_share_usd=round(coop_share, 2),
        cooperative_share_xof=round(coop_share * USD_TO_XOF, 0),
        farmer_distributions=farmer_distributions
    )


def calculate_farmer_premium_per_kg(
    tonnes_co2: float,
    price_per_tonne_usd: float,
    area_hectares: float,
    yield_kg_per_ha: float = 2200
) -> Dict[str, float]:
    """
    Calculate the carbon premium per kg of cacao for a farmer
    
    Model: Prix vente RSE = 30% frais + 70% net (25% GreenLink + 70% farmer + 5% coop)
    Farmer share of gross = 70% * 70% = 49%
    Example: 4.8 t CO2/ha x 30 USD/t x (1 - 0.30) x 0.70 / 2200 kg/ha
    """
    gross_usd = tonnes_co2 * price_per_tonne_usd
    net_after_fees = gross_usd * (1 - FEES_RATE)
    farmer_share = net_after_fees * FARMER_SHARE_RATE
    greenlink_share = net_after_fees * GREENLINK_MARGIN_RATE
    coop_share = net_after_fees * COOPERATIVE_SHARE_RATE
    
    total_yield_kg = area_hectares * yield_kg_per_ha
    premium_per_kg_usd = farmer_share / total_yield_kg if total_yield_kg > 0 else 0
    premium_per_kg_xof = premium_per_kg_usd * USD_TO_XOF
    
    return {
        "price_per_tonne_usd": price_per_tonne_usd,
        "price_per_tonne_xof": round(price_per_tonne_usd * USD_TO_XOF, 0),
        "gross_revenue_usd": round(gross_usd, 2),
        "gross_revenue_xof": round(gross_usd * USD_TO_XOF, 0),
        "fees_rate": f"{FEES_RATE * 100:.0f}%",
        "fees_usd": round(gross_usd * FEES_RATE, 2),
        "fees_xof": round(gross_usd * FEES_RATE * USD_TO_XOF, 0),
        "net_revenue_usd": round(net_after_fees, 2),
        "net_revenue_xof": round(net_after_fees * USD_TO_XOF, 0),
        "farmer_share_rate": f"{FARMER_SHARE_RATE * 100:.0f}%",
        "farmer_share_usd": round(farmer_share, 2),
        "farmer_share_xof": round(farmer_share * USD_TO_XOF, 0),
        "greenlink_share_rate": f"{GREENLINK_MARGIN_RATE * 100:.0f}%",
        "greenlink_share_usd": round(greenlink_share, 2),
        "greenlink_share_xof": round(greenlink_share * USD_TO_XOF, 0),
        "coop_share_rate": f"{COOPERATIVE_SHARE_RATE * 100:.0f}%",
        "coop_share_usd": round(coop_share, 2),
        "coop_share_xof": round(coop_share * USD_TO_XOF, 0),
        "total_yield_kg": total_yield_kg,
        "premium_per_kg_usd": round(premium_per_kg_usd, 4),
        "premium_per_kg_xof": round(premium_per_kg_xof, 0),
    }


def project_annual_revenue(
    num_farmers: int,
    avg_hectares_per_farmer: float = 2.5,
    avg_trees_per_ha: int = 48,
    price_per_tonne_usd: float = 30,
    quality: CreditQuality = CreditQuality.VERIFIED
) -> Dict[str, Any]:
    """
    Project annual revenue for GreenLink based on farmer base
    
    Example pilot (1,000 farmers):
    - 1000 farmers × 2.5 ha × 4.8 t CO2/ha = 12,000 t CO2/year
    - At 30 USD/t = 360,000 USD gross
    - GreenLink margin (25% of net) ≈ 63,000 USD
    
    Example scale (50,000 farmers):
    - 50000 farmers × 2.5 ha × 4.8 t CO2/ha = 600,000 t CO2/year
    - At 30 USD/t = 18,000,000 USD gross
    - GreenLink margin ≈ 3,150,000 USD/year
    """
    # Calculate total area and CO2
    total_hectares = num_farmers * avg_hectares_per_farmer
    
    # Estimate sequestration based on tree count
    trees_per_ha = avg_trees_per_ha
    if trees_per_ha >= 41:
        rate_per_ha = 4.8
    elif trees_per_ha >= 21:
        rate_per_ha = 3.0
    else:
        rate_per_ha = 1.5
    
    # Add bonuses (assume average practices)
    rate_per_ha += 0.5  # Organic bonus
    rate_per_ha += 0.3  # Soil residues
    
    total_tonnes_co2 = total_hectares * rate_per_ha
    
    # Revenue calculations
    gross_usd = total_tonnes_co2 * price_per_tonne_usd
    gross_xof = gross_usd * USD_TO_XOF
    
    # Costs
    total_cost_rate = sum(COST_STRUCTURE.values())
    costs_usd = gross_usd * total_cost_rate
    net_usd = gross_usd - costs_usd
    
    # Distribution
    greenlink_margin_usd = net_usd * GREENLINK_MARGIN_RATE
    farmers_total_usd = net_usd * FARMER_SHARE_RATE
    avg_farmer_income_usd = farmers_total_usd / num_farmers
    
    return {
        "inputs": {
            "num_farmers": num_farmers,
            "avg_hectares_per_farmer": avg_hectares_per_farmer,
            "total_hectares": total_hectares,
            "avg_trees_per_ha": avg_trees_per_ha,
            "price_per_tonne_usd": price_per_tonne_usd,
            "quality": quality.value
        },
        "carbon": {
            "rate_per_ha": round(rate_per_ha, 2),
            "total_tonnes_co2": round(total_tonnes_co2, 0),
            "tonnes_per_farmer": round(total_tonnes_co2 / num_farmers, 2)
        },
        "revenue": {
            "gross_usd": round(gross_usd, 0),
            "gross_xof": round(gross_xof, 0),
            "costs_usd": round(costs_usd, 0),
            "net_usd": round(net_usd, 0),
            "net_xof": round(net_usd * USD_TO_XOF, 0)
        },
        "distribution": {
            "greenlink_margin_usd": round(greenlink_margin_usd, 0),
            "greenlink_margin_xof": round(greenlink_margin_usd * USD_TO_XOF, 0),
            "greenlink_margin_rate": f"{GREENLINK_MARGIN_RATE * 100}%",
            "farmers_total_usd": round(farmers_total_usd, 0),
            "farmers_total_xof": round(farmers_total_usd * USD_TO_XOF, 0),
            "avg_farmer_income_usd": round(avg_farmer_income_usd, 2),
            "avg_farmer_income_xof": round(avg_farmer_income_usd * USD_TO_XOF, 0)
        },
        "projections": {
            "year_1_pilot_1000": project_scenario(1000, price_per_tonne_usd),
            "year_2_growth_5000": project_scenario(5000, price_per_tonne_usd),
            "year_3_scale_20000": project_scenario(20000, price_per_tonne_usd),
            "year_5_maturity_50000": project_scenario(50000, price_per_tonne_usd)
        }
    }


def project_scenario(num_farmers: int, price_usd: float) -> Dict[str, float]:
    """Quick projection for a given number of farmers"""
    tonnes = num_farmers * 2.5 * 5.0  # avg hectares × avg rate
    gross = tonnes * price_usd
    net = gross * (1 - sum(COST_STRUCTURE.values()))
    margin = net * GREENLINK_MARGIN_RATE
    return {
        "farmers": num_farmers,
        "tonnes_co2": round(tonnes, 0),
        "gross_usd": round(gross, 0),
        "greenlink_margin_usd": round(margin, 0),
        "greenlink_margin_xof": round(margin * USD_TO_XOF, 0)
    }
