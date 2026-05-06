-- ============================================================
-- ReconEngine — 02: Criar Tabelas
-- ============================================================

USE reconengine;

-- ── reconciliation_runs ──────────────────────────────────────
-- Regista cada execução de reconciliação com métricas completas.
CREATE TABLE IF NOT EXISTS reconciliation_runs (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    run_id              VARCHAR(36)     NOT NULL UNIQUE,
    status              VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    -- PENDING | PROCESSING | COMPLETED | FAILED

    period_start        DATE            NOT NULL,
    period_end          DATE            NOT NULL,
    period_label        VARCHAR(50),

    ledger_source       VARCHAR(255),
    bank_source         VARCHAR(255),

    started_at          DATETIME        DEFAULT CURRENT_TIMESTAMP,
    finished_at         DATETIME,
    duration_secs       DECIMAL(10,2),

    -- Totais
    ledger_count        INT             DEFAULT 0,
    bank_count          INT             DEFAULT 0,

    -- Resultados de matching
    matched_count       INT             DEFAULT 0,
    mismatch_count      INT             DEFAULT 0,
    unmatched_a_count   INT             DEFAULT 0,
    unmatched_b_count   INT             DEFAULT 0,
    probable_count      INT             DEFAULT 0,

    -- Valores monetários
    matched_value       DECIMAL(18,2)   DEFAULT 0.00,
    open_value          DECIMAL(18,2)   DEFAULT 0.00,

    -- KPIs
    match_rate          DECIMAL(5,4)    DEFAULT 0.0000,
    open_items_count    INT             DEFAULT 0,
    has_open_items      BOOLEAN         DEFAULT FALSE,

    error_message       TEXT,
    notes               TEXT,
    log_json            LONGTEXT,
    metrics_json        LONGTEXT,

    INDEX idx_run_id     (run_id),
    INDEX idx_status     (status),
    INDEX idx_period     (period_start, period_end),
    INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Histórico de todas as execuções de reconciliação';


-- ── reconciliation_results ───────────────────────────────────
-- Cada linha = um par (ledger ↔ bank) com o resultado do matching.
CREATE TABLE IF NOT EXISTS reconciliation_results (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    run_id              VARCHAR(36)     NOT NULL,

    match_type          VARCHAR(20)     NOT NULL,
    -- matched | mismatch | unmatched_a | unmatched_b | probable

    match_tier          TINYINT,
    confidence_score    SMALLINT        DEFAULT 0,

    -- Lado Ledger (sistema contabilístico)
    ledger_ref_id       VARCHAR(100),
    ledger_date         DATE,
    ledger_desc         TEXT,
    ledger_amount       DECIMAL(18,2),
    ledger_currency     VARCHAR(10)     DEFAULT 'USD',
    ledger_category     VARCHAR(100),

    -- Lado Bank (extracto bancário)
    bank_ref_id         VARCHAR(100),
    bank_date           DATE,
    bank_desc           TEXT,
    bank_amount         DECIMAL(18,2),
    bank_currency       VARCHAR(10)     DEFAULT 'USD',

    -- Diferenças
    amount_diff         DECIMAL(18,2)   DEFAULT 0.00,
    date_diff_days      INT             DEFAULT 0,
    match_criteria      VARCHAR(100),

    -- Estado de resolução
    status              VARCHAR(20)     DEFAULT 'open',
    -- open | resolved | ignored

    -- Auditoria
    resolved_at         DATETIME,
    resolved_by         VARCHAR(255),
    resolution_type     VARCHAR(50),
    resolution_notes    TEXT,

    created_at          DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_run_id      (run_id),
    INDEX idx_match_type  (match_type),
    INDEX idx_match_tier  (match_tier),
    INDEX idx_status      (status),
    INDEX idx_ledger_ref  (ledger_ref_id),
    INDEX idx_bank_ref    (bank_ref_id),

    CONSTRAINT fk_results_run
        FOREIGN KEY (run_id) REFERENCES reconciliation_runs(run_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Resultados detalhados de cada par ledger-bank';


-- ── open_items ───────────────────────────────────────────────
-- Transacções não reconciliadas que precisam de revisão manual.
CREATE TABLE IF NOT EXISTS open_items (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    run_id              VARCHAR(36)     NOT NULL,

    item_type           VARCHAR(20)     NOT NULL,
    -- unmatched_a | unmatched_b | mismatch | probable

    source              VARCHAR(10),
    -- ledger | bank | both

    ref_id              VARCHAR(100),
    txn_date            DATE,
    description         TEXT,
    amount              DECIMAL(18,2)   NOT NULL,
    currency            VARCHAR(10)     DEFAULT 'USD',
    category            VARCHAR(100),

    -- Para mismatches
    ledger_amount       DECIMAL(18,2),
    bank_amount         DECIMAL(18,2),
    amount_diff         DECIMAL(18,2),

    -- Para prováveis
    probable_match_id   INT,
    probable_score      SMALLINT,

    -- Estado
    status              VARCHAR(20)     DEFAULT 'open',
    priority            VARCHAR(10)     DEFAULT 'normal',
    -- high | normal | low

    is_resolved         BOOLEAN         DEFAULT FALSE,
    aging_days          INT             DEFAULT 0,

    -- Resolução
    resolved_at         DATETIME,
    resolved_by         VARCHAR(255),
    resolution_type     VARCHAR(50),
    -- write_off | timing_diff | bank_error | ledger_error | fx_diff | other
    resolution_notes    TEXT,

    created_at          DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_run_id      (run_id),
    INDEX idx_item_type   (item_type),
    INDEX idx_is_resolved (is_resolved),
    INDEX idx_priority    (priority),
    INDEX idx_status      (status),
    INDEX idx_txn_date    (txn_date),

    CONSTRAINT fk_items_run
        FOREIGN KEY (run_id) REFERENCES reconciliation_runs(run_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Itens em aberto aguardando resolução manual';


-- ── transactions ─────────────────────────────────────────────
-- Transacções brutas importadas de cada run.
CREATE TABLE IF NOT EXISTS transactions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    run_id          VARCHAR(36)     NOT NULL,
    source          VARCHAR(10)     NOT NULL,
    -- ledger | bank

    ref_id          VARCHAR(100),
    txn_date        DATE            NOT NULL,
    description     TEXT,
    amount          DECIMAL(18,2)   NOT NULL,
    currency        VARCHAR(10)     DEFAULT 'USD',
    category        VARCHAR(100),

    is_matched          BOOLEAN     DEFAULT FALSE,
    match_result_id     INT,

    raw_data        TEXT,
    import_at       DATETIME        DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_run_id   (run_id),
    INDEX idx_source   (source),
    INDEX idx_txn_date (txn_date),
    INDEX idx_ref_id   (ref_id),

    CONSTRAINT fk_txn_run
        FOREIGN KEY (run_id) REFERENCES reconciliation_runs(run_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Transacções brutas importadas por run';


SELECT '✓ Todas as tabelas criadas com sucesso.' AS status;
