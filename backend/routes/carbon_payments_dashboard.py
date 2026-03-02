# Dashboard des paiements carbone pour les producteurs
# Affiche les gains, versements reçus et projections

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user
from carbon_business_model import (
    calculate_sequestration_rate, 
    calculate_farmer_premium_per_kg,
    CarbonCreditCalculation,
    FARMER_SHARE_RATE,
    COOPERATIVE_SHARE_RATE,
    USD_TO_XOF
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/carbon-payments", tags=["Carbon Payments Dashboard"])


@router.get("/dashboard")
async def get_carbon_payments_dashboard(
    current_user: dict = Depends(get_current_user)
):
    """
    Tableau de bord des paiements carbone pour un producteur.
    Affiche les gains totaux, versements reçus, et projections.
    """
    user_id = str(current_user.get('_id'))
    user_type = current_user.get('user_type')
    
    # Pour les coopératives, afficher l'agrégat de tous les membres
    if user_type == 'cooperative':
        return await get_cooperative_carbon_dashboard(current_user)
    
    # Récupérer les parcelles du producteur
    parcels = await db.parcels.find({
        "$or": [
            {"farmer_id": user_id},
            {"farmer_id": ObjectId(user_id)},
            {"user_id": user_id},
            {"user_id": ObjectId(user_id)}
        ]
    }).to_list(100)
    
    # Calculer le score carbone total
    total_hectares = 0
    total_tonnes_co2 = 0
    parcels_data = []
    
    for parcel in parcels:
        area = parcel.get('area_hectares', parcel.get('surface', 0))
        total_hectares += area
        
        # Calculer le score carbone de la parcelle
        calc_data = CarbonCreditCalculation(
            parcel_id=str(parcel['_id']),
            farmer_id=user_id,
            area_hectares=area,
            shade_trees_count=parcel.get('shade_trees_count', parcel.get('trees_count', 30)),
            tree_height_avg_meters=parcel.get('tree_height_avg', 6),
            organic_certified=parcel.get('organic_certified', False),
            uses_chemical_fertilizers=parcel.get('uses_chemicals', True),
            soil_residues_kept=parcel.get('soil_residues', False),
            has_cover_crops=parcel.get('cover_crops', False),
            tree_species_diversity=parcel.get('tree_species', 2),
            uses_biochar=parcel.get('uses_biochar', False),
            gps_verified=parcel.get('gps_verified', bool(parcel.get('gps_coordinates'))),
            drone_verified=parcel.get('drone_verified', False)
        )
        
        result = calculate_sequestration_rate(calc_data)
        parcel_tonnes = result['total_tonnes_co2']
        total_tonnes_co2 += parcel_tonnes
        
        parcels_data.append({
            "parcel_id": str(parcel['_id']),
            "name": parcel.get('name', parcel.get('parcel_name', f"Parcelle {len(parcels_data)+1}")),
            "area_hectares": area,
            "tonnes_co2_year": parcel_tonnes,
            "rate_per_hectare": result['rate_per_hectare'],
            "quality": result['quality']
        })
    
    # Récupérer les paiements carbone reçus
    carbon_payments = await db.carbon_payments.find({
        "$or": [
            {"farmer_id": user_id},
            {"farmer_id": ObjectId(user_id)}
        ]
    }).sort("payment_date", -1).to_list(100)
    
    total_received_xof = sum(p.get('amount_xof', 0) for p in carbon_payments if p.get('status') == 'completed')
    pending_xof = sum(p.get('amount_xof', 0) for p in carbon_payments if p.get('status') == 'pending')
    
    # Calculer les projections annuelles
    # Prix moyen du marché: 25 USD/tonne
    price_per_tonne_usd = 25
    annual_gross_usd = total_tonnes_co2 * price_per_tonne_usd
    annual_farmer_share_usd = annual_gross_usd * 0.73 * FARMER_SHARE_RATE  # 73% net après coûts
    annual_farmer_share_xof = annual_farmer_share_usd * USD_TO_XOF
    
    # Prime par kg de cacao
    premium_data = calculate_farmer_premium_per_kg(
        tonnes_co2=total_tonnes_co2,
        price_per_tonne_usd=price_per_tonne_usd,
        area_hectares=total_hectares if total_hectares > 0 else 1
    )
    
    # Historique des 12 derniers mois
    twelve_months_ago = datetime.utcnow() - timedelta(days=365)
    monthly_payments = {}
    
    for payment in carbon_payments:
        if payment.get('status') == 'completed' and payment.get('payment_date'):
            payment_date = payment['payment_date']
            if isinstance(payment_date, str):
                payment_date = datetime.fromisoformat(payment_date.replace('Z', '+00:00'))
            if payment_date >= twelve_months_ago:
                month_key = payment_date.strftime('%Y-%m')
                monthly_payments[month_key] = monthly_payments.get(month_key, 0) + payment.get('amount_xof', 0)
    
    # Formater l'historique mensuel
    monthly_history = []
    current_date = datetime.utcnow()
    for i in range(12):
        month_date = current_date - timedelta(days=30*i)
        month_key = month_date.strftime('%Y-%m')
        monthly_history.append({
            "month": month_date.strftime('%b %Y'),
            "month_key": month_key,
            "amount_xof": monthly_payments.get(month_key, 0)
        })
    
    monthly_history.reverse()
    
    # Prochains versements programmés
    next_payments = await db.carbon_payments.find({
        "$or": [
            {"farmer_id": user_id},
            {"farmer_id": ObjectId(user_id)}
        ],
        "status": {"$in": ["scheduled", "pending", "processing"]}
    }).sort("scheduled_date", 1).to_list(5)
    
    upcoming_payments = [
        {
            "id": str(p['_id']),
            "amount_xof": p.get('amount_xof', 0),
            "scheduled_date": p.get('scheduled_date', p.get('created_at')),
            "status": p.get('status'),
            "source": p.get('source', 'Crédits Carbone')
        }
        for p in next_payments
    ]
    
    return {
        "farmer_info": {
            "id": user_id,
            "name": current_user.get('full_name'),
            "cooperative": current_user.get('cooperative_name'),
            "cooperative_id": current_user.get('cooperative_id')
        },
        "carbon_score": {
            "total_hectares": round(total_hectares, 2),
            "total_tonnes_co2_year": round(total_tonnes_co2, 2),
            "avg_rate_per_hectare": round(total_tonnes_co2 / total_hectares, 2) if total_hectares > 0 else 0,
            "parcels_count": len(parcels_data),
            "parcels": parcels_data
        },
        "earnings": {
            "total_received_xof": total_received_xof,
            "pending_xof": pending_xof,
            "annual_projection_xof": round(annual_farmer_share_xof, 0),
            "premium_per_kg_xof": premium_data['premium_per_kg_xof'],
            "payments_count": len([p for p in carbon_payments if p.get('status') == 'completed'])
        },
        "monthly_history": monthly_history,
        "upcoming_payments": upcoming_payments,
        "recent_payments": [
            {
                "id": str(p['_id']),
                "amount_xof": p.get('amount_xof', 0),
                "payment_date": p.get('payment_date'),
                "status": p.get('status'),
                "source": p.get('source', 'Prime Carbone'),
                "transaction_ref": p.get('transaction_ref')
            }
            for p in carbon_payments[:10]
        ],
        "distribution_model": {
            "farmer_share_rate": f"{FARMER_SHARE_RATE * 100:.0f}%",
            "cooperative_share_rate": f"{COOPERATIVE_SHARE_RATE * 100:.0f}%",
            "payment_method": "Via Coopérative → Orange Money",
            "payment_frequency": "Trimestriel"
        }
    }


async def get_cooperative_carbon_dashboard(coop_user: dict):
    """Dashboard carbone pour une coopérative (agrégat de tous les membres)"""
    coop_id = str(coop_user.get('_id'))
    
    # Récupérer tous les membres
    members = await db.coop_members.find({"coop_id": coop_id}).to_list(1000)
    
    total_hectares = 0
    total_tonnes_co2 = 0
    total_distributed_xof = 0
    total_pending_xof = 0
    
    member_stats = []
    
    for member in members:
        member_id = str(member['_id'])
        member_hectares = member.get('total_hectares', 0)
        total_hectares += member_hectares
        
        # Estimation du score carbone (3.5 t/ha en moyenne)
        member_tonnes = member_hectares * 3.5
        total_tonnes_co2 += member_tonnes
        
        # Paiements reçus par ce membre
        member_payments = await db.carbon_payments.find({
            "farmer_id": member_id,
            "status": "completed"
        }).to_list(100)
        
        member_received = sum(p.get('amount_xof', 0) for p in member_payments)
        total_distributed_xof += member_received
        
        member_stats.append({
            "member_id": member_id,
            "name": member.get('full_name', member.get('name')),
            "hectares": member_hectares,
            "tonnes_co2": round(member_tonnes, 2),
            "received_xof": member_received
        })
    
    # Paiements de la coopérative (reçus de GreenLink)
    coop_payments = await db.carbon_payments.find({
        "cooperative_id": coop_id
    }).sort("payment_date", -1).to_list(100)
    
    total_received_from_greenlink = sum(
        p.get('total_amount_xof', 0) for p in coop_payments if p.get('status') == 'completed'
    )
    
    # Commission de la coopérative
    coop_commission_xof = total_received_from_greenlink * COOPERATIVE_SHARE_RATE
    
    return {
        "cooperative_info": {
            "id": coop_id,
            "name": coop_user.get('coop_name', coop_user.get('full_name')),
            "members_count": len(members)
        },
        "carbon_score": {
            "total_hectares": round(total_hectares, 2),
            "total_tonnes_co2_year": round(total_tonnes_co2, 2),
            "avg_rate_per_hectare": 3.5
        },
        "finances": {
            "received_from_greenlink_xof": total_received_from_greenlink,
            "distributed_to_members_xof": total_distributed_xof,
            "cooperative_commission_xof": round(coop_commission_xof, 0),
            "pending_distribution_xof": total_received_from_greenlink - total_distributed_xof - coop_commission_xof
        },
        "member_stats": sorted(member_stats, key=lambda x: x['tonnes_co2'], reverse=True)[:20],
        "recent_payments": [
            {
                "id": str(p['_id']),
                "total_amount_xof": p.get('total_amount_xof', 0),
                "payment_date": p.get('payment_date'),
                "status": p.get('status'),
                "members_paid": p.get('members_count', 0)
            }
            for p in coop_payments[:10]
        ]
    }


@router.get("/history")
async def get_payment_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Historique détaillé des paiements carbone"""
    user_id = str(current_user.get('_id'))
    
    query = {
        "$or": [
            {"farmer_id": user_id},
            {"farmer_id": ObjectId(user_id)}
        ]
    }
    
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    
    total = await db.carbon_payments.count_documents(query)
    payments = await db.carbon_payments.find(query).sort("payment_date", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "payments": [
            {
                "id": str(p['_id']),
                "amount_xof": p.get('amount_xof', 0),
                "amount_usd": p.get('amount_usd', 0),
                "tonnes_co2": p.get('tonnes_co2', 0),
                "payment_date": p.get('payment_date'),
                "scheduled_date": p.get('scheduled_date'),
                "status": p.get('status'),
                "source": p.get('source', 'Prime Carbone'),
                "payment_method": p.get('payment_method', 'Orange Money'),
                "transaction_ref": p.get('transaction_ref'),
                "cooperative_name": p.get('cooperative_name'),
                "period": p.get('period')
            }
            for p in payments
        ]
    }


@router.post("/request-payment")
async def request_carbon_payment(
    current_user: dict = Depends(get_current_user)
):
    """
    Demander un versement des primes carbone accumulées.
    Le paiement sera traité via la coopérative.
    """
    user_id = str(current_user.get('_id'))
    
    # Vérifier s'il y a des primes non versées
    # Dans un système réel, on calculerait les crédits non encore payés
    
    # Créer une demande de paiement
    payment_request = {
        "farmer_id": user_id,
        "farmer_name": current_user.get('full_name'),
        "cooperative_id": current_user.get('cooperative_id'),
        "status": "pending",
        "request_type": "carbon_premium",
        "requested_at": datetime.utcnow(),
        "notes": "Demande de versement des primes carbone accumulées"
    }
    
    result = await db.payment_requests.insert_one(payment_request)
    
    # Notifier la coopérative
    if current_user.get('cooperative_id'):
        await db.notifications.insert_one({
            "user_id": current_user.get('cooperative_id'),
            "title": "Demande de paiement carbone",
            "body": f"{current_user.get('full_name')} demande le versement de ses primes carbone",
            "type": "payment_request",
            "data": {"request_id": str(result.inserted_id)},
            "created_at": datetime.utcnow(),
            "is_read": False
        })
    
    return {
        "success": True,
        "request_id": str(result.inserted_id),
        "message": "Votre demande a été envoyée à votre coopérative. Le paiement sera traité lors du prochain versement."
    }


@router.get("/projections")
async def get_carbon_projections(
    years: int = Query(default=5, ge=1, le=10),
    current_user: dict = Depends(get_current_user)
):
    """
    Projections des revenus carbone sur plusieurs années.
    Basé sur les parcelles actuelles et les prix du marché.
    """
    user_id = str(current_user.get('_id'))
    
    # Récupérer les parcelles
    parcels = await db.parcels.find({
        "$or": [
            {"farmer_id": user_id},
            {"user_id": user_id}
        ]
    }).to_list(100)
    
    total_hectares = sum(p.get('area_hectares', p.get('surface', 0)) for p in parcels)
    
    # Estimation du score carbone (avec amélioration progressive)
    base_rate = 3.5  # t CO2/ha/an
    
    projections = []
    cumulative_earnings_xof = 0
    
    for year in range(1, years + 1):
        # Amélioration progressive des pratiques (+5% par an)
        year_rate = base_rate * (1 + 0.05 * (year - 1))
        year_tonnes = total_hectares * year_rate
        
        # Prix du marché (tendance haussière de 3% par an)
        year_price_usd = 25 * (1 + 0.03 * (year - 1))
        
        # Calcul des revenus
        gross_usd = year_tonnes * year_price_usd
        farmer_share_usd = gross_usd * 0.73 * FARMER_SHARE_RATE
        farmer_share_xof = farmer_share_usd * USD_TO_XOF
        
        cumulative_earnings_xof += farmer_share_xof
        
        projections.append({
            "year": year,
            "year_label": f"Année {year}",
            "tonnes_co2": round(year_tonnes, 2),
            "price_per_tonne_usd": round(year_price_usd, 2),
            "earnings_xof": round(farmer_share_xof, 0),
            "cumulative_xof": round(cumulative_earnings_xof, 0)
        })
    
    return {
        "farmer_id": user_id,
        "total_hectares": round(total_hectares, 2),
        "base_rate_per_hectare": base_rate,
        "projections": projections,
        "summary": {
            "total_5_years_xof": round(cumulative_earnings_xof, 0),
            "avg_annual_xof": round(cumulative_earnings_xof / years, 0),
            "improvement_potential": "Augmentez vos arbres d'ombrage pour améliorer votre score carbone"
        }
    }
