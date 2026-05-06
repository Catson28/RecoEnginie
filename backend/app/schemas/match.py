"""
Schemas Pydantic — Match Results
"""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class MatchResultOut(BaseModel):
    """Resultado de um par de transacções reconciliadas."""
    id:               int
    run_id:           str
    match_type:       str     # matched | mismatch | unmatched_a | unmatched_b | probable
    match_tier:       Optional[int]
    confidence_score: int

    # Ledger
    ledger_ref_id:    Optional[str]
    ledger_date:      Optional[date]
    ledger_desc:      Optional[str]
    ledger_amount:    Optional[float]
    ledger_currency:  Optional[str]
    ledger_category:  Optional[str]

    # Bank
    bank_ref_id:      Optional[str]
    bank_date:        Optional[date]
    bank_desc:        Optional[str]
    bank_amount:      Optional[float]

    # Diferenças
    amount_diff:      float
    date_diff_days:   int
    match_criteria:   Optional[str]
    status:           str

    model_config = {"from_attributes": True}


class MatchListOut(BaseModel):
    total:        int
    matched:      int
    mismatch:     int
    unmatched_a:  int
    unmatched_b:  int
    probable:     int
    items:        list[MatchResultOut]


class MatchSummaryByTier(BaseModel):
    """Distribuição de matches por tier — para o dashboard."""
    tier1_exact:  int
    tier2_fuzzy:  int
    tier3_probable: int
    unmatched:    int
    total:        int
