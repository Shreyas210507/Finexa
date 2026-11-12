"""
Zapier Outbound Webhook Dispatcher Service for FINEXA.
Dispatches HMAC-SHA256 signed event payloads to user-configured Zapier Webhook Catchers.
Logs all deliveries into the WebhookDelivery table for audit compliance.
"""

import hmac
import hashlib
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.integration import WebhookDelivery

logger = logging.getLogger("finexa-zapier")


def generate_hmac_signature(secret: str, payload_str: str) -> str:
    """Generate SHA256 HMAC signature of payload string using the configured secret."""
    key = secret.encode("utf-8")
    msg = payload_str.encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


async def dispatch_zapier_webhook(
    db: Session,
    org_id: uuid.UUID,
    event_type: str,
    payload: Dict[str, Any],
    webhook_url: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Dispatches an event to the configured Zapier webhook URL with HMAC signature.
    Records delivery attempt and response code into the database.
    """
    target_url = webhook_url or "https://hooks.zapier.com/hooks/catch/finexa-demo/"
    secret = settings.ZAPIER_SIGNING_SECRET or "finexa_zapier_signing_key_2026"

    # Envelope payload
    envelope = {
        "event": event_type,
        "delivery_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "organisation_id": str(org_id),
        "data": payload,
    }

    payload_json = json.dumps(envelope, sort_keys=True)
    signature = generate_hmac_signature(secret, payload_json)

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "FINEXA-Webhook-Dispatcher/1.0",
        "X-Finexa-Event": event_type,
        "X-Finexa-Delivery-ID": envelope["delivery_id"],
        "X-Finexa-Signature": f"sha256={signature}",
        "X-Finexa-Timestamp": envelope["timestamp"],
    }

    # Record pending delivery in DB
    delivery = WebhookDelivery(
        id=uuid.UUID(envelope["delivery_id"]),
        organisation_id=org_id,
        event_type=event_type,
        payload=envelope,
        url=target_url,
        status="pending",
        attempts=1,
        last_attempt_at=datetime.now(timezone.utc),
    )
    db.add(delivery)
    db.commit()

    # Dispatch via httpx async client
    status_code: Optional[int] = None
    error_msg: Optional[str] = None
    latency_ms = 0.0

    start_time = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(target_url, content=payload_json, headers=headers)
            status_code = resp.status_code
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            if resp.is_success or resp.status_code in (200, 201, 202):
                delivery.status = "delivered"
                delivery.response_code = status_code
            else:
                delivery.status = "failed"
                delivery.response_code = status_code
                delivery.error = f"HTTP {status_code}: {resp.text[:200]}"
    except Exception as e:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        error_msg = str(e)
        delivery.status = "failed"
        delivery.error = error_msg[:500]
        logger.warning(f"Failed to dispatch Zapier webhook to {target_url}: {e}")

    db.commit()

    return {
        "delivery_id": envelope["delivery_id"],
        "event_type": event_type,
        "url": target_url,
        "status": delivery.status,
        "response_code": status_code,
        "latency_ms": latency_ms,
        "error": error_msg,
        "signature_header": f"sha256={signature[:12]}...",
    }

