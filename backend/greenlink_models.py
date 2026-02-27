from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ============= AGRICULTEUR MODELS =============

class ParcelBase(BaseModel):
    farmer_name: str
    phone_number: str
    location: str
    region: str  # Bouafle, Daloa, Soubre, etc.
    crop_type: str  # cacao, anacarde
    area_hectares: float
    trees_count: int
    farming_practices: List[str]  # agroforesterie, compost, zero_pesticides, etc.
    coordinates: Optional[dict] = None
    language: str = "francais"  # francais, baoule, dioula, senoufo

class ParcelCreate(ParcelBase):
    pass

class Parcel(ParcelBase):
    id: str = Field(alias="_id")
    farmer_id: str
    carbon_score: float = 0.0
    carbon_credits_earned: float = 0.0
    verification_status: str = "pending"  # pending, verified, rejected
    created_at: datetime
    updated_at: datetime
    is_active: bool

class HarvestBase(BaseModel):
    parcel_id: str
    quantity_kg: float
    quality_grade: str  # A, B, C
    price_per_kg: float
    sale_type: str  # direct, cooperative, marketplace
    
class HarvestCreate(HarvestBase):
    pass

class Harvest(HarvestBase):
    id: str = Field(alias="_id")
    farmer_id: str
    harvest_date: datetime
    carbon_premium: float = 0.0
    total_amount: float
    payment_status: str  # pending, paid
    payment_method: str  # orange_money, mtn_money, moov_money
    transaction_id: Optional[str] = None
    created_at: datetime

class PaymentRequest(BaseModel):
    harvest_id: str
    phone_number: str
    amount: float
    payment_method: str

# ============= ACHETEUR MODELS =============

class BuyerOrder(BaseModel):
    buyer_id: str
    buyer_company: Optional[str] = None
    crop_type: str
    quantity_needed_kg: float
    max_price_per_kg: float
    carbon_requirement: bool = False
    min_carbon_score: Optional[float] = None
    certifications_required: List[str] = []  # UTZ, Rainforest, FairTrade
    delivery_location: str
    delivery_date: datetime
    notes: Optional[str] = None

class BuyerOrderCreate(BaseModel):
    crop_type: str
    quantity_needed_kg: float
    max_price_per_kg: float
    carbon_requirement: bool = False
    min_carbon_score: Optional[float] = None
    certifications_required: List[str] = []  # UTZ, Rainforest, FairTrade
    delivery_location: str
    delivery_date: datetime
    notes: Optional[str] = None

class BuyerOrderInDB(BuyerOrder):
    id: str = Field(alias="_id")
    status: str  # open, matched, completed, cancelled
    matched_parcels: List[str] = []
    total_carbon_credits: float = 0.0
    created_at: datetime
    updated_at: datetime

class TraceabilityReport(BaseModel):
    order_id: str
    parcels: List[dict]
    farmers: List[dict]
    total_quantity_kg: float
    average_carbon_score: float
    total_carbon_credits: float
    eudr_compliant: bool
    verification_documents: List[str]
    blockchain_hash: Optional[str] = None

# ============= ENTREPRISE RSE MODELS =============

class CarbonCreditBase(BaseModel):
    credit_type: str  # agroforesterie, reforestation, agriculture_regenerative
    quantity_tonnes_co2: float
    price_per_tonne: float
    vintage_year: int
    verification_standard: str  # Verra, Gold_Standard, Plan_Vivo
    project_location: str
    project_description: str
    impact_metrics: dict  # trees_planted, farmers_benefited, women_percentage
    
class CarbonCreditCreate(CarbonCreditBase):
    pass

class CarbonCredit(CarbonCreditBase):
    id: str = Field(alias="_id")
    seller_id: str
    seller_type: str  # platform, cooperative, ngo
    status: str  # available, reserved, sold, retired
    certificate_number: Optional[str] = None
    blockchain_hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class CarbonPurchaseCreate(BaseModel):
    credit_id: str
    quantity_tonnes: float
    total_price: float
    purpose: str  # scope3_compensation, csrd_reporting, voluntary
    retirement_requested: bool = False

class CarbonPurchase(BaseModel):
    buyer_id: str
    buyer_company: Optional[str] = None
    credit_id: str
    quantity_tonnes: float
    total_price: float
    purpose: str  # scope3_compensation, csrd_reporting, voluntary
    retirement_requested: bool = False

class CarbonPurchaseInDB(CarbonPurchase):
    id: str = Field(alias="_id")
    certificate_url: Optional[str] = None
    retirement_certificate_url: Optional[str] = None
    transaction_date: datetime
    status: str  # completed, retired

class ImpactDashboard(BaseModel):
    total_co2_offset_tonnes: float
    total_farmers_impacted: int
    women_farmers_percentage: float
    total_trees_planted: int
    regions_covered: List[str]
    impact_stories: List[dict]
    monthly_breakdown: List[dict]

# ============= USSD MODELS =============

class USSDSession(BaseModel):
    session_id: str
    phone_number: str
    current_step: str
    data: dict
    language: str
    created_at: datetime
    last_activity: datetime