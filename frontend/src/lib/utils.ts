// ============================================================
// ReconEngine — Utilities
// ============================================================

import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ── Formatação monetária ──────────────────────────────────
export function formatCurrency(
  value: number | null | undefined,
  currency = "USD"
): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style:    "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

// ── Formatação de percentagem ─────────────────────────────
export function formatPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatPctRaw(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ── Formatação de datas ───────────────────────────────────
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day:   "2-digit",
      month: "short",
      year:  "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day:    "2-digit",
      month:  "short",
      year:   "numeric",
      hour:   "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Duração ───────────────────────────────────────────────
export function formatDuration(secs: number | null | undefined): string {
  if (secs == null) return "—";
  if (secs < 60) return `${secs.toFixed(1)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}m ${s}s`;
}

// ── Cor por match type ────────────────────────────────────
export function matchTypeColor(type: string): string {
  switch (type) {
    case "matched":     return "var(--success)";
    case "mismatch":    return "var(--warning)";
    case "unmatched_a":
    case "unmatched_b": return "var(--danger)";
    case "probable":    return "var(--warning)";
    default:            return "var(--text-muted)";
  }
}

// ── Label amigável de match type ──────────────────────────
export function matchTypeLabel(type: string): string {
  const map: Record<string, string> = {
    matched:     "Matched",
    mismatch:    "Mismatch",
    unmatched_a: "Unmatched A",
    unmatched_b: "Unmatched B",
    probable:    "Probable",
  };
  return map[type] ?? type;
}

// ── Tier label ────────────────────────────────────────────
export function tierLabel(tier: number | null | undefined): string {
  if (!tier) return "—";
  const map: Record<number, string> = {
    1: "Tier 1 · Exact",
    2: "Tier 2 · Fuzzy",
    3: "Tier 3 · Probable",
  };
  return map[tier] ?? `Tier ${tier}`;
}

// ── Confidence score → cor ────────────────────────────────
export function confidenceColor(score: number): string {
  if (score >= 95) return "var(--success)";
  if (score >= 75) return "var(--warning)";
  return "var(--danger)";
}

// ── Status cor ────────────────────────────────────────────
export function runStatusColor(status: string): string {
  switch (status) {
    case "COMPLETED":  return "var(--success)";
    case "PROCESSING": return "var(--accent)";
    case "FAILED":     return "var(--danger)";
    case "PENDING":    return "var(--text-muted)";
    default:           return "var(--text-muted)";
  }
}

// ── Truncar texto ─────────────────────────────────────────
export function truncate(str: string | null | undefined, max = 40): string {
  if (!str) return "—";
  return str.length > max ? str.slice(0, max) + "…" : str;
}
