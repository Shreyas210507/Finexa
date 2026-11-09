from datetime import date
from decimal import Decimal
import uuid
from sqlalchemy.orm import Session

from backend.app.models.customer import Customer
from backend.app.models.invoice import Invoice, InvoiceLineItem
from backend.app.models.organisation import Organisation
from backend.app.models.payment import Payment
from backend.app.models.transaction import Transaction

TWO_PLACES = Decimal("0.01")


def seed_novastack_demo_data(db: Session, org_id: uuid.UUID, include_anomaly: bool = False) -> dict:
    """Deterministic seed for Novastack Technologies benchmark.
    12 Months (Nov 2025 - Oct 2026), USD currency, anchored to 31 Oct 2026.
    """
    # 1. Update organisation details
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    if org:
        org.name = "Novastack Technologies"
        org.currency = "USD"
        org.is_demo = True

    # 2. Clear previous transactions, invoices, customers for this org
    db.query(Transaction).filter(Transaction.organisation_id == org_id).delete()
    db.query(Payment).filter(Payment.organisation_id == org_id).delete()
    db.query(InvoiceLineItem).filter(
        InvoiceLineItem.invoice_id.in_(
            db.query(Invoice.id).filter(Invoice.organisation_id == org_id)
        )
    ).delete(synchronize_session=False)
    db.query(Invoice).filter(Invoice.organisation_id == org_id).delete()
    db.query(Customer).filter(Customer.organisation_id == org_id).delete()
    db.flush()

    # 3. Seed Customers
    customers_data = [
        {"name": "Meridian Systems", "email": "billing@meridiansys.com", "company": "Meridian Systems Inc."},
        {"name": "Pacific Logistics", "email": "accounts@pacificlog.com", "company": "Pacific Freight Logistics"},
        {"name": "Apex Health", "email": "finance@apexhealth.org", "company": "Apex Health Solutions"},
        {"name": "Horizon Hospitality", "email": "ap@horizonhotels.com", "company": "Horizon Resorts & Hospitality"},
        {"name": "Pulse Fintech", "email": "ledger@pulsefintech.io", "company": "Pulse Financial Technologies"},
        {"name": "Summit Foods", "email": "invoices@summitfoods.com", "company": "Summit Organic Provisions"},
    ]
    customer_map = {}
    for c in customers_data:
        cust = Customer(
            organisation_id=org_id,
            name=c["name"],
            email=c["email"],
            company=c["company"],
        )
        db.add(cust)
        db.flush()
        customer_map[c["name"]] = cust

    # 4. Monthly 12-Month Benchmarks (Nov 2025 - Oct 2026)
    # Target totals per month (Revenue, Expenses):
    monthly_benchmarks = [
        ("2025-11", Decimal("89000.00"), Decimal("140000.00")),
        ("2025-12", Decimal("94000.00"), Decimal("143000.00")),
        ("2026-01", Decimal("99000.00"), Decimal("148000.00")),
        ("2026-02", Decimal("103000.00"), Decimal("152000.00")),
        ("2026-03", Decimal("108000.00"), Decimal("156000.00")),
        ("2026-04", Decimal("112000.00"), Decimal("160000.00")),
        ("2026-05", Decimal("117000.00"), Decimal("164000.00")),
        ("2026-06", Decimal("121000.00"), Decimal("168000.00")),
        ("2026-07", Decimal("125000.00"), Decimal("172000.00")),
        ("2026-08", Decimal("128000.00"), Decimal("175000.00")),
        ("2026-09", Decimal("131000.00"), Decimal("179000.00")),
        ("2026-10", Decimal("142000.00"), Decimal("200500.00")),
    ]

    # Create transactions for earlier months (Nov 2025 to Aug 2026)
    for m_str, rev_target, exp_target in monthly_benchmarks[:10]:
        y, m = int(m_str[:4]), int(m_str[5:7])
        # Income transaction
        db.add(
            Transaction(
                organisation_id=org_id,
                type="income",
                category="Software Services",
                description=f"Monthly SaaS Subscriptions & Retainers - {m_str}",
                amount=rev_target,
                date=date(y, m, 15),
                vendor_or_client="Enterprise Client Pool",
                reference=f"REC-{y}{m:02d}-01",
            )
        )
        # Expense transaction
        db.add(
            Transaction(
                organisation_id=org_id,
                type="expense",
                category="Salaries",
                description=f"Operating Payroll & Engineering Services - {m_str}",
                amount=exp_target,
                date=date(y, m, 28),
                vendor_or_client="ADP Payroll Services",
                reference=f"PAY-{y}{m:02d}-01",
            )
        )

    # September 2026 detailed breakdown (Revenue $131,000, Expenses $179,000)
    db.add(
        Transaction(
            organisation_id=org_id,
            type="income",
            category="Software Services",
            description="Enterprise Cloud Retainer - Meridian Systems",
            amount=Decimal("131000.00"),
            date=date(2026, 9, 20),
            vendor_or_client="Meridian Systems",
            reference="REC-202609-01",
        )
    )
    sep_expenses = [
        ("Salaries", Decimal("102000.00"), "Core Staff Payroll (9 employees)", date(2026, 9, 28), "ADP"),
        ("Software", Decimal("23000.00"), "SaaS Tools & Development Licenses", date(2026, 9, 10), "GitHub & JetBrains"),
        ("Marketing", Decimal("21000.00"), "B2B Demand Generation & Ad Spend", date(2026, 9, 15), "Google Ads"),
        ("Infrastructure", Decimal("14500.00"), "AWS Cloud Compute & Storage", date(2026, 9, 5), "Amazon Web Services"),
        ("Operations", Decimal("11500.00"), "Co-working Space & Utility Services", date(2026, 9, 2), "WeWork US"),
        ("Other", Decimal("7000.00"), "Office Miscellaneous & Supplies", date(2026, 9, 12), "Staples Business"),
    ]
    for cat, amt, desc, dt, vend in sep_expenses:
        db.add(
            Transaction(
                organisation_id=org_id,
                type="expense",
                category=cat,
                description=desc,
                amount=amt,
                date=dt,
                vendor_or_client=vend,
            )
        )

    # October 2026 detailed breakdown (Revenue $142,000, Expenses $200,500)
    oct_incomes = [
        (Decimal("85000.00"), "Client Retainer Q4 - Meridian Systems", date(2026, 10, 5), "Meridian Systems"),
        (Decimal("36000.00"), "Logistics AI API Usage - Pacific Logistics", date(2026, 10, 14), "Pacific Logistics"),
        (Decimal("21000.00"), "Payment for INV-2026-0039 - Pulse Fintech", date(2026, 10, 14), "Pulse Fintech"),
    ]
    for amt, desc, dt, client in oct_incomes:
        db.add(
            Transaction(
                organisation_id=org_id,
                type="income",
                category="Software Services",
                description=desc,
                amount=amt,
                date=dt,
                vendor_or_client=client,
            )
        )

    oct_expenses = [
        ("Salaries", Decimal("114000.00"), "Core Engineering & Operations Payroll", date(2026, 10, 28), "ADP Payroll"),
        ("Software", Decimal("26000.00"), "Enterprise AI & Developer Tooling", date(2026, 10, 10), "OpenAI & Anthropic"),
        ("Marketing", Decimal("23000.00"), "TechCrunch Disrupt Sponsorship & Outreach", date(2026, 10, 12), "TechCrunch"),
        ("Infrastructure", Decimal("17500.00"), "AWS & Supabase Infrastructure Tier", date(2026, 10, 4), "AWS Cloud"),
        ("Operations", Decimal("12500.00"), "Office Lease & High-Speed Transit", date(2026, 10, 1), "Commercial Property"),
        ("Other", Decimal("7500.00"), "Legal & Accounting Retainer", date(2026, 10, 22), "Baker & McKenzie"),
    ]
    for cat, amt, desc, dt, vend in oct_expenses:
        db.add(
            Transaction(
                organisation_id=org_id,
                type="expense",
                category=cat,
                description=desc,
                amount=amt,
                date=dt,
                vendor_or_client=vend,
            )
        )

    # 5. Flagged Audit Anomaly: Crestview Advisory ($19,500 on 18 Oct 2026)
    # Only added if include_anomaly is True (to preserve benchmark totals reconciliation by default)
    if include_anomaly:
        db.add(
            Transaction(
                organisation_id=org_id,
                type="expense",
                category="Other",
                description="Strategic Advisory Retainer - Crestview Advisory",
                amount=Decimal("19500.00"),
                date=date(2026, 10, 18),
                vendor_or_client="Crestview Advisory",
                reference="TXN-AUDIT-FLAG-01",
            )
        )

    # 6. Seed Invoices (Total outstanding $94,000; overdue $31,000)
    invoices_to_seed = [
        {
            "num": "INV-2026-0038",
            "cust": "Pacific Logistics",
            "issue": date(2026, 9, 12),
            "due": date(2026, 10, 12),
            "status": "Overdue",
            "total": Decimal("18000.00"),
            "paid": Decimal("0.00"),
            "desc": "Supply Chain Routing Engine Integration",
        },
        {
            "num": "INV-2026-0040",
            "cust": "Apex Health",
            "issue": date(2026, 9, 20),
            "due": date(2026, 10, 20),
            "status": "Overdue",
            "total": Decimal("13000.00"),
            "paid": Decimal("0.00"),
            "desc": "HIPAA Cloud Compliance & Monitoring",
        },
        {
            "num": "INV-2026-0043",
            "cust": "Meridian Systems",
            "issue": date(2026, 10, 8),
            "due": date(2026, 11, 8),
            "status": "Sent",
            "total": Decimal("24000.00"),
            "paid": Decimal("0.00"),
            "desc": "Q4 Core Architecture Engineering",
        },
        {
            "num": "INV-2026-0044",
            "cust": "Horizon Hospitality",
            "issue": date(2026, 10, 15),
            "due": date(2026, 11, 15),
            "status": "Partially paid",
            "total": Decimal("25000.00"),
            "paid": Decimal("10000.00"),
            "desc": "Guest Reservation Analytics Pipeline",
        },
        {
            "num": "INV-2026-0045",
            "cust": "Pulse Fintech",
            "issue": date(2026, 10, 22),
            "due": date(2026, 11, 22),
            "status": "Pending",
            "total": Decimal("14000.00"),
            "paid": Decimal("0.00"),
            "desc": "Real-time Fraud Signal Integration",
        },
        {
            "num": "INV-2026-0046",
            "cust": "Summit Foods",
            "issue": date(2026, 10, 28),
            "due": date(2026, 11, 28),
            "status": "Sent",
            "total": Decimal("10000.00"),
            "paid": Decimal("0.00"),
            "desc": "Inventory Forecasting Module",
        },
        {
            "num": "INV-2026-0039",
            "cust": "Pulse Fintech",
            "issue": date(2026, 9, 14),
            "due": date(2026, 10, 14),
            "status": "Paid",
            "total": Decimal("21000.00"),
            "paid": Decimal("21000.00"),
            "desc": "Payment Gateway Optimization (PayPal Sandbox)",
        },
    ]

    for inv_data in invoices_to_seed:
        cust = customer_map[inv_data["cust"]]
        tot = inv_data["total"]
        paid = inv_data["paid"]
        bal = tot - paid

        inv = Invoice(
            organisation_id=org_id,
            invoice_number=inv_data["num"],
            customer_id=cust.id,
            status=inv_data["status"],
            issue_date=inv_data["issue"],
            due_date=inv_data["due"],
            subtotal=tot,
            tax_rate=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            total=tot,
            amount_paid=paid,
            balance=bal,
            notes="Benchmark invoice seeded for Novastack Technologies",
        )
        db.add(inv)
        db.flush()

        db.add(
            InvoiceLineItem(
                invoice_id=inv.id,
                description=inv_data["desc"],
                quantity=Decimal("1.00"),
                unit_price=tot,
                amount=tot,
            )
        )

        # Seed payment record for partial or full payments
        if paid > Decimal("0.00"):
            db.add(
                Payment(
                    organisation_id=org_id,
                    invoice_id=inv.id,
                    amount=paid,
                    payment_date=inv_data["due"],
                    method="paypal" if inv_data["num"] == "INV-2026-0039" else "manual",
                    status="successful",
                    paypal_order_id=f"PAYPAL-SANDBOX-{inv_data['num']}",
                    reference=f"PAYPAL-SANDBOX-{inv_data['num']}",
                )
            )

    db.commit()

    return {
        "status": "ok",
        "organisation": "Novastack Technologies",
        "currency": "USD",
        "months_seeded": 12,
        "anchor_date": "2026-10-31",
        "closing_balance": "246000.00",
        "runway_months": "4.8",
        "total_outstanding_receivables": "94000.00",
        "overdue_receivables": "31000.00",
    }

