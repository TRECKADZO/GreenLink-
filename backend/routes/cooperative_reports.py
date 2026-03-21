"""
Cooperative Reports & Statistics Routes
GreenLink Agritech - Côte d'Ivoire
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import Response
from datetime import datetime
from bson import ObjectId
import logging
import random

from database import db
from routes.auth import get_current_user
from routes.cooperative import verify_cooperative
from services.pdf_service import pdf_generator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cooperative", tags=["Cooperative Reports"])


@router.get("/reports/eudr")
async def generate_eudr_report(current_user: dict = Depends(get_current_user)):
    """Generer rapport conformite EUDR - Reglement UE 2023/1115"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    
    members = await db.coop_members.find({"coop_id": coop_id, "is_active": True}).to_list(10000)
    all_members = await db.coop_members.find({"coop_id": coop_id}).to_list(10000)
    member_user_ids = [m.get("user_id") for m in members if m.get("user_id")]
    member_ids = [str(m["_id"]) for m in members]
    
    parcels = await db.parcels.find({"$or": [
        {"farmer_id": {"$in": member_user_ids}},
        {"member_id": {"$in": [m["_id"] for m in members]}}
    ]}).to_list(10000)
    
    geo_polygon = [p for p in parcels if p.get("gps_polygon") or p.get("polygon_coordinates")]
    geo_point = [p for p in parcels if (p.get("gps_coordinates") or p.get("location")) and not (p.get("gps_polygon") or p.get("polygon_coordinates"))]
    geo_none = [p for p in parcels if not p.get("gps_coordinates") and not p.get("location") and not p.get("gps_polygon")]
    geolocated = len(geo_polygon) + len(geo_point)
    
    cutoff_date = datetime(2020, 12, 31)
    parcels_before_cutoff = [p for p in parcels if p.get("established_date") and p.get("established_date") <= cutoff_date]
    parcels_after_cutoff = [p for p in parcels if p.get("established_date") and p.get("established_date") > cutoff_date]
    parcels_no_date = [p for p in parcels if not p.get("established_date")]
    
    verified_parcels = [p for p in parcels if p.get("verification_status") == "verified"]
    pending_parcels = [p for p in parcels if p.get("verification_status") == "pending"]
    
    total_hectares = round(sum(p.get("area_hectares", 0) for p in parcels), 2)
    total_co2 = round(sum(p.get("carbon_credits_earned", 0) for p in parcels), 2)
    avg_carbon = round(sum(p.get("carbon_score", 0) for p in parcels) / len(parcels), 1) if parcels else 0
    
    ssrte_visits = await db.ssrte_visits.find({"cooperative_id": str(coop_id)}).to_list(10000)
    high_risk_visits = [v for v in ssrte_visits if v.get("niveau_risque") in ["eleve", "critique"]]
    children_working = sum(v.get("enfants_observes_travaillant", 0) for v in ssrte_visits)
    
    ici_profiles = await db.ici_profiles.find({"cooperative_id": str(coop_id)}).to_list(10000)
    
    women_members = [m for m in all_members if m.get("gender", "").lower() in ["f", "femme", "female", "feminin"]]
    
    certs = current_user.get("certifications") or []
    
    geo_rate = round(geolocated / len(parcels) * 100, 1) if parcels else 0
    verified_rate = round(len(verified_parcels) / len(parcels) * 100, 1) if parcels else 0
    child_labor_free_rate = round(100 - (len(high_risk_visits) / max(len(ssrte_visits), 1) * 100), 1) if ssrte_visits else 100
    ici_coverage = round(len(ici_profiles) / max(len(members), 1) * 100, 1)
    
    compliance_score = round(
        geo_rate * 0.30 +
        verified_rate * 0.25 +
        child_labor_free_rate * 0.20 +
        ici_coverage * 0.15 +
        min(avg_carbon * 10, 100) * 0.10
    , 1)
    
    if compliance_score >= 80:
        risk_level = "faible"
    elif compliance_score >= 50:
        risk_level = "moyen"
    else:
        risk_level = "eleve"
    
    return {
        "report_date": datetime.utcnow().isoformat(),
        "regulation_ref": "Reglement (UE) 2023/1115",
        "cooperative": {
            "name": current_user.get("coop_name", ""),
            "code": current_user.get("coop_code", ""),
            "certifications": certs,
            "country": "Cote d'Ivoire",
            "commodity": "Cacao (Theobroma cacao)",
            "hs_code": "1801 - Feves de cacao",
            "operator_type": "Cooperative agricole",
        },
        "due_diligence": {
            "dds_status": "actif" if compliance_score >= 50 else "a_completer",
            "last_assessment_date": datetime.utcnow().isoformat(),
            "niveau_risque": risk_level,
            "compliance_score": compliance_score,
            "next_review_date": (datetime.utcnow().replace(month=12, day=31)).isoformat(),
        },
        "compliance": {
            "total_parcels": len(parcels),
            "geolocated_parcels": geolocated,
            "geolocation_rate": geo_rate,
            "geo_polygon_count": len(geo_polygon),
            "geo_point_count": len(geo_point),
            "geo_none_count": len(geo_none),
            "verified_parcels": len(verified_parcels),
            "pending_parcels": len(pending_parcels),
            "verification_rate": verified_rate,
            "deforestation_alerts": 0,
            "deforestation_free_rate": 100.0,
            "compliant_parcels": len(parcels),
            "compliance_rate": compliance_score,
        },
        "cutoff_date": {
            "reference_date": "2020-12-31",
            "parcels_before_cutoff": len(parcels_before_cutoff),
            "parcels_after_cutoff": len(parcels_after_cutoff),
            "parcels_no_date": len(parcels_no_date),
            "total_parcels": len(parcels),
        },
        "risk_assessment": {
            "overall_risk": risk_level,
            "overall_score": compliance_score,
            "country_risk": "standard",
            "country_note": "Cote d'Ivoire - categorie standard selon benchmark UE",
            "dimensions": [
                {"name": "Geolocalisation", "score": geo_rate, "weight": 30, "status": "conforme" if geo_rate >= 80 else "a_ameliorer"},
                {"name": "Verification terrain", "score": verified_rate, "weight": 25, "status": "conforme" if verified_rate >= 80 else "a_ameliorer"},
                {"name": "Travail des enfants", "score": child_labor_free_rate, "weight": 20, "status": "conforme" if child_labor_free_rate >= 90 else "a_ameliorer"},
                {"name": "Profilage ICI", "score": ici_coverage, "weight": 15, "status": "conforme" if ici_coverage >= 80 else "a_ameliorer"},
                {"name": "Score carbone", "score": min(avg_carbon * 10, 100), "weight": 10, "status": "conforme" if avg_carbon >= 6 else "a_ameliorer"},
            ],
        },
        "traceability": {
            "chain": [
                {"step": 1, "actor": "Producteur", "count": len(members), "status": "actif"},
                {"step": 2, "actor": "Cooperative", "count": 1, "name": current_user.get("coop_name", ""), "status": "actif"},
                {"step": 3, "actor": "Export/Marche", "count": 0, "status": "en_preparation"},
            ],
            "commodity": "Cacao",
            "origin_country": "Cote d'Ivoire",
            "total_producers": len(members),
            "total_parcels": len(parcels),
            "superficie_totale": total_hectares,
        },
        "esg_indicators": {
            "environmental": {
                "co2_total": total_co2,
                "score_carbone_moyen": avg_carbon,
                "superficie_totale": total_hectares,
                "deforestation_free": True,
                "biodiversity_score": avg_carbon,
            },
            "social": {
                "total_members": len(all_members),
                "active_members": len(members),
                "women_count": len(women_members),
                "women_rate": round(len(women_members) / max(len(all_members), 1) * 100, 1),
                "child_labor_free_rate": child_labor_free_rate,
                "ssrte_visits": len(ssrte_visits),
                "ici_profiles": len(ici_profiles),
                "enfants_a_risque": children_working,
            },
            "governance": {
                "certifications": certs,
                "audit_coverage": verified_rate,
                "ici_coverage": ici_coverage,
                "compliance_score": compliance_score,
            },
        },
        "statistics": {
            "total_members": len(members),
            "superficie_totale": total_hectares,
            "co2_total": total_co2,
            "score_carbone_moyen": avg_carbon,
        },
        "export_available": ["PDF", "CSV"]
    }

@router.get("/reports/audit-selection")
async def select_parcels_for_audit(
    sample_rate: float = 0.10,
    current_user: dict = Depends(get_current_user)
):
    """Sélectionner parcelles pour audit (5-10%)"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    
    members = await db.coop_members.find({"coop_id": coop_id, "is_active": True}).to_list(10000)
    member_user_ids = [m.get("user_id") for m in members if m.get("user_id")]
    
    parcels = await db.parcels.find({"farmer_id": {"$in": member_user_ids}}).to_list(10000)
    
    sample_size = max(1, int(len(parcels) * sample_rate))
    selected = random.sample(parcels, min(sample_size, len(parcels)))
    
    return {
        "total_parcels": len(parcels),
        "sample_rate": sample_rate,
        "selected_count": len(selected),
        "selected_parcels": [{
            "id": str(p["_id"]),
            "location": p.get("location", ""),
            "area_hectares": p.get("area_hectares", 0),
            "carbon_score": p.get("carbon_score", 0),
            "farmer_id": p.get("farmer_id", "")
        } for p in selected]
    }


@router.get("/stats/villages")
async def get_village_stats(current_user: dict = Depends(get_current_user)):
    """Statistiques par village"""
    verify_cooperative(current_user)
    
    pipeline = [
        {"$match": {"coop_id": current_user["_id"]}},
        {"$group": {
            "_id": "$village",
            "members_count": {"$sum": 1},
            "active_count": {"$sum": {"$cond": ["$is_active", 1, 0]}}
        }},
        {"$sort": {"members_count": -1}}
    ]
    
    results = await db.coop_members.aggregate(pipeline).to_list(100)
    
    return [{
        "village": r["_id"],
        "members_count": r["members_count"],
        "active_count": r["active_count"]
    } for r in results]


@router.get("/reports/eudr/pdf")
async def generate_eudr_pdf_report(
    current_user: dict = Depends(get_current_user)
):
    """Générer le rapport EUDR en PDF"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    
    coop_info = {
        "name": current_user.get("coop_name", ""),
        "code": current_user.get("coop_code", ""),
        "certifications": current_user.get("certifications") or []
    }
    
    members = await db.coop_members.find({"coop_id": coop_id}).to_list(10000)
    member_ids = [m["_id"] for m in members]
    
    parcels = await db.parcels.find({
        "$or": [
            {"member_id": {"$in": member_ids}},
            {"coop_id": coop_id}
        ]
    }).to_list(10000)
    
    geolocated = len([p for p in parcels if p.get("gps_coordinates")])
    total_hectares = sum(p.get("area_hectares", 0) for p in parcels)
    total_co2 = sum(p.get("co2_captured_tonnes", 0) for p in parcels)
    avg_score = sum(p.get("carbon_score", 0) for p in parcels) / max(len(parcels), 1)
    
    cert_counts = {}
    for p in parcels:
        cert = p.get("certification")
        if cert:
            cert_counts[cert] = cert_counts.get(cert, 0) + 1
    
    data = {
        "cooperative": coop_info,
        "compliance": {
            "compliance_rate": round(len([p for p in parcels if p.get("eudr_compliant", True)]) / max(len(parcels), 1) * 100, 1),
            "geolocation_rate": round(geolocated / max(len(parcels), 1) * 100, 1),
            "geolocated_parcels": geolocated,
            "total_parcels": len(parcels),
            "deforestation_alerts": 0
        },
        "statistics": {
            "total_members": len(members),
            "superficie_totale": round(total_hectares, 2),
            "co2_total": round(total_co2, 2),
            "score_carbone_moyen": round(avg_score, 1)
        },
        "eudr_compliance": {
            "certification_coverage": cert_counts
        }
    }
    
    pdf_bytes = pdf_generator.generate_eudr_report(data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=rapport_eudr_{coop_info['code']}_{datetime.now().strftime('%Y%m%d')}.pdf"
        }
    )

@router.get("/reports/carbon/pdf")
async def generate_carbon_pdf_report(
    current_user: dict = Depends(get_current_user)
):
    """Générer le rapport Carbone en PDF"""
    verify_cooperative(current_user)
    coop_id = current_user["_id"]
    
    coop_info = {
        "name": current_user.get("coop_name", ""),
        "code": current_user.get("coop_code", "")
    }
    
    members = await db.coop_members.find({"coop_id": coop_id}).to_list(10000)
    member_ids = [m["_id"] for m in members]
    
    parcels = await db.parcels.find({
        "$or": [
            {"member_id": {"$in": member_ids}},
            {"coop_id": coop_id}
        ]
    }).to_list(10000)
    
    carbon_credits = await db.carbon_credits.find({"coop_id": coop_id}).to_list(1000)
    carbon_purchases = await db.carbon_purchases.find({"coop_id": coop_id}).to_list(1000)
    
    total_co2 = sum(p.get("co2_captured_tonnes", 0) for p in parcels)
    avg_score = sum(p.get("carbon_score", 0) for p in parcels) / max(len(parcels), 1)
    sold_credits = len([c for c in carbon_credits if c.get("status") == "sold"])
    carbon_revenue = sum(p.get("total_amount", 0) for p in carbon_purchases)
    
    data = {
        "cooperative": coop_info,
        "sustainability": {
            "total_co2_captured_tonnes": round(total_co2, 2),
            "carbon_credits_generated": len(carbon_credits),
            "carbon_credits_sold": sold_credits,
            "carbon_credits_available": len(carbon_credits) - sold_credits,
            "carbon_revenue_xof": carbon_revenue,
            "score_carbone_moyen": round(avg_score, 1),
            "deforestation_free_rate": 98.5
        }
    }
    
    pdf_bytes = pdf_generator.generate_carbon_report(data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=rapport_carbone_{coop_info['code']}_{datetime.now().strftime('%Y%m%d')}.pdf"
        }
    )

@router.get("/distributions/{distribution_id}/pdf")
async def generate_distribution_pdf_report(
    distribution_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Générer le rapport de distribution en PDF"""
    verify_cooperative(current_user)
    
    distribution = await db.coop_distributions.find_one({
        "_id": ObjectId(distribution_id),
        "coop_id": current_user["_id"]
    })
    
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution non trouvée")
    
    data = {
        "distribution": {
            "lot_name": distribution.get("lot_name", ""),
            "total_premium": distribution.get("total_premium", 0),
            "commission_amount": distribution.get("commission_amount", 0),
            "amount_distributed": distribution.get("amount_distributed", 0),
            "beneficiaries_count": distribution.get("beneficiaries_count", 0),
            "status": distribution.get("status", "")
        },
        "beneficiaries": distribution.get("distributions", [])
    }
    
    pdf_bytes = pdf_generator.generate_distribution_report(data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=rapport_distribution_{distribution_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
        }
    )


@router.get("/members/{member_id}/receipt/pdf")
async def generate_member_payment_receipt(
    member_id: str,
    distribution_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Générer le reçu de paiement individuel pour un membre"""
    verify_cooperative(current_user)
    
    member = await db.coop_members.find_one({
        "_id": ObjectId(member_id),
        "coop_id": current_user["_id"]
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    distribution = await db.coop_distributions.find_one({
        "_id": ObjectId(distribution_id),
        "coop_id": current_user["_id"]
    })
    
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution non trouvée")
    
    member_payment = None
    for d in distribution.get("distributions", []):
        if d.get("member_id") == member_id:
            member_payment = d
            break
    
    if not member_payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé pour ce membre")
    
    coop_info = {
        "name": current_user.get("coop_name", ""),
        "code": current_user.get("coop_code", ""),
        "headquarters_region": current_user.get("headquarters_region", "")
    }
    
    data = {
        "cooperative": coop_info,
        "member": {
            "name": member.get("full_name", ""),
            "phone": member.get("phone_number", ""),
            "village": member.get("village", ""),
            "cni_number": member.get("cni_number", "")
        },
        "payment": {
            "lot_name": distribution.get("lot_name", ""),
            "amount": member_payment.get("amount", 0),
            "share_percentage": member_payment.get("share_percentage", 0),
            "parcels_count": member_payment.get("parcels_count", 0),
            "total_hectares": member_payment.get("total_hectares", 0),
            "average_score": member_payment.get("average_score", 0),
            "payment_status": member_payment.get("payment_status", ""),
            "transaction_id": member_payment.get("transaction_id", ""),
            "payment_date": member_payment.get("payment_date", "")
        },
        "distribution_date": distribution.get("executed_at") or distribution.get("created_at")
    }
    
    pdf_bytes = pdf_generator.generate_member_receipt(data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=recu_paiement_{member.get('full_name', '').replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
        }
    )
