"""
ReconEngine — Tier 3: Probable Matching
=========================================
Última tentativa: amount igual + date dentro de ±N dias, sem ref_id nem descrição.
Confidence score: 50–74 (provável mas não confirmado).
Estes itens ficam como "probable" e requerem revisão humana.
"""

import logging
from typing import Tuple

import pandas as pd

from app.config import settings

logger = logging.getLogger("tier3_probable")


def run_tier3(
    ledger: pd.DataFrame,
    bank: pd.DataFrame,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Executa matching Tier 3 — tudo o que Tier 1 e 2 não resolveram.

    Retorna
    -------
    probable         : pares com amount + date correspondentes (50–74 confidence)
    unmatched_ledger : transacções do ledger sem qualquer match
    unmatched_bank   : transacções do banco sem qualquer match
    """
    tol_days    = settings.TIER3_DATE_TOLERANCE_DAYS
    score_min   = settings.TIER3_CONFIDENCE_MIN
    score_max   = settings.TIER3_CONFIDENCE_MAX

    if ledger.empty or bank.empty:
        return pd.DataFrame(), ledger, bank

    ledger = ledger.copy().reset_index(drop=True)
    bank   = bank.copy().reset_index(drop=True)

    probable_rows   = []
    used_ledger_idx = set()
    used_bank_idx   = set()

    for l_idx, l_row in ledger.iterrows():
        best_date_diff = tol_days + 1
        best_b_idx     = None

        for b_idx, b_row in bank.iterrows():
            if b_idx in used_bank_idx:
                continue

            # Amount deve ser igual (ou muito próximo)
            if abs(l_row["amount"] - b_row["amount"]) > 0.01:
                continue

            try:
                date_diff = abs(
                    (pd.to_datetime(l_row["txn_date"]) - pd.to_datetime(b_row["txn_date"])).days
                )
            except Exception:
                continue

            if date_diff <= tol_days and date_diff < best_date_diff:
                best_date_diff = date_diff
                best_b_idx     = b_idx

        if best_b_idx is not None:
            b_row = bank.loc[best_b_idx]
            # Score inversamente proporcional à diferença de dias
            score = max(score_min, score_max - (best_date_diff * 4))

            probable_rows.append({
                "_ledger_idx":      l_idx,
                "_bank_idx":        best_b_idx,
                "match_tier":       3,
                "match_type":       "probable",
                "confidence_score": score,
                "match_criteria":   f"amount + date(±{best_date_diff}d)",
                "ledger_ref_id":    l_row.get("ref_id"),
                "ledger_date":      l_row["txn_date"],
                "ledger_desc":      l_row.get("description"),
                "ledger_amount":    l_row["amount"],
                "ledger_currency":  l_row.get("currency", "USD"),
                "ledger_category":  l_row.get("category", ""),
                "bank_ref_id":      b_row.get("ref_id"),
                "bank_date":        b_row["txn_date"],
                "bank_desc":        b_row.get("description"),
                "bank_amount":      b_row["amount"],
                "bank_currency":    b_row.get("currency", "USD"),
                "amount_diff":      0.0,
                "date_diff_days":   best_date_diff,
            })
            used_ledger_idx.add(l_idx)
            used_bank_idx.add(best_b_idx)

    probable         = pd.DataFrame(probable_rows) if probable_rows else pd.DataFrame()
    unmatched_ledger = ledger[~ledger.index.isin(used_ledger_idx)].copy()
    unmatched_bank   = bank[~bank.index.isin(used_bank_idx)].copy()

    logger.info(
        f"Tier 3 — probable: {len(probable)}, "
        f"unmatched ledger: {len(unmatched_ledger)}, "
        f"unmatched bank: {len(unmatched_bank)}"
    )

    return probable, unmatched_ledger, unmatched_bank
