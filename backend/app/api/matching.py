"""
ReconEngine — Matching Endpoints
===================================
GET /api/matching/{run_id}        — todos os resultados de um run
GET /api/matching/{run_id}/summary — distribuição por tier e tipo
GET /api/matching/{run_id}/export  — exporta resultados como CSV
"""

import csv
import io
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.match_result import MatchResult
from app.schemas.match import MatchListOut, MatchResultOut, MatchSummaryByTier

router = APIRouter()
logger = logging.getLogger("api.matching")


@router.get("/{run_id}", response_model=MatchListOut)
def list_matches(
    run_id:     str,
    match_type: Optional[str] = Query(None),
    tier:       Optional[int] = Query(None),
    limit:      int = Query(100, ge=1, le=1000),
    offset:     int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Lista resultados de matching de um run com filtros opcionais."""
    q = db.query(MatchResult).filter(MatchResult.run_id == run_id)

    if match_type:
        q = q.filter(MatchResult.match_type == match_type)
    if tier:
        q = q.filter(MatchResult.match_tier == tier)

    total = q.count()
    items = q.order_by(MatchResult.id).offset(offset).limit(limit).all()

    # Contagens por tipo
    def count_type(t):
        return db.query(MatchResult).filter(
            MatchResult.run_id == run_id,
            MatchResult.match_type == t
        ).count()

    return {
        "total":       total,
        "matched":     count_type("matched"),
        "mismatch":    count_type("mismatch"),
        "unmatched_a": count_type("unmatched_a"),
        "unmatched_b": count_type("unmatched_b"),
        "probable":    count_type("probable"),
        "items":       items,
    }


@router.get("/{run_id}/summary", response_model=MatchSummaryByTier)
def match_summary(run_id: str, db: Session = Depends(get_db)):
    """Distribuição de matches por tier — para gráficos do dashboard."""
    def count_tier(tier):
        return db.query(MatchResult).filter(
            MatchResult.run_id == run_id,
            MatchResult.match_tier == tier,
            MatchResult.match_type == "matched",
        ).count()

    unmatched = db.query(MatchResult).filter(
        MatchResult.run_id == run_id,
        MatchResult.match_type.in_(["unmatched_a", "unmatched_b"]),
    ).count()

    total = db.query(MatchResult).filter(MatchResult.run_id == run_id).count()

    return {
        "tier1_exact":    count_tier(1),
        "tier2_fuzzy":    count_tier(2),
        "tier3_probable": count_tier(3),
        "unmatched":      unmatched,
        "total":          total,
    }


@router.get("/{run_id}/export")
def export_matches(run_id: str, db: Session = Depends(get_db)):
    """Exporta todos os resultados de matching como CSV."""
    results = db.query(MatchResult).filter(MatchResult.run_id == run_id).all()

    if not results:
        raise HTTPException(404, "Nenhum resultado encontrado para este run.")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "match_type", "tier", "confidence",
        "ledger_ref", "ledger_date", "ledger_desc", "ledger_amount",
        "bank_ref",   "bank_date",   "bank_desc",   "bank_amount",
        "amount_diff", "date_diff_days", "criteria", "status",
    ])

    for r in results:
        writer.writerow([
            r.match_type, r.match_tier, r.confidence_score,
            r.ledger_ref_id, r.ledger_date, r.ledger_desc, r.ledger_amount,
            r.bank_ref_id,   r.bank_date,   r.bank_desc,   r.bank_amount,
            r.amount_diff, r.date_diff_days, r.match_criteria, r.status,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=reconciliation_{run_id[:8]}.csv"},
    )
