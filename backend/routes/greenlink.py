from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
import os
import logging
from database import db
from greenlink_models import (
    Parcel, ParcelCreate, Harvest, HarvestCreate, PaymentRequest,
    BuyerOrder, BuyerOrderCreate, BuyerOrderInDB, TraceabilityReport,
    CarbonCredit, CarbonCreditCreate, CarbonPurchaseCreate, CarbonPurchaseInDB,
    ImpactDashboard, USSDSession
)
from routes.auth import get_current_user
from services.sms_service import SMSService
from services.fcm_service import send_notification_to_user
from datetime import datetime, timedelta
from bson import ObjectId
import random
import hashlib

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/greenlink", tags=["greenlink"])

# ============= AGRICULTEUR ROUTES =============

@router.post("/parcels", response_model=Parcel)
async def declare_parcel(
    parcel: ParcelCreate,
    current_user: dict = Depends(get_current_user)
):
    """Déclarer une nouvelle parcelle agricole"""
    parcel_dict = parcel.dict()
    
    # Si un member_id est fourni (par une coopérative), l'utiliser comme farmer_id
    if parcel.member_id:
        parcel_dict["farmer_id"] = parcel.member_id
        parcel_dict["registered_by"] = current_user["_id"]  # Qui a enregistré
        parcel_dict["registered_by_type"] = current_user.get("user_type", "unknown")
    else:
        parcel_dict["farmer_id"] = current_user["_id"]
    
    parcel_dict["created_at"] = datetime.utcnow()
    parcel_dict["updated_at"] = datetime.utcnow()
    parcel_dict["is_active"] = True
    parcel_dict["verification_status"] = "pending"
    
    # Calculate carbon score based on practices
    carbon_score = calculate_carbon_score(parcel_dict["farming_practices"], parcel_dict["area_hectares"])
    parcel_dict["carbon_score"] = carbon_score
    parcel_dict["carbon_credits_earned"] = carbon_score * parcel_dict["area_hectares"] * 0.5  # tonnes CO2
    
    result = await db.parcels.insert_one(parcel_dict)
    parcel_dict["_id"] = str(result.inserted_id)
    
    # Create notification
    await db.notifications.insert_one({
        "user_id": current_user["_id"],
        "title": "Parcelle déclarée",
        "message": f"Votre parcelle de {parcel.area_hectares} ha a été enregistrée. Score carbone: {carbon_score:.1f}/10",
        "type": "parcel",
        "action_url": f"/farmer/parcels/{str(result.inserted_id)}",
        "created_at": datetime.utcnow(),
        "is_read": False
    })
    
    # Send SMS notification if carbon score is premium eligible (>=7)
    if carbon_score >= 7 and parcel.phone_number:
        try:
            sms_result = await SMSService.notify_carbon_premium_eligible(
                phone_number=parcel.phone_number,
                farmer_name=parcel.farmer_name,
                parcel_id=str(result.inserted_id),
                carbon_score=carbon_score,
                language=parcel.language
            )
            logger.info(f"SMS sent for premium eligible parcel: {sms_result}")
        except Exception as e:
            logger.error(f"SMS notification failed: {e}")
    
    # Send push notification to farmer's registered devices
    try:
        push_result = await send_notification_to_user(
            db=db,
            user_id=current_user["_id"],
            title="Parcelle déclarée 🌳",
            body=f"Parcelle de {parcel.area_hectares} ha enregistrée. Score carbone: {carbon_score:.1f}/10",
            data={
                "type": "parcel_created",
                "parcel_id": str(result.inserted_id),
                "carbon_score": carbon_score,
                "screen": "Parcels"
            }
        )
        logger.info(f"Push notification sent: {push_result}")
    except Exception as e:
        logger.error(f"Push notification failed: {e}")
    
    return parcel_dict

@router.get("/parcels/my-parcels", response_model=List[Parcel])
async def get_my_parcels(current_user: dict = Depends(get_current_user)):
    """Obtenir mes parcelles"""
    parcels = await db.parcels.find({"farmer_id": current_user["_id"]}).to_list(100)
    return [{**p, "_id": str(p["_id"])} for p in parcels]

@router.post("/harvests", response_model=Harvest)
async def declare_harvest(
    harvest: HarvestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Déclarer une récolte"""
    # Get parcel info
    parcel = await db.parcels.find_one({"_id": ObjectId(harvest.parcel_id)})
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcelle non trouvée")
    
    harvest_dict = harvest.dict()
    harvest_dict["farmer_id"] = current_user["_id"]
    harvest_dict["harvest_date"] = datetime.utcnow()
    harvest_dict["created_at"] = datetime.utcnow()
    
    # Calculate carbon premium (10% bonus for high carbon score)
    if parcel["carbon_score"] >= 7:
        harvest_dict["carbon_premium"] = harvest.quantity_kg * harvest.price_per_kg * 0.10
    else:
        harvest_dict["carbon_premium"] = 0
    
    harvest_dict["total_amount"] = (harvest.quantity_kg * harvest.price_per_kg) + harvest_dict["carbon_premium"]
    harvest_dict["payment_status"] = "pending"
    harvest_dict["payment_method"] = "orange_money"  # Default
    
    result = await db.harvests.insert_one(harvest_dict)
    harvest_dict["_id"] = str(result.inserted_id)
    
    # Create in-app notification
    await db.notifications.insert_one({
        "user_id": current_user["_id"],
        "title": "Récolte déclarée",
        "message": f"Récolte de {harvest.quantity_kg} kg enregistrée. Prime carbone: {harvest_dict['carbon_premium']:,.0f} FCFA",
        "type": "harvest",
        "action_url": f"/farmer/harvests/{str(result.inserted_id)}",
        "created_at": datetime.utcnow(),
        "is_read": False
    })
    
    # Send push notification
    try:
        push_result = await send_notification_to_user(
            db=db,
            user_id=current_user["_id"],
            title="Récolte enregistrée 🌾",
            body=f"{harvest.quantity_kg} kg déclarés. Prime carbone: {harvest_dict['carbon_premium']:,.0f} FCFA",
            data={
                "type": "harvest_created",
                "harvest_id": str(result.inserted_id),
                "carbon_premium": harvest_dict['carbon_premium'],
                "screen": "Harvest"
            }
        )
        logger.info(f"Harvest push notification sent: {push_result}")
    except Exception as e:
        logger.error(f"Harvest push notification failed: {e}")
    
    return harvest_dict

@router.post("/payments/request")
async def request_payment(
    payment: PaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Demander paiement mobile money"""
    harvest = await db.harvests.find_one({"_id": ObjectId(payment.harvest_id)})
    if not harvest:
        raise HTTPException(status_code=404, detail="Récolte non trouvée")
    
    # Simulate mobile money payment
    transaction_id = f"OM{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{random.randint(1000, 9999)}"
    
    await db.harvests.update_one(
        {"_id": ObjectId(payment.harvest_id)},
        {"$set": {
            "payment_status": "paid",
            "transaction_id": transaction_id,
            "payment_method": payment.payment_method
        }}
    )
    
    # Create notification
    await db.notifications.insert_one({
        "user_id": current_user["_id"],
        "title": "Paiement reçu",
        "message": f"Paiement de {payment.amount:,.0f} FCFA reçu via {payment.payment_method}. Ref: {transaction_id}",
        "type": "payment",
        "created_at": datetime.utcnow(),
        "is_read": False
    })
    
    # Send SMS notification for payment
    try:
        carbon_premium = harvest.get("carbon_premium", 0)
        user_phone = current_user.get("phone_number")
        if user_phone:
            sms_result = await SMSService.notify_harvest_payment(
                phone_number=user_phone,
                amount=payment.amount,
                payment_method=payment.payment_method.replace("_", " ").title(),
                reference=transaction_id,
                premium=carbon_premium,
                language="francais"
            )
            logger.info(f"Payment SMS sent: {sms_result}")
    except Exception as e:
        logger.error(f"Payment SMS notification failed: {e}")
    
    # Send push notification for payment
    try:
        push_result = await send_notification_to_user(
            db=db,
            user_id=current_user["_id"],
            title="Paiement reçu 💰",
            body=f"{payment.amount:,.0f} FCFA reçus via {payment.payment_method.replace('_', ' ').title()}",
            data={
                "type": "payment_received",
                "amount": payment.amount,
                "transaction_id": transaction_id,
                "screen": "Payments"
            }
        )
        logger.info(f"Payment push notification sent: {push_result}")
    except Exception as e:
        logger.error(f"Payment push notification failed: {e}")
    
    return {
        "success": True,
        "transaction_id": transaction_id,
        "amount": payment.amount,
        "message": f"Paiement de {payment.amount:,.0f} FCFA envoyé à {payment.phone_number}"
    }

@router.get("/farmer/dashboard")
async def get_farmer_dashboard(current_user: dict = Depends(get_current_user)):
    """Tableau de bord agriculteur"""
    parcels = await db.parcels.find({"farmer_id": current_user["_id"]}).to_list(100)
    harvests = await db.harvests.find({"farmer_id": current_user["_id"]}).to_list(1000)
    
    total_area = sum([p["area_hectares"] for p in parcels])
    total_trees = sum([p["trees_count"] for p in parcels])
    avg_carbon_score = sum([p["carbon_score"] for p in parcels]) / len(parcels) if parcels else 0
    total_carbon_credits = sum([p["carbon_credits_earned"] for p in parcels])
    
    total_revenue = sum([h["total_amount"] for h in harvests])
    total_carbon_premium = sum([h["carbon_premium"] for h in harvests])
    
    # Convert ObjectIds to strings for JSON serialization
    serialized_harvests = []
    for h in sorted(harvests, key=lambda x: x["created_at"], reverse=True)[:5]:
        harvest_dict = dict(h)
        harvest_dict["_id"] = str(harvest_dict["_id"])
        if "parcel_id" in harvest_dict and hasattr(harvest_dict["parcel_id"], "__str__"):
            harvest_dict["parcel_id"] = str(harvest_dict["parcel_id"])
        serialized_harvests.append(harvest_dict)
    
    return {
        "total_parcels": len(parcels),
        "total_area_hectares": total_area,
        "total_trees": total_trees,
        "average_carbon_score": avg_carbon_score,
        "total_carbon_credits": total_carbon_credits,
        "total_revenue": total_revenue,
        "carbon_premium_earned": total_carbon_premium,
        "recent_harvests": serialized_harvests
    }

# ============= SMS NOTIFICATIONS =============

@router.get("/sms/history")
async def get_sms_history(current_user: dict = Depends(get_current_user)):
    """Obtenir l'historique des SMS envoyés"""
    phone = current_user.get("phone_number")
    if not phone:
        return {"sms_history": [], "message": "Aucun numéro de téléphone associé au compte"}
    
    history = await SMSService.get_sms_history(phone, limit=20)
    return {"sms_history": history}

@router.post("/sms/send-weekly-summary")
async def send_weekly_summary(current_user: dict = Depends(get_current_user)):
    """Envoyer le résumé hebdomadaire au producteur"""
    if current_user.get("user_type") != "producteur":
        raise HTTPException(status_code=403, detail="Réservé aux producteurs")
    
    phone = current_user.get("phone_number")
    if not phone:
        raise HTTPException(status_code=400, detail="Aucun numéro de téléphone associé")
    
    # Get farmer stats
    parcels = await db.parcels.find({"farmer_id": current_user["_id"]}).to_list(100)
    harvests = await db.harvests.find({"farmer_id": current_user["_id"]}).to_list(1000)
    
    total_parcels = len(parcels)
    total_credits = sum([p.get("carbon_credits_earned", 0) for p in parcels])
    total_revenue = sum([h.get("total_amount", 0) for h in harvests])
    avg_score = sum([p.get("carbon_score", 0) for p in parcels]) / len(parcels) if parcels else 0
    
    result = await SMSService.send_weekly_summary(
        phone_number=phone,
        farmer_name=current_user.get("full_name", "Producteur"),
        total_parcels=total_parcels,
        total_credits=total_credits,
        total_revenue=total_revenue,
        avg_score=avg_score,
        language="francais"
    )
    
    return result

# ============= ACHETEUR ROUTES =============

@router.post("/buyer/orders", response_model=BuyerOrderInDB)
async def create_buyer_order(
    order: BuyerOrderCreate,
    current_user: dict = Depends(get_current_user)
):
    """Créer une commande d'achat"""
    if current_user.get("user_type") != "acheteur":
        raise HTTPException(status_code=403, detail="Réservé aux acheteurs")
    
    order_dict = order.dict()
    order_dict["buyer_id"] = current_user["_id"]
    order_dict["buyer_company"] = current_user.get("company_name") or current_user.get("full_name") or "Société Inconnue"
    order_dict["status"] = "open"
    order_dict["matched_parcels"] = []
    order_dict["total_carbon_credits"] = 0
    order_dict["created_at"] = datetime.utcnow()
    order_dict["updated_at"] = datetime.utcnow()
    
    result = await db.buyer_orders.insert_one(order_dict)
    order_dict["_id"] = str(result.inserted_id)
    
    # Match with available parcels
    await match_order_with_parcels(str(result.inserted_id))
    
    return order_dict

@router.get("/buyer/orders", response_model=List[BuyerOrderInDB])
async def get_buyer_orders(current_user: dict = Depends(get_current_user)):
    """Obtenir mes commandes"""
    orders = await db.buyer_orders.find({"buyer_id": current_user["_id"]}).sort("created_at", -1).to_list(100)
    return [{**o, "_id": str(o["_id"])} for o in orders]

@router.get("/buyer/traceability/{order_id}")
async def get_traceability_report(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Générer rapport de traçabilité EUDR"""
    order = await db.buyer_orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Get all matched parcels
    parcels = []
    farmers = []
    total_carbon = 0
    
    for parcel_id in order.get("matched_parcels", []):
        parcel = await db.parcels.find_one({"_id": ObjectId(parcel_id)})
        if parcel:
            parcels.append({
                "id": str(parcel["_id"]),
                "location": parcel["location"],
                "area": parcel["area_hectares"],
                "carbon_score": parcel["carbon_score"],
                "practices": parcel["farming_practices"]
            })
            total_carbon += parcel.get("carbon_credits_earned", 0)
            
            # Get farmer info
            farmer = await db.users.find_one({"_id": ObjectId(parcel["farmer_id"])})
            if farmer:
                farmers.append({
                    "name": farmer["full_name"],
                    "phone": farmer.get("phone_number", "N/A")
                })
    
    avg_carbon_score = sum([p["carbon_score"] for p in parcels]) / len(parcels) if parcels else 0
    
    # Generate blockchain hash for verification
    data_to_hash = f"{order_id}{len(parcels)}{total_carbon}{datetime.utcnow().isoformat()}"
    blockchain_hash = hashlib.sha256(data_to_hash.encode()).hexdigest()
    
    return {
        "order_id": order_id,
        "parcels": parcels,
        "farmers": farmers,
        "total_quantity_kg": order["quantity_needed_kg"],
        "average_carbon_score": avg_carbon_score,
        "total_carbon_credits": total_carbon,
        "eudr_compliant": avg_carbon_score >= 6.0,
        "verification_documents": ["certificate_origin.pdf", "carbon_audit.pdf"],
        "blockchain_hash": blockchain_hash,
        "generated_at": datetime.utcnow().isoformat()
    }

@router.get("/buyer/dashboard")
async def get_buyer_dashboard(current_user: dict = Depends(get_current_user)):
    """Tableau de bord acheteur"""
    orders = await db.buyer_orders.find({"buyer_id": current_user["_id"]}).to_list(1000)
    
    total_orders = len(orders)
    active_orders = len([o for o in orders if o["status"] == "open"])
    total_quantity = sum([o["quantity_needed_kg"] for o in orders if o["status"] == "completed"])
    total_carbon_offset = sum([o.get("total_carbon_credits", 0) for o in orders])
    
    return {
        "total_orders": total_orders,
        "active_orders": active_orders,
        "completed_orders": len([o for o in orders if o["status"] == "completed"]),
        "total_quantity_purchased_kg": total_quantity,
        "total_carbon_offset_tonnes": total_carbon_offset,
        "average_carbon_score": 7.5,  # Calculate from matched parcels
        "eudr_compliance_rate": 92.5
    }

# ============= ENTREPRISE RSE ROUTES =============

@router.get("/carbon-credits", response_model=List[CarbonCredit])
async def get_carbon_credits(
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    standard: Optional[str] = None
):
    """Marketplace crédits carbone"""
    query = {"status": "available"}
    if min_price:
        query["price_per_tonne"] = {"$gte": min_price}
    if max_price:
        query.setdefault("price_per_tonne", {})["$lte"] = max_price
    if standard:
        query["verification_standard"] = standard
    
    credits = await db.carbon_credits.find(query).to_list(100)
    return [{**c, "_id": str(c["_id"])} for c in credits]

@router.post("/carbon-credits/purchase", response_model=CarbonPurchaseInDB)
async def purchase_carbon_credits(
    purchase: CarbonPurchaseCreate,
    current_user: dict = Depends(get_current_user)
):
    """Acheter crédits carbone"""
    if current_user.get("user_type") != "entreprise_rse":
        raise HTTPException(status_code=403, detail="Réservé aux entreprises RSE")
    
    credit = await db.carbon_credits.find_one({"_id": ObjectId(purchase.credit_id)})
    if not credit or credit["status"] != "available":
        raise HTTPException(status_code=400, detail="Crédit non disponible")
    
    purchase_dict = purchase.dict()
    purchase_dict["buyer_id"] = current_user["_id"]
    purchase_dict["buyer_company"] = current_user.get("company_name_rse") or current_user.get("full_name") or "Entreprise Inconnue"
    purchase_dict["transaction_date"] = datetime.utcnow()
    purchase_dict["status"] = "completed"
    
    # Generate certificate
    cert_number = f"GRC{datetime.utcnow().year}{random.randint(10000, 99999)}"
    purchase_dict["certificate_url"] = f"/certificates/{cert_number}.pdf"
    
    if purchase.retirement_requested:
        purchase_dict["status"] = "retired"
        purchase_dict["retirement_certificate_url"] = f"/retirement/{cert_number}.pdf"
    
    result = await db.carbon_purchases.insert_one(purchase_dict)
    purchase_dict["_id"] = str(result.inserted_id)
    
    # Update credit status
    await db.carbon_credits.update_one(
        {"_id": ObjectId(purchase.credit_id)},
        {"$set": {"status": "sold" if not purchase.retirement_requested else "retired"}}
    )
    
    return purchase_dict

@router.get("/carbon/my-purchases")
async def get_my_carbon_purchases(current_user: dict = Depends(get_current_user)):
    """Get user's carbon credit purchases"""
    purchases = await db.carbon_purchases.find({"buyer_id": current_user["_id"]}).sort("transaction_date", -1).to_list(100)
    
    result = []
    for p in purchases:
        # Get credit details
        credit = await db.carbon_credits.find_one({"_id": ObjectId(p.get("credit_id"))}) if p.get("credit_id") else None
        result.append({
            "_id": str(p["_id"]),
            "credit_id": p.get("credit_id"),
            "project_name": credit.get("project_name", "Projet Carbone GreenLink") if credit else "Projet Carbone GreenLink",
            "quantity_tonnes": p.get("quantity_tonnes", 0),
            "total_price": p.get("total_price", 0),
            "certification_standard": credit.get("verification_standard", "Verra VCS") if credit else "Verra VCS",
            "status": p.get("status", "completed"),
            "certificate_url": p.get("certificate_url"),
            "created_at": p.get("transaction_date", datetime.utcnow()).isoformat() if isinstance(p.get("transaction_date"), datetime) else p.get("transaction_date", datetime.utcnow().isoformat())
        })
    
    return result

@router.get("/carbon/my-score")
async def get_my_carbon_score(current_user: dict = Depends(get_current_user)):
    """Get farmer's carbon score and statistics"""
    # Get user's parcels
    parcels = await db.parcels.find({"farmer_id": current_user["_id"]}).to_list(100)
    
    if not parcels:
        return {
            "average_score": 0,
            "total_credits": 0,
            "total_premium": 0,
            "parcels_count": 0
        }
    
    # Calculate average score
    scores = [p.get("carbon_score", 0) for p in parcels]
    avg_score = sum(scores) / len(scores) if scores else 0
    
    # Calculate total credits and premium
    total_credits = sum([p.get("carbon_credits_earned", 0) for p in parcels])
    
    # Get harvests for premium calculation
    harvests = await db.harvests.find({"farmer_id": current_user["_id"]}).to_list(100)
    total_premium = sum([h.get("carbon_premium", 0) for h in harvests])
    
    return {
        "average_score": round(avg_score, 1),
        "total_credits": round(total_credits, 2),
        "total_premium": total_premium,
        "parcels_count": len(parcels),
        "parcels": [{
            "id": str(p["_id"]),
            "location": p.get("location", ""),
            "area_hectares": p.get("area_hectares", 0),
            "carbon_score": p.get("carbon_score", 0),
            "carbon_credits_earned": p.get("carbon_credits_earned", 0)
        } for p in parcels[:5]]
    }

@router.get("/carbon/my-credits")
async def get_my_carbon_credits(current_user: dict = Depends(get_current_user)):
    """Get farmer's generated carbon credits"""
    parcels = await db.parcels.find({"farmer_id": current_user["_id"]}).to_list(100)
    
    credits = []
    for p in parcels:
        if p.get("carbon_credits_earned", 0) > 0:
            credits.append({
                "parcel_id": str(p["_id"]),
                "location": p.get("location", ""),
                "area_hectares": p.get("area_hectares", 0),
                "credits_tonnes_co2": p.get("carbon_credits_earned", 0),
                "carbon_score": p.get("carbon_score", 0),
                "verification_status": p.get("verification_status", "pending"),
                "created_at": p.get("created_at", datetime.utcnow()).isoformat() if isinstance(p.get("created_at"), datetime) else str(p.get("created_at", ""))
            })
    
    return credits

@router.get("/rse/impact-dashboard")
async def get_impact_dashboard(current_user: dict = Depends(get_current_user)):
    """Dashboard impact RSE"""
    purchases = await db.carbon_purchases.find({"buyer_id": current_user["_id"]}).to_list(1000)
    
    total_co2 = sum([p["quantity_tonnes"] for p in purchases])
    
    # Get impact from related parcels
    parcels = await db.parcels.find({"is_active": True}).to_list(1000)
    total_farmers = len(set([p["farmer_id"] for p in parcels]))
    total_trees = sum([p["trees_count"] for p in parcels])
    
    # Mock women percentage
    women_percentage = 42.5
    
    regions = list(set([p["region"] for p in parcels]))
    
    # Monthly breakdown
    monthly_data = []
    for i in range(6):
        month_date = datetime.utcnow() - timedelta(days=30 * i)
        month_purchases = [p for p in purchases if 
                          datetime.fromisoformat(p["transaction_date"].isoformat()).month == month_date.month]
        monthly_data.append({
            "month": month_date.strftime("%B %Y"),
            "co2_offset": sum([p["quantity_tonnes"] for p in month_purchases]),
            "investment": sum([p["total_price"] for p in month_purchases])
        })
    
    return {
        "total_co2_offset_tonnes": total_co2,
        "total_farmers_impacted": total_farmers,
        "women_farmers_percentage": women_percentage,
        "total_trees_planted": total_trees,
        "regions_covered": regions,
        "impact_stories": [
            {
                "farmer": "Aminata K.",
                "location": "Bouaflé",
                "story": "Grâce aux primes carbone, j'ai pu scolariser mes 3 enfants et diversifier mes cultures"
            }
        ],
        "monthly_breakdown": monthly_data[::-1]
    }

# Helper functions

def calculate_carbon_score(practices: List[str], area: float) -> float:
    """Calculate carbon score based on farming practices"""
    base_score = 5.0
    
    score_map = {
        "agroforesterie": 2.0,
        "compost": 1.5,
        "zero_pesticides": 1.0,
        "couverture_vegetale": 1.0,
        "rotation_cultures": 0.5
    }
    
    for practice in practices:
        base_score += score_map.get(practice, 0)
    
    # Bonus for larger areas
    if area > 5:
        base_score += 0.5
    
    return min(base_score, 10.0)

async def match_order_with_parcels(order_id: str):
    """Match buyer order with suitable parcels"""
    order = await db.buyer_orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        return
    
    query = {
        "crop_type": order["crop_type"],
        "is_active": True,
        "verification_status": "verified"
    }
    
    if order.get("carbon_requirement"):
        query["carbon_score"] = {"$gte": order.get("min_carbon_score", 7.0)}
    
    parcels = await db.parcels.find(query).to_list(100)
    matched_ids = [str(p["_id"]) for p in parcels[:10]]  # Top 10
    total_carbon = sum([p["carbon_credits_earned"] for p in parcels[:10]])
    
    await db.buyer_orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {
            "matched_parcels": matched_ids,
            "total_carbon_credits": total_carbon,
            "status": "matched" if matched_ids else "open"
        }}
    )



# ============= MOBILE APP ROUTES =============

from pydantic import BaseModel

class DeviceRegistration(BaseModel):
    push_token: str
    platform: str  # 'ios' or 'android'
    device_name: Optional[str] = None

@router.post("/notifications/register-device")
async def register_device_for_push(
    device: DeviceRegistration,
    current_user: dict = Depends(get_current_user)
):
    """Register a device for push notifications"""
    user_id = current_user["_id"]
    
    # Check if device already registered
    existing = await db.device_tokens.find_one({
        "user_id": user_id,
        "push_token": device.push_token
    })
    
    if existing:
        # Update last seen
        await db.device_tokens.update_one(
            {"_id": existing["_id"]},
            {"$set": {"last_seen": datetime.utcnow()}}
        )
        return {"message": "Device already registered", "token_id": str(existing["_id"])}
    
    # Register new device
    token_doc = {
        "user_id": user_id,
        "push_token": device.push_token,
        "platform": device.platform,
        "device_name": device.device_name,
        "created_at": datetime.utcnow(),
        "last_seen": datetime.utcnow(),
        "is_active": True
    }
    
    result = await db.device_tokens.insert_one(token_doc)
    logger.info(f"Device registered for push notifications: user={user_id}, platform={device.platform}")
    
    return {"message": "Device registered successfully", "token_id": str(result.inserted_id)}

@router.delete("/notifications/unregister-device")
async def unregister_device(
    push_token: str,
    current_user: dict = Depends(get_current_user)
):
    """Unregister a device from push notifications"""
    result = await db.device_tokens.delete_one({
        "user_id": current_user["_id"],
        "push_token": push_token
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Device not found")
    
    return {"message": "Device unregistered successfully"}

@router.get("/notifications")
async def get_farmer_notifications(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    """Get notifications for the current farmer"""
    notifications = await db.notifications.find({
        "user_id": current_user["_id"]
    }).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [{
        "id": str(n["_id"]),
        "title": n.get("title", ""),
        "message": n.get("message", ""),
        "type": n.get("type", "info"),
        "action_url": n.get("action_url"),
        "is_read": n.get("is_read", False),
        "created_at": n.get("created_at", datetime.utcnow()).isoformat()
    } for n in notifications]

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user["_id"]},
        {"$set": {"is_read": True, "read_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}


# ============= PUSH NOTIFICATION ROUTES =============

from services.fcm_service import fcm_service, send_notification_to_user

class PushNotificationRequest(BaseModel):
    title: str
    body: str
    data: Optional[dict] = None

@router.post("/notifications/send-push")
async def send_push_notification(
    request: PushNotificationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a push notification to the current user's registered devices"""
    result = await send_notification_to_user(
        db=db,
        user_id=current_user["_id"],
        title=request.title,
        body=request.body,
        data=request.data
    )
    return result

@router.post("/notifications/test-push")
async def test_push_notification(
    current_user: dict = Depends(get_current_user)
):
    """Send a test push notification to verify FCM setup"""
    result = await send_notification_to_user(
        db=db,
        user_id=current_user["_id"],
        title="Test GreenLink 🌱",
        body="Les notifications push fonctionnent correctement !",
        data={"type": "test", "screen": "Home"}
    )
    return result

