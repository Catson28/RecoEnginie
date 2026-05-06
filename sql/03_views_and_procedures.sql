-- ============================================================
-- ReconEngine — 03: Views e Stored Procedures
-- ============================================================

USE reconengine;

-- ── VIEWS ────────────────────────────────────────────────────

-- View 1: Dashboard executivo — últimos 12 runs
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
    run_id,
    period_label,
    period_start,
    period_end,
    status,
    ledger_count,
    bank_count,
    matched_count,
    unmatched_a_count,
    unmatched_b_count,
    mismatch_count,
    probable_count,
    ROUND(match_rate * 100, 1)   AS match_rate_pct,
    open_items_count,
    ROUND(open_value, 2)          AS open_value,
    ROUND(matched_value, 2)       AS matched_value,
    started_at,
    duration_secs
FROM reconciliation_runs
WHERE status = 'COMPLETED'
ORDER BY started_at DESC
LIMIT 12;


-- View 2: Open items não resolvidos com aging
CREATE OR REPLACE VIEW v_open_items_pending AS
SELECT
    oi.id,
    oi.run_id,
    rr.period_label,
    oi.item_type,
    oi.source,
    oi.ref_id,
    oi.txn_date,
    oi.description,
    oi.amount,
    oi.currency,
    oi.priority,
    DATEDIFF(NOW(), oi.created_at)  AS aging_days
FROM open_items oi
JOIN reconciliation_runs rr ON oi.run_id = rr.run_id
WHERE oi.is_resolved = FALSE
ORDER BY
    FIELD(oi.priority, 'high', 'normal', 'low'),
    oi.created_at ASC;


-- View 3: Distribuição de matches por tier
CREATE OR REPLACE VIEW v_tier_distribution AS
SELECT
    run_id,
    SUM(CASE WHEN match_tier = 1 AND match_type = 'matched' THEN 1 ELSE 0 END) AS tier1_exact,
    SUM(CASE WHEN match_tier = 2 AND match_type = 'matched' THEN 1 ELSE 0 END) AS tier2_fuzzy,
    SUM(CASE WHEN match_tier = 3                            THEN 1 ELSE 0 END) AS tier3_probable,
    SUM(CASE WHEN match_type IN ('unmatched_a','unmatched_b') THEN 1 ELSE 0 END) AS unmatched,
    COUNT(*) AS total
FROM reconciliation_results
GROUP BY run_id;


-- View 4: Tendências de match rate ao longo do tempo
CREATE OR REPLACE VIEW v_match_rate_trends AS
SELECT
    period_label,
    period_start,
    ROUND(match_rate * 100, 1)  AS match_rate_pct,
    open_items_count,
    ROUND(open_value, 2)         AS open_value,
    ledger_count + bank_count    AS total_transactions
FROM reconciliation_runs
WHERE status = 'COMPLETED'
ORDER BY period_start ASC;


-- View 5: Estatísticas de qualidade de dados por fonte
CREATE OR REPLACE VIEW v_data_quality AS
SELECT
    t.source,
    COUNT(*)                                                    AS total_txns,
    SUM(CASE WHEN t.ref_id IS NULL OR t.ref_id = '' THEN 1 ELSE 0 END) AS missing_ref_id,
    SUM(CASE WHEN t.description IS NULL OR t.description = '' THEN 1 ELSE 0 END) AS missing_desc,
    SUM(CASE WHEN t.is_matched = TRUE  THEN 1 ELSE 0 END)      AS matched,
    SUM(CASE WHEN t.is_matched = FALSE THEN 1 ELSE 0 END)      AS unmatched,
    ROUND(100.0 * SUM(CASE WHEN t.is_matched = TRUE THEN 1 ELSE 0 END) / COUNT(*), 1) AS match_rate_pct
FROM transactions t
GROUP BY t.source;


-- ── STORED PROCEDURES ────────────────────────────────────────

-- Procedure 1: Resumo executivo de um run específico
DELIMITER //
DROP PROCEDURE IF EXISTS sp_run_summary//
CREATE PROCEDURE sp_run_summary(IN p_run_id VARCHAR(36))
BEGIN
    SELECT
        run_id,
        period_label,
        status,
        ledger_count,
        bank_count,
        matched_count,
        ROUND(match_rate * 100, 2)  AS match_rate_pct,
        open_items_count,
        ROUND(open_value, 2)         AS open_value,
        duration_secs,
        started_at,
        finished_at
    FROM reconciliation_runs
    WHERE run_id = p_run_id;

    -- Distribuição por tier
    SELECT
        match_type,
        match_tier,
        COUNT(*)                    AS count,
        ROUND(AVG(confidence_score), 1) AS avg_confidence
    FROM reconciliation_results
    WHERE run_id = p_run_id
    GROUP BY match_type, match_tier
    ORDER BY match_tier, match_type;
END //
DELIMITER ;


-- Procedure 2: Resolver open items em lote
DELIMITER //
DROP PROCEDURE IF EXISTS sp_bulk_resolve//
CREATE PROCEDURE sp_bulk_resolve(
    IN p_run_id         VARCHAR(36),
    IN p_item_type      VARCHAR(20),   -- NULL = todos os tipos
    IN p_resolver       VARCHAR(255),
    IN p_resolution_type VARCHAR(50),
    IN p_notes          TEXT
)
BEGIN
    DECLARE rows_affected INT DEFAULT 0;

    IF p_item_type IS NULL THEN
        UPDATE open_items
        SET
            is_resolved      = TRUE,
            status           = 'resolved',
            resolved_at      = NOW(),
            resolved_by      = p_resolver,
            resolution_type  = p_resolution_type,
            resolution_notes = p_notes,
            updated_at       = NOW()
        WHERE run_id = p_run_id AND is_resolved = FALSE;
    ELSE
        UPDATE open_items
        SET
            is_resolved      = TRUE,
            status           = 'resolved',
            resolved_at      = NOW(),
            resolved_by      = p_resolver,
            resolution_type  = p_resolution_type,
            resolution_notes = p_notes,
            updated_at       = NOW()
        WHERE run_id = p_run_id
          AND item_type = p_item_type
          AND is_resolved = FALSE;
    END IF;

    SET rows_affected = ROW_COUNT();
    SELECT rows_affected AS resolved_count, 'OK' AS status;
END //
DELIMITER ;


-- Procedure 3: Escalar open items antigos
DELIMITER //
DROP PROCEDURE IF EXISTS sp_escalate_aging//
CREATE PROCEDURE sp_escalate_aging(IN p_days INT)
BEGIN
    UPDATE open_items
    SET
        priority   = 'high',
        aging_days = DATEDIFF(NOW(), created_at),
        updated_at = NOW()
    WHERE is_resolved = FALSE
      AND DATEDIFF(NOW(), created_at) >= p_days
      AND priority != 'high';

    SELECT ROW_COUNT() AS escalated_count;
END //
DELIMITER ;


-- Procedure 4: Estatísticas globais para o dashboard
DELIMITER //
DROP PROCEDURE IF EXISTS sp_global_stats//
CREATE PROCEDURE sp_global_stats()
BEGIN
    SELECT
        COUNT(*)                                        AS total_runs,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_runs,
        ROUND(AVG(CASE WHEN status = 'COMPLETED' THEN match_rate END) * 100, 1) AS avg_match_rate_pct,
        SUM(CASE WHEN status = 'COMPLETED' THEN matched_count ELSE 0 END) AS total_matched,
        SUM(CASE WHEN status = 'COMPLETED' THEN open_items_count ELSE 0 END) AS total_open_items,
        ROUND(SUM(CASE WHEN status = 'COMPLETED' THEN open_value ELSE 0 END), 2) AS total_open_value
    FROM reconciliation_runs;

    -- Open items por tipo
    SELECT
        item_type,
        COUNT(*)             AS total,
        SUM(is_resolved)     AS resolved,
        SUM(NOT is_resolved) AS pending,
        ROUND(SUM(amount), 2) AS total_value
    FROM open_items
    GROUP BY item_type;
END //
DELIMITER ;


SELECT '✓ Views e stored procedures criadas com sucesso.' AS status;
