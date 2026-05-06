"""
ReconEngine — Tier 2: Fuzzy Description Matching
==================================================
Usa rapidfuzz para comparar descrições de transacções sem ref_id comum.
Critério: similaridade de descrição >= TIER2_FUZZY_THRESHOLD (padrão 85%)
          + amount igual + date dentro de ±N dias.

Confidence score: proporcional à similaridade (ex: 85% sim → score 85).
"""

import logging
from typing import Tuple

import pandas as pd
from rapidfuzz import fuzz, process

from app.config import settings

logger = logging.getLogger("tier2_fuzzy")


def _fuzzy_score(desc_a: str, desc_b: str) -> float:
    """Calcula score de similaridade entre duas descrições."""
    if not desc_a or not desc_b:
        return 0.0
    # token_sort_ratio é mais robusto para ordem diferente de palavras
    return fuzz.token_sort_ratio(
        str(desc_a).upper().strip(),
        str(desc_b).upper().strip()
    )


def run_tier2(
    ledger: pd.DataFrame,
    bank: pd.DataFrame,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Executa matching Tier 2 sobre o que sobrou do Tier 1.

    Retorna
    -------
    matched          : pares com fuzzy ≥ threshold
    remaining_ledger : ledger ainda não resolvido
    remaining_bank   : bank ainda não resolvido
    """
    threshold = settings.TIER2_FUZZY_THRESHOLD
    tol_days  = settings.TIER2_DATE_TOLERANCE_DAYS

    if ledger.empty or bank.empty:
        return pd.DataFrame(), ledger, bank

    ledger = ledger.copy().reset_index(drop=True)
    bank   = bank.copy().reset_index(drop=True)

    matched_rows     = []
    used_ledger_idx  = set()
    used_bank_idx    = set()

    for l_idx, l_row in ledger.iterrows():
        best_score    = 0.0
        best_b_idx    = None

        for b_idx, b_row in bank.iterrows():
            if b_idx in used_bank_idx:
                continue

            # Filtro rápido: amount deve ser igual
            if abs(l_row["amount"] - b_row["amount"]) > 0.01:
                continue

            # Filtro rápido: date tolerance
            try:
                date_diff = abs((pd.to_datetime(l_row["txn_date"]) - pd.to_datetime(b_row["txn_date"])).days)
            except Exception:
                continue
            if date_diff > tol_days:
                continue

            # Fuzzy score
            score = _fuzzy_score(
                str(l_row.get("description", "")),
                str(b_row.get("description", ""))
            )

            if score >= threshold and score > best_score:
                best_score = score
                best_b_idx = b_idx

        if best_b_idx is not None:
            b_row = bank.loc[best_b_idx]
            date_diff_days = abs(
                (pd.to_datetime(l_row["txn_date"]) - pd.to_datetime(b_row["txn_date"])).days
            )
            matched_rows.append({
                "_ledger_idx":      l_idx,
                "_bank_idx":        best_b_idx,
                "match_tier":       2,
                "match_type":       "matched",
                "confidence_score": int(best_score),
                "match_criteria":   f"fuzzy_desc({int(best_score)}%) + amount",
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
                "amount_diff":      round(l_row["amount"] - b_row["amount"], 2),
                "date_diff_days":   date_diff_days,
            })
            used_ledger_idx.add(l_idx)
            used_bank_idx.add(best_b_idx)

    matched = pd.DataFrame(matched_rows) if matched_rows else pd.DataFrame()
    remaining_ledger = ledger[~ledger.index.isin(used_ledger_idx)].copy()
    remaining_bank   = bank[~bank.index.isin(used_bank_idx)].copy()

    logger.info(
        f"Tier 2 — fuzzy matched: {len(matched)}, "
        f"remaining ledger: {len(remaining_ledger)}, "
        f"remaining bank: {len(remaining_bank)}"
    )

    return matched, remaining_ledger, remaining_bank
