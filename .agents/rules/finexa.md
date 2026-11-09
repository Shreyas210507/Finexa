# FINEXA workspace rules

## Sources of truth (read before planning any task)
1. docs/MASTER_SPEC.md is the full product spec. If anything here conflicts with it, stop and ask.
2. design/ contains Stitch exports. They are the visual source of truth for layout, spacing and hierarchy. Rebuild them in Next.js + Tailwind + shadcn/ui. Do not paste the exported HTML as-is.
3. public/brand/ holds the real FINEXA logo. Always use that file. Never redraw it or substitute a placeholder.

## Non-negotiables
- All money maths is done in Python with Decimal in backend/app/financial_engine. No floats for money anywhere. The LLM never calculates or invents a monetary value; it receives structured tool results and explains them.
- Dashboard, reports, forecasts, simulator and AI tools all call the SAME financial engine functions.
- No secrets in frontend code or in git. Secrets come from environment variables. Never read, print or log .env.
- Every query is scoped by organisation_id. Cross-organisation access must be impossible and covered by tests.
- Never present a simulated payment as a real PayPal payment. Never trust a frontend payment-success message; verify server-side and via a verified webhook.
- AI agents may prepare financial actions but must never execute payments or irreversible changes without explicit user approval and a confirmation screen.
- No fake statuses, fake notifications or hardcoded figures presented as live data. Demo data lives in the seeded demo organisation only and is labelled Demo Mode.
- No dead buttons, placeholder charts, or forms that cannot submit.
- Do not swallow errors. Surface them in the UI and log them without sensitive data.
- The app must still work (dashboards, calculations) when Gemini is unavailable.

## Stack
Frontend: Next.js App Router, TypeScript, Tailwind, shadcn/ui, Lucide, Recharts, AG Grid Community for the Transactions, Invoices, Payments and Reports data grids, React Hook Form + Zod.
Backend: Python, FastAPI, Pydantic, SQLAlchemy, Alembic, Supabase (managed PostgreSQL + Auth + Storage + RLS). AI: Gemini API via the google-genai SDK with function calling. Custom lightweight orchestration, no LangGraph. Payments: PayPal sandbox.
Database: Supabase. Use Supabase Auth for registration, login, JWT, sessions — do NOT build a custom auth system or a custom `users` table. Use Supabase RLS as a defence-in-depth layer for org isolation (application-level checks remain). Use Supabase Storage for invoice/report PDFs. Connect via Supabase connection pooler.
Do not add technologies that are not needed. Approved partner tools: PayPal (payments), Render (backend hosting and cron), AG Grid Community (data grids; never use Enterprise-only features such as the Server-Side Row Model or Excel export), Postman (collections and CI smoke tests), and, optionally, Zapier (outbound signed webhooks) and APIMatic (SDK and API docs from OpenAPI). Do not integrate Channel3 or Kernel.

## Design tokens
bg #070B1A, panel #0D1428, card #111B32, cyan #20D9F2, blue #315BFF, violet #963BFF, text #F5F7FF, muted #9AA8C7, success #22C55E, warning #F59E0B, error #EF4444. Gradient only on AI elements, primary buttons, active nav and key chart highlights. Inter, tabular numerals for money. Card radius 10px. Dark theme default, persisted theme toggle.

## Process
- Work in the phases defined in the task. Do not start the next phase without approval.
- Always produce an Implementation Plan and a Task List artifact first; wait for approval on Phase 1 and on any change to the architecture.
- After each phase, produce a Walkthrough artifact with: what was implemented, files created or modified, how to run and test, tests run with their results, screenshots or recordings of the UI at the required viewports, outstanding problems, and which features are genuinely functional.
- Never claim something works unless you ran it. Never claim deployment succeeded unless you verified it.
- If credentials are missing, build the integration boundary, run in a clearly labelled demo mode, and document exactly what is needed.
- If a feature is too large, ship a smaller, fully working version and say what was cut.
- Prefer small, reviewable changes. Keep files under about 400 lines and split components and services sensibly.

