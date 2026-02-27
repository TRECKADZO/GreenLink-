from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime
import re

class LegalAcceptance(BaseModel):
    acceptedConditions: bool = False
    acceptedPrivacy: bool = False
    acceptedAt: Optional[str] = None

class UserBase(BaseModel):
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    user_type: str  # producteur, acheteur, entreprise_rse, fournisseur
    full_name: str
    legal_acceptance: Optional[LegalAcceptance] = None
    
    @validator('phone_number')
    def validate_phone(cls, v, values):
        if v is None:
            return v
        # Accept international format with + or without
        phone_pattern = r'^\+?[0-9]{8,15}$'
        if not re.match(phone_pattern, v):
            raise ValueError('Numéro de téléphone invalide. Format attendu: +225XXXXXXXXXX ou XXXXXXXXXX')
        return v
    
    @validator('email')
    def validate_contact(cls, v, values):
        # At least one of phone_number or email must be provided
        if v is None and values.get('phone_number') is None:
            raise ValueError('Vous devez fournir un numéro de téléphone ou un email')
        return v
    
    @validator('user_type')
    def validate_user_type(cls, v):
        allowed_types = ['producteur', 'acheteur', 'entreprise_rse', 'fournisseur', 'cooperative', 'admin']
        if v not in allowed_types:
            raise ValueError(f'Type d\'utilisateur invalide. Types autorisés: {", ".join(allowed_types)}')
        return v

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Le mot de passe doit contenir au moins 6 caractères')
        return v

class UserLogin(BaseModel):
    identifier: str  # Can be phone or email
    password: str

class User(UserBase):
    id: str = Field(alias="_id")
    created_at: datetime
    is_active: bool
    
    # Legal acceptance tracking
    legal_acceptance: Optional[Dict[str, Any]] = None
    
    # Profile fields based on user_type
    # Producteur fields
    crops: Optional[list] = None
    farm_location: Optional[str] = None
    farm_size: Optional[float] = None  # in hectares
    
    # Acheteur fields
    company_name: Optional[str] = None
    purchase_volume: Optional[str] = None
    
    # Entreprise RSE fields
    company_name_rse: Optional[str] = None
    sector: Optional[str] = None
    carbon_goals: Optional[str] = None
    
    # Fournisseur fields
    supplier_company: Optional[str] = None
    products_offered: Optional[list] = None
    
class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    # Producteur fields
    crops: Optional[list] = None
    farm_location: Optional[str] = None
    farm_size: Optional[float] = None
    # Acheteur fields
    company_name: Optional[str] = None
    purchase_volume: Optional[str] = None
    # Entreprise RSE fields
    company_name_rse: Optional[str] = None
    sector: Optional[str] = None
    carbon_goals: Optional[str] = None
    # Fournisseur fields
    supplier_company: Optional[str] = None
    products_offered: Optional[list] = None