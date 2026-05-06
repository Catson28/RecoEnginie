-- ============================================================
-- ReconEngine — 06: Índices de Performance para Produção
-- Aplicar depois de inserir grandes volumes de dados
-- ============================================================

USE reconengine;

-- reconciliation_results — queries mais frequentes
CREATE INDEX IF NOT EXISTS idx_results_run_type
    ON reconciliation_results(run_id, match_type);

CREATE INDEX IF NOT EXISTS idx_results_run_tier
    ON reconciliation_results(run_id, match_tier);

CREATE INDEX IF NOT EXISTS idx_results_status
    ON reconciliation_results(run_id, status);

CREATE INDEX IF NOT EXISTS idx_results_ledger_date
    ON reconciliation_results(ledger_date);

-- open_items — filtros mais comuns
CREATE INDEX IF NOT EXISTS idx_items_run_type
    ON open_items(run_id, item_type, is_resolved);

CREATE INDEX IF NOT EXISTS idx_items_priority_status
    ON open_items(priority, status, is_resolved);

CREATE INDEX IF NOT EXISTS idx_items_aging
    ON open_items(is_resolved, created_at);

-- transactions — extracção rápida por período
CREATE INDEX IF NOT EXISTS idx_txn_run_source
    ON transactions(run_id, source, is_matched);

CREATE INDEX IF NOT EXISTS idx_txn_date_amount
    ON transactions(txn_date, amount);

SELECT '✓ Índices de performance aplicados.' AS status;
