"""
Testes do Motor de Matching — 3 Tiers
"""

import pytest
import pandas as pd
from datetime import date

from app.core.tier1_exact   import run_tier1
from app.core.tier2_fuzzy   import run_tier2
from app.core.tier3_probable import run_tier3


def make_ledger(rows):
    return pd.DataFrame(rows, columns=["ref_id","txn_date","description","amount","currency","category"])


def make_bank(rows):
    return pd.DataFrame(rows, columns=["ref_id","txn_date","description","amount","currency","category"])


class TestTier1Exact:
    def test_perfect_match(self):
        ledger = make_ledger([("REF-001", date(2024,5,1), "Payment Acme", 1000.0, "USD", "")])
        bank   = make_bank  ([("REF-001", date(2024,5,1), "ACME CORP",    1000.0, "USD", "")])
        matched, mismatches, rem_l, rem_b = run_tier1(ledger, bank)
        assert len(matched) == 1
        assert len(mismatches) == 0
        assert len(rem_l) == 0
        assert len(rem_b) == 0

    def test_date_tolerance(self):
        """Deve fazer match mesmo com 2 dias de diferença."""
        ledger = make_ledger([("REF-002", date(2024,5,1), "Wire", 5000.0, "USD", "")])
        bank   = make_bank  ([("REF-002", date(2024,5,3), "WIRE",  5000.0, "USD", "")])
        matched, _, _, _ = run_tier1(ledger, bank)
        assert len(matched) == 1

    def test_amount_mismatch_creates_mismatch(self):
        ledger = make_ledger([("REF-003", date(2024,5,10), "Invoice", 12450.0, "USD", "")])
        bank   = make_bank  ([("REF-003", date(2024,5,10), "Invoice", 12045.0, "USD", "")])
        matched, mismatches, _, _ = run_tier1(ledger, bank)
        assert len(matched) == 0
        assert len(mismatches) == 1
        assert abs(mismatches.iloc[0]["amount_diff"]) == 405.0

    def test_no_common_ref_ids(self):
        ledger = make_ledger([("REF-A", date(2024,5,1), "Payment", 100.0, "USD", "")])
        bank   = make_bank  ([("REF-B", date(2024,5,1), "Payment", 100.0, "USD", "")])
        matched, mismatches, rem_l, rem_b = run_tier1(ledger, bank)
        assert len(matched) == 0
        assert len(rem_l) == 1
        assert len(rem_b) == 1


class TestTier2Fuzzy:
    def test_fuzzy_description_match(self):
        ledger = make_ledger([(None, date(2024,5,5), "Wire Transfer USD to EUR", 45000.0, "USD", "")])
        bank   = make_bank  ([(None, date(2024,5,5), "Wire Transfer USD EUR",   45000.0, "USD", "")])
        matched, rem_l, rem_b = run_tier2(ledger, bank)
        assert len(matched) == 1
        assert matched.iloc[0]["confidence_score"] >= 85

    def test_different_amount_no_match(self):
        ledger = make_ledger([(None, date(2024,5,5), "Payroll June", 62500.0, "USD", "")])
        bank   = make_bank  ([(None, date(2024,5,5), "Payroll June", 63000.0, "USD", "")])
        matched, _, _ = run_tier2(ledger, bank)
        assert len(matched) == 0


class TestTier3Probable:
    def test_amount_and_date_match(self):
        ledger = make_ledger([(None, date(2024,5,20), "Bank Fee", 250.0, "USD", "")])
        bank   = make_bank  ([(None, date(2024,5,22), "FEE",      250.0, "USD", "")])
        probable, unmatched_a, unmatched_b = run_tier3(ledger, bank)
        assert len(probable) == 1
        assert probable.iloc[0]["confidence_score"] >= 50

    def test_outside_date_tolerance(self):
        """Diferença de 10 dias deve ficar sem match no Tier 3."""
        ledger = make_ledger([(None, date(2024,5,1),  "Transfer", 500.0, "USD", "")])
        bank   = make_bank  ([(None, date(2024,5,15), "Transfer", 500.0, "USD", "")])
        probable, unmatched_a, unmatched_b = run_tier3(ledger, bank)
        assert len(probable) == 0
        assert len(unmatched_a) == 1
        assert len(unmatched_b) == 1
