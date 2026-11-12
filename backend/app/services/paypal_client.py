"""
PayPal REST v2 Client for FINEXA.
Handles OAuth2 token caching, Orders v2 create/capture, and webhook signature verification.
Environment: sandbox (default) or live, controlled by PAYPAL_MODE.
"""

import time
import logging
from decimal import Decimal
from typing import Any, Dict, Optional
import httpx

from backend.app.config import settings

logger = logging.getLogger("finexa-paypal")

TWO_PLACES = Decimal("0.01")

# Endpoint mapping
PAYPAL_ENDPOINTS = {
    "sandbox": "https://api-m.sandbox.paypal.com",
    "live": "https://api-m.paypal.com",
}


class PayPalTokenCache:
    """In-memory OAuth2 token cache with automatic pre-expiry refresh."""

    def __init__(self) -> None:
        self._access_token: Optional[str] = None
        self._expires_at: float = 0.0

    @property
    def is_valid(self) -> bool:
        return self._access_token is not None and time.time() < (self._expires_at - 60)

    @property
    def token(self) -> Optional[str]:
        return self._access_token if self.is_valid else None

    def store(self, access_token: str, expires_in: int) -> None:
        self._access_token = access_token
        self._expires_at = time.time() + expires_in

    def invalidate(self) -> None:
        self._access_token = None
        self._expires_at = 0.0


_token_cache = PayPalTokenCache()


def _get_base_url() -> str:
    mode = settings.PAYPAL_MODE.lower()
    return PAYPAL_ENDPOINTS.get(mode, PAYPAL_ENDPOINTS["sandbox"])


def _is_configured() -> bool:
    return bool(settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET)


def get_connection_status() -> Dict[str, Any]:
    """Return current PayPal gateway configuration status."""
    configured = _is_configured()
    mode = settings.PAYPAL_MODE.lower()
    return {
        "configured": configured,
        "mode": mode,
        "client_id_masked": (
            settings.PAYPAL_CLIENT_ID[:8] + "..." + settings.PAYPAL_CLIENT_ID[-4:]
            if len(settings.PAYPAL_CLIENT_ID) > 12
            else "Not Set"
        ),
        "webhook_id_configured": bool(settings.PAYPAL_WEBHOOK_ID),
        "base_url": _get_base_url(),
        "status": "connected" if configured else "not_configured",
    }


async def get_access_token() -> str:
    """Obtain OAuth2 access token with caching."""
    cached = _token_cache.token
    if cached:
        return cached

    if not _is_configured():
        raise PayPalError("PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.")

    base_url = _get_base_url()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{base_url}/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET),
            headers={"Accept": "application/json", "Accept-Language": "en_US"},
            timeout=15.0,
        )
        if resp.status_code != 200:
            logger.error(f"PayPal OAuth failed: {resp.status_code} {resp.text}")
            raise PayPalError(f"OAuth2 token request failed with status {resp.status_code}")

        data = resp.json()
        access_token = data["access_token"]
        expires_in = data.get("expires_in", 32400)
        _token_cache.store(access_token, expires_in)
        logger.info("PayPal OAuth2 token obtained and cached.")
        return access_token


async def create_order(
    invoice_number: str,
    amount: Decimal,
    currency: str = "USD",
    description: str = "",
    return_url: str = "http://localhost:3000/payments?status=success",
    cancel_url: str = "http://localhost:3000/payments?status=cancelled",
    idempotency_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Create PayPal Orders v2 order with CAPTURE intent."""
    token = await get_access_token()
    base_url = _get_base_url()
    if not isinstance(amount, Decimal):
        amount = Decimal(str(amount))

    order_payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "reference_id": invoice_number,
                "description": description or f"FINEXA Invoice {invoice_number}",
                "amount": {
                    "currency_code": currency,
                    "value": str(amount.quantize(TWO_PLACES)),
                },
                "invoice_id": invoice_number,
            }
        ],
        "application_context": {
            "brand_name": "FINEXA Financial Intelligence",
            "landing_page": "BILLING",
            "user_action": "PAY_NOW",
            "return_url": return_url,
            "cancel_url": cancel_url,
        },
    }

    headers: Dict[str, str] = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    if idempotency_key:
        headers["PayPal-Request-Id"] = idempotency_key

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{base_url}/v2/checkout/orders",
            json=order_payload,
            headers=headers,
            timeout=30.0,
        )

    if resp.status_code not in (200, 201):
        logger.error(f"PayPal create_order failed: {resp.status_code} {resp.text}")
        raise PayPalError(f"Order creation failed: {resp.status_code}")

    data = resp.json()
    approve_url = None
    for link in data.get("links", []):
        if link.get("rel") == "approve":
            approve_url = link["href"]
            break

    return {
        "order_id": data["id"],
        "status": data["status"],
        "approve_url": approve_url,
        "approval_url": approve_url,
        "raw": data,
    }


async def capture_order(order_id: str) -> Dict[str, Any]:
    """Capture an approved PayPal order, finalising the payment."""
    token = await get_access_token()
    base_url = _get_base_url()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{base_url}/v2/checkout/orders/{order_id}/capture",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
            json={},
            timeout=30.0,
        )

    if resp.status_code not in (200, 201):
        logger.error(f"PayPal capture_order failed: {resp.status_code} {resp.text}")
        raise PayPalError(f"Order capture failed: {resp.status_code}")

    data = resp.json()

    # Extract capture details from first purchase unit
    capture_info: Dict[str, Any] = {}
    purchase_units = data.get("purchase_units", [])
    if purchase_units:
        captures = purchase_units[0].get("payments", {}).get("captures", [])
        if captures:
            cap = captures[0]
            capture_info = {
                "capture_id": cap["id"],
                "amount": cap["amount"]["value"],
                "currency": cap["amount"]["currency_code"],
                "status": cap["status"],
                "invoice_id": purchase_units[0].get("invoice_id"),
                "reference_id": purchase_units[0].get("reference_id"),
            }

    return {
        "order_id": data["id"],
        "order_status": data["status"],
        "capture": capture_info,
        "raw": data,
    }


async def verify_webhook_signature(
    headers: Dict[str, str],
    body: bytes,
) -> bool:
    """Verify PayPal webhook signature using the PayPal verification API."""
    webhook_id = settings.PAYPAL_WEBHOOK_ID
    if not webhook_id:
        logger.warning("PAYPAL_WEBHOOK_ID not configured — skipping signature verification in sandbox mode.")
        return True  # Allow in sandbox when webhook ID is not set

    token = await get_access_token()
    base_url = _get_base_url()

    import json

    verify_payload = {
        "auth_algo": headers.get("paypal-auth-algo", ""),
        "cert_url": headers.get("paypal-cert-url", ""),
        "transmission_id": headers.get("paypal-transmission-id", ""),
        "transmission_sig": headers.get("paypal-transmission-sig", ""),
        "transmission_time": headers.get("paypal-transmission-time", ""),
        "webhook_id": webhook_id,
        "webhook_event": json.loads(body),
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{base_url}/v1/notifications/verify-webhook-signature",
            json=verify_payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=15.0,
        )

    if resp.status_code != 200:
        logger.error(f"PayPal webhook verification request failed: {resp.status_code}")
        return False

    result = resp.json()
    status = result.get("verification_status", "")
    verified = status == "SUCCESS"
    if not verified:
        logger.warning(f"PayPal webhook signature verification failed: {status}")
    return verified


# Synchronous versions for test/demo mode (no real PayPal calls)

def create_demo_order(
    invoice_number: str,
    amount: Decimal,
    currency: str = "USD",
) -> Dict[str, Any]:
    """Create a simulated PayPal order for demo/test mode."""
    import uuid as _uuid

    order_id = f"DEMO-{_uuid.uuid4().hex[:12].upper()}"
    return {
        "order_id": order_id,
        "status": "APPROVED",
        "approve_url": None,
        "demo": True,
    }


def capture_demo_order(order_id: str, amount: Decimal) -> Dict[str, Any]:
    """Simulate capturing a demo order."""
    import uuid as _uuid

    capture_id = f"DEMO-CAP-{_uuid.uuid4().hex[:10].upper()}"
    return {
        "order_id": order_id,
        "order_status": "COMPLETED",
        "capture": {
            "capture_id": capture_id,
            "amount": str(amount.quantize(TWO_PLACES)),
            "currency": "USD",
            "status": "COMPLETED",
        },
        "demo": True,
    }


class PayPalError(Exception):
    """Custom exception for PayPal API errors."""
    pass

