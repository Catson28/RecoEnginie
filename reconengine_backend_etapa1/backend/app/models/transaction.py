"""
Modelo SQLAlchemy — transactions
Armazena transacções brutas do ledger e do extracto bancário.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Integer, String, Text, Date, Boolean
from app.db.session import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    run_id      = Column(String(36), nullable=False, index=True)

    # Origem da transacção
    source      = Column(String(10), nullable=False, index=True)
    # "ledger" (sistema contabilístico) | "bank" (extracto bancário)

    # Campos principais
    ref_id      = Column(String(100), index=True)
    txn_date    = Column(Date, nullable=False, index=True)
    description = Column(Text)
    amount      = Column(Float, nullable=False)
    currency    = Column(String(10), default="USD")
    category    = Column(String(100))

    # Estado de matching
    is_matched  = Column(Boolean, default=False)
    match_result_id = Column(Integer)   # FK para reconciliation_results

    # Metadados de importação
    raw_data    = Column(Text)          # linha original do CSV/OFX
    import_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc))
