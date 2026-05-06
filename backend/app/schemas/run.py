"""
Schemas Pydantic — Reconciliation Runs
"""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class RunRequest(BaseModel):
    """Body para POST /api/runs — iniciar nova reconciliação."""
    period_start:  date
    period_end:    date
    period_label:  Optional[str] = None
    notes:         Optional[str] = None


class RunSummary(BaseModel):
    """Resumo de um run para listagens."""
    run_id:           str
    status:           str
    period_label:     Optional[str]
    period_start:     date
    period_end:       date
    match_rate:       float
    matched_count:    int
    open_items_count: int
    open_value:       float
    ledger_count:     int
    bank_count:       int
    started_at:       datetime
    finished_at:      Optional[datetime]
    duration_secs:    Optional[float]
    has_open_items:   bool

    model_config = {"from_attributes": True}


class RunDetail(RunSummary):
    """Detalhe completo de um run (inclui métricas de matching por tier)."""
    mismatch_count:    int
    unmatched_a_count: int
    unmatched_b_count: int
    probable_count:    int
    matched_value:     float
    error_message:     Optional[str]
    notes:             Optional[str]

    model_config = {"from_attributes": True}


class RunListOut(BaseModel):
    total: int
    items: list[RunSummary]


class LogLine(BaseModel):
    timestamp: str
    level:     str
    message:   str
