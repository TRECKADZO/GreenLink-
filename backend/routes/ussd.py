"""
USSD Gateway Integration for GreenLink Agritech
Code: *144*88#

Flux:
1. Menu accueil -> Deja inscrit / Nouvelle inscription / Aide
2. Reconnaissance profil -> Menu principal (6 options)
3. Estimation prime -> Simple ou Detaillee
4. Demande versement -> Confirmation -> Envoi Super Admin
5. Parcelles, Conseils, Profil, Aide
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
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
    {"key": "engrais", "text": "Utilisez-vous de l'engrais ?\n1. Oui\n2. Non", "type": "yesno"},
    {"key": "brulage", "text": "Pratiquez-vous le brulage des residus ?\n1. Oui\n2. Non", "type": "yesno"},
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
    
    RSE = score x taux x hectares
    30% frais, 70% distribue (25% GreenLink, 5% Coop, 70% Paysan)
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

    # Age bonus
    age = answers.get("age_cacaoyers", "mature")
    if age == "mature": score += 0.5
    elif age == "vieux": score += 0.3

    score = max(0, min(10, round(score, 1)))
    score_ratio = score / 10.0

    FEES_RATE = 0.30
    DISTRIBUTABLE_RATE = 0.70
    FARMER_SHARE = 0.70

    prix_rse_tonne = avg_rse_price
    net_per_tonne = prix_rse_tonne * DISTRIBUTABLE_RATE
    farmer_per_tonne = net_per_tonne * FARMER_SHARE * score_ratio

    co2_per_ha = 2 + score_ratio * 6
    farmer_revenue_per_ha = farmer_per_tonne * co2_per_ha

    culture = answers.get("culture", "cacao")
    rendement_kg_ha = {"cacao": 700, "cafe": 500, "anacarde": 400}.get(culture, 600)
    prime_fcfa_kg = farmer_revenue_per_ha / max(rendement_kg_ha, 1)
    prime_annuelle = farmer_revenue_per_ha * hectares

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
    }


# ============= MAIN USSD ENDPOINT (*144*88#) =============

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
                        f"1. Estimer ma prime carbone\n"
                        f"2. Demander le versement\n"
                        f"3. Mes parcelles et historique\n"
                        f"4. Conseils agroforestiers\n"
                        f"5. Mon profil\n"
                        f"6. Aide / Contact\n"
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
                    f"1. Estimer ma prime carbone\n"
                    f"2. Demander le versement\n"
                    f"3. Mes parcelles et historique\n"
                    f"4. Conseils agroforestiers\n"
                    f"5. Mon profil\n"
                    f"6. Aide / Contact\n"
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
                # Save registration
                reg_doc = {
                    "full_name": d["reg_name"],
                    "nom_complet": d["reg_name"],
                    "phone_number": phone,
                    "coop_code": d.get("reg_coop", ""),
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
                    "Inscription reussie !\n"
                    "Vous pouvez maintenant\n"
                    "estimer votre prime carbone.\n\n"
                    "1. Commencer l'estimation\n"
                    "0. Quitter"
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
                # Estimation prime carbone -> choix simple/detaillee
                session["state"] = "estimation_type"
                response_text = (
                    "Estimation Prime Carbone\n\n"
                    "1. Estimation simple (rapide)\n"
                    "2. Estimation detaillee\n"
                    "0. Retour"
                )
                
            elif choice == "2":
                # Demander versement prime
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
                    
            elif choice == "3":
                # Mes parcelles et historique
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
                
            elif choice == "4":
                # Conseils agroforestiers
                response_text = (
                    "Conseils Agroforestiers\n\n"
                    "- Plantez des arbres d'ombrage\n"
                    "  (acajou, fromager)\n"
                    "- Utilisez du compost\n"
                    "- Evitez le brulage\n"
                    "- Couvrez le sol\n\n"
                    "Plus de conseils:\n"
                    "Tel: 07 87 76 10 23\n\n"
                    "0. Retour"
                )
                session["state"] = "advice_view"
                
            elif choice == "5":
                # Mon profil
                name = data.get("farmer_name", "Planteur")
                coop = data.get("coop_name", "Non renseigne")
                farmer_id = data.get("farmer_id", "")
                stats = await get_farmer_carbon_stats(farmer_id) if farmer_id else {}
                
                response_text = (
                    f"Mon Profil\n\n"
                    f"Nom: {name}\n"
                    f"Coop: {coop or 'Non renseigne'}\n"
                    f"Tel: {phone}\n"
                    f"Parcelles: {stats.get('parcels_count', 0)}\n"
                    f"Surface: {stats.get('total_area', 0)} ha\n"
                    f"Score: {stats.get('avg_score', 0)}/10\n\n"
                    f"0. Retour"
                )
                session["state"] = "profile_view"
                
            elif choice == "6":
                # Aide / Contact
                response_text = (
                    "Aide GreenLink\n\n"
                    "Tel: 07 87 76 10 23\n"
                    "Canada: +1 514 475-7340\n\n"
                    "Composez *144*88# pour\n"
                    "estimer votre prime.\n\n"
                    "0. Retour"
                )
                session["state"] = "help_view"
                
            elif choice == "0":
                response_text = "Merci d'avoir utilise GreenLink.\nA bientot !"
                continue_session = False
            else:
                name = data.get("farmer_name", "Planteur")
                coop = data.get("coop_name", "")
                coop_label = f" ({coop})" if coop else ""
                response_text = (
                    f"Option invalide.\n\n"
                    f"1. Estimer ma prime carbone\n"
                    f"2. Demander le versement\n"
                    f"3. Mes parcelles\n"
                    f"4. Conseils\n"
                    f"5. Mon profil\n"
                    f"6. Aide\n"
                    f"0. Quitter"
                )

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
                        
                        response_text = (
                            f"Estimation Prime Carbone\n\n"
                            f"Hectares: {result['hectares']} ha\n"
                            f"Arbres >8m: {result['arbres_grands']}\n"
                            f"Score: {result['score']}/10\n\n"
                            f"Prime estimee:\n"
                            f"{format_xof(result['prime_annuelle'])} / an\n\n"
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
                        
                        response_text = (
                            f"Estimation Prime Carbone\n\n"
                            f"Hectares: {result['hectares']} ha\n"
                            f"Grands >12m: {result['arbres_grands']}\n"
                            f"Moyens 8-12m: {result['arbres_moyens']}\n"
                            f"Petits <8m: {result['arbres_petits']}\n"
                            f"Score: {result['score']}/10\n\n"
                            f"Prime estimee:\n"
                            f"{format_xof(result['prime_annuelle'])} / an\n\n"
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
                    f"1. Estimer ma prime carbone\n"
                    f"2. Demander le versement\n"
                    f"3. Mes parcelles\n"
                    f"4. Conseils\n"
                    f"5. Mon profil\n"
                    f"6. Aide\n"
                    f"0. Quitter"
                )
            else:
                response_text = "Merci !\nComposez *144*88# pour revenir."
                continue_session = False

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
                    f"1. Estimer ma prime carbone\n"
                    f"2. Demander le versement\n"
                    f"3. Mes parcelles\n"
                    f"4. Conseils\n"
                    f"5. Mon profil\n"
                    f"6. Aide\n"
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


# ============= CARBON CALCULATOR (stateless, for *144*88#) =============

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
        
        # All questions for stateless mode (9 questions)
        QUESTIONS = [
            {"key": "hectares", "text": "PRIME CARBONE *144*88#\n\nQuestion 1/9\nSurface plantation (hectares) ?\n\nEx: 3.5", "type": "number"},
            {"key": "arbres_grands", "text": "Question 2/9\nArbres GRANDS (> 12m) ?\n\nEx: 20", "type": "number"},
            {"key": "arbres_moyens", "text": "Question 3/9\nArbres MOYENS (8-12m) ?\n\nEx: 30", "type": "number"},
            {"key": "arbres_petits", "text": "Question 4/9\nArbres PETITS (< 8m) ?\n\nEx: 10", "type": "number"},
            {"key": "culture", "text": "Question 5/9\nCulture principale ?\n\n1. Cacao\n2. Cafe\n3. Anacarde", "type": "choice"},
            {"key": "engrais", "text": "Question 6/9\nEngrais chimiques ?\n\n1. Oui\n2. Non", "type": "yesno"},
            {"key": "brulage", "text": "Question 7/9\nBrulage des residus ?\n\n1. Oui\n2. Non", "type": "yesno"},
            {"key": "compost", "text": "Question 8/9\nCompost organique ?\n\n1. Oui\n2. Non", "type": "yesno"},
            {"key": "agroforesterie", "text": "Question 9/9\nAgroforesterie ?\n\n1. Oui\n2. Non", "type": "yesno"},
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
                f"Arbres/ha: {result['arbres_par_ha']}\n"
                f"CO2: {result['co2_par_ha']}t/ha\n\n"
                f"Prime estimee:\n"
                f"{result['prime_annuelle']:,.0f} FCFA/an\n"
                f"({result['prime_fcfa_kg']} FCFA/kg)\n\n"
                f"Inscrivez-vous sur GreenLink\n"
                f"Tel: 07 87 76 10 23"
            )
        else:
            result_text = (
                f"ESTIMATION\n\n"
                f"Score: {result['score']}/10\n"
                f"(Minimum requis: 5/10)\n\n"
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
            "text": "END Erreur. Reessayez *144*88#",
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
                response = f"GreenLink - SOLDE\n{farmer_name}\nPrime disponible: {format_xof(stats['pending'])}\nDeja recu: {format_xof(stats['total_received'])}\nScore: {stats['avg_score']}/10\n\nComposez *144*88# pour plus"
            else:
                response = "GreenLink: Numero non reconnu. Contactez votre cooperative."
        elif message.startswith("PRIME"):
            if farmer_id:
                stats = await get_farmer_carbon_stats(farmer_id)
                response = f"GreenLink - PRIME\n{farmer_name}\nScore: {stats['avg_score']}/10\nSurface: {stats['total_area']} ha\nPrime: {format_xof(stats['pending'])}"
            else:
                response = "GreenLink: Numero non reconnu."
        elif message.startswith("AIDE"):
            response = "GreenLink - AIDE\nSMS au 1234:\nSOLDE, PRIME, AIDE\n\nComposez *144*88#\nTel: 07 87 76 10 23"
        else:
            response = "GreenLink: Commande non reconnue.\nEnvoyez SOLDE, PRIME ou AIDE\nOu composez *144*88#"
        
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
async def get_ussd_stats():
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
async def get_ussd_registrations(limit: int = 50, skip: int = 0):
    """Get USSD registrations for admin/cooperative dashboards."""
    try:
        registrations = await db.ussd_registrations.find(
            {}, {"pin_hash": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await db.ussd_registrations.count_documents({})
        
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
    Fields: nom_complet, telephone, code_planteur, village, pin, hectares (optional), email (optional)
    """
    try:
        nom = data.get("nom_complet", "").strip()
        telephone = data.get("telephone", "").strip()
        code_planteur = data.get("code_planteur", "").strip()
        village = data.get("village", "").strip()
        pin = data.get("pin", "").strip()
        hectares = data.get("hectares")
        email = data.get("email", "").strip()
        
        if not nom or len(nom) < 2:
            raise HTTPException(status_code=400, detail="Nom complet requis (min 2 caracteres)")
        if not telephone or len(telephone) < 8:
            raise HTTPException(status_code=400, detail="Numero de telephone requis")
        if not village or len(village) < 2:
            raise HTTPException(status_code=400, detail="Village requis")
        if not pin or len(pin) != 4 or not pin.isdigit():
            raise HTTPException(status_code=400, detail="Code PIN a 4 chiffres requis")
        
        # Check if already registered
        existing = await find_farmer_by_phone(telephone)
        if existing:
            raise HTTPException(status_code=409, detail="Ce numero de telephone est deja enregistre")
        
        reg_doc = {
            "full_name": nom,
            "nom_complet": nom,
            "phone_number": telephone,
            "coop_code": code_planteur,
            "code_planteur": code_planteur,
            "village": village,
            "pin_hash": hash_pin(pin),
            "hectares_approx": float(hectares) if hectares else None,
            "email": email or None,
            "user_type": "producteur",
            "registered_via": "web",
            "status": "active",
            "created_at": datetime.now(timezone.utc)
        }
        
        result = await db.ussd_registrations.insert_one(reg_doc)
        
        return {
            "success": True,
            "message": "Inscription reussie !",
            "farmer_id": str(result.inserted_id),
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
        serviceCode="*144*88#",
        phoneNumber=phone,
        text=""
    )
    return await ussd_callback(test_request)
