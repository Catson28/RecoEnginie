"""
ReconEngine — Matching Engine (Orquestrador)
==============================================
Coordena os 3 tiers de matching e persiste todos os resultados na BD.

Fluxo:
  Ledger + Bank
       ↓
  Tier 1 (Exact) ──→ matched / mismatches
       ↓ (restantes)
  Tier 2 (Fuzzy) ──→ matched (fuzzy)
       ↓ (restantes)
  Tier 3 (Probable) ──→ probable
       ↓ (restantes)
  Unmatched A (só ledger) + Unmatched B (só bank)
       ↓
  Open Items criados para revisão
"""

import json
import logging
import uuid
from dataclasses import dataclass, field, asdict
from datetime import date, datetime, timezone
from typing import Optional

import pandas as pd
from sqlalchemy.orm import Session

from app.core.tier1_exact  import run_tier1
from app.core.tier2_fuzzy  import run_tier2
from app.core.tier3_probable import run_tier3
from app.models.reconciliation_run import ReconciliationRun
from app.models.match_result import MatchResult
from app.models.open_item import OpenItem
from app.models.transaction import Transaction

logger = logging.getLogger("matching_engine")


@dataclass
class EngineMetrics:
    run_id:            str
    period_start:      date
    period_end:        date
    ledger_count:      int = 0
    bank_count:        int = 0
    matched_count:     int = 0
    mismatch_count:    int = 0
    unmatched_a_count: int = 0
    unmatched_b_count: int = 0
    probable_count:    int = 0
    matched_value:     float = 0.0
    open_value:        float = 0.0
    duration_secs:     float = 0.0
    log_lines:         list = field(default_factory=list)

    @property
    def total_processed(self) -> int:
        return self.ledger_count + self.bank_count

    @property
    def match_rate(self) -> float:
        denom = max(self.ledger_count, self.bank_count)
        return (self.matched_count / denom) if denom > 0 else 0.0

    @property
    def open_items_count(self) -> int:
        return self.mismatch_count + self.unmatched_a_count + self.unmatched_b_count + self.probable_count

    def log(self, level: str, msg: str):
        ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
        self.log_lines.append({"timestamp": ts, "level": level, "message": msg})
        getattr(logger, "info" if level in ("ok", "info") else level, logger.info)(msg)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["match_rate"]       = self.match_rate
        d["open_items_count"] = self.open_items_count
        d.pop("log_lines")
        return d


class MatchingEngine:
    def __init__(self, db: Session):
        self.db = db

    def execute(
        self,
        run_id:       str,
        ledger_df:    pd.DataFrame,
        bank_df:      pd.DataFrame,
        period_start: date,
        period_end:   date,
        ledger_name:  str = "",
        bank_name:    str = "",
    ) -> EngineMetrics:
        """
        Executa os 3 tiers de matching e persiste tudo na BD.
        Actualiza o ReconciliationRun com os resultados finais.
        """
        import time
        t_start = time.time()

        m = EngineMetrics(
            run_id       = run_id,
            period_start = period_start,
            period_end   = period_end,
            ledger_count = len(ledger_df),
            bank_count   = len(bank_df),
        )

        m.log("ok",   f"Engine iniciado — run_id: {run_id}")
        m.log("info", f"Ledger: {len(ledger_df)} transacções | Bank: {len(bank_df)} transacções")

        # ── Tier 1 ──────────────────────────────────────────────
        m.log("info", "Tier 1: exact matching (ref_id + amount + date)…")
        t1_matched, t1_mismatches, rem_ledger, rem_bank = run_tier1(ledger_df, bank_df)

        m.matched_count  += len(t1_matched)
        m.mismatch_count += len(t1_mismatches)
        m.log("ok", f"Tier 1 — {len(t1_matched)} matched, {len(t1_mismatches)} mismatches")

        self._persist_tier1_results(run_id, t1_matched, t1_mismatches)

        # ── Tier 2 ──────────────────────────────────────────────
        m.log("info", f"Tier 2: fuzzy matching ({len(rem_ledger)} + {len(rem_bank)} restantes)…")
        t2_matched, rem_ledger, rem_bank = run_tier2(rem_ledger, rem_bank)

        m.matched_count += len(t2_matched)
        m.log("ok", f"Tier 2 — {len(t2_matched)} fuzzy matched")

        if not t2_matched.empty:
            self._persist_match_rows(run_id, t2_matched)

        # ── Tier 3 ──────────────────────────────────────────────
        m.log("info", f"Tier 3: probable matching ({len(rem_ledger)} + {len(rem_bank)} restantes)…")
        t3_probable, unmatched_a, unmatched_b = run_tier3(rem_ledger, rem_bank)

        m.probable_count    = len(t3_probable)
        m.unmatched_a_count = len(unmatched_a)
        m.unmatched_b_count = len(unmatched_b)
        m.log("ok", f"Tier 3 — {len(t3_probable)} probable, "
                    f"{len(unmatched_a)} unmatched-A, {len(unmatched_b)} unmatched-B")

        if not t3_probable.empty:
            self._persist_match_rows(run_id, t3_probable)

        # ── Open Items ──────────────────────────────────────────
        self._create_open_items(run_id, t1_mismatches, t3_probable, unmatched_a, unmatched_b)

        # ── Valores monetários ──────────────────────────────────
        m.matched_value = self._sum_amount(t1_matched) + self._sum_amount(t2_matched)
        m.open_value    = (
            self._sum_amount(t1_mismatches, "amount_l") +
            self._sum_amount(t3_probable, "ledger_amount") +
            self._sum_col(unmatched_a, "amount") +
            self._sum_col(unmatched_b, "amount")
        )

        m.duration_secs = round(time.time() - t_start, 2)
        m.log("ok", f"Engine concluído em {m.duration_secs}s — match rate: {m.match_rate:.1%}")

        # ── Actualizar ReconciliationRun ─────────────────────────
        self._update_run(run_id, m)

        return m

    # ── Métodos privados de persistência ───────────────────────

    def _persist_tier1_results(self, run_id: str, matched: pd.DataFrame, mismatches: pd.DataFrame):
        rows = []
        for _, r in matched.iterrows():
            rows.append(self._tier1_row_to_model(run_id, r, "matched"))
        for _, r in mismatches.iterrows():
            rows.append(self._tier1_row_to_model(run_id, r, "mismatch"))
        if rows:
            self.db.bulk_save_objects(rows)
            self.db.commit()

    def _tier1_row_to_model(self, run_id: str, r, match_type: str) -> MatchResult:
        return MatchResult(
            run_id           = run_id,
            match_type       = match_type,
            match_tier       = 1,
            confidence_score = int(r.get("confidence_score", 100)),
            match_criteria   = str(r.get("match_criteria", "")),
            ledger_ref_id    = str(r.get("ref_id_l", r.get("_ref_norm", ""))),
            ledger_date      = r.get("txn_date_l"),
            ledger_desc      = str(r.get("description_l", "")),
            ledger_amount    = float(r.get("amount_l", 0)),
            ledger_currency  = str(r.get("currency_l", "USD")),
            ledger_category  = str(r.get("category_l", "")),
            bank_ref_id      = str(r.get("ref_id_b", "")),
            bank_date        = r.get("txn_date_b"),
            bank_desc        = str(r.get("description_b", "")),
            bank_amount      = float(r.get("amount_b", 0)),
            bank_currency    = str(r.get("currency_b", "USD")),
            amount_diff      = float(r.get("amount_diff", 0)),
            date_diff_days   = int(r.get("date_diff_days", 0)),
            status           = "open" if match_type == "mismatch" else "resolved",
        )

    def _persist_match_rows(self, run_id: str, df: pd.DataFrame):
        rows = []
        for _, r in df.iterrows():
            rows.append(MatchResult(
                run_id           = run_id,
                match_type       = str(r.get("match_type", "matched")),
                match_tier       = int(r.get("match_tier", 2)),
                confidence_score = int(r.get("confidence_score", 0)),
                match_criteria   = str(r.get("match_criteria", "")),
                ledger_ref_id    = str(r.get("ledger_ref_id", "") or ""),
                ledger_date      = r.get("ledger_date"),
                ledger_desc      = str(r.get("ledger_desc", "")),
                ledger_amount    = float(r.get("ledger_amount", 0)),
                ledger_currency  = str(r.get("ledger_currency", "USD")),
                ledger_category  = str(r.get("ledger_category", "")),
                bank_ref_id      = str(r.get("bank_ref_id", "") or ""),
                bank_date        = r.get("bank_date"),
                bank_desc        = str(r.get("bank_desc", "")),
                bank_amount      = float(r.get("bank_amount", 0)),
                bank_currency    = str(r.get("bank_currency", "USD")),
                amount_diff      = float(r.get("amount_diff", 0)),
                date_diff_days   = int(r.get("date_diff_days", 0)),
                status           = "open" if r.get("match_type") == "probable" else "resolved",
            ))
        if rows:
            self.db.bulk_save_objects(rows)
            self.db.commit()

    def _create_open_items(self, run_id, mismatches, probable, unmatched_a, unmatched_b):
        items = []

        for _, r in mismatches.iterrows():
            items.append(OpenItem(
                run_id       = run_id,
                item_type    = "mismatch",
                source       = "both",
                ref_id       = str(r.get("ref_id_l", r.get("_ref_norm", ""))),
                txn_date     = r.get("txn_date_l"),
                description  = str(r.get("description_l", "")),
                amount       = abs(float(r.get("amount_diff", 0))),
                ledger_amount= float(r.get("amount_l", 0)),
                bank_amount  = float(r.get("amount_b", 0)),
                amount_diff  = float(r.get("amount_diff", 0)),
                priority     = "high",
            ))

        for _, r in probable.iterrows():
            items.append(OpenItem(
                run_id       = run_id,
                item_type    = "probable",
                source       = "both",
                ref_id       = str(r.get("ledger_ref_id", "") or ""),
                txn_date     = r.get("ledger_date"),
                description  = str(r.get("ledger_desc", "")),
                amount       = float(r.get("ledger_amount", 0)),
                probable_score = int(r.get("confidence_score", 0)),
                priority     = "normal",
            ))

        for _, r in unmatched_a.iterrows():
            items.append(OpenItem(
                run_id      = run_id,
                item_type   = "unmatched_a",
                source      = "ledger",
                ref_id      = str(r.get("ref_id", "") or ""),
                txn_date    = r.get("txn_date"),
                description = str(r.get("description", "")),
                amount      = float(r.get("amount", 0)),
                currency    = str(r.get("currency", "USD")),
                category    = str(r.get("category", "")),
                priority    = "high",
            ))

        for _, r in unmatched_b.iterrows():
            items.append(OpenItem(
                run_id      = run_id,
                item_type   = "unmatched_b",
                source      = "bank",
                ref_id      = str(r.get("ref_id", "") or ""),
                txn_date    = r.get("txn_date"),
                description = str(r.get("description", "")),
                amount      = float(r.get("amount", 0)),
                currency    = str(r.get("currency", "USD")),
                priority    = "normal",
            ))

        if items:
            self.db.bulk_save_objects(items)
            self.db.commit()

    def _update_run(self, run_id: str, m: EngineMetrics):
        from datetime import datetime, timezone
        run = self.db.query(ReconciliationRun).filter_by(run_id=run_id).first()
        if not run:
            return
        run.status           = "COMPLETED"
        run.finished_at      = datetime.now(timezone.utc)
        run.duration_secs    = m.duration_secs
        run.ledger_count     = m.ledger_count
        run.bank_count       = m.bank_count
        run.matched_count    = m.matched_count
        run.mismatch_count   = m.mismatch_count
        run.unmatched_a_count= m.unmatched_a_count
        run.unmatched_b_count= m.unmatched_b_count
        run.probable_count   = m.probable_count
        run.matched_value    = m.matched_value
        run.open_value       = m.open_value
        run.match_rate       = m.match_rate
        run.open_items_count = m.open_items_count
        run.has_open_items   = m.open_items_count > 0
        run.metrics_json     = json.dumps(m.to_dict(), default=str)
        run.log_json         = json.dumps(m.log_lines)
        self.db.commit()

    @staticmethod
    def _sum_amount(df: pd.DataFrame, col: str = "amount") -> float:
        if df.empty or col not in df.columns:
            return 0.0
        return float(df[col].abs().sum())

    @staticmethod
    def _sum_col(df: pd.DataFrame, col: str = "amount") -> float:
        if df.empty or col not in df.columns:
            return 0.0
        return float(df[col].abs().sum())
