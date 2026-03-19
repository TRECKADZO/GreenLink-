"""
Orange Money Payment Integration Routes
Supports both simulation mode and real API integration
"""
from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from typing import Optional
import os
import uuid
import logging
import hmac
import hashlib
import base64
from database import db
from routes.auth import get_current_user
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from services.orange_money import orange_money_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["payments"])

# ============= PYDANTIC MODELS =============

class PaymentInitRequest(BaseModel):
    order_ids: list[str]
    customer_phone: str
    customer_email: Optional[str] = None
    
class PaymentStatusRequest(BaseModel):
    merchant_reference: str

# ============= PAYMENT ROUTES =============

@router.post("/initiate")
async def initiate_payment(
    request: PaymentInitRequest,
    current_user: dict = Depends(get_current_user)
):
    """Initiate Orange Money payment for orders"""
    
    # Get orders and calculate total
    orders = []
    total_amount = 0
    
    for order_id in request.order_ids:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(status_code=404, detail=f"Commande {order_id} non trouvée")
        if order["buyer_id"] != current_user["_id"]:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        if order.get("payment_status") == "paid":
            raise HTTPException(status_code=400, detail=f"Commande {order_id} déjà payée")
        orders.append(order)
        total_amount += order["total_amount"]
    
    # Generate unique merchant reference
    merchant_reference = f"GL_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8].upper()}"
    
    # Get base URL from environment or request
    base_url = os.environ.get('BASE_URL', 'https://mobile-bug-sprint.preview.emergentagent.com')
    
    return_url = f"{base_url}/payment/return?ref={merchant_reference}"
    cancel_url = f"{base_url}/payment/cancel?ref={merchant_reference}"
    notification_url = f"{base_url}/api/payments/webhook"
    
    try:
        # Initiate with Orange Money
        orange_response = await orange_money_service.initiate_payment(
            order_id=",".join(request.order_ids),
            amount=total_amount,
            customer_phone=request.customer_phone,
            merchant_reference=merchant_reference,
            return_url=return_url,
            cancel_url=cancel_url,
            notification_url=notification_url
        )
        
        # Store payment record
        payment = {
            "merchant_reference": merchant_reference,
            "order_ids": request.order_ids,
            "user_id": current_user["_id"],
            "amount": total_amount,
            "currency": "XOF",
            "customer_phone": request.customer_phone,
            "customer_email": request.customer_email or current_user.get("email"),
            "status": "initiated",
            "payment_method": "orange_money",
            "simulation_mode": not orange_money_service.is_configured,
            "return_url": return_url,
            "cancel_url": cancel_url,
            "notification_url": notification_url,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.payments.insert_one(payment)
        
        # Update orders with payment reference
        for order_id in request.order_ids:
            await db.orders.update_one(
                {"_id": ObjectId(order_id)},
                {"$set": {
                    "payment_reference": merchant_reference,
                    "payment_status": "pending",
                    "updated_at": datetime.utcnow()
                }}
            )
        
        return {
            "success": True,
            "merchant_reference": merchant_reference,
            "payment_token": orange_response.get("token"),
            "payment_url": orange_response.get("payment_url"),
            "amount": total_amount,
            "currency": "XOF",
            "simulation_mode": not orange_money_service.is_configured,
            "message": orange_response.get("message", "Redirection vers Orange Money...")
        }
        
    except Exception as e:
        logger.error(f"Payment initiation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{merchant_reference}")
async def get_payment_status(
    merchant_reference: str,
    current_user: dict = Depends(get_current_user)
):
    """Get payment status"""
    
    payment = await db.payments.find_one({"merchant_reference": merchant_reference})
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    if payment["user_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    return {
        "merchant_reference": merchant_reference,
        "status": payment["status"],
        "amount": payment["amount"],
        "currency": payment["currency"],
        "order_ids": payment["order_ids"],
        "created_at": payment["created_at"],
        "confirmed_at": payment.get("confirmed_at"),
        "transaction_id": payment.get("transaction_id"),
        "simulation_mode": payment.get("simulation_mode", False)
    }

@router.post("/webhook")
async def payment_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """Webhook endpoint for Orange Money notifications"""
    
    body = await request.body()
    signature = request.headers.get("X-Signature-SHA256", "")
    
    # In simulation mode, we trust all webhooks from our system
    if orange_money_service.is_configured:
        merchant_key = orange_money_service.merchant_key
        expected = base64.b64encode(
            hmac.new(
                merchant_key.encode('utf-8'),
                body,
                hashlib.sha256
            ).digest()
        ).decode('utf-8')
        if not hmac.compare_digest(expected, signature):
            logger.warning("Invalid webhook signature")
            return {"status": "rejected", "reason": "invalid_signature"}
    
    try:
        import json
        payload = json.loads(body)
    except json.JSONDecodeError:
        return {"status": "rejected", "reason": "invalid_json"}
    
    merchant_reference = payload.get("reference") or payload.get("merchant_reference")
    transaction_id = payload.get("transId") or payload.get("transaction_id")
    payment_status = payload.get("status", "").upper()
    
    # Find payment
    payment = await db.payments.find_one({"merchant_reference": merchant_reference})
    if not payment:
        logger.warning(f"Unknown payment reference: {merchant_reference}")
        return {"status": "ok"}
    
    # Map status
    status_map = {
        "SUCCESSFUL": "paid",
        "SUCCESS": "paid",
        "PAID": "paid",
        "FAILED": "failed",
        "CANCELLED": "cancelled",
        "EXPIRED": "expired"
    }
    
    new_status = status_map.get(payment_status, "pending")
    
    # Update payment
    update_data = {
        "status": new_status,
        "updated_at": datetime.utcnow()
    }
    
    if transaction_id:
        update_data["transaction_id"] = transaction_id
    
    if new_status == "paid":
        update_data["confirmed_at"] = datetime.utcnow()
        
        # Update all related orders
        for order_id in payment["order_ids"]:
            await db.orders.update_one(
                {"_id": ObjectId(order_id)},
                {"$set": {
                    "payment_status": "paid",
                    "status": "confirmed",
                    "updated_at": datetime.utcnow()
                }}
            )
            
            # Get order for notification
            order = await db.orders.find_one({"_id": ObjectId(order_id)})
            if order:
                # Notify supplier
                await db.notifications.insert_one({
                    "user_id": order["supplier_id"],
                    "title": "Paiement reçu",
                    "message": f"Paiement de {order['total_amount']:,.0f} XOF reçu pour commande #{order['order_number']}",
                    "type": "payment",
                    "action_url": "/supplier/orders",
                    "created_at": datetime.utcnow(),
                    "is_read": False
                })
                
                # Notify buyer
                await db.notifications.insert_one({
                    "user_id": order["buyer_id"],
                    "title": "Paiement confirmé",
                    "message": f"Votre paiement de {order['total_amount']:,.0f} XOF a été confirmé",
                    "type": "payment",
                    "action_url": "/buyer/orders",
                    "created_at": datetime.utcnow(),
                    "is_read": False
                })
        
        logger.info(f"Payment confirmed: {merchant_reference}")
    
    await db.payments.update_one(
        {"merchant_reference": merchant_reference},
        {"$set": update_data}
    )
    
    return {"status": "ok"}

# ============= SIMULATION ENDPOINTS =============

@router.post("/simulate/{payment_token}")
async def simulate_payment_completion(
    payment_token: str,
    action: str = "success"  # success, fail, cancel
):
    """Simulate payment completion (for testing without real Orange Money)"""
    
    if orange_money_service.is_configured:
        raise HTTPException(status_code=400, detail="Simulation non disponible en mode production")
    
    # Find payment by token pattern in reference
    # Payment token format: SIM_XXXXXXXXXXXX
    # We stored it as part of the initiation, need to find by recent created
    payment = await db.payments.find_one({
        "simulation_mode": True,
        "status": "initiated"
    }, sort=[("created_at", -1)])
    
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    # Simulate webhook
    # Create simulated transaction ID
    transaction_id = f"SIMTX_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    
    # Process the simulated payment
    new_status = "paid" if action == "success" else ("failed" if action == "fail" else "cancelled")
    
    update_data = {
        "status": new_status,
        "transaction_id": transaction_id,
        "updated_at": datetime.utcnow()
    }
    
    if new_status == "paid":
        update_data["confirmed_at"] = datetime.utcnow()
        
        # Update orders
        for order_id in payment["order_ids"]:
            await db.orders.update_one(
                {"_id": ObjectId(order_id)},
                {"$set": {
                    "payment_status": "paid",
                    "status": "confirmed",
                    "updated_at": datetime.utcnow()
                }}
            )
            
            order = await db.orders.find_one({"_id": ObjectId(order_id)})
            if order:
                # Notifications
                await db.notifications.insert_one({
                    "user_id": order["supplier_id"],
                    "title": "Paiement reçu (Simulation)",
                    "message": f"Paiement simulé de {order['total_amount']:,.0f} XOF pour #{order['order_number']}",
                    "type": "payment",
                    "action_url": "/supplier/orders",
                    "created_at": datetime.utcnow(),
                    "is_read": False
                })
    
    await db.payments.update_one(
        {"merchant_reference": payment["merchant_reference"]},
        {"$set": update_data}
    )
    
    return {
        "success": new_status == "paid",
        "status": new_status,
        "transaction_id": transaction_id,
        "merchant_reference": payment["merchant_reference"],
        "message": f"Paiement {'confirmé' if new_status == 'paid' else 'échoué'} (simulation)"
    }

@router.get("/simulation-status")
async def get_simulation_status():
    """Check if system is in simulation mode"""
    is_mock = not orange_money_service.is_configured
    return {
        "simulation_mode": is_mock,
        "message": "Mode simulation activé - Les paiements sont simulés" if is_mock else "Mode production - Paiements réels via Orange Money"
    }


@router.get("/integrations-status")
async def get_integrations_status(current_user: dict = Depends(get_current_user)):
    """Admin-only: statut de toutes les intégrations Orange/USSD"""
    if current_user.get("user_type") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    from services.orange_sms import orange_sms
    from services.ussd_gateway import ussd_gateway_service

    return {
        "orange_money": orange_money_service.get_status(),
        "orange_sms": orange_sms.get_status(),
        "ussd_gateway": ussd_gateway_service.get_status(),
        "all_configured": (
            orange_money_service.is_configured
            and orange_sms.is_configured
            and ussd_gateway_service.is_configured
        ),
    }
