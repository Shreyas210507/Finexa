# FINEXA — 5-Minute Interactive Demo Script

A guided click-path walkthrough for evaluators to experience every core feature of FINEXA in under 5 minutes. Assumes the platform is running with Novastack Technologies demo data seeded.

---

## Pre-Flight Checklist

- [ ] Backend running on `http://localhost:8000` (or deployed URL)
- [ ] Frontend running on `http://localhost:3000` (or deployed URL)
- [ ] Demo data seeded (Overview page shows Novastack Technologies data)
- [ ] (Optional) `GEMINI_API_KEY` set for live AI CFO chat

---

## Demo Flow (5 Minutes)

### 🕐 Minute 1 — Financial Dashboard (Overview)

**Navigate to**: `/overview`

**What to show**:
1. **KPI Cards** at the top — all values in USD ($):
   - Liquid Cash: **$246,000.00**
   - Monthly Burn: **$51,166.67**
   - Runway: **4.8 months**
   - Revenue Growth: **+8.4%** MoM
2. **Period Selector** — Toggle between 7D / 30D / 90D / 12M. Watch KPI values update.
3. **Cash Flow Chart** — Inflow vs outflow velocity visualisation.
4. **AI Insights Panel** — Grounded insights generated from the Financial Engine.

**Talking Point**: *"Every number on this dashboard is computed using pure Python Decimal arithmetic — zero floating-point — ensuring cent-perfect accuracy across all financial calculations."*

---

### 🕐 Minute 2 — Transactions & Invoices

**Navigate to**: `/transactions`

**What to show**:
1. **AG Grid Data Table** — Scroll through 12 months of transactions.
2. **Search** — Type `"Crestview"` in search → find the flagged $19,500.00 audit entry.
3. **Filters** — Filter by Category → `Payroll`, or by Type → `expense`.
4. **CSV Export** — Click the Export button to download transactions.

**Navigate to**: `/invoices`

**What to show**:
1. **Invoice List** — Outstanding ($94,000) and Overdue ($31,000) totals.
2. **Click any invoice** → Preview modal with line items and amounts.
3. **PDF Download** — Click the PDF button → branded FINEXA invoice downloads instantly.

**Talking Point**: *"Invoices are auto-numbered INV-YYYY-NNNN, with server-computed tax and discount totals. PDFs are generated via ReportLab with branded FINEXA templates."*

---

### 🕐 Minute 3 — Cash Flow Forecasting & What-If Simulator

**Navigate to**: `/forecasts`

**What to show**:
1. **Forecast Chart** — Default 90-day projection showing:
   - Blue line: projected cash balance declining from $246,000.
   - Shaded area: ±10% / ±20% uncertainty cone.
   - Dotted red line: $150,000 warning threshold.
2. **Horizon Toggle** — Switch to 30D / 180D to see different projections.

3. **What-If Simulator** (below the chart):
   - Select scenario: **"Hiring Expansion"**
   - Set: **2 new hires** at **$6,000/month**
   - Click **Simulate**
   - **Before/After cards** appear:
     - Before: Burn $51,166.67, Runway 4.8 months
     - After: Burn **$63,166.67**, Runway **3.9 months** ⚠️
   
4. Try another: **OpEx Surge +15%** → Runway drops to **3.1 months** 🔴

**Talking Point**: *"Every simulation uses pure Decimal arithmetic — the $63,166.67 burn rate is exactly $51,166.67 + $12,000.00, with no floating-point drift."*

---

### 🕐 Minute 4 — AI CFO Chat & Audit Agent

**Navigate to**: `/ai-cfo`

**What to show** (requires `GEMINI_API_KEY`):
1. **Prompt suggestions** appear at bottom — click one or type:
   - *"What is our current runway and what's driving our burn rate?"*
2. Watch the AI CFO respond with:
   - Data-kind labels (✅ Verified, 📊 Calculated)
   - Tool call badges showing which financial tools were invoked
   - Precise numbers matching the dashboard ($246,000 cash, 4.8m runway)

3. Ask a follow-up: *"Run an audit on our recent expenses"*
   - The Audit Agent flags **Crestview Advisory** — $19,500.00 on Oct 18, 2026:
     - Category: Other (~4× deviation from average)
     - New vendor (no prior history)
     - No matching contract or invoice
   - **Important**: The agent flags statistical deviations — it never accuses fraud.

**Navigate to**: `/ai-agents`

**What to show**:
1. **Agent Execution List** — Shows recent agent runs with status cards.
2. **Approval Queue** — If any pending actions, show Approve/Reject buttons.

**Talking Point**: *"FINEXA uses a custom multi-agent orchestration — no LangChain, no LangGraph. Five specialised agents with 11 financial tools, all org-scoped and data-kind-labelled."*

---

### 🕐 Minute 5 — Payments, Reports & Notifications

**Navigate to**: `/payments`

**What to show**:
1. **PayPal Connection Status** — Shows gateway configuration.
2. **Demo Simulate** — Click on an unpaid invoice → **Simulate Payment**:
   - Invoice status changes to **Paid** ✅
   - Payment record appears in the ledger
   - Matching income transaction created for cash reconciliation

**Navigate to**: `/reports`

**What to show**:
1. **Report Type Selector** — Choose `P&L`, `Cash Flow`, `Receivables Aging`, or `Tax Estimate`.
2. **PDF Download** — Click to download branded financial report.
3. **CSV Export** — Click for spreadsheet-compatible export.

**Check the notification bell** (top-right):
1. **Unread badge** shows count.
2. Click → Popover with overdue invoice alerts and runway warnings.
3. **Mark All Read** button clears the badge.

**Talking Point**: *"Reports use the same pure Decimal engine as the dashboard — P&L totals match exactly. The corporate tax estimate applies the 21% US rate automatically."*

---

## Key Benchmark Numbers to Verify

During any part of the demo, these numbers should be consistent across all surfaces (Dashboard, Reports, AI CFO, Forecasts):

| Metric | Expected Value |
|---|---|
| Closing Cash Balance | **$246,000.00** |
| Oct 2026 Revenue | **$142,000.00** |
| Oct 2026 Expenses | **$200,500.00** |
| Oct 2026 Net | **-$58,500.00** |
| Trailing 3M Burn | **$51,166.67 /month** |
| Runway | **4.8 months** |
| Outstanding Receivables | **$94,000.00** |
| Overdue | **$31,000.00** |
| Crestview Advisory Anomaly | **$19,500.00** (Oct 18, 2026) |

---

## If AI Features Are Unavailable

If `GEMINI_API_KEY` is not set, the AI CFO page shows a graceful "AI unavailable" state. Skip Minute 4's chat demo and instead:

1. Navigate to `/ai-agents` → Show the agent architecture and execution history.
2. Spend extra time on the What-If Simulator with additional scenarios.
3. Emphasise that the financial engine, forecasting, and all non-AI features work independently.

---

## After the Demo

Point evaluators to:
- **Architecture**: [`ARCHITECTURE.md`](../ARCHITECTURE.md) for technical deep-dive
- **API Docs**: [`API.md`](../API.md) for full endpoint reference
- **Swagger**: `/docs` on the backend for interactive API exploration
- **Test Suite**: 48+ tests covering financial engine, reconciliation, E2E journeys, PayPal integration, and cron jobs

