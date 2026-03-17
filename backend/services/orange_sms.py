# Orange CI SMS Service
# Integration with Orange Côte d'Ivoire SMS API
# Documentation: https://developer.orange.com/apis/sms-ci

import os
import httpx
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class OrangeSMSService:
    """
    Service d'envoi de SMS via l'API Orange Côte d'Ivoire
    
    Configuration requise dans .env:
    - ORANGE_SMS_CLIENT_ID: Client ID de l'application Orange Developer
    - ORANGE_SMS_CLIENT_SECRET: Client Secret 
    - ORANGE_SMS_SENDER_NUMBER: Numéro expéditeur enregistré (+225XXXXXXXXX)
    - ORANGE_SMS_API_URL: URL de base (default: https://api.orange.com)
    """
    
    def __init__(self):
        self.base_url = os.environ.get("ORANGE_SMS_API_URL", "https://api.orange.com")
        self.token_url = f"{self.base_url}/oauth/v3/token"
        self.sms_url = f"{self.base_url}/smsmessaging/v1/outbound"
        self.client_id = os.environ.get("ORANGE_SMS_CLIENT_ID", "")
        self.client_secret = os.environ.get("ORANGE_SMS_CLIENT_SECRET", "")
        self.sender_number = os.environ.get("ORANGE_SMS_SENDER_NUMBER", "+2250787761023")
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        
        self.is_configured = bool(self.client_id and self.client_secret)
        
        if not self.is_configured:
            logger.warning(
                "[OrangeSMS] Credentials absentes -> mode MOCK. "
                "Renseignez ORANGE_SMS_CLIENT_ID et ORANGE_SMS_CLIENT_SECRET dans .env."
            )
    
    async def _get_access_token(self) -> str:
        """
        Obtient un token d'accès OAuth 2.0 (valide 1 heure)
        """
        # Return cached token if still valid
        if self.access_token and self.token_expires_at:
            if datetime.now() < self.token_expires_at - timedelta(minutes=5):
                return self.access_token
        
        import base64
        auth_string = f"{self.client_id}:{self.client_secret}"
        auth_header = base64.b64encode(auth_string.encode()).decode()
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                self.token_url,
                headers={
                    "Authorization": f"Basic {auth_header}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={"grant_type": "client_credentials"}
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to get Orange token: {response.text}")
                raise Exception(f"Orange OAuth failed: {response.status_code}")
            
            data = response.json()
            self.access_token = data["access_token"]
            expires_in = data.get("expires_in", 3600)
            self.token_expires_at = datetime.now() + timedelta(seconds=expires_in)
            
            logger.info("Orange SMS token obtained successfully")
            return self.access_token
    
    def _format_phone_number(self, phone: str) -> str:
        """
        Formate un numéro de téléphone pour l'API Orange
        Format attendu: tel:+225XXXXXXXXX
        """
        # Remove spaces and special characters
        phone = phone.replace(" ", "").replace("-", "").replace(".", "")
        
        # Add country code if missing
        if not phone.startswith("+"):
            if phone.startswith("225"):
                phone = f"+{phone}"
            elif phone.startswith("0"):
                phone = f"+225{phone[1:]}"
            else:
                phone = f"+225{phone}"
        
        return f"tel:{phone}"
    
    async def send_sms(self, recipient: str, message: str) -> dict:
        """
        Envoie un SMS à un destinataire
        
        Args:
            recipient: Numéro de téléphone du destinataire
            message: Contenu du SMS (max 160 caractères pour SMS standard)
            
        Returns:
            dict: Résultat de l'envoi avec statut
        """
        # Mock mode if not configured
        if not self.is_configured:
            logger.info(f"[MOCK SMS] To: {recipient}, Message: {message[:50]}...")
            return {
                "success": True,
                "mock": True,
                "recipient": recipient,
                "message_preview": message[:50],
                "timestamp": datetime.now().isoformat()
            }
        
        try:
            token = await self._get_access_token()
            
            formatted_sender = self._format_phone_number(self.sender_number)
            formatted_recipient = self._format_phone_number(recipient)
            
            # URL encode the sender number for the endpoint
            import urllib.parse
            encoded_sender = urllib.parse.quote(formatted_sender, safe='')
            
            sms_endpoint = f"{self.sms_url}/{encoded_sender}/requests"
            
            payload = {
                "outboundSMSMessageRequest": {
                    "address": formatted_recipient,
                    "senderAddress": formatted_sender,
                    "outboundSMSTextMessage": {
                        "message": message
                    }
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    sms_endpoint,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                
                if response.status_code in [200, 201]:
                    logger.info(f"SMS sent successfully to {recipient}")
                    return {
                        "success": True,
                        "mock": False,
                        "recipient": recipient,
                        "response": response.json(),
                        "timestamp": datetime.now().isoformat()
                    }
                else:
                    logger.error(f"SMS send failed: {response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "mock": False,
                        "error": response.text,
                        "status_code": response.status_code
                    }
                    
        except Exception as e:
            logger.error(f"SMS send error: {str(e)}")
            return {
                "success": False,
                "mock": False,
                "error": str(e)
            }
    
    async def send_otp(self, phone: str, otp_code: str) -> dict:
        """
        Envoie un code OTP par SMS
        """
        message = f"GreenLink: Votre code de vérification est {otp_code}. Valide 10 minutes. Ne partagez ce code avec personne."
        return await self.send_sms(phone, message)
    
    async def send_payment_notification(self, phone: str, amount: float, description: str) -> dict:
        """
        Envoie une notification de paiement
        """
        message = f"GreenLink: Paiement reçu de {amount:,.0f} XOF. {description}. Merci!"
        return await self.send_sms(phone, message)
    
    async def send_harvest_confirmation(self, phone: str, harvest_id: str, quantity: float, crop: str) -> dict:
        """
        Envoie une confirmation de déclaration de récolte
        """
        message = f"GreenLink: Récolte #{harvest_id[-6:]} enregistrée. {quantity}kg de {crop}. Prime carbone en cours de calcul."
        return await self.send_sms(phone, message)
    
    async def send_carbon_premium_notification(self, phone: str, amount: float, score: float) -> dict:
        """
        Envoie une notification de prime carbone
        """
        message = f"GreenLink: Prime carbone de {amount:,.0f} XOF! Score: {score}/10. Montant versé sur Orange Money."
        return await self.send_sms(phone, message)

    def get_status(self) -> dict:
        return {
            "service": "orange_sms",
            "configured": self.is_configured,
            "mode": "production" if self.is_configured else "mock",
            "sender_number": self.sender_number,
            "api_url": self.base_url,
        }


# Singleton instance
orange_sms = OrangeSMSService()
