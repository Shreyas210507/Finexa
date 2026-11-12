# FINEXA — Complete Code Audit, Real Data Migration & Live API Integration Report
**Document ID:** `docs/REAL_DATA_AUDIT.md`  
**Date:** November 2026  
**Auditor:** Principal Fintech Architect, Security Auditor & Senior Full-Stack Engineer  
**Scope:** Complete Codebase (`backend/`, `frontend/`, `supabase/`, `scripts/`, `docs/`)

---

## 1. Executive Summary

This audit represents a comprehensive inspection of the **FINEXA AI Financial Intelligence Platform** to transition the project from a mixture of deterministic benchmarks and simulated fallbacks into a **genuinely functional, production-ready fintech system** suitable for enterprise use and hackathon demonstration.

### Key Strengths Identified:
1. **Financial Engine Core Integrity**: The server-side Python Decimal calculations in `backend/app/financial_engine/` (`cash_flow.py`, `burn_rate.py`, `receivables.py`, `forecast.py`) use strict `Decimal("0.01")` arithmetic. No JavaScript floating-point arithmetic is used for core monetary figures.
2. **Deterministic Grounding Architecture**: `CFOOrchestratorAgent` implements verified data-grounding (`verify_grounding`), checking that any financial metric generated in responses directly exists in structured tool call outputs.
3. **Database Architecture**: Comprehensive multi-tenant schema with `organisations`, `organisation_members`, `profiles`, `transactions`, `invoices`, `payments`, `audit_logs`, and `paypal_webhook_events`.

### Critical Vulnerabilities & Deficiencies Requiring Remediation:
1. **Frontend Hardcoded Fallback Values**: Several frontend dashboard widgets fallback to static Novastack benchmark figures (`$246,000.00`, `$142,000.00`, `$51,166.67`, `4.8 Months`) when API responses are empty or zero, rather than rendering genuine zero/empty states.
2. **Missing Live PayPal JS SDK on Checkout**: While backend `paypal_client.py` implements PayPal Orders v2 (`create_order`, `capture_order`), `payments/page.tsx` was only wired to `apiClient.demoSimulatePayment()`, without the live interactive PayPal checkout flow.
3. **Transaction Source Metadata Gap**: The `Transaction` schema lacks `source`, `source_reference`, `external_transaction_id`, and `imported_at` columns, preventing automated traceability between transactions and PayPal captures or CSV imports.
4. **Missing CSV Transaction Ingestion**: The backend supports CSV export (`/api/transactions/export/csv`), but lacks an automated, idempotent CSV import parser with column auto-detection and duplicate avoidance.
5. **DNS Timeout Degradation**: The database initialization engine hung on Windows when resolving the unavailable Supabase Postgres host before falling back to SQLite, which has now been bounded with a 2-second connection timeout.

---

## 2. Hardcoded Values & Categorised Findings

| # | File | Component / Function | Finding Description | Severity | Required Remediation |
|---|---|---|---|---|---|
| 1 | `frontend/src/components/dashboard/RecentActivityFeed.tsx` | `RecentActivityFeed` | Lines 21–27 contain hardcoded fallback array with 5 transactions (Apex Health, AWS Cloud, etc.) when `transactions` is empty. | **HIGH** | Replace with empty state component ("No recent transactions recorded") when ledger is empty. |
| 2 | `frontend/src/components/dashboard/RecentActivityFeed.tsx` | `RecentActivityFeed` (Alerts Tab) | Lines 29–51 contain static hardcoded array of 3 alerts (Pacific Logistics, Runway Contraction, Crestview). | **HIGH** | Drive alerts dynamically from backend notifications API (`/api/notifications`) and audit sentinel. |
| 3 | `frontend/src/components/dashboard/LiquidityExchangeCard.tsx` | `LiquidityExchangeCard` | Line 13 has hardcoded `$10,000.00` USD default; Line 44 has hardcoded `+8.4%` trend pill badge. | **MEDIUM** | Bind available balance directly to verified cash closing balance; calculate trend MoM dynamically. |
| 4 | `frontend/src/components/dashboard/ExpenseBreakdownCard.tsx` | `ExpenseBreakdownCard` | Line 15 has hardcoded denominator `/ 200500` for calculating percentages; Lines 17–23 have static fallback array. | **HIGH** | Calculate percentage dynamically against total expenses (`sum(categories)`); render empty state if zero expenses. |
| 5 | `frontend/src/components/dashboard/DashboardAICFO.tsx` | `DashboardAICFO.handleSend` | Catch block (line 31) returns hardcoded string: *"Trailing burn is $51,166.67/mo with $246,000.00 reserves providing 4.8 months runway."* | **HIGH** | Return clean, honest error message stating AI connectivity status without hardcoded financial figures. |
| 6 | `frontend/src/app/(dashboard)/overview/page.tsx` | `OverviewPage` | Lines 85–87 fallback to `8.4`, `12.0`, `-58500.00`; Lines 179–222 fallback to Novastack constants (`246000.00`, `142000.00`, etc.). | **HIGH** | Change fallbacks from hardcoded demo figures to `"0.00"` / `null`, ensuring new organizations start with clean, authentic empty data. |
| 7 | `frontend/src/app/(dashboard)/payments/page.tsx` | `PaymentsPage` | Collect payment modal only invokes `demoSimulatePayment()`. Live PayPal SDK button is missing from modal. | **CRITICAL** | Integrate `@paypal/react-paypal-js` or direct PayPal checkout redirect to execute live Orders v2 capture flow. |
| 8 | `frontend/src/app/(dashboard)/invoices/page.tsx` | `InvoicesPage` | Create modal defaults to hardcoded strings `"2026-10-31"` and `"2026-11-30"` instead of current dynamic dates. | **LOW** | Initialize with `new Date().toISOString().slice(0, 10)` and `date + 30 days`. |
| 9 | `backend/app/models/transaction.py` | `Transaction` Model | Model lacks metadata tracking for ingestion origin (`source`, `source_reference`, `external_transaction_id`). | **HIGH** | Add columns to `Transaction` model and Alembic migration for multi-source provenance. |
| 10 | `backend/app/routers/transactions.py` | Transaction Router | Missing endpoint `POST /api/transactions/import/csv` for genuine CSV file parsing and duplicate detection. | **HIGH** | Implement streaming CSV parser with header mapping and idempotency checking. |
| 11 | `backend/app/database.py` | Database Initializer | Unbounded connection attempt to Supabase PostgreSQL caused 30s DNS hangs on Windows sandbox when offline. | **HIGH** | Added `connect_timeout: 2` in connection parameters to ensure instantaneous failover to SQLite. |

---

## 3. Data-Flow Traces for Every Screen

### 3.1 Overview / Financial Dashboard (`/overview`)
```
[Database: PostgreSQL / SQLite]
       │
       ▼
[backend/app/financial_engine/]
  ├── calculate_cash_flow() -> closing_balance, net_burn, runway
  └── calculate_growth_rate() -> mom_growth
       │
       ▼
[GET /api/dashboard/summary?period=30d]
       │
       ▼
[frontend/src/app/(dashboard)/overview/page.tsx]
  ├── KPICard 1: Cash Balance (verified data)
  ├── KPICard 2: Monthly Revenue (verified data)
  ├── KPICard 3: Monthly Expenses (verified data)
  ├── KPICard 4: Net Profit / Loss (calculated data)
  ├── KPICard 5: Monthly Burn Rate (calculated data)
  ├── KPICard 6: Cash Runway (projected estimate)
  ├── RevenueExpenseChart (Recharts AreaChart of 12-month inflows/outflows)
  ├── ExpenseBreakdownCard (Categorical distribution)
  └── RecentActivityFeed (Ledger feed + system alerts)
```

### 3.2 Transactions Ledger (`/transactions`)
```
[Database: transactions table]
       │
       ▼
[GET /api/transactions?page=1&size=20&search=...&category=...]
  └── transaction_service.list_transactions() [Filtered by current_org.id]
       │
       ▼
[FinexaDataGrid]
  └── AG Grid Community v36 rendering columns: Date, Description, Category, Type, Amount, Vendor, Reference, Source
```

### 3.3 Invoicing & Receivables (`/invoices`)
```
[Database: invoices + invoice_line_items]
       │
       ▼
[GET /api/invoices]
  └── invoice_service.list_invoices()
  └── financial_engine.calculate_receivables() -> total_outstanding, total_overdue
       │
       ▼
[InvoicesPage Data Grid]
  ├── Status: Draft, Pending, Sent, Paid, Overdue, Cancelled
  └── Actions: Preview, Download, Collect Payment via PayPal
```

### 3.4 Payments Gateway (`/payments`)
```
[User clicks "Collect Payment" on Invoice]
       │
       ▼
[POST /api/payments/orders/create] -> PayPal Orders v2 API (/v2/checkout/orders)
       │
       ▼
[PayPal Approve Flow: Buyer signs in & approves payment on sandbox.paypal.com]
       │
       ▼
[POST /api/payments/orders/capture]
  ├── paypal_client.capture_order() -> Capture ID: 7XY89201...
  ├── DB Transaction: Record in `payments` table
  ├── DB Transaction: Update `invoices.amount_paid` and `invoices.status` to "Paid"
  ├── DB Transaction: Insert matching income record in `transactions` (source="paypal")
  └── DB Transaction: Write immutable audit record in `audit_logs`
```

### 3.5 AI CFO & Multi-Agent Workspace (`/ai-cfo` & `/ai-agents`)
```
[User prompt: "What is our current monthly burn rate?"]
       │
       ▼
[POST /api/ai/chat]
  ├── CFOOrchestratorAgent.execute(prompt)
  │     ├── Deterministic Intent Match: "burn rate" -> triggers `calculate_cash_runway`
  │     ├── Tool execution with current_org.id
  │     └── Grounding verification: verify_grounding() validates figures match tool output
  └── AIMessage persisted to conversation thread
```

---

## 4. Single Source of Truth Architecture

To avoid discrepancies between layers:
1. **Authoritative Ledger**: The database (`transactions` and `invoices` tables) is the sole source of truth.
2. **Deterministic Calculation**: All metrics displayed across Dashboard, Invoices, Reports, and AI CFO must be derived using `backend/app/financial_engine/` functions.
3. **Strict Isolation**: Every database query is filtered by `organisation_id == current_org.id`.
4. **Audit Logging**: Any state mutation (creating transactions, updating invoices, capturing payments) automatically produces a record in `audit_logs`.

---

## 5. Live PayPal Sandbox Integration Architecture

```
+-----------------------------------------------------------------------------------+
|                              FINEXA PAYMENTS ARCHITECTURE                         |
+-----------------------------------------------------------------------------------+

     [Frontend UI]                                    [FINEXA Backend]
          │                                                  │
          │ 1. Request Order Creation                        │
          ├─────────────────────────────────────────────────>│
          │    POST /api/payments/orders/create              │
          │    { invoice_id: "...", amount: 18000.00 }       │ 2. Call PayPal Orders v2
          │                                                  ├────────────────────────> [PayPal Sandbox]
          │ 3. Return PayPal Order ID                        │   POST /v2/checkout/orders
          │<─────────────────────────────────────────────────┤<────────────────────────
          │    { order_id: "5X892104M...", status: "CREATED" }│
          │                                                  │
          │ 4. PayPal SDK Popup / Approval Modal             │
          ├───────────────────────────────────────────────────────────────────────────> [PayPal Buyer UI]
          │                                                                                 │
          │ 5. Buyer Approves Payment                                                       │
          │<────────────────────────────────────────────────────────────────────────────────┤
          │                                                  │
          │ 6. Request Order Capture                         │
          ├─────────────────────────────────────────────────>│
          │    POST /api/payments/orders/capture             │
          │    { order_id: "5X892104M..." }                  │ 7. Capture Funds
          │                                                  ├────────────────────────> [PayPal Sandbox]
          │                                                  │   POST /v2/checkout/orders/{id}/capture
          │                                                  │<────────────────────────
          │                                                  │
          │                                                  │ 8. Database Reconciliation:
          │                                                  │    - Insert payment record
          │                                                  │    - Update invoice balance
          │                                                  │    - Create income transaction
          │ 9. Return Settlement Confirmation               │    - Record audit log
          │<─────────────────────────────────────────────────┤
          │    { status: "COMPLETED", invoice_status: "Paid" }│
```

---

## 6. Implementation Action Plan

### Priority Order:
1. **Phase 2 — Database Schema Enhancement**: Add `source`, `source_reference`, `external_transaction_id`, `imported_at` to `Transaction` model and generate migration.
2. **Phase 5 — Full Live PayPal Sandbox Flow**: Implement interactive PayPal buttons and order creation/capture integration in `frontend/src/app/(dashboard)/payments/page.tsx`.
3. **Phase 6 — Robust CSV Import**: Implement CSV upload endpoint with column validation, preview, and batch ledger insertion.
4. **Phase 7 — Frontend Hardcoded Fallback Removal**: Replace all fallback constants in `overview/page.tsx`, `RecentActivityFeed.tsx`, and `ExpenseBreakdownCard.tsx` with clean dynamic zero/empty states.
5. **Phase 9 — AI Agent Verification**: Ensure all agents operate with Gemini inference and fall back gracefully to deterministic outputs when offline.
6. **Phase 12 — End-to-End Verification**: Verify automated test journeys (A through F).

