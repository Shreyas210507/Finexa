"""Tests for the daily overdue check cron job."""

from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch
import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.models.base import Base
from backend.app.models.customer import Customer
from backend.app.models.invoice import Invoice
from backend.app.models.organisation import Organisation
from backend.app.models.profile import Profile
from backend.app.jobs.daily_overdue_check import run_daily_overdue_check


@pytest.fixture
def cron_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    org_id = uuid.uuid4()
    org = Organisation(
        id=org_id,
        name="Novastack Cron Test",
        currency="USD",
        is_demo=True,
    )
    session.add(org)
    session.commit()

    cust = Customer(
        id=uuid.uuid4(),
        organisation_id=org_id,
        name="Test Cust",
        email="test@cron.com",
    )
    session.add(cust)
    session.commit()

    # Create an invoice overdue relative to 2026-10-31
    inv = Invoice(
        id=uuid.uuid4(),
        organisation_id=org_id,
        customer_id=cust.id,
        invoice_number="INV-2026-9999",
        issue_date=date(2026, 9, 1),
        due_date=date(2026, 9, 30),
        status="Sent",
        subtotal=Decimal("5000.00"),
        tax_rate=Decimal("0.0000"),
        tax_amount=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        total=Decimal("5000.00"),
        amount_paid=Decimal("0.00"),
        balance=Decimal("5000.00"),
    )
    session.add(inv)
    session.commit()

    yield session, TestingSessionLocal, org_id
    session.close()


def test_cron_job_generates_notifications(cron_db):
    session, TestingSessionLocal, org_id = cron_db
    with patch("backend.app.jobs.daily_overdue_check.SessionLocal", TestingSessionLocal):
        created_count = run_daily_overdue_check()
        assert created_count >= 1

        # Check that running it a second time is idempotent (no duplicate notifications created)
        created_second_run = run_daily_overdue_check()
        assert created_second_run == 0
