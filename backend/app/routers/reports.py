from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.dependencies import get_current_org
from backend.app.models.organisation import Organisation
from backend.app.services.report_service import (
    generate_report_data,
    generate_report_pdf,
    generate_report_csv,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("", status_code=status.HTTP_200_OK)
def get_report(
    report_type: str = Query(default="pnl", pattern="^(pnl|cashflow|receivables|tax)$"),
    period: str = Query(default="30d"),
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Retrieve structured JSON data for financial report."""
    data = generate_report_data(db, current_org.id, report_type=report_type, period=period)
    return data


@router.get("/pdf")
def download_report_pdf(
    report_type: str = Query(default="pnl", pattern="^(pnl|cashflow|receivables|tax)$"),
    period: str = Query(default="30d"),
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Generate and stream branded PDF report."""
    data = generate_report_data(db, current_org.id, report_type=report_type, period=period)
    pdf_buffer = generate_report_pdf(data)
    filename = f"FINEXA_{report_type.upper()}_{period}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/csv")
def download_report_csv(
    report_type: str = Query(default="pnl", pattern="^(pnl|cashflow|receivables|tax)$"),
    period: str = Query(default="30d"),
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Generate and stream RFC 4180 CSV export for report."""
    data = generate_report_data(db, current_org.id, report_type=report_type, period=period)
    csv_stream = generate_report_csv(data)
    filename = f"FINEXA_{report_type.upper()}_{period}.csv"
    return Response(
        content=csv_stream.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

