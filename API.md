# FINEXA — REST API Reference

Complete endpoint reference for the FINEXA Financial Intelligence API. All endpoints are prefixed with `/api`.

**Base URL**: `http://localhost:8000` (development) or `https://finexa-backend.onrender.com` (production)

**Authentication**: Supabase-issued JWT in `Authorization: Bearer <token>` header.

---

## Table of Contents

1. [Health](#health)
2. [Authentication](#authentication)
3. [Organisations](#organisations)
4. [Dashboard](#dashboard)
5. [Transactions](#transactions)
6. [Invoices](#invoices)
7. [AI CFO & Agents](#ai-cfo--agents)
8. [Forecasting & Simulator](#forecasting--simulator)
9. [Reports](#reports)
10. [Notifications](#notifications)
11. [Payments & Collections](#payments--collections)
12. [Webhooks](#webhooks)
13. [Demo](#demo)

---

## Health

### `GET /api/health`

Health check returning database and Supabase connectivity status.

**Auth Required**: No

**Response** `200 OK`:
```json
{
  "status": "healthy",
  "database": "connected",
  "supabase": "connected"
}
```

---

## Authentication

### `GET /api/auth/me`

Get the current user's profile and organisation memberships.

**Auth Required**: Yes

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Shrey Patel",
  "avatar_url": null,
  "organisations": [
    {
      "id": "uuid",
      "name": "Novastack Technologies",
      "role": "owner",
      "currency": "USD"
    }
  ]
}
```

### `PATCH /api/auth/profile`

Update current user's profile (name, avatar).

**Auth Required**: Yes

**Request Body**:
```json
{
  "full_name": "Updated Name",
  "avatar_url": "https://..."
}
```

### `POST /api/auth/onboard`

Create a profile and organisation for a first-time user after Supabase Auth signup.

**Auth Required**: Yes

**Request Body**:
```json
{
  "full_name": "Shrey Patel",
  "org_name": "Novastack Technologies"
}
```

**Response** `201 Created`:
```json
{
  "profile": { "id": "uuid", "full_name": "Shrey Patel" },
  "organisation": { "id": "uuid", "name": "Novastack Technologies" }
}
```

---

## Organisations

### `GET /api/organisations/current`

Get the current organisation's details.

**Auth Required**: Yes

### `PATCH /api/organisations/current`

Update organisation name, currency, or settings. Requires `owner` or `admin` role.

### `GET /api/organisations/current/members`

List all members of the current organisation.

### `POST /api/organisations/current/members/invite`

Invite a new member. Requires `owner` or `admin` role.

**Request Body**:
```json
{
  "email": "newmember@example.com",
  "role": "member"
}
```

---

## Dashboard

### `GET /api/dashboard/summary`

Financial summary KPIs for the current organisation.

**Auth Required**: Yes

**Query Parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `period` | string | `30d` | Time period: `7d`, `30d`, `90d`, `12m` |

**Response** `200 OK`:
```json
{
  "total_revenue": "142000.00",
  "total_expenses": "200500.00",
  "net_profit": "-58500.00",
  "liquid_cash": "246000.00",
  "monthly_burn": "51166.67",
  "runway_months": "4.8",
  "runway_display": "4.8 months",
  "revenue_growth": "8.4",
  "expense_growth": "12.0",
  "outstanding_receivables": "94000.00",
  "overdue_receivables": "31000.00"
}
```

### `GET /api/dashboard/cashflow`

Time-series cash flow data points.

**Auth Required**: Yes

**Query Parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `period` | string | `30d` | Time period: `7d`, `30d`, `90d`, `12m` |

**Response** `200 OK`:
```json
{
  "period": "30d",
  "opening_balance": "304500.00",
  "closing_balance": "246000.00",
  "total_inflow": "142000.00",
  "total_outflow": "200500.00",
  "points": [
    {
      "date": "2026-10-01",
      "inflow": "5000.00",
      "outflow": "8500.00",
      "balance": "301000.00"
    }
  ]
}
```

---

## Transactions

### `GET /api/transactions`

List transactions with filtering, search, and pagination.

**Auth Required**: Yes

**Query Parameters**:
| Parameter | Type | Description |
|---|---|---|
| `search` | string | Search in description, vendor, category |
| `category` | string | Filter by category |
| `type` | string | `income` or `expense` |
| `start_date` | date | Filter from date (YYYY-MM-DD) |
| `end_date` | date | Filter to date (YYYY-MM-DD) |
| `page` | int | Page number (default: 1) |
| `size` | int | Page size (default: 50) |

### `POST /api/transactions`

Create a new transaction. Requires `owner` or `admin` role.

**Auth Required**: Yes

**Request Body**:
```json
{
  "date": "2026-10-15",
  "type": "expense",
  "category": "Payroll",
  "description": "October salaries",
  "vendor": "Internal",
  "amount": "85000.00"
}
```

### `GET /api/transactions/export/csv`

Export transactions as RFC 4180 CSV file.

### `GET /api/transactions/{tx_id}`

Get a single transaction by UUID.

### `PATCH /api/transactions/{tx_id}`

Update transaction fields. Requires `owner` or `admin` role.

### `DELETE /api/transactions/{tx_id}`

Soft-delete a transaction (sets `is_deleted` flag). Returns `204 No Content`.

---

## Invoices

### `GET /api/invoices`

List invoices with outstanding and overdue totals.

**Auth Required**: Yes

**Query Parameters**:
| Parameter | Type | Description |
|---|---|---|
| `status` | string | Filter by status: `Draft`, `Sent`, `Paid`, `Overdue`, `Cancelled` |

**Response** `200 OK`:
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-2026-0001",
      "customer_name": "Meridian Systems",
      "status": "Sent",
      "total": "25000.00",
      "amount_paid": "0.00",
      "balance": "25000.00",
      "issue_date": "2026-10-01",
      "due_date": "2026-10-31"
    }
  ],
  "total_outstanding": "94000.00",
  "total_overdue": "31000.00"
}
```

### `POST /api/invoices`

Create a new draft invoice with line items. Returns `201 Created`.

**Request Body**:
```json
{
  "customer_id": "uuid",
  "issue_date": "2026-11-01",
  "due_date": "2026-11-30",
  "tax_rate": "0.00",
  "notes": "November services",
  "line_items": [
    {
      "description": "Consulting - 40 hours",
      "quantity": 40,
      "unit_price": "150.00"
    }
  ]
}
```

### `GET /api/invoices/{inv_id}`

Get a single invoice with line items.

### `GET /api/invoices/{inv_id}/pdf`

Download a branded PDF invoice generated by ReportLab. Returns `application/pdf`.

---

## AI CFO & Agents

### `POST /api/ai/chat`

Send a message to the AI CFO Orchestrator. Rate-limited to 20 requests/minute.

**Auth Required**: Yes

**Request Body**:
```json
{
  "message": "What is our current runway?",
  "conversation_id": "uuid (optional - creates new if omitted)"
}
```

**Response** `200 OK`:
```json
{
  "conversation_id": "uuid",
  "response": "Based on your current cash balance of $246,000.00 and trailing 3-month burn rate of $51,166.67/month, Novastack Technologies has approximately 4.8 months of runway.",
  "tool_calls": ["get_dashboard_summary"],
  "data_kind": "calculated",
  "tokens_used": 450,
  "latency_ms": 2100
}
```

**Error** `429 Too Many Requests`:
```json
{
  "detail": "AI rate limit exceeded. Maximum 20 requests per minute.",
  "retry_after": 60
}
```

### `GET /api/ai/conversations`

List recent AI conversations (max 20).

### `GET /api/ai/conversations/{conversation_id}/messages`

Get message history for a specific conversation.

### `GET /api/ai/agents/executions`

List agent execution runs and pending approval items (max 30).

### `POST /api/ai/approvals/{execution_id}/action`

Approve or reject a pending agent action.

**Request Body**:
```json
{
  "action": "approve"
}
```

### `POST /api/ai/agents/run/{agent_name}`

Trigger an on-demand agent run. Valid agent names: `audit`, `cashflow`, `strategy`, `invoice`.

---

## Forecasting & Simulator

### `GET /api/forecasts`

Cash flow projection with uncertainty cone and shortage detection.

**Auth Required**: Yes

**Query Parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `horizon` | int | `90` | Forecast horizon in days (7–180) |

**Response** `200 OK`:
```json
{
  "horizon_days": 90,
  "anchor_date": "2026-10-31",
  "current_cash": "246000.00",
  "daily_burn": "1705.56",
  "monthly_burn": "51166.67",
  "depletion_date": "2027-03-15",
  "warning_date": "2027-01-28",
  "points": [
    {
      "date": "2026-10-31",
      "projected": "246000.00",
      "upper_bound": "246000.00",
      "lower_bound": "246000.00"
    }
  ],
  "assumptions": [
    "Burn rate based on trailing 3-month average",
    "No additional revenue assumed beyond known receivables"
  ]
}
```

### `POST /api/forecasts/simulate`

Run a what-if scenario simulation.

**Request Body**:
```json
{
  "scenario_type": "hiring_expansion",
  "params": {
    "new_hires": 2,
    "monthly_salary": "6000.00"
  }
}
```

**Response** `200 OK`:
```json
{
  "scenario_type": "hiring_expansion",
  "before": {
    "monthly_burn": "51166.67",
    "runway_months": "4.8",
    "risk_level": "moderate"
  },
  "after": {
    "monthly_burn": "63166.67",
    "runway_months": "3.9",
    "risk_level": "high"
  },
  "delta": {
    "burn_change": "+12000.00",
    "runway_change": "-0.9"
  },
  "explanation": "Hiring 2 employees at $6,000/month increases monthly burn by $12,000.00, reducing runway from 4.8 to 3.9 months."
}
```

### `POST /api/forecasts/scenarios/save`

Save a simulation scenario for later reference. Returns `201 Created`.

### `GET /api/forecasts/scenarios`

List saved what-if scenarios.

---

## Reports

### `GET /api/reports`

Structured JSON report data.

**Auth Required**: Yes

**Query Parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `type` | string | `pnl` | Report type: `pnl`, `cashflow`, `receivables`, `tax` |
| `period` | string | `30d` | Time period |

### `GET /api/reports/pdf`

Download a branded PDF report. Returns `application/pdf`.

**Query Parameters**: Same as `GET /api/reports`.

### `GET /api/reports/csv`

Download an RFC 4180 CSV report export.

**Query Parameters**: Same as `GET /api/reports`.

---

## Notifications

### `GET /api/notifications`

List recent notifications with unread count.

**Auth Required**: Yes

**Query Parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | int | `50` | Max notifications to return (1–100) |

**Response** `200 OK`:
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "invoice_overdue",
      "title": "Invoice Overdue: INV-2026-0003",
      "message": "Invoice INV-2026-0003 for $15000.00 was due on 2026-09-30.",
      "is_read": false,
      "created_at": "2026-10-31T00:00:00Z"
    }
  ],
  "unread_count": 3
}
```

### `POST /api/notifications/{notification_id}/read`

Mark a single notification as read.

### `POST /api/notifications/read-all`

Mark all unread notifications as read.

### `POST /api/notifications/check-triggers`

Explicitly run system event checks (overdue invoices, runway contraction).

---

## Payments & Collections

### `GET /api/payments/status`

Check PayPal gateway configuration status.

**Auth Required**: No

**Response** `200 OK`:
```json
{
  "paypal_configured": true,
  "mode": "sandbox"
}
```

### `GET /api/payments`

List all payments for the current organisation.

**Auth Required**: Yes

**Query Parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | int | `50` | Max payments |
| `offset` | int | `0` | Pagination offset |

### `POST /api/payments/create-order`

Create a PayPal order for an unpaid invoice.

**Auth Required**: Yes

**Request Body**:
```json
{
  "invoice_id": "uuid"
}
```

### `POST /api/payments/capture-order`

Capture a PayPal order and reconcile with the invoice ledger.

**Request Body**:
```json
{
  "order_id": "PAYPAL_ORDER_ID",
  "invoice_id": "uuid"
}
```

### `POST /api/payments/demo-simulate`

Simulate a full payment lifecycle for an invoice (sandbox/demo mode only).

**Request Body**:
```json
{
  "invoice_id": "uuid"
}
```

---

## Webhooks

### `POST /api/webhooks/paypal`

Receive and process PayPal webhook events. Deduplicates via `paypal_webhook_events` table.

**Auth Required**: No (external webhook — verified via PayPal signature)

**Supported Events**:
- `PAYMENT.CAPTURE.COMPLETED` — Settles invoice balance, creates income transaction.

---

## Demo

### `POST /api/demo/reset`

Reset the demo organisation to Novastack Technologies benchmark data. Only works for organisations with `is_demo = true`. Requires `owner` or `admin` role.

**Auth Required**: Yes

---

## Error Responses

All errors follow a consistent format:

```json
{
  "detail": "Human-readable error message",
  "error_code": "ERROR_CODE",
  "request_id": "uuid"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `204` | No Content (successful delete) |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (missing/invalid JWT) |
| `403` | Forbidden (insufficient role) |
| `404` | Not Found |
| `429` | Too Many Requests (AI rate limit) |
| `500` | Internal Server Error |

---

## Interactive Documentation

FastAPI provides auto-generated interactive API docs:

- **Swagger UI**: `/docs`
- **ReDoc**: `/redoc`
- **OpenAPI JSON**: `/docs/openapi.json`

