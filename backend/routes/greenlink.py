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
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/greenlink", tags=["greenlink"])

# ============= AGRICULTEUR ROUTES =============

@router.post("/parcels")
async def declare_parcel(
    parcel: ParcelCreate,
    current_user: dict = Depends(get_current_user)
):
    """Déclarer une nouvelle parcelle agricole"""
    parcel_dict = parcel.dict()
    
    # Normalize fields from mobile form aliases
    if not parcel_dict.get("area_hectares") and parcel_dict.get("size"):
        parcel_dict["area_hectares"] = parcel_dict["size"]
    if not parcel_dict.get("region") and parcel_dict.get("department"):
        parcel_dict["region"] = parcel_dict["department"]
    if not parcel_dict.get("farmer_name"):
        parcel_dict["farmer_name"] = current_user.get("full_name", "")
    if not parcel_dict.get("phone_number"):
        parcel_dict["phone_number"] = current_user.get("phone_number", "")
    if not parcel_dict.get("coordinates") and parcel_dict.get("latitude"):
        parcel_dict["coordinates"] = {"lat": parcel_dict["latitude"], "lng": parcel_dict["longitude"]}
    
    # Build farming_practices from boolean flags if not already set
    if not parcel_dict.get("farming_practices"):
        practices = []
        if parcel_dict.get("has_shade_trees"):
            practices.append("agroforesterie")
        if parcel_dict.get("uses_organic_fertilizer"):
            practices.append("compost")
        if parcel_dict.get("has_erosion_control"):
            practices.append("controle_erosion")
        parcel_dict["farming_practices"] = practices
    
    area = parcel_dict.get("area_hectares") or 0
    if not area:
        raise HTTPException(status_code=400, detail="La superficie est obligatoire")
    
    # Si un member_id est fourni (par une coopérative), l'utiliser comme farmer_id
    if parcel.member_id:
        parcel_dict["farmer_id"] = parcel.member_id
        parcel_dict["registered_by"] = str(current_user["_id"])
        parcel_dict["registered_by_type"] = current_user.get("user_type", "unknown")
    else:
        parcel_dict["farmer_id"] = str(current_user["_id"])
    
    parcel_dict["created_at"] = datetime.utcnow()
    parcel_dict["updated_at"] = datetime.utcnow()
    parcel_dict["is_active"] = True
    parcel_dict["verification_status"] = "pending"
    
    # Calculate carbon score based on practices
    carbon_score = calculate_carbon_score(parcel_dict["farming_practices"], area)
    parcel_dict["carbon_score"] = carbon_score
    parcel_dict["carbon_credits_earned"] = carbon_score * area * 0.5  # tonnes CO2
    
    # Clean up alias fields before storing
    for key in ["size", "department", "has_shade_trees", "uses_organic_fertilizer", "has_erosion_control"]:
        parcel_dict.pop(key, None)
    
    result = await db.parcels.insert_one(parcel_dict)
    parcel_dict["_id"] = str(result.inserted_id)
    
    # Create notification for the farmer
    await db.notifications.insert_one({
        "user_id": str(current_user["_id"]),
        "title": "Parcelle déclarée",
        "message": f"Votre parcelle de {area} ha a été enregistrée. Score carbone: {carbon_score:.1f}/10",
        "type": "parcel",
        "action_url": f"/farmer/parcels/{str(result.inserted_id)}",
        "created_at": datetime.utcnow(),
        "is_read": False
    })
    
    # Notify field agents for verification
    try:
        from services.push_notifications import push_service
        # Find the cooperative this farmer belongs to
        farmer_member = await db.coop_members.find_one({
            "$or": [
                {"user_id": str(current_user["_id"])},
                {"phone_number": current_user.get("phone_number")}
            ]
        })
        if farmer_member:
            coop_id = farmer_member.get("coop_id") or farmer_member.get("cooperative_id")
            if coop_id:
                coop = await db.users.find_one({"_id": ObjectId(coop_id)}) if coop_id else None
                await push_service.send_new_parcel_notification_to_agents(
                    parcel_data={
                        "parcel_id": str(result.inserted_id),
                        "nom_producteur": current_user.get("full_name", "Producteur"),
                        "superficie": area,
                        "village": parcel_dict.get("village", ""),
                        "type_culture": parcel_dict.get("crop_type", "cacao"),
                        "has_gps": bool(parcel_dict.get("coordinates") or parcel_dict.get("gps_coordinates"))
                    },
                    cooperative_id=str(coop_id),
                    cooperative_name=coop.get("coop_name", "") if coop else ""
                )
    except Exception as e:
        logger.error(f"Notification agents terrain échouée: {e}")
    
    # Send push notification to farmer's registered devices
    try:
        push_result = await send_notification_to_user(
            db=db,
            user_id=str(current_user["_id"]),
            title="Parcelle déclarée",
            body=f"Parcelle de {area} ha enregistrée. Score carbone: {carbon_score:.1f}/10",
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

@router.get("/parcels/my-parcels")
async def get_my_parcels(current_user: dict = Depends(get_current_user)):
    """Obtenir mes parcelles (y compris celles enregistrees par un agent)"""
    from routes.auth import normalize_phone
    
    user_id = str(current_user["_id"])
    phone = current_user.get("phone_number", "")
    
    # Build list of possible IDs that could be used as farmer_id
    possible_ids = [user_id]
    
    # Check if this user is linked to any coop_member (by phone number with normalization)
    if phone:
        phone_variants = normalize_phone(phone)
        linked_members = await db.coop_members.find(
            {"phone_number": {"$in": phone_variants}}, {"_id": 1}
        ).to_list(10)
        for m in linked_members:
            possible_ids.append(str(m["_id"]))
    
    # Query parcels by any matching farmer_id or member_id
    parcels = await db.parcels.find({
        "$or": [
            {"farmer_id": {"$in": possible_ids}},
            {"member_id": {"$in": possible_ids}}
        ]
    }).to_list(100)
    
    return [{
        "id": str(p["_id"]),
        "producteur_id": p.get("farmer_id", ""),
        "membre_id": p.get("member_id", ""),
        "localisation": p.get("location", ""),
        "village": p.get("village", ""),
        "region": p.get("region", ""),
        "superficie": p.get("area_hectares", 0),
        "type_culture": p.get("crop_type", "cacao"),
        "score_carbone": p.get("carbon_score", 0),
        "co2_capture": p.get("co2_captured_tonnes", 0),
        "coordonnees_gps": p.get("gps_coordinates"),
        "statut_verification": p.get("verification_status", "pending"),
        "certification": p.get("certification"),
        "nom": p.get("name", ""),
        "cree_le": str(p.get("created_at", ""))
    } for p in parcels]

@router.get("/harvests/my-harvests")
async def get_my_harvests(
    statut: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtenir mes récoltes déclarées avec statut"""
    from routes.auth import normalize_phone
    
    user_id = str(current_user["_id"])
    phone = current_user.get("phone_number", "")
    
    # Build possible farmer IDs (same logic as my-parcels)
    possible_ids = [user_id, current_user["_id"]]
    if phone:
        phone_variants = normalize_phone(phone)
        linked_members = await db.coop_members.find(
            {"phone_number": {"$in": phone_variants}}, {"_id": 1}
        ).to_list(10)
        for m in linked_members:
            possible_ids.append(str(m["_id"]))
    
    base_query = {"farmer_id": {"$in": possible_ids}}
    
    # Always compute stats from ALL harvests (unfiltered)
    all_harvests = await db.harvests.find(base_query).sort("created_at", -1).to_list(200)
    stats = {"total": len(all_harvests), "en_attente": 0, "validees": 0, "rejetees": 0, "total_kg": 0}
    for h in all_harvests:
        s = h.get("statut", "en_attente")
        if s == "en_attente":
            stats["en_attente"] += 1
        elif s == "validee":
            stats["validees"] += 1
        elif s == "rejetee":
            stats["rejetees"] += 1
        stats["total_kg"] += h.get("quantity_kg", 0)
    
    # Apply filter for the displayed list
    if statut:
        harvests = [h for h in all_harvests if h.get("statut") == statut]
    else:
        harvests = all_harvests
    
    result = []
    for h in harvests:
        h_unit = h.get("unit", "kg")
        h_qty = h.get("quantity_kg", 0)
        if h.get("quantity_display"):
            h_display = h["quantity_display"]
        elif h_unit == "tonnes":
            h_display = f"{int(h_qty / 1000)} tonne(s) ({int(h_qty)} kg)"
        elif h_unit == "sacs":
            h_display = f"{int(h_qty / 65)} sac(s) ({int(h_qty)} kg)"
        else:
            h_display = f"{int(h_qty)} kg"
        
        result.append({
            "id": str(h["_id"]),
            "parcel_id": h.get("parcel_id", ""),
            "quantity_kg": h.get("quantity_kg", 0),
            "original_quantity": h.get("original_quantity", h_qty),
            "quantity_display": h_display,
            "quality_grade": h.get("quality_grade", ""),
            "unit": h_unit,
            "notes": h.get("notes", ""),
            "statut": h.get("statut", "en_attente"),
            "coop_name": h.get("coop_name", ""),
            "carbon_premium": h.get("carbon_premium", 0),
            "total_amount": h.get("total_amount", 0),
            "harvest_date": h.get("harvest_date", h.get("created_at", "")),
            "created_at": h.get("created_at", ""),
            "validated_at": h.get("validated_at", None),
            "rejection_reason": h.get("rejection_reason", None),
        })
    
    return {
        "harvests": result,
        "stats": stats,
        "total": len(harvests),
    }



@router.post("/harvests")
async def declare_harvest(
    harvest: HarvestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Déclarer une récolte"""
    from routes.auth import normalize_phone
    
    # Map mobile field names to backend field names
    quantity_kg = harvest.quantity_kg or harvest.quantity or 0
    quality_grade = harvest.quality or harvest.quality_grade or "B"
    if quality_grade and quality_grade.startswith("Grade "):
        quality_grade = quality_grade.replace("Grade ", "")
    price_per_kg = harvest.price_per_kg or 0
    sale_type = harvest.sale_type or "cooperative"
    
    # Convert units if necessary (sacs ~= 65kg, tonnes = 1000kg)
    unit = harvest.unit or "kg"
    original_quantity = quantity_kg  # Save original value before conversion
    if unit == "sacs":
        quantity_kg = quantity_kg * 65
    elif unit == "tonnes":
        quantity_kg = quantity_kg * 1000
    
    # Build human-readable quantity string for notifications
    if unit == "kg":
        quantity_display = f"{int(quantity_kg)} kg"
    elif unit == "tonnes":
        quantity_display = f"{int(original_quantity)} tonne(s) ({int(quantity_kg)} kg)"
    elif unit == "sacs":
        quantity_display = f"{int(original_quantity)} sac(s) ({int(quantity_kg)} kg)"
    else:
        quantity_display = f"{int(quantity_kg)} kg"
    
    # Get parcel info
    try:
        parcel = await db.parcels.find_one({"_id": ObjectId(harvest.parcel_id)})
    except Exception:
        parcel = None
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcelle non trouvée")
    
    # Auto-link to cooperative via coop_member
    coop_id = None
    coop_name = ""
    member_id = parcel.get("member_id")
    phone = current_user.get("phone_number", "")
    
    # Try to find the cooperative link
    if member_id:
        member = await db.coop_members.find_one({"_id": ObjectId(member_id)})
        if member:
            coop_id = member.get("coop_id")
    
    if not coop_id and phone:
        phone_variants = normalize_phone(phone)
        member = await db.coop_members.find_one({"phone_number": {"$in": phone_variants}})
        if member:
            coop_id = member.get("coop_id")
            member_id = str(member["_id"])
    
    if coop_id:
        coop = await db.users.find_one({"_id": ObjectId(coop_id) if not isinstance(coop_id, ObjectId) else coop_id})
        if coop:
            coop_name = coop.get("full_name") or coop.get("cooperative_name", "")
    
    harvest_dict = {
        "parcel_id": harvest.parcel_id,
        "quantity_kg": quantity_kg,
        "original_quantity": original_quantity,
        "quality_grade": quality_grade,
        "price_per_kg": price_per_kg,
        "sale_type": sale_type,
        "unit": unit,
        "quantity_display": quantity_display,
        "notes": harvest.notes or "",
        "farmer_id": current_user["_id"],
        "farmer_name": current_user.get("full_name", ""),
        "member_id": member_id or "",
        "coop_id": str(coop_id) if coop_id else "",
        "coop_name": coop_name,
        "statut": "en_attente",  # en_attente -> validee / rejetee
        "harvest_date": datetime.utcnow(),
        "created_at": datetime.utcnow(),
    }
    
    # Calculate carbon premium (10% bonus for high carbon score)
    carbon_score = parcel.get("carbon_score") or parcel.get("score_carbone") or 0
    if carbon_score >= 7:
        harvest_dict["carbon_premium"] = quantity_kg * price_per_kg * 0.10
    else:
        harvest_dict["carbon_premium"] = 0
    
    harvest_dict["total_amount"] = (quantity_kg * price_per_kg) + harvest_dict["carbon_premium"]
    harvest_dict["payment_status"] = "pending"
    harvest_dict["payment_method"] = "orange_money"
    
    result = await db.harvests.insert_one(harvest_dict)
    harvest_dict["_id"] = str(result.inserted_id)
    
    # Notification for the farmer
    await db.notifications.insert_one({
        "user_id": current_user["_id"],
        "title": "Récolte déclarée",
        "message": f"Récolte de {quantity_display} enregistrée{' - En attente de validation par ' + coop_name if coop_name else ''}",
        "type": "harvest",
        "action_url": f"/farmer/harvests/{str(result.inserted_id)}",
        "created_at": datetime.utcnow(),
        "is_read": False
    })
    
    # Notification for the cooperative
    if coop_id:
        await db.notifications.insert_one({
            "user_id": str(coop_id),
            "title": "Nouvelle récolte à valider",
            "message": f"{current_user.get('full_name', 'Un producteur')} a déclaré {quantity_display} - Qualité {quality_grade}",
            "type": "harvest_to_validate",
            "action_url": "/cooperative/harvests",
            "created_at": datetime.utcnow(),
            "is_read": False
        })
        try:
            await send_notification_to_user(
                db=db, user_id=str(coop_id),
                title="Nouvelle récolte à valider",
                body=f"{current_user.get('full_name', 'Producteur')}: {quantity_display} (Qualité {quality_grade})",
                data={"type": "harvest_to_validate", "harvest_id": str(result.inserted_id), "screen": "CoopHarvests"}
            )
        except Exception as e:
            logger.error(f"Coop harvest notification failed: {e}")
        
        # Send email notification to cooperative
        try:
            from services.notification_email_helper import send_notification_email_async
            asyncio.create_task(send_notification_email_async(db, "harvest_declared",
                coop_id=str(coop_id),
                farmer_name=current_user.get("full_name", "Producteur"),
                quantity_kg=int(quantity_kg),
                crop_type=parcel.get("crop_type", "cacao"),
                carbon_premium=harvest_dict.get("carbon_premium", 0),
                original_quantity=original_quantity,
                unit=unit
            ))
        except Exception as e:
            logger.error(f"Harvest email notification failed: {e}")
    
    # Push notification for farmer
    try:
        await send_notification_to_user(
            db=db, user_id=current_user["_id"],
            title="Récolte enregistrée",
            body=f"{quantity_display} déclarés{' - En attente de validation' if coop_id else ''}",
            data={"type": "harvest_created", "harvest_id": str(result.inserted_id), "screen": "Harvest"}
        )
    except Exception as e:
        logger.error(f"Harvest push notification failed: {e}")
    
    # Clean response
    harvest_dict.pop("_id", None)
    harvest_dict["id"] = str(result.inserted_id)
    
    return {
        "success": True,
        "message": "Récolte déclarée avec succès" + (" - En attente de validation par votre coopérative" if coop_id else ""),
        "harvest": harvest_dict
    }

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
        "message": f"Paiement de {payment.amount:,.0f} XOF reçu via {payment.payment_method}. Ref: {transaction_id}",
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
            body=f"{payment.amount:,.0f} XOF reçus via {payment.payment_method.replace('_', ' ').title()}",
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
        "message": f"Paiement de {payment.amount:,.0f} XOF envoyé à {payment.phone_number}"
    }

@router.get("/farmer/dashboard")
async def get_farmer_dashboard(current_user: dict = Depends(get_current_user)):
    """Tableau de bord agriculteur"""
    from routes.auth import normalize_phone
    
    user_id = str(current_user["_id"])
    phone = current_user.get("phone_number", "")
    
    # Build list of possible IDs (same logic as my-parcels)
    possible_ids = [user_id]
    if phone:
        phone_variants = normalize_phone(phone)
        linked_members = await db.coop_members.find(
            {"phone_number": {"$in": phone_variants}}, {"_id": 1}
        ).to_list(10)
        for m in linked_members:
            possible_ids.append(str(m["_id"]))
    
    parcels = await db.parcels.find({
        "$or": [
            {"farmer_id": {"$in": possible_ids}},
            {"member_id": {"$in": possible_ids}}
        ]
    }).to_list(100)
    
    harvests = await db.harvests.find({
        "farmer_id": {"$in": possible_ids}
    }).to_list(1000)
    
    total_area = sum([p.get("area_hectares", 0) or 0 for p in parcels])
    total_trees = sum([p.get("trees_count", 0) or 0 for p in parcels])
    avg_carbon_score = sum([p.get("carbon_score", 0) or 0 for p in parcels]) / len(parcels) if parcels else 0
    total_carbon_credits = sum([p.get("carbon_credits_earned", 0) or 0 for p in parcels])
    
    total_revenue = sum([h.get("total_amount", 0) or 0 for h in harvests])
    total_carbon_premium = sum([h.get("carbon_premium", 0) or 0 for h in harvests])
    
    # Convert ObjectIds to strings for JSON serialization
    serialized_harvests = []
    for h in sorted(harvests, key=lambda x: x.get("created_at", datetime.min), reverse=True)[:5]:
        harvest_dict = dict(h)
        harvest_dict["_id"] = str(harvest_dict["_id"])
        if "parcel_id" in harvest_dict and hasattr(harvest_dict["parcel_id"], "__str__"):
            harvest_dict["parcel_id"] = str(harvest_dict["parcel_id"])
        serialized_harvests.append(harvest_dict)
    
    return {
        "total_parcelles": len(parcels),
        "superficie_totale": total_area,
        "total_arbres": total_trees,
        "score_carbone_moyen": round(avg_carbon_score, 1),
        "credits_carbone": round(total_carbon_credits, 2),
        "revenu_total": total_revenue,
        "prime_carbone": total_carbon_premium,
        "recoltes_recentes": serialized_harvests
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
    
    total_co2 = sum([p.get("quantity_tonnes", 0) for p in purchases])
    
    # Get impact from related parcels
    parcels = await db.parcels.find({"is_active": True}).to_list(1000)
    total_farmers = len(set([str(p.get("farmer_id", "")) for p in parcels]))
    total_trees = sum([p.get("trees_count", 0) for p in parcels])
    
    # Mock women percentage
    women_percentage = 42.5
    
    regions = list(set([p.get("region", "Inconnue") for p in parcels if p.get("region")]))
    
    # Monthly breakdown
    monthly_data = []
    for i in range(6):
        month_date = datetime.utcnow() - timedelta(days=30 * i)
        month_purchases = []
        for p in purchases:
            try:
                td = p.get("transaction_date")
                if td and hasattr(td, 'month') and td.month == month_date.month:
                    month_purchases.append(p)
            except Exception:
                pass
        monthly_data.append({
            "month": month_date.strftime("%B %Y"),
            "co2_offset": sum([p.get("quantity_tonnes", 0) for p in month_purchases]),
            "investment": sum([p.get("total_price", 0) for p in month_purchases])
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

from services.fcm_service import fcm_service

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

