from fastapi import APIRouter, HTTPException
from typing import List
import os
from motor.motor_asyncio import AsyncIOMotorClient
from models import Feature, FeatureInDB

router = APIRouter(prefix="/api/features", tags=["features"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

@router.get("", response_model=List[FeatureInDB])
async def get_features():
    features = await db.features.find().sort("order", 1).to_list(100)
    return [{**feature, "_id": str(feature["_id"])} for feature in features]

@router.post("", response_model=FeatureInDB)
async def create_feature(feature: Feature):
    feature_dict = feature.dict()
    result = await db.features.insert_one(feature_dict)
    feature_dict["_id"] = str(result.inserted_id)
    return feature_dict

@router.get("/{feature_id}", response_model=FeatureInDB)
async def get_feature(feature_id: str):
    from bson import ObjectId
    feature = await db.features.find_one({"_id": ObjectId(feature_id)})
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")
    feature["_id"] = str(feature["_id"])
    return feature

@router.put("/{feature_id}", response_model=FeatureInDB)
async def update_feature(feature_id: str, feature: Feature):
    from bson import ObjectId
    result = await db.features.update_one(
        {"_id": ObjectId(feature_id)},
        {"$set": feature.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feature not found")
    updated_feature = await db.features.find_one({"_id": ObjectId(feature_id)})
    updated_feature["_id"] = str(updated_feature["_id"])
    return updated_feature

@router.delete("/{feature_id}")
async def delete_feature(feature_id: str):
    from bson import ObjectId
    result = await db.features.delete_one({"_id": ObjectId(feature_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feature not found")
    return {"message": "Feature deleted successfully"}