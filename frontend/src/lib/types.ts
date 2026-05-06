// ============================================================
// ReconEngine — TypeScript Types
// Espelha exactamente os schemas Pydantic do backend
// ============================================================

export type RunStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface ReconciliationRun {
  run_id:            string;
  status:            RunStatus;
  period_label:      string | null;
  period_start:      string;   // ISO date
  period_end:        string;
  ledger_source:     string | null;
  bank_source:       string | null;
  ledger_count:      number;
  bank_count:        number;
  matched_count:     number;
  mismatch_count:    number;
  unmatched_a_count: number;
  unmatched_b_count: number;
  probable_count:    number;
  matched_value:     number;
  open_value:        number;
  match_rate:        number;
  open_items_count:  number;
  has_open_items:    boolean;
  started_at:        string;
  finished_at:       string | null;
  duration_secs:     number | null;
  error_message:     string | null;
  notes:             string | null;
}

export interface RunListOut {
  total: number;
  items: ReconciliationRun[];
}

export type MatchType = "matched" | "mismatch" | "unmatched_a" | "unmatched_b" | "probable";

export interface MatchResult {
  id:               number;
  run_id:           string;
  match_type:       MatchType;
  match_tier:       number | null;
  confidence_score: number;
  ledger_ref_id:    string | null;
  ledger_date:      string | null;
  ledger_desc:      string | null;
  ledger_amount:    number | null;
  ledger_currency:  string | null;
  ledger_category:  string | null;
  bank_ref_id:      string | null;
  bank_date:        string | null;
  bank_desc:        string | null;
  bank_amount:      number | null;
  amount_diff:      number;
  date_diff_days:   number;
  match_criteria:   string | null;
  status:           string;
}

export interface MatchListOut {
  total:       number;
  matched:     number;
  mismatch:    number;
  unmatched_a: number;
  unmatched_b: number;
  probable:    number;
  items:       MatchResult[];
}

export interface MatchSummaryByTier {
  tier1_exact:     number;
  tier2_fuzzy:     number;
  tier3_probable:  number;
  unmatched:       number;
  total:           number;
}

export type OpenItemType = "unmatched_a" | "unmatched_b" | "mismatch" | "probable";
export type ResolutionType = "write_off" | "timing_diff" | "bank_error" | "ledger_error" | "fx_diff" | "other";

export interface OpenItem {
  id:               number;
  run_id:           string;
  item_type:        OpenItemType;
  source:           string;
  ref_id:           string | null;
  txn_date:         string | null;
  description:      string | null;
  amount:           number;
  currency:         string;
  category:         string | null;
  ledger_amount:    number | null;
  bank_amount:      number | null;
  amount_diff:      number | null;
  status:           string;
  priority:         string;
  is_resolved:      boolean;
  aging_days:       number;
  resolved_at:      string | null;
  resolved_by:      string | null;
  resolution_type:  string | null;
  resolution_notes: string | null;
}

export interface OpenItemListOut {
  total:       number;
  open:        number;
  resolved:    number;
  total_value: number;
  items:       OpenItem[];
}

export interface ResolveRequest {
  item_ids:        number[];
  resolver:        string;
  resolution_type: ResolutionType;
  notes?:          string;
}

export interface LogLine {
  timestamp: string;
  level:     "ok" | "info" | "warn" | "error";
  message:   string;
}

export interface HealthStatus {
  status:    string;
  api:       string;
  database:  string;
  engine:    string;
  timestamp: string;
}

export interface ReportSummary {
  total_runs:       number;
  avg_match_rate:   number;
  total_open_items: number;
  total_open_value: number;
  runs: {
    run_id:       string;
    period_label: string;
    match_rate:   number;
    open_items:   number;
    open_value:   number;
    started_at:   string;
  }[];
}

export interface TrendPoint {
  period:     string;
  match_rate: number;
  open_items: number;
  open_value: number;
}
