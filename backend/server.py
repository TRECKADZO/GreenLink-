from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from middleware.rate_limiter import RateLimitMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone

# Import routes
from routes import features, content, contact, auth, marketplace, greenlink, payments, admin, cooperative
from routes import cooperative_members, cooperative_parcels, cooperative_lots, cooperative_agents, cooperative_reports, cooperative_carbon_premiums
from routes import admin_analytics, carbon_premiums
from routes import tracking, analytics_advanced, notifications, subscriptions, carbon_sales, billing, sms
from routes import coop_subscriptions
from routes import premium_analytics, ici_analytics, ici_data_collection, ici_export
from routes import pdf_reports, websocket_routes
from routes import ici_pdf_reports
from routes import photo_storage
from routes import ssrte_analytics
from routes import ssrte  # SSRTE Agent dedicated routes
from routes import carbon_payments_dashboard
from routes import field_agent_dashboard
from routes import carbon_auditor
from routes import ussd
from routes import agent_geolocation  # Agent GPS tracking
from routes import coverage_zones  # Coverage zones for cooperatives
from routes import harvest_marketplace  # Harvest Marketplace for producers/coops
from routes import buyer_dashboard  # Buyer Dashboard
from routes import messaging  # Secure Messaging System
from routes import web_push  # Web Push Notifications
from routes import marketplace_analytics
from routes import redd  # REDD+ MRV routes
from routes import redd_pdf  # REDD+ PDF export  # Advanced Marketplace Analytics
from routes import redd_tracking  # REDD+ Field Agent Tracking
from routes import dashboard_pdf  # Dashboard PDF export
from routes import agent_search  # Agent Terrain - Recherche sécurisée
from routes import carbon_listings  # Carbon Credit Listings - Soumission/Approbation
from routes import quotes  # Gestion des Devis pour abonnements fournisseurs
from routes import rse_dashboard  # RSE Dashboard enrichi
from routes import redd_impact  # REDD+ Impact National metrics
from routes import sync_batch  # Offline batch sync with conflict resolution
from routes import cooperative_referral  # Système de parrainage coopératives
from services.push_notifications import router as push_notifications_router


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Auto-restore data if database is empty (for fresh deployments)
try:
    from data_seed.restore_if_empty import check_and_restore
    check_and_restore(mongo_url, os.environ['DB_NAME'])
except Exception as e:
    print(f"[SEED] Skipped auto-restore: {e}")

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)

# Create the main app without a prefix
app = FastAPI()
app.state.limiter = limiter

# Custom rate limit handler that returns JSON (not plain text)
async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Trop de tentatives. Patientez une minute avant de réessayer."}
    )

app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.get("/health")
@api_router.head("/health")
async def health_check():
    return {"status": "ok", "service": "greenlink-api"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Include the router in the main app
app.include_router(api_router)

# Include feature routes
app.include_router(features.router)
app.include_router(content.router)
app.include_router(contact.router)
app.include_router(auth.router)
app.include_router(marketplace.router)
app.include_router(greenlink.router)
app.include_router(payments.router)
app.include_router(admin.router)
app.include_router(admin_analytics.router)
app.include_router(cooperative.router)
app.include_router(cooperative_members.router)
app.include_router(cooperative_parcels.router)
app.include_router(cooperative_lots.router)
app.include_router(cooperative_agents.router)
app.include_router(cooperative_reports.router)
from routes import cooperative_harvests
app.include_router(cooperative_carbon_premiums.router)
app.include_router(carbon_premiums.router)
app.include_router(carbon_premiums.farmer_router)
app.include_router(cooperative_harvests.router)
app.include_router(tracking.router)
app.include_router(analytics_advanced.router)
app.include_router(notifications.router)
app.include_router(subscriptions.router)
app.include_router(carbon_sales.router)
app.include_router(billing.router)
app.include_router(sms.router)
app.include_router(premium_analytics.router)
app.include_router(ici_analytics.router)
app.include_router(ici_data_collection.router)
app.include_router(ici_export.router)
app.include_router(pdf_reports.router)
app.include_router(websocket_routes.router)
app.include_router(push_notifications_router)
app.include_router(ici_pdf_reports.router)
app.include_router(photo_storage.router)
app.include_router(ssrte_analytics.router)
app.include_router(ssrte.router)  # SSRTE Agent dedicated routes
app.include_router(carbon_payments_dashboard.router)
app.include_router(field_agent_dashboard.router)
app.include_router(carbon_auditor.router)
app.include_router(ussd.router)
app.include_router(agent_geolocation.router)
app.include_router(coverage_zones.router)
app.include_router(harvest_marketplace.router)
app.include_router(buyer_dashboard.router)
app.include_router(messaging.router)
app.include_router(web_push.router)
app.include_router(marketplace_analytics.router)
app.include_router(agent_search.router)
app.include_router(carbon_listings.router)
app.include_router(quotes.router)
app.include_router(rse_dashboard.router)
app.include_router(redd.router)
app.include_router(redd_pdf.router)
app.include_router(redd_tracking.router)
app.include_router(dashboard_pdf.router)
app.include_router(coop_subscriptions.router)
app.include_router(redd_impact.router)
app.include_router(sync_batch.router)
app.include_router(cooperative_referral.router)

# Set database for cooperative_referral module
cooperative_referral.set_database(db)

CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '')
if CORS_ORIGINS:
    allowed_origins = [o.strip() for o in CORS_ORIGINS.split(',') if o.strip()]
else:
    allowed_origins = [
        "https://agritech-platform-7.preview.emergentagent.com",
        "http://localhost:3000",
        "http://localhost:8001",
        "https://greenlink-agritech.com",
        "https://www.greenlink-agritech.com",
        "http://greenlink-agritech.com",
        "http://www.greenlink-agritech.com",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Rate limiting middleware (must be after CORS)
app.add_middleware(RateLimitMiddleware)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def create_security_indexes():
    """Create TTL index on token_blacklist to auto-cleanup expired tokens"""
    try:
        await db.token_blacklist.create_index("expires_at", expireAfterSeconds=0)
    except Exception:
        pass

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()