<div align="center">

# FINEXA

### AI-Powered Financial Intelligence Platform

*Your AI CFO — Built for SMBs & Startups*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.147-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15.1.7-000000?logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?logo=python)](https://python.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3FCF8E?logo=supabase)](https://supabase.com/)

</div>

---

## What is FINEXA?

FINEXA is a full-stack financial intelligence platform that gives small businesses and startups the analytical power of a dedicated CFO — powered by AI agents, deterministic financial engines, and real-time data.

Built for **Novastack Technologies** (a 9-person US B2B startup), FINEXA handles everything from transaction management and invoicing to cash flow forecasting, what-if scenario simulation, and anomaly detection — all with **pure Python `Decimal` precision** and **zero floating-point arithmetic** for money.

---

## Core Capabilities

| Capability | Description |
|---|---|
| **📊 Financial Dashboard** | Real-time KPIs: cash balance, burn rate, runway, revenue growth, expense ratios — all Decimal-precise |
| **💰 Transaction Ledger** | Full CRUD, search, filter, sort, pagination, and CSV export with category breakdowns |
| **📄 Invoice Management** | Auto-numbered invoices (`INV-YYYY-NNNN`), line items, tax computation, branded PDF generation via ReportLab |
| **📈 Cash Flow Forecasting** | 30/90/180-day projections with daily burn trajectories, ±10%/±20% uncertainty cones, shortage/depletion detection |
| **🧪 What-If Simulator** | Pure Decimal scenarios: hiring expansion, OpEx surge, revenue shifts — before/after burn & runway comparison |
| **🤖 AI CFO Chat** | Multi-agent Gemini-powered chat with 11 financial tools, data-kind labelling (verified/calculated/forecast/assumption) |
| **🔍 Audit Agent** | Statistical anomaly detection on vendor transactions — flags deviations, never accuses fraud |
| **💳 PayPal Integration** | Orders v2 with idempotency, webhook signature verification, invoice settlement, and ledger reconciliation |
| **📑 Financial Reports** | P&L, Cash Flow Statement, Receivables Aging, Corporate Tax Estimate — PDF & CSV export |
| **🔔 Smart Notifications** | Overdue invoice alerts, runway contraction warnings, unread badge with mark-all-read |

---

## Tech Stack

### Backend
- **Framework**: FastAPI 0.147 (Python 3.13)
- **Database**: Supabase PostgreSQL with connection pooler (PgBouncer)
- **ORM**: SQLAlchemy 2.1 with Alembic migrations
- **Authentication**: Supabase Auth (JWT verification, no custom auth)
- **AI**: Google Gemini via `google-genai` SDK — multi-agent orchestration (no LangChain/LangGraph)
- **Financial Engine**: Pure Python `Decimal` arithmetic, `ROUND_HALF_UP` to 2dp
- **PDF Generation**: ReportLab 5.1 with branded FINEXA templates
- **Payments**: PayPal Orders v2 (sandbox), webhook signature verification

### Frontend
- **Framework**: Next.js 15.1.7 (App Router, TypeScript)
- **Styling**: Tailwind CSS 3.4 with shadcn/ui components
- **Data Grid**: AG Grid Community (FINEXA-themed, dark/light)
- **Auth**: `@supabase/ssr` for cookie-based session management
- **Charts**: Recharts for cash flow and forecast visualisations

### Infrastructure
- **Backend Hosting**: Render (web service + cron job)
- **Frontend Hosting**: Vercel
- **Database & Auth**: Supabase
- **File Storage**: Supabase Storage (invoices, reports buckets)

---

## Quick Start

### Prerequisites

- Python 3.13+
- Node.js 18+ and npm
- A [Supabase](https://supabase.com/) project (free tier works)
- (Optional) [Google AI Studio](https://aistudio.google.com/) API key for AI features
- (Optional) [PayPal Developer](https://developer.paypal.com/) sandbox for payments

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/finexa.git
cd finexa
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 2. Backend Setup

```bash
pip install -r backend/requirements.txt
alembic upgrade head
```

### 3. Seed Demo Data

```bash
# Start backend and hit seed endpoint
uvicorn backend.app.main:app --reload --port 8000

# In another terminal:
curl -X POST http://localhost:8000/api/demo/seed -H "Content-Type: application/json"
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 5. Open FINEXA

Navigate to [http://localhost:3000](http://localhost:3000) — sign up via Supabase Auth, then explore the dashboard with Novastack Technologies demo data.

---

## Demo Credentials & Benchmark Data

Once seeded, the platform loads **Novastack Technologies** (US B2B startup, 9 employees) with 12 months of deterministic financial data anchored at **31 October 2026**:

| Metric | Value |
|---|---|
| Initial Capital | $834,500.00 |
| Closing Cash Balance | $246,000.00 |
| Oct 2026 Revenue | $142,000.00 (+8.4% MoM) |
| Oct 2026 Expenses | $200,500.00 (+12.0% MoM) |
| Oct 2026 Net | -$58,500.00 |
| Trailing 3M Average Burn | $51,166.67 /month |
| Runway | 4.8 months |
| Outstanding Receivables | $94,000.00 |
| Overdue | $31,000.00 |

**Client Portfolio**: Meridian Systems, Pacific Logistics, Apex Health, Horizon Hospitality, Pulse Fintech, Summit Foods.

---

## Project Structure

```
finexa/
├── backend/
│   ├── app/
│   │   ├── agents/           # AI CFO multi-agent orchestration
│   │   ├── ai/               # Gemini client, tool registry, schemas
│   │   ├── financial_engine/  # Pure Decimal engine, forecasts, simulator
│   │   ├── jobs/             # Background cron jobs (daily overdue scan)
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── routers/          # FastAPI route handlers
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic layer
│   │   ├── config.py         # Pydantic Settings configuration
│   │   ├── database.py       # SQLAlchemy engine & session factory
│   │   ├── dependencies.py   # Auth, org, RBAC dependencies
│   │   └── main.py           # FastAPI application entry point
│   ├── alembic/              # Database migrations
│   ├── tests/                # Pytest test suite (48+ tests)
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/app/              # Next.js App Router pages
│   ├── src/components/       # React UI components (shadcn/ui)
│   ├── src/lib/              # API client, utilities
│   └── package.json          # Node.js dependencies
├── docs/                     # Extended documentation
├── supabase/                 # RLS policies, storage config
├── scripts/                  # Deployment scripts
├── render.yaml               # Render Blueprint IaC
├── Dockerfile                # Production container
└── .env.example              # Environment variable template
```

---

## Documentation

| Document | Description |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture deep dive |
| [API.md](./API.md) | Complete REST API reference |
| [SETUP.md](./SETUP.md) | Local development setup guide |
| [docs/PAYPAL.md](./docs/PAYPAL.md) | PayPal integration guide |
| [docs/FINANCIAL_DEFINITIONS.md](./docs/FINANCIAL_DEFINITIONS.md) | Financial metric definitions |
| [docs/SUPABASE_PRODUCTION_GUIDE.md](./docs/SUPABASE_PRODUCTION_GUIDE.md) | Production Supabase configuration |
| [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md) | 5-minute interactive demo walkthrough |

---

## Testing

```bash
# Run full backend test suite (48+ tests)
$env:PYTHONPATH="."; pytest backend/tests -v

# Run frontend production build verification
npm --prefix frontend run build
```

---

## Security

- **Dual-layer tenant isolation**: Application-level org scoping + Supabase Row Level Security (RLS)
- **Security headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`
- **AI rate limiting**: Sliding-window limiter (20 req/min per user, HTTP 429 with Retry-After)
- **JWT verification**: Supabase-issued tokens validated server-side
- **No custom auth**: All authentication delegated to Supabase Auth
- **Webhook integrity**: PayPal webhook signature verification via official API

---

## License

This project is built as a demonstration platform. See repository for license details.

