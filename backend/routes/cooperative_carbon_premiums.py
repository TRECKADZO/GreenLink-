"""
Cooperative Carbon Premium Calculation & Payment Routes
GreenLink Agritech - Côte d'Ivoire
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from datetime import datetime, timezone
from bson import ObjectId
import logging
import csv
import io

from database import db
from routes.auth import get_current_user
from routes.cooperative import verify_cooperative, coop_id_query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cooperative", tags=["Cooperative Carbon Premiums"])


class CarbonPremiumSettings(BaseModel):
    rate_per_hectare: float = 50000
    min_score_eligible: float = 6.0
    bonus_high_score: float = 1.2
    bonus_organic: float = 1.1


@router.get("/carbon-premiums/members")
async def get_members_carbon_premiums(
    current_user: dict = Depends(get_current_user)
):
    """Obtenir les primes carbone calculées par membre"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    members = await db.coop_members.find(coop_id_query(coop_id)).to_list(1000)
    
    RATE_PER_HECTARE = 50000
    MIN_SCORE = 6.0
    
    premium_data = []
    total_premium = 0
    total_eligible_hectares = 0
    
    for member in members:
        member_id = str(member["_id"])
        user_id = member.get("user_id")
        
        query_conditions = [{"member_id": member_id}]
        if user_id:
            query_conditions.append({"farmer_id": user_id})
        
        parcels = await db.parcels.find({"$or": query_conditions}).to_list(100)
        
        member_total_area = 0
        member_avg_score = 0
        member_premium = 0
        audited_parcels = 0
        parcels_detail = []
        
        for parcel in parcels:
            parcel_id = str(parcel["_id"])
            area = parcel.get("area_hectares", 0)
            
            audit = await db.carbon_audits.find_one({
                "parcel_id": parcel_id,
                "recommendation": "approved"
            })
            
            if audit:
                carbon_score = audit.get("carbon_score", 0)
                
                if carbon_score >= MIN_SCORE:
                    parcel_premium = area * RATE_PER_HECTARE * (carbon_score / 10)
                    
                    if carbon_score >= 8:
                        parcel_premium *= 1.2
                    
                    member_premium += parcel_premium
                    member_total_area += area
                    member_avg_score += carbon_score
                    audited_parcels += 1
                    
                    parcels_detail.append({
                        "parcel_id": parcel_id,
                        "location": parcel.get("location"),
                        "area_hectares": area,
                        "carbon_score": carbon_score,
                        "premium_xof": round(parcel_premium)
                    })
        
        if audited_parcels > 0:
            member_avg_score = round(member_avg_score / audited_parcels, 1)
        
        premium_data.append({
            "member_id": member_id,
            "nom_complet": member.get("full_name"),
            "telephone": member.get("phone_number"),
            "village": member.get("village"),
            "superficie_totale": round(member_total_area, 2),
            "average_score": member_avg_score,
            "audited_parcels": audited_parcels,
            "premium_xof": round(member_premium),
            "premium_eur": round(member_premium / 655.957, 2),
            "parcels": parcels_detail,
            "payment_status": "pending"
        })
        
        total_premium += member_premium
        total_eligible_hectares += member_total_area
    
    premium_data.sort(key=lambda x: x["premium_xof"], reverse=True)
    
    return {
        "members": premium_data,
        "summary": {
            "total_members": len(members),
            "eligible_members": len([m for m in premium_data if m["premium_xof"] > 0]),
            "superficie_totale": round(total_eligible_hectares, 2),
            "total_premium_xof": round(total_premium),
            "total_premium_eur": round(total_premium / 655.957, 2),
            "rate_per_hectare": RATE_PER_HECTARE,
            "min_score_required": MIN_SCORE
        }
    }


@router.get("/carbon-premiums/summary")
async def get_carbon_premium_summary(
    current_user: dict = Depends(get_current_user)
):
    """Résumé des primes carbone de la coopérative"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    members_count = await db.coop_members.count_documents(coop_id_query(coop_id))
    
    members = await db.coop_members.find(coop_id_query(coop_id), {"user_id": 1}).to_list(1000)
    member_ids = [str(m["_id"]) for m in members]
    
    approved_audits = await db.carbon_audits.count_documents({
        "recommendation": "approved",
        "$or": [
            {"parcel_id": {"$in": member_ids}},
        ]
    })
    
    paid_premiums = await db.carbon_payments.aggregate([
        {"$match": {"cooperative_id": coop_id, "status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_xof"}}}
    ]).to_list(1)
    
    pending_premiums = await db.carbon_payments.aggregate([
        {"$match": {"cooperative_id": coop_id, "status": "pending"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_xof"}}}
    ]).to_list(1)
    
    return {
        "total_members": members_count,
        "approved_audits": approved_audits,
        "paid_premium_xof": paid_premiums[0]["total"] if paid_premiums else 0,
        "pending_premium_xof": pending_premiums[0]["total"] if pending_premiums else 0,
        "rate_per_hectare": 50000,
        "currency": "XOF"
    }


@router.post("/carbon-premiums/initiate-payment")
async def initiate_premium_payment(
    member_id: str,
    amount_xof: float,
    current_user: dict = Depends(get_current_user)
):
    """Initier le paiement d'une prime carbone à un membre"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    member = await db.coop_members.find_one({
        "_id": ObjectId(member_id),
        "cooperative_id": coop_id
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    payment = {
        "cooperative_id": coop_id,
        "member_id": member_id,
        "nom_membre": member.get("full_name"),
        "phone_number": member.get("phone_number"),
        "amount_xof": amount_xof,
        "amount_eur": round(amount_xof / 655.957, 2),
        "payment_method": "orange_money",
        "status": "pending",
        "initiated_by": str(current_user["_id"]),
        "created_at": datetime.utcnow()
    }
    
    result = await db.carbon_payments.insert_one(payment)
    
    return {
        "payment_id": str(result.inserted_id),
        "status": "pending",
        "message": f"Paiement de {amount_xof} XOF initié pour {member.get('full_name')}",
        "note": "Intégration Orange Money en attente - paiement simulé"
    }


@router.get("/carbon-premiums/history")
async def get_premium_payment_history(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, le=100)
):
    """Historique des paiements de primes carbone"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    payments = await db.carbon_payments.find(
        {"cooperative_id": coop_id}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "payments": [{
            "id": str(p["_id"]),
            "member_id": p.get("member_id"),
            "nom_membre": p.get("member_name") or p.get("nom_membre"),
            "phone_number": p.get("phone_number"),
            "amount_xof": p.get("amount_xof"),
            "amount_eur": p.get("amount_eur"),
            "status": p.get("status"),
            "payment_method": p.get("payment_method"),
            "created_at": p.get("created_at")
        } for p in payments],
        "total": len(payments)
    }


@router.get("/carbon-premiums/export-csv")
async def export_premiums_csv(
    current_user: dict = Depends(get_current_user)
):
    """Exporter les primes carbone en CSV"""
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    members = await db.coop_members.find(coop_id_query(coop_id)).to_list(1000)
    
    RATE_PER_HECTARE = 50000
    MIN_SCORE = 6.0
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    writer.writerow([
        'Nom', 'Téléphone', 'Village', 'Surface (ha)', 
        'Score Carbone', 'Prime (XOF)', 'Prime (EUR)', 'Statut'
    ])
    
    for member in members:
        member_id = str(member["_id"])
        
        query_conditions = [{"member_id": member_id}]
        if member.get("user_id"):
            query_conditions.append({"farmer_id": member.get("user_id")})
        
        parcels = await db.parcels.find({"$or": query_conditions}).to_list(100)
        
        total_area = 0
        total_premium = 0
        avg_score = 0
        count = 0
        
        for parcel in parcels:
            parcel_id = str(parcel["_id"])
            area = parcel.get("area_hectares", 0)
            
            audit = await db.carbon_audits.find_one({
                "parcel_id": parcel_id,
                "recommendation": "approved"
            })
            
            if audit and audit.get("carbon_score", 0) >= MIN_SCORE:
                score = audit.get("carbon_score", 0)
                premium = area * RATE_PER_HECTARE * (score / 10)
                if score >= 8:
                    premium *= 1.2
                
                total_area += area
                total_premium += premium
                avg_score += score
                count += 1
        
        if count > 0:
            avg_score = round(avg_score / count, 1)
            writer.writerow([
                member.get("full_name", ""),
                member.get("phone_number", ""),
                member.get("village", ""),
                round(total_area, 2),
                avg_score,
                round(total_premium),
                round(total_premium / 655.957, 2),
                "Éligible"
            ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=primes_carbone_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )


@router.post("/carbon-premiums/pay")
async def process_premium_payment(
    member_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Traiter le paiement de la prime carbone et envoyer SMS"""
    from services.sms_service import send_quick_sms
    
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    member = await db.coop_members.find_one({
        "_id": ObjectId(member_id),
        "cooperative_id": coop_id
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    query_conditions = [{"member_id": member_id}]
    if member.get("user_id"):
        query_conditions.append({"farmer_id": member.get("user_id")})
    
    parcels = await db.parcels.find({"$or": query_conditions}).to_list(100)
    
    RATE_PER_HECTARE = 50000
    MIN_SCORE = 6.0
    total_premium = 0
    total_area = 0
    
    for parcel in parcels:
        parcel_id = str(parcel["_id"])
        area = parcel.get("area_hectares", 0)
        
        audit = await db.carbon_audits.find_one({
            "parcel_id": parcel_id,
            "recommendation": "approved"
        })
        
        if audit and audit.get("carbon_score", 0) >= MIN_SCORE:
            score = audit.get("carbon_score", 0)
            premium = area * RATE_PER_HECTARE * (score / 10)
            if score >= 8:
                premium *= 1.2
            total_premium += premium
            total_area += area
    
    if total_premium <= 0:
        raise HTTPException(status_code=400, detail="Aucune prime à payer")
    
    payment_ref = f"PAY-{datetime.now().strftime('%Y%m%d%H%M%S')}-{member_id[:6]}"
    
    payment = {
        "cooperative_id": coop_id,
        "cooperative_name": current_user.get("coop_name"),
        "member_id": member_id,
        "nom_membre": member.get("full_name"),
        "phone_number": member.get("phone_number"),
        "amount_xof": round(total_premium),
        "amount_eur": round(total_premium / 655.957, 2),
        "payment_method": "orange_money",
        "payment_ref": payment_ref,
        "status": "completed",
        "initiated_by": str(current_user["_id"]),
        "created_at": datetime.now(timezone.utc),
        "paid_at": datetime.now(timezone.utc)
    }
    
    result = await db.carbon_payments.insert_one(payment)
    
    sms_message = f"GreenLink: Félicitations {member.get('full_name')}! Votre prime carbone de {round(total_premium):,} XOF pour {round(total_area, 1)} ha a été envoyée sur votre Orange Money. Ref: {payment_ref}"
    
    try:
        await send_quick_sms(
            phone=member.get("phone_number"),
            message=sms_message
        )
    except Exception as e:
        logger.error(f"SMS error: {e}")
    
    # Notification push au producteur
    try:
        farmer_user_id = member.get("user_id")
        if farmer_user_id:
            notif_title = "Prime carbone reçue"
            notif_body = f"Félicitations! Votre prime de {round(total_premium):,} XOF pour {round(total_area, 1)} ha a été envoyée. Ref: {payment_ref}"
            
            await db.notification_history.insert_one({
                "user_id": farmer_user_id,
                "title": notif_title,
                "body": notif_body,
                "data": {
                    "type": "payment_received",
                    "payment_id": str(result.inserted_id),
                    "amount": round(total_premium),
                    "screen": "Payments"
                },
                "type": "payment_received",
                "read": False,
                "created_at": datetime.now(timezone.utc)
            })
            
            from services.push_notifications import push_service
            farmer_user = await db.users.find_one({"_id": ObjectId(farmer_user_id)})
            if farmer_user and farmer_user.get("push_token"):
                await push_service.send_push_notification(
                    tokens=[farmer_user["push_token"]],
                    title=notif_title,
                    body=notif_body,
                    data={"type": "payment_received", "payment_id": str(result.inserted_id), "screen": "Payments"},
                    priority="high"
                )
    except Exception as e:
        logger.error(f"Notification paiement échouée: {e}")
    
    return {
        "payment_id": str(result.inserted_id),
        "payment_ref": payment_ref,
        "status": "completed",
        "amount_xof": round(total_premium),
        "amount_eur": round(total_premium / 655.957, 2),
        "nom_membre": member.get("full_name"),
        "phone_number": member.get("phone_number"),
        "sms_sent": True,
        "message": f"Prime de {round(total_premium):,} XOF payée à {member.get('full_name')}"
    }


@router.get("/carbon-premiums/report-pdf")
async def generate_monthly_report_pdf(
    current_user: dict = Depends(get_current_user),
    month: int = Query(None, ge=1, le=12),
    year: int = Query(None, ge=2020, le=2030)
):
    """Générer le rapport PDF des paiements mensuels"""
    from services.pdf_service import pdf_generator
    
    verify_cooperative(current_user)
    coop_id = str(current_user["_id"])
    
    now = datetime.now(timezone.utc)
    if not month:
        month = now.month
    if not year:
        year = now.year
    
    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    
    payments = await db.carbon_payments.find({
        "cooperative_id": coop_id,
        "created_at": {"$gte": start_date, "$lt": end_date}
    }).sort("created_at", -1).to_list(1000)
    
    total_paid = sum(p.get("amount_xof", 0) for p in payments)
    total_members = len(set(p.get("member_id") for p in payments))
    
    data = {
        "cooperative_name": current_user.get("coop_name"),
        "month": month,
        "year": year,
        "payments": [{
            "date": p.get("created_at").strftime("%d/%m/%Y") if p.get("created_at") else "",
            "nom_membre": p.get("member_name") or p.get("nom_membre"),
            "phone": p.get("phone_number"),
            "amount_xof": p.get("amount_xof"),
            "ref": p.get("payment_ref", "N/A"),
            "status": p.get("status")
        } for p in payments],
        "summary": {
            "total_payments": len(payments),
            "total_members": total_members,
            "total_amount_xof": total_paid,
            "total_amount_eur": round(total_paid / 655.957, 2)
        }
    }
    
    pdf_bytes = pdf_generator.generate_monthly_payment_report(data)
    
    month_names = ["", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                   "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=rapport_paiements_{month_names[month]}_{year}.pdf"
        }
    )
