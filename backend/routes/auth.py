from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from pymongo import ReturnDocument
import os
from database import db, client
from auth_models import UserCreate, UserLogin, Token, User, UserProfileUpdate
from auth_utils import get_password_hash, verify_password, create_access_token, verify_token
from datetime import datetime
from bson import ObjectId
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()
limiter = Limiter(key_func=get_remote_address)


async def generate_coop_code(department: str = "", coop_name: str = "") -> str:
    """
    Auto-generate a unique cooperative code.
    Format: COOP-{DEPT_CODE}-{SEQUENCE}
    DEPT_CODE = first 3 chars of department or coop_name (uppercase)
    """
    prefix = ""
    if department:
        prefix = department.replace("-", "").replace(" ", "")[:3].upper()
    elif coop_name:
        # Remove common words and take prefix
        clean = coop_name.replace("COOP", "").replace("Coop", "").replace("coop", "").replace("-", "").replace(" ", "")
        prefix = clean[:3].upper() if clean else "GEN"
    
    if not prefix:
        prefix = "GEN"
    
    counter = await db.coop_code_counters.find_one_and_update(
        {"prefix": prefix},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    seq = counter.get("seq", 1)
    
    return f"COOP-{prefix}-{seq:03d}"


def normalize_phone(phone: str) -> list:
    """Retourne toutes les variantes possibles d'un numéro de téléphone CI."""
    import re
    digits = re.sub(r'[^\d]', '', phone)
    # Extraire les 10 derniers chiffres (numéro local CI)
    if len(digits) >= 10:
        local = digits[-10:]
    else:
        local = digits
    return [
        f"+225{local}",
        f"+225 {local}",
        local,
        f"0{local}" if not local.startswith('0') else local,
    ]

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide"
        )
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur non trouvé"
        )
    
    user["_id"] = str(user["_id"])
    return user

@router.post("/register")
async def register(user_data: UserCreate):
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"[REGISTER] Attempting registration for phone: {user_data.phone_number}, email: {user_data.email}")
        
        # Check if user already exists (by phone or email)
        query = []
        if user_data.phone_number:
            query.append({"phone_number": user_data.phone_number})
        if user_data.email:
            query.append({"email": user_data.email})
        
        if query:
            existing_user = await db.users.find_one({"$or": query})
            logger.info(f"[REGISTER] Existing user check result: {existing_user is not None}")
            if existing_user:
                logger.info(f"[REGISTER] Found existing user with phone: {existing_user.get('phone_number')}, email: {existing_user.get('email')}")
                if existing_user.get("phone_number") == user_data.phone_number:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Ce numéro de téléphone est déjà enregistré"
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cet email est déjà enregistré"
                    )
        
        # Create user
        hashed_password = get_password_hash(user_data.password)
        user_dict = user_data.dict(exclude={"password"})
        user_dict["hashed_password"] = hashed_password
        user_dict["created_at"] = datetime.utcnow()
        user_dict["is_active"] = True
    
        # Initialize profile fields based on user_type
        if user_data.user_type == "producteur":
            user_dict["crops"] = []
            user_dict["farm_location"] = None
            user_dict["farm_size"] = None
            # ICI Data fields for producers
            user_dict["ici_profile_complete"] = bool(
                user_data.genre or user_data.date_naissance or 
                user_data.taille_menage or user_data.nombre_enfants
            )
        elif user_data.user_type == "acheteur":
            user_dict["company_name"] = None
            user_dict["purchase_volume"] = None
        elif user_data.user_type == "entreprise_rse":
            user_dict["company_name_rse"] = None
            user_dict["sector"] = None
            user_dict["carbon_goals"] = None
        elif user_data.user_type == "fournisseur":
            user_dict["supplier_company"] = None
            user_dict["products_offered"] = []
        elif user_data.user_type == "cooperative":
            coop_name = getattr(user_data, 'coop_name', None) or user_data.full_name
            dept = getattr(user_data, 'department', '') or getattr(user_data, 'headquarters_region', '') or ''
            coop_code = await generate_coop_code(dept, coop_name)
            user_dict["coop_name"] = coop_name
            user_dict["coop_code"] = coop_code
            user_dict["registration_number"] = getattr(user_data, 'registration_number', None)
            user_dict["certifications"] = getattr(user_data, 'certifications', [])
            user_dict["headquarters_address"] = getattr(user_data, 'headquarters_address', None)
            user_dict["headquarters_region"] = getattr(user_data, 'headquarters_region', None) or dept
            user_dict["commission_rate"] = getattr(user_data, 'commission_rate', 0.10)
            user_dict["orange_money_business"] = getattr(user_data, 'orange_money_business', None)
            
            # Générer automatiquement le code de parrainage unique
            import random, string
            region_code = dept[:3].upper() if dept else coop_name[:3].upper() if coop_name else "COO"
            random_digits = "".join(random.choices(string.digits, k=4))
            referral_code = f"GL-COOP-{region_code}-{random_digits}"
            # S'assurer de l'unicité
            while await db.users.find_one({"referral_code": referral_code}):
                random_digits = "".join(random.choices(string.digits, k=4))
                referral_code = f"GL-COOP-{region_code}-{random_digits}"
            user_dict["referral_code"] = referral_code
            user_dict["referral_code_created_at"] = datetime.utcnow()
            
            # Gérer le parrainage si un code est fourni
            sponsor_code = getattr(user_data, 'sponsor_referral_code', None)
            if sponsor_code:
                sponsor_code = sponsor_code.strip().upper()
                sponsor = await db.users.find_one({
                    "referral_code": sponsor_code,
                    "user_type": "cooperative",
                    "is_active": True
                })
                if sponsor:
                    user_dict["sponsor_id"] = sponsor["id"]
                    user_dict["sponsor_referral_code"] = sponsor_code
                    user_dict["affiliated_at"] = datetime.utcnow()
                    logger.info(f"[REGISTER] Cooperative {coop_name} affiliated to sponsor {sponsor.get('coop_name')} via code {sponsor_code}")
        elif user_data.user_type == "field_agent":
            user_dict["zone"] = getattr(user_data, 'zone', None)
            user_dict["village_coverage"] = []
            user_dict["roles"] = ["field_agent"]
        
        result = await db.users.insert_one(user_dict)
        user_dict["_id"] = str(result.inserted_id)
        
        # Link new user to existing coop_member by phone number
        if user_data.phone_number:
            phone_variants = normalize_phone(user_data.phone_number)
            linked_members = await db.coop_members.find(
                {"phone_number": {"$in": phone_variants}}, {"_id": 1}
            ).to_list(10)
            for member in linked_members:
                member_id_str = str(member["_id"])
                # Update coop_member with user_id
                await db.coop_members.update_one(
                    {"_id": member["_id"]},
                    {"$set": {"user_id": str(result.inserted_id)}}
                )
                # Update parcels farmer_id where it was set to member_id
                await db.parcels.update_many(
                    {"$or": [
                        {"member_id": member_id_str, "farmer_id": member_id_str},
                        {"member_id": member_id_str, "farmer_id": None}
                    ]},
                    {"$set": {"farmer_id": str(result.inserted_id)}}
                )
                logger.info(f"[REGISTER] Linked user {result.inserted_id} to coop_member {member_id_str} and updated parcels")
        
        # Create ICI profile automatically for producers with ICI data
        if user_data.user_type == "producteur" and user_dict.get("ici_profile_complete"):
            from routes.ici_data_collection import get_zone_risk_category
            
            zone_risk = get_zone_risk_category(user_data.department or "")
            
            ici_profile = {
                "farmer_id": str(result.inserted_id),
                "date_naissance": user_data.date_naissance,
                "genre": user_data.genre,
                "niveau_education": user_data.niveau_education,
                "taille_menage": user_data.taille_menage,
                "household_children": {
                    "total_enfants": user_data.nombre_enfants or 0
                } if user_data.nombre_enfants else None,
                "zone_risque": zone_risk,
                "updated_at": datetime.utcnow(),
                "created_at": datetime.utcnow()
            }
            
            await db.ici_profiles.insert_one(ici_profile)
            logger.info(f"Created ICI profile for producer {result.inserted_id}")
        
        # Create subscription based on user type
        from subscription_models import create_subscription_for_user
        subscription = create_subscription_for_user(str(result.inserted_id), user_data.user_type)
        await db.subscriptions.insert_one(subscription)
        logger.info(f"Created subscription for new user {result.inserted_id}: plan={subscription['plan']}, is_trial={subscription['is_trial']}")
        
        # Create access token
        access_token = create_access_token(data={"sub": str(result.inserted_id)})
        
        # Remove hashed_password from response
        user_dict.pop("hashed_password", None)
        
        # Add subscription info to response
        user_dict["subscription"] = {
            "plan": subscription["plan"],
            "status": subscription["status"],
            "is_trial": subscription["is_trial"],
            "trial_end": subscription.get("trial_end").isoformat() if subscription.get("trial_end") else None,
        }
        
        logger.info(f"[REGISTER] Success for {user_data.email or user_data.phone_number}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_dict
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[REGISTER] Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur interne du serveur: {str(e)}"
        )

@router.post("/login", response_model=Token)
@limiter.limit("30/minute")
async def login(request: Request, credentials: UserLogin):
    logger.info(f"Login attempt for: {credentials.identifier}")
    
    # Find user by phone number or email
    phone_variants = normalize_phone(credentials.identifier) if not "@" in credentials.identifier else []
    
    search_conditions = [{"email": credentials.identifier}]
    if phone_variants:
        search_conditions.append({"phone_number": {"$in": phone_variants}})
    else:
        search_conditions.append({"phone_number": credentials.identifier})
    
    user = await db.users.find_one({"$or": search_conditions})
    
    if not user:
        logger.warning(f"User not found: {credentials.identifier}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant ou mot de passe incorrect"
        )
    
    user_id = str(user["_id"])
    logger.info(f"User found: {user.get('email')}, has hashed_password: {'hashed_password' in user}")
    
    # Verify password with robust handling
    stored_password = user.get("hashed_password", "")
    password_valid = False
    
    if stored_password:
        try:
            password_valid = verify_password(credentials.password, stored_password)
        except Exception as e:
            logger.error(f"Password verification exception for {credentials.identifier}: {e}")
            password_valid = False
    
    # If password verification fails using standard hash, try legacy migration
    if not password_valid:
        # Check for plaintext password field (legacy migration)
        legacy_password = user.get("password")
        if legacy_password and credentials.password == legacy_password:
            # Migrate: hash the password and remove the legacy field
            logger.warning(f"[MIGRATION] Migrating legacy plaintext password for {credentials.identifier}")
            new_hash = get_password_hash(credentials.password)
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"hashed_password": new_hash}, "$unset": {"password": ""}}
            )
            password_valid = True
            logger.info(f"[MIGRATION] Password hash migrated for {credentials.identifier}")
    
    if not password_valid:
        logger.warning(f"Password verification failed for: {credentials.identifier}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant ou mot de passe incorrect"
        )
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    
    # Update last login timestamp
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    user["_id"] = user_id
    user.pop("hashed_password", None)
    
    # Sérialiser tous les ObjectId pour éviter les erreurs JSON
    from bson import ObjectId as BsonObjectId
    for key, val in list(user.items()):
        if isinstance(val, BsonObjectId):
            user[key] = str(val)
    
    logger.info(f"Login successful for: {credentials.identifier}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me")
async def get_profile(current_user: dict = Depends(get_current_user)):
    current_user.pop("hashed_password", None)
    from bson import ObjectId as BsonObjectId
    for key, val in list(current_user.items()):
        if isinstance(val, BsonObjectId):
            current_user[key] = str(val)
    return current_user

@router.put("/profile", response_model=User)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Only update fields that are provided
    update_data = {k: v for k, v in profile_data.dict(exclude_unset=True).items() if v is not None}
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucune donnée à mettre à jour"
        )
    
    result = await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )
    
    # Get updated user
    updated_user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    updated_user["_id"] = str(updated_user["_id"])
    updated_user.pop("hashed_password", None)
    from bson import ObjectId as BsonObjectId
    for key, val in list(updated_user.items()):
        if isinstance(val, BsonObjectId):
            updated_user[key] = str(val)
    
    return updated_user

@router.delete("/account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """
    Delete user account and all associated data.
    This action is irreversible.
    """
    user_id = current_user["_id"]
    
    # Delete user's related data
    try:
        # Delete user's orders
        await db.orders.delete_many({"buyer_id": user_id})
        await db.orders.delete_many({"supplier_id": user_id})
        
        # Delete user's products (if supplier)
        await db.products.delete_many({"supplier_id": user_id})
        
        # Delete user's cart
        await db.carts.delete_many({"user_id": user_id})
        
        # Delete user's wishlist
        await db.wishlists.delete_many({"user_id": user_id})
        
        # Delete user's reviews
        await db.product_reviews.delete_many({"user_id": user_id})
        
        # Delete user's parcels (if farmer)
        await db.parcels.delete_many({"farmer_id": user_id})
        
        # Delete user's harvests (if farmer)
        await db.harvests.delete_many({"farmer_id": user_id})
        
        # Delete user's notifications
        await db.notifications.delete_many({"user_id": user_id})
        
        # Delete user's payments
        await db.payments.delete_many({"user_id": user_id})
        
        # Finally, delete the user account
        result = await db.users.delete_one({"_id": ObjectId(user_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
            )
        
        return {"message": "Compte supprimé avec succès", "deleted": True}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression: {str(e)}"
        )


# ============= PASSWORD RESET =============

import secrets
import logging

logger = logging.getLogger(__name__)

class PasswordResetRequest(BaseModel):
    identifier: str  # Email or phone

class PasswordResetVerify(BaseModel):
    identifier: str
    code: str
    new_password: str

@router.post("/forgot-password")
@limiter.limit("3/minute")
async def request_password_reset(request: Request, data: PasswordResetRequest):
    """Request a password reset code"""
    # Find user by email or phone (with phone normalization)
    search_conditions = [{"email": data.identifier}]
    
    if "@" not in data.identifier:
        phone_variants = normalize_phone(data.identifier)
        search_conditions.append({"phone_number": {"$in": phone_variants}})
    else:
        search_conditions.append({"phone_number": data.identifier})
    
    user = await db.users.find_one({"$or": search_conditions})
    
    if not user:
        # For security, don't reveal if user exists
        return {
            "message": "Si un compte existe avec cet identifiant, un code de réinitialisation a été envoyé",
            "sent": True
        }
    
    # Generate 6-digit reset code
    reset_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    # Store reset code with expiration (15 minutes)
    from datetime import timedelta
    expiration = datetime.utcnow() + timedelta(minutes=15)
    
    await db.password_resets.update_one(
        {"user_id": str(user["_id"])},
        {
            "$set": {
                "user_id": str(user["_id"]),
                "code": reset_code,
                "identifier": data.identifier,
                "expires_at": expiration,
                "used": False,
                "created_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    # In production: Send SMS or Email
    user_email = user.get("email", "")
    user_phone = user.get("phone_number", "")
    user_name = user.get("full_name", "Utilisateur")
    
    email_sent = False
    sms_sent = False
    
    # Send real email if user has an email address
    if user_email and user_email.strip():
        try:
            from services.email_service import send_password_reset_email
            email_sent = send_password_reset_email(user_email, user_name, reset_code)
            if email_sent:
                logger.info(f"[PASSWORD RESET] Email envoye a {user_email}")
            else:
                logger.warning(f"[PASSWORD RESET] Echec envoi email a {user_email}")
        except Exception as e:
            logger.error(f"[PASSWORD RESET] Erreur envoi email: {e}")
    
    # SMS: still mocked (Orange API keys not configured)
    if user_phone:
        logger.info(f"[PASSWORD RESET] SMS simule vers {user_phone}")
    
    logger.info(f"[PASSWORD RESET] Code genere pour {user_email or user_phone}")
    
    response = {
        "message": "Si un compte existe avec cet identifiant, un code de réinitialisation a été envoyé",
        "sent": True,
        "email_sent": email_sent,
    }
    
    # Always include simulation_code for mobile users
    # Real SMS (Orange) not yet configured, so mobile users need this code
    # Remove this line when real SMS gateway is deployed
    response["simulation_code"] = reset_code
    
    return response

@router.post("/verify-reset-code")
async def verify_reset_code(data: dict):
    """Verify the reset code is valid"""
    identifier = data.get("identifier")
    code = data.get("code")
    
    if not identifier or not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identifiant et code requis"
        )
    
    # Build search conditions to handle phone format variations
    id_conditions = [{"identifier": identifier}]
    if "@" not in identifier:
        phone_variants = normalize_phone(identifier)
        id_conditions = [{"identifier": {"$in": phone_variants + [identifier]}}]
    
    # Find the reset request
    reset_request = await db.password_resets.find_one({
        "$or": id_conditions,
        "code": code,
        "used": False,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not reset_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code invalide ou expiré"
        )
    
    return {"valid": True, "message": "Code valide"}

@router.post("/reset-password")
async def reset_password(request: PasswordResetVerify):
    """Reset password with valid code"""
    # Build search conditions to handle phone format variations
    id_conditions = [{"identifier": request.identifier}]
    if "@" not in request.identifier:
        phone_variants = normalize_phone(request.identifier)
        id_conditions = [{"identifier": {"$in": phone_variants + [request.identifier]}}]
    
    # Verify the code again
    reset_request = await db.password_resets.find_one({
        "$or": id_conditions,
        "code": request.code,
        "used": False,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not reset_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code invalide ou expiré"
        )
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir au moins 6 caractères"
        )
    
    # Update password
    user_id = reset_request["user_id"]
    hashed_password = get_password_hash(request.new_password)
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"hashed_password": hashed_password, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la mise à jour du mot de passe"
        )
    
    # Mark code as used
    await db.password_resets.update_one(
        {"_id": reset_request["_id"]},
        {"$set": {"used": True}}
    )
    
    logger.info(f"[PASSWORD RESET] Password reset successful for user {user_id}")
    
    return {"message": "Mot de passe réinitialisé avec succès", "success": True}


# ============= ADMIN PASSWORD HEALTH CHECK & REPAIR =============

@router.get("/admin/password-health/{email}")
async def check_password_health(email: str, current_user: dict = Depends(get_current_user)):
    """
    Diagnostic endpoint to check password hash health.
    Requires super_admin authentication.
    """
    if current_user.get("user_type") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Acces reserve aux administrateurs")
    
    user = await db.users.find_one({"email": email})
    if not user:
        return {"status": "error", "message": "Utilisateur non trouve"}
    
    has_hash = "hashed_password" in user and bool(user["hashed_password"])
    hash_format_valid = False
    
    if has_hash:
        stored_hash = user["hashed_password"]
        hash_format_valid = stored_hash.startswith(("$2a$", "$2b$", "$2y$")) and len(stored_hash) >= 59
    
    return {
        "status": "ok" if has_hash and hash_format_valid else "needs_repair",
        "email": email,
        "has_hashed_password": has_hash,
        "hash_format_valid": hash_format_valid,
        "user_type": user.get("user_type"),
        "is_active": user.get("is_active", True)
    }


@router.post("/admin/repair-password")
async def repair_admin_password(data: dict, current_user: dict = Depends(get_current_user)):
    """
    Admin endpoint to repair a user's password hash.
    Requires super_admin authentication and the new password.
    """
    if current_user.get("user_type") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Acces reserve aux administrateurs")
    
    email = data.get("email")
    new_password = data.get("new_password")
    
    if not email or not new_password:
        raise HTTPException(status_code=400, detail="Email et nouveau mot de passe requis")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caracteres")
    
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    
    new_hash = get_password_hash(new_password)
    
    await db.users.update_one(
        {"email": email},
        {"$set": {
            "hashed_password": new_hash,
            "password_repaired_at": datetime.utcnow(),
            "repaired_by": str(current_user.get("_id"))
        }}
    )
    
    logger.info(f"[PASSWORD REPAIR] Password repaired for {email} by admin {current_user.get('email')}")
    
    return {
        "status": "success",
        "message": f"Mot de passe repare pour {email}"
    }




# ============= ACTIVATION COMPTE MEMBRE COOPÉRATIVE =============

class MemberActivationRequest(BaseModel):
    phone_number: str
    password: str
    coop_code: str = None  # Optional: Code de la coopérative pour vérification


async def send_welcome_notification(user_id: str, user_name: str, coop_name: str):
    """
    Envoie une notification push de bienvenue avec tutoriel au nouveau membre activé
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Récupérer le push token de l'utilisateur
    device = await db.user_devices.find_one({"user_id": user_id})
    
    if not device or not device.get("push_token"):
        logger.info(f"[WELCOME] No push token for user {user_id}, storing notification for later")
        # Stocker la notification pour quand l'utilisateur enregistrera son appareil
        await db.pending_notifications.insert_one({
            "user_id": user_id,
            "type": "welcome_tutorial",
            "created_at": datetime.utcnow(),
            "data": {
                "user_name": user_name,
                "coop_name": coop_name
            }
        })
        return
    
    # Contenu du tutoriel
    tutorial_steps = [
        "1️⃣ Déclarez vos parcelles pour calculer votre score carbone",
        "2️⃣ Enregistrez vos récoltes pour la traçabilité",
        "3️⃣ Suivez vos primes carbone dans l'onglet Paiements",
        "4️⃣ Accédez au Marketplace pour vos intrants agricoles"
    ]
    
    # Notification de bienvenue
    welcome_notification = {
        "to": device["push_token"],
        "title": f"🌱 Bienvenue {user_name}!",
        "body": f"Votre compte GreenLink est activé. Membre de {coop_name}.",
        "data": {
            "screen": "Home",
            "type": "welcome",
            "tutorial": tutorial_steps,
            "show_tutorial": True
        },
        "sound": "default",
        "badge": 1,
        "channelId": "default"
    }
    
    # Envoyer via Expo Push Service
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=welcome_notification,
                headers={"Content-Type": "application/json"}
            )
            logger.info(f"[WELCOME] Push notification sent: {response.status_code}")
    except Exception as e:
        logger.error(f"[WELCOME] Failed to send push: {e}")
    
    # Stocker dans l'historique des notifications
    await db.notifications.insert_one({
        "user_id": user_id,
        "title": welcome_notification["title"],
        "body": welcome_notification["body"],
        "type": "welcome_tutorial",
        "data": welcome_notification["data"],
        "created_at": datetime.utcnow(),
        "is_read": False
    })
    
    # Envoyer une deuxième notification avec le tutoriel détaillé après 5 secondes
    tutorial_notification = {
        "to": device["push_token"],
        "title": "📚 Guide de démarrage GreenLink",
        "body": "Découvrez comment utiliser l'application en 4 étapes simples",
        "data": {
            "screen": "Tutorial",
            "type": "tutorial",
            "steps": tutorial_steps
        },
        "sound": "default",
        "channelId": "default"
    }
    
    await db.notifications.insert_one({
        "user_id": user_id,
        "title": tutorial_notification["title"],
        "body": tutorial_notification["body"],
        "type": "tutorial",
        "data": tutorial_notification["data"],
        "created_at": datetime.utcnow(),
        "is_read": False
    })

@router.post("/activate-member-account")
async def activate_member_account(request: MemberActivationRequest):
    """
    Permet à un membre de coopérative de créer son compte utilisateur
    en utilisant son numéro de téléphone enregistré par la coopérative.
    
    Le membre doit utiliser le même numéro de téléphone que celui
    enregistré par la coopérative.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[MEMBER ACTIVATION] Attempting activation for phone: {request.phone_number}")
    
    phone_variants = normalize_phone(request.phone_number)
    
    # Vérifier si ce numéro existe déjà dans les users
    existing_user = await db.users.find_one({"phone_number": {"$in": phone_variants}})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce numéro de téléphone a déjà un compte actif. Veuillez vous connecter."
        )
    
    # Chercher le membre dans coop_members avec normalisation
    member = await db.coop_members.find_one({"phone_number": {"$in": phone_variants}})
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun profil membre trouvé avec ce numéro. Contactez votre coopérative."
        )
    
    # Utiliser le numéro tel que stocké dans le membre
    stored_phone = member.get("phone_number", request.phone_number)
    
    # Récupérer les infos de la coopérative
    coop = await db.users.find_one({"_id": ObjectId(member.get("coop_id"))})
    if not coop:
        coop_id_str = str(member.get("coop_id"))
        coop = await db.users.find_one({"_id": ObjectId(coop_id_str)}) if ObjectId.is_valid(coop_id_str) else None
    coop_name = coop.get("coop_name") or coop.get("full_name") if coop else "Coopérative"
    
    # Créer le compte utilisateur
    hashed_password = get_password_hash(request.password)
    
    user_dict = {
        "phone_number": stored_phone,
        "email": member.get("email"),
        "full_name": member.get("full_name") or member.get("name"),
        "hashed_password": hashed_password,
        "user_type": "producteur",
        "created_at": datetime.utcnow(),
        "is_active": True,
        # Copier les données du membre
        "village": member.get("village"),
        "region": member.get("region"),
        "department": member.get("department"),
        "cni_number": member.get("cni_number"),
        # Lien vers la coopérative
        "cooperative_id": str(member.get("coop_id")),
        "cooperative_name": coop_name,
        "coop_member_id": str(member.get("_id")),
        # Code planteur auto-généré
        "code_planteur": member.get("code_planteur"),
        # Données ICI si présentes
        "genre": member.get("genre"),
        "date_naissance": member.get("date_naissance"),
        "taille_menage": member.get("taille_menage"),
        "nombre_enfants": member.get("nombre_enfants"),
        # Parcelles héritées
        "parcels_count": member.get("parcels_count", 0),
        "total_hectares": member.get("total_hectares", 0),
        # Marqueur d'activation
        "activated_from_member": True,
        "activation_date": datetime.utcnow(),
    }
    
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    # Mettre à jour le coop_member avec le user_id
    await db.coop_members.update_one(
        {"_id": member["_id"]},
        {"$set": {
            "user_id": user_id,
            "account_activated": True,
            "activation_date": datetime.utcnow()
        }}
    )
    
    # Mettre à jour les parcelles existantes avec le user_id
    member_id_str = str(member["_id"])
    updated_parcels = await db.parcels.update_many(
        {"$or": [
            {"member_id": member_id_str, "farmer_id": member_id_str},
            {"member_id": member_id_str, "farmer_id": None},
            {"member_id": member_id_str, "farmer_id": {"$exists": False}}
        ]},
        {"$set": {"farmer_id": user_id}}
    )
    logger.info(f"[MEMBER ACTIVATION] Updated {updated_parcels.modified_count} parcels with new farmer_id {user_id}")
    
    # Créer l'abonnement gratuit producteur
    from subscription_models import create_subscription_for_user
    subscription = create_subscription_for_user(user_id, "producteur")
    await db.subscriptions.insert_one(subscription)
    
    # Envoyer notification push de bienvenue avec tutoriel
    try:
        await send_welcome_notification(user_id, user_dict.get('full_name'), coop_name)
        logger.info(f"[MEMBER ACTIVATION] Welcome notification sent to user {user_id}")
    except Exception as e:
        logger.error(f"[MEMBER ACTIVATION] Failed to send welcome notification: {e}")
    
    # Envoyer notifications email (bienvenue membre + alerte cooperative)
    try:
        import asyncio
        from services.notification_email_helper import send_notification_email_async
        asyncio.create_task(send_notification_email_async(db, "member_activated",
            coop_id=member.get("coop_id"),
            member_email=user_dict.get("email"),
            member_name=user_dict.get("full_name", "Membre"),
            member_phone=user_dict.get("phone_number", ""),
            village=user_dict.get("village"),
            user_type="producteur"
        ))
    except Exception as e:
        logger.error(f"[MEMBER ACTIVATION] Email notification error: {e}")
    
    # Créer le token d'accès
    access_token = create_access_token(data={"sub": user_id})
    
    user_dict["_id"] = user_id
    user_dict.pop("hashed_password", None)
    
    logger.info(f"[MEMBER ACTIVATION] Successfully activated account for member {member.get('_id')}, new user_id: {user_id}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_dict,
        "message": f"Compte activé avec succès! Bienvenue {user_dict.get('full_name')}.",
        "cooperative": coop_name
    }


@router.get("/check-member-phone/{phone_number}")
async def check_member_phone(phone_number: str):
    """
    Vérifie si un numéro de téléphone est enregistré comme membre de coopérative
    et s'il peut activer son compte.
    """
    phone_variants = normalize_phone(phone_number)
    
    # Vérifier si déjà un user
    existing_user = await db.users.find_one({"phone_number": {"$in": phone_variants}})
    if existing_user:
        return {
            "found": True,
            "can_activate": False,
            "reason": "has_account",
            "message": "Ce numéro a déjà un compte. Veuillez vous connecter."
        }
    
    # Chercher dans coop_members avec toutes les variantes
    member = await db.coop_members.find_one({"phone_number": {"$in": phone_variants}})
    if not member:
        return {
            "found": False,
            "can_activate": False,
            "reason": "not_found",
            "message": "Aucun profil membre trouvé. Contactez votre coopérative."
        }
    
    # Récupérer le nom de la coopérative
    coop_id_raw = member.get("coop_id")
    coop = None
    if coop_id_raw:
        if isinstance(coop_id_raw, ObjectId):
            coop = await db.users.find_one({"_id": coop_id_raw})
        elif ObjectId.is_valid(str(coop_id_raw)):
            coop = await db.users.find_one({"_id": ObjectId(str(coop_id_raw))})
    coop_name = (coop.get("coop_name") or coop.get("full_name")) if coop else "Coopérative"
    
    return {
        "found": True,
        "can_activate": True,
        "member_name": member.get("full_name") or member.get("name"),
        "cooperative_name": coop_name,
        "village": member.get("village"),
        "message": f"Profil trouvé chez {coop_name}. Vous pouvez activer votre compte."
    }



# ============= ACTIVATION COMPTE AGENT TERRAIN =============

class AgentActivationRequest(BaseModel):
    phone_number: str
    password: str


@router.get("/check-agent-phone/{phone_number}")
async def check_agent_phone(phone_number: str):
    """
    Vérifie si un numéro de téléphone est enregistré comme agent terrain
    et s'il peut activer son compte.
    """
    phone_variants = normalize_phone(phone_number)
    
    # Vérifier si déjà un user
    existing_user = await db.users.find_one({"phone_number": {"$in": phone_variants}})
    if existing_user:
        return {
            "found": True,
            "can_activate": False,
            "reason": "has_account",
            "message": "Ce numéro a déjà un compte. Veuillez vous connecter."
        }
    
    # Chercher dans coop_agents avec toutes les variantes
    agent = await db.coop_agents.find_one({"phone_number": {"$in": phone_variants}})
    if not agent:
        return {
            "found": False,
            "can_activate": False,
            "reason": "not_found",
            "message": "Aucun profil agent trouvé. Contactez votre coopérative."
        }
    
    # Récupérer le nom de la coopérative
    coop_id_raw = agent.get("coop_id")
    coop = None
    if coop_id_raw:
        if isinstance(coop_id_raw, ObjectId):
            coop = await db.users.find_one({"_id": coop_id_raw})
        elif ObjectId.is_valid(str(coop_id_raw)):
            coop = await db.users.find_one({"_id": ObjectId(str(coop_id_raw))})
    coop_name = (coop.get("coop_name") or coop.get("full_name")) if coop else "Coopérative"
    
    return {
        "found": True,
        "can_activate": True,
        "agent_name": agent.get("full_name"),
        "cooperative_name": coop_name,
        "zone": agent.get("zone"),
        "account_type": "field_agent",
        "message": f"Profil agent trouvé chez {coop_name}. Vous pouvez activer votre compte."
    }


@router.post("/activate-agent-account")
async def activate_agent_account(request: AgentActivationRequest):
    """
    Permet à un agent terrain de créer son compte utilisateur
    en utilisant son numéro de téléphone enregistré par la coopérative.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[AGENT ACTIVATION] Attempting activation for phone: {request.phone_number}")
    
    phone_variants = normalize_phone(request.phone_number)
    
    # Vérifier si ce numéro existe déjà dans les users
    existing_user = await db.users.find_one({"phone_number": {"$in": phone_variants}})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce numéro de téléphone a déjà un compte actif. Veuillez vous connecter."
        )
    
    # Chercher l'agent dans coop_agents
    agent = await db.coop_agents.find_one({"phone_number": {"$in": phone_variants}})
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun profil agent trouvé avec ce numéro. Contactez votre coopérative."
        )
    
    # Récupérer les infos de la coopérative
    coop_id_raw = agent.get("coop_id")
    coop = None
    if coop_id_raw:
        if isinstance(coop_id_raw, ObjectId):
            coop = await db.users.find_one({"_id": coop_id_raw})
        elif ObjectId.is_valid(str(coop_id_raw)):
            coop = await db.users.find_one({"_id": ObjectId(str(coop_id_raw))})
    coop_name = (coop.get("coop_name") or coop.get("full_name")) if coop else "Coopérative"
    coop_id = str(coop_id_raw) if coop_id_raw else ""
    
    # Créer le compte utilisateur
    hashed_password = get_password_hash(request.password)
    
    user_dict = {
        "phone_number": request.phone_number,
        "email": agent.get("email"),
        "full_name": agent.get("full_name"),
        "hashed_password": hashed_password,
        "user_type": "field_agent",
        "created_at": datetime.utcnow(),
        "is_active": True,
        # Lien vers la coopérative
        "cooperative_id": coop_id,
        "cooperative_name": coop_name,
        "agent_profile_id": str(agent.get("_id")),
        # Données de l'agent
        "zone": agent.get("zone"),
        "village_coverage": agent.get("village_coverage", []),
        # Statistiques
        "members_onboarded": agent.get("members_onboarded", 0),
        "parcels_declared": agent.get("parcels_declared", 0),
        "ssrte_visits_count": 0,
        # Marqueur d'activation
        "activated_from_agent": True,
        "activation_date": datetime.utcnow(),
    }
    
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    # Mettre à jour le coop_agent avec le user_id
    await db.coop_agents.update_one(
        {"_id": agent["_id"]},
        {"$set": {
            "user_id": user_id,
            "account_activated": True,
            "activation_date": datetime.utcnow()
        }}
    )
    
    # Créer le token d'accès
    access_token = create_access_token(data={"sub": user_id})
    
    # Envoyer notification de bienvenue
    try:
        await db.notifications.insert_one({
            "user_id": user_id,
            "title": f"Bienvenue Agent {user_dict.get('full_name')}!",
            "body": f"Votre compte agent terrain est activé. Vous pouvez maintenant effectuer des visites SSRTE, rechercher des producteurs par téléphone et enregistrer des photos géolocalisées.",
            "type": "welcome",
            "data": {"role": "field_agent"},
            "created_at": datetime.utcnow(),
            "is_read": False
        })
    except Exception as e:
        logger.error(f"[AGENT ACTIVATION] Failed to send welcome notification: {e}")
    
    # Envoyer email de bienvenue a l'agent
    try:
        import asyncio
        from services.notification_email_helper import send_notification_email_async
        asyncio.create_task(send_notification_email_async(db, "member_activated",
            coop_id=coop_id_raw,
            member_email=user_dict.get("email"),
            member_name=user_dict.get("full_name", "Agent"),
            member_phone=user_dict.get("phone_number", ""),
            user_type="field_agent"
        ))
    except Exception as e:
        logger.error(f"[AGENT ACTIVATION] Email notification error: {e}")
    
    user_dict["_id"] = user_id
    user_dict.pop("hashed_password", None)
    
    logger.info(f"[AGENT ACTIVATION] Successfully activated account for agent {agent.get('_id')}, new user_id: {user_id}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_dict,
        "message": f"Compte agent activé avec succès! Bienvenue {user_dict.get('full_name')}.",
        "cooperative": coop_name,
        "permissions": [
            "dashboard_performance",
            "ssrte_visits",
            "geotagged_photos",
            "member_registration",
            "parcel_declaration",
            "child_labor_monitoring"
        ]
    }



@router.get("/cooperatives")
async def list_cooperatives():
    """Public endpoint to list cooperatives for farmer registration forms."""
    coops = await db.users.find(
        {"user_type": "cooperative", "is_active": True},
        {"_id": 0, "coop_code": 1, "coop_name": 1, "full_name": 1, "headquarters_region": 1}
    ).to_list(200)
    
    result = []
    for c in coops:
        name = c.get("coop_name") or c.get("full_name", "")
        code = c.get("coop_code", "")
        if name and code:
            result.append({
                "code": code,
                "name": name,
                "region": c.get("headquarters_region", "")
            })
    
    return {"cooperatives": result}
