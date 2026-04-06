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
    """Get comprehensive platform statistics from real data"""
    # Users
    users_count = await db.users.count_documents({})
    user_types = await db.users.aggregate([
        {"$group": {"_id": "$user_type", "count": {"$sum": 1}}}
    ]).to_list(20)
    users_by_type = {ut["_id"]: ut["count"] for ut in user_types if ut["_id"]}

    # Cooperatives
    total_cooperatives = await db.users.count_documents({"user_type": {"$in": ["cooperative", "cooperative_admin"]}})

    # Farmers / Planteurs (from coop_members and users)
    total_members = await db.coop_members.count_documents({})
    total_farmer_users = await db.users.count_documents({"user_type": {"$in": ["producteur", "producer", "farmer"]}})

    # Agents terrain
    total_agents = await db.users.count_documents({"user_type": {"$in": ["field_agent", "agent_terrain"]}})
    total_coop_agents = await db.coop_agents.count_documents({})

    # Parcelles
    total_parcelles = await db.parcels.count_documents({})
    parcels_verified = await db.parcels.count_documents({"statut_verification": "verified"})
    # Superficie totale
    pipeline_surface = [{"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$area_hectares", 0]}}}}]
    surface_result = await db.parcels.aggregate(pipeline_surface).to_list(1)
    total_hectares = surface_result[0]["total"] if surface_result else 0

    # REDD visits
    total_redd_visits = await db.redd_tracking_visits.count_documents({})
    pipeline_redd = [{"$group": {"_id": None, "co2": {"$sum": {"$ifNull": ["$co2_tonnes", 0]}}, "score": {"$avg": {"$ifNull": ["$redd_score", 0]}}}}]
    redd_result = await db.redd_tracking_visits.aggregate(pipeline_redd).to_list(1)
    total_co2 = round(redd_result[0]["co2"], 2) if redd_result else 0
    avg_redd_score = round(redd_result[0]["score"], 1) if redd_result else 0

    # SSRTE visits
    total_ssrte_visits = await db.ssrte_visits.count_documents({})
    ssrte_high_risk = await db.ssrte_visits.count_documents({"niveau_risque": {"$in": ["critique", "eleve"]}})

    # USSD registrations
    total_registrations = await db.ussd_registrations.count_documents({})

    # Harvests
    total_harvests = await db.harvests.count_documents({})
    harvests_pending = await db.harvests.count_documents({"statut": "en_attente"})
    harvests_validated = await db.harvests.count_documents({"statut": "validee"})

    # Marketplace listings
    total_listings = await db.harvest_listings.count_documents({"status": "active"})

    # Partners
    partners_count = await db.partners.count_documents({})

    # Payment requests
    payment_requests = await db.payment_requests.count_documents({})
    payment_pending = await db.payment_requests.count_documents({"status": "pending"})

    return {
        "total_users": users_count,
        "total_cooperatives": total_cooperatives,
        "total_members": total_members,
        "total_farmer_users": total_farmer_users,
        "total_agents": total_agents,
        "total_coop_agents": total_coop_agents,
        "total_parcelles": total_parcelles,
        "parcels_verified": parcels_verified,
        "total_hectares": round(total_hectares, 1),
        "total_redd_visits": total_redd_visits,
        "total_co2_tonnes": total_co2,
        "avg_redd_score": avg_redd_score,
        "total_ssrte_visits": total_ssrte_visits,
        "ssrte_high_risk": ssrte_high_risk,
        "total_registrations": total_registrations,
        "total_harvests": total_harvests,
        "harvests_pending": harvests_pending,
        "harvests_validated": harvests_validated,
        "total_listings": total_listings,
        "total_partners": partners_count,
        "payment_requests": payment_requests,
        "payment_pending": payment_pending,
        "users_by_type": users_by_type
    }


# ============= USER MANAGEMENT =============

@router.get("/admin/users")
async def get_all_users(
    admin: dict = Depends(get_admin_user),
    user_type: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    skip: int = 0,
    limit: int = 100
):
    """Get all users with filtering and sorting"""
    query = {}
    
    if user_type and user_type != "all":
        query["user_type"] = user_type
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"full_name": {"$regex": search, "$options": "i"}}
        ]
    
    # Sort direction
    sort_dir = -1 if sort_order == "desc" else 1
    
    # Get users
    cursor = db.users.find(query).sort(sort_by, sort_dir).skip(skip).limit(limit)
    users = await cursor.to_list(limit)
    
    # Total count for pagination
    total = await db.users.count_documents(query)
    
    # Format users (exclude password, convert ObjectId)
    formatted_users = []
    for u in users:
        user_data = {
            "id": str(u["_id"]),
            "name": u.get("full_name") or u.get("name") or "Sans nom",
            "email": u.get("email") or "-",
            "phone": u.get("phone_number") or u.get("phone") or "-",
            "user_type": u.get("user_type") or "-",
            "status": "active" if u.get("is_active", True) else "inactive",
            "created_at": u.get("created_at"),
            "last_login": u.get("last_login"),
            "cooperative_id": u.get("cooperative_id"),
            "roles": u.get("roles", []),
            "is_verified": u.get("is_verified", False)
        }
        formatted_users.append(user_data)
    
    return {
        "users": formatted_users,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/admin/users/{user_id}")
async def get_user_details(user_id: str, admin: dict = Depends(get_admin_user)):
    """Get detailed user information"""
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID utilisateur invalide")
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Remove sensitive data
    user.pop("password", None)
    user["_id"] = str(user["_id"])
    
    return user


@router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a user"""
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID utilisateur invalide")
    
    # Check if user exists
    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Prevent deleting yourself
    if str(user.get("_id")) == str(admin.get("_id")):
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    
    # Delete user
    await db.users.delete_one({"_id": obj_id})
    
    return {"message": "Utilisateur supprimé avec succès", "deleted_id": user_id}


@router.delete("/admin/users/bulk/delete")
async def bulk_delete_users(user_ids: list[str], admin: dict = Depends(get_admin_user)):
    """Delete multiple users at once"""
    deleted_count = 0
    errors = []
    
    for user_id in user_ids:
        try:
            obj_id = ObjectId(user_id)
            
            # Check if trying to delete admin
            user = await db.users.find_one({"_id": obj_id})
            if user and str(user.get("_id")) == str(admin.get("_id")):
                errors.append({"id": user_id, "error": "Impossible de supprimer votre propre compte"})
                continue
            
            result = await db.users.delete_one({"_id": obj_id})
            if result.deleted_count > 0:
                deleted_count += 1
        except Exception as e:
            errors.append({"id": user_id, "error": str(e)})
    
    return {
        "message": f"{deleted_count} utilisateur(s) supprimé(s)",
        "deleted_count": deleted_count,
        "errors": errors
    }


@router.put("/admin/users/{user_id}/status")
async def update_user_status(user_id: str, status: str, admin: dict = Depends(get_admin_user)):
    """Update user status (active, suspended, banned)"""
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID utilisateur invalide")
    
    if status not in ["active", "suspended", "banned"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    result = await db.users.update_one(
        {"_id": obj_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return {"message": f"Statut mis à jour: {status}", "user_id": user_id}


@router.get("/admin/users/export/data")
async def export_users_data(
    admin: dict = Depends(get_admin_user),
    user_type: Optional[str] = None,
    format: str = "json"
):
    """Export users data for CSV/Excel generation"""
    query = {}
    if user_type and user_type != "all":
        query["user_type"] = user_type
    
    users = await db.users.find(query).to_list(1000)
    
    export_data = []
    for u in users:
        export_data.append({
            "Nom": u.get("name") or u.get("full_name") or "Sans nom",
            "Email": u.get("email") or "-",
            "Téléphone": u.get("phone") or "-",
            "Type": u.get("user_type") or "-",
            "Statut": u.get("status") or "active",
            "Date d'inscription": str(u.get("created_at", "-"))[:10],
            "Dernière connexion": str(u.get("last_login", "-"))[:10] if u.get("last_login") else "-",
            "Vérifié": "Oui" if u.get("is_verified") else "Non"
        })
    
    return {
        "data": export_data,
        "total": len(export_data),
        "exported_at": datetime.utcnow().isoformat()
    }


# ============= TESTIMONIALS MANAGEMENT =============

@router.get("/testimonials")
async def get_testimonials():
    """Get all testimonials (public endpoint)"""
    testimonials = await db.testimonials.find({"is_active": True}).sort("order", 1).to_list(10)
    for t in testimonials:
        t["_id"] = str(t["_id"])
    return testimonials


@router.get("/admin/testimonials")
async def get_all_testimonials(admin: dict = Depends(get_admin_user)):
    """Get all testimonials for admin"""
    testimonials = await db.testimonials.find().sort("created_at", -1).to_list(100)
    for t in testimonials:
        t["_id"] = str(t["_id"])
    return testimonials


@router.post("/admin/testimonials")
async def create_testimonial(testimonial: dict, admin: dict = Depends(get_admin_user)):
    """Create a new testimonial"""
    testimonial_data = {
        "text": testimonial.get("text"),
        "author": testimonial.get("author"),
        "role": testimonial.get("role"),
        "initial": testimonial.get("initial") or testimonial.get("author", "U")[0].upper(),
        "color": testimonial.get("color", "bg-[#2d5a4d]"),
        "is_active": testimonial.get("is_active", True),
        "order": testimonial.get("order", 0),
        "created_at": datetime.utcnow(),
        "created_by": str(admin.get("_id"))
    }
    
    result = await db.testimonials.insert_one(testimonial_data)
    testimonial_data["_id"] = str(result.inserted_id)
    
    return testimonial_data


@router.put("/admin/testimonials/{testimonial_id}")
async def update_testimonial(testimonial_id: str, testimonial: dict, admin: dict = Depends(get_admin_user)):
    """Update a testimonial"""
    try:
        obj_id = ObjectId(testimonial_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID invalide")
    
    update_data = {
        "text": testimonial.get("text"),
        "author": testimonial.get("author"),
        "role": testimonial.get("role"),
        "initial": testimonial.get("initial"),
        "color": testimonial.get("color"),
        "is_active": testimonial.get("is_active"),
        "order": testimonial.get("order"),
        "updated_at": datetime.utcnow()
    }
    # Remove None values
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = await db.testimonials.update_one({"_id": obj_id}, {"$set": update_data})
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Témoignage non trouvé")
    
    return {"message": "Témoignage mis à jour", "id": testimonial_id}


@router.delete("/admin/testimonials/{testimonial_id}")
async def delete_testimonial(testimonial_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a testimonial"""
    try:
        obj_id = ObjectId(testimonial_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID invalide")
    
    result = await db.testimonials.delete_one({"_id": obj_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Témoignage non trouvé")
    
    return {"message": "Témoignage supprimé", "id": testimonial_id}


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
            "month_total": round(payment_totals.get("total_amount", 0) or 0),
            "month_count": payment_totals.get("count", 0) or 0,
            "avg_amount": round(payment_totals.get("avg_amount", 0) or 0),
            "recent": recent_payments_list
        },
        "regions": {
            "parcels": [
                {
                    "region": r["_id"] or "Non défini",
                    "parcels": r["count"],
                    "area_ha": round(r.get("total_area", 0) or 0, 1),
                    "avg_score": round(r.get("avg_score", 0) or 0, 1)
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


# ============= ADMIN: FARMER-AGENT ASSIGNMENT =============

class AdminAssignFarmersRequest(BaseModel):
    agent_id: str
    farmer_ids: list[str]

@router.get("/admin/agents")
async def admin_list_agents(admin: dict = Depends(get_admin_user)):
    """Liste tous les agents terrain (toutes cooperatives)"""
    agents = await db.coop_agents.find(
        {}, {"_id": 1, "full_name": 1, "phone_number": 1, "zone": 1, "coop_id": 1, "assigned_farmers": 1, "is_active": 1}
    ).to_list(500)
    result = []
    for a in agents:
        coop_name = "N/A"
        raw_coop_id = a.get("coop_id")
        if raw_coop_id:
            clean_id = str(raw_coop_id).strip("'\"")
            if ObjectId.is_valid(clean_id):
                coop = await db.users.find_one({"_id": ObjectId(clean_id)}, {"_id": 0, "cooperative_name": 1, "full_name": 1})
                if coop:
                    coop_name = coop.get("cooperative_name") or coop.get("full_name", "N/A")
        result.append({
            "id": str(a["_id"]),
            "full_name": a.get("full_name", "").strip("'\""),
            "phone_number": a.get("phone_number", "").strip("'\"") if a.get("phone_number") else "",
            "zone": a.get("zone", "").strip("'\"") if a.get("zone") else "",
            "is_active": a.get("is_active", True),
            "cooperative_name": coop_name,
            "assigned_farmers_count": len(a.get("assigned_farmers", [])),
        })
    return {"agents": result}

@router.get("/admin/all-farmers")
async def admin_list_all_farmers(admin: dict = Depends(get_admin_user), search: str = ""):
    """Liste tous les agriculteurs inscrits (membres + non-membres)"""
    query = {}
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"phone_number": {"$regex": search, "$options": "i"}},
            {"village": {"$regex": search, "$options": "i"}},
        ]
    
    # Fetch from coop_members (registered farmers)
    members = await db.coop_members.find(query, {
        "_id": 1, "full_name": 1, "phone_number": 1, "village": 1, "zone": 1, "coop_id": 1, "is_active": 1
    }).to_list(500)
    
    # Also fetch from users with type producteur
    user_query = {"user_type": "producteur"}
    if search:
        user_query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"phone_number": {"$regex": search, "$options": "i"}},
        ]
    producers = await db.users.find(user_query, {
        "_id": 1, "full_name": 1, "phone_number": 1
    }).to_list(200)
    
    # Build results with dedup by phone
    seen_phones = set()
    result = []
    
    for m in members:
        phone = m.get("phone_number", "")
        if phone:
            seen_phones.add(phone)
        coop = None
        if m.get("coop_id"):
            coop = await db.users.find_one({"_id": ObjectId(m["coop_id"]) if ObjectId.is_valid(str(m["coop_id"])) else m["coop_id"]}, {"_id": 0, "cooperative_name": 1})
        result.append({
            "id": str(m["_id"]),
            "full_name": m.get("full_name", ""),
            "phone_number": phone,
            "village": m.get("village", ""),
            "zone": m.get("zone", ""),
            "source": "coop_member",
            "cooperative_name": coop.get("cooperative_name", "N/A") if coop else "Non-membre",
            "is_active": m.get("is_active", True),
        })
    
    for p in producers:
        phone = p.get("phone_number", "")
        if phone and phone in seen_phones:
            continue
        result.append({
            "id": str(p["_id"]),
            "full_name": p.get("full_name", ""),
            "phone_number": phone,
            "village": "",
            "zone": "",
            "source": "user_producteur",
            "cooperative_name": "Non-membre",
            "is_active": True,
        })
    
    return {"farmers": result, "total": len(result)}

@router.post("/admin/assign-farmers-to-agent")
async def admin_assign_farmers_to_agent(body: AdminAssignFarmersRequest, admin: dict = Depends(get_admin_user)):
    """Super Admin: assigner n'importe quel agriculteur a n'importe quel agent (sans restriction cooperative)"""
    if not ObjectId.is_valid(body.agent_id):
        raise HTTPException(status_code=400, detail="ID agent invalide")
    
    agent = await db.coop_agents.find_one({"_id": ObjectId(body.agent_id)})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent non trouve")
    
    if not body.farmer_ids:
        raise HTTPException(status_code=400, detail="Liste de fermiers vide")
    
    valid_ids = [fid for fid in body.farmer_ids if ObjectId.is_valid(fid)]
    if not valid_ids:
        raise HTTPException(status_code=400, detail="Aucun ID fermier valide")
    
    # Verify farmers exist (in coop_members OR users)
    verified = []
    for fid in valid_ids:
        member = await db.coop_members.find_one({"_id": ObjectId(fid)})
        if not member:
            member = await db.users.find_one({"_id": ObjectId(fid), "user_type": "producteur"})
        if member:
            verified.append(fid)
    
    if not verified:
        raise HTTPException(status_code=400, detail="Aucun agriculteur valide trouve")
    
    # Unassign from any other agent first
    await db.coop_agents.update_many(
        {},
        {"$pull": {"assigned_farmers": {"$in": verified}}}
    )
    
    # Assign to this agent
    await db.coop_agents.update_one(
        {"_id": ObjectId(body.agent_id)},
        {"$addToSet": {"assigned_farmers": {"$each": verified}}}
    )
    
    updated = await db.coop_agents.find_one({"_id": ObjectId(body.agent_id)})
    
    # Envoyer email notification a l'agent
    try:
        import asyncio as _asyncio
        from services.notification_email_helper import send_notification_email_async
        # Recuperer les noms des agriculteurs assignes
        farmer_names = []
        for fid in verified:
            m = await db.coop_members.find_one({"_id": ObjectId(fid)})
            if not m:
                m = await db.users.find_one({"_id": ObjectId(fid)})
            if m:
                farmer_names.append(m.get("full_name") or m.get("name") or "Agriculteur")
        agent_user_id = updated.get("user_id")
        _asyncio.create_task(send_notification_email_async(db, "farmer_assigned",
            agent_id=agent_user_id or str(updated.get("_id")),
            farmer_names=farmer_names,
            assigned_by=admin.get("full_name", "Administrateur")
        ))
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Assignment email notification failed: {e}")
    
    return {
        "message": f"{len(verified)} agriculteur(s) assigne(s) a {agent.get('full_name', 'agent')}",
        "assigned_count": len(updated.get("assigned_farmers", [])),
        "assigned_ids": verified
    }
