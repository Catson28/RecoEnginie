"""ReconEngine — Health Check"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter()


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    return {
        "status":    "ok" if db_ok else "degraded",
        "api":       "ok",
        "database":  "ok" if db_ok else "error",
        "engine":    "ReconEngine v1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
