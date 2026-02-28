from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
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

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists (by phone or email)
    query = []
    if user_data.phone_number:
        query.append({"phone_number": user_data.phone_number})
    if user_data.email:
        query.append({"email": user_data.email})
    
    if query:
        existing_user = await db.users.find_one({"$or": query})
        if existing_user:
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
        user_dict["coop_name"] = getattr(user_data, 'coop_name', None)
        user_dict["coop_code"] = getattr(user_data, 'coop_code', None)
        user_dict["registration_number"] = getattr(user_data, 'registration_number', None)
        user_dict["certifications"] = getattr(user_data, 'certifications', [])
        user_dict["headquarters_address"] = getattr(user_data, 'headquarters_address', None)
        user_dict["headquarters_region"] = getattr(user_data, 'headquarters_region', None)
        user_dict["commission_rate"] = getattr(user_data, 'commission_rate', 0.10)
        user_dict["orange_money_business"] = getattr(user_data, 'orange_money_business', None)
    
    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = str(result.inserted_id)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(result.inserted_id)})
    
    # Remove hashed_password from response
    user_dict.pop("hashed_password", None)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_dict
    }

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    # Find user by phone number or email
    user = await db.users.find_one({
        "$or": [
            {"phone_number": credentials.identifier},
            {"email": credentials.identifier}
        ]
    })
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant ou mot de passe incorrect"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
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
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    user["_id"] = str(user["_id"])
    user.pop("hashed_password", None)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=User)
async def get_profile(current_user: dict = Depends(get_current_user)):
    current_user.pop("hashed_password", None)
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
async def request_password_reset(request: PasswordResetRequest):
    """Request a password reset code"""
    # Find user by email or phone
    user = await db.users.find_one({
        "$or": [
            {"email": request.identifier},
            {"phone_number": request.identifier}
        ]
    })
    
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
                "identifier": request.identifier,
                "expires_at": expiration,
                "used": False,
                "created_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    # In production: Send SMS or Email
    # For now, log the code (SIMULATION)
    user_email = user.get("email", "")
    user_phone = user.get("phone_number", "")
    
    logger.info(f"[PASSWORD RESET] Code {reset_code} sent to {user_email or user_phone}")
    
    # SIMULATION: Also store in a way the frontend can access for testing
    # In production, remove this and use real SMS/Email
    
    return {
        "message": "Si un compte existe avec cet identifiant, un code de réinitialisation a été envoyé",
        "sent": True,
        # SIMULATION MODE: Include code for testing (remove in production)
        "simulation_code": reset_code if os.environ.get("SIMULATION_MODE", "true").lower() == "true" else None
    }

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
    
    # Find the reset request
    reset_request = await db.password_resets.find_one({
        "identifier": identifier,
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
    # Verify the code again
    reset_request = await db.password_resets.find_one({
        "identifier": request.identifier,
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