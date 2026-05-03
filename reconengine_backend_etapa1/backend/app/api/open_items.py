"""
ReconEngine — Open Items Endpoints
=====================================
GET   /api/open-items              — lista itens em aberto (com filtros)
GET   /api/open-items/stats        — estatísticas de itens em aberto
GET   /api/open-items/{id}         — detalhe de um item
PATCH /api/open-items/resolve      — resolve um ou vários itens
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.open_item import OpenItem
from app.schemas.open_item import (
    OpenItemListOut, OpenItemOut,
    ResolveRequest, ResolveResponse,
)

router = APIRouter()
logger = logging.getLogger("api.open_items")


@router.get("", response_model=OpenItemListOut)
def list_open_items(
    run_id:      Optional[str] = Query(None),
    item_type:   Optional[str] = Query(None),
    is_resolved: Optional[bool] = Query(None),
    priority:    Optional[str] = Query(None),
    limit:       int = Query(50, ge=1, le=500),
    offset:      int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Lista itens em aberto com filtros opcionais."""
    q = db.query(OpenItem)

    if run_id:
        q = q.filter(OpenItem.run_id == run_id)
    if item_type:
        q = q.filter(OpenItem.item_type == item_type)
    if is_resolved is not None:
        q = q.filter(OpenItem.is_resolved == is_resolved)
    if priority:
        q = q.filter(OpenItem.priority == priority)

    total    = q.count()
    open_cnt = db.query(OpenItem).filter(OpenItem.is_resolved == False).count()
    resolved = db.query(OpenItem).filter(OpenItem.is_resolved == True).count()

    total_value_row = db.query(func.sum(OpenItem.amount)).filter(
        OpenItem.is_resolved == False
    ).scalar()
    total_value = float(total_value_row or 0)

    items = q.order_by(OpenItem.priority.desc(), OpenItem.created_at.asc()).offset(offset).limit(limit).all()

    return {
        "total":       total,
        "open":        open_cnt,
        "resolved":    resolved,
        "total_value": total_value,
        "items":       items,
    }


@router.get("/stats")
def get_stats(run_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Estatísticas de itens em aberto por tipo."""
    q = db.query(OpenItem)
    if run_id:
        q = q.filter(OpenItem.run_id == run_id)

    rows = (
        q.with_entities(OpenItem.item_type, func.count(), func.sum(OpenItem.amount))
        .group_by(OpenItem.item_type)
        .all()
    )

    by_type = {
        item_type: {"count": cnt, "value": float(val or 0)}
        for item_type, cnt, val in rows
    }

    total_open = q.filter(OpenItem.is_resolved == False).count()
    total_value = float(
        q.filter(OpenItem.is_resolved == False)
        .with_entities(func.sum(OpenItem.amount))
        .scalar() or 0
    )

    return {
        "total_open":  total_open,
        "total_value": total_value,
        "by_type":     by_type,
    }


@router.get("/{item_id}", response_model=OpenItemOut)
def get_open_item(item_id: int, db: Session = Depends(get_db)):
    """Detalhe de um item em aberto específico."""
    item = db.query(OpenItem).filter(OpenItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item não encontrado.")
    return item


@router.patch("/resolve", response_model=ResolveResponse)
def resolve_items(body: ResolveRequest, db: Session = Depends(get_db)):
    """
    Resolve manualmente um ou vários itens em aberto.
    resolution_type: write_off | timing_diff | bank_error | ledger_error | fx_diff | other
    """
    items = db.query(OpenItem).filter(OpenItem.id.in_(body.item_ids)).all()

    if not items:
        raise HTTPException(404, "Nenhum item encontrado.")

    now = datetime.now(timezone.utc)
    for item in items:
        item.is_resolved       = True
        item.status            = "resolved"
        item.resolved_at       = now
        item.resolved_by       = body.resolver
        item.resolution_type   = body.resolution_type
        item.resolution_notes  = body.notes or ""
        item.updated_at        = now

    db.commit()

    logger.info(f"{len(items)} open item(s) resolvido(s) por {body.resolver} [{body.resolution_type}]")

    return {
        "resolved_count": len(items),
        "message": f"{len(items)} item(s) marcado(s) como resolvido(s).",
    }
