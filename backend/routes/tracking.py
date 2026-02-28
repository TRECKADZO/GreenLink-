"""
Order Tracking and SMS OTP Service for GreenLink
Provides real-time order tracking and SMS verification for payments
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
from pydantic import BaseModel
import secrets
import logging

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tracking", tags=["tracking"])


# ============= MODELS =============

class TrackingUpdate(BaseModel):
    status: str
    location: Optional[str] = None
    note: Optional[str] = None
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    estimated_delivery: Optional[str] = None

class ShipmentInfo(BaseModel):
    carrier: str
    tracking_number: str
    shipping_method: str = "standard"  # standard, express, same_day
    estimated_delivery: Optional[str] = None

class OTPRequest(BaseModel):
    phone_number: str
    purpose: str = "payment"  # payment, transfer, withdrawal

class OTPVerify(BaseModel):
    phone_number: str
    otp_code: str
    purpose: str = "payment"


# ============= ORDER TRACKING ENDPOINTS =============

@router.get("/orders/{order_id}")
async def get_detailed_tracking(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed order tracking with location and carrier info"""
    order = await db.orders.find_one({
        "_id": ObjectId(order_id),
        "$or": [
            {"buyer_id": current_user["_id"]},
            {"supplier_id": current_user["_id"]}
        ]
    })
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Get all tracking events
    tracking_events = await db.order_tracking.find(
        {"order_id": order_id}
    ).sort("timestamp", -1).to_list(50)
    
    # Format tracking events
    events = []
    for event in tracking_events:
        events.append({
            "status": event.get("status"),
            "location": event.get("location"),
            "note": event.get("note"),
            "timestamp": event.get("timestamp").isoformat() if event.get("timestamp") else None,
            "carrier": event.get("carrier")
        })
    
    # Get shipment info
    shipment = await db.order_shipments.find_one({"order_id": order_id})
    
    # Build status timeline
    status_flow = [
        {"status": "pending", "label": "Commande reçue", "icon": "receipt"},
        {"status": "confirmed", "label": "Confirmée", "icon": "check-circle"},
        {"status": "processing", "label": "En préparation", "icon": "package"},
        {"status": "shipped", "label": "Expédiée", "icon": "truck"},
        {"status": "in_transit", "label": "En transit", "icon": "navigation"},
        {"status": "out_for_delivery", "label": "En livraison", "icon": "map-pin"},
        {"status": "delivered", "label": "Livrée", "icon": "check-square"}
    ]
    
    current_status = order.get("status", "pending")
    current_idx = next((i for i, s in enumerate(status_flow) if s["status"] == current_status), 0)
    
    timeline = []
    for i, step in enumerate(status_flow):
        step_event = next((e for e in tracking_events if e.get("status") == step["status"]), None)
        timeline.append({
            **step,
            "completed": i <= current_idx,
            "current": i == current_idx,
            "timestamp": step_event.get("timestamp").isoformat() if step_event and step_event.get("timestamp") else None,
            "location": step_event.get("location") if step_event else None
        })
    
    return {
        "order_id": str(order["_id"]),
        "order_number": order.get("order_number"),
        "status": current_status,
        "timeline": timeline,
        "events": events,
        "shipment": {
            "carrier": shipment.get("carrier") if shipment else None,
            "tracking_number": shipment.get("tracking_number") if shipment else None,
            "shipping_method": shipment.get("shipping_method") if shipment else "standard",
            "estimated_delivery": shipment.get("estimated_delivery") if shipment else order.get("estimated_delivery")
        } if shipment or order.get("estimated_delivery") else None,
        "delivery": {
            "address": order.get("delivery_address"),
            "city": order.get("delivery_city"),
            "phone": order.get("delivery_phone"),
            "instructions": order.get("delivery_instructions")
        },
        "items_count": len(order.get("items", [])),
        "total_amount": order.get("total_amount", 0),
        "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
    }


@router.post("/orders/{order_id}/ship")
async def add_shipment_info(
    order_id: str,
    shipment: ShipmentInfo,
    current_user: dict = Depends(get_current_user)
):
    """Add shipment information to order (supplier only)"""
    if current_user.get("user_type") != "fournisseur":
        raise HTTPException(status_code=403, detail="Seuls les fournisseurs peuvent ajouter des infos d'expédition")
    
    order = await db.orders.find_one({
        "_id": ObjectId(order_id),
        "supplier_id": current_user["_id"]
    })
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Save shipment info
    await db.order_shipments.update_one(
        {"order_id": order_id},
        {
            "$set": {
                "order_id": order_id,
                "carrier": shipment.carrier,
                "tracking_number": shipment.tracking_number,
                "shipping_method": shipment.shipping_method,
                "estimated_delivery": shipment.estimated_delivery,
                "shipped_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    # Update order status
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "status": "shipped",
                "estimated_delivery": shipment.estimated_delivery,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Add tracking event
    await db.order_tracking.insert_one({
        "order_id": order_id,
        "status": "shipped",
        "note": f"Expédié via {shipment.carrier}. N° suivi: {shipment.tracking_number}",
        "carrier": shipment.carrier,
        "timestamp": datetime.utcnow(),
        "updated_by": current_user["_id"]
    })
    
    # Notify buyer
    await db.notifications.insert_one({
        "user_id": order["buyer_id"],
        "title": "Commande expédiée! 📦",
        "message": f"Votre commande #{order['order_number']} est en route. Transporteur: {shipment.carrier}",
        "type": "order_shipped",
        "action_url": f"/order-tracking/{order_id}",
        "is_read": False,
        "created_at": datetime.utcnow()
    })
    
    return {
        "message": "Informations d'expédition ajoutées",
        "tracking_number": shipment.tracking_number,
        "carrier": shipment.carrier
    }


@router.post("/orders/{order_id}/update")
async def add_tracking_update(
    order_id: str,
    update: TrackingUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Add a tracking update with location (supplier only)"""
    if current_user.get("user_type") != "fournisseur":
        raise HTTPException(status_code=403, detail="Seuls les fournisseurs peuvent mettre à jour le suivi")
    
    order = await db.orders.find_one({
        "_id": ObjectId(order_id),
        "supplier_id": current_user["_id"]
    })
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    valid_statuses = ["pending", "confirmed", "processing", "shipped", "in_transit", "out_for_delivery", "delivered", "cancelled"]
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    # Update order status
    update_data = {
        "status": update.status,
        "updated_at": datetime.utcnow()
    }
    if update.estimated_delivery:
        update_data["estimated_delivery"] = update.estimated_delivery
    
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": update_data}
    )
    
    # Add tracking event
    await db.order_tracking.insert_one({
        "order_id": order_id,
        "status": update.status,
        "location": update.location,
        "note": update.note,
        "carrier": update.carrier,
        "timestamp": datetime.utcnow(),
        "updated_by": current_user["_id"]
    })
    
    # Status-specific notifications
    status_messages = {
        "confirmed": ("Commande confirmée ✅", "Le fournisseur a confirmé votre commande"),
        "processing": ("En préparation 📦", "Votre commande est en cours de préparation"),
        "shipped": ("Expédiée 🚚", "Votre commande est en route"),
        "in_transit": ("En transit 🛣️", f"Votre commande est à {update.location or 'en route'}"),
        "out_for_delivery": ("En livraison 🏃", "Votre commande arrive aujourd'hui!"),
        "delivered": ("Livrée ✅", "Votre commande a été livrée avec succès")
    }
    
    if update.status in status_messages:
        title, message = status_messages[update.status]
        await db.notifications.insert_one({
            "user_id": order["buyer_id"],
            "title": title,
            "message": f"#{order['order_number']}: {message}",
            "type": "tracking_update",
            "action_url": f"/order-tracking/{order_id}",
            "is_read": False,
            "created_at": datetime.utcnow()
        })
    
    return {
        "message": "Suivi mis à jour",
        "status": update.status,
        "location": update.location
    }


@router.get("/supplier/orders")
async def get_supplier_orders_for_tracking(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user)
):
    """Get all orders for supplier with tracking management"""
    if current_user.get("user_type") != "fournisseur":
        raise HTTPException(status_code=403, detail="Accès réservé aux fournisseurs")
    
    query = {"supplier_id": current_user["_id"]}
    if status_filter:
        query["status"] = status_filter
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(100)
    
    result = []
    for order in orders:
        # Get latest tracking event
        latest_event = await db.order_tracking.find_one(
            {"order_id": str(order["_id"])},
            sort=[("timestamp", -1)]
        )
        
        # Get shipment info
        shipment = await db.order_shipments.find_one({"order_id": str(order["_id"])})
        
        result.append({
            "id": str(order["_id"]),
            "order_number": order.get("order_number"),
            "buyer_name": order.get("buyer_name"),
            "status": order.get("status"),
            "total_amount": order.get("total_amount"),
            "items_count": len(order.get("items", [])),
            "delivery_address": order.get("delivery_address"),
            "delivery_city": order.get("delivery_city"),
            "delivery_phone": order.get("delivery_phone"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None,
            "estimated_delivery": order.get("estimated_delivery"),
            "last_update": {
                "location": latest_event.get("location") if latest_event else None,
                "timestamp": latest_event.get("timestamp").isoformat() if latest_event and latest_event.get("timestamp") else None
            },
            "shipment": {
                "carrier": shipment.get("carrier") if shipment else None,
                "tracking_number": shipment.get("tracking_number") if shipment else None
            } if shipment else None
        })
    
    # Count by status
    status_counts = {}
    for s in ["pending", "confirmed", "processing", "shipped", "in_transit", "out_for_delivery", "delivered"]:
        count = await db.orders.count_documents({"supplier_id": current_user["_id"], "status": s})
        status_counts[s] = count
    
    return {
        "orders": result,
        "total": len(result),
        "status_counts": status_counts
    }


# ============= SMS OTP ENDPOINTS =============

@router.post("/otp/request")
async def request_otp(
    request: OTPRequest,
    current_user: dict = Depends(get_current_user)
):
    """Request an OTP code for secure payment verification"""
    # Generate 6-digit OTP
    otp_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    # Store OTP with 5-minute expiration
    expiration = datetime.utcnow() + timedelta(minutes=5)
    
    await db.otp_codes.update_one(
        {
            "user_id": current_user["_id"],
            "phone_number": request.phone_number,
            "purpose": request.purpose
        },
        {
            "$set": {
                "user_id": current_user["_id"],
                "phone_number": request.phone_number,
                "purpose": request.purpose,
                "code": otp_code,
                "expires_at": expiration,
                "verified": False,
                "created_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    # In production: Send SMS via Orange API
    logger.info(f"[SMS OTP] Code {otp_code} sent to {request.phone_number} for {request.purpose}")
    
    # Store for SMS service (would be picked up by SMS worker)
    await db.pending_sms.insert_one({
        "phone_number": request.phone_number,
        "message": f"GreenLink: Votre code de vérification est {otp_code}. Valide 5 minutes. Ne partagez pas ce code.",
        "type": "otp",
        "status": "pending",
        "created_at": datetime.utcnow()
    })
    
    return {
        "message": "Code OTP envoyé",
        "expires_in": 300,  # 5 minutes in seconds
        "phone_masked": f"***{request.phone_number[-4:]}",
        # SIMULATION MODE
        "simulation_code": otp_code
    }


@router.post("/otp/verify")
async def verify_otp(
    request: OTPVerify,
    current_user: dict = Depends(get_current_user)
):
    """Verify OTP code"""
    otp_record = await db.otp_codes.find_one({
        "user_id": current_user["_id"],
        "phone_number": request.phone_number,
        "purpose": request.purpose,
        "code": request.otp_code,
        "verified": False,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Code OTP invalide ou expiré")
    
    # Mark as verified
    await db.otp_codes.update_one(
        {"_id": otp_record["_id"]},
        {"$set": {"verified": True, "verified_at": datetime.utcnow()}}
    )
    
    # Generate a verification token valid for 10 minutes
    verification_token = secrets.token_urlsafe(32)
    
    await db.otp_verifications.insert_one({
        "user_id": current_user["_id"],
        "phone_number": request.phone_number,
        "purpose": request.purpose,
        "token": verification_token,
        "expires_at": datetime.utcnow() + timedelta(minutes=10),
        "created_at": datetime.utcnow()
    })
    
    logger.info(f"[SMS OTP] Code verified for {request.phone_number}")
    
    return {
        "verified": True,
        "message": "Code vérifié avec succès",
        "verification_token": verification_token,
        "valid_for": 600  # 10 minutes
    }


@router.post("/otp/validate-token")
async def validate_verification_token(
    token: str,
    purpose: str,
    current_user: dict = Depends(get_current_user)
):
    """Validate a verification token before processing sensitive operation"""
    verification = await db.otp_verifications.find_one({
        "user_id": current_user["_id"],
        "token": token,
        "purpose": purpose,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not verification:
        raise HTTPException(status_code=400, detail="Token de vérification invalide ou expiré")
    
    return {
        "valid": True,
        "phone_number": verification.get("phone_number"),
        "purpose": purpose
    }
