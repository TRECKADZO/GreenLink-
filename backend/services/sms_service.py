"""
SMS Service for GreenLink
Handles SMS notifications for farmers
Currently simulated - ready for Orange API integration
"""
import os
import logging
from datetime import datetime
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# SMS Templates in French and local languages
SMS_TEMPLATES = {
    "carbon_premium_eligible": {
        "francais": "GreenLink: Félicitations {name}! Votre parcelle {parcel_id} a un score carbone de {score}/10. Vous êtes éligible à la prime de 10% sur vos ventes! Tapez *144*99# pour plus d'infos.",
        "baoule": "GreenLink: {name}, wo parcelle {parcel_id} le carbone score {score}/10. A ti kpa! 10% prime wo ta nian. *144*99#",
        "dioula": "GreenLink: {name}, i ka parcelle {parcel_id} carbone score ye {score}/10. A ka nyi! 10% prime bè i soro. *144*99#"
    },
    "harvest_payment": {
        "francais": "GreenLink: Paiement de {amount} XOF envoyé sur votre {payment_method}. Ref: {ref}. Prime carbone incluse: {premium} XOF.",
        "baoule": "GreenLink: Sika {amount} XOF ko wo {payment_method} su. Ref: {ref}. Carbone prime: {premium} XOF.",
        "dioula": "GreenLink: Wari {amount} XOF bila i ka {payment_method} la. Ref: {ref}. Carbone prime: {premium} XOF."
    },
    "parcel_verified": {
        "francais": "GreenLink: Votre parcelle {parcel_id} a été vérifiée! Score carbone: {score}/10. {premium_msg}",
        "baoule": "GreenLink: Wo parcelle {parcel_id} verification ti kpa! Score: {score}/10. {premium_msg}",
        "dioula": "GreenLink: I ka parcelle {parcel_id} verification tèmèna! Score: {score}/10. {premium_msg}"
    },
    "weekly_summary": {
        "francais": "GreenLink Résumé: {parcels} parcelles, {credits} crédits CO2, {revenue} XOF ce mois. Score moyen: {avg_score}/10. Continuez!",
        "baoule": "GreenLink: Parcelle {parcels}, CO2 {credits}, sika {revenue} XOF. Score {avg_score}/10. A ti kpa!",
        "dioula": "GreenLink: Parcelle {parcels}, CO2 {credits}, wari {revenue} XOF. Score {avg_score}/10. A ka nyi!"
    }
}


class SMSService:
    """
    SMS Service for sending notifications to farmers
    Currently simulated - stores in DB for tracking
    Ready for Orange CI API integration
    """
    
    @staticmethod
    async def send_sms(
        phone_number: str,
        template_name: str,
        language: str = "francais",
        **kwargs
    ) -> dict:
        """
        Send SMS notification (simulated)
        
        Args:
            phone_number: Recipient phone number
            template_name: Name of the SMS template
            language: Language preference (francais, baoule, dioula)
            **kwargs: Template variables
        
        Returns:
            dict with status and message_id
        """
        try:
            # Get template
            templates = SMS_TEMPLATES.get(template_name, {})
            template = templates.get(language, templates.get("francais", ""))
            
            if not template:
                logger.error(f"Template {template_name} not found")
                return {"success": False, "error": "Template not found"}
            
            # Format message
            message = template.format(**kwargs)
            
            # Generate message ID
            message_id = f"SMS{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{phone_number[-4:]}"
            
            # Store in database
            sms_record = {
                "message_id": message_id,
                "phone_number": phone_number,
                "template": template_name,
                "language": language,
                "message": message,
                "status": "sent",  # simulated - would be "pending" with real API
                "created_at": datetime.utcnow(),
                "delivered_at": datetime.utcnow(),  # simulated instant delivery
                "metadata": kwargs
            }
            
            await db.sms_notifications.insert_one(sms_record)
            
            logger.info(f"SMS sent to {phone_number}: {message[:50]}...")
            
            return {
                "success": True,
                "message_id": message_id,
                "phone_number": phone_number,
                "message": message,
                "simulated": True  # Flag indicating this is not real SMS
            }
            
        except Exception as e:
            logger.error(f"SMS send error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    async def notify_carbon_premium_eligible(
        phone_number: str,
        farmer_name: str,
        parcel_id: str,
        carbon_score: float,
        language: str = "francais"
    ) -> dict:
        """
        Notify farmer when their parcel reaches premium-eligible carbon score
        """
        return await SMSService.send_sms(
            phone_number=phone_number,
            template_name="carbon_premium_eligible",
            language=language,
            name=farmer_name,
            parcel_id=parcel_id[:8],  # Short ID
            score=f"{carbon_score:.1f}"
        )
    
    @staticmethod
    async def notify_harvest_payment(
        phone_number: str,
        amount: float,
        payment_method: str,
        reference: str,
        premium: float,
        language: str = "francais"
    ) -> dict:
        """
        Notify farmer when harvest payment is processed
        """
        return await SMSService.send_sms(
            phone_number=phone_number,
            template_name="harvest_payment",
            language=language,
            amount=f"{amount:,.0f}",
            payment_method=payment_method,
            ref=reference,
            premium=f"{premium:,.0f}"
        )
    
    @staticmethod
    async def notify_parcel_verified(
        phone_number: str,
        parcel_id: str,
        carbon_score: float,
        language: str = "francais"
    ) -> dict:
        """
        Notify farmer when their parcel is verified
        """
        premium_msg = "Prime 10% activée!" if carbon_score >= 7 else "Améliorez vos pratiques pour la prime."
        
        return await SMSService.send_sms(
            phone_number=phone_number,
            template_name="parcel_verified",
            language=language,
            parcel_id=parcel_id[:8],
            score=f"{carbon_score:.1f}",
            premium_msg=premium_msg
        )
    
    @staticmethod
    async def send_weekly_summary(
        phone_number: str,
        farmer_name: str,
        total_parcels: int,
        total_credits: float,
        total_revenue: float,
        avg_score: float,
        language: str = "francais"
    ) -> dict:
        """
        Send weekly summary to farmer
        """
        return await SMSService.send_sms(
            phone_number=phone_number,
            template_name="weekly_summary",
            language=language,
            parcels=total_parcels,
            credits=f"{total_credits:.1f}",
            revenue=f"{total_revenue:,.0f}",
            avg_score=f"{avg_score:.1f}"
        )
    
    @staticmethod
    async def get_sms_history(phone_number: str, limit: int = 20) -> list:
        """
        Get SMS history for a phone number
        """
        history = await db.sms_notifications.find(
            {"phone_number": phone_number}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return [{**sms, "_id": str(sms["_id"])} for sms in history]


# Convenience function for quick SMS
async def send_quick_sms(phone: str, message: str) -> dict:
    """
    Send a custom SMS message (for admin/support use)
    """
    message_id = f"SMS{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{phone[-4:]}"
    
    sms_record = {
        "message_id": message_id,
        "phone_number": phone,
        "template": "custom",
        "language": "francais",
        "message": message,
        "status": "sent",
        "created_at": datetime.utcnow(),
        "delivered_at": datetime.utcnow(),
        "metadata": {}
    }
    
    await db.sms_notifications.insert_one(sms_record)
    
    return {
        "success": True,
        "message_id": message_id,
        "message": message,
        "simulated": True
    }
