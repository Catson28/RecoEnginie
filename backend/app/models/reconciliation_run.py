"""
Modelo SQLAlchemy — reconciliation_runs
Regista cada execução de reconciliação com métricas completas.
"""

from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, Date
from app.db.session import Base


class ReconciliationRun(Base):
    __tablename__ = "reconciliation_runs"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    run_id           = Column(String(36), unique=True, nullable=False, index=True)
    status           = Column(String(20), nullable=False, default="PENDING")
    # PENDING | PROCESSING | COMPLETED | FAILED

    # Período de reconciliação
    period_start     = Column(Date, nullable=False)
    period_end       = Column(Date, nullable=False)
    period_label     = Column(String(50))           # ex: "May 2024"

    # Fontes carregadas
    ledger_source    = Column(String(255))           # nome do ficheiro ledger
    bank_source      = Column(String(255))           # nome do ficheiro extracto

    # Timing
    started_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    finished_at      = Column(DateTime)
    duration_secs    = Column(Float)

    # Totais de transacções
    ledger_count     = Column(Integer, default=0)
    bank_count       = Column(Integer, default=0)

    # Resultados de matching
    matched_count    = Column(Integer, default=0)
    mismatch_count   = Column(Integer, default=0)
    unmatched_a_count= Column(Integer, default=0)   # só no ledger
    unmatched_b_count= Column(Integer, default=0)   # só no extracto
    probable_count   = Column(Integer, default=0)

    # Valores monetários
    matched_value    = Column(Float, default=0.0)
    open_value       = Column(Float, default=0.0)

    # Métricas chave
    match_rate       = Column(Float, default=0.0)   # % matched / total
    open_items_count = Column(Integer, default=0)

    # Estado
    has_open_items   = Column(Boolean, default=False)
    error_message    = Column(Text)
    notes            = Column(Text)

    # Log JSON da execução
    log_json         = Column(Text)
    metrics_json     = Column(Text)
