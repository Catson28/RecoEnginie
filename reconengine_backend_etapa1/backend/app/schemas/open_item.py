"""
Schemas Pydantic — Open Items
"""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class OpenItemOut(BaseModel):
    id:             int
    run_id:         str
    item_type:      str
    source:         str
    ref_id:         Optional[str]
    txn_date:       Optional[date]
    description:    Optional[str]
    amount:         float
    currency:       str
    category:       Optional[str]
    ledger_amount:  Optional[float]
    bank_amount:    Optional[float]
    amount_diff:    Optional[float]
    status:         str
    priority:       str
    is_resolved:    bool
    aging_days:     int
    resolved_at:    Optional[datetime]
    resolved_by:    Optional[str]
    resolution_type: Optional[str]
    resolution_notes: Optional[str]

    model_config = {"from_attributes": True}


class OpenItemListOut(BaseModel):
    total:       int
    open:        int
    resolved:    int
    total_value: float
    items:       list[OpenItemOut]


class ResolveRequest(BaseModel):
    """Body para resolver um item em aberto."""
    item_ids:        list[int] = Field(..., min_length=1)
    resolver:        str       = Field(..., min_length=2)
    resolution_type: str       = Field(..., pattern="^(write_off|timing_diff|bank_error|ledger_error|fx_diff|other)$")
    notes:           Optional[str] = None


class ResolveResponse(BaseModel):
    resolved_count: int
    message:        str
