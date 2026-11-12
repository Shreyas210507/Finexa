import sys
import os
sys.path.insert(0, os.path.abspath("."))
from decimal import Decimal
import uuid
from backend.app.database import SessionLocal
from backend.app.dependencies import DEMO_DEFAULT_ORG_ID, DEMO_DEFAULT_USER_ID
from backend.app.agents.cfo_orchestrator import CFOOrchestratorAgent
from backend.app.agents.cashflow_agent import CashFlowAgent
from backend.app.agents.invoice_agent import InvoiceAgent
from backend.app.agents.audit_agent import AuditAgent
from backend.app.agents.strategy_agent import FinancialStrategyAgent

db = SessionLocal()
org_id = DEMO_DEFAULT_ORG_ID
user_id = DEMO_DEFAULT_USER_ID

print("=== STARTING AGENT DIAGNOSTICS ===")

# 1. AI CFO Orchestrator Tests
cfo = CFOOrchestratorAgent(db, org_id, user_id)
cfo_queries = [
    "What is my current financial position?",
    "What are my biggest financial risks?",
    "How can I improve profitability?",
]
print("\n--- 1. Testing AI CFO Orchestrator ---")
for q in cfo_queries:
    res = cfo.execute(q)
    print(f"\nQ: {q}")
    print(f"Routing: {res.get('routing')}")
    print(f"Response: {res.get('text')[:200]}...")

# 2. CashFlow Agent Tests
cf_agent = CashFlowAgent(db, org_id, user_id)
print("\n--- 2. Testing CashFlow Agent ---")
cf_res = cf_agent.execute({})
print(f"Summary: {cf_res.get('summary')}")
print(f"Closing Balance: {cf_res.get('closing_balance')}")
print(f"Monthly Burn: {cf_res.get('monthly_burn')}")
print(f"Runway Display: {cf_res.get('runway_display')}")

# 3. Invoice Agent Tests
inv_agent = InvoiceAgent(db, org_id, user_id)
print("\n--- 3. Testing Invoice Agent ---")
inv_res = inv_agent.execute({"action": "check_receivables"})
print(f"Outstanding Receivables: {inv_res.get('summary')}")
draft_res = inv_agent.execute({
    "action": "create_draft",
    "customer_name": "Apex Innovations",
    "amount": 12500.0,
    "description": "Enterprise Platform Retainer"
})
print(f"Invoice Draft: {draft_res.get('summary')}")

# 4. Audit Agent Tests
audit_agent = AuditAgent(db, org_id, user_id)
print("\n--- 4. Testing Audit Agent ---")
audit_res = audit_agent.execute({})
print(f"Audit Summary: {audit_res.get('summary')}")
print(f"Anomalies Count: {audit_res.get('anomalies_count')}")

# 5. Financial Strategy Agent Tests
strat_agent = FinancialStrategyAgent(db, org_id, user_id)
print("\n--- 5. Testing Financial Strategy Agent ---")
strat_res = strat_agent.execute({
    "hire_count": 2,
    "salary_per_hire": 6000.0,
    "expense_increase_pct": 10.0
})
print(f"Strategy Simulation Summary: {strat_res.get('summary')}")
print(f"Baseline Burn: {strat_res.get('baseline_burn')} -> Simulated: {strat_res.get('simulated_burn')}")
print(f"Baseline Runway: {strat_res.get('baseline_runway')} -> Simulated: {strat_res.get('simulated_runway')}")

db.close()
print("\n=== AGENT DIAGNOSTICS COMPLETE ===")
