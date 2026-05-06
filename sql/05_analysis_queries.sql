-- ============================================================
-- ReconEngine — 05: Queries de Análise e Auditoria
-- Use estas queries para investigar problemas e auditar dados
-- ============================================================

USE reconengine;


-- ── SECÇÃO 1: DASHBOARD ──────────────────────────────────────

-- 1.1 Resumo executivo global
CALL sp_global_stats();

-- 1.2 Últimos 12 runs com KPIs
SELECT * FROM v_dashboard_summary;

-- 1.3 Tendência de match rate
SELECT * FROM v_match_rate_trends;


-- ── SECÇÃO 2: OPEN ITEMS ─────────────────────────────────────

-- 2.1 Todos os open items pendentes com aging
SELECT * FROM v_open_items_pending;

-- 2.2 Open items por tipo e valor
SELECT
    item_type,
    COUNT(*)                AS count,
    ROUND(SUM(amount), 2)   AS total_value,
    MIN(txn_date)           AS oldest_txn,
    MAX(txn_date)           AS newest_txn
FROM open_items
WHERE is_resolved = FALSE
GROUP BY item_type
ORDER BY total_value DESC;

-- 2.3 Open items com mais de 30 dias (aging crítico)
SELECT
    oi.id,
    rr.period_label,
    oi.item_type,
    oi.ref_id,
    oi.txn_date,
    oi.description,
    oi.amount,
    DATEDIFF(NOW(), oi.created_at) AS aging_days
FROM open_items oi
JOIN reconciliation_runs rr ON oi.run_id = rr.run_id
WHERE oi.is_resolved = FALSE
  AND DATEDIFF(NOW(), oi.created_at) >= 30
ORDER BY aging_days DESC;

-- 2.4 Historial de resoluções por tipo
SELECT
    resolution_type,
    COUNT(*)                AS count,
    ROUND(SUM(amount), 2)   AS total_value_resolved,
    MIN(resolved_at)        AS first_resolution,
    MAX(resolved_at)        AS last_resolution
FROM open_items
WHERE is_resolved = TRUE
GROUP BY resolution_type
ORDER BY count DESC;


-- ── SECÇÃO 3: MATCHING ANALYTICS ─────────────────────────────

-- 3.1 Distribuição de matches por tier (todos os runs)
SELECT * FROM v_tier_distribution;

-- 3.2 Top mismatches por valor de diferença
SELECT
    rr.period_label,
    rr2.ledger_ref_id,
    rr2.ledger_date,
    rr2.ledger_desc,
    rr2.ledger_amount,
    rr2.bank_amount,
    rr2.amount_diff,
    rr2.status
FROM reconciliation_results rr2
JOIN reconciliation_runs rr ON rr2.run_id = rr.run_id
WHERE rr2.match_type = 'mismatch'
  AND rr2.status = 'open'
ORDER BY ABS(rr2.amount_diff) DESC
LIMIT 20;

-- 3.3 Eficácia por tier (% de transacções matched em cada tier)
SELECT
    match_tier,
    COUNT(*)                    AS total,
    ROUND(AVG(confidence_score),1) AS avg_confidence,
    MIN(confidence_score)       AS min_confidence,
    MAX(confidence_score)       AS max_confidence
FROM reconciliation_results
WHERE match_type = 'matched'
GROUP BY match_tier
ORDER BY match_tier;

-- 3.4 Transacções não matched por período
SELECT
    rr.period_label,
    SUM(CASE WHEN rr2.match_type = 'unmatched_a' THEN 1 ELSE 0 END) AS unmatched_a,
    SUM(CASE WHEN rr2.match_type = 'unmatched_b' THEN 1 ELSE 0 END) AS unmatched_b,
    ROUND(SUM(CASE WHEN rr2.match_type = 'unmatched_a' THEN rr2.ledger_amount ELSE 0 END), 2) AS value_unmatched_a,
    ROUND(SUM(CASE WHEN rr2.match_type = 'unmatched_b' THEN rr2.bank_amount   ELSE 0 END), 2) AS value_unmatched_b
FROM reconciliation_results rr2
JOIN reconciliation_runs rr ON rr2.run_id = rr.run_id
WHERE rr2.match_type IN ('unmatched_a','unmatched_b')
GROUP BY rr.run_id, rr.period_label
ORDER BY rr.period_start DESC;


-- ── SECÇÃO 4: QUALIDADE DE DADOS ─────────────────────────────

-- 4.1 Qualidade por fonte
SELECT * FROM v_data_quality;

-- 4.2 Transacções sem ref_id (dificulta o Tier 1)
SELECT
    source,
    COUNT(*) AS txns_without_ref_id
FROM transactions
WHERE (ref_id IS NULL OR ref_id = '')
GROUP BY source;

-- 4.3 Duplicatas potenciais (mesmo amount + date na mesma fonte)
SELECT
    source,
    txn_date,
    amount,
    COUNT(*) AS duplicates
FROM transactions
GROUP BY source, txn_date, amount
HAVING COUNT(*) > 1
ORDER BY duplicates DESC
LIMIT 20;


-- ── SECÇÃO 5: AUDITORIA ───────────────────────────────────────

-- 5.1 Auditoria completa de resoluções
SELECT
    oi.id,
    rr.period_label,
    oi.item_type,
    oi.ref_id,
    oi.amount,
    oi.resolution_type,
    oi.resolution_notes,
    oi.resolved_by,
    oi.resolved_at
FROM open_items oi
JOIN reconciliation_runs rr ON oi.run_id = rr.run_id
WHERE oi.is_resolved = TRUE
ORDER BY oi.resolved_at DESC;

-- 5.2 Performance de runs ao longo do tempo
SELECT
    period_label,
    ledger_count,
    bank_count,
    matched_count,
    ROUND(match_rate * 100, 1)  AS match_rate_pct,
    open_items_count,
    ROUND(open_value, 2)         AS open_value,
    duration_secs
FROM reconciliation_runs
WHERE status = 'COMPLETED'
ORDER BY period_start DESC;
