# FINEXA — PayPal Sandbox Integration Architecture

## 1. Overview
FINEXA integrates with the **PayPal REST API v2** to facilitate idempotent invoice settlements, automated payment captures, and real-time ledger reconciliation.

The payment gateway operates in **Sandbox mode** for development, automated testing, and demonstration, with seamless configuration switching to **Live mode** via environment variables.

---

## 2. Configuration & Environment Variables

PayPal credentials and operational parameters are configured in `.env` and accessed through `backend/app/config.py`:

```env
# PayPal Sandbox Configuration
PAYPAL_MODE=sandbox                          # "sandbox" or "live"
PAYPAL_CLIENT_ID=your_paypal_client_id       # REST App Client ID
PAYPAL_CLIENT_SECRET=your_paypal_secret      # REST App Secret
PAYPAL_WEBHOOK_ID=your_webhook_id            # Configured Sandbox Webhook ID
```

### Endpoints
- **Sandbox Base URL**: `https://api-m.sandbox.paypal.com`
- **Live Base URL**: `https://api-m.paypal.com`

---

## 3. Currency & Numerical Precision

- **Currency**: Strictly **USD ($)** across all orders, captures, webhooks, and ledger transactions.
- **Precision**: Monetary figures are handled using Python's `Decimal` type with fixed two-decimal precision (`0.01`). No floating-point math is used for financial amounts.

---

## 4. Payment Lifecycle & Idempotent Architecture

```
[Invoice Created] (Status: "Sent", Balance: $10,000)
       │
       ▼
[Initiate Payment] ───> POST /api/payments/create-order
       │                 └──> PayPal Orders v2 (intent: "CAPTURE")
       │                 └──> Header: PayPal-Request-Id (Idempotency)
       ▼
[Client Approves]
       │
       ▼
[Capture Order] ─────> POST /api/payments/capture-order (or Webhook)
       │                 └──> PayPal Orders v2 Capture
       │
       ▼
[Reconciliation Service] (payment_service.py)
       ├── 1. Update Invoice: amount_paid += $10,000, balance = $0.00, status = "Paid"
       ├── 2. Insert Payment Record (method: "paypal", status: "successful")
       ├── 3. Insert Transaction Record (type: "income", category: client_name)
       ├── 4. Append AuditLog Entry (action: "payment_captured")
       └── 5. Dispatch Event Notification (type: "payment_received")
```

---

## 5. Webhook Ingestion & Deduplication

### Ingestion Endpoint
`POST /api/webhooks/paypal`

### Deduplication Engine
PayPal may deliver webhook events multiple times. To guarantee idempotency:
1. Every incoming payload is keyed by its unique `id` (e.g., `WH-XXXX-XXXX`).
2. The database checks the `paypal_webhook_events` table for existing records with matching `event_id`.
3. If an existing record is found, the system immediately returns HTTP 200 with `status: "duplicate"` and skips processing.
4. If new, the event is recorded with status `"received"`, processed, and transitioned to `"processed"`.

### Supported Event Types
- `PAYMENT.CAPTURE.COMPLETED`: Settle invoice balance, create income transaction, log audit, and notify.
- `CHECKOUT.ORDER.APPROVED`: Log authorization.
- `INVOICING.INVOICE.PAID`: Reconcile external PayPal invoice payments.

### Signature Verification
- In live/configured environments, transmission headers (`PAYPAL-TRANSMISSION-ID`, `PAYPAL-TRANSMISSION-SIG`, `PAYPAL-CERT-URL`, `PAYPAL-AUTH-ALGO`) are verified against PayPal's verification endpoint: `/v1/notifications/verify-webhook-signature`.
- In demo/offline test modes, the engine provides graceful fallback verification.

---

## 6. API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/payments/status` | `GET` | Gateway configuration health, active mode, and masked Client ID |
| `/api/payments` | `GET` | Paginated list of recorded payments for current organisation |
| `/api/payments/create-order` | `POST` | Generate PayPal Orders v2 order for an outstanding invoice |
| `/api/payments/capture-order` | `POST` | Capture authorized PayPal order and execute ledger reconciliation |
| `/api/payments/demo-simulate` | `POST` | 1-click sandbox simulation for instant testing & demo flows |
| `/api/webhooks/paypal` | `POST` | Ingestion endpoint for PayPal webhook events with deduplication |

---

## 7. Testing & Sandbox Verification

The PayPal integration is covered by automated unit and integration tests:

```bash
$env:PYTHONPATH="."; pytest backend/tests/test_paypal.py -v
```

### Verified Test Cases:
1. **OAuth2 Token Caching**: In-memory caching, expiration detection, and token invalidation.
2. **Demo Order Lifecycle**: Creation, intent verification, and mock capture.
3. **Gateway Connection Status**: Accurate metadata reporting.
4. **Full Invoice Settlement**: Invoice balance drops to $0.00, status becomes `Paid`, and income Transaction is created.
5. **Partial Settlement**: Balance adjusts accurately and status becomes `Partially Paid`.
6. **Overpayment Guard**: Rejects payments exceeding remaining invoice balance.
7. **Duplicate Payment Guard**: Rejects payments against already paid invoices.
8. **Webhook Deduplication**: Repeated deliveries of identical event IDs cause zero duplicate ledger entries.
9. **Webhook Capture Processing**: Auto-reconciles invoice when capture webhook arrives.
10. **Full API Endpoint Flows**: Verifies status, listing, order creation, capture, and demo simulation.

