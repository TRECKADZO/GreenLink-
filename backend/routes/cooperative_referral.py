"""
Système de Réseau de Coopératives Affiliées - GreenLink Agritech

Ce module gère le parrainage entre coopératives :
- Génération automatique de codes de parrainage uniques
- Validation des codes lors de l'inscription
- Suivi des affiliations entre coopératives
- Dashboard des parrainages

Le service est entièrement gratuit - aucune récompense matérielle n'est liée au parrainage.
"""

import random
import string
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase
from routes.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cooperative-referral", tags=["Cooperative Referral"])

# Database reference - will be set from server.py
db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database

# ============================================
# MODÈLES
# ============================================

class ReferralCodeResponse(BaseModel):
    referral_code: str
    coop_name: str
    message: str = "Le service est entièrement gratuit pour votre coopérative. Vous pouvez parrainer d'autres coopératives en leur partageant votre code. Cela nous aide à faire grandir ensemble le réseau des coopératives engagées dans les pratiques durables."

class ValidateReferralRequest(BaseModel):
    referral_code: str = Field(..., description="Code de parrainage à valider")

class ValidateReferralResponse(BaseModel):
    valid: bool
    sponsor_name: Optional[str] = None
    sponsor_region: Optional[str] = None
    message: str

class AffiliatedCooperative(BaseModel):
    id: str
    coop_name: str
    region: Optional[str] = None
    affiliated_at: datetime
    members_count: int = 0

class ReferralStatsResponse(BaseModel):
    referral_code: str
    total_affiliates: int
    affiliates: List[AffiliatedCooperative]
    message: str = "Le service est entièrement gratuit pour votre coopérative. Vous pouvez parrainer d'autres coopératives en leur partageant votre code. Cela nous aide à faire grandir ensemble le réseau des coopératives engagées dans les pratiques durables."

# ============================================
# FONCTIONS UTILITAIRES
# ============================================

def generate_referral_code(region: str = "", coop_name: str = "") -> str:
    """
    Génère un code de parrainage unique au format GL-COOP-XXX-0000
    
    Format: GL-COOP-{REGION_CODE}-{RANDOM_4_DIGITS}
    Exemples:
    - GL-COOP-ABJ-7842 (Abidjan)
    - GL-COOP-SAN-3291 (San Pedro)
    - GL-COOP-BOU-5617 (Bouaké)
    """
    # Mapping des régions vers codes
    region_codes = {
        "abidjan": "ABJ",
        "san pedro": "SAN",
        "san-pedro": "SAN",
        "bouake": "BOU",
        "bouaké": "BOU",
        "yamoussoukro": "YAM",
        "daloa": "DAL",
        "korhogo": "KOR",
        "man": "MAN",
        "gagnoa": "GAG",
        "soubre": "SOU",
        "soubré": "SOU",
        "divo": "DIV",
        "abengourou": "ABE",
        "agnibilekrou": "AGN",
        "bondoukou": "BON",
        "duekoue": "DUE",
        "duékoué": "DUE",
        "issia": "ISS",
        "lakota": "LAK",
        "meagui": "MEA",
        "méagui": "MEA",
        "oume": "OUM",
        "oumé": "OUM",
        "sassandra": "SAS",
        "tabou": "TAB",
        "tiassale": "TIA",
        "tiassalé": "TIA",
        "agboville": "AGB",
        "adzope": "ADZ",
        "adzopé": "ADZ",
    }
    
    # Extraire le code région
    region_lower = (region or "").lower().strip()
    region_code = region_codes.get(region_lower, "")
    
    if not region_code:
        # Essayer avec les 3 premières lettres
        if region_lower:
            region_code = region_lower[:3].upper()
        else:
            # Utiliser les initiales du nom de la coopérative
            words = (coop_name or "COOP").split()
            region_code = "".join(w[0] for w in words[:3]).upper()
            if len(region_code) < 3:
                region_code = region_code.ljust(3, "X")
    
    # Générer 4 chiffres aléatoires
    random_digits = "".join(random.choices(string.digits, k=4))
    
    return f"GL-COOP-{region_code}-{random_digits}"

async def ensure_referral_code(user_id: str) -> str:
    """
    S'assure qu'une coopérative a un code de parrainage.
    Si elle n'en a pas, en génère un nouveau.
    """
    # Chercher par id ou par _id (pour compatibilité)
    user = await db.users.find_one({"$or": [{"id": user_id}, {"_id": user_id}]})
    if not user:
        # Essayer avec ObjectId si c'est un format valide
        try:
            from bson import ObjectId
            user = await db.users.find_one({"_id": ObjectId(user_id)})
        except:
            pass
    
    if not user:
        raise HTTPException(status_code=404, detail="Coopérative non trouvée")
    
    if user.get("user_type") != "cooperative":
        raise HTTPException(status_code=403, detail="Seules les coopératives peuvent avoir un code de parrainage")
    
    # Vérifier si un code existe déjà
    if user.get("referral_code"):
        return user["referral_code"]
    
    # Générer un nouveau code
    region = user.get("headquarters_region") or user.get("department") or ""
    coop_name = user.get("coop_name") or user.get("full_name") or ""
    
    # S'assurer que le code est unique
    max_attempts = 10
    for _ in range(max_attempts):
        new_code = generate_referral_code(region, coop_name)
        existing = await db.users.find_one({"referral_code": new_code})
        if not existing:
            break
    else:
        # Ajouter un suffixe si nécessaire
        new_code = f"{new_code}-{random.randint(10, 99)}"
    
    # Sauvegarder le code
    user_mongo_id = user.get("_id")
    await db.users.update_one(
        {"_id": user_mongo_id},
        {"$set": {"referral_code": new_code, "referral_code_created_at": datetime.utcnow()}}
    )
    
    logger.info(f"[REFERRAL] Generated new referral code {new_code} for cooperative {user_id}")
    return new_code

# ============================================
# ENDPOINTS
# ============================================

@router.get("/my-code", response_model=ReferralCodeResponse)
async def get_my_referral_code(current_user: dict = Depends(get_current_user)):
    """
    Récupère le code de parrainage de la coopérative connectée.
    Génère automatiquement un code si elle n'en a pas encore.
    """
    if current_user.get("user_type") != "cooperative":
        raise HTTPException(status_code=403, detail="Seules les coopératives peuvent avoir un code de parrainage")
    
    # Utiliser id ou _id
    user_id = current_user.get("id") or str(current_user.get("_id"))
    referral_code = await ensure_referral_code(user_id)
    coop_name = current_user.get("coop_name") or current_user.get("full_name") or "Ma Coopérative"
    
    return ReferralCodeResponse(
        referral_code=referral_code,
        coop_name=coop_name
    )

@router.post("/validate", response_model=ValidateReferralResponse)
async def validate_referral_code(request: ValidateReferralRequest):
    """
    Valide un code de parrainage (utilisé lors de l'inscription).
    Endpoint public - pas besoin d'authentification.
    """
    code = request.referral_code.strip().upper()
    
    if not code:
        return ValidateReferralResponse(
            valid=False,
            message="Veuillez entrer un code de parrainage"
        )
    
    # Rechercher la coopérative avec ce code
    sponsor = await db.users.find_one({
        "referral_code": code,
        "user_type": "cooperative",
        "is_active": True
    })
    
    if not sponsor:
        return ValidateReferralResponse(
            valid=False,
            message="Code de parrainage invalide ou coopérative inactive"
        )
    
    return ValidateReferralResponse(
        valid=True,
        sponsor_name=sponsor.get("coop_name") or sponsor.get("full_name"),
        sponsor_region=sponsor.get("headquarters_region"),
        message=f"Code valide ! Vous serez affilié(e) à {sponsor.get('coop_name') or 'la coopérative parrain'}"
    )

@router.get("/my-affiliates", response_model=ReferralStatsResponse)
async def get_my_affiliates(current_user: dict = Depends(get_current_user)):
    """
    Récupère la liste des coopératives affiliées (parrainées).
    """
    if current_user.get("user_type") != "cooperative":
        raise HTTPException(status_code=403, detail="Seules les coopératives peuvent voir leurs affiliés")
    
    # Utiliser id ou _id
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    # S'assurer que la coopérative a un code
    referral_code = await ensure_referral_code(user_id)
    
    # Récupérer les coopératives affiliées
    affiliates_cursor = db.users.find({
        "sponsor_id": user_id,
        "user_type": "cooperative",
        "is_active": True
    }).sort("affiliated_at", -1)
    
    affiliates = []
    async for affiliate in affiliates_cursor:
        affiliate_id = affiliate.get("id") or str(affiliate.get("_id"))
        # Compter les membres de cette coopérative
        members_count = await db.coop_members.count_documents({
            "cooperative_id": affiliate_id
        })
        
        affiliates.append(AffiliatedCooperative(
            id=affiliate_id,
            coop_name=affiliate.get("coop_name") or affiliate.get("full_name") or "Coopérative",
            region=affiliate.get("headquarters_region"),
            affiliated_at=affiliate.get("affiliated_at") or affiliate.get("created_at") or datetime.utcnow(),
            members_count=members_count
        ))
    
    return ReferralStatsResponse(
        referral_code=referral_code,
        total_affiliates=len(affiliates),
        affiliates=affiliates
    )

@router.get("/my-sponsor")
async def get_my_sponsor(current_user: dict = Depends(get_current_user)):
    """
    Récupère les informations sur la coopérative parrain (si affiliée).
    """
    if current_user.get("user_type") != "cooperative":
        raise HTTPException(status_code=403, detail="Réservé aux coopératives")
    
    sponsor_id = current_user.get("sponsor_id")
    if not sponsor_id:
        return {
            "has_sponsor": False,
            "message": "Votre coopérative n'est pas affiliée à un parrain"
        }
    
    sponsor = await db.users.find_one({"id": sponsor_id, "is_active": True})
    if not sponsor:
        return {
            "has_sponsor": False,
            "message": "Coopérative parrain non trouvée"
        }
    
    return {
        "has_sponsor": True,
        "sponsor_name": sponsor.get("coop_name") or sponsor.get("full_name"),
        "sponsor_region": sponsor.get("headquarters_region"),
        "affiliated_at": current_user.get("affiliated_at"),
        "message": "Vous êtes affilié(e) à cette coopérative parrain"
    }

@router.get("/network-stats")
async def get_network_stats(current_user: dict = Depends(get_current_user)):
    """
    Statistiques globales du réseau de coopératives (pour admin).
    """
    # Total coopératives
    total_coops = await db.users.count_documents({
        "user_type": "cooperative",
        "is_active": True
    })
    
    # Coopératives avec parrain
    affiliated_coops = await db.users.count_documents({
        "user_type": "cooperative",
        "is_active": True,
        "sponsor_id": {"$exists": True, "$ne": None}
    })
    
    # Coopératives qui ont parrainé au moins une autre
    sponsors_pipeline = [
        {"$match": {"user_type": "cooperative", "sponsor_id": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$sponsor_id"}},
        {"$count": "count"}
    ]
    sponsors_result = await db.users.aggregate(sponsors_pipeline).to_list(1)
    active_sponsors = sponsors_result[0]["count"] if sponsors_result else 0
    
    # Top parrains
    top_sponsors_pipeline = [
        {"$match": {"user_type": "cooperative", "sponsor_id": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$sponsor_id", "affiliates_count": {"$sum": 1}}},
        {"$sort": {"affiliates_count": -1}},
        {"$limit": 5}
    ]
    top_sponsors_raw = await db.users.aggregate(top_sponsors_pipeline).to_list(5)
    
    top_sponsors = []
    for ts in top_sponsors_raw:
        sponsor = await db.users.find_one({"id": ts["_id"]})
        if sponsor:
            top_sponsors.append({
                "coop_name": sponsor.get("coop_name") or sponsor.get("full_name"),
                "region": sponsor.get("headquarters_region"),
                "affiliates_count": ts["affiliates_count"]
            })
    
    return {
        "total_cooperatives": total_coops,
        "affiliated_cooperatives": affiliated_coops,
        "active_sponsors": active_sponsors,
        "affiliation_rate": round(affiliated_coops / total_coops * 100, 1) if total_coops > 0 else 0,
        "top_sponsors": top_sponsors,
        "message": "Le réseau de coopératives affiliées GreenLink grandit ensemble pour des pratiques durables."
    }
