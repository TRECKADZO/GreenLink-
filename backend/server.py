from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
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
from routes import admin_analytics
from routes import tracking, analytics_advanced, notifications, subscriptions, carbon_sales, billing, sms
from routes import premium_analytics, ici_analytics, ici_data_collection, ici_export
from routes import pdf_reports, websocket_routes
from routes import qrcode_generator
from routes import farmer_cards_pdf
from routes import photo_storage
from routes import ssrte_analytics
from routes import carbon_payments_dashboard
from routes import field_agent_dashboard
from routes import carbon_auditor
from routes import ussd
from services.push_notifications import router as push_notifications_router


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)

# Create the main app without a prefix
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
app.include_router(qrcode_generator.router)
app.include_router(farmer_cards_pdf.router)
app.include_router(photo_storage.router)
app.include_router(ssrte_analytics.router)
app.include_router(carbon_payments_dashboard.router)
app.include_router(field_agent_dashboard.router)
app.include_router(carbon_auditor.router)
app.include_router(ussd.router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()