# FINEXA — Local Development Setup Guide

Step-by-step guide to set up the FINEXA platform for local development.

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Python** | 3.13+ | Backend runtime |
| **Node.js** | 18+ | Frontend runtime |
| **npm** | 9+ | Frontend package manager |
| **Git** | 2.40+ | Version control |

### Optional (for full feature set)

| Tool | Purpose |
|---|---|
| [Supabase Account](https://supabase.com/) | Auth + PostgreSQL + Storage (free tier works) |
| [Google AI Studio](https://aistudio.google.com/) | Gemini API key for AI CFO features |
| [PayPal Developer](https://developer.paypal.com/) | Sandbox credentials for payment integration |

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/finexa.git
cd finexa
```

---

## Step 2: Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Backend - Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql+psycopg://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
CORS_ORIGINS=http://localhost:3000
DEMO_MODE=true

# Backend - Optional (AI features)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
AI_RATE_LIMIT_PER_MINUTE=20
AI_MAX_TOOL_CALLS=6
AI_MAX_OUTPUT_TOKENS=1200

# Backend - Optional (PayPal sandbox)
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_WEBHOOK_ID=your-webhook-id

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Where to Find These Values

| Variable | Location |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Settings → API → JWT Settings → JWT Secret |
| `DATABASE_URL` | Supabase Dashboard → Settings → Database → Connection String (pooler, port 6543) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon public key |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) → Create API Key |
| `PAYPAL_CLIENT_ID` / `SECRET` | [PayPal Developer](https://developer.paypal.com/) → My Apps & Credentials → Sandbox |

---

## Step 3: Supabase Project Setup

### 3a. Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Choose a name, set a strong database password, select region.
4. Wait for project provisioning (~2 minutes).

### 3b. Apply Database Migrations

From the project root:

```bash
pip install -r backend/requirements.txt
alembic upgrade head
```

This creates all tables: `profiles`, `organisations`, `organisation_members`, `transactions`, `customers`, `invoices`, `invoice_line_items`, `payments`, `audit_log`, `notifications`, `ai_conversations`, `ai_messages`, `agent_executions`, `financial_scenarios`, `paypal_webhook_events`, `webhook_deliveries`.

### 3c. Apply RLS Policies

Open the Supabase SQL Editor and paste the contents of [`supabase/rls_policies.sql`](../supabase/rls_policies.sql).

### 3d. Create Auth Trigger

In the SQL Editor, run:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3e. Configure Auth Redirect URLs

Navigate to **Authentication → URL Configuration** and add:
- `http://localhost:3000`
- `http://localhost:3000/**`

### 3f. Create Storage Buckets

Navigate to **Storage** and create two private buckets:
- `invoices`
- `reports`

---

## Step 4: Start the Backend

```bash
# From project root
uvicorn backend.app.main:app --reload --port 8000
```

Verify: Open [http://localhost:8000/api/health](http://localhost:8000/api/health) — should return:
```json
{ "status": "healthy", "database": "connected", "supabase": "connected" }
```

### API Documentation

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Step 5: Seed Demo Data

With the backend running, seed the Novastack Technologies demo data:

```bash
curl -X POST http://localhost:8000/api/demo/seed \
  -H "Content-Type: application/json"
```

Or use the **Reset Demo** button on the Overview page once logged in.

This seeds 12 months of deterministic financial data for **Novastack Technologies** (9-employee US B2B startup) with:
- 6 clients (Meridian Systems, Pacific Logistics, Apex Health, Horizon Hospitality, Pulse Fintech, Summit Foods)
- Monthly income and expense transactions
- Invoices with varying statuses
- Benchmark anchor at 31 Oct 2026

---

## Step 6: Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### First-Time Setup

1. Click **Sign Up** and create an account via Supabase Auth.
2. The onboarding flow creates your profile and organisation.
3. Navigate to **Overview** and click **Reset Demo** to load Novastack data.

---

## Step 7: PayPal Sandbox Setup (Optional)

See the full guide in [`docs/PAYPAL.md`](../docs/PAYPAL.md).

### Quick Setup

1. Create a [PayPal Developer](https://developer.paypal.com/) account.
2. Navigate to **My Apps & Credentials** → **Sandbox** → **Create App**.
3. Copy the **Client ID** and **Secret** to your `.env`.
4. Create a webhook pointing to your backend URL + `/api/webhooks/paypal`.
5. Copy the **Webhook ID** to your `.env`.

### Testing Without PayPal

Use the **Demo Simulate** button on the Payments page, which runs a full payment lifecycle locally without network calls.

---

## Step 8: Run Tests

### Backend Tests

```bash
# Windows (PowerShell)
$env:PYTHONPATH="."; pytest backend/tests -v

# Linux/macOS
PYTHONPATH=. pytest backend/tests -v
```

Expected: **48+ tests passed**.

### Frontend Build Verification

```bash
npm --prefix frontend run build
```

Expected: **18 static pages compiled** with 0 errors and 0 warnings.

---

## Common Issues

### "Failed to resolve host" on database connection

Your Supabase project may be paused (free tier pauses after 7 days of inactivity). Go to the Supabase Dashboard and click **Restore**.

### "JWT verification failed"

Ensure `SUPABASE_JWT_SECRET` in `.env` matches the value in Supabase Dashboard → Settings → API → JWT Settings.

### AI CFO returns "unavailable"

The AI CFO gracefully degrades when `GEMINI_API_KEY` is empty. Set a valid key from [Google AI Studio](https://aistudio.google.com/).

### Frontend can't connect to backend

Check that `NEXT_PUBLIC_API_URL=http://localhost:8000` is set in `.env` and that the backend is running.

### Port conflicts

Default ports: Backend = `8000`, Frontend = `3000`. Change with:
```bash
uvicorn backend.app.main:app --reload --port 8001
# and update NEXT_PUBLIC_API_URL=http://localhost:8001
```

---

## Development Workflow

```
1. Edit backend code → Auto-reloads via uvicorn --reload
2. Edit frontend code → Auto-reloads via next dev (HMR)
3. Add DB migration → alembic revision --autogenerate -m "description"
4. Apply migration → alembic upgrade head
5. Run tests → pytest backend/tests -v
6. Build check → npm --prefix frontend run build
```

