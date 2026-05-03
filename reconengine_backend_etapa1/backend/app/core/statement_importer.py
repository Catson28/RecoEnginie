"""
ReconEngine — Statement Importer
==================================
Lê extractos bancários (CSV, OFX/QFX) e ledger exports (CSV)
e converte para DataFrames normalizados prontos para o motor de matching.

Colunas normalizadas de saída:
  ref_id | txn_date | description | amount | currency | category
"""

import io
import logging
from datetime import date
from typing import Tuple

import pandas as pd

logger = logging.getLogger("statement_importer")

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".ofx", ".qfx"}


# ── CSV / Excel ────────────────────────────────────────────────────────────

def load_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Detecta extensão e chama o loader correcto."""
    ext = "." + filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Extensão não suportada: {ext}")
    if ext in {".ofx", ".qfx"}:
        return _load_ofx(file_bytes, filename)
    if ext == ".csv":
        return _load_csv(file_bytes)
    return _load_excel(file_bytes)


def _load_csv(file_bytes: bytes) -> pd.DataFrame:
    df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8")
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    return df


def _load_excel(file_bytes: bytes) -> pd.DataFrame:
    df = pd.read_excel(io.BytesIO(file_bytes))
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    return df


def _load_ofx(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Lê ficheiro OFX/QFX e converte transacções para DataFrame."""
    try:
        import ofxparse
        ofx = ofxparse.OfxParser.parse(io.BytesIO(file_bytes))
        rows = []
        for txn in ofx.account.statement.transactions:
            rows.append({
                "ref_id":      txn.id,
                "txn_date":    txn.date.date() if hasattr(txn.date, "date") else txn.date,
                "description": txn.memo or txn.payee or "",
                "amount":      float(txn.amount),
                "currency":    "USD",
                "category":    "",
            })
        return pd.DataFrame(rows)
    except Exception as e:
        raise ValueError(f"Erro ao ler OFX '{filename}': {e}")


# ── Normalização ───────────────────────────────────────────────────────────

def normalize_ledger(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normaliza o export do sistema contabilístico (Fonte A).
    Aceita colunas: ref_id/reference/id, date/txn_date, description/desc,
                    amount/debit/credit, currency, category
    """
    df = df.copy()

    # ref_id
    for col in ["ref_id", "reference", "ref", "transaction_id", "id"]:
        if col in df.columns:
            df["ref_id"] = df[col].astype(str).str.strip()
            break
    else:
        df["ref_id"] = None

    # date
    for col in ["txn_date", "date", "transaction_date", "value_date"]:
        if col in df.columns:
            df["txn_date"] = pd.to_datetime(df[col], errors="coerce").dt.date
            break

    # description
    for col in ["description", "desc", "memo", "narrative", "details"]:
        if col in df.columns:
            df["description"] = df[col].astype(str).str.strip()
            break
    else:
        df["description"] = ""

    # amount
    for col in ["amount", "debit", "value"]:
        if col in df.columns:
            df["amount"] = pd.to_numeric(df[col], errors="coerce")
            break

    # currency & category
    df["currency"] = df.get("currency", "USD")
    df["category"] = df.get("category", "")

    df = df.dropna(subset=["txn_date", "amount"])
    return df[["ref_id", "txn_date", "description", "amount", "currency", "category"]]


def normalize_bank_statement(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normaliza o extracto bancário (Fonte B).
    Mais tolerante — extractos têm formatos variados.
    """
    df = df.copy()

    for col in ["ref_id", "reference", "check_number", "transaction_id"]:
        if col in df.columns:
            df["ref_id"] = df[col].astype(str).str.strip()
            break
    else:
        df["ref_id"] = None

    for col in ["txn_date", "date", "value_date", "posting_date", "trans_date"]:
        if col in df.columns:
            df["txn_date"] = pd.to_datetime(df[col], errors="coerce").dt.date
            break

    for col in ["description", "desc", "memo", "details", "transaction_description"]:
        if col in df.columns:
            df["description"] = df[col].astype(str).str.strip()
            break
    else:
        df["description"] = ""

    for col in ["amount", "credit", "debit", "value"]:
        if col in df.columns:
            df["amount"] = pd.to_numeric(df[col], errors="coerce")
            break

    df["currency"] = df.get("currency", "USD")
    df["category"] = ""

    df = df.dropna(subset=["txn_date", "amount"])
    return df[["ref_id", "txn_date", "description", "amount", "currency", "category"]]


def get_preview(df: pd.DataFrame, rows: int = 5) -> dict:
    """Preview do DataFrame para o frontend."""
    return {
        "columns":   list(df.columns),
        "row_count": len(df),
        "preview":   df.head(rows).fillna("").astype(str).to_dict(orient="records"),
        "date_range": {
            "start": str(df["txn_date"].min()) if "txn_date" in df.columns else None,
            "end":   str(df["txn_date"].max()) if "txn_date" in df.columns else None,
        },
        "total_amount": float(df["amount"].sum()) if "amount" in df.columns else 0.0,
    }


def validate_ledger(df: pd.DataFrame) -> Tuple[bool, list[str]]:
    required = {"txn_date", "amount"}
    missing = required - set(df.columns)
    return len(missing) == 0, list(missing)


def validate_bank_statement(df: pd.DataFrame) -> Tuple[bool, list[str]]:
    required = {"txn_date", "amount"}
    missing = required - set(df.columns)
    return len(missing) == 0, list(missing)
