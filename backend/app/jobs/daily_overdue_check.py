"""Daily Overdue & Runway Scan Cron Job.

Designed to be executed on a recurring schedule (e.g., via Render cron at 06:00 UTC)
or run standalone as part of administrative automation.

Scans all active organisations for:
1. Overdue invoices (due_date < anchor_date) and marks them Overdue with alerts.
2. Contraction in cash runway below 6.0 months threshold.
"""

from datetime import date
import logging
import sys

from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.models.organisation import Organisation
from backend.app.services.notification_service import check_and_trigger_system_events

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [CRON:daily_overdue] %(message)s",
)
logger = logging.getLogger("finexa.jobs.daily_overdue")


def run_daily_overdue_check() -> int:
    """Executes overdue and runway scan across all organisations.
    
    Returns total number of notifications created.
    """
    db = SessionLocal()
    total_created = 0
    try:
        # Determine anchor date: in demo mode, anchor to benchmark 2026-10-31 if system date is different
        today = date.today()
        if settings.DEMO_MODE and today.year != 2026:
            anchor_date = date(2026, 10, 31)
            logger.info("DEMO_MODE active: using benchmark anchor date %s", anchor_date)
        else:
            anchor_date = today
            logger.info("Production mode active: using system date %s", anchor_date)

        organisations = db.query(Organisation).all()
        logger.info("Found %d organisation(s) to process", len(organisations))

        for org in organisations:
            try:
                events = check_and_trigger_system_events(db, org.id, anchor_date=anchor_date)
                total_created += len(events)
                logger.info(
                    "Org '%s' (%s): generated %d new alert(s)",
                    org.name,
                    org.id,
                    len(events),
                )
            except Exception as e:
                logger.error("Error processing organisation %s: %s", org.id, str(e), exc_info=True)

        logger.info("Daily scan completed successfully. Total notifications created: %d", total_created)
        return total_created
    finally:
        db.close()


if __name__ == "__main__":
    try:
        run_daily_overdue_check()
        sys.exit(0)
    except Exception as exc:
        logger.critical("Fatal error running daily overdue check: %s", exc, exc_info=True)
        sys.exit(1)

