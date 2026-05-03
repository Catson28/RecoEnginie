"""
ReconEngine — Runs Endpoints
==============================
POST /api/runs                — inicia nova reconciliação (upload ledger + bank)
GET  /api/runs                — lista runs anteriores
GET  /api/runs/{run_id}       — detalhe de um run
GET  /api/runs/{run_id}/log   — log de execução
DELETE /api/runs/{run_id}     — elimina um run e os seus dados
"""

import json
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.reconciliation_run import ReconciliationRun
from app.schemas.run import RunDetail, RunListOut, RunSummary, LogLine

router = APIRouter()
logger = logging.getLogger("api.runs")


def _execute_run_task(run_id: str, ledger_bytes: bytes, bank_bytes: bytes,
                      ledger_name: str, bank_name: str,
                      period_start, period_end):
    """Task de background — importa ficheiros e executa o engine."""
    from app.db.session import SessionLocal
    from app.core.statement_importer import (
        load_file, normalize_ledger, normalize_bank_statement
    )
    from app.core.matching_engine import MatchingEngine

    db  = SessionLocal()
    run = db.query(ReconciliationRun).filter_by(run_id=run_id).first()

    try:
        # Importar e normalizar
        ledger_raw = load_file(ledger_bytes, ledger_name)
        bank_raw   = load_file(bank_bytes,   bank_name)
        ledger_df  = normalize_ledger(ledger_raw)
        bank_df    = normalize_bank_statement(bank_raw)

        run.status = "PROCESSING"
        db.commit()

        # Executar motor de matching
        engine = MatchingEngine(db)
        engine.execute(
            run_id       = run_id,
            ledger_df    = ledger_df,
            bank_df      = bank_df,
            period_start = period_start,
            period_end   = period_end,
            ledger_name  = ledger_name,
            bank_name    = bank_name,
        )

    except Exception as e:
        logger.exception(f"Erro no run {run_id}")
        run.status        = "FAILED"
        run.finished_at   = datetime.now(timezone.utc)
        run.error_message = str(e)
        db.commit()
    finally:
        db.close()


@router.post("", response_model=RunSummary, status_code=202)
async def create_run(
    background_tasks: BackgroundTasks,
    period_start: str  = Form(..., description="YYYY-MM-DD"),
    period_end:   str  = Form(..., description="YYYY-MM-DD"),
    period_label: str  = Form(""),
    ledger_file:  UploadFile = File(..., description="Export do sistema contabilístico (CSV/XLSX/OFX)"),
    bank_file:    UploadFile = File(..., description="Extracto bancário (CSV/XLSX/OFX)"),
    db: Session = Depends(get_db),
):
    """
    Inicia uma nova reconciliação.
    Faz upload dos dois ficheiros e executa em background.
    """
    from datetime import date

    try:
        p_start = date.fromisoformat(period_start)
        p_end   = date.fromisoformat(period_end)
    except ValueError:
        raise HTTPException(400, "Datas inválidas. Use formato YYYY-MM-DD.")

    if p_start > p_end:
        raise HTTPException(400, "period_start deve ser anterior a period_end.")

    ledger_bytes = await ledger_file.read()
    bank_bytes   = await bank_file.read()

    run_id = str(uuid.uuid4())
    label  = period_label or f"{p_start.strftime('%b')} {p_start.year}"

    run = ReconciliationRun(
        run_id        = run_id,
        status        = "PENDING",
        period_start  = p_start,
        period_end    = p_end,
        period_label  = label,
        ledger_source = ledger_file.filename,
        bank_source   = bank_file.filename,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    background_tasks.add_task(
        _execute_run_task,
        run_id, ledger_bytes, bank_bytes,
        ledger_file.filename, bank_file.filename,
        p_start, p_end,
    )

    logger.info(f"Run {run_id} criado — período: {label}")
    return run


@router.get("", response_model=RunListOut)
def list_runs(
    limit:  int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """Lista todos os runs por ordem cronológica decrescente."""
    runs  = db.query(ReconciliationRun).order_by(ReconciliationRun.started_at.desc()).offset(offset).limit(limit).all()
    total = db.query(ReconciliationRun).count()
    return {"total": total, "items": runs}


@router.get("/{run_id}", response_model=RunDetail)
def get_run(run_id: str, db: Session = Depends(get_db)):
    """Detalhe completo de um run."""
    run = db.query(ReconciliationRun).filter_by(run_id=run_id).first()
    if not run:
        raise HTTPException(404, "Run não encontrado.")
    return run


@router.get("/{run_id}/log", response_model=list[LogLine])
def get_run_log(run_id: str, db: Session = Depends(get_db)):
    """Log detalhado de execução do run."""
    run = db.query(ReconciliationRun).filter_by(run_id=run_id).first()
    if not run:
        raise HTTPException(404, "Run não encontrado.")
    if not run.log_json:
        return []
    return json.loads(run.log_json)


@router.delete("/{run_id}", status_code=204)
def delete_run(run_id: str, db: Session = Depends(get_db)):
    """Elimina um run e todos os seus dados associados."""
    from app.models.match_result import MatchResult
    from app.models.open_item import OpenItem
    from app.models.transaction import Transaction

    run = db.query(ReconciliationRun).filter_by(run_id=run_id).first()
    if not run:
        raise HTTPException(404, "Run não encontrado.")

    db.query(MatchResult).filter_by(run_id=run_id).delete()
    db.query(OpenItem).filter_by(run_id=run_id).delete()
    db.query(Transaction).filter_by(run_id=run_id).delete()
    db.delete(run)
    db.commit()
