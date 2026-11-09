# Supabase Production Configuration Guide

This guide covers configuring a Supabase project for FINEXA production deployment.

---

## 1. Create Production Supabase Project

1. Navigate to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Choose your region (e.g., `us-west-1` for Oregon — matches Render region).
3. Set a strong database password and save it securely.

---

## 2. Database Connection (Connection Pooler)

FINEXA uses Supabase's built-in connection pooler (PgBouncer) for production database connectivity.

### Connection String Format

```
postgresql+psycopg://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

| Parameter | Description |
|---|---|
| `[project-ref]` | Your project reference ID from Supabase Dashboard → Settings → General |
| `[password]` | The database password set during project creation |
| `[region]` | The AWS region (e.g., `us-west-1`) |

### Pooling Modes

| Mode | Port | Use Case |
|---|---|---|
| **Transaction** | `6543` | Default. Best for serverless/Render. Each SQL statement runs in its own transaction context. |
| **Session** | `5432` | Use if you need persistent session-level features (e.g., prepared statements). |

**Recommended**: Use **Transaction mode (port 6543)** for the FINEXA backend on Render.

### SSL Configuration

Supabase requires SSL for all external connections:

```
DATABASE_URL=postgresql+psycopg://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
```

---

## 3. Authentication Configuration

### Redirect URLs

Navigate to **Authentication → URL Configuration** and add:

| URL | Purpose |
|---|---|
| `https://finexa.vercel.app` | Production frontend |
| `https://finexa.vercel.app/**` | Wildcard for OAuth callbacks |
| `http://localhost:3000` | Local development |
| `http://localhost:3000/**` | Local OAuth callbacks |

### JWT Secret

Copy the JWT secret from **Settings → API → JWT Settings → JWT Secret** and set it as the `SUPABASE_JWT_SECRET` environment variable on Render.

### Service Role Key

Copy from **Settings → API → Project API Keys → service_role** and set as `SUPABASE_SERVICE_ROLE_KEY` on Render.

> ⚠️ **Never expose the service role key to the frontend.** It bypasses RLS and should only be used server-side.

---

## 4. Row Level Security (RLS)

FINEXA uses dual-layer tenant isolation:

1. **Application-level**: Every query is scoped to `current_org.id` via FastAPI dependencies.
2. **Database-level**: RLS policies on all org-scoped tables as a defence-in-depth safety net.

Apply the RLS policies from [`supabase/rls_policies.sql`](../supabase/rls_policies.sql) in the Supabase SQL Editor:

```sql
-- Example: Run in Supabase SQL Editor
\i supabase/rls_policies.sql
```

Or copy-paste the contents into the SQL Editor manually.

### Verify RLS is Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All FINEXA tables should show `rowsecurity = true`.

---

## 5. Storage Buckets

Create two storage buckets for document storage:

| Bucket | Purpose | Public |
|---|---|---|
| `invoices` | PDF invoice files | No |
| `reports` | Generated financial reports (P&L, Cash Flow, etc.) | No |

### Bucket Policies

Set org-scoped access policies so users can only access their own organisation's files:

```sql
-- Policy: Authenticated users can read their org's invoices
CREATE POLICY "Org members can read invoices"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'invoices'
  AND auth.uid() IN (
    SELECT user_id FROM public.organisation_members
    WHERE organisation_id = (storage.foldername(name))[1]::uuid
  )
);
```

---

## 6. Auth Trigger for Profile Auto-Creation

Ensure the trigger that auto-creates a `profiles` row on signup is active:

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

---

## 7. Cold-Start Mitigation

Render free/starter plans may cold-start after 15 minutes of inactivity. Mitigate with:

### Option A: External Health Check Pinger

Use a free service like [UptimeRobot](https://uptimerobot.com/) or [cron-job.org](https://cron-job.org/):

- **URL**: `https://finexa-backend.onrender.com/api/health`
- **Interval**: Every 5 minutes
- **Method**: GET

### Option B: Render Auto-Scaling (Paid Plans)

On Render Professional plans, set `minInstances: 1` in the service to keep it always warm.

### Option C: Self-Ping Cron

Add a lightweight cron entry to `render.yaml`:

```yaml
- type: cron
  name: finexa-keep-warm
  runtime: python
  schedule: "*/14 * * * *"  # Every 14 minutes
  buildCommand: "pip install httpx"
  startCommand: "python -c \"import httpx; httpx.get('https://finexa-backend.onrender.com/api/health')\""
```

---

## 8. Environment Variables Checklist

| Variable | Source | Required |
|---|---|---|
| `SUPABASE_URL` | Dashboard → Settings → API → Project URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Settings → API → service_role key | ✅ |
| `SUPABASE_JWT_SECRET` | Dashboard → Settings → API → JWT Secret | ✅ |
| `DATABASE_URL` | Dashboard → Settings → Database → Connection String (pooler) | ✅ |
| `CORS_ORIGINS` | Your frontend URL(s), comma-separated | ✅ |
| `DEMO_MODE` | `true` for demo, `false` for production | ✅ |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) | Optional |
| `PAYPAL_CLIENT_ID` | [PayPal Developer](https://developer.paypal.com/) | Optional |
| `PAYPAL_CLIENT_SECRET` | PayPal Developer Dashboard | Optional |
| `PAYPAL_WEBHOOK_ID` | PayPal Developer → Webhooks | Optional |

