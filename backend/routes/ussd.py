"""
USSD Gateway Integration for GreenLink Agritech
Code: *144*99#

Flux:
1. Menu accueil -> Deja inscrit / Nouvelle inscription / Aide
2. Reconnaissance profil -> Menu principal (6 options)
3. Estimation prime -> Simple ou Detaillee
4. Demande versement -> Confirmation -> Envoi Super Admin
5. Parcelles, Conseils, Profil, Aide
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional
from routes.auth import get_current_user
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ReturnDocument
import logging
import hashlib

from database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ussd", tags=["USSD"])


# ============= MODELS =============

class USSDRequest(BaseModel):
    sessionId: str
    serviceCode: str
    phoneNumber: str
    text: str = ""
    networkCode: Optional[str] = None


class USSDResponse(BaseModel):
    session_id: str
    text: str
    continue_session: bool


# ============= SESSION STORAGE =============
ussd_sessions = {}


# ============= HELPERS =============

def format_xof(amount: float) -> str:
    return f"{amount:,.0f}".replace(",", " ") + " FCFA"


def get_session(sid: str) -> dict:
    if sid not in ussd_sessions:
        ussd_sessions[sid] = {"state": "welcome", "data": {}, "created_at": datetime.now(timezone.utc)}
    return ussd_sessions[sid]


def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()


async def generate_farmer_code(coop_code: str = "", village: str = "") -> str:
    """
    Auto-generate a unique farmer code.
    Format: GL-{PREFIX}-{SEQUENCE}
    PREFIX = first 3 chars of coop_code or village (uppercase)
    SEQUENCE = 5-digit zero-padded counter
    """
    prefix = ""
    if coop_code and coop_code != "0":
        prefix = coop_code.replace("-", "").replace(" ", "")[:3].upper()
    elif village:
        prefix = village.replace(" ", "")[:3].upper()
    
    if not prefix:
        prefix = "IND"  # Independent farmer
    
    # Get next sequence number for this prefix
    counter = await db.farmer_code_counters.find_one_and_update(
        {"prefix": prefix},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    seq = counter.get("seq", 1)
    
    return f"GL-{prefix}-{seq:05d}"


async def find_farmer_by_phone(phone: str):
    """Find farmer in users or coop_members by last 9 digits."""
    clean = phone.replace(" ", "").replace("+225", "")
    last9 = clean[-9:] if len(clean) >= 9 else clean
    
    user = await db.users.find_one({
        "phone_number": {"$regex": last9},
        "user_type": {"$in": ["producteur", "farmer"]}
    })
    if user:
        return user
    
    member = await db.coop_members.find_one({"phone_number": {"$regex": last9}})
    if member:
        return member
    
    # Check USSD registrations
    ussd_user = await db.ussd_registrations.find_one({"phone_number": {"$regex": last9}})
    if ussd_user:
        return ussd_user
    
    return None


async def get_farmer_parcels(farmer_id: str) -> list:
    return await db.parcels.find({
        "$or": [
            {"farmer_id": farmer_id},
            {"member_id": farmer_id},
            {"owner_id": farmer_id}
        ]
    }).to_list(100)


async def get_farmer_carbon_stats(farmer_id: str) -> dict:
    parcels = await get_farmer_parcels(farmer_id)
    total_area = sum(p.get("area_hectares", 0) for p in parcels)
    total_score = sum(p.get("carbon_score", 0) for p in parcels)
    avg_score = total_score / len(parcels) if parcels else 0
    
    payments = await db.carbon_payments.find({"member_id": farmer_id}).sort("created_at", -1).limit(10).to_list(10)
    total_received = sum(p.get("amount_xof", 0) for p in payments if p.get("status") == "completed")
    
    # Potential premium from admissible parcels
    potential = sum(p.get("prime_estimee", 0) for p in parcels if p.get("admissibilite_prime") == "admissible")
    pending = max(0, potential - total_received)
    
    return {
        "parcels_count": len(parcels),
        "total_area": round(total_area, 2),
        "avg_score": round(avg_score, 1),
        "potential_premium": round(potential),
        "total_received": round(total_received),
        "pending": round(pending)
    }


async def get_farmer_payments(farmer_id: str) -> list:
    return await db.carbon_payments.find({"member_id": farmer_id}).sort("created_at", -1).limit(10).to_list(10)


# ============= USSD CALCULATION ENGINE =============

CARBON_QUESTIONS_SIMPLE = [
    {"key": "hectares", "text": "Estimation Prime Carbone\n\nCombien d'hectares de cacao avez-vous ?\n(ex: 3 ou 5.5)\nTapez le nombre", "type": "number"},
    {"key": "arbres_grands", "text": "Nombre d'arbres ombres > 8 metres ?\n(ex: 120)\nTapez le nombre", "type": "number"},
    {"key": "engrais", "text": "Utilisez-vous de l'engrais chimique ?\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "brulage", "text": "Pratiquez-vous le brulage des residus ?\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "compost", "text": "Utilisez-vous du compost organique ?\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "agroforesterie", "text": "Pratiquez-vous l'agroforesterie ?\n(arbres + cultures ensemble)\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "couverture_sol", "text": "Couverture vegetale au sol ?\n(plantes basses entre les arbres)\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "biochar", "text": "Utilisez-vous du biochar ?\n(charbon vegetal dans le sol)\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "zero_deforestation", "text": "Engagement zero deforestation ?\n(Pas d'extension sur foret)\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "reboisement", "text": "Faites-vous du reboisement ?\n(Plantation de nouveaux arbres)\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "age_cacaoyers", "text": "Age moyen de vos cacaoyers ?\n1. Moins de 5 ans\n2. 5 a 15 ans\n3. Plus de 15 ans", "type": "choice3"},
]

CARBON_QUESTIONS_DETAILED = [
    {"key": "hectares", "text": "Estimation Detaillee\n\nSuperficie totale (hectares) ?\n(ex: 4.5)\nTapez le nombre", "type": "number"},
    {"key": "arbres_grands", "text": "Arbres GRANDS (> 12 metres) ?\n(ex: 50)", "type": "number"},
    {"key": "arbres_moyens", "text": "Arbres MOYENS (8-12 metres) ?\n(ex: 80)", "type": "number"},
    {"key": "arbres_petits", "text": "Arbres PETITS (< 8 metres) ?\n(ex: 30)", "type": "number"},
    {"key": "engrais", "text": "Utilisez-vous des engrais chimiques ?\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "brulage", "text": "Faites-vous le brulage ?\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "compost", "text": "Utilisez-vous du compost organique ?\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "agroforesterie", "text": "Pratiquez-vous l'agroforesterie ?\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "couverture_sol", "text": "Avez-vous une couverture vegetale au sol ?\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "biochar", "text": "Utilisez-vous du biochar ?\n(charbon vegetal dans le sol)\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "zero_deforestation", "text": "Engagement zero deforestation ?\n(Pas d'extension sur foret)\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "reboisement", "text": "Faites-vous du reboisement ?\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "age_cacaoyers", "text": "Age moyen de vos cacaoyers ?\n1. Moins de 5 ans\n2. 5 a 15 ans\n3. Plus de 15 ans", "type": "choice3"},
]


def parse_answer(question, raw):
    raw = raw.strip()
    if question["type"] == "number":
        try:
            v = float(raw.replace(",", "."))
            return v if v > 0 else None, v > 0
        except (ValueError, AttributeError):
            return None, False
    elif question["type"] == "yesno":
        m = {"1": "oui", "2": "non"}
        return m.get(raw), raw in m
    elif question["type"] == "choice3":
        m = {"1": "jeune", "2": "mature", "3": "vieux"}
        return m.get(raw), raw in m
    elif question["type"] == "choice":
        m = {"1": "cacao", "2": "cafe", "3": "anacarde"}
        return m.get(raw), raw in m
    return None, False


def calculate_ussd_carbon_premium(answers: dict, avg_rse_price: float = 18000) -> dict:
    """
    Calculate carbon premium from USSD answers.
    Uses allometric biomass coefficients:
    - Grands (>12m): coef 1.0
    - Moyens (8-12m): coef 0.7
    - Petits (<8m): coef 0.3
    """
    hectares = float(answers.get("hectares", 1))
    arbres_grands = int(answers.get("arbres_grands", 0))
    arbres_moyens = int(answers.get("arbres_moyens", 0))
    arbres_petits = int(answers.get("arbres_petits", 0))
    
    weighted_trees = (arbres_grands * 1.0) + (arbres_moyens * 0.7) + (arbres_petits * 0.3)
    arbres_par_ha = weighted_trees / max(hectares, 0.1)
    total_trees = arbres_grands + arbres_moyens + arbres_petits

    score = 4.0
    if arbres_par_ha >= 80: score += 2.0
    elif arbres_par_ha >= 50: score += 1.5
    elif arbres_par_ha >= 20: score += 1.0
    elif arbres_par_ha >= 5: score += 0.5

    grands_ratio = arbres_grands / max(total_trees, 1)
    if grands_ratio >= 0.5: score += 0.5
    elif grands_ratio >= 0.3: score += 0.3

    if answers.get("engrais") == "oui" or answers.get("engrais_chimique") == "oui":
        score -= 0.5
    else:
        score += 0.5

    if answers.get("brulage") == "oui":
        score -= 1.5
    else:
        score += 0.5

    if answers.get("compost") == "oui": score += 1.0
    if answers.get("agroforesterie") == "oui": score += 1.0
    if answers.get("couverture_sol") == "oui": score += 0.5

    # REDD+ bonus
    if answers.get("biochar") == "oui": score += 0.3
    if answers.get("zero_deforestation") == "oui": score += 0.3
    if answers.get("reboisement") == "oui": score += 0.4

    # Age bonus
    age = answers.get("age_cacaoyers", "mature")
    if age == "mature": score += 0.5
    elif age == "vieux": score += 0.3

    score = max(0, min(10, round(score, 1)))
    score_ratio = score / 10.0

    prix_rse_tonne = avg_rse_price
    co2_per_ha = 2 + score_ratio * 6
    # Prime simplifiee (sans details de repartition)
    prime_par_ha = prix_rse_tonne * co2_per_ha * 0.49  # Part nette planteur
    prime_annuelle = prime_par_ha * hectares

    culture = answers.get("culture", "cacao")
    rendement_kg_ha = {"cacao": 700, "cafe": 500, "anacarde": 400}.get(culture, 600)
    prime_fcfa_kg = prime_par_ha / max(rendement_kg_ha, 1)

    # Calcul niveau ARS 1000
    ars_result = calculate_ars_level(answers)

    # REDD+ level calculation
    redd_bonus = 0
    redd_practices = []
    if answers.get("agroforesterie") == "oui":
        redd_bonus += 1.5
        redd_practices.append("Agroforesterie")
    if answers.get("compost") == "oui":
        redd_bonus += 1.0
        redd_practices.append("Compost")
    if answers.get("couverture_sol") == "oui":
        redd_bonus += 0.5
        redd_practices.append("Couverture sol")
    if answers.get("brulage") == "non":
        redd_bonus += 1.0
        redd_practices.append("Zero brulage")
    if answers.get("engrais") == "non" or answers.get("engrais_chimique") == "non":
        redd_bonus += 0.5
        redd_practices.append("Zero engrais")
    if answers.get("biochar") == "oui":
        redd_bonus += 0.5
        redd_practices.append("Biochar")
    if answers.get("zero_deforestation") == "oui":
        redd_bonus += 1.0
        redd_practices.append("Zero deforestation")
    if answers.get("reboisement") == "oui":
        redd_bonus += 0.5
        redd_practices.append("Reboisement")
    if arbres_par_ha >= 60:
        redd_bonus += 1.5
    elif arbres_par_ha >= 30:
        redd_bonus += 1.0
    elif arbres_par_ha >= 15:
        redd_bonus += 0.5
    redd_score = min(round(redd_bonus, 1), 10)
    if redd_score >= 8:
        redd_level = "Excellence"
    elif redd_score >= 6:
        redd_level = "Avance"
    elif redd_score >= 4:
        redd_level = "Intermediaire"
    elif redd_score >= 2:
        redd_level = "Debutant"
    else:
        redd_level = "Non conforme"

    return {
        "score": round(score, 1),
        "prime_fcfa_kg": round(prime_fcfa_kg),
        "arbres_par_ha": round(arbres_par_ha),
        "arbres_grands": arbres_grands,
        "arbres_moyens": arbres_moyens,
        "arbres_petits": arbres_petits,
        "total_arbres": total_trees,
        "prime_annuelle": round(prime_annuelle),
        "eligible": score >= 5.0,
        "hectares": hectares,
        "culture": culture,
        "rendement_kg_ha": rendement_kg_ha,
        "co2_par_ha": round(co2_per_ha, 1),
        "ars_level": ars_result["level"],
        "ars_pct": ars_result["pct"],
        "ars_conseil": ars_result["conseil"],
        "redd_score": redd_score,
        "redd_level": redd_level,
        "redd_practices": redd_practices,
    }


# ============= MOTEUR DE SCORING PRATIQUES DURABLES =============

# Mapping interne -> affichage planteur
LEVEL_DISPLAY = {"Or": "Excellent", "Argent": "Tres Bon", "Bronze": "Bon", "Non conforme": "A ameliorer"}

def level_label(internal_level):
    return LEVEL_DISPLAY.get(internal_level, internal_level)

def calculate_ars_level(answers: dict) -> dict:
    """
    Calcule le score de pratiques durables (Bon/Tres Bon/Excellent)
    Base sur: agroforesterie, brulage, engrais, tracabilite
    """
    hectares = float(answers.get("hectares", 0))
    arbres_grands = int(answers.get("arbres_grands", 0))
    arbres_total = int(answers.get("arbres_total", arbres_grands + int(answers.get("arbres_moyens", 0)) + int(answers.get("arbres_petits", 0))))
    arbres_par_ha = arbres_total / max(hectares, 0.1) if hectares > 0 else 0
    arbres_grands_par_ha = arbres_grands / max(hectares, 0.1) if hectares > 0 else 0

    pct = 0
    details = []

    # Critere 1: Agroforesterie (35 points max)
    if arbres_par_ha >= 60:
        pct += 35
        details.append("Agroforesterie: Excellent")
    elif arbres_par_ha >= 40:
        pct += 25
        details.append("Agroforesterie: Bon")
    elif arbres_par_ha >= 20:
        pct += 15
        details.append("Agroforesterie: Acceptable")
    elif arbres_par_ha >= 10:
        pct += 8
        details.append("Agroforesterie: Insuffisant")
    else:
        details.append("Agroforesterie: Non conforme")

    # Critere 2: Arbres grands >8m (15 points)
    if arbres_grands_par_ha >= 30:
        pct += 15
    elif arbres_grands_par_ha >= 15:
        pct += 10
    elif arbres_grands_par_ha >= 5:
        pct += 5

    # Critere 3: Pas de brulage (20 points)
    if answers.get("brulage") == "non":
        pct += 20
        details.append("Brulage: Non (conforme)")
    else:
        details.append("Brulage: Oui (reduit votre prime)")

    # Critere 4: Gestion engrais (10 points)
    if answers.get("engrais") == "non":
        pct += 10
    elif answers.get("engrais") == "oui":
        pct += 5  # Utilisation raisonnee

    # Critere 5: Pratiques complementaires (20 points)
    if answers.get("compost") == "oui": pct += 7
    if answers.get("agroforesterie") == "oui": pct += 7
    if answers.get("couverture_sol") == "oui": pct += 6

    pct = min(pct, 100)

    # Determiner le niveau
    if pct >= 80:
        level = "Or"
        conseil = "Felicitations ! Niveau Excellent - votre prime est maximale !"
    elif pct >= 55:
        level = "Argent"
        manque = 80 - pct
        arbres_manquants = max(0, int((40 - arbres_par_ha) * max(hectares, 1)))
        if arbres_manquants > 0:
            conseil = f"Plantez {arbres_manquants} arbres supplementaires pour atteindre le niveau Excellent."
        else:
            conseil = f"Arretez le brulage et utilisez le compost pour atteindre le niveau Excellent."
    elif pct >= 30:
        level = "Bronze"
        conseil = "Plantez plus d'arbres ombres et arretez le brulage pour ameliorer votre prime."
    else:
        level = "Non conforme"
        conseil = "Commencez par planter au moins 20 arbres/ha et arreter le brulage."

    return {"level": level, "pct": pct, "details": details, "conseil": conseil}


async def save_ars_data(farmer_id: str, answers: dict, result: dict, phone: str, farmer_name: str, coop_name: str):
    """Sauvegarder les donnees de pratiques durables du planteur et notifier l'admin"""
    now = datetime.now(timezone.utc)
    arbres_total = int(answers.get("arbres_grands", 0)) + int(answers.get("arbres_moyens", 0)) + int(answers.get("arbres_petits", 0))

    ars_doc = {
        "farmer_id": farmer_id,
        "farmer_name": farmer_name,
        "phone": phone,
        "coop_name": coop_name,
        "hectares": float(answers.get("hectares", 0)),
        "arbres_total": arbres_total,
        "arbres_grands": int(answers.get("arbres_grands", 0)),
        "arbres_moyens": int(answers.get("arbres_moyens", 0)),
        "arbres_petits": int(answers.get("arbres_petits", 0)),
        "engrais": answers.get("engrais", answers.get("engrais_chimique", "non")),
        "brulage": answers.get("brulage", "non"),
        "compost": answers.get("compost", "non"),
        "agroforesterie": answers.get("agroforesterie", "non"),
        "couverture_sol": answers.get("couverture_sol", "non"),
        "age_cacaoyers": answers.get("age_cacaoyers", ""),
        "score_carbone": result.get("score", 0),
        "prime_estimee": result.get("prime_annuelle", 0),
        "ars_level": result.get("ars_level", ""),
        "ars_pct": result.get("ars_pct", 0),
        "ars_conseil": result.get("ars_conseil", ""),
        # REDD+ data
        "biochar": answers.get("biochar", "non"),
        "zero_deforestation": answers.get("zero_deforestation", "non"),
        "reboisement": answers.get("reboisement", "non"),
        "redd_score": result.get("redd_score", 0),
        "redd_level": result.get("redd_level", ""),
        "redd_practices": result.get("redd_practices", []),
        "updated_at": now,
    }

    existing = await db.ars_farmer_data.find_one({"farmer_id": farmer_id})
    if existing:
        await db.ars_farmer_data.update_one({"farmer_id": farmer_id}, {"$set": ars_doc})
    else:
        ars_doc["created_at"] = now
        await db.ars_farmer_data.insert_one(ars_doc)

    logger.info(f"ARS data saved for farmer {farmer_id}: level={result.get('ars_level')}")


async def notify_admin_ars_update(farmer_id: str, farmer_name: str, phone: str, coop_name: str, field: str, value, ars_result: dict):
    """Enregistrer une notification admin lors de la mise a jour des pratiques"""
    field_labels = {
        "hectares": "Hectares cacao",
        "arbres_total": "Arbres ombres total",
        "arbres_grands": "Arbres > 8 metres",
        "engrais": "Engrais chimique",
        "brulage": "Brulage residus",
    }
    await db.admin_notifications.insert_one({
        "type": "ars_update",
        "farmer_id": farmer_id,
        "farmer_name": farmer_name,
        "phone": phone,
        "coop_name": coop_name,
        "field_updated": field_labels.get(field, field),
        "new_value": value,
        "ars_level": ars_result["level"],
        "ars_pct": ars_result["pct"],
        "message": f"{farmer_name} ({coop_name}) a mis a jour: {field_labels.get(field, field)} = {value}. Niveau: {level_label(ars_result['level'])} ({ars_result['pct']}%)",
        "read": False,
        "created_at": datetime.now(timezone.utc)
    })
    logger.info(f"Admin notification created for ARS update: {farmer_name} - {field}")


# ============= MAIN USSD ENDPOINT (*144*99#) =============

@router.post("/callback")
async def ussd_callback(request: USSDRequest):
    """
    Main USSD callback - Stateful session management.
    Compatible with Africa's Talking, Orange API.
    """
    try:
        sid = request.sessionId
        phone = request.phoneNumber
        text_input = request.text.strip()
        inputs = text_input.split("*") if text_input else []
        
        logger.info(f"USSD: sid={sid}, phone={phone}, input={text_input}")
        
        session = get_session(sid)
        state = session["state"]
        data = session["data"]
        
        response_text = ""
        continue_session = True

        # ==============================
        # STATE: WELCOME (Menu d'accueil)
        # ==============================
        if state == "welcome" and len(inputs) == 0:
            response_text = (
                "Bienvenue sur GreenLink Agritech\n"
                "Estimation prime carbone cacao\n\n"
                "1. Je suis deja inscrit\n"
                "2. Nouvelle inscription\n"
                "3. Aide / Infos\n"
                "0. Quitter"
            )

        elif state == "welcome" and len(inputs) >= 1:
            choice = inputs[-1]
            
            if choice == "1":
                # Reconnaissance profil
                farmer = await find_farmer_by_phone(phone)
                if farmer:
                    name = farmer.get("full_name", farmer.get("nom_complet", "Planteur"))
                    coop = farmer.get("cooperative_name", farmer.get("coop_code", ""))
                    fid = str(farmer.get("_id", ""))
                    session["state"] = "main_menu"
                    session["data"]["farmer_id"] = fid
                    session["data"]["farmer_name"] = name
                    session["data"]["coop_name"] = coop
                    
                    coop_label = f" ({coop})" if coop else ""
                    response_text = (
                        f"GreenLink Agritech\n"
                        f"Bonjour {name}{coop_label}\n\n"
                        f"1. Estimation de ma prime\n"
                        f"2. Mes pratiques durables\n"
                        f"3. Conseils pour ma prime\n"
                        f"4. Demander paiement prime\n"
                        f"5. Mes parcelles\n"
                        f"6. SSRTE - Travail des enfants\n"
                        f"7. Mon profil\n"
                        f"8. Pratiques durables\n"
                        f"9. Changer mon PIN\n"
                        f"0. Quitter"
                    )
                else:
                    # Phone not found, propose registration
                    session["state"] = "phone_not_found"
                    response_text = (
                        "Numero non reconnu.\n\n"
                        "1. Nouvelle inscription\n"
                        "2. Essayer un autre numero\n"
                        "0. Quitter"
                    )
                    
            elif choice == "2":
                # Nouvelle inscription - Etape 1
                session["state"] = "register_name"
                response_text = (
                    "Nouvelle inscription GreenLink\n\n"
                    "Etape 1/4\n"
                    "Entrez votre nom et prenom\n"
                    "(ex: Kouadio Jean)"
                )
                
            elif choice == "3":
                # Aide / Infos
                response_text = (
                    "GreenLink Agritech\n\n"
                    "Estimez votre prime carbone\n"
                    "cacao gratuitement.\n\n"
                    "Tel: 07 87 76 10 23\n"
                    "Canada: +1 514 475-7340\n\n"
                    "0. Retour"
                )
                continue_session = False
                
            elif choice == "0":
                response_text = "Merci d'avoir utilise GreenLink.\nA bientot !"
                continue_session = False
            else:
                response_text = (
                    "Option invalide.\n\n"
                    "1. Je suis deja inscrit\n"
                    "2. Nouvelle inscription\n"
                    "3. Aide / Infos\n"
                    "0. Quitter"
                )

        # ==============================
        # STATE: PHONE NOT FOUND
        # ==============================
        elif state == "phone_not_found":
            choice = inputs[-1] if inputs else ""
            if choice == "1":
                session["state"] = "register_name"
                response_text = (
                    "Nouvelle inscription GreenLink\n\n"
                    "Etape 1/4\n"
                    "Entrez votre nom et prenom\n"
                    "(ex: Kouadio Jean)"
                )
            elif choice == "2":
                session["state"] = "enter_phone"
                response_text = "Entrez votre numero\n(ex: 07XXXXXXXX)"
            else:
                response_text = "Merci. A bientot !"
                continue_session = False

        # ==============================
        # STATE: ENTER PHONE (manual)
        # ==============================
        elif state == "enter_phone":
            entered_phone = inputs[-1] if inputs else ""
            farmer = await find_farmer_by_phone(entered_phone)
            if farmer:
                name = farmer.get("full_name", farmer.get("nom_complet", "Planteur"))
                coop = farmer.get("cooperative_name", farmer.get("coop_code", ""))
                fid = str(farmer.get("_id", ""))
                session["state"] = "main_menu"
                session["data"]["farmer_id"] = fid
                session["data"]["farmer_name"] = name
                session["data"]["coop_name"] = coop
                coop_label = f" ({coop})" if coop else ""
                response_text = (
                    f"GreenLink Agritech\n"
                    f"Bonjour {name}{coop_label}\n\n"
                    f"1. Estimation de ma prime\n"
                    f"2. Mes pratiques durables\n"
                    f"3. Conseils pour ma prime\n"
                    f"4. Demander paiement prime\n"
                    f"5. Mes parcelles\n"
                    f"6. SSRTE - Travail des enfants\n"
                    f"7. Mon profil\n"
                    f"8. Pratiques durables\n"
                    f"9. Changer mon PIN\n"
                    f"0. Quitter"
                )
            else:
                session["state"] = "phone_not_found"
                response_text = (
                    "Numero non reconnu.\n\n"
                    "1. Nouvelle inscription\n"
                    "2. Essayer un autre numero\n"
                    "0. Quitter"
                )

        # ==============================
        # STATE: REGISTRATION FLOW
        # ==============================
        elif state == "register_name":
            name = inputs[-1] if inputs else ""
            if len(name) < 2:
                response_text = "Nom trop court.\nEntrez votre nom et prenom\n(ex: Kouadio Jean)"
            else:
                session["data"]["reg_name"] = name
                session["state"] = "register_coop"
                response_text = (
                    "Etape 2/4\n"
                    "Entrez votre code planteur\n"
                    "ou numero de membre coop\n"
                    "(tapez 0 si vous n'avez pas)"
                )

        elif state == "register_coop":
            coop_code = inputs[-1] if inputs else "0"
            session["data"]["reg_coop"] = coop_code if coop_code != "0" else ""
            session["state"] = "register_village"
            response_text = (
                "Etape 3/4\n"
                "Entrez votre village ou localite\n"
                "(ex: Daloa, Soubre, Abengourou)"
            )

        elif state == "register_village":
            village = inputs[-1] if inputs else ""
            if len(village) < 2:
                response_text = "Nom trop court.\nEntrez votre village"
            else:
                session["data"]["reg_village"] = village
                session["state"] = "register_pin"
                response_text = (
                    "Etape 4/4\n"
                    "Creez un code PIN a 4 chiffres\n"
                    "pour securiser vos demandes\n"
                    "(ex: 1234)"
                )

        elif state == "register_pin":
            pin = inputs[-1] if inputs else ""
            if len(pin) != 4 or not pin.isdigit():
                response_text = "PIN invalide.\nEntrez 4 chiffres (ex: 1234)"
            else:
                session["data"]["reg_pin"] = pin
                session["state"] = "register_confirm"
                d = session["data"]
                coop_display = d.get("reg_coop", "") or "Non renseigne"
                response_text = (
                    f"Resume inscription:\n"
                    f"Nom: {d['reg_name']}\n"
                    f"Coop: {coop_display}\n"
                    f"Village: {d['reg_village']}\n"
                    f"Tel: {phone}\n\n"
                    f"1. Confirmer inscription\n"
                    f"2. Modifier\n"
                    f"0. Annuler"
                )

        elif state == "register_confirm":
            choice = inputs[-1] if inputs else ""
            if choice == "1":
                d = session["data"]
                # Auto-generate farmer code
                farmer_code = await generate_farmer_code(d.get("reg_coop", ""), d.get("reg_village", ""))
                # Save registration
                reg_doc = {
                    "full_name": d["reg_name"],
                    "nom_complet": d["reg_name"],
                    "phone_number": phone,
                    "coop_code": d.get("reg_coop", ""),
                    "code_planteur": farmer_code,
                    "village": d["reg_village"],
                    "pin_hash": hash_pin(d["reg_pin"]),
                    "user_type": "producteur",
                    "registered_via": "ussd",
                    "status": "active",
                    "created_at": datetime.now(timezone.utc)
                }
                result = await db.ussd_registrations.insert_one(reg_doc)
                
                session["state"] = "register_done"
                session["data"]["farmer_id"] = str(result.inserted_id)
                session["data"]["farmer_name"] = d["reg_name"]
                
                response_text = (
                    f"Inscription reussie !\n"
                    f"Votre code planteur:\n"
                    f"{farmer_code}\n\n"
                    f"Conservez ce code.\n\n"
                    f"1. Estimer ma prime carbone\n"
                    f"0. Quitter"
                )
            elif choice == "2":
                session["state"] = "register_name"
                response_text = (
                    "Etape 1/4\n"
                    "Entrez votre nom et prenom\n"
                    "(ex: Kouadio Jean)"
                )
            else:
                response_text = "Inscription annulee.\nMerci. A bientot !"
                continue_session = False

        elif state == "register_done":
            choice = inputs[-1] if inputs else ""
            if choice == "1":
                session["state"] = "estimation_type"
                response_text = (
                    "Estimation Prime Carbone\n\n"
                    "1. Estimation simple (rapide)\n"
                    "2. Estimation detaillee\n"
                    "0. Retour"
                )
            else:
                response_text = "Merci pour votre inscription !\nA bientot sur GreenLink."
                continue_session = False

        # ==============================
        # STATE: MAIN MENU (authenticated)
        # ==============================
        elif state == "main_menu":
            choice = inputs[-1] if inputs else ""
            
            if choice == "1":
                # Prime carbone + conformite ARS -> choix simple/detaillee
                session["state"] = "estimation_type"
                response_text = (
                    "Estimation de votre Prime Carbone\n\n"
                    "1. Estimation simple (rapide)\n"
                    "2. Estimation detaillee\n"
                    "0. Retour"
                )
                
            elif choice == "2":
                # Mes donnees ARS 1000
                farmer_id = data.get("farmer_id", "")
                session["state"] = "ars_data_menu"
                if farmer_id:
                    ars_data = await db.ars_farmer_data.find_one({"farmer_id": farmer_id})
                    if ars_data:
                        session["data"]["has_ars_data"] = True
                        response_text = (
                            "MES PRATIQUES DURABLES\n\n"
                            "1. Voir mes donnees actuelles\n"
                            "2. Mettre a jour mes donnees\n"
                            "3. Generer rapport pour coop\n"
                            "4. Conseils pour mon niveau\n"
                            "0. Retour menu principal"
                        )
                    else:
                        session["data"]["has_ars_data"] = False
                        response_text = (
                            "MES PRATIQUES DURABLES\n\n"
                            "Aucune donnee enregistree.\n"
                            "Faites d'abord une estimation\n"
                            "(choix 1 du menu)\n"
                            "pour creer votre profil.\n\n"
                            "1. Faire une estimation\n"
                            "0. Retour"
                        )
                else:
                    response_text = "Profil non reconnu.\n\n0. Retour"
                    session["state"] = "main_menu"

            elif choice == "3":
                # Conseils pratiques ARS 1000
                session["state"] = "ars_conseils_menu"
                response_text = (
                    "CONSEILS POUR AMELIORER VOTRE PRIME\n\n"
                    "1. Agroforesterie\n"
                    "2. Lutte contre le brulage\n"
                    "3. Gestion des engrais\n"
                    "4. Tracabilite\n"
                    "5. Recommandations perso.\n"
                    "0. Retour menu principal"
                )
                
            elif choice == "4":
                # Demander paiement prime
                farmer_id = data.get("farmer_id", "")
                if farmer_id:
                    from routes.carbon_premiums import create_ussd_payment_request
                    result = await create_ussd_payment_request(phone)
                    if result.get("success"):
                        response_text = (
                            f"Demande de versement\n"
                            f"Prime estimee: {format_xof(result['farmer_amount'])}\n\n"
                            f"1. Confirmer et envoyer\n"
                            f"   au super admin\n"
                            f"2. Annuler"
                        )
                        session["state"] = "payment_confirm"
                        session["data"]["payment_result"] = result
                    else:
                        response_text = f"{result.get('message', 'Erreur')}\n\n0. Retour"
                        session["state"] = "main_menu"
                else:
                    response_text = "Profil non reconnu.\n\n0. Retour"
                    session["state"] = "main_menu"
                    
            elif choice == "5":
                # Mes parcelles
                farmer_id = data.get("farmer_id", "")
                if farmer_id:
                    parcels = await get_farmer_parcels(farmer_id)
                    if parcels:
                        lines = ["Mes Parcelles\n"]
                        for i, p in enumerate(parcels[:4], 1):
                            loc = p.get("location", p.get("village", "Parcelle"))
                            ha = p.get("area_hectares", 0)
                            sc = p.get("carbon_score", 0)
                            lines.append(f"{i}. {loc}")
                            lines.append(f"   {ha}ha Score:{sc}/10")
                        lines.append(f"\nTotal: {len(parcels)} parcelle(s)")
                        lines.append("\n0. Retour")
                        response_text = "\n".join(lines)
                    else:
                        response_text = "Aucune parcelle enregistree.\nContactez votre cooperative.\n\n0. Retour"
                else:
                    response_text = "Profil non reconnu.\n\n0. Retour"
                session["state"] = "parcels_view"
                
            elif choice == "6":
                # SSRTE - Travail des enfants (ICI)
                session["state"] = "ssrte_q1"
                response_text = (
                    f"SSRTE - Lutte contre le travail des enfants (ICI)\n\n"
                    f"Question 1/2\n"
                    f"Avez-vous des enfants en age scolaire sur votre parcelle ?\n\n"
                    f"1. Oui\n"
                    f"2. Non\n\n"
                    f"0. Retour"
                )
                
            elif choice == "7":
                # Mon profil (ancien 6)
                name = data.get("farmer_name", "Planteur")
                coop = data.get("coop_name", "Non renseigne")
                farmer_id = data.get("farmer_id", "")
                stats = await get_farmer_carbon_stats(farmer_id) if farmer_id else {}
                
                # Check ARS level
                ars_data = await db.ars_farmer_data.find_one({"farmer_id": farmer_id}) if farmer_id else None
                ars_label = f"Niveau: {level_label(ars_data['ars_level'])} ({ars_data['ars_pct']}%)\n" if ars_data else ""
                
                response_text = (
                    f"Mon Profil\n\n"
                    f"Nom: {name}\n"
                    f"Coop: {coop or 'Non renseigne'}\n"
                    f"Tel: {phone}\n"
                    f"Parcelles: {stats.get('parcels_count', 0)}\n"
                    f"Surface: {stats.get('total_area', 0)} ha\n"
                    f"Score: {stats.get('avg_score', 0)}/10\n"
                    f"{ars_label}\n"
                    f"0. Retour"
                )
                session["state"] = "profile_view"

            elif choice == "8":
                # Pratiques durables
                farmer_id = data.get("farmer_id", "")
                session["state"] = "redd_menu"
                
                # Check sustainable practices data
                redd_data = None
                if farmer_id:
                    ars_data = await db.ars_farmer_data.find_one({"farmer_id": farmer_id})
                    if ars_data and ars_data.get("score_redd"):
                        redd_data = ars_data
                
                if redd_data:
                    redd_score = redd_data.get("score_redd", 0)
                    redd_level = redd_data.get("redd_level", "Non evalue")
                    response_text = (
                        f"PRATIQUES DURABLES\n\n"
                        f"Votre score: {redd_score}/10\n"
                        f"Niveau: {redd_level}\n\n"
                        f"1. Guide des pratiques\n"
                        f"2. Mon score detaille\n"
                        f"3. Comment ameliorer\n"
                        f"0. Retour menu principal"
                    )
                else:
                    response_text = (
                        f"PRATIQUES DURABLES\n\n"
                        f"Aucune evaluation disponible.\n"
                        f"Faites une estimation (choix 1)\n"
                        f"pour obtenir votre score.\n\n"
                        f"1. Guide des pratiques\n"
                        f"2. Faire une estimation\n"
                        f"0. Retour menu principal"
                    )
                
            elif choice == "9":
                # Changer le PIN
                session["state"] = "change_pin_old"
                response_text = (
                    "CHANGER VOTRE PIN\n\n"
                    "Entrez votre ancien PIN\n"
                    "(4 chiffres)"
                )

            elif choice == "0":
                response_text = "Merci d'avoir utilise GreenLink.\nA bientot !"
                continue_session = False
            else:
                name = data.get("farmer_name", "Planteur")
                coop = data.get("coop_name", "")
                coop_label = f" ({coop})" if coop else ""
                response_text = (
                    f"Option invalide.\n\n"
                    f"1. Estimation de ma prime\n"
                    f"2. Mes pratiques durables\n"
                    f"3. Conseils prime\n"
                    f"4. Demander paiement\n"
                    f"5. Mes parcelles\n"
                    f"6. SSRTE - Travail des enfants\n"
                    f"7. Mon profil\n"
                    f"8. Pratiques durables\n"
                    f"9. Changer mon PIN\n"
                    f"0. Quitter"
                )


        # ==============================

        # ==============================
        # STATE: REDD+ Menu
        # ==============================
        elif state == "redd_menu":
            choice = inputs[-1] if inputs else ""
            if choice == "1":
                # Guide des pratiques REDD+
                session["state"] = "redd_guide"
                response_text = (
                    "GUIDE PRATIQUES DURABLES (5 categories)\n\n"
                    "1. Agroforesterie\n"
                    "   Arbres + cultures\n"
                    "2. Zero-deforestation\n"
                    "   Protection des forets\n"
                    "3. Gestion sols\n"
                    "   Compost, biochar, couverture\n"
                    "4. Restauration\n"
                    "   Reboisement, bois-energie\n"
                    "5. Tracabilite\n"
                    "   GPS, pratiques durables, MRV\n\n"
                    "0. Retour"
                )
            elif choice == "2":
                farmer_id = data.get("farmer_id", "")
                if farmer_id:
                    ars_data = await db.ars_farmer_data.find_one({"farmer_id": farmer_id})
                    if ars_data and ars_data.get("score_redd"):
                        practices = []
                        if ars_data.get("agroforesterie"): practices.append("Agroforesterie")
                        if ars_data.get("compost"): practices.append("Compost")
                        if ars_data.get("biochar"): practices.append("Biochar")
                        if ars_data.get("zero_deforestation"): practices.append("Zero-deforestation")
                        if ars_data.get("reboisement"): practices.append("Reboisement")
                        if ars_data.get("couverture_sol"): practices.append("Couverture sol")
                        plist = "\n".join(f"  - {p}" for p in practices) if practices else "  Aucune pratique validee"
                        response_text = (
                            f"MON SCORE DETAILLE\n\n"
                            f"Score: {ars_data.get('score_redd', 0)}/10\n"
                            f"Niveau: {ars_data.get('redd_level', 'N/A')}\n\n"
                            f"Pratiques validees:\n{plist}\n\n"
                            f"0. Retour"
                        )
                    else:
                        # Redirect to estimation
                        session["state"] = "estimation_type"
                        response_text = (
                            "Aucune donnee disponible.\n"
                            "Faites une estimation:\n\n"
                            "1. Estimation simple\n"
                            "2. Estimation detaillee\n"
                            "0. Retour"
                        )
                else:
                    response_text = "Profil non reconnu.\n\n0. Retour"
                    session["state"] = "redd_score_view"
            elif choice == "3":
                # Comment ameliorer son score REDD+
                session["state"] = "redd_improve"
                response_text = (
                    "AMELIORER VOTRE SCORE\n\n"
                    "Actions a fort impact:\n"
                    "1. Planter des arbres d'ombrage\n"
                    "   (+1.5 pts)\n"
                    "2. Arreter le brulage\n"
                    "   (+1.0 pt)\n"
                    "3. Faire du compost\n"
                    "   (+1.0 pt)\n"
                    "4. S'engager zero deforestation\n"
                    "   (+0.3 pt bonus)\n"
                    "5. Reboiser les zones degradees\n"
                    "   (+0.4 pt bonus)\n\n"
                    "0. Retour"
                )
            elif choice == "0":
                session["state"] = "main_menu"
                name = data.get("farmer_name", "Planteur")
                coop = data.get("coop_name", "")
                coop_label = f" ({coop})" if coop else ""
                response_text = (
                    f"GreenLink Agritech\n"
                    f"Bonjour {name}{coop_label}\n\n"
                    f"1. Estimation de ma prime\n"
                    f"2. Mes pratiques durables\n"
                    f"3. Conseils pour ma prime\n"
                    f"4. Demander paiement prime\n"
                    f"5. Mes parcelles\n"
                    f"6. SSRTE - Travail des enfants\n"
                    f"7. Mon profil\n"
                    f"8. Pratiques durables\n"
                    f"9. Changer mon PIN\n"
                    f"0. Quitter"
                )
            else:
                response_text = "Option invalide.\n\n1. Guide\n2. Score\n3. Ameliorer\n0. Retour"

        # REDD+ sub-states (guide, score, improve -> back to redd_menu)
        elif state in ("redd_guide", "redd_score_view", "redd_improve"):
            choice = inputs[-1] if inputs else ""
            if choice == "0":
                session["state"] = "redd_menu"
                farmer_id = data.get("farmer_id", "")
                redd_data = None
                if farmer_id:
                    ars_data = await db.ars_farmer_data.find_one({"farmer_id": farmer_id})
                    if ars_data and ars_data.get("score_redd"):
                        redd_data = ars_data
                if redd_data:
                    response_text = (
                        f"PRATIQUES DURABLES\n\n"
                        f"Score: {redd_data.get('score_redd', 0)}/10\n"
                        f"Niveau: {redd_data.get('redd_level', 'N/A')}\n\n"
                        f"1. Guide des pratiques\n"
                        f"2. Mon score detaille\n"
                        f"3. Comment ameliorer\n"
                        f"0. Retour menu principal"
                    )
                else:
                    response_text = (
                        f"PRATIQUES DURABLES\n\n"
                        f"1. Guide des pratiques\n"
                        f"2. Faire une estimation\n"
                        f"0. Retour menu principal"
                    )
            elif state == "redd_guide" and choice in ("1", "2", "3", "4", "5"):
                guides = {
                    "1": (
                        "AGROFORESTERIE\n\n"
                        "Associer arbres + cacaoyers:\n"
                        "- 30-50% couverture d'ombre\n"
                        "- Plusieurs niveaux de vegetation\n"
                        "- Enrichir avec arbres fruitiers\n\n"
                        "Impact: +1.5 pts au score\n\n"
                        "0. Retour guide"
                    ),
                    "2": (
                        "ZERO-DEFORESTATION\n\n"
                        "Ne pas defricher de foret:\n"
                        "- Intensifier sur la meme surface\n"
                        "- Restaurer les parcelles degradees\n"
                        "- Proteger les forets classees\n\n"
                        "Impact: +0.3 pt bonus\n\n"
                        "0. Retour guide"
                    ),
                    "3": (
                        "GESTION DES SOLS\n\n"
                        "- Compost organique (+1.0 pt)\n"
                        "- Biochar au sol (+0.3 pt)\n"
                        "- Couverture vegetale (+0.5 pt)\n"
                        "- Pas de brulage (+0.5 pt)\n"
                        "- Pas d'engrais chimique (+0.5 pt)\n\n"
                        "0. Retour guide"
                    ),
                    "4": (
                        "RESTAURATION\n\n"
                        "- Reboiser les zones degradees\n"
                        "  (+0.4 pt bonus)\n"
                        "- Plantations bois-energie\n"
                        "- Proteger les bords de riviere\n"
                        "- Valoriser les residus agricoles\n\n"
                        "0. Retour guide"
                    ),
                    "5": (
                        "TRACABILITE\n\n"
                        "- Cartographier vos parcelles (GPS)\n"
                        "- Ameliorer vos pratiques durables\n"
                        "- Participer au suivi MRV\n"
                        "- Respecter les normes sociales\n\n"
                        "0. Retour guide"
                    ),
                }
                response_text = guides.get(choice, "Option invalide.\n\n0. Retour")
                session["state"] = "redd_guide"
            else:
                response_text = "Option invalide.\n\n0. Retour"
                session["state"] = "redd_menu"


        # STATE: SSRTE - Travail des enfants (ICI)
        # ==============================
        elif state == "ssrte_q1":
            choice = inputs[-1] if inputs else ""
            if choice == "1":
                # Oui, enfants en age scolaire
                session["state"] = "ssrte_q2"
                session["data"]["ssrte_enfants_scolaires"] = True
                response_text = (
                    f"SSRTE - Question 2/2\n\n"
                    f"Sont-ils scolarises ?\n\n"
                    f"1. Oui\n"
                    f"2. Non\n\n"
                    f"0. Retour"
                )
            elif choice == "2":
                # Non, pas d'enfants en age scolaire
                session["data"]["ssrte_enfants_scolaires"] = False
                session["data"]["ssrte_scolarises"] = None
                # Sauvegarder dans la BDD
                farmer_id = data.get("farmer_id", "")
                if farmer_id:
                    await db.ssrte_responses.update_one(
                        {"farmer_id": farmer_id},
                        {"$set": {
                            "farmer_id": farmer_id,
                            "phone": phone,
                            "farmer_name": data.get("farmer_name", ""),
                            "coop_id": data.get("coop_id", ""),
                            "coop_name": data.get("coop_name", ""),
                            "enfants_age_scolaire": False,
                            "scolarises": None,
                            "statut": "conforme",
                            "source": "ussd",
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        }},
                        upsert=True,
                    )
                response_text = (
                    f"Merci pour votre reponse.\n\n"
                    f"Aucune action SSRTE requise.\n\n"
                    f"0. Retour au menu"
                )
                session["state"] = "ssrte_done"
            elif choice == "0":
                session["state"] = "main_menu"
                name = data.get("farmer_name", "Planteur")
                coop = data.get("coop_name", "")
                coop_label = f" ({coop})" if coop else ""
                response_text = (
                    f"GreenLink Agritech\n"
                    f"Bonjour {name}{coop_label}\n\n"
                    f"1. Estimation de ma prime\n"
                    f"2. Mes pratiques durables\n"
                    f"3. Conseils pour ma prime\n"
                    f"4. Demander paiement prime\n"
                    f"5. Mes parcelles\n"
                    f"6. SSRTE - Travail des enfants\n"
                    f"7. Mon profil\n"
                    f"8. Pratiques durables\n"
                    f"9. Changer mon PIN\n"
                    f"0. Quitter"
                )
            else:
                response_text = (
                    f"Option invalide.\n\n"
                    f"Avez-vous des enfants en age scolaire ?\n"
                    f"1. Oui\n"
                    f"2. Non\n\n"
                    f"0. Retour"
                )

        elif state == "ssrte_q2":
            choice = inputs[-1] if inputs else ""
            farmer_id = data.get("farmer_id", "")
            if choice == "1":
                # Oui, scolarises -> conforme
                session["data"]["ssrte_scolarises"] = True
                if farmer_id:
                    await db.ssrte_responses.update_one(
                        {"farmer_id": farmer_id},
                        {"$set": {
                            "farmer_id": farmer_id,
                            "phone": phone,
                            "farmer_name": data.get("farmer_name", ""),
                            "coop_id": data.get("coop_id", ""),
                            "coop_name": data.get("coop_name", ""),
                            "enfants_age_scolaire": True,
                            "scolarises": True,
                            "statut": "conforme",
                            "source": "ussd",
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        }},
                        upsert=True,
                    )
                response_text = (
                    f"Merci pour votre reponse.\n\n"
                    f"Situation conforme.\n"
                    f"Continuez a soutenir la scolarite\n"
                    f"de vos enfants.\n\n"
                    f"0. Retour au menu"
                )
                session["state"] = "ssrte_done"
            elif choice == "2":
                # Non, pas scolarises -> alerte ICI
                session["data"]["ssrte_scolarises"] = False
                if farmer_id:
                    await db.ssrte_responses.update_one(
                        {"farmer_id": farmer_id},
                        {"$set": {
                            "farmer_id": farmer_id,
                            "phone": phone,
                            "farmer_name": data.get("farmer_name", ""),
                            "coop_id": data.get("coop_id", ""),
                            "coop_name": data.get("coop_name", ""),
                            "enfants_age_scolaire": True,
                            "scolarises": False,
                            "statut": "alerte_ici",
                            "source": "ussd",
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        }},
                        upsert=True,
                    )
                response_text = (
                    f"Merci pour votre reponse.\n\n"
                    f"Nous vous mettons en relation\n"
                    f"avec votre cooperative pour un\n"
                    f"accompagnement SSRTE de l'ICI.\n\n"
                    f"Votre cooperative sera informee.\n\n"
                    f"0. Retour au menu"
                )
                session["state"] = "ssrte_done"
            elif choice == "0":
                session["state"] = "ssrte_q1"
                response_text = (
                    f"SSRTE - Lutte contre le travail des enfants (ICI)\n\n"
                    f"Question 1/2\n"
                    f"Avez-vous des enfants en age scolaire sur votre parcelle ?\n\n"
                    f"1. Oui\n"
                    f"2. Non\n\n"
                    f"0. Retour"
                )
            else:
                response_text = (
                    f"Option invalide.\n\n"
                    f"Sont-ils scolarises ?\n"
                    f"1. Oui\n"
                    f"2. Non\n\n"
                    f"0. Retour"
                )

        elif state == "ssrte_done":
            choice = inputs[-1] if inputs else ""
            if choice == "0":
                session["state"] = "main_menu"
                name = data.get("farmer_name", "Planteur")
                coop = data.get("coop_name", "")
                coop_label = f" ({coop})" if coop else ""
                response_text = (
                    f"GreenLink Agritech\n"
                    f"Bonjour {name}{coop_label}\n\n"
                    f"1. Estimation de ma prime\n"
                    f"2. Mes pratiques durables\n"
                    f"3. Conseils pour ma prime\n"
                    f"4. Demander paiement prime\n"
                    f"5. Mes parcelles\n"
                    f"6. SSRTE - Travail des enfants\n"
                    f"7. Mon profil\n"
                    f"8. Pratiques durables\n"
                    f"9. Changer mon PIN\n"
                    f"0. Quitter"
                )
            else:
                response_text = "Appuyez 0 pour retourner au menu."

        # ==============================
        # STATE: PAYMENT CONFIRM
        # ==============================
        elif state == "payment_confirm":
            choice = inputs[-1] if inputs else ""
            if choice == "1":
                pr = data.get("payment_result", {})
                response_text = (
                    f"Demande enregistree !\n\n"
                    f"Montant: {format_xof(pr.get('farmer_amount', 0))}\n"
                    f"Ref: {pr.get('request_id', '')[:8]}\n\n"
                    f"Votre demande est envoyee\n"
                    f"au Super Admin.\n"
                    f"Vous serez notifie."
                )
                continue_session = False
            else:
                response_text = "Demande annulee.\n\n0. Retour"
                session["state"] = "main_menu"


        # ==============================
        # STATE: CHANGE PIN - OLD PIN
        # ==============================
        elif state == "change_pin_old":
            old_pin = inputs[-1] if inputs else ""
            farmer_id = data.get("farmer_id", "")
            
            if not old_pin or len(old_pin) != 4 or not old_pin.isdigit():
                response_text = "PIN invalide.\nEntrez 4 chiffres.\n\n0. Retour"
                session["state"] = "main_menu"
            else:
                # Vérifier l'ancien PIN
                farmer = await db.ussd_registrations.find_one({"farmer_id": farmer_id})
                if not farmer:
                    farmer = await db.ussd_registrations.find_one({"phone": phone})
                if not farmer:
                    farmer = await db.ussd_registrations.find_one({"phone_number": {"$regex": phone.replace('+225', '')[-9:]}})
                if not farmer:
                    farmer = await find_farmer_by_phone(phone)
                
                stored_hash = farmer.get("pin_hash", "") if farmer else ""
                
                if not stored_hash:
                    # Pas de PIN defini - permettre de le creer directement
                    session["state"] = "change_pin_new"
                    response_text = (
                        "Aucun PIN defini.\n\n"
                        "Creez votre PIN\n"
                        "(4 chiffres)"
                    )
                elif verify_pin(old_pin, stored_hash):
                    session["state"] = "change_pin_new"
                    response_text = (
                        "PIN actuel verifie.\n\n"
                        "Entrez votre nouveau PIN\n"
                        "(4 chiffres)"
                    )
                else:
                    response_text = "PIN incorrect.\n\n0. Retour menu principal"
                    session["state"] = "main_menu"

        # ==============================
        # STATE: CHANGE PIN - NEW PIN
        # ==============================
        elif state == "change_pin_new":
            new_pin = inputs[-1] if inputs else ""
            
            if not new_pin or len(new_pin) != 4 or not new_pin.isdigit():
                response_text = "PIN invalide.\nEntrez 4 chiffres.\n\n0. Retour"
                session["state"] = "main_menu"
            else:
                session["data"]["new_pin"] = new_pin
                session["state"] = "change_pin_confirm"
                response_text = (
                    f"Confirmez votre nouveau PIN:\n"
                    f"Entrez a nouveau les 4 chiffres"
                )

        # ==============================
        # STATE: CHANGE PIN - CONFIRM
        # ==============================
        elif state == "change_pin_confirm":
            confirm_pin = inputs[-1] if inputs else ""
            new_pin = data.get("new_pin", "")
            farmer_id = data.get("farmer_id", "")
            
            if confirm_pin == new_pin:
                # Mettre à jour le PIN dans toutes les collections possibles
                new_hash = hash_pin(new_pin)
                clean_phone = phone.replace('+225', '')[-9:]
                await db.ussd_registrations.update_one(
                    {"$or": [{"farmer_id": farmer_id}, {"phone": phone}, {"phone_number": {"$regex": clean_phone}}]},
                    {"$set": {"pin_hash": new_hash}},
                    upsert=False
                )
                await db.users.update_one(
                    {"$or": [{"_id": ObjectId(farmer_id)}, {"phone_number": {"$regex": clean_phone}}]},
                    {"$set": {"pin_hash": new_hash}}
                )
                await db.coop_members.update_one(
                    {"$or": [{"phone_number": {"$regex": clean_phone}}]},
                    {"$set": {"pin_hash": new_hash}},
                    upsert=False
                )
                response_text = (
                    "PIN modifie avec succes !\n\n"
                    "Votre nouveau PIN est actif.\n"
                    "Ne le partagez avec personne.\n\n"
                    "0. Retour menu principal"
                )
                session["state"] = "main_menu"
            else:
                response_text = (
                    "Les PIN ne correspondent pas.\n\n"
                    "1. Reessayer\n"
                    "0. Retour menu principal"
                )
                session["state"] = "change_pin_retry"

        # ==============================
        # STATE: CHANGE PIN - RETRY
        # ==============================
        elif state == "change_pin_retry":
            choice = inputs[-1] if inputs else ""
            if choice == "1":
                session["state"] = "change_pin_new"
                response_text = (
                    "Entrez votre nouveau PIN\n"
                    "(4 chiffres)"
                )
            else:
                session["state"] = "main_menu"
                name = data.get("farmer_name", "Planteur")
                coop = data.get("coop_name", "")
                coop_label = f" ({coop})" if coop else ""
                response_text = (
                    f"GreenLink Agritech\n"
                    f"Bonjour {name}{coop_label}\n\n"
                    f"1. Estimation de ma prime\n"
                    f"2. Mes pratiques durables\n"
                    f"3. Conseils pour ma prime\n"
                    f"4. Demander paiement prime\n"
                    f"5. Mes parcelles\n"
                    f"6. SSRTE - Travail des enfants\n"
                    f"7. Mon profil\n"
                    f"8. Pratiques durables\n"
                    f"9. Changer mon PIN\n"
                    f"0. Quitter"
                )


        # ==============================
        # STATE: ESTIMATION TYPE CHOICE
        # ==============================
        elif state == "estimation_type":
            choice = inputs[-1] if inputs else ""
            if choice == "1":
                session["state"] = "est_simple_q0"
                session["data"]["est_answers"] = {}
                session["data"]["est_mode"] = "simple"
                q = CARBON_QUESTIONS_SIMPLE[0]
                response_text = f"Q1/{len(CARBON_QUESTIONS_SIMPLE)}\n{q['text']}"
            elif choice == "2":
                session["state"] = "est_detailed_q0"
                session["data"]["est_answers"] = {}
                session["data"]["est_mode"] = "detailed"
                q = CARBON_QUESTIONS_DETAILED[0]
                response_text = f"Q1/{len(CARBON_QUESTIONS_DETAILED)}\n{q['text']}"
            else:
                # Return to main menu
                session["state"] = "main_menu"
                name = data.get("farmer_name", "Planteur")
                coop = data.get("coop_name", "")
                coop_label = f" ({coop})" if coop else ""
                response_text = (
                    f"GreenLink Agritech\n"
                    f"Bonjour {name}{coop_label}\n\n"
                    f"1. Estimer ma prime carbone\n"
                    f"2. Demander le versement\n"
                    f"3. Mes parcelles\n"
                    f"4. Conseils\n"
                    f"5. Mon profil\n"
                    f"6. Aide\n"
                    f"0. Quitter"
                )

        # ==============================
        # STATE: ESTIMATION SIMPLE (questions)
        # ==============================
        elif state.startswith("est_simple_q"):
            q_idx = int(state.replace("est_simple_q", ""))
            questions = CARBON_QUESTIONS_SIMPLE
            raw_answer = inputs[-1] if inputs else ""
            
            if q_idx < len(questions):
                q = questions[q_idx]
                value, valid = parse_answer(q, raw_answer)
                
                if not valid:
                    response_text = f"Reponse invalide.\n\nQ{q_idx+1}/{len(questions)}\n{q['text']}"
                else:
                    session["data"]["est_answers"][q["key"]] = value
                    next_idx = q_idx + 1
                    
                    if next_idx < len(questions):
                        session["state"] = f"est_simple_q{next_idx}"
                        nq = questions[next_idx]
                        response_text = f"Q{next_idx+1}/{len(questions)}\n{nq['text']}"
                    else:
                        # All simple questions answered -> calculate
                        answers = session["data"]["est_answers"]
                        # For simple mode: treat all trees as >8m (grands+moyens mixed)
                        answers["arbres_moyens"] = 0
                        answers["arbres_petits"] = 0
                        answers["culture"] = "cacao"
                        
                        avg_price = 18000
                        try:
                            pipeline = [
                                {"$match": {"status": "approved", "price_per_tonne": {"$gt": 0}}},
                                {"$group": {"_id": None, "avg": {"$avg": "$price_per_tonne"}}}
                            ]
                            agg = await db.carbon_listings.aggregate(pipeline).to_list(1)
                            if agg and agg[0].get("avg"):
                                avg_price = round(agg[0]["avg"])
                        except Exception:
                            pass
                        
                        result = calculate_ussd_carbon_premium(answers, avg_rse_price=avg_price)
                        session["data"]["est_result"] = result
                        session["state"] = "est_result"
                        
                        # Sauvegarder les donnees ARS pour ce planteur
                        farmer_id = data.get("farmer_id", "")
                        if farmer_id:
                            await save_ars_data(farmer_id, answers, result, phone, data.get("farmer_name", ""), data.get("coop_name", ""))
                        
                        response_text = (
                            f"Votre Prime Carbone\n\n"
                            f"Hectares: {result['hectares']} ha\n"
                            f"Arbres >8m: {result['arbres_grands']}\n"
                            f"Score: {result['score']}/10\n"
                            f"Prime: {format_xof(result['prime_annuelle'])}/an\n\n"
                            f"Niveau: {level_label(result['ars_level'])} ({result['ars_pct']}%)\n"
                            f"Niveau Environnemental: {result.get('redd_level', 'N/A')} ({result.get('redd_score', 0)}/10)\n"
                            f"{result['ars_conseil']}\n\n"
                            f"1. Demander le versement\n"
                            f"2. Refaire l'estimation\n"
                            f"3. Retour menu\n"
                            f"0. Quitter"
                        )

        # ==============================
        # STATE: ESTIMATION DETAILED (questions)
        # ==============================
        elif state.startswith("est_detailed_q"):
            q_idx = int(state.replace("est_detailed_q", ""))
            questions = CARBON_QUESTIONS_DETAILED
            raw_answer = inputs[-1] if inputs else ""
            
            if q_idx < len(questions):
                q = questions[q_idx]
                value, valid = parse_answer(q, raw_answer)
                
                if not valid:
                    response_text = f"Reponse invalide.\n\nQ{q_idx+1}/{len(questions)}\n{q['text']}"
                else:
                    session["data"]["est_answers"][q["key"]] = value
                    next_idx = q_idx + 1
                    
                    if next_idx < len(questions):
                        session["state"] = f"est_detailed_q{next_idx}"
                        nq = questions[next_idx]
                        response_text = f"Q{next_idx+1}/{len(questions)}\n{nq['text']}"
                    else:
                        # All detailed questions answered -> calculate
                        answers = session["data"]["est_answers"]
                        answers["culture"] = "cacao"
                        
                        avg_price = 18000
                        try:
                            pipeline = [
                                {"$match": {"status": "approved", "price_per_tonne": {"$gt": 0}}},
                                {"$group": {"_id": None, "avg": {"$avg": "$price_per_tonne"}}}
                            ]
                            agg = await db.carbon_listings.aggregate(pipeline).to_list(1)
                            if agg and agg[0].get("avg"):
                                avg_price = round(agg[0]["avg"])
                        except Exception:
                            pass
                        
                        result = calculate_ussd_carbon_premium(answers, avg_rse_price=avg_price)
                        session["data"]["est_result"] = result
                        session["state"] = "est_result"
                        
                        # Sauvegarder les donnees ARS pour ce planteur
                        farmer_id = data.get("farmer_id", "")
                        if farmer_id:
                            await save_ars_data(farmer_id, answers, result, phone, data.get("farmer_name", ""), data.get("coop_name", ""))
                        
                        response_text = (
                            f"Votre Prime Carbone\n\n"
                            f"Hectares: {result['hectares']} ha\n"
                            f"Grands >12m: {result['arbres_grands']}\n"
                            f"Moyens 8-12m: {result['arbres_moyens']}\n"
                            f"Petits <8m: {result['arbres_petits']}\n"
                            f"Score: {result['score']}/10\n"
                            f"Prime: {format_xof(result['prime_annuelle'])}/an\n\n"
                            f"Niveau: {level_label(result['ars_level'])} ({result['ars_pct']}%)\n"
                            f"Niveau Environnemental: {result.get('redd_level', 'N/A')} ({result.get('redd_score', 0)}/10)\n"
                            f"{result['ars_conseil']}\n\n"
                            f"1. Demander le versement\n"
                            f"2. Refaire l'estimation\n"
                            f"3. Retour menu\n"
                            f"0. Quitter"
                        )

        # ==============================
        # STATE: ESTIMATION RESULT ACTIONS
        # ==============================
        elif state == "est_result":
            choice = inputs[-1] if inputs else ""
            if choice == "1":
                # Demander versement
                farmer_id = data.get("farmer_id", "")
                if farmer_id:
                    from routes.carbon_premiums import create_ussd_payment_request
                    result = await create_ussd_payment_request(phone)
                    if result.get("success"):
                        response_text = (
                            f"Demande enregistree !\n\n"
                            f"Montant: {format_xof(result['farmer_amount'])}\n"
                            f"Ref: {result.get('request_id', '')[:8]}\n\n"
                            f"Votre demande sera traitee\n"
                            f"par le Super Admin."
                        )
                        continue_session = False
                    else:
                        response_text = f"{result.get('message', 'Erreur')}\n\n0. Retour"
                        session["state"] = "main_menu"
                else:
                    response_text = (
                        "Pour demander le versement,\n"
                        "inscrivez-vous d'abord.\n\n"
                        "Contactez votre cooperative\n"
                        "ou appelez 07 87 76 10 23\n"
                    )
                    continue_session = False
                    
            elif choice == "2":
                session["state"] = "estimation_type"
                response_text = (
                    "Estimation Prime Carbone\n\n"
                    "1. Estimation simple (rapide)\n"
                    "2. Estimation detaillee\n"
                    "0. Retour"
                )
            elif choice == "3":
                session["state"] = "main_menu"
                name = data.get("farmer_name", "Planteur")
                coop = data.get("coop_name", "")
                coop_label = f" ({coop})" if coop else ""
                response_text = (
                    f"GreenLink Agritech\n"
                    f"Bonjour {name}{coop_label}\n\n"
                    f"1. Estimation de ma prime\n"
                    f"2. Mes pratiques durables\n"
                    f"3. Conseils prime\n"
                    f"4. Demander paiement\n"
                    f"5. Mes parcelles\n"
                    f"6. SSRTE - Travail des enfants\n"
                    f"7. Mon profil\n"
                    f"8. Pratiques durables\n"
                    f"9. Changer mon PIN\n"
                    f"0. Quitter"
                )
            else:
                response_text = "Merci !\nComposez *144*99# pour revenir."
                continue_session = False

        # ==============================
        # STATE: ARS DATA MENU
        # ==============================
        elif state == "ars_data_menu":
            choice = inputs[-1] if inputs else ""
            farmer_id = data.get("farmer_id", "")

            if choice == "1" and data.get("has_ars_data"):
                # Voir mes donnees actuelles
                ars_data = await db.ars_farmer_data.find_one({"farmer_id": farmer_id}) if farmer_id else None
                if ars_data:
                    updated = ars_data.get("updated_at", ars_data.get("created_at", ""))
                    updated_str = updated.strftime("%d/%m/%Y") if hasattr(updated, 'strftime') else str(updated)[:10]
                    response_text = (
                        f"VOS PRATIQUES DURABLES\n"
                        f"(maj: {updated_str})\n\n"
                        f"Hectares: {ars_data.get('hectares', '-')} ha\n"
                        f"Arbres total: {ars_data.get('arbres_total', '-')}\n"
                        f"Arbres >8m: {ars_data.get('arbres_grands', '-')}\n"
                        f"Engrais: {'Oui' if ars_data.get('engrais') == 'oui' else 'Non'}\n"
                        f"Brulage: {'Oui' if ars_data.get('brulage') == 'oui' else 'Non'}\n"
                        f"Niveau: {level_label(ars_data.get('ars_level', '-'))} ({ars_data.get('ars_pct', 0)}%)\n\n"
                        f"1. Mettre a jour\n"
                        f"2. Generer rapport coop\n"
                        f"0. Retour"
                    )
                else:
                    response_text = "Aucune donnee trouvee.\n\n1. Faire estimation\n0. Retour"
                session["state"] = "ars_data_view"

            elif choice == "2" and data.get("has_ars_data"):
                # Mise a jour donnees
                session["state"] = "ars_update_menu"
                response_text = (
                    "MISE A JOUR PRATIQUES\n\n"
                    "1. Hectares de cacao\n"
                    "2. Nombre total arbres\n"
                    "3. Arbres > 8 metres\n"
                    "4. Engrais (Oui/Non)\n"
                    "5. Brulage (Oui/Non)\n"
                    "0. Annuler"
                )

            elif choice == "3" and data.get("has_ars_data"):
                # Generer rapport
                ars_data = await db.ars_farmer_data.find_one({"farmer_id": farmer_id}) if farmer_id else None
                name = data.get("farmer_name", "Planteur")
                if ars_data:
                    response_text = (
                        f"RAPPORT PRATIQUES DURABLES\n"
                        f"Planteur: {name}\n"
                        f"Niveau: {ars_data.get('ars_level', '-')}\n"
                        f"Score: {ars_data.get('ars_pct', 0)}%\n\n"
                        f"Rapport transmis a votre\n"
                        f"cooperative.\n\n"
                        f"0. Retour"
                    )
                    # Notify cooperative
                    await db.ars_reports.insert_one({
                        "farmer_id": farmer_id,
                        "farmer_name": name,
                        "phone": phone,
                        "coop_name": data.get("coop_name", ""),
                        "ars_level": ars_data.get("ars_level"),
                        "ars_pct": ars_data.get("ars_pct"),
                        "data": {k: v for k, v in ars_data.items() if k not in ("_id", "farmer_id")},
                        "created_at": datetime.now(timezone.utc)
                    })
                else:
                    response_text = "Aucune donnee.\n\n0. Retour"
                session["state"] = "ars_data_menu"

            elif choice == "4" and data.get("has_ars_data"):
                # Conseils personnalises
                ars_data = await db.ars_farmer_data.find_one({"farmer_id": farmer_id}) if farmer_id else None
                if ars_data:
                    conseil = ars_data.get("ars_conseil", "Continuez vos bonnes pratiques.")
                    level = ars_data.get("ars_level", "Bronze")
                    pct = ars_data.get("ars_pct", 0)
                    response_text = (
                        f"RECOMMANDATIONS PRATIQUES DURABLES\n\n"
                        f"Votre niveau: {level} ({pct}%)\n\n"
                        f"{conseil}\n\n"
                        f"0. Retour"
                    )
                else:
                    response_text = "Aucune donnee.\n\n0. Retour"
                session["state"] = "ars_data_menu"

            elif choice == "1" and not data.get("has_ars_data"):
                # Rediriger vers estimation
                session["state"] = "estimation_type"
                response_text = (
                    "Estimation de votre Prime Carbone\n\n"
                    "1. Estimation simple (rapide)\n"
                    "2. Estimation detaillee\n"
                    "0. Retour"
                )

            elif choice == "0":
                session["state"] = "main_menu"
                name = data.get("farmer_name", "Planteur")
                coop_label = f" ({data.get('coop_name', '')})" if data.get('coop_name') else ""
                response_text = (
                    f"GreenLink Agritech\n"
                    f"Bonjour {name}{coop_label}\n\n"
                    f"1. Estimation de ma prime\n"
                    f"2. Mes pratiques durables\n"
                    f"3. Conseils prime\n"
                    f"4. Demander paiement\n"
                    f"5. Mes parcelles\n"
                    f"6. SSRTE - Travail des enfants\n"
                    f"7. Mon profil\n"
                    f"8. Pratiques durables\n"
                    f"9. Changer mon PIN\n"
                    f"0. Quitter"
                )
            else:
                response_text = "Option invalide.\n\n0. Retour"
                session["state"] = "ars_data_menu"

        # ==============================
        # STATE: ARS DATA VIEW (sub-actions)
        # ==============================
        elif state == "ars_data_view":
            choice = inputs[-1] if inputs else ""
            if choice == "1":
                session["state"] = "ars_update_menu"
                response_text = (
                    "MISE A JOUR PRATIQUES\n\n"
                    "1. Hectares de cacao\n"
                    "2. Nombre total arbres\n"
                    "3. Arbres > 8 metres\n"
                    "4. Engrais (Oui/Non)\n"
                    "5. Brulage (Oui/Non)\n"
                    "0. Annuler"
                )
            elif choice == "2":
                # Rapport -> redirect to ars_data_menu choice 3
                session["state"] = "ars_data_menu"
                session["data"]["has_ars_data"] = True
            else:
                session["state"] = "ars_data_menu"
                session["data"]["has_ars_data"] = True
                response_text = (
                    "MES PRATIQUES DURABLES\n\n"
                    "1. Voir mes donnees\n"
                    "2. Mettre a jour\n"
                    "3. Generer rapport coop\n"
                    "4. Conseils personnalises\n"
                    "0. Retour menu principal"
                )

        # ==============================
        # STATE: ARS UPDATE MENU
        # ==============================
        elif state == "ars_update_menu":
            choice = inputs[-1] if inputs else ""
            farmer_id = data.get("farmer_id", "")

            if choice in ("1", "2", "3"):
                field_map = {"1": "hectares", "2": "arbres_total", "3": "arbres_grands"}
                labels = {"1": "hectares de cacao", "2": "arbres ombrages total", "3": "arbres > 8 metres"}
                examples = {"1": "4.5", "2": "250", "3": "180"}
                session["data"]["ars_update_field"] = field_map[choice]
                session["state"] = "ars_update_value"
                response_text = f"Entrez le nombre de\n{labels[choice]} :\n(ex: {examples[choice]})"

            elif choice in ("4", "5"):
                field_map = {"4": "engrais", "5": "brulage"}
                labels = {"4": "engrais chimique", "5": "brulage des residus"}
                session["data"]["ars_update_field"] = field_map[choice]
                session["state"] = "ars_update_yesno"
                response_text = f"Utilisez-vous le\n{labels[choice]} ?\n\n1. Oui\n2. Non"

            elif choice == "0":
                session["state"] = "ars_data_menu"
                session["data"]["has_ars_data"] = True
                response_text = (
                    "MES PRATIQUES DURABLES\n\n"
                    "1. Voir mes donnees\n"
                    "2. Mettre a jour\n"
                    "3. Generer rapport coop\n"
                    "4. Conseils personnalises\n"
                    "0. Retour menu principal"
                )
            else:
                response_text = "Option invalide.\n\n0. Retour"

        elif state == "ars_update_value":
            value = inputs[-1] if inputs else ""
            field = data.get("ars_update_field", "")
            farmer_id = data.get("farmer_id", "")
            try:
                num_val = float(value)
                if num_val < 0: raise ValueError
                # Update in DB
                update_doc = {field: num_val, "updated_at": datetime.now(timezone.utc)}
                await db.ars_farmer_data.update_one(
                    {"farmer_id": farmer_id},
                    {"$set": update_doc},
                    upsert=True
                )
                # Recalculate ARS level
                ars_data = await db.ars_farmer_data.find_one({"farmer_id": farmer_id})
                if ars_data:
                    ars_answers = {
                        "hectares": ars_data.get("hectares", 0),
                        "arbres_grands": ars_data.get("arbres_grands", 0),
                        "arbres_total": ars_data.get("arbres_total", 0),
                        "brulage": ars_data.get("brulage", "non"),
                        "engrais": ars_data.get("engrais", "non"),
                    }
                    ars_result = calculate_ars_level(ars_answers)
                    await db.ars_farmer_data.update_one(
                        {"farmer_id": farmer_id},
                        {"$set": {"ars_level": ars_result["level"], "ars_pct": ars_result["pct"], "ars_conseil": ars_result["conseil"]}}
                    )
                    # Notify admin
                    await notify_admin_ars_update(farmer_id, data.get("farmer_name", ""), phone, data.get("coop_name", ""), field, num_val, ars_result)

                    response_text = (
                        f"Donnee mise a jour !\n"
                        f"Niveau ARS: {ars_result['level']} ({ars_result['pct']}%)\n\n"
                        f"1. Continuer mise a jour\n"
                        f"2. Voir mes donnees\n"
                        f"0. Retour menu"
                    )
                else:
                    response_text = "Erreur.\n\n0. Retour"
                session["state"] = "ars_update_done"
            except ValueError:
                response_text = "Valeur invalide.\nEntrez un nombre (ex: 4.5)"

        elif state == "ars_update_yesno":
            choice = inputs[-1] if inputs else ""
            field = data.get("ars_update_field", "")
            farmer_id = data.get("farmer_id", "")
            if choice in ("1", "2"):
                val = "oui" if choice == "1" else "non"
                await db.ars_farmer_data.update_one(
                    {"farmer_id": farmer_id},
                    {"$set": {field: val, "updated_at": datetime.now(timezone.utc)}},
                    upsert=True
                )
                # Recalculate
                ars_data = await db.ars_farmer_data.find_one({"farmer_id": farmer_id})
                if ars_data:
                    ars_answers = {
                        "hectares": ars_data.get("hectares", 0),
                        "arbres_grands": ars_data.get("arbres_grands", 0),
                        "arbres_total": ars_data.get("arbres_total", 0),
                        "brulage": ars_data.get("brulage", "non"),
                        "engrais": ars_data.get("engrais", "non"),
                    }
                    ars_result = calculate_ars_level(ars_answers)
                    await db.ars_farmer_data.update_one(
                        {"farmer_id": farmer_id},
                        {"$set": {"ars_level": ars_result["level"], "ars_pct": ars_result["pct"], "ars_conseil": ars_result["conseil"]}}
                    )
                    await notify_admin_ars_update(farmer_id, data.get("farmer_name", ""), phone, data.get("coop_name", ""), field, val, ars_result)

                    response_text = (
                        f"Donnee mise a jour !\n"
                        f"Niveau ARS: {ars_result['level']} ({ars_result['pct']}%)\n\n"
                        f"1. Continuer mise a jour\n"
                        f"2. Voir mes donnees\n"
                        f"0. Retour menu"
                    )
                else:
                    response_text = "Erreur.\n\n0. Retour"
                session["state"] = "ars_update_done"
            else:
                response_text = "Tapez 1 pour Oui, 2 pour Non"

        elif state == "ars_update_done":
            choice = inputs[-1] if inputs else ""
            if choice == "1":
                session["state"] = "ars_update_menu"
                response_text = (
                    "MISE A JOUR PRATIQUES\n\n"
                    "1. Hectares de cacao\n"
                    "2. Nombre total arbres\n"
                    "3. Arbres > 8 metres\n"
                    "4. Engrais (Oui/Non)\n"
                    "5. Brulage (Oui/Non)\n"
                    "0. Annuler"
                )
            elif choice == "2":
                session["state"] = "ars_data_menu"
                session["data"]["has_ars_data"] = True
                response_text = (
                    "MES PRATIQUES DURABLES\n\n"
                    "1. Voir mes donnees\n"
                    "2. Mettre a jour\n"
                    "3. Generer rapport coop\n"
                    "4. Conseils personnalises\n"
                    "0. Retour menu principal"
                )
            else:
                session["state"] = "main_menu"
                name = data.get("farmer_name", "Planteur")
                coop_label = f" ({data.get('coop_name', '')})" if data.get('coop_name') else ""
                response_text = (
                    f"GreenLink Agritech\n"
                    f"Bonjour {name}{coop_label}\n\n"
                    f"1. Estimation de ma prime\n"
                    f"2. Mes pratiques durables\n"
                    f"3. Conseils prime\n"
                    f"4. Demander paiement\n"
                    f"5. Mes parcelles\n"
                    f"6. SSRTE - Travail des enfants\n"
                    f"7. Mon profil\n"
                    f"8. Pratiques durables\n"
                    f"9. Changer mon PIN\n"
                    f"0. Quitter"
                )

        # ==============================
        # STATE: ARS CONSEILS MENU
        # ==============================
        elif state == "ars_conseils_menu":
            choice = inputs[-1] if inputs else ""
            if choice == "1":
                farmer_id = data.get("farmer_id", "")
                ars_data = await db.ars_farmer_data.find_one({"farmer_id": farmer_id}) if farmer_id else None
                arbres_ha = round(ars_data.get("arbres_total", 0) / max(ars_data.get("hectares", 1), 0.1)) if ars_data else 0
                response_text = (
                    "AGROFORESTERIE\n\n"
                    "Plantez au moins 40 arbres\n"
                    "ombres par hectare.\n"
                    "Arbres recommandes: acajou,\n"
                    "fromager, kapokier, iroko.\n"
                    "Objectif Or: 60 arbres/ha\n\n"
                    f"Votre situation: {arbres_ha} arbres/ha\n\n"
                    "0. Retour conseils"
                )
                session["state"] = "ars_conseil_view"
            elif choice == "2":
                response_text = (
                    "LUTTE CONTRE LE BRULAGE\n\n"
                    "Le brulage est interdit pour\n"
                    "les niveaux Tres Bon et Excellent.\n\n"
                    "Alternatives:\n"
                    "- Paillage des residus\n"
                    "- Compostage\n"
                    "- Enfouissement vert\n\n"
                    "0. Retour conseils"
                )
                session["state"] = "ars_conseil_view"
            elif choice == "3":
                response_text = (
                    "GESTION ENGRAIS\n\n"
                    "- Engrais recommandes CCC\n"
                    "- Dose max: 300 kg/ha/an\n"
                    "- Preferez le compost pour\n"
                    "  atteindre le niveau Or\n"
                    "- Evitez les pesticides\n"
                    "  non homologues\n\n"
                    "0. Retour conseils"
                )
                session["state"] = "ars_conseil_view"
            elif choice == "4":
                response_text = (
                    "TRACABILITE PARCELLES\n\n"
                    "- Enregistrez toutes vos\n"
                    "  parcelles avec code planteur\n"
                    "- Gardez preuves: photos,\n"
                    "  contrats coop\n"
                    "- Mettez a jour vos donnees\n"
                    "  chaque campagne\n"
                    "- Geolocalisation des\n"
                    "  parcelles recommandee\n\n"
                    "0. Retour conseils"
                )
                session["state"] = "ars_conseil_view"
            elif choice == "5":
                # Recommandations personnalisees
                farmer_id = data.get("farmer_id", "")
                ars_data = await db.ars_farmer_data.find_one({"farmer_id": farmer_id}) if farmer_id else None
                if ars_data:
                    conseil = ars_data.get("ars_conseil", "Continuez vos bonnes pratiques.")
                    level = ars_data.get("ars_level", "-")
                    pct = ars_data.get("ars_pct", 0)
                    response_text = (
                        f"VOS RECOMMANDATIONS\n\n"
                        f"Niveau actuel: {level} ({pct}%)\n\n"
                        f"{conseil}\n\n"
                        f"0. Retour conseils"
                    )
                else:
                    response_text = (
                        "Faites d'abord une estimation\n"
                        "(choix 1 du menu principal)\n"
                        "pour obtenir des conseils\n"
                        "personnalises.\n\n"
                        "0. Retour"
                    )
                session["state"] = "ars_conseil_view"
            elif choice == "0":
                session["state"] = "main_menu"
                name = data.get("farmer_name", "Planteur")
                coop_label = f" ({data.get('coop_name', '')})" if data.get('coop_name') else ""
                response_text = (
                    f"GreenLink Agritech\n"
                    f"Bonjour {name}{coop_label}\n\n"
                    f"1. Estimation de ma prime\n"
                    f"2. Mes pratiques durables\n"
                    f"3. Conseils prime\n"
                    f"4. Demander paiement\n"
                    f"5. Mes parcelles\n"
                    f"6. SSRTE - Travail des enfants\n"
                    f"7. Mon profil\n"
                    f"8. Pratiques durables\n"
                    f"9. Changer mon PIN\n"
                    f"0. Quitter"
                )
            else:
                response_text = "Option invalide.\n\n0. Retour"

        elif state == "ars_conseil_view":
            session["state"] = "ars_conseils_menu"
            response_text = (
                "CONSEILS POUR AMELIORER VOTRE PRIME\n\n"
                "1. Agroforesterie\n"
                "2. Lutte contre le brulage\n"
                "3. Gestion des engrais\n"
                "4. Tracabilite\n"
                "5. Recommandations perso.\n"
                "0. Retour menu principal"
            )

        # ==============================
        # STATE: SUB-VIEWS (parcels, advice, profile, help)
        # ==============================
        elif state in ("parcels_view", "advice_view", "profile_view", "help_view"):
            choice = inputs[-1] if inputs else ""
            if choice == "0":
                session["state"] = "main_menu"
                name = data.get("farmer_name", "Planteur")
                coop = data.get("coop_name", "")
                coop_label = f" ({coop})" if coop else ""
                response_text = (
                    f"GreenLink Agritech\n"
                    f"Bonjour {name}{coop_label}\n\n"
                    f"1. Estimation de ma prime\n"
                    f"2. Mes pratiques durables\n"
                    f"3. Conseils prime\n"
                    f"4. Demander paiement\n"
                    f"5. Mes parcelles\n"
                    f"6. SSRTE - Travail des enfants\n"
                    f"7. Mon profil\n"
                    f"8. Pratiques durables\n"
                    f"9. Changer mon PIN\n"
                    f"0. Quitter"
                )
            else:
                response_text = "Tapez 0 pour retourner au menu."

        # ==============================
        # FALLBACK
        # ==============================
        else:
            response_text = (
                "Bienvenue sur GreenLink Agritech\n"
                "Estimation prime carbone cacao\n\n"
                "1. Je suis deja inscrit\n"
                "2. Nouvelle inscription\n"
                "3. Aide / Infos\n"
                "0. Quitter"
            )
            session["state"] = "welcome"

        prefix = "CON " if continue_session else "END "
        logger.info(f"USSD Response: {response_text[:50]}...")
        
        return {
            "session_id": sid,
            "text": prefix + response_text,
            "continue_session": continue_session,
            "raw_response": response_text
        }
    
    except Exception as e:
        logger.error(f"USSD Error: {str(e)}")
        return {
            "session_id": request.sessionId,
            "text": "END Erreur systeme. Reessayez.",
            "continue_session": False,
            "error": str(e)
        }


# ============= CARBON CALCULATOR (stateless, for *144*99#) =============

@router.post("/carbon-calculator")
async def ussd_carbon_calculator(request: USSDRequest):
    """
    Stateless USSD Carbon Calculator.
    Parses all answers from accumulated text.
    """
    try:
        text_input = request.text.strip()
        inputs = text_input.split("*") if text_input else []
        num_answers = len(inputs)
        
        # All questions for stateless mode (14 questions)
        QUESTIONS = [
            {"key": "hectares", "text": "PRIME CARBONE *144*99#\n\nQuestion 1/14\nSurface plantation (hectares) ?\nLa superficie de votre exploitation determine le potentiel de sequestration carbone.\n\nEx: 3.5", "type": "number"},
            {"key": "arbres_grands", "text": "Question 2/14\nArbres GRANDS (> 12m) ?\nLes grands arbres stockent plus de carbone et offrent un meilleur ombrage.\n\nEx: 20", "type": "number"},
            {"key": "arbres_moyens", "text": "Question 3/14\nArbres MOYENS (8-12m) ?\nLes arbres moyens contribuent a la biodiversite et a la couverture.\n\nEx: 30", "type": "number"},
            {"key": "arbres_petits", "text": "Question 4/14\nArbres PETITS (< 8m) ?\nLes jeunes arbres representent le potentiel futur de stockage carbone.\n\nEx: 10", "type": "number"},
            {"key": "culture", "text": "Question 5/14\nCulture principale ?\nChaque culture a un potentiel different de sequestration carbone.\n\n1. Cacao\n2. Cafe\n3. Anacarde", "type": "choice"},
            {"key": "engrais", "text": "Question 6/14\nEngrais chimiques ?\nLes engrais chimiques augmentent les emissions de gaz a effet de serre.\n\n1. Oui\n2. Non", "type": "yesno"},
            {"key": "brulage", "text": "Question 7/14\nBrulage des residus ?\nLe brulage libere du CO2 et detruit la matiere organique du sol.\n\n1. Oui\n2. Non", "type": "yesno"},
            {"key": "compost", "text": "Question 8/14\nCompost organique ?\nLe compost ameliore la fertilite du sol et stocke du carbone durablement.\n\n1. Oui\n2. Non", "type": "yesno"},
            {"key": "agroforesterie", "text": "Question 9/14\nAgroforesterie ?\nL'agroforesterie associe arbres et cultures pour maximiser le stockage carbone.\n\n1. Oui\n2. Non", "type": "yesno"},
            {"key": "couverture_sol", "text": "Question 10/14\nCouverture vegetale au sol ?\nLes plantes basses entre les arbres protegent le sol et stockent du carbone.\n\n1. Oui\n2. Non", "type": "yesno"},
            {"key": "biochar", "text": "Question 11/14\nBiochar (charbon vegetal) ?\nLe biochar est du bois carbonise melange au sol pour stocker le carbone durablement.\n\n1. Oui\n2. Non", "type": "yesno"},
            {"key": "zero_deforestation", "text": "Question 12/14\nEngagement zero deforestation ?\nVous vous engagez a ne pas couper de foret pour agrandir vos parcelles.\n\n1. Oui\n2. Non", "type": "yesno"},
            {"key": "reboisement", "text": "Question 13/14\nReboisement actif ?\nVous plantez de nouveaux arbres forestiers pour restaurer les zones degradees.\n\n1. Oui\n2. Non", "type": "yesno"},
            {"key": "age_cacaoyers", "text": "Question 14/14\nAge moyen de vos cacaoyers ?\nLes cacaoyers matures stockent plus de carbone que les jeunes plants.\n\n1. Moins de 5 ans\n2. 5 a 15 ans\n3. Plus de 15 ans", "type": "choice3"},
        ]
        
        if num_answers == 0:
            return {
                "session_id": request.sessionId,
                "text": "CON " + QUESTIONS[0]["text"],
                "continue_session": True,
                "raw_response": QUESTIONS[0]["text"],
                "step": 1,
                "total_steps": len(QUESTIONS),
            }
        
        answers = {}
        for i, raw in enumerate(inputs):
            if i >= len(QUESTIONS):
                break
            q = QUESTIONS[i]
            value, valid = parse_answer(q, raw.strip())
            if not valid:
                error_text = f"Reponse invalide.\n\n{q['text']}"
                return {
                    "session_id": request.sessionId,
                    "text": "CON " + error_text,
                    "continue_session": True,
                    "raw_response": error_text,
                    "step": i + 1,
                    "total_steps": len(QUESTIONS),
                }
            answers[q["key"]] = value
        
        if num_answers < len(QUESTIONS):
            next_q = QUESTIONS[num_answers]
            return {
                "session_id": request.sessionId,
                "text": "CON " + next_q["text"],
                "continue_session": True,
                "raw_response": next_q["text"],
                "step": num_answers + 1,
                "total_steps": len(QUESTIONS),
            }
        
        # All answered -> calculate
        avg_price = 18000
        try:
            pipeline = [
                {"$match": {"status": "approved", "price_per_tonne": {"$gt": 0}}},
                {"$group": {"_id": None, "avg": {"$avg": "$price_per_tonne"}}}
            ]
            agg = await db.carbon_listings.aggregate(pipeline).to_list(1)
            if agg and agg[0].get("avg"):
                avg_price = round(agg[0]["avg"])
        except Exception:
            pass

        result = calculate_ussd_carbon_premium(answers, avg_rse_price=avg_price)
        
        if result["eligible"]:
            result_text = (
                f"VOTRE PRIME CARBONE\n\n"
                f"Score: {result['score']}/10\n"
                f"Arbres/ha: {result['arbres_par_ha']}\n\n"
                f"Prime estimee:\n"
                f"{result['prime_annuelle']:,.0f} FCFA/an\n"
                f"({result['prime_fcfa_kg']} FCFA/kg)\n\n"
                f"Niveau ARS: {result['ars_level']}\n"
                f"{result['ars_conseil']}\n\n"
                f"Inscrivez-vous sur GreenLink\n"
                f"Tel: 07 87 76 10 23"
            )
        else:
            result_text = (
                f"ESTIMATION PRIME CARBONE\n\n"
                f"Score: {result['score']}/10\n"
                f"(Minimum requis: 5/10)\n\n"
                f"Niveau ARS: {result['ars_level']}\n"
                f"{result['ars_conseil']}\n\n"
                f"Ameliorez votre score:\n"
                f"- Plus d'arbres d'ombrage\n"
                f"- Arretez le brulage\n"
                f"- Compost organique\n\n"
                f"Tel: 07 87 76 10 23"
            )
        
        return {
            "session_id": request.sessionId,
            "text": "END " + result_text,
            "continue_session": False,
            "raw_response": result_text,
            "step": len(QUESTIONS) + 1,
            "total_steps": len(QUESTIONS),
            "result": result,
        }
    
    except Exception as e:
        logger.error(f"Carbon Calculator USSD Error: {str(e)}")
        return {
            "session_id": request.sessionId,
            "text": "END Erreur. Reessayez *144*99#",
            "continue_session": False,
            "error": str(e),
        }


# ============= PUBLIC CALCULATOR (Homepage) =============

@router.post("/calculate-premium")
async def calculate_premium_public(data: dict):
    """Public carbon premium calculator for the homepage."""
    try:
        answers = {
            "hectares": float(data.get("hectares", 1)),
            "arbres_grands": int(data.get("arbres_grands", 0)),
            "arbres_moyens": int(data.get("arbres_moyens", 0)),
            "arbres_petits": int(data.get("arbres_petits", 0)),
            "culture": data.get("culture", "cacao"),
            "engrais": "non" if "zero_pesticides" in data.get("practices", []) else "oui",
            "brulage": "non",
            "compost": "oui" if "compost" in data.get("practices", []) else "non",
            "agroforesterie": "oui" if "agroforesterie" in data.get("practices", []) else "non",
            "couverture_sol": "oui" if ("couverture_vegetale" in data.get("practices", []) or "rotation_cultures" in data.get("practices", [])) else "non",
        }

        avg_price = 18000
        try:
            pipeline = [
                {"$match": {"status": "approved", "price_per_tonne": {"$gt": 0}}},
                {"$group": {"_id": None, "avg": {"$avg": "$price_per_tonne"}}}
            ]
            agg = await db.carbon_listings.aggregate(pipeline).to_list(1)
            if agg and agg[0].get("avg"):
                avg_price = round(agg[0]["avg"])
        except Exception:
            pass

        result = calculate_ussd_carbon_premium(answers, avg_rse_price=avg_price)
        return {
            "score": result["score"],
            "prime_fcfa_kg": result["prime_fcfa_kg"],
            "prime_annuelle": result["prime_annuelle"],
            "co2_par_ha": result["co2_par_ha"],
            "eligible": result["eligible"],
            "hectares": result["hectares"],
            "culture": result["culture"],
            "rendement_kg_ha": result["rendement_kg_ha"],
            "arbres_par_ha": result["arbres_par_ha"],
            "arbres_grands": result.get("arbres_grands", 0),
            "arbres_moyens": result.get("arbres_moyens", 0),
            "arbres_petits": result.get("arbres_petits", 0),
            "total_arbres": result.get("total_arbres", 0),
            "ars_level": result.get("ars_level", ""),
            "ars_pct": result.get("ars_pct", 0),
            "ars_conseil": result.get("ars_conseil", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============= SMS GATEWAY =============

class SMSRequest(BaseModel):
    from_number: str
    to_number: str
    message: str
    message_id: Optional[str] = None


@router.post("/sms/incoming")
async def handle_incoming_sms(request: SMSRequest):
    """Handle incoming SMS messages from farmers."""
    try:
        phone = request.from_number
        message = request.message.upper().strip()
        
        logger.info(f"SMS from {phone}: {message}")
        farmer = await find_farmer_by_phone(phone)
        farmer_name = farmer.get("full_name", "Utilisateur") if farmer else "Utilisateur"
        farmer_id = str(farmer.get("_id", "")) if farmer else None
        
        response = ""
        
        if message.startswith("SOLDE"):
            if farmer_id:
                stats = await get_farmer_carbon_stats(farmer_id)
                response = f"GreenLink - SOLDE\n{farmer_name}\nPrime disponible: {format_xof(stats['pending'])}\nDeja recu: {format_xof(stats['total_received'])}\nScore: {stats['avg_score']}/10\n\nComposez *144*99# pour plus"
            else:
                response = "GreenLink: Numero non reconnu. Contactez votre cooperative."
        elif message.startswith("PRIME"):
            if farmer_id:
                stats = await get_farmer_carbon_stats(farmer_id)
                response = f"GreenLink - PRIME\n{farmer_name}\nScore: {stats['avg_score']}/10\nSurface: {stats['total_area']} ha\nPrime: {format_xof(stats['pending'])}"
            else:
                response = "GreenLink: Numero non reconnu."
        elif message.startswith("AIDE"):
            response = "GreenLink - AIDE\nSMS au 1234:\nSOLDE, PRIME, AIDE\n\nComposez *144*99#\nTel: 07 87 76 10 23"
        else:
            response = "GreenLink: Commande non reconnue.\nEnvoyez SOLDE, PRIME ou AIDE\nOu composez *144*99#"
        
        await db.sms_logs.insert_one({
            "direction": "incoming",
            "from_number": phone,
            "message": request.message,
            "response": response,
            "created_at": datetime.now(timezone.utc)
        })
        
        return {"status": "success", "to": phone, "message": response}
    except Exception as e:
        logger.error(f"SMS Error: {str(e)}")
        return {"status": "error", "error": str(e)}


# ============= ADMIN STATS =============

@router.get("/stats")
async def get_ussd_stats(current_user: dict = Depends(get_current_user)):
    try:
        from datetime import timedelta
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)
        
        sms_today = await db.sms_logs.count_documents({"created_at": {"$gte": today}})
        sms_week = await db.sms_logs.count_documents({"created_at": {"$gte": week_ago}})
        ussd_registrations = await db.ussd_registrations.count_documents({})
        
        return {
            "sms": {"today": sms_today, "week": sms_week},
            "ussd_registrations": ussd_registrations,
            "active_sessions": len(ussd_sessions)
        }
    except Exception as e:
        logger.error(f"Stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= REGISTRATION ENDPOINTS =============

@router.get("/registrations")
async def get_ussd_registrations(limit: int = 50, skip: int = 0, agent_id: str = None, current_user: dict = Depends(get_current_user)):
    """Get USSD registrations. Agents see their own, cooperatives see only their members."""
    try:
        user_type = current_user.get('user_type', '')
        user_id = str(current_user.get('_id', ''))
        
        query = {}
        
        if user_type in ('field_agent', 'agent_terrain'):
            # Agents only see registrations they created
            query["registered_by_agent"] = agent_id or user_id
        elif user_type in ('cooperative', 'cooperative_admin'):
            # Cooperative sees registrations from their agents OR with their referral/coop code
            coop_id = user_id
            # Get agent IDs for this cooperative
            coop_agents_list = await db.coop_agents.find({"coop_id": coop_id}, {"user_id": 1}).to_list(100)
            agent_ids = [a["user_id"] for a in coop_agents_list if a.get("user_id")]
            user_agents = await db.users.find({"cooperative_id": coop_id, "user_type": {"$in": ["field_agent", "agent_terrain"]}}, {"_id": 1}).to_list(100)
            agent_ids.extend([str(a["_id"]) for a in user_agents])
            agent_ids = list(set(agent_ids))
            
            # Get cooperative referral code
            referral_code = current_user.get("referral_code", "")
            
            # Build OR query: by agent OR by coop code
            or_conditions = []
            if agent_ids:
                or_conditions.append({"registered_by_agent": {"$in": agent_ids}})
            if referral_code:
                or_conditions.append({"cooperative_code": referral_code})
                or_conditions.append({"coop_code": referral_code})
            # Also match by coop_id if present
            or_conditions.append({"coop_id": coop_id})
            or_conditions.append({"cooperative_id": coop_id})
            
            if or_conditions:
                query["$or"] = or_conditions
            else:
                # No agents and no referral code → show nothing
                return {"registrations": [], "total": 0}
        elif user_type == 'admin':
            # Admin: can filter by agent_id, otherwise sees all
            if agent_id:
                query["registered_by_agent"] = agent_id
        else:
            # Unknown user type: show nothing
            return {"registrations": [], "total": 0}
        
        registrations = await db.ussd_registrations.find(
            query, {"pin_hash": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await db.ussd_registrations.count_documents(query)
        
        for r in registrations:
            r["_id"] = str(r["_id"])
            if "created_at" in r and isinstance(r["created_at"], datetime):
                r["created_at"] = r["created_at"].isoformat()
        
        return {"registrations": registrations, "total": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/register-web")
async def register_farmer_web(data: dict):
    """
    Web/App registration form endpoint.
    Code planteur auto-generated. Optional: cooperative_code (rattachement coop), hectares, email.
    If agent_id is provided, also creates coop_member and assigns to the agent.
    """
    try:
        nom = data.get("nom_complet", "").strip()
        telephone = data.get("telephone", "").strip()
        cooperative_code = data.get("cooperative_code", "").strip()
        village = data.get("village", "").strip()
        pin = data.get("pin", "").strip()
        hectares = data.get("hectares")
        email = data.get("email", "").strip()
        agent_id = data.get("agent_id")
        
        if not nom or len(nom) < 2:
            raise HTTPException(status_code=400, detail="Nom complet requis (min 2 caracteres)")
        if not telephone or len(telephone) < 8:
            raise HTTPException(status_code=400, detail="Numero de telephone requis")
        if not pin or len(pin) != 4 or not pin.isdigit():
            raise HTTPException(status_code=400, detail="Code PIN a 4 chiffres requis")
        
        # Check if already registered
        existing = await find_farmer_by_phone(telephone)
        if existing:
            raise HTTPException(status_code=409, detail="Ce numero de telephone est deja enregistre")
        
        # Auto-generate farmer code
        farmer_code = await generate_farmer_code(cooperative_code, village)
        
        reg_doc = {
            "full_name": nom,
            "nom_complet": nom,
            "phone_number": telephone,
            "cooperative_code": cooperative_code,
            "code_planteur": farmer_code,
            "village": village,
            "pin_hash": hash_pin(pin),
            "hectares_approx": float(hectares) if hectares else None,
            "email": email or None,
            "user_type": "producteur",
            "registered_via": "agent" if agent_id else "web",
            "registered_by_agent": agent_id,
            "status": "active",
            "created_at": datetime.now(timezone.utc)
        }
        
        result = await db.ussd_registrations.insert_one(reg_doc)
        
        member_id = None
        # If registered by an agent, also create coop_member and assign to agent
        if agent_id:
            try:
                agent_record = await db.coop_agents.find_one({"user_id": agent_id})
                if not agent_record:
                    agent_record = await db.coop_agents.find_one({"user_id": str(agent_id)})
                
                coop_id = agent_record.get("coop_id", "") if agent_record else ""
                
                # Create coop_member
                member_doc = {
                    "coop_id": coop_id,
                    "full_name": nom,
                    "phone_number": telephone,
                    "village": village,
                    "status": "active",
                    "is_active": True,
                    "code_planteur": farmer_code,
                    "pin_hash": hash_pin(pin),
                    "hectares_approx": float(hectares) if hectares else None,
                    "created_at": datetime.now(timezone.utc),
                    "created_by": agent_id,
                    "registered_via": "agent",
                }
                member_result = await db.coop_members.insert_one(member_doc)
                member_id = str(member_result.inserted_id)
                
                # Add to agent's assigned_farmers
                if agent_record:
                    await db.coop_agents.update_one(
                        {"_id": agent_record["_id"]},
                        {"$addToSet": {"assigned_farmers": member_id}}
                    )
                logger.info(f"Farmer {nom} created as coop_member {member_id} and assigned to agent {agent_id}")
            except Exception as e:
                logger.error(f"Error creating coop_member for agent registration: {e}")
        
        return {
            "success": True,
            "message": "Inscription reussie !",
            "farmer_id": str(result.inserted_id),
            "member_id": member_id,
            "code_planteur": farmer_code,
            "nom": nom,
            "telephone": telephone,
            "village": village
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Web registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test")
async def test_ussd(phone: str = Query(..., description="Phone number to test")):
    """Test USSD simulation."""
    test_request = USSDRequest(
        sessionId=f"test_{datetime.now(timezone.utc).timestamp()}",
        serviceCode="*144*99#",
        phoneNumber=phone,
        text=""
    )
    return await ussd_callback(test_request)


# ==============================
# SSRTE API - Consultation des reponses
# ==============================
@router.get("/ssrte/responses")
async def get_ssrte_responses(coop_id: str = Query(None), statut: str = Query(None), current_user: dict = Depends(get_current_user)):
    """Consulter les reponses SSRTE des agriculteurs."""
    query = {}
    if coop_id:
        query["coop_id"] = coop_id
    if statut:
        query["statut"] = statut
    
    responses = await db.ssrte_responses.find(query, {"_id": 0}).sort("updated_at", -1).to_list(500)
    
    stats = {
        "total": len(responses),
        "conforme": sum(1 for r in responses if r.get("statut") == "conforme"),
        "alerte_ici": sum(1 for r in responses if r.get("statut") == "alerte_ici"),
    }
    
    return {"stats": stats, "responses": responses}


@router.get("/ssrte/alerts")
async def get_ssrte_alerts(current_user: dict = Depends(get_current_user)):
    """Consulter les alertes SSRTE (enfants non scolarises)."""
    alerts = await db.ssrte_responses.find(
        {"statut": "alerte_ici"}, {"_id": 0}
    ).sort("updated_at", -1).to_list(200)
    return {"count": len(alerts), "alerts": alerts}
