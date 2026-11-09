# FINEXA Financial Definitions & Mathematical Specification

This document defines the mathematical models, formulas, and rounding conventions enforced by the FINEXA Financial Engine (`backend/app/financial_engine`).

---

## 1. Non-Negotiable Standard: Pure Decimal Arithmetic

1. **No Floats**: Every monetary value, balance, revenue, expense, and intermediate calculation MUST use Python's standard library `decimal.Decimal`.
2. **Rounding Convention**: Standard half-up rounding (`ROUND_HALF_UP`).
3. **Monetary Precision**: Rounded to two decimal places (`0.01` or cents).
4. **Percentage Precision**: Rounded to one decimal place (`0.1%`).
5. **Runway Precision**: Rounded to one decimal place (`0.1` months).

---

## 2. Core Metrics & Formulas

### 2.1 Net Operating Income (Net Profit / Net Loss)
$$\text{Net Income} = \text{Revenue} - \text{Total Operating Expenses}$$
- Positive $\implies$ Net Operating Profit.
- Negative $\implies$ Net Operating Loss (Cash Burn).

---

### 2.2 Cash Flow & Closing Balance
$$\text{Net Cash Flow} = \text{Total Inflows} - \text{Total Outflows}$$
$$\text{Closing Balance} = \text{Opening Balance} + \text{Net Cash Flow}$$

---

### 2.3 Trailing $N$-Month Net Burn Rate
Burn is defined as the net operational cash drain:
$$\text{Monthly Burn}_m = \text{Expenses}_m - \text{Revenue}_m$$
$$\text{Trailing Average Burn} = \frac{1}{N} \sum_{i=1}^{N} \text{Monthly Burn}_i$$
- Default window $N = 3$ months.

---

### 2.4 Operational Cash Runway (Months)
$$\text{Runway} = \frac{\text{Closing Liquid Cash Balance}}{\text{Trailing Average Burn}}$$
- **Edge Case (Zero or Negative Burn)**: If $\text{Average Burn} \le 0$, the business is cash-flow positive or breaking even. The engine explicitly returns `None` and displays `"Not applicable"`. Never divide by zero.

---

### 2.5 Period-over-Period Growth Rate
$$\text{Growth \%} = \frac{\text{Current Period} - \text{Prior Period}}{|\text{Prior Period}|} \times 100$$
- If $\text{Prior Period} = 0$ or is missing, returns `None`.

---

### 2.6 Profit Margin & Expense Ratio
$$\text{Profit Margin \%} = \frac{\text{Net Income}}{\text{Revenue}} \times 100$$
$$\text{Expense Ratio \%} = \frac{\text{Total Expenses}}{\text{Revenue}} \times 100$$
- If $\text{Revenue} = 0$, both return `None`. Never divide by zero.

---

### 2.7 Accounts Receivable Aging
For every non-draft, non-cancelled invoice with $\text{Balance} = (\text{Total Amount} - \text{Paid Amount}) > 0$:
- **Current (Not Overdue)**: $\text{Due Date} \ge \text{Anchor Date}$
- **0–30 Days Overdue**: $1 \le (\text{Anchor Date} - \text{Due Date}) \le 30$
- **31–60 Days Overdue**: $31 \le (\text{Anchor Date} - \text{Due Date}) \le 60$
- **61–90 Days Overdue**: $61 \le (\text{Anchor Date} - \text{Due Date}) \le 90$
- **90+ Days Overdue**: $(\text{Anchor Date} - \text{Due Date}) > 90$

---

## 3. Benchmark Verification Data: Novastack Technologies (USD)

Anchored to **October 31, 2026**:
- **Closing Balance**: $\$246,000.00$
- **August 2026 Net Burn**: $\$175,000 - \$128,000 = \$47,000.00$
- **September 2026 Net Burn**: $\$179,000 - \$131,000 = \$48,000.00$
- **October 2026 Net Burn**: $\$200,500 - \$142,000 = \$58,500.00$
- **Sum of Trailing 3-Month Net Burn**: $\$47,000 + \$48,000 + \$58,500 = \$153,500.00$
- **Trailing 3-Month Average Burn**: $\frac{\$153,500.00}{3} = \$51,166.67$
- **Runway**: $\frac{\$246,000.00}{\$51,166.6667} = 4.8078 \approx \mathbf{4.8\text{ Months}}$
- **October Revenue Growth**: $\frac{\$142,000 - \$131,000}{\$131,000} \times 100 = \mathbf{+8.4\%}$
- **October Expense Growth**: $\frac{\$200,500 - \$179,000}{\$179,000} \times 100 = \mathbf{+12.0\%}$
- **Outstanding Receivables**: $\mathbf{\$94,000.00}$ (Overdue: $\mathbf{\$31,000.00}$)

