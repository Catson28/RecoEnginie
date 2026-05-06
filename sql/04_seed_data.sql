-- ============================================================
-- ReconEngine — 04: Dados de Exemplo (Seed)
-- Para desenvolvimento e demonstração
-- ============================================================

USE reconengine;

-- ── Run 1: Maio 2024 — alto match rate ───────────────────────
INSERT INTO reconciliation_runs (
    run_id, status, period_start, period_end, period_label,
    ledger_source, bank_source,
    ledger_count, bank_count,
    matched_count, mismatch_count, unmatched_a_count, unmatched_b_count, probable_count,
    matched_value, open_value,
    match_rate, open_items_count, has_open_items,
    started_at, finished_at, duration_secs
) VALUES (
    'run-may-2024-demo', 'COMPLETED', '2024-05-01', '2024-05-31', 'May 2024',
    'ledger_may_2024.csv', 'horizon_bank_may_2024.csv',
    120, 118,
    112, 2, 3, 4, 5,
    2485600.00, 78450.00,
    0.9200, 9, TRUE,
    '2024-06-03 09:15:00', '2024-06-03 09:15:45', 45.2
);

-- Resultados de matching do Run 1
INSERT INTO reconciliation_results (
    run_id, match_type, match_tier, confidence_score, match_criteria,
    ledger_ref_id, ledger_date, ledger_desc, ledger_amount, ledger_currency,
    bank_ref_id,   bank_date,   bank_desc,  bank_amount,   bank_currency,
    amount_diff, date_diff_days, status
) VALUES
-- Tier 1 matches
('run-may-2024-demo','matched',1,100,'ref_id + amount + date(±2d)',
 'TXN-20240501-001','2024-05-01','Wire Transfer — Acme Corp',     45000.00,'USD',
 'TXN-20240501-001','2024-05-01','ACME CORP WIRE',                45000.00,'USD',  0.00,0,'resolved'),
('run-may-2024-demo','matched',1,100,'ref_id + amount + date(±2d)',
 'TXN-20240503-002','2024-05-03','Payment — Vendor Alpha',        12450.00,'USD',
 'TXN-20240503-002','2024-05-03','VENDOR ALPHA PAYMENT',          12450.00,'USD',  0.00,0,'resolved'),
('run-may-2024-demo','matched',1,100,'ref_id + amount + date(±2d)',
 'TXN-20240507-003','2024-05-07','Invoice #INV-2045 — Beta Ltd',   8750.00,'USD',
 'TXN-20240507-003','2024-05-07','BETA LTD INV2045',               8750.00,'USD',  0.00,0,'resolved'),
-- Tier 2 fuzzy match
('run-may-2024-demo','matched',2,92,'fuzzy_desc(92%) + amount',
 'TXN-20240510-008',  '2024-05-10','Payroll Direct Deposit May',  62500.00,'USD',
 NULL,                '2024-05-10','PAYROLL DD MAY 2024',          62500.00,'USD',  0.00,0,'resolved'),
-- Mismatch
('run-may-2024-demo','mismatch',1,95,'ref_id match, amount differs',
 'TXN-20240515-020','2024-05-15','Invoice #INV-2089 — Gamma Inc', 15500.00,'USD',
 'TXN-20240515-020','2024-05-15','GAMMA INC INV2089',             15045.00,'USD',  455.00,0,'open'),
-- Unmatched A (só no ledger)
('run-may-2024-demo','unmatched_a',NULL,0,'no match found',
 'TXN-20240528-045','2024-05-28','Petty Cash Reimbursement',        350.00,'USD',
  NULL,NULL,NULL,NULL,'USD',  0.00,0,'open'),
-- Unmatched B (só no banco)
('run-may-2024-demo','unmatched_b',NULL,0,'no match found',
  NULL,NULL,NULL,NULL,'USD',
 'BANK-20240522-101','2024-05-22','BANK SERVICE CHARGE MAY',        250.00,'USD',  0.00,0,'open');

-- Open items do Run 1
INSERT INTO open_items (
    run_id, item_type, source, ref_id, txn_date, description,
    amount, currency, ledger_amount, bank_amount, amount_diff,
    priority, status, is_resolved
) VALUES
('run-may-2024-demo','mismatch',   'both',   'TXN-20240515-020','2024-05-15','Invoice #INV-2089 — Gamma Inc', 455.00,'USD',15500.00,15045.00,455.00,'high',  'open',FALSE),
('run-may-2024-demo','unmatched_a','ledger', 'TXN-20240528-045','2024-05-28','Petty Cash Reimbursement',       350.00,'USD',NULL,NULL,NULL,'normal','open',FALSE),
('run-may-2024-demo','unmatched_b','bank',   'BANK-20240522-101','2024-05-22','Bank Service Charge May',        250.00,'USD',NULL,NULL,NULL,'normal','open',FALSE);


-- ── Run 2: Abril 2024 — totalmente reconciliado ───────────────
INSERT INTO reconciliation_runs (
    run_id, status, period_start, period_end, period_label,
    ledger_source, bank_source,
    ledger_count, bank_count,
    matched_count, mismatch_count, unmatched_a_count, unmatched_b_count, probable_count,
    matched_value, open_value,
    match_rate, open_items_count, has_open_items,
    started_at, finished_at, duration_secs
) VALUES (
    'run-apr-2024-demo', 'COMPLETED', '2024-04-01', '2024-04-30', 'Apr 2024',
    'ledger_apr_2024.csv', 'horizon_bank_apr_2024.csv',
    98, 98, 98, 0, 0, 0, 0,
    2210000.00, 0.00,
    1.0000, 0, FALSE,
    '2024-05-02 10:30:00', '2024-05-02 10:31:10', 70.1
);


-- ── Run 3: Março 2024 — problemas significativos ─────────────
INSERT INTO reconciliation_runs (
    run_id, status, period_start, period_end, period_label,
    ledger_source, bank_source,
    ledger_count, bank_count,
    matched_count, mismatch_count, unmatched_a_count, unmatched_b_count, probable_count,
    matched_value, open_value,
    match_rate, open_items_count, has_open_items,
    started_at, finished_at, duration_secs
) VALUES (
    'run-mar-2024-demo', 'COMPLETED', '2024-03-01', '2024-03-31', 'Mar 2024',
    'ledger_mar_2024.csv', 'horizon_bank_mar_2024.csv',
    145, 140,
    118, 8, 10, 6, 7,
    1980000.00, 425000.00,
    0.7800, 24, TRUE,
    '2024-04-02 08:00:00', '2024-04-02 08:01:32', 92.4
);


SELECT '✓ Dados de exemplo inseridos.' AS status;
SELECT CONCAT('Runs criados: ', COUNT(*)) AS info FROM reconciliation_runs;
SELECT CONCAT('Results criados: ', COUNT(*)) AS info FROM reconciliation_results;
SELECT CONCAT('Open items criados: ', COUNT(*)) AS info FROM open_items;
