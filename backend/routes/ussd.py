"""
USSD Gateway Integration for GreenLink
Allows farmers to access their data via USSD codes (*123*45#)

This module provides:
1. USSD session management
2. Real farmer data access without internet
3. Multi-language support (French, Baoulé, Dioula)
4. Integration ready for Orange CI, MTN, Moov

Standard USSD Request format:
- sessionId: Unique session identifier
- serviceCode: USSD code dialed
- phoneNumber: Farmer's phone
- text: User input (menu navigation)
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId
import logging

from database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ussd", tags=["USSD"])


# ============= MODELS =============

class USSDRequest(BaseModel):
    sessionId: str
    serviceCode: str
    phoneNumber: str
    text: str = ""
    networkCode: Optional[str] = None  # Orange, MTN, Moov


class USSDResponse(BaseModel):
    session_id: str
    text: str
    continue_session: bool  # True = CON, False = END


# ============= SESSION STORAGE =============
# In production, use Redis for session management
ussd_sessions = {}


# ============= HELPER FUNCTIONS =============

def format_xof(amount: float) -> str:
    """Format amount in XOF"""
    return f"{amount:,.0f}".replace(",", " ") + " XOF"


def get_session_data(session_id: str) -> dict:
    """Get or create session data"""
    if session_id not in ussd_sessions:
        ussd_sessions[session_id] = {
            "level": "main",
            "data": {},
            "created_at": datetime.utcnow()
        }
    return ussd_sessions[session_id]


def set_session_level(session_id: str, level: str, data: dict = None):
    """Update session level and data"""
    session = get_session_data(session_id)
    session["level"] = level
    if data:
        session["data"].update(data)


async def get_farmer_by_phone(phone: str) -> dict:
    """Find farmer by phone number"""
    # Try multiple formats
    phone_variants = [
        phone,
        phone.replace("+225", ""),
        "+225" + phone.lstrip("+225"),
        phone.replace(" ", "")
    ]
    
    for p in phone_variants:
        # Check in users collection
        farmer = await db.users.find_one({
            "phone_number": {"$regex": p[-9:]},  # Last 9 digits
            "user_type": {"$in": ["producteur", "farmer"]}
        })
        if farmer:
            return farmer
        
        # Check in coop_members collection
        member = await db.coop_members.find_one({
            "phone_number": {"$regex": p[-9:]}
        })
        if member:
            return member
    
    return None


async def get_farmer_parcels(farmer_id: str) -> list:
    """Get farmer's parcels"""
    parcels = await db.parcels.find({
        "$or": [
            {"farmer_id": farmer_id},
            {"member_id": farmer_id},
            {"owner_id": farmer_id}
        ]
    }).to_list(100)
    return parcels


async def get_farmer_payments(farmer_id: str) -> list:
    """Get farmer's payment history"""
    payments = await db.carbon_payments.find({
        "member_id": farmer_id
    }).sort("created_at", -1).limit(10).to_list(10)
    return payments


async def get_farmer_carbon_stats(farmer_id: str) -> dict:
    """Calculate farmer's carbon statistics"""
    parcels = await get_farmer_parcels(farmer_id)
    
    total_area = sum(p.get("area_hectares", 0) for p in parcels)
    total_score = sum(p.get("carbon_score", 0) for p in parcels)
    avg_score = total_score / len(parcels) if parcels else 0
    
    # Get audits
    parcel_ids = [str(p["_id"]) for p in parcels]
    audits = await db.carbon_audits.find({
        "parcel_id": {"$in": parcel_ids},
        "recommendation": "approved"
    }).to_list(100)
    
    # Calculate potential premium
    potential_premium = 0
    for audit in audits:
        parcel = next((p for p in parcels if str(p["_id"]) == audit.get("parcel_id")), None)
        if parcel:
            area = parcel.get("area_hectares", 0)
            score = audit.get("carbon_score", 0)
            if score >= 6:
                premium = area * 50000 * (score / 10)
                if score >= 8:
                    premium *= 1.2
                potential_premium += premium
    
    # Get received payments
    payments = await get_farmer_payments(farmer_id)
    total_received = sum(p.get("amount_xof", 0) for p in payments if p.get("status") == "completed")
    
    return {
        "parcels_count": len(parcels),
        "total_area": round(total_area, 2),
        "avg_score": round(avg_score, 1),
        "potential_premium": round(potential_premium),
        "total_received": round(total_received),
        "pending": round(potential_premium - total_received) if potential_premium > total_received else 0
    }


# ============= MAIN MENU =============

def get_main_menu(farmer_name: str, language: str = "fr") -> str:
    """Get main USSD menu"""
    menus = {
        "fr": f"""GreenLink 🌱
Bienvenue {farmer_name}

1. Mes parcelles
2. Mes primes carbone
3. Historique paiements
4. Déclarer récolte
5. Score carbone
6. Aide

Tapez le numéro:""",
        "baoule": f"""GreenLink 🌱
{farmer_name}, akwaba!

1. N'afie su (Parcelles)
2. Carbone prime
3. Sika historia
4. Recolte kléré
5. Carbone score
6. Ukwlé

Kléré nimro:""",
        "dioula": f"""GreenLink 🌱
{farmer_name}, i ni sogoma!

1. N ka foroba (Parcelles)
2. Carbone prime
3. Wari segin
4. Suman san
5. Carbone score
6. Dèmè

Nimoro kura:"""
    }
    return menus.get(language, menus["fr"])


# ============= USSD ENDPOINT =============

@router.post("/callback")
async def ussd_callback(request: USSDRequest):
    """
    Main USSD callback endpoint
    
    This is the entry point for all USSD requests.
    Compatible with Africa's Talking, Orange API, and other gateways.
    """
    try:
        session_id = request.sessionId
        phone = request.phoneNumber
        text_input = request.text
        
        logger.info(f"USSD Request: session={session_id}, phone={phone}, input={text_input}")
        
        # Parse input path (e.g., "1*2*3" = menu 1, then 2, then 3)
        inputs = text_input.split("*") if text_input else []
        
        # Find farmer
        farmer = await get_farmer_by_phone(phone)
        farmer_name = farmer.get("full_name", "Cher agriculteur") if farmer else "Utilisateur"
        farmer_id = str(farmer.get("_id", "")) if farmer else None
        
        # Get session
        session = get_session_data(session_id)
        
        # Initialize response
        response_text = ""
        continue_session = True
        
        # Handle menu navigation
        if len(inputs) == 0:
            # Main menu
            response_text = get_main_menu(farmer_name)
        
        elif len(inputs) == 1:
            choice = inputs[0]
            
            if choice == "1":
                # My parcels
                if farmer_id:
                    parcels = await get_farmer_parcels(farmer_id)
                    if parcels:
                        lines = ["📍 MES PARCELLES\n"]
                        for i, p in enumerate(parcels[:5], 1):
                            lines.append(f"{i}. {p.get('location', 'Parcelle')}")
                            lines.append(f"   {p.get('area_hectares', 0)} ha | Score: {p.get('carbon_score', 0)}/10")
                        lines.append(f"\nTotal: {len(parcels)} parcelle(s)")
                        lines.append("\n0. Retour")
                        response_text = "\n".join(lines)
                    else:
                        response_text = "Aucune parcelle enregistrée.\n\nContactez votre coopérative.\n\n0. Retour"
                else:
                    response_text = "Numéro non reconnu.\n\nContactez le 07 87 76 10 23\n\n0. Retour"
            
            elif choice == "2":
                # Carbon premiums
                if farmer_id:
                    stats = await get_farmer_carbon_stats(farmer_id)
                    response_text = f"""💰 VOS PRIMES CARBONE

Score moyen: {stats['avg_score']}/10
Parcelles: {stats['parcels_count']}
Surface: {stats['total_area']} ha

Prime disponible:
{format_xof(stats['pending'])}

Déjà reçu:
{format_xof(stats['total_received'])}

1. Demander paiement
0. Retour"""
                else:
                    response_text = "Numéro non reconnu.\n\n0. Retour"
            
            elif choice == "3":
                # Payment history
                if farmer_id:
                    payments = await get_farmer_payments(farmer_id)
                    if payments:
                        lines = ["📋 HISTORIQUE PAIEMENTS\n"]
                        for p in payments[:5]:
                            date = p.get("created_at", datetime.utcnow())
                            if isinstance(date, datetime):
                                date_str = date.strftime("%d/%m/%Y")
                            else:
                                date_str = "N/A"
                            lines.append(f"• {date_str}")
                            lines.append(f"  {format_xof(p.get('amount_xof', 0))}")
                            lines.append(f"  Ref: {p.get('payment_ref', 'N/A')[:12]}")
                        lines.append("\n0. Retour")
                        response_text = "\n".join(lines)
                    else:
                        response_text = "Aucun paiement reçu.\n\nVos primes seront versées après audit.\n\n0. Retour"
                else:
                    response_text = "Numéro non reconnu.\n\n0. Retour"
            
            elif choice == "4":
                # Declare harvest
                response_text = """🌾 DÉCLARER RÉCOLTE

Envoyez SMS au 1234:
RECOLTE [quantité_kg]

Exemple:
RECOLTE 250

Votre coopérative sera notifiée.

0. Retour"""
            
            elif choice == "5":
                # Carbon score details
                if farmer_id:
                    stats = await get_farmer_carbon_stats(farmer_id)
                    score = stats['avg_score']
                    if score >= 8:
                        status = "⭐ EXCELLENT"
                        bonus = "+20% prime"
                    elif score >= 6:
                        status = "✓ BON"
                        bonus = "Prime active"
                    else:
                        status = "⚠ À AMÉLIORER"
                        bonus = "Non éligible"
                    
                    response_text = f"""📊 SCORE CARBONE

Votre score: {score}/10
Statut: {status}
{bonus}

Améliorez votre score:
• Agroforesterie (+1.5)
• Compostage (+1.0)
• Zéro pesticides (+1.0)
• Certification (+1.5)

0. Retour"""
                else:
                    response_text = "Numéro non reconnu.\n\n0. Retour"
            
            elif choice == "6":
                # Help
                response_text = """❓ AIDE GREENLINK

📞 Support: 07 87 76 10 23
📞 Canada: +1 514 475-7340

SMS gratuit au 1234:
• AIDE [question]
• SOLDE
• PARCELLE

1. Changer de langue
2. Contacter support
0. Retour"""
            
            elif choice == "0":
                # Back to main menu
                response_text = get_main_menu(farmer_name)
            
            else:
                response_text = "Option invalide.\n\n" + get_main_menu(farmer_name)
        
        elif len(inputs) == 2:
            first, second = inputs[0], inputs[1]
            
            if first == "2" and second == "1":
                # Request carbon premium payment via Super Admin flow
                if farmer_id:
                    from routes.carbon_premiums import create_ussd_payment_request
                    result = await create_ussd_payment_request(phone)
                    if result.get("success"):
                        response_text = f"""DEMANDE ENREGISTREE

Montant planteur: {format_xof(result['farmer_amount'])}
Commission coop (10%): {format_xof(result['coop_commission'])}

Votre demande est envoyee
au Super Admin pour validation.

Vous recevrez une notification
une fois le paiement effectue.

Ref: {result.get('request_id', '')[:8]}"""
                        continue_session = False
                    else:
                        response_text = f"{result.get('message', 'Erreur')}\n\n0. Retour"
                else:
                    response_text = "Numero non reconnu.\n\n0. Retour"
            
            elif first == "6" and second == "1":
                # Change language
                response_text = """🌍 CHOISIR LANGUE

1. Français
2. Baoulé
3. Dioula

0. Retour"""
            
            elif first == "6" and second == "2":
                # Contact support
                response_text = """📞 CONTACTER SUPPORT

Un conseiller vous
rappellera sous 1h.

📱 Votre numéro:
""" + phone + """

Confirmé!"""
                continue_session = False
            
            elif second == "0":
                # Return to first level
                if first == "1":
                    response_text = get_main_menu(farmer_name)
                elif first == "2":
                    response_text = get_main_menu(farmer_name)
                else:
                    response_text = get_main_menu(farmer_name)
            
            else:
                response_text = "Option invalide.\n\n0. Retour"
        
        else:
            # Deep navigation - return to main
            response_text = get_main_menu(farmer_name)
        
        # Build USSD response
        prefix = "CON " if continue_session else "END "
        
        logger.info(f"USSD Response: {response_text[:50]}...")
        
        return {
            "session_id": session_id,
            "text": prefix + response_text,
            "continue_session": continue_session,
            "raw_response": response_text
        }
    
    except Exception as e:
        logger.error(f"USSD Error: {str(e)}")
        return {
            "session_id": request.sessionId,
            "text": "END Erreur système. Réessayez plus tard.",
            "continue_session": False,
            "error": str(e)
        }


# ============= SMS GATEWAY =============

class SMSRequest(BaseModel):
    from_number: str  # Sender phone
    to_number: str    # Service number (1234)
    message: str      # SMS content
    message_id: Optional[str] = None


@router.post("/sms/incoming")
async def handle_incoming_sms(request: SMSRequest):
    """
    Handle incoming SMS messages from farmers
    
    Commands:
    - SOLDE: Check balance
    - PARCELLE [size] [location]: Declare parcel
    - RECOLTE [qty]: Declare harvest
    - PRIME: Check carbon premium
    - AIDE: Get help
    """
    try:
        phone = request.from_number
        message = request.message.upper().strip()
        
        logger.info(f"SMS received from {phone}: {message}")
        
        # Find farmer
        farmer = await get_farmer_by_phone(phone)
        farmer_name = farmer.get("full_name", "Utilisateur") if farmer else "Utilisateur"
        farmer_id = str(farmer.get("_id", "")) if farmer else None
        
        response = ""
        
        if message.startswith("SOLDE"):
            if farmer_id:
                stats = await get_farmer_carbon_stats(farmer_id)
                response = f"""GreenLink - SOLDE
{farmer_name}

Prime disponible: {format_xof(stats['pending'])}
Déjà reçu: {format_xof(stats['total_received'])}
Score: {stats['avg_score']}/10
Parcelles: {stats['parcels_count']}

Composez *123*45# pour plus"""
            else:
                response = "GreenLink: Numéro non reconnu. Contactez votre coopérative."
        
        elif message.startswith("PRIME"):
            if farmer_id:
                stats = await get_farmer_carbon_stats(farmer_id)
                response = f"""GreenLink - PRIME CARBONE
{farmer_name}

Score moyen: {stats['avg_score']}/10
Surface: {stats['total_area']} ha

Prime disponible:
{format_xof(stats['pending'])}

Contactez votre coopérative pour le paiement."""
            else:
                response = "GreenLink: Numéro non reconnu."
        
        elif message.startswith("PARCELLE"):
            parts = message.split()
            if len(parts) >= 3:
                try:
                    size = float(parts[1].replace(",", "."))
                    location = " ".join(parts[2:])
                    
                    # Store parcel declaration request
                    await db.sms_parcel_requests.insert_one({
                        "phone": phone,
                        "farmer_id": farmer_id,
                        "size_hectares": size,
                        "location": location,
                        "status": "pending",
                        "created_at": datetime.utcnow()
                    })
                    
                    response = f"""GreenLink: Déclaration reçue!

Parcelle: {size} ha
Lieu: {location}

Un agent vous contactera sous 48h pour vérification.

Merci de votre confiance!"""
                except:
                    response = "GreenLink: Format incorrect.\nExemple: PARCELLE 3.5 Bouaflé"
            else:
                response = "GreenLink: Format: PARCELLE [taille_ha] [lieu]\nExemple: PARCELLE 3.5 Bouaflé"
        
        elif message.startswith("RECOLTE"):
            parts = message.split()
            if len(parts) >= 2:
                try:
                    quantity = float(parts[1].replace(",", "."))
                    
                    # Store harvest declaration
                    await db.sms_harvest_requests.insert_one({
                        "phone": phone,
                        "farmer_id": farmer_id,
                        "quantity_kg": quantity,
                        "status": "pending",
                        "created_at": datetime.utcnow()
                    })
                    
                    response = f"""GreenLink: Récolte enregistrée!

Quantité: {quantity} kg

Votre coopérative est notifiée.
Attendez la collecte.

Merci!"""
                except:
                    response = "GreenLink: Format incorrect.\nExemple: RECOLTE 250"
            else:
                response = "GreenLink: Format: RECOLTE [quantité_kg]\nExemple: RECOLTE 250"
        
        elif message.startswith("AIDE"):
            response = """GreenLink - AIDE

Commandes SMS (envoyez au 1234):
• SOLDE - Voir votre solde
• PRIME - Voir prime carbone
• PARCELLE [ha] [lieu] - Déclarer parcelle
• RECOLTE [kg] - Déclarer récolte

Composez *123*45# pour le menu USSD

Support: 07 87 76 10 23"""
        
        else:
            response = """GreenLink: Commande non reconnue.

Envoyez:
SOLDE, PRIME, PARCELLE, RECOLTE ou AIDE

Ou composez *123*45#"""
        
        # Store SMS log
        await db.sms_logs.insert_one({
            "direction": "incoming",
            "from_number": phone,
            "message": request.message,
            "response": response,
            "created_at": datetime.utcnow()
        })
        
        return {
            "status": "success",
            "to": phone,
            "message": response
        }
    
    except Exception as e:
        logger.error(f"SMS Error: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }


# ============= ADMIN ENDPOINTS =============

@router.get("/stats")
async def get_ussd_stats():
    """Get USSD/SMS usage statistics"""
    try:
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)
        
        # SMS stats
        sms_today = await db.sms_logs.count_documents({
            "created_at": {"$gte": today}
        })
        sms_week = await db.sms_logs.count_documents({
            "created_at": {"$gte": week_ago}
        })
        
        # Parcel requests
        parcel_requests = await db.sms_parcel_requests.count_documents({
            "status": "pending"
        })
        
        # Harvest requests
        harvest_requests = await db.sms_harvest_requests.count_documents({
            "status": "pending"
        })
        
        return {
            "sms": {
                "today": sms_today,
                "week": sms_week
            },
            "pending_requests": {
                "parcels": parcel_requests,
                "harvests": harvest_requests
            },
            "active_sessions": len(ussd_sessions)
        }
    
    except Exception as e:
        logger.error(f"Stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test")
async def test_ussd(phone: str = Query(..., description="Phone number to test")):
    """Test USSD simulation for development"""
    # Simulate USSD request
    test_request = USSDRequest(
        sessionId=f"test_{datetime.utcnow().timestamp()}",
        serviceCode="*123*45#",
        phoneNumber=phone,
        text=""
    )
    
    return await ussd_callback(test_request)



# ============= USSD PRIME CARBONE *144*88# =============

CARBON_QUESTIONS = [
    {"key": "hectares", "text": "PRIME CARBONE *144*88#\n\nQuestion 1/9\nSurface de votre plantation (en hectares) ?\n\nEx: 3.5", "type": "number"},
    {"key": "arbres_grands", "text": "Question 2/9\nCombien d'arbres GRANDS (> 12 metres) sur votre parcelle ?\n\nEx: 20", "type": "number"},
    {"key": "arbres_moyens", "text": "Question 3/9\nCombien d'arbres MOYENS (8-12 metres) ?\n\nEx: 30", "type": "number"},
    {"key": "culture", "text": "Question 4/9\nQuelle est votre culture principale ?\n\n1. Cacao\n2. Cafe\n3. Anacarde\n\nTapez 1, 2 ou 3:", "type": "choice"},
    {"key": "engrais_chimique", "text": "Question 5/9\nUtilisez-vous des engrais chimiques ?\n\n1. Oui\n2. Non\n\nTapez 1 ou 2:", "type": "yesno"},
    {"key": "brulage", "text": "Question 6/9\nFaites-vous le brulage sur vos parcelles ?\n\n1. Oui\n2. Non\n\nTapez 1 ou 2:", "type": "yesno"},
    {"key": "compost", "text": "Question 7/9\nUtilisez-vous du compost organique ?\n\n1. Oui\n2. Non\n\nTapez 1 ou 2:", "type": "yesno"},
    {"key": "agroforesterie", "text": "Question 8/9\nPratiquez-vous l'agroforesterie (arbres fruitiers, ombrage) ?\n\n1. Oui\n2. Non\n\nTapez 1 ou 2:", "type": "yesno"},
    {"key": "couverture_sol", "text": "Question 9/9\nAvez-vous une couverture vegetale au sol (herbes, paillage) ?\n\n1. Oui\n2. Non\n\nTapez 1 ou 2:", "type": "yesno"},
]


def parse_carbon_answer(question, raw_input):
    """Parse and validate a single USSD answer. Returns (value, valid)."""
    if question["type"] == "number":
        try:
            val = float(raw_input.replace(",", "."))
            return val if val > 0 else None, val > 0
        except (ValueError, AttributeError):
            return None, False
    elif question["type"] == "choice":
        mapping = {"1": "cacao", "2": "cafe", "3": "anacarde"}
        return mapping.get(raw_input), raw_input in mapping
    elif question["type"] == "yesno":
        mapping = {"1": "oui", "2": "non"}
        return mapping.get(raw_input), raw_input in mapping
    return None, False


def calculate_ussd_carbon_premium(answers: dict, avg_rse_price: float = 18000) -> dict:
    """
    Calculate carbon premium from USSD answers.
    
    Formula linked to the actual RSE distribution model:
    1. RSE sale price per tonne CO2
    2. Deduct 30% costs -> net amount (70%)
    3. Farmer gets UP TO 70% of net, based on their practice score
    4. CO2 sequestration per hectare depends on score (2-8 t/ha)
    5. Prime per kg = (farmer_share_per_tonne * CO2_per_ha) / yield_per_ha
    """
    hectares = float(answers.get("hectares", 1))
    arbres_grands = int(answers.get("arbres_grands", 0))
    arbres_moyens = int(answers.get("arbres_moyens", 0))
    
    # Weighted tree count using biomass coefficients
    # Grands > 12m: x1.0, Moyens 8-12m: x0.7
    weighted_trees = (arbres_grands * 1.0) + (arbres_moyens * 0.7)
    arbres_par_ha = weighted_trees / max(hectares, 0.1)

    # === Calculate practice score (0-10) ===
    score = 4.0
    if arbres_par_ha >= 80: score += 2.0
    elif arbres_par_ha >= 50: score += 1.5
    elif arbres_par_ha >= 20: score += 1.0
    elif arbres_par_ha >= 5: score += 0.5

    if answers.get("engrais_chimique") == "oui": score -= 0.5
    else: score += 0.5

    if answers.get("brulage") == "oui": score -= 1.5
    else: score += 0.5

    if answers.get("compost") == "oui": score += 1.0
    if answers.get("agroforesterie") == "oui": score += 1.0
    if answers.get("couverture_sol") == "oui": score += 0.5

    score = max(0, min(10, score))
    score_ratio = score / 10.0

    # === Distribution model (30% costs, 70% net) ===
    FEES_RATE = 0.30
    FARMER_MAX_SHARE = 0.70  # 70% du net

    prix_rse_tonne = avg_rse_price
    net_per_tonne = prix_rse_tonne * (1 - FEES_RATE)
    max_farmer_per_tonne = net_per_tonne * FARMER_MAX_SHARE
    actual_farmer_per_tonne = max_farmer_per_tonne * score_ratio

    # === CO2 sequestration depends on practices ===
    # Low score (0) -> 2 t CO2/ha, High score (10) -> 8 t CO2/ha
    co2_per_ha = 2 + score_ratio * 6

    # === Revenue per hectare for farmer ===
    farmer_revenue_per_ha = actual_farmer_per_tonne * co2_per_ha

    # === Prime per kg of production ===
    culture = answers.get("culture", "cacao")
    rendement_kg_ha = {"cacao": 700, "cafe": 500, "anacarde": 400}.get(culture, 600)
    prime_fcfa_kg = farmer_revenue_per_ha / max(rendement_kg_ha, 1)

    # === Annual premium ===
    prime_annuelle = farmer_revenue_per_ha * hectares

    # Public result (visible by farmer) - hide distribution details
    public_result = {
        "score": round(score, 1),
        "prime_fcfa_kg": round(prime_fcfa_kg),
        "arbres_par_ha": round(arbres_par_ha),
        "arbres_grands": arbres_grands,
        "arbres_moyens": arbres_moyens,
        "prime_annuelle": round(prime_annuelle),
        "eligible": score >= 5.0,
        "hectares": hectares,
        "culture": culture,
        "rendement_kg_ha": rendement_kg_ha,
        "co2_par_ha": round(co2_per_ha, 1),
    }

    return public_result


@router.post("/carbon-calculator")
async def ussd_carbon_calculator(request: USSDRequest):
    """
    Stateless USSD Carbon Calculator - *144*88#
    Parses all answers from accumulated text (standard USSD protocol).
    """
    try:
        text_input = request.text.strip()
        inputs = text_input.split("*") if text_input else []
        num_answers = len(inputs)
        
        # First call: no answers yet → show Q1
        if num_answers == 0:
            return {
                "session_id": request.sessionId,
                "text": "CON " + CARBON_QUESTIONS[0]["text"],
                "continue_session": True,
                "raw_response": CARBON_QUESTIONS[0]["text"],
                "step": 1,
                "total_steps": 8,
            }
        
        # Validate ALL answers received so far
        answers = {}
        for i, raw in enumerate(inputs):
            if i >= len(CARBON_QUESTIONS):
                break
            q = CARBON_QUESTIONS[i]
            value, valid = parse_carbon_answer(q, raw.strip())
            if not valid:
                # Invalid answer at position i → re-ask that question
                error_text = f"Reponse invalide.\n\n{q['text']}"
                return {
                    "session_id": request.sessionId,
                    "text": "CON " + error_text,
                    "continue_session": True,
                    "raw_response": error_text,
                    "step": i + 1,
                    "total_steps": 8,
                }
            answers[q["key"]] = value
        
        # If we haven't answered all 8 questions yet → show next question
        if num_answers < len(CARBON_QUESTIONS):
            next_q = CARBON_QUESTIONS[num_answers]
            return {
                "session_id": request.sessionId,
                "text": "CON " + next_q["text"],
                "continue_session": True,
                "raw_response": next_q["text"],
                "step": num_answers + 1,
                "total_steps": 8,
            }
        
        # All 8 answers received → calculate result
        # Fetch average RSE price from approved listings
        avg_price = 18000  # default
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
        cultures_label = {"cacao": "Cacao", "cafe": "Cafe", "anacarde": "Anacarde"}
        culture_name = cultures_label.get(result["culture"], "Culture")
        
        if result["eligible"]:
            result_text = (
                f"VOTRE PRIME CARBONE\n\n"
                f"Score: {result['score']}/10\n"
                f"Arbres/ha: {result['arbres_par_ha']}\n"
                f"CO2 sequestre: {result['co2_par_ha']}t/ha\n\n"
                f"PRIME ESTIMEE:\n"
                f"{result['prime_fcfa_kg']} FCFA/kg\n\n"
                f"Pour {result['hectares']} ha de {culture_name}\n"
                f"({result['rendement_kg_ha']} kg/ha)\n\n"
                f"Prime annuelle estimee:\n"
                f"{result['prime_annuelle']:,.0f} FCFA\n\n"
                f"Inscrivez-vous sur GreenLink\n"
                f"ou contactez votre cooperative!\n"
                f"Tel: 07 87 76 10 23"
            )
        else:
            result_text = (
                f"VOTRE ESTIMATION\n\n"
                f"Score: {result['score']}/10\n"
                f"(Minimum requis: 5/10)\n\n"
                f"Prime actuelle: {result['prime_fcfa_kg']} FCFA/kg\n\n"
                f"Pour ameliorer votre score:\n"
                f"- Plantez plus d'arbres d'ombrage\n"
                f"- Arretez le brulage\n"
                f"- Utilisez du compost\n"
                f"- Pratiquez l'agroforesterie\n\n"
                f"Contactez-nous:\n"
                f"Tel: 07 87 76 10 23"
            )
        
        return {
            "session_id": request.sessionId,
            "text": "END " + result_text,
            "continue_session": False,
            "raw_response": result_text,
            "step": 9,
            "total_steps": 8,
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



@router.post("/calculate-premium")
async def calculate_premium_public(data: dict):
    """
    Public carbon premium calculator for the homepage.
    Returns only score, prime/kg, annual premium - no distribution details.
    """
    try:
        hectares = float(data.get("hectares", 1))
        trees = int(data.get("trees", 0))
        culture = data.get("culture", "cacao")
        practices = data.get("practices", [])

        # Build answers dict compatible with USSD calculator
        answers = {
            "hectares": hectares,
            "arbres_grands": trees,
            "culture": culture,
            "engrais_chimique": "non" if "zero_pesticides" in practices else "oui",
            "brulage": "non",
            "compost": "oui" if "compost" in practices else "non",
            "agroforesterie": "oui" if "agroforesterie" in practices else "non",
            "couverture_sol": "oui" if ("couverture_vegetale" in practices or "rotation_cultures" in practices) else "non",
        }

        # Fetch avg RSE price
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

        # Return only public-facing data (no distribution details)
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
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
