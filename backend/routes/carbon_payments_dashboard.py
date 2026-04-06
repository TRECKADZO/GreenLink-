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
    # Utiliser le prix réel fixé par le Super Admin sur le Marché Carbone
    config = await db.carbon_config.find_one({"key": "default_price"})
    price_per_tonne_xof = config.get("value", 15000) if config else 15000
    price_per_tonne_usd = price_per_tonne_xof / USD_TO_XOF
    
    annual_gross_xof = total_tonnes_co2 * price_per_tonne_xof
    annual_net_xof = annual_gross_xof * (1 - 0.30)  # 30% frais
    annual_farmer_share_xof = annual_net_xof * FARMER_SHARE_RATE  # 70% du net
    annual_greenlink_xof = annual_net_xof * 0.25  # 25% du net
    annual_coop_xof = annual_net_xof * COOPERATIVE_SHARE_RATE  # 5% du net
    
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
        "premium_details": premium_data
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
    try:
        user_id = str(current_user.get('_id'))
        
        # Vérifier si une demande est déjà en cours
        existing = await db.payment_requests.find_one({
            "farmer_id": user_id,
            "status": "pending",
            "request_type": "carbon_premium"
        })
        if existing:
            return {
                "success": True,
                "request_id": str(existing["_id"]),
                "message": "Vous avez déjà une demande en cours. Elle sera traitée lors du prochain versement."
            }
        
        # Trouver la vraie cooperative du planteur (via coop_members ou users.cooperative_id)
        farmer_coop_id = current_user.get('cooperative_id')
        if not farmer_coop_id:
            # Chercher dans coop_members
            member = await db.coop_members.find_one({
                "$or": [
                    {"phone_number": current_user.get("phone_number")},
                    {"user_id": user_id}
                ]
            })
            if member:
                farmer_coop_id = str(member.get("coop_id", ""))
        
        # Créer une demande de paiement
        payment_request = {
            "farmer_id": user_id,
            "farmer_name": current_user.get('full_name'),
            "cooperative_id": farmer_coop_id,
            "status": "pending",
            "request_type": "carbon_premium",
            "requested_at": datetime.utcnow(),
            "notes": "Demande de versement des primes carbone accumulées"
        }
        
        result = await db.payment_requests.insert_one(payment_request)
        
        # Notifier la coopérative (dans la collection 'notifications' lue par le frontend)
        if farmer_coop_id:
            # Verifier que le destinataire n'est pas un admin
            coop_user = await db.users.find_one({"_id": ObjectId(farmer_coop_id)}) if ObjectId.is_valid(farmer_coop_id) else None
            if coop_user and coop_user.get("user_type") not in ("admin", "super_admin"):
                await db.notifications.insert_one({
                    "user_id": farmer_coop_id,
                    "title": "Demande de paiement carbone",
                    "message": f"{current_user.get('full_name')} demande le versement de ses primes carbone",
                    "type": "payment_request",
                    "data": {"request_id": str(result.inserted_id), "farmer_id": user_id},
                    "read": False,
                    "created_at": datetime.utcnow()
                })
        
        return {
            "success": True,
            "request_id": str(result.inserted_id),
            "message": "Votre demande a été envoyée à votre coopérative. Le paiement sera traité lors du prochain versement."
        }
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Payment request error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")


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



# ============= CALCULATEUR "MA PRIME" POUR LE PLANTEUR =============

from pydantic import BaseModel, Field
from carbon_business_model import (
    SEQUESTRATION_RATES,
    FEES_RATE,
    GREENLINK_MARGIN_RATE
)


class MaPrimeRequest(BaseModel):
    """14 questions alignées avec le USSD *144*99# détaillé (avec 3 strates de canopée)"""
    hectares: float = Field(..., gt=0, description="Superficie en hectares")
    arbres_grands: int = Field(0, ge=0, description="Arbres GRANDS > 12 mètres")
    arbres_moyens: int = Field(0, ge=0, description="Arbres MOYENS 8-12 mètres")
    arbres_petits: int = Field(0, ge=0, description="Arbres PETITS < 8 mètres")
    engrais: str = Field(..., description="oui/non - Utilise des engrais chimiques?")
    brulage: str = Field(..., description="oui/non - Pratique le brûlage des résidus?")
    compost: str = Field(..., description="oui/non - Utilise du compost organique?")
    agroforesterie: str = Field(..., description="oui/non - Pratique l'agroforesterie?")
    couverture_sol: str = Field(..., description="oui/non - Couverture végétale au sol?")
    biochar: str = Field(..., description="oui/non - Utilise du biochar?")
    zero_deforestation: str = Field(..., description="oui/non - Engagement zéro déforestation?")
    reboisement: str = Field(..., description="oui/non - Fait du reboisement?")
    age_cacaoyers: str = Field(..., description="jeune/mature/vieux - Âge des cacaoyers")
    culture: str = Field(..., description="cacao/cafe/anacarde - Culture principale")


@router.post("/ma-prime")
async def calculer_ma_prime(data: MaPrimeRequest, current_user: dict = Depends(get_current_user)):
    """
    Calculateur de prime carbone pour le planteur.
    14 questions alignées avec le USSD *144*99# détaillé (3 strates de canopée)
    """
    # 1. Calcul pondéré des arbres (coefficients allométriques)
    # Grands (>12m): coef 1.0, Moyens (8-12m): coef 0.7, Petits (<8m): coef 0.3
    weighted_trees = (data.arbres_grands * 1.0) + (data.arbres_moyens * 0.7) + (data.arbres_petits * 0.3)
    arbres_par_ha = weighted_trees / max(data.hectares, 0.1)
    
    # Taux de séquestration CO2 basé sur les arbres pondérés
    if arbres_par_ha >= 80:
        co2_rate = SEQUESTRATION_RATES["shade_trees_per_ha"]["very_high"]["rate"]
    elif arbres_par_ha >= 40:
        co2_rate = SEQUESTRATION_RATES["shade_trees_per_ha"]["high"]["rate"]
    elif arbres_par_ha >= 20:
        co2_rate = SEQUESTRATION_RATES["shade_trees_per_ha"]["medium"]["rate"]
    else:
        co2_rate = SEQUESTRATION_RATES["shade_trees_per_ha"]["low"]["rate"]

    # 2. Bonus/Malus pour les pratiques (questions 5-14)
    # Q5: Engrais chimique
    if data.engrais == "non":
        co2_rate += SEQUESTRATION_RATES["organic_practices"]
    else:
        co2_rate -= 0.3
    
    # Q6: Brûlage
    if data.brulage == "non":
        co2_rate += 0.5
    else:
        co2_rate -= 1.5
    
    # Q7: Compost
    if data.compost == "oui":
        co2_rate += 1.0
    
    # Q8: Agroforesterie
    if data.agroforesterie == "oui":
        co2_rate += 1.0
    
    # Q9: Couverture végétale
    if data.couverture_sol == "oui":
        co2_rate += SEQUESTRATION_RATES["cover_crops"]
    
    # Q10: Biochar
    if data.biochar == "oui":
        co2_rate += 0.3
    
    # Q11: Zéro déforestation
    if data.zero_deforestation == "oui":
        co2_rate += 0.3
    
    # Q12: Reboisement
    if data.reboisement == "oui":
        co2_rate += 0.4
    
    # Q13: Âge des cacaoyers (bonus pour maturité)
    if data.age_cacaoyers == "mature":
        co2_rate += 0.3
    elif data.age_cacaoyers == "vieux":
        co2_rate += 0.1  # Moins productif mais stocke du carbone

    # Plafonner le score
    co2_rate = max(0.5, min(co2_rate, 10.0))

    # 3. Total tonnes CO2 par an
    tonnes_co2_year = co2_rate * data.hectares

    # 4. Prix de vente fixé par le Super Admin
    config = await db.carbon_config.find_one({"key": "default_price"})
    price_per_tonne_xof = config.get("value", 15000) if config else 15000

    # 5. Calcul de la prime planteur
    gross = tonnes_co2_year * price_per_tonne_xof
    net = gross * (1 - FEES_RATE)           # -30% frais
    farmer_share = net * FARMER_SHARE_RATE   # 70% du net

    # 6. Prime par kg selon la culture
    yields = {"cacao": 600, "cafe": 400, "anacarde": 500}  # kg/ha typique
    yield_kg_per_ha = yields.get(data.culture, 600)
    total_yield_kg = data.hectares * yield_kg_per_ha
    prime_par_kg = round(farmer_share / total_yield_kg) if total_yield_kg > 0 else 0

    # 7. Calcul niveau Certification
    cert_pct = 0
    # Arbres d'ombrage (pondérés)
    if arbres_par_ha >= 40:
        cert_pct += 25
    elif arbres_par_ha >= 20:
        cert_pct += 15
    elif arbres_par_ha >= 10:
        cert_pct += 8
    # Pas d'engrais chimique
    if data.engrais == "non":
        cert_pct += 15
    # Pas de brûlage
    if data.brulage == "non":
        cert_pct += 20
    # Compost
    if data.compost == "oui":
        cert_pct += 10
    # Agroforesterie
    if data.agroforesterie == "oui":
        cert_pct += 10
    # Zéro déforestation
    if data.zero_deforestation == "oui":
        cert_pct += 10
    # Reboisement
    if data.reboisement == "oui":
        cert_pct += 10

    if cert_pct >= 80:
        cert_level = "Excellent"
        cert_conseil = "Bravo ! Niveau Excellent. Vos pratiques sont exemplaires."
    elif cert_pct >= 55:
        cert_level = "Très Bon"
        cert_conseil = "Bon niveau. Quelques améliorations pour atteindre l'Excellence."
    elif cert_pct >= 30:
        cert_level = "Bon"
        cert_conseil = "Niveau Bon. Plantez plus d'arbres et arrêtez le brûlage pour progresser."
    else:
        cert_level = "À améliorer"
        cert_conseil = "Commencez par planter des arbres d'ombrage et arrêter le brûlage."

    # 8. Conseil personnalisé
    conseil = _generer_conseil_14q(data, co2_rate, weighted_trees)

    # Totaux arbres
    total_arbres = data.arbres_grands + data.arbres_moyens + data.arbres_petits

    return {
        "prime_par_kg_fcfa": prime_par_kg,
        "prime_annuelle_fcfa": round(farmer_share),
        "tonnes_co2_an": round(tonnes_co2_year, 1),
        "culture": data.culture,
        "hectares": data.hectares,
        "arbres_par_ha": int(arbres_par_ha),
        "total_arbres": total_arbres,
        "arbres_ponderes": round(weighted_trees, 1),
        "score_carbone": round(co2_rate, 1),
        "rendement_kg_ha": yield_kg_per_ha,
        "conseil": conseil,
        "ars_level": cert_level,
        "ars_pct": min(cert_pct, 100),
        "ars_conseil": cert_conseil
    }


def _generer_conseil_14q(data: MaPrimeRequest, score: float, weighted_trees: float) -> str:
    """Génère un conseil personnalisé basé sur les 14 questions."""
    conseils = []
    
    if data.brulage == "oui":
        conseils.append("Arrêtez le brûlage pour augmenter votre prime de +20%")
    
    if data.engrais == "oui":
        conseils.append("Passez aux engrais organiques pour une meilleure prime")
    
    if data.compost == "non":
        conseils.append("Utilisez du compost pour enrichir vos sols")
    
    if data.agroforesterie == "non":
        conseils.append("L'agroforesterie peut augmenter votre score de +10%")
    
    arbres_par_ha = weighted_trees / max(data.hectares, 0.1)
    if arbres_par_ha < 40:
        conseils.append(f"Plantez plus d'arbres d'ombrage (actuellement {int(arbres_par_ha)} pondérés/ha, idéal: 40+)")
    
    if data.reboisement == "non":
        conseils.append("Le reboisement améliore votre score environnemental")
    
    total_arbres = data.arbres_grands + data.arbres_moyens + data.arbres_petits
    if total_arbres > 0 and data.arbres_grands < (total_arbres * 0.3):
        conseils.append("Favorisez les especes de Strate 3 (canopee >30m) pour un meilleur score")
    
    if score >= 7:
        return "Excellent ! Vos pratiques sont déjà très bonnes. Maintenez-les pour une prime optimale."
    elif conseils:
        return conseils[0]  # Premier conseil prioritaire
    else:
        return "Continuez vos bonnes pratiques pour maintenir votre prime."
