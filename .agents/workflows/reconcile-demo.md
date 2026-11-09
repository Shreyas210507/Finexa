# /reconcile-demo
Run the reconciliation checks for the seeded demo organisation and report the numbers:
- Oct 2026 revenue, expenses, net, and the expense category sums match the dashboard, reports and transactions table.
- Outstanding invoices total equals the sum of unpaid invoice balances (total minus payments).
- Closing balance = opening balance + inflows - outflows, for every month.
- Runway and forecast use the same transactions as the dashboard.
Fail loudly with the exact difference for any mismatch.

