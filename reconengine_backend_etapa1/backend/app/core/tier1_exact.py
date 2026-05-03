"""
ReconEngine — Tier 1: Exact Matching
======================================
Critério mais forte: ref_id igual + amount igual + date dentro de ±N dias.
Confidence score: 100 (match perfeito) ou 95 (apenas date fora da janela exacta).

Lógica:
  1. Junta ledger ↔ bank por ref_id (case-insensitive, sem espaços)
  2. Filtra pares onde |amount_diff| == 0.0
  3. Filtra pares onde |date_diff| <= TIER1_DATE_TOLERANCE_DAYS
  4. O que sobrar é MATCHED (Tier 1)
"""

import logging
from datetime import timedelta
from typing import Tuple

import pandas as pd

from app.config import settings

logger = logging.getLogger("tier1_exact")


def run_tier1(
    ledger: pd.DataFrame,
    bank: pd.DataFrame,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Executa matching Tier 1.

    Parâmetros
    ----------
    ledger : DataFrame normalizado do sistema contabilístico
    bank   : DataFrame normalizado do extracto bancário

    Retorna
    -------
    matched    : pares reconciliados com tier=1
    mismatches : ref_id igual mas amount diferente
    remaining_ledger : ledger não resolvido neste tier
    remaining_bank   : bank não resolvido neste tier
    """
    tol_days   = settings.TIER1_DATE_TOLERANCE_DAYS

    # Normalizar ref_id para join robusto
    ledger = ledger.copy()
    bank   = bank.copy()
    ledger["_ref_norm"] = ledger["ref_id"].astype(str).str.strip().str.upper()
    bank["_ref_norm"]   = bank["ref_id"].astype(str).str.strip().str.upper()

    # Excluir ref_ids nulos/vazios
    ledger_with_ref = ledger[ledger["_ref_norm"].notna() & (ledger["_ref_norm"] != "NONE") & (ledger["_ref_norm"] != "")]
    bank_with_ref   = bank[bank["_ref_norm"].notna()     & (bank["_ref_norm"]   != "NONE") & (bank["_ref_norm"]   != "")]

    # Join por ref_id normalizado
    merged = pd.merge(
        ledger_with_ref.reset_index().rename(columns={"index": "_ledger_idx"}),
        bank_with_ref.reset_index().rename(columns={"index": "_bank_idx"}),
        on="_ref_norm",
        suffixes=("_l", "_b"),
    )

    if merged.empty:
        logger.info("Tier 1: nenhum ref_id comum encontrado")
        return pd.DataFrame(), pd.DataFrame(), ledger, bank

    # Calcular diferenças
    merged["amount_diff"]   = (merged["amount_l"] - merged["amount_b"]).round(2)
    merged["date_diff_days"] = (
        pd.to_datetime(merged["txn_date_l"]) - pd.to_datetime(merged["txn_date_b"])
    ).dt.days.abs()

    # Separar matched vs mismatch
    exact_mask    = (merged["amount_diff"] == 0.0) & (merged["date_diff_days"] <= tol_days)
    mismatch_mask = (merged["amount_diff"] != 0.0)

    matched_pairs   = merged[exact_mask].copy()
    mismatch_pairs  = merged[mismatch_mask].copy()

    matched_pairs["match_tier"]       = 1
    matched_pairs["match_type"]       = "matched"
    matched_pairs["confidence_score"] = 100
    matched_pairs["match_criteria"]   = "ref_id + amount + date(±" + str(tol_days) + "d)"

    mismatch_pairs["match_tier"]       = 1
    mismatch_pairs["match_type"]       = "mismatch"
    mismatch_pairs["confidence_score"] = 95
    mismatch_pairs["match_criteria"]   = "ref_id match, amount differs"

    # Índices usados — remover dos DataFrames restantes
    used_ledger_idx = set(matched_pairs["_ledger_idx"]) | set(mismatch_pairs["_ledger_idx"])
    used_bank_idx   = set(matched_pairs["_bank_idx"])   | set(mismatch_pairs["_bank_idx"])

    remaining_ledger = ledger[~ledger.index.isin(used_ledger_idx)].copy()
    remaining_bank   = bank[~bank.index.isin(used_bank_idx)].copy()

    logger.info(
        f"Tier 1 — matched: {len(matched_pairs)}, "
        f"mismatches: {len(mismatch_pairs)}, "
        f"remaining ledger: {len(remaining_ledger)}, "
        f"remaining bank: {len(remaining_bank)}"
    )

    return matched_pairs, mismatch_pairs, remaining_ledger, remaining_bank
