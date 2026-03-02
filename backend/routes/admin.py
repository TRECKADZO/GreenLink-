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


# ============= REAL-TIME DASHBOARD =============

@router.get("/admin/realtime-dashboard")
async def get_realtime_dashboard(current_user: dict = Depends(get_admin_user)):
    """
    Tableau de bord temps réel pour les administrateurs
    - Activité USSD
    - Paiements en cours
    - Métriques par région
    """
    from datetime import timedelta
    
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # ===== USSD ACTIVITY =====
    ussd_today = await db.sms_logs.count_documents({"created_at": {"$gte": today}})
    ussd_week = await db.sms_logs.count_documents({"created_at": {"$gte": week_ago}})
    
    # USSD by command type
    ussd_by_type = await db.sms_logs.aggregate([
        {"$match": {"created_at": {"$gte": week_ago}, "direction": "incoming"}},
        {"$addFields": {
            "command": {"$toUpper": {"$arrayElemAt": [{"$split": ["$message", " "]}, 0]}}
        }},
        {"$group": {"_id": "$command", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]).to_list(5)
    
    # Pending SMS requests
    pending_parcels = await db.sms_parcel_requests.count_documents({"status": "pending"})
    pending_harvests = await db.sms_harvest_requests.count_documents({"status": "pending"})
    
    # ===== PAYMENTS ACTIVITY =====
    payments_today = await db.carbon_payments.count_documents({"created_at": {"$gte": today}})
    payments_week = await db.carbon_payments.count_documents({"created_at": {"$gte": week_ago}})
    
    # Total amounts
    payment_stats = await db.carbon_payments.aggregate([
        {"$match": {"created_at": {"$gte": month_ago}}},
        {"$group": {
            "_id": None,
            "total_amount": {"$sum": "$amount_xof"},
            "count": {"$sum": 1},
            "avg_amount": {"$avg": "$amount_xof"}
        }}
    ]).to_list(1)
    
    payment_totals = payment_stats[0] if payment_stats else {"total_amount": 0, "count": 0, "avg_amount": 0}
    
    # Recent payments
    recent_payments = await db.carbon_payments.find().sort("created_at", -1).limit(10).to_list(10)
    recent_payments_list = []
    for p in recent_payments:
        member = await db.coop_members.find_one({"_id": ObjectId(p.get("member_id"))}) if p.get("member_id") else None
        recent_payments_list.append({
            "id": str(p["_id"]),
            "member_name": member.get("full_name") if member else "N/A",
            "amount": p.get("amount_xof", 0),
            "status": p.get("status", "pending"),
            "payment_ref": p.get("payment_ref", ""),
            "created_at": p.get("created_at").isoformat() if p.get("created_at") else None
        })
    
    # ===== REGIONAL METRICS =====
    # Parcels by region
    parcels_by_region = await db.parcels.aggregate([
        {"$group": {
            "_id": "$region",
            "count": {"$sum": 1},
            "total_area": {"$sum": "$area_hectares"},
            "avg_score": {"$avg": "$carbon_score"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]).to_list(10)
    
    # Cooperatives by region
    coops_by_region = await db.users.aggregate([
        {"$match": {"user_type": "cooperative"}},
        {"$group": {"_id": "$headquarters_region", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(10)
    
    # ===== AUDIT ACTIVITY =====
    audits_today = await db.carbon_audits.count_documents({"created_at": {"$gte": today}})
    audits_week = await db.carbon_audits.count_documents({"created_at": {"$gte": week_ago}})
    
    # Audits by recommendation
    audits_by_status = await db.carbon_audits.aggregate([
        {"$match": {"created_at": {"$gte": month_ago}}},
        {"$group": {"_id": "$recommendation", "count": {"$sum": 1}}}
    ]).to_list(10)
    
    # ===== ACTIVE USERS =====
    # Users who logged in today (simplified - would need login tracking)
    active_coops = await db.users.count_documents({
        "user_type": "cooperative",
        "last_login": {"$gte": today}
    }) if await db.users.find_one({"last_login": {"$exists": True}}) else 0
    
    # Total active entities
    total_coops = await db.users.count_documents({"user_type": "cooperative"})
    total_farmers = await db.coop_members.count_documents({})
    total_auditors = await db.users.count_documents({"user_type": "carbon_auditor"})
    total_parcels = await db.parcels.count_documents({})
    
    return {
        "timestamp": now.isoformat(),
        "ussd": {
            "requests_today": ussd_today,
            "requests_week": ussd_week,
            "by_command": {item["_id"]: item["count"] for item in ussd_by_type if item["_id"]},
            "pending_requests": {
                "parcels": pending_parcels,
                "harvests": pending_harvests
            }
        },
        "payments": {
            "today": payments_today,
            "week": payments_week,
            "month_total": round(payment_totals.get("total_amount", 0)),
            "month_count": payment_totals.get("count", 0),
            "avg_amount": round(payment_totals.get("avg_amount", 0)),
            "recent": recent_payments_list
        },
        "regions": {
            "parcels": [
                {
                    "region": r["_id"] or "Non défini",
                    "parcels": r["count"],
                    "area_ha": round(r["total_area"], 1),
                    "avg_score": round(r["avg_score"], 1) if r["avg_score"] else 0
                }
                for r in parcels_by_region
            ],
            "cooperatives": {r["_id"] or "Non défini": r["count"] for r in coops_by_region}
        },
        "audits": {
            "today": audits_today,
            "week": audits_week,
            "by_status": {item["_id"]: item["count"] for item in audits_by_status if item["_id"]}
        },
        "totals": {
            "cooperatives": total_coops,
            "farmers": total_farmers,
            "auditors": total_auditors,
            "parcels": total_parcels
        }
    }


@router.get("/admin/ussd-requests")
async def get_ussd_requests(
    request_type: str = "all",
    status: str = "pending",
    limit: int = 50,
    current_user: dict = Depends(get_admin_user)
):
    """Liste des requêtes USSD/SMS en attente"""
    
    results = []
    
    if request_type in ["all", "parcels"]:
        query = {} if status == "all" else {"status": status}
        parcels = await db.sms_parcel_requests.find(query).sort("created_at", -1).limit(limit).to_list(limit)
        for p in parcels:
            results.append({
                "id": str(p["_id"]),
                "type": "parcel",
                "phone": p.get("phone"),
                "farmer_id": p.get("farmer_id"),
                "details": {
                    "size": p.get("size_hectares"),
                    "location": p.get("location")
                },
                "status": p.get("status"),
                "created_at": p.get("created_at").isoformat() if p.get("created_at") else None
            })
    
    if request_type in ["all", "harvests"]:
        query = {} if status == "all" else {"status": status}
        harvests = await db.sms_harvest_requests.find(query).sort("created_at", -1).limit(limit).to_list(limit)
        for h in harvests:
            results.append({
                "id": str(h["_id"]),
                "type": "harvest",
                "phone": h.get("phone"),
                "farmer_id": h.get("farmer_id"),
                "details": {
                    "quantity_kg": h.get("quantity_kg")
                },
                "status": h.get("status"),
                "created_at": h.get("created_at").isoformat() if h.get("created_at") else None
            })
    
    # Sort by created_at
    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {
        "requests": results[:limit],
        "total": len(results)
    }


@router.post("/admin/ussd-requests/{request_id}/process")
async def process_ussd_request(
    request_id: str,
    action: str,  # "approve" or "reject"
    current_user: dict = Depends(get_admin_user)
):
    """Traiter une requête USSD (approuver ou rejeter)"""
    
    new_status = "approved" if action == "approve" else "rejected"
    
    # Try parcel requests first
    result = await db.sms_parcel_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": new_status, "processed_at": datetime.utcnow(), "processed_by": str(current_user["_id"])}}
    )
    
    if result.modified_count == 0:
        # Try harvest requests
        result = await db.sms_harvest_requests.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {"status": new_status, "processed_at": datetime.utcnow(), "processed_by": str(current_user["_id"])}}
        )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Requête non trouvée")
    
    return {"message": f"Requête {new_status}", "request_id": request_id}
