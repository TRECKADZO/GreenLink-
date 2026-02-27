from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from motor.motor_asyncio import AsyncIOMotorClient
from auth_models import UserCreate, UserLogin, Token, User, UserProfileUpdate
from auth_utils import get_password_hash, verify_password, create_access_token, verify_token
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

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