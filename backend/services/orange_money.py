"""
Orange Money CI - Service de Paiement
Documentation: https://developer.orange.com/apis/om-webpay

Flow OAuth 2.0:
1. Obtenir un access_token via client_credentials
2. Utiliser le token pour initier un paiement webpay
3. Recevoir la notification via webhook

Ce service fonctionne en mode MOCK quand les credentials sont absents.
"""

import os
import base64
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class OrangeMoneyService:
    TOKEN_PATH = "/oauth/v3/token"

    def __init__(self):
        self.client_id = os.environ.get("ORANGE_MONEY_CLIENT_ID", "")
        self.client_secret = os.environ.get("ORANGE_MONEY_CLIENT_SECRET", "")
        self.merchant_key = os.environ.get("ORANGE_MERCHANT_KEY", "")
        self.api_url = os.environ.get(
            "ORANGE_MONEY_API_URL",
            "https://api.orange.com/orange-money-webpay/dev/v1",
        )
        self.base_api = "https://api.orange.com"

        self.is_configured = bool(
            self.client_id and self.client_secret and self.merchant_key
        )
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

        if not self.is_configured:
            logger.warning(
                "[OrangeMoney] Credentials absentes -> mode MOCK actif. "
                "Renseignez ORANGE_MONEY_CLIENT_ID, ORANGE_MONEY_CLIENT_SECRET "
                "et ORANGE_MERCHANT_KEY dans .env pour activer le mode production."
            )

    # ---- OAuth 2.0 ----

    async def _get_access_token(self) -> str:
        if (
            self._access_token
            and self._token_expires_at
            and datetime.now(timezone.utc) < self._token_expires_at - timedelta(minutes=5)
        ):
            return self._access_token

        auth_header = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.base_api}{self.TOKEN_PATH}",
                headers={
                    "Authorization": f"Basic {auth_header}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={"grant_type": "client_credentials"},
            )

        if resp.status_code != 200:
            logger.error(f"[OrangeMoney] Token error {resp.status_code}: {resp.text}")
            raise Exception(f"Orange OAuth failed: {resp.status_code}")

        data = resp.json()
        self._access_token = data["access_token"]
        self._token_expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=data.get("expires_in", 3600)
        )
        logger.info("[OrangeMoney] Access token obtained")
        return self._access_token

    # ---- Paiement ----

    async def initiate_payment(
        self,
        order_id: str,
        amount: float,
        customer_phone: str,
        merchant_reference: str,
        return_url: str,
        cancel_url: str,
        notification_url: str,
    ) -> dict:
        if not self.is_configured:
            token = f"SIM_{uuid.uuid4().hex[:12].upper()}"
            logger.info(
                f"[OrangeMoney][MOCK] Paiement initié: {merchant_reference}, "
                f"montant={amount} XOF, tel={customer_phone}"
            )
            return {
                "status": "initiated",
                "token": token,
                "payment_url": f"/payment/simulate/{token}",
                "message": "Mode simulation - Cliquez pour simuler le paiement",
                "mock": True,
            }

        access_token = await self._get_access_token()

        payload = {
            "merchant_key": self.merchant_key,
            "currency": "XOF",
            "order_id": order_id,
            "amount": int(amount),
            "return_url": return_url,
            "cancel_url": cancel_url,
            "notif_url": notification_url,
            "reference": merchant_reference,
            "lang": "fr",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.api_url}/webpayment",
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )

        if resp.status_code in (200, 201):
            logger.info(f"[OrangeMoney] Paiement initié: {merchant_reference}")
            data = resp.json()
            data["mock"] = False
            return data

        logger.error(f"[OrangeMoney] Erreur {resp.status_code}: {resp.text}")
        raise Exception(f"Orange Money API error: {resp.status_code}")

    async def check_transaction_status(self, merchant_reference: str) -> dict:
        if not self.is_configured:
            logger.info(f"[OrangeMoney][MOCK] Status check: {merchant_reference}")
            return {"status": "unknown", "mock": True}

        access_token = await self._get_access_token()

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.api_url}/transactionstatus",
                json={
                    "merchant_key": self.merchant_key,
                    "reference": merchant_reference,
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )

        if resp.status_code == 200:
            return resp.json()

        logger.error(f"[OrangeMoney] Status error: {resp.status_code}")
        raise Exception("Erreur vérification statut Orange Money")

    def get_status(self) -> dict:
        return {
            "service": "orange_money",
            "configured": self.is_configured,
            "mode": "production" if self.is_configured else "mock",
            "api_url": self.api_url,
        }


orange_money_service = OrangeMoneyService()
