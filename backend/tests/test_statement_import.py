"""
Testes de Importação de Extractos — CSV
"""

import io
import pytest
import pandas as pd
from app.core.statement_importer import (
    load_file, normalize_ledger, normalize_bank_statement,
    validate_ledger, validate_bank_statement, get_preview,
)


LEDGER_CSV = b"""ref_id,date,description,amount,currency,category
REF-001,2024-05-01,Payment Acme Corp,1000.00,USD,Accounts Receivable
REF-002,2024-05-05,Wire Transfer,45000.00,USD,FX
REF-003,2024-05-10,Invoice Acme,12450.00,USD,Revenue
"""

BANK_CSV = b"""ref_id,txn_date,description,amount
REF-001,2024-05-01,ACME CORP PAYMENT,1000.00
REF-002,2024-05-05,WIRE TRF USD-EUR,45000.00
,2024-05-28,BANK FEE MONTHLY,250.00
"""


class TestLoadFile:
    def test_load_csv(self):
        df = load_file(LEDGER_CSV, "ledger.csv")
        assert len(df) == 3
        assert "ref_id" in df.columns

    def test_invalid_extension(self):
        with pytest.raises(ValueError, match="Extensão não suportada"):
            load_file(b"data", "file.pdf")

    def test_columns_lowercase(self):
        csv = b"REF_ID,Date,AMOUNT\nR1,2024-05-01,100\n"
        df = load_file(csv, "test.csv")
        assert "ref_id" in df.columns
        assert "date" in df.columns


class TestNormalizeLedger:
    def test_normalizes_date_column(self):
        raw = load_file(LEDGER_CSV, "ledger.csv")
        df  = normalize_ledger(raw)
        assert "txn_date" in df.columns
        assert df["txn_date"].notna().all()

    def test_normalizes_amount(self):
        raw = load_file(LEDGER_CSV, "ledger.csv")
        df  = normalize_ledger(raw)
        assert df["amount"].dtype in [float, "float64"]

    def test_output_columns(self):
        raw = load_file(LEDGER_CSV, "ledger.csv")
        df  = normalize_ledger(raw)
        expected = {"ref_id", "txn_date", "description", "amount", "currency", "category"}
        assert expected.issubset(set(df.columns))


class TestNormalizeBankStatement:
    def test_normalizes_bank(self):
        raw = load_file(BANK_CSV, "bank.csv")
        df  = normalize_bank_statement(raw)
        assert "txn_date" in df.columns
        assert len(df) == 3


class TestValidation:
    def test_valid_ledger(self):
        raw = load_file(LEDGER_CSV, "ledger.csv")
        df  = normalize_ledger(raw)
        ok, missing = validate_ledger(df)
        assert ok
        assert missing == []

    def test_invalid_ledger_missing_amount(self):
        df = pd.DataFrame({"txn_date": ["2024-05-01"]})
        ok, missing = validate_ledger(df)
        assert not ok
        assert "amount" in missing


class TestPreview:
    def test_preview_structure(self):
        raw = load_file(LEDGER_CSV, "ledger.csv")
        df  = normalize_ledger(raw)
        preview = get_preview(df, rows=2)
        assert "columns" in preview
        assert "row_count" in preview
        assert len(preview["preview"]) == 2
        assert preview["row_count"] == 3
