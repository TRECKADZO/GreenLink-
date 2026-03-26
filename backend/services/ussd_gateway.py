"""
USSD Gateway Adapter pour GreenLink
Compatible avec les passerelles USSD d'Afrique de l'Ouest:
- Orange CI USSD API
- Africa's Talking
- Infobip

Ce service abstrait les spécificités de chaque fournisseur
et fonctionne en mode MOCK quand les credentials sont absents.

Configuration requise dans .env:
- USSD_GATEWAY_URL: URL de base de la passerelle
- USSD_GATEWAY_API_KEY: Clé d'authentification
- USSD_GATEWAY_SERVICE_CODE: Code USSD enregistré (ex: *144*99#)
- USSD_GATEWAY_PROVIDER: Fournisseur (orange, africastalking, infobip)
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class USSDGatewayService:
    PROVIDERS = ("orange", "africastalking", "infobip")

    def __init__(self):
        self.gateway_url = os.environ.get("USSD_GATEWAY_URL", "")
        self.api_key = os.environ.get("USSD_GATEWAY_API_KEY", "")
        self.service_code = os.environ.get("USSD_GATEWAY_SERVICE_CODE", "*144*99#")
        self.provider = os.environ.get("USSD_GATEWAY_PROVIDER", "orange").lower()

        self.is_configured = bool(self.gateway_url and self.api_key)

        if not self.is_configured:
            logger.warning(
                "[USSDGateway] Credentials absentes -> mode MOCK. "
                "Renseignez USSD_GATEWAY_URL et USSD_GATEWAY_API_KEY dans .env."
            )

    def _build_headers(self) -> dict:
        """Headers d'authentification selon le fournisseur."""
        if self.provider == "orange":
            return {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
        elif self.provider == "africastalking":
            return {
                "apiKey": self.api_key,
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            }
        else:
            return {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

    def _format_response(self, text: str, end_session: bool) -> dict:
        """Formate la réponse USSD selon le fournisseur."""
        if self.provider == "orange":
            return {
                "message": text,
                "msgtype": "2" if end_session else "1",
            }
        elif self.provider == "africastalking":
            prefix = "END " if end_session else "CON "
            return {"response": prefix + text}
        else:
            return {
                "text": text,
                "continue_session": not end_session,
            }

    async def send_response(
        self,
        session_id: str,
        phone_number: str,
        text: str,
        end_session: bool = False,
    ) -> dict:
        """Envoie une réponse USSD via la passerelle."""
        formatted = self._format_response(text, end_session)

        if not self.is_configured:
            logger.info(
                f"[USSDGateway][MOCK] session={session_id}, phone={phone_number}, "
                f"end={end_session}, text={text[:60]}..."
            )
            return {
                "success": True,
                "mock": True,
                "session_id": session_id,
                "response": formatted,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        payload = {
            "sessionId": session_id,
            "phoneNumber": phone_number,
            "serviceCode": self.service_code,
            **formatted,
        }

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    self.gateway_url,
                    json=payload,
                    headers=self._build_headers(),
                )

            if resp.status_code in (200, 201):
                logger.info(f"[USSDGateway] Response sent for session {session_id}")
                return {
                    "success": True,
                    "mock": False,
                    "session_id": session_id,
                    "provider_response": resp.json() if resp.text else {},
                }

            logger.error(
                f"[USSDGateway] Error {resp.status_code}: {resp.text}"
            )
            return {"success": False, "mock": False, "error": resp.text}

        except httpx.RequestError as e:
            logger.error(f"[USSDGateway] Network error: {e}")
            return {"success": False, "mock": False, "error": str(e)}

    async def register_service_code(self) -> dict:
        """Enregistre le code USSD auprès de la passerelle (optionnel)."""
        if not self.is_configured:
            logger.info(
                f"[USSDGateway][MOCK] Service code registration: {self.service_code}"
            )
            return {"success": True, "mock": True, "service_code": self.service_code}

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self.gateway_url}/register",
                    json={
                        "serviceCode": self.service_code,
                        "callbackUrl": os.environ.get("USSD_CALLBACK_URL", ""),
                    },
                    headers=self._build_headers(),
                )
            return {
                "success": resp.status_code in (200, 201),
                "mock": False,
                "response": resp.json() if resp.text else {},
            }
        except Exception as e:
            logger.error(f"[USSDGateway] Registration error: {e}")
            return {"success": False, "error": str(e)}

    def get_status(self) -> dict:
        return {
            "service": "ussd_gateway",
            "configured": self.is_configured,
            "mode": "production" if self.is_configured else "mock",
            "provider": self.provider,
            "service_code": self.service_code,
            "gateway_url": self.gateway_url or "(non configuré)",
        }


ussd_gateway_service = USSDGatewayService()
