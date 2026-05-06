"""
Modelo SQLAlchemy — open_items
Regista transacções não reconciliadas que precisam de revisão manual.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Integer, String, Text, Date, Boolean
from app.db.session import Base


class OpenItem(Base):
    __tablename__ = "open_items"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    run_id          = Column(String(36), nullable=False, index=True)

    # Tipo de item em aberto
    item_type       = Column(String(20), nullable=False, index=True)
    # unmatched_a | unmatched_b | mismatch | probable

    # Origem
    source          = Column(String(10))   # "ledger" | "bank" | "both"

    # Dados da transacção
    ref_id          = Column(String(100), index=True)
    txn_date        = Column(Date)
    description     = Column(Text)
    amount          = Column(Float, nullable=False)
    currency        = Column(String(10), default="USD")
    category        = Column(String(100))

    # Para mismatches — valores dos dois lados
    ledger_amount   = Column(Float)
    bank_amount     = Column(Float)
    amount_diff     = Column(Float)

    # Para prováveis — melhor candidato encontrado
    probable_match_id = Column(Integer)       # FK para reconciliation_results
    probable_score    = Column(Integer)

    # Estado e prioridade
    status          = Column(String(20), default="open", index=True)
    priority        = Column(String(10), default="normal")
    # high | normal | low

    is_resolved     = Column(Boolean, default=False, index=True)
    aging_days      = Column(Integer, default=0)

    # Resolução
    resolved_at     = Column(DateTime)
    resolved_by     = Column(String(255))
    resolution_type = Column(String(50))
    resolution_notes= Column(Text)

    created_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                             onupdate=lambda: datetime.now(timezone.utc))
