"""
ReconEngine — Reports Endpoints
==================================
GET /api/reports/summary          — resumo executivo multi-período
GET /api/reports/{run_id}/export  — relatório completo em CSV
GET /api/reports/trends           — tendências de match rate ao longo do tempo
"""

import csv
import io
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.reconciliation_run import ReconciliationRun
from app.models.open_item import OpenItem
from app.models.match_result import MatchResult

router = APIRouter()
logger = logging.getLogger("api.reports")


@router.get("/summary")
def executive_summary(limit: int = Query(12), db: Session = Depends(get_db)):
    """Resumo executivo dos últimos N runs concluídos."""
    runs = (
        db.query(ReconciliationRun)
        .filter(ReconciliationRun.status == "COMPLETED")
        .order_by(ReconciliationRun.started_at.desc())
        .limit(limit)
        .all()
    )

    return {
        "total_runs":       len(runs),
        "avg_match_rate":   round(sum(r.match_rate for r in runs) / len(runs), 4) if runs else 0,
        "total_open_items": sum(r.open_items_count for r in runs),
        "total_open_value": round(sum(r.open_value or 0 for r in runs), 2),
        "runs": [
            {
                "run_id":        r.run_id,
                "period_label":  r.period_label,
                "match_rate":    r.match_rate,
                "open_items":    r.open_items_count,
                "open_value":    r.open_value,
                "started_at":    r.started_at.isoformat() if r.started_at else None,
            }
            for r in runs
        ],
    }


@router.get("/trends")
def match_rate_trends(limit: int = Query(12), db: Session = Depends(get_db)):
    """Evolução do match rate por período — para gráficos de linha."""
    runs = (
        db.query(ReconciliationRun)
        .filter(ReconciliationRun.status == "COMPLETED")
        .order_by(ReconciliationRun.period_start.asc())
        .limit(limit)
        .all()
    )

    return [
        {
            "period":     r.period_label or str(r.period_start),
            "match_rate": round(r.match_rate * 100, 1),
            "open_items": r.open_items_count,
            "open_value": r.open_value,
        }
        for r in runs
    ]


@router.get("/{run_id}/export")
def export_full_report(run_id: str, db: Session = Depends(get_db)):
    """Exporta relatório completo de reconciliação em CSV."""
    run = db.query(ReconciliationRun).filter_by(run_id=run_id).first()
    if not run:
        raise HTTPException(404, "Run não encontrado.")

    results = db.query(MatchResult).filter_by(run_id=run_id).all()
    items   = db.query(OpenItem).filter_by(run_id=run_id).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Cabeçalho do relatório
    writer.writerow(["ReconEngine — Relatório de Reconciliação"])
    writer.writerow(["Período", run.period_label])
    writer.writerow(["Run ID", run.run_id])
    writer.writerow(["Data", run.started_at.strftime("%Y-%m-%d %H:%M") if run.started_at else ""])
    writer.writerow(["Match Rate", f"{run.match_rate:.1%}"])
    writer.writerow(["Itens em Aberto", run.open_items_count])
    writer.writerow([])

    # Resultados de matching
    writer.writerow(["=== RESULTADOS DE MATCHING ==="])
    writer.writerow(["Tipo", "Tier", "Conf.", "Ref Ledger", "Data Ledger",
                     "Valor Ledger", "Ref Bank", "Data Bank", "Valor Bank",
                     "Diferença", "Critério"])
    for r in results:
        writer.writerow([
            r.match_type, r.match_tier, r.confidence_score,
            r.ledger_ref_id, r.ledger_date, r.ledger_amount,
            r.bank_ref_id,   r.bank_date,   r.bank_amount,
            r.amount_diff,   r.match_criteria,
        ])

    writer.writerow([])

    # Itens em aberto
    writer.writerow(["=== ITENS EM ABERTO ==="])
    writer.writerow(["Tipo", "Ref", "Data", "Descrição", "Valor",
                     "Moeda", "Estado", "Prioridade"])
    for item in items:
        writer.writerow([
            item.item_type, item.ref_id, item.txn_date,
            item.description, item.amount, item.currency,
            item.status, item.priority,
        ])

    output.seek(0)
    filename = f"recon_report_{run.period_label or run_id[:8]}.csv".replace(" ", "_")
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
