// ============================================================
// ReconEngine — API Client
// Todas as chamadas ao backend FastAPI centralizadas aqui.
// ============================================================

const BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Health ────────────────────────────────────────────────
export const getHealth = () => request<{ status: string; database: string; engine: string }>("/health");

// ── Runs ──────────────────────────────────────────────────
import type {
  RunListOut, ReconciliationRun, LogLine,
  MatchListOut, MatchSummaryByTier,
  OpenItemListOut, OpenItem, ResolveRequest,
  ReportSummary, TrendPoint,
} from "./types";

export const getRuns = (limit = 20) =>
  request<RunListOut>(`/runs?limit=${limit}`);

export const getRun = (runId: string) =>
  request<ReconciliationRun>(`/runs/${runId}`);

export const getRunLog = (runId: string) =>
  request<LogLine[]>(`/runs/${runId}/log`);

export const deleteRun = (runId: string) =>
  fetch(`${BASE}/runs/${runId}`, { method: "DELETE" });

export async function createRun(formData: FormData): Promise<ReconciliationRun> {
  const res = await fetch(`${BASE}/runs`, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Matching ──────────────────────────────────────────────
export const getMatches = (runId: string, matchType?: string, limit = 100) => {
  const q = new URLSearchParams({ limit: String(limit) });
  if (matchType) q.set("match_type", matchType);
  return request<MatchListOut>(`/matching/${runId}?${q}`);
};

export const getMatchSummary = (runId: string) =>
  request<MatchSummaryByTier>(`/matching/${runId}/summary`);

export const exportMatches = (runId: string) =>
  `${BASE}/matching/${runId}/export`;

// ── Open Items ────────────────────────────────────────────
export const getOpenItems = (params?: {
  run_id?: string;
  item_type?: string;
  is_resolved?: boolean;
  limit?: number;
}) => {
  const q = new URLSearchParams();
  if (params?.run_id)    q.set("run_id", params.run_id);
  if (params?.item_type) q.set("item_type", params.item_type);
  if (params?.is_resolved !== undefined) q.set("is_resolved", String(params.is_resolved));
  if (params?.limit)     q.set("limit", String(params.limit));
  return request<OpenItemListOut>(`/open-items?${q}`);
};

export const getOpenItemStats = (runId?: string) => {
  const q = runId ? `?run_id=${runId}` : "";
  return request<{ total_open: number; total_value: number; by_type: Record<string, { count: number; value: number }> }>(`/open-items/stats${q}`);
};

export const resolveItems = (body: ResolveRequest) =>
  request<{ resolved_count: number; message: string }>("/open-items/resolve", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

// ── Reports ───────────────────────────────────────────────
export const getReportSummary  = (limit = 12) => request<ReportSummary>(`/reports/summary?limit=${limit}`);
export const getReportTrends   = (limit = 12) => request<TrendPoint[]>(`/reports/trends?limit=${limit}`);
export const exportFullReport  = (runId: string) => `${BASE}/reports/${runId}/export`;
