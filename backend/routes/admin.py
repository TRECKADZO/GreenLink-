"""
Admin Routes for GreenLink Platform
Super Admin management for partners, users, and platform settings
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import os
from database import db
from routes.auth import get_current_user
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["admin"])

# ============= PYDANTIC MODELS =============

class PartnerCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    logo: Optional[str] = ""
    type: Optional[str] = "technology"
    color: Optional[str] = "bg-blue-500"
    website: Optional[str] = ""

class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo: Optional[str] = None
    type: Optional[str] = None
    color: Optional[str] = None
    website: Optional[str] = None

# ============= HELPER FUNCTIONS =============

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    """Verify user is admin"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return current_user

# ============= PUBLIC ROUTES =============

@router.get("/partners")
async def get_public_partners():
    """Get all active partners (public endpoint)"""
    partners = await db.partners.find({"active": True}).to_list(100)
    return [{**p, "_id": str(p["_id"])} for p in partners]

# ============= ADMIN ROUTES =============

@router.get("/admin/partners")
async def get_all_partners(admin: dict = Depends(get_admin_user)):
    """Get all partners (admin only)"""
    partners = await db.partners.find().sort("created_at", -1).to_list(100)
    return [{**p, "_id": str(p["_id"])} for p in partners]

@router.post("/admin/partners")
async def create_partner(
    partner: PartnerCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create a new partner"""
    partner_data = {
        **partner.dict(),
        "active": True,
        "created_at": datetime.utcnow(),
        "created_by": admin["_id"]
    }
    
    result = await db.partners.insert_one(partner_data)
    partner_data["_id"] = str(result.inserted_id)
    del partner_data["created_by"]
    
    return partner_data

@router.put("/admin/partners/{partner_id}")
async def update_partner(
    partner_id: str,
    partner: PartnerUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update a partner"""
    update_data = {k: v for k, v in partner.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.partners.update_one(
        {"_id": ObjectId(partner_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Partenaire non trouvé")
    
    return {"message": "Partenaire mis à jour", "id": partner_id}

@router.delete("/admin/partners/{partner_id}")
async def delete_partner(
    partner_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete a partner"""
    result = await db.partners.delete_one({"_id": ObjectId(partner_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Partenaire non trouvé")
    
    return {"message": "Partenaire supprimé"}

# ============= ADMIN STATS =============

@router.get("/admin/stats")
async def get_admin_stats(admin: dict = Depends(get_admin_user)):
    """Get platform statistics"""
    users_count = await db.users.count_documents({})
    products_count = await db.products.count_documents({})
    orders_count = await db.orders.count_documents({})
    partners_count = await db.partners.count_documents({})
    
    # Users by type
    user_types = await db.users.aggregate([
        {"$group": {"_id": "$user_type", "count": {"$sum": 1}}}
    ]).to_list(10)
    
    return {
        "total_users": users_count,
        "total_products": products_count,
        "total_orders": orders_count,
        "total_partners": partners_count,
        "users_by_type": {ut["_id"]: ut["count"] for ut in user_types}
    }
