from fastapi import APIRouter
from typing import List
import os
from motor.motor_asyncio import AsyncIOMotorClient
from models import StepInDB, CropInDB, ProducerInDB, TestimonialInDB, PricingPlanInDB

router = APIRouter(prefix="/api", tags=["content"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME')]

@router.get("/steps", response_model=List[StepInDB])
async def get_steps():
    steps = await db.steps.find().sort("order", 1).to_list(100)
    return [{**step, "_id": str(step["_id"])} for step in steps]

@router.get("/crops", response_model=List[CropInDB])
async def get_crops():
    crops = await db.crops.find().sort("order", 1).to_list(100)
    return [{**crop, "_id": str(crop["_id"])} for crop in crops]

@router.get("/producers", response_model=List[ProducerInDB])
async def get_producers(limit: int = None):
    query = db.producers.find().sort("order", 1)
    if limit:
        query = query.limit(limit)
    producers = await query.to_list(100)
    return [{**producer, "_id": str(producer["_id"])} for producer in producers]

@router.get("/testimonials", response_model=List[TestimonialInDB])
async def get_testimonials():
    testimonials = await db.testimonials.find().sort("order", 1).to_list(100)
    return [{**testimonial, "_id": str(testimonial["_id"])} for testimonial in testimonials]

@router.get("/pricing-plans", response_model=List[PricingPlanInDB])
async def get_pricing_plans():
    plans = await db.pricing_plans.find().sort("order", 1).to_list(100)
    return [{**plan, "_id": str(plan["_id"])} for plan in plans]