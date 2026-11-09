# FINEXA — System Architecture

This document provides a detailed technical deep-dive into FINEXA's architecture, covering the financial engine, multi-agent AI layer, data model, security design, and deployment topology.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Pure Decimal Financial Engine](#2-pure-decimal-financial-engine)
3. [Multi-Agent AI CFO Layer](#3-multi-agent-ai-cfo-layer)
4. [Database Design & Multi-Tenancy](#4-database-design--multi-tenancy)
5. [Authentication & Authorisation](#5-authentication--authorisation)
6. [Forecasting & Simulation Engine](#6-forecasting--simulation-engine)
7. [PayPal Orders v2 Integration](#7-paypal-orders-v2-integration)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Security Model](#9-security-model)
10. [Deployment Topology](#10-deployment-topology)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────┐
│         Vercel (CDN)            │
│      Next.js 15 Frontend        │
│   App Router · Tailwind · SSR   │
└──────────────┬──────────────────┘
               │ HTTPS (JWT in Authorization header)
               ▼
┌─────────────────────────────────┐
│        Render (Web Service)     │
│       FastAPI 0.147 Backend     │
│  Uvicorn · Security Headers     │
│  Request-ID · Structured Logs   │
├─────────────────────────────────┤
│  ┌──────────┐  ┌──────────────┐ │
│  │ Financial │  │  AI Agent    │ │
│  │  Engine   │  │  Layer       │ │
│  │ (Decimal) │  │ (Gemini)     │ │
│  └──────────┘  └──────────────┘ │
├─────────────────────────────────┤
│  ┌──────────┐  ┌──────────────┐ │
│  │ Forecast │  │  PayPal      │ │
│  │ & Sim    │  │  Client      │ │
│  └──────────┘  └──────────────┘ │
└──────────────┬──────────────────┘
               │ psycopg (pooled, SSL)
               ▼
┌─────────────────────────────────┐
│      Supabase (Managed)         │
│  PostgreSQL · Auth · Storage    │
│  PgBouncer · RLS Policies       │
└─────────────────────────────────┘
```

### Request Flow

1. User authenticates via **Supabase Auth** → receives JWT.
2. Frontend attaches JWT in `Authorization: Bearer <token>` header.
3. FastAPI `get_current_user` dependency validates JWT using `SUPABASE_JWT_SECRET`.
4. `get_current_org` resolves the user's organisation membership.
5. Every DB query is scoped to `current_org.id` (application-level isolation).
6. Supabase RLS provides defence-in-depth (database-level isolation).

---

## 2. Pure Decimal Financial Engine

Location: `backend/app/financial_engine/`

### Design Principles

- **Zero floating-point for money**: All monetary calculations use Python's `decimal.Decimal`.
- **`ROUND_HALF_UP` to 2 decimal places** at output boundaries (display, storage, API response).
- **Full precision** maintained in intermediate calculations.
- **Deterministic**: Given the same inputs, produces identical outputs across platforms and architectures.

### Engine Modules

| Module | Responsibility |
|---|---|
| `engine.py` | Core computations: revenue, expenses, net profit, cash flow, burn rate, runway, receivables |
| `ratios.py` | Financial ratios: profit margin, expense ratio, revenue growth, current ratio |
| `forecast.py` | 30/90/180-day forward projections with uncertainty cones |
| `simulator.py` | What-if scenario modelling with before/after comparisons |
| `models.py` | Data transfer objects for engine results |

### Key Computations

**Burn Rate** (trailing N-month average):
$$\text{Burn Rate} = \frac{\sum_{i=1}^{N} \text{Expenses}_i}{N}$$

**Runway**:
$$\text{Runway (months)} = \frac{\text{Liquid Cash}}{\text{Monthly Burn Rate}}$$

**Revenue Growth** (month-over-month):
$$\text{Growth} = \frac{\text{Current Revenue} - \text{Previous Revenue}}{\text{Previous Revenue}} \times 100$$

### Benchmark Anchors (31 Oct 2026)

| Metric | Exact Value |
|---|---|
| Closing Cash | $246,000.00 |
| Trailing 3M Burn | $51,166.67 |
| Runway | 4.8 months |
| Oct Revenue | $142,000.00 |
| Oct Expenses | $200,500.00 |

---

## 3. Multi-Agent AI CFO Layer

Location: `backend/app/agents/`, `backend/app/ai/`

### Architecture

FINEXA uses a **custom lightweight multi-agent orchestration** layer (no LangChain, no LangGraph — per spec requirements).

```
User Chat Message
       │
       ▼
┌─────────────────────┐
│  CFO Orchestrator    │
│  (Keyword Router +   │
│   Model Fallback)    │
└──────┬──────────────┘
       │ Routes to specialist
       ▼
┌──────────────────────────────────────────┐
│  ┌──────────┐  ┌───────────┐  ┌────────┐ │
│  │ CashFlow │  │  Invoice  │  │ Audit  │ │
│  │  Agent   │  │   Agent   │  │ Agent  │ │
│  └──────────┘  └───────────┘  └────────┘ │
│  ┌───────────┐                            │
│  │ Strategy  │                            │
│  │   Agent   │                            │
│  └───────────┘                            │
└──────────────────────────────────────────┘
       │
       ▼ Tool Calls (max 6 per request)
┌─────────────────────┐
│  11 Financial Tools  │
│  (Pydantic schemas,  │
│   org-scoped,        │
│   data_kind labels)  │
└─────────────────────┘
```

### Agent Specifications

| Agent | Purpose | Tool Allow-list |
|---|---|---|
| **CFO Orchestrator** | Routes queries, synthesises answers, handles general finance | All 11 tools |
| **Cash Flow Agent** | Cash position analysis, flow projections | `get_dashboard_summary`, `get_cashflow_timeline`, `get_forecast` |
| **Invoice Agent** | Invoice queries, draft creation (approval required) | `get_invoices`, `get_invoice_detail`, `create_invoice_draft` |
| **Audit Agent** | Anomaly detection — flags deviations, never accuses fraud | `get_transactions`, `get_expense_breakdown`, `detect_anomalies` |
| **Strategy Agent** | Forward-looking analysis using forecasts and simulations | `get_forecast`, `run_simulation`, `get_financial_ratios` |

### Data Kind Classification

Every tool output carries a `data_kind` label:

| Kind | Meaning | Example |
|---|---|---|
| `verified` | Direct from database, factual | Transaction amounts, invoice balances |
| `calculated` | Derived from verified data | Burn rate, runway, ratios |
| `forecast` | Forward projection with uncertainty | 90-day cash projection |
| `assumption` | User-provided scenario input | "Hire 2 engineers at $6k/month" |

### Human-in-the-Loop (Approval Queue)

High-impact agent actions (e.g., invoice creation) are written to `agent_executions` table with `status: pending_approval`. Users review and authorise/reject from the AI Agents page.

---

## 4. Database Design & Multi-Tenancy

### Entity-Relationship Overview

```
auth.users (Supabase Auth)
    │
    ▼ (1:1, auto-created by trigger)
profiles
    │
    ▼ (M:N via organisation_members)
organisations ──┬── transactions
                ├── customers ── invoices ── invoice_line_items
                ├── payments
                ├── audit_log
                ├── notifications
                ├── ai_conversations ── ai_messages
                ├── agent_executions
                ├── financial_scenarios
                ├── paypal_webhook_events
                └── webhook_deliveries
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| **UUID primary keys** | Distributed-safe, no sequential ID leaking, matches Supabase `auth.users.id` |
| **Soft delete for transactions** | Audit trail integrity; hard delete would break reconciliation |
| **`profiles` table** (not `users`) | Only stores app-specific data; Supabase Auth owns email/password/sessions |
| **`is_demo` flag on organisations** | Allows seed data cleanup without affecting real data |
| **Timestamp mixin** | `created_at` / `updated_at` on every table via `TimestampMixin` |

### Indexes

| Index | Purpose |
|---|---|
| `ix_transactions_org_date` | Fast transaction queries by organisation and date range |
| `ix_invoices_org_status_due` | Overdue invoice scans, status filtering |
| `ix_payments_org_date` | Payment ledger queries |

---

## 5. Authentication & Authorisation

### Authentication Flow

```
┌─────────┐     ┌──────────────┐     ┌──────────────┐
│ Browser │────▶│ Supabase Auth│────▶│   JWT Token  │
│         │     │ (signup/login│     │ (user_id in  │
│         │     │  OAuth, etc) │     │   sub claim) │
└─────────┘     └──────────────┘     └──────┬───────┘
                                            │
                                            ▼
                                    ┌──────────────┐
                                    │   FastAPI     │
                                    │ get_current_  │
                                    │ user(JWT)     │
                                    └──────┬───────┘
                                            │ Verify with SUPABASE_JWT_SECRET
                                            ▼
                                    ┌──────────────┐
                                    │ get_current_  │
                                    │ org(user_id)  │
                                    └──────────────┘
```

### RBAC Roles

| Role | Permissions |
|---|---|
| `owner` | Full access, org settings, member management |
| `admin` | CRUD on all financial data, approve agent actions |
| `member` | Read access, create transactions and invoices |

---

## 6. Forecasting & Simulation Engine

### Forecasting (`forecast.py`)

- **Input**: Organisation's transaction history, current cash balance, known receivables.
- **Output**: Day-by-day cash balance trajectory with uncertainty bands.
- **Horizons**: 30, 90, or 180 days.
- **Daily Burn**: Calculated from trailing 3-month average ($51,166.67/mo ÷ 30 = $1,705.56/day for Novastack).
- **Uncertainty Cones**: ±10% at 30 days, ±20% at 90 days (linear interpolation for intermediate).
- **Thresholds**: Warning at $150,000, depletion (cash ≤ $0) date detection.

### What-If Simulator (`simulator.py`)

Pure Decimal simulation engine supporting:

| Scenario Type | Parameters | Example Output |
|---|---|---|
| `hiring_expansion` | headcount, monthly salary | 2 hires @ $6k → burn $63,166.67, runway 3.9m |
| `opex_surge` | percentage increase | +15% → runway 3.1m |
| `revenue_shift` | percentage change | +20% → runway improvement |

---

## 7. PayPal Orders v2 Integration

Location: `backend/app/services/paypal_client.py`, `payment_service.py`

### Flow

```
Create Order → PayPal Sandbox → Capture Order → Webhook Event
     │                                              │
     ▼                                              ▼
Invoice: balance -= captured_amount          Deduplication check
Payment: amount_paid += captured_amount      (paypal_webhook_events)
Transaction: income record created                  │
                                                    ▼
                                            Idempotent processing
```

### Key Features

- **OAuth2 token caching** with in-memory TTL and pre-expiry refresh.
- **Idempotency**: `PayPal-Request-Id` header on order creation, webhook event deduplication via `paypal_webhook_events` table.
- **Webhook signature verification** via PayPal's `/v1/notifications/verify-webhook-signature` endpoint.
- **Overpay guard**: Capture amount capped at invoice balance.

---

## 8. Frontend Architecture

### Tech Stack

- **Next.js 15.1.7** with App Router (file-based routing)
- **TypeScript** with strict mode
- **Tailwind CSS** with CSS variables for theming (dark/light)
- **shadcn/ui** component library
- **AG Grid Community** with FINEXA-branded theme
- **Recharts** for data visualisation

### Route Map

| Route | Page |
|---|---|
| `/overview` | Financial dashboard with KPI cards |
| `/transactions` | Transaction ledger (AG Grid) |
| `/invoices` | Invoice management & PDF generation |
| `/cash-flow` | Cash flow velocity chart |
| `/forecasts` | Forecast charts & What-If simulator |
| `/reports` | P&L, Cash Flow, Aging reports (PDF/CSV) |
| `/ai-cfo` | AI CFO chat interface |
| `/ai-agents` | Agent status & approval queue |
| `/payments` | PayPal integration & payment ledger |
| `/settings` | Organisation settings |

### Component Architecture

- **Design System**: Shared tokens, KPI cards, status chips, data-kind labels.
- **Responsive**: Desktop sidebar + mobile bottom nav with 4 tabs.
- **AG Grid Wrapper**: FINEXA-themed, switches to card layout < 768px.
- **Floating AI Button**: Mobile FAB for quick AI CFO access.

---

## 9. Security Model

### Defence Layers

| Layer | Mechanism |
|---|---|
| **Transport** | HTTPS everywhere (Render auto-SSL, Supabase SSL) |
| **Authentication** | Supabase Auth JWT (no custom auth system) |
| **Application Isolation** | Every query filtered by `current_org.id` |
| **Database Isolation** | Supabase RLS policies on all org-scoped tables |
| **API Protection** | Sliding-window rate limiter on AI endpoints (20 req/min, HTTP 429) |
| **Security Headers** | `nosniff`, `DENY`, `XSS-Protection`, `Referrer-Policy` |
| **Webhook Integrity** | PayPal signature verification + deduplication |
| **Audit Trail** | All mutations logged in `audit_log` table |

### What FINEXA Does NOT Do

- No custom password hashing (Supabase handles it).
- No custom JWT signing (Supabase handles it).
- No `users` table (uses `profiles` FK to `auth.users`).
- Audit Agent never accuses fraud — only flags statistical deviations with factual reasons.

---

## 10. Deployment Topology

### Production

```
┌──────────┐     ┌──────────────┐     ┌────────────────┐
│  Vercel  │────▶│   Render     │────▶│   Supabase     │
│ (Next.js)│     │  (FastAPI)   │     │ (PostgreSQL +  │
│          │     │              │     │  Auth + Storage)│
│ CDN/Edge │     │ + Daily Cron │     │                │
└──────────┘     └──────────────┘     └────────────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   PayPal     │
                 │  Sandbox API │
                 └──────────────┘
```

### Infrastructure as Code

- **`render.yaml`**: Render Blueprint defining web service + cron job with all env vars.
- **`Dockerfile`**: Python 3.13 slim container with Uvicorn, health checks.
- **`scripts/start.sh`**: Alembic migrations → Uvicorn startup.
- **`supabase/rls_policies.sql`**: All RLS policies, applied via SQL Editor.

