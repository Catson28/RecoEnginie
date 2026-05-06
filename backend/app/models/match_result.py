"""
Modelo SQLAlchemy — reconciliation_results
Cada linha representa um par (ledger ↔ bank) com o resultado do matching.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Integer, String, Text, Date
from app.db.session import Base


class MatchResult(Base):
    __tablename__ = "reconciliation_results"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    run_id           = Column(String(36), nullable=False, index=True)

    # Tipo de resultado
    match_type       = Column(String(20), nullable=False, index=True)
    # matched | mismatch | unmatched_a | unmatched_b | probable

    # Tier de matching
    match_tier       = Column(Integer)              # 1, 2, 3 ou None
    confidence_score = Column(Integer, default=0)   # 0–100

    # Dados do Ledger (Fonte A — sistema contabilístico)
    ledger_ref_id    = Column(String(100), index=True)
    ledger_date      = Column(Date)
    ledger_desc      = Column(Text)
    ledger_amount    = Column(Float)
    ledger_currency  = Column(String(10))
    ledger_category  = Column(String(100))

    # Dados do Extracto Bancário (Fonte B)
    bank_ref_id      = Column(String(100))
    bank_date        = Column(Date)
    bank_desc        = Column(Text)
    bank_amount      = Column(Float)
    bank_currency    = Column(String(10))

    # Diferença
    amount_diff      = Column(Float, default=0.0)
    date_diff_days   = Column(Integer, default=0)

    # Critério de matching
    match_criteria   = Column(String(100))
    # ex: "ref_id + amount", "fuzzy_desc(92%)", "amount + date(±3d)"

    # Estado de resolução
    status           = Column(String(20), default="open")
    # open | resolved | ignored | escalated

    # Auditoria de resolução (para open items)
    resolved_at      = Column(DateTime)
    resolved_by      = Column(String(255))
    resolution_type  = Column(String(50))
    # write_off | timing_diff | bank_error | ledger_error | fx_diff | other
    resolution_notes = Column(Text)

    created_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                              onupdate=lambda: datetime.now(timezone.utc))
