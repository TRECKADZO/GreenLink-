# SMS OTP Routes
# Real SMS integration with Orange Côte d'Ivoire API

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import random
import string
from services.orange_sms import orange_sms
from routes.auth import get_current_user

router = APIRouter(prefix="/api/sms", tags=["SMS"])

# In-memory OTP storage (should use Redis in production)
otp_store = {}

class SendOTPRequest(BaseModel):
    phone_number: str

class VerifyOTPRequest(BaseModel):
    phone_number: str
    otp_code: str

class SendSMSRequest(BaseModel):
    phone_number: str
    message: str

def generate_otp(length: int = 6) -> str:
    """Generate a random numeric OTP code"""
    return ''.join(random.choices(string.digits, k=length))

def clean_phone_number(phone: str) -> str:
    """Normalize phone number format"""
    phone = phone.replace(" ", "").replace("-", "").replace(".", "")
    if not phone.startswith("+"):
        if phone.startswith("225"):
            phone = f"+{phone}"
        elif phone.startswith("0"):
            phone = f"+225{phone[1:]}"
        else:
            phone = f"+225{phone}"
    return phone

@router.post("/send-otp")
async def send_otp(request: SendOTPRequest):
    """
    Envoie un code OTP par SMS au numéro spécifié
    
    Le code est valide pendant 10 minutes
    """
    phone = clean_phone_number(request.phone_number)
    
    # Check rate limiting (max 3 OTP per 10 minutes)
    if phone in otp_store:
        existing = otp_store[phone]
        if existing.get("attempts", 0) >= 3:
            last_attempt = existing.get("last_attempt")
            if last_attempt and datetime.now() - last_attempt < timedelta(minutes=10):
                raise HTTPException(
                    status_code=429, 
                    detail="Trop de tentatives. Réessayez dans 10 minutes."
                )
    
    # Generate new OTP
    otp_code = generate_otp()
    expires_at = datetime.now() + timedelta(minutes=10)
    
    # Store OTP
    otp_store[phone] = {
        "code": otp_code,
        "expires_at": expires_at,
        "attempts": otp_store.get(phone, {}).get("attempts", 0) + 1,
        "last_attempt": datetime.now(),
        "verified": False
    }
    
    # Send SMS
    result = await orange_sms.send_otp(phone, otp_code)
    
    if not result["success"] and not result.get("mock"):
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de l'envoi du SMS. Veuillez réessayer."
        )
    
    return {
        "success": True,
        "message": "Code OTP envoyé par SMS",
        "phone_masked": f"{phone[:7]}****{phone[-2:]}",
        "expires_in_minutes": 10,
        "mock_mode": result.get("mock", False),
        # Only include OTP in mock mode for testing
        "debug_otp": otp_code if result.get("mock") else None
    }

@router.post("/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    """
    Vérifie un code OTP
    """
    phone = clean_phone_number(request.phone_number)
    
    if phone not in otp_store:
        raise HTTPException(
            status_code=400,
            detail="Aucun code OTP envoyé à ce numéro"
        )
    
    stored = otp_store[phone]
    
    # Check expiration
    if datetime.now() > stored["expires_at"]:
        del otp_store[phone]
        raise HTTPException(
            status_code=400,
            detail="Code OTP expiré. Demandez un nouveau code."
        )
    
    # Check code
    if stored["code"] != request.otp_code:
        raise HTTPException(
            status_code=400,
            detail="Code OTP incorrect"
        )
    
    # Mark as verified
    otp_store[phone]["verified"] = True
    
    return {
        "success": True,
        "message": "Numéro de téléphone vérifié avec succès",
        "phone": phone
    }

@router.post("/send")
async def send_sms(request: SendSMSRequest, current_user: dict = Depends(get_current_user)):
    """
    Envoie un SMS personnalisé (admin only)
    """
    phone = clean_phone_number(request.phone_number)
    
    if len(request.message) > 480:
        raise HTTPException(
            status_code=400,
            detail="Message trop long (max 480 caractères)"
        )
    
    result = await orange_sms.send_sms(phone, request.message)
    
    if not result["success"] and not result.get("mock"):
        raise HTTPException(
            status_code=500,
            detail=f"Erreur d'envoi: {result.get('error', 'Unknown error')}"
        )
    
    return {
        "success": True,
        "message": "SMS envoyé",
        "mock_mode": result.get("mock", False),
        "timestamp": result.get("timestamp")
    }

@router.get("/status")
async def get_sms_status():
    """
    Vérifie le statut de l'intégration SMS Orange
    """
    return {
        "service": "Orange CI SMS API",
        "configured": orange_sms.is_configured,
        "mode": "production" if orange_sms.is_configured else "mock",
        "documentation": "https://developer.orange.com/apis/sms-ci",
        "setup_instructions": {
            "1": "Créez un compte sur developer.orange.com",
            "2": "Créez une application et obtenez Client ID/Secret",
            "3": "Achetez un bundle SMS (min 100 SMS)",
            "4": "Configurez ORANGE_CLIENT_ID et ORANGE_CLIENT_SECRET dans .env"
        }
    }
