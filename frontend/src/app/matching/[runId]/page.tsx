"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRun } from "@/hooks/useRuns";
import { useMatches, useMatchSummary } from "@/hooks/useMatching";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { exportMatches } from "@/lib/api";
import {
  formatCurrency,
  confidenceColor,
  truncate,
  tierLabel,
  matchTypeLabel,
} from "@/lib/utils";
import type { MatchResult, MatchType } from "@/lib/types";

// ── Flow Diagram ──────────────────────────────────────────────
function FlowDiagram({
  tier1Exact,
  tier2Fuzzy,
  tier3Probable,
  mismatches,
  unmatchedA,
  unmatchedB,
  total,
}: {
  tier1Exact: number;
  tier2Fuzzy: number;
  tier3Probable: number;
  mismatches: number;
  unmatchedA: number;
  unmatchedB: number;
  total: number;
}) {
  const matched = tier1Exact + tier2Fuzzy;
  const unmatched = unmatchedA + unmatchedB;
  const pctBar = (n: number) =>
    total > 0 ? Math.round((n / Math.max(total, 1)) * 100) : 0;

  const Box = ({
    label,
    count,
    color,
    sub,
  }: {
    label: string;
    count: number;
    color: string;
    sub?: string;
  }) => (
    <div
      className="flex flex-col items-center justify-center rounded-xl border p-4 min-w-[110px] flex-1"
      style={{
        borderColor: color + "40",
        background: color + "0d",
      }}
    >
      <div
        className="text-[26px] font-semibold font-mono leading-none tracking-tight"
        style={{ color }}
      >
        {count}
      </div>
      <div className="text-[10px] font-medium mt-1.5" style={{ color }}>
        {label}
      </div>
      {sub && (
        <div className="text-[9px] text-[#8080a0] mt-0.5 text-center">{sub}</div>
      )}
      <div className="w-full mt-2.5 bg-[#111118] rounded h-1 overflow-hidden">
        <div
          className="h-full rounded transition-all duration-700"
          style={{ width: `${pctBar(count)}%`, background: color }}
        />
      </div>
      <div className="text-[9px] text-[#8080a0] mt-1 font-mono">
        {pctBar(count)}%
      </div>
    </div>
  );

  const Arrow = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center justify-center px-1 flex-shrink-0">
      <div className="text-[10px] text-[#4a4a68] mb-0.5 whitespace-nowrap">
        {label}
      </div>
      <div className="text-[#4a4a68] text-lg">→</div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Linha 1: Ledger + Bank → Motor */}
      <div className="flex items-center gap-3">
        <Box label="Ledger Txns" count={total > 0 ? Math.round(total * 0.51) : 0} color="#4f8fff" sub="Source A" />
        <div className="flex flex-col items-center flex-shrink-0 gap-1">
          <div className="text-[9px] text-[#4a4a68]">input</div>
          <div className="text-[#4a4a68]">⟶</div>
        </div>
        <div
          className="flex-1 rounded-xl border border-[rgba(79,143,255,0.25)] bg-[rgba(79,143,255,0.06)] p-4 text-center"
        >
          <div className="text-[13px] font-semibold text-[#4f8fff]">⚖ Matching Engine</div>
          <div className="text-[10px] text-[#8080a0] mt-1">
            3-Tier reconciliation pipeline
          </div>
        </div>
        <div className="flex flex-col items-center flex-shrink-0 gap-1">
          <div className="text-[9px] text-[#4a4a68]">input</div>
          <div className="text-[#4a4a68]">⟵</div>
        </div>
        <Box label="Bank Txns" count={total > 0 ? Math.round(total * 0.49) : 0} color="#60a5fa" sub="Source B" />
      </div>

      {/* Linha 2: Output dos tiers */}
      <div className="flex items-stretch gap-2">
        <Box
          label="Tier 1 Exact"
          count={tier1Exact}
          color="#00d4aa"
          sub="ref_id + amount + date"
        />
        <Box
          label="Tier 2 Fuzzy"
          count={tier2Fuzzy}
          color="#00d4aa"
          sub="desc similarity ≥85%"
        />
        <Box
          label="Tier 3 Probable"
          count={tier3Probable}
          color="#ffc947"
          sub="amount + date ±7d"
        />
        <Box
          label="Mismatches"
          count={mismatches}
          color="#ffc947"
          sub="ref match, Δ amount"
        />
        <Box
          label="Unmatched A"
          count={unmatchedA}
          color="#ef4444"
          sub="ledger only"
        />
        <Box
          label="Unmatched B"
          count={unmatchedB}
          color="#ef4444"
          sub="bank only"
        />
      </div>

      {/* Linha 3: Destinos */}
      <div className="flex items-stretch gap-3">
        <div
          className="flex-1 rounded-xl border border-[rgba(0,212,170,0.25)] bg-[rgba(0,212,170,0.06)] p-3 text-center"
        >
          <div className="text-[22px] font-semibold font-mono text-[#00d4aa]">
            {matched}
          </div>
          <div className="text-[10px] text-[#00d4aa] font-medium mt-1">
            ✓ Reconciled
          </div>
          <div className="text-[9px] text-[#8080a0] mt-0.5">
            Tiers 1 + 2 combined
          </div>
        </div>
        <div
          className="flex-1 rounded-xl border border-[rgba(255,201,71,0.25)] bg-[rgba(255,201,71,0.06)] p-3 text-center"
        >
          <div className="text-[22px] font-semibold font-mono text-[#ffc947]">
            {tier3Probable + mismatches}
          </div>
          <div className="text-[10px] text-[#ffc947] font-medium mt-1">
            ⚠ Needs Review
          </div>
          <div className="text-[9px] text-[#8080a0] mt-0.5">
            Probable + Mismatches
          </div>
        </div>
        <div
          className="flex-1 rounded-xl border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)] p-3 text-center"
        >
          <div className="text-[22px] font-semibold font-mono text-[#ef4444]">
            {unmatched}
          </div>
          <div className="text-[10px] text-[#ef4444] font-medium mt-1">
            ✗ Open Items
          </div>
          <div className="text-[9px] text-[#8080a0] mt-0.5">
            No match found
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Confidence Distribution Bar ───────────────────────────────
function ConfidenceDistribution({ items }: { items: MatchResult[] }) {
  const buckets = [
    { label: "100", min: 100, max: 100, color: "#00d4aa" },
    { label: "85–99", min: 85,  max: 99, color: "#4f8fff" },
    { label: "75–84", min: 75,  max: 84, color: "#60a5fa" },
    { label: "50–74", min: 50,  max: 74, color: "#ffc947" },
    { label: "<50",   min: 0,   max: 49, color: "#ef4444" },
  ];

  const total = items.length;
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      {buckets.map((b) => {
        const count = items.filter(
          (i) => i.confidence_score >= b.min && i.confidence_score <= b.max
        ).length;
        const pct = Math.round((count / total) * 100);
        return (
          <div key={b.label} className="flex items-center gap-3">
            <div
              className="text-[10px] font-mono w-12 text-right flex-shrink-0"
              style={{ color: b.color }}
            >
              {b.label}
            </div>
            <div className="flex-1 bg-[#111118] rounded h-2 overflow-hidden">
              <div
                className="h-full rounded transition-all duration-700"
                style={{ width: `${pct}%`, background: b.color }}
              />
            </div>
            <div className="text-[10px] font-mono text-[#8080a0] w-12 flex-shrink-0">
              {count} ({pct}%)
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Match Pair Card ───────────────────────────────────────────
function MatchPairCard({ match }: { match: MatchResult }) {
  const isMismatch =
    match.match_type === "mismatch" || Math.abs(match.amount_diff) > 0;
  const diffColor = isMismatch ? "#ef4444" : "#4a4a68";

  return (
    <div className="bg-[#111118] rounded-xl border border-[rgba(255,255,255,0.06)] p-4 hover:border-[rgba(255,255,255,0.11)] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={match.match_type as MatchType}>
            {matchTypeLabel(match.match_type)}
          </Badge>
          {match.match_tier && (
            <span className="text-[9px] font-mono text-[#8080a0]">
              {tierLabel(match.match_tier)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#8080a0]">conf.</span>
          <span
            className="text-[12px] font-semibold font-mono"
            style={{ color: confidenceColor(match.confidence_score) }}
          >
            {match.confidence_score}
          </span>
        </div>
      </div>

      {/* Two-column comparison */}
      <div className="grid grid-cols-2 gap-3">
        {/* Ledger side */}
        <div className="bg-[#16161f] rounded-lg p-3 border border-[rgba(79,143,255,0.15)]">
          <div className="text-[9px] font-medium text-[#4f8fff] uppercase tracking-wide mb-2">
            📊 Ledger
          </div>
          <div className="space-y-1.5">
            <div>
              <span className="text-[9px] text-[#4a4a68]">REF </span>
              <span className="text-[10px] font-mono text-[#8080a0]">
                {match.ledger_ref_id ?? "—"}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-[#4a4a68]">DATE </span>
              <span className="text-[10px] font-mono text-[#8080a0]">
                {match.ledger_date ?? "—"}
              </span>
            </div>
            <div
              className="text-[10px] text-[#eeeef5] truncate"
              title={match.ledger_desc ?? ""}
            >
              {truncate(match.ledger_desc, 28)}
            </div>
            <div
              className="text-[13px] font-semibold font-mono"
              style={{ color: match.ledger_amount ? "#00d4aa" : "#4a4a68" }}
            >
              {match.ledger_amount != null
                ? `$${match.ledger_amount.toFixed(2)}`
                : "—"}
            </div>
          </div>
        </div>

        {/* Bank side */}
        <div className="bg-[#16161f] rounded-lg p-3 border border-[rgba(96,165,250,0.15)]">
          <div className="text-[9px] font-medium text-[#60a5fa] uppercase tracking-wide mb-2">
            🏦 Bank
          </div>
          <div className="space-y-1.5">
            <div>
              <span className="text-[9px] text-[#4a4a68]">REF </span>
              <span className="text-[10px] font-mono text-[#8080a0]">
                {match.bank_ref_id ?? "—"}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-[#4a4a68]">DATE </span>
              <span className="text-[10px] font-mono text-[#8080a0]">
                {match.bank_date ?? "—"}
              </span>
            </div>
            <div
              className="text-[10px] text-[#eeeef5] truncate"
              title={match.bank_desc ?? ""}
            >
              {truncate(match.bank_desc, 28)}
            </div>
            <div
              className="text-[13px] font-semibold font-mono"
              style={{ color: match.bank_amount ? "#60a5fa" : "#4a4a68" }}
            >
              {match.bank_amount != null
                ? `$${match.bank_amount.toFixed(2)}`
                : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Footer — diff + criteria */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.05)]">
        <div className="text-[10px] text-[#8080a0]">
          {match.match_criteria ?? "—"}
        </div>
        <div className="flex items-center gap-3">
          {match.date_diff_days > 0 && (
            <span className="text-[10px] font-mono text-[#8080a0]">
              Δ {match.date_diff_days}d
            </span>
          )}
          <span
            className="text-[11px] font-semibold font-mono"
            style={{ color: diffColor }}
          >
            {match.amount_diff !== 0
              ? `Δ $${Math.abs(match.amount_diff).toFixed(2)}`
              : "✓ exact"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
type TabId = "diagram" | "all" | "matched" | "mismatch" | "unmatched_a" | "unmatched_b" | "probable";

export default function MatchingDiagramPage() {
  const { runId } = useParams<{ runId: string }>();
  const { run, isLoading: runLoading } = useRun(runId);
  const { summary } = useMatchSummary(runId);
  const [tab, setTab] = useState<TabId>("diagram");
  const [view, setView] = useState<"cards" | "table">("cards");

  const filterType = tab === "diagram" || tab === "all" ? undefined : tab;
  const { data: matchData, isLoading: matchLoading } = useMatches(
    runId,
    filterType,
    300
  );

  const items = matchData?.items ?? [];

  if (runLoading) {
    return (
      <div className="text-[#4a4a68] text-[12px] p-8">Loading run…</div>
    );
  }
  if (!run) {
    return (
      <div className="text-[#ef4444] text-[12px] p-8">Run not found.</div>
    );
  }

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: "diagram",     label: "Flow Diagram" },
    { id: "all",         label: "All Results",   count: matchData?.total },
    { id: "matched",     label: "Matched",        count: matchData?.matched },
    { id: "mismatch",    label: "Mismatches",     count: matchData?.mismatch },
    { id: "unmatched_a", label: "Unmatched A",    count: matchData?.unmatched_a },
    { id: "unmatched_b", label: "Unmatched B",    count: matchData?.unmatched_b },
    { id: "probable",    label: "Probable",       count: matchData?.probable },
  ];

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-[15px] font-semibold">
              Matching Diagram — {run.period_label}
            </div>
            <div className="text-[11px] text-[#8080a0] font-mono mt-0.5">
              {run.ledger_source} ↔ {run.bank_source} · Run {runId.slice(0, 12)}…
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={run.status.toLowerCase() as "completed"}>
              {run.status}
            </Badge>
            <Link href={`/runs/${runId}`}>
              <Button size="sm" variant="ghost">← Run Detail</Button>
            </Link>
            <a href={exportMatches(runId)} download>
              <Button size="sm">↓ Export CSV</Button>
            </a>
          </div>
        </div>

        {/* KPI row */}
        <div className="flex gap-6 mt-4 flex-wrap">
          {[
            { label: "Match Rate",    val: `${(run.match_rate * 100).toFixed(1)}%`,        color: run.match_rate >= 0.9 ? "#00d4aa" : "#ffc947" },
            { label: "Tier 1 Exact",  val: summary?.tier1_exact ?? "…",                   color: "#00d4aa" },
            { label: "Tier 2 Fuzzy",  val: summary?.tier2_fuzzy ?? "…",                   color: "#4f8fff" },
            { label: "Tier 3 Prob.",  val: summary?.tier3_probable ?? "…",                color: "#ffc947" },
            { label: "Mismatches",    val: run.mismatch_count,                             color: "#ffc947" },
            { label: "Unmatched A",   val: run.unmatched_a_count,                         color: "#ef4444" },
            { label: "Unmatched B",   val: run.unmatched_b_count,                         color: "#ef4444" },
            { label: "Open Value",    val: formatCurrency(run.open_value),                 color: run.open_value > 0 ? "#ef4444" : "#00d4aa" },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center">
              <div className="text-[18px] font-semibold font-mono leading-none" style={{ color }}>
                {val}
              </div>
              <div className="text-[9px] text-[#8080a0] uppercase tracking-wide mt-1">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Open items alert */}
      {run.open_items_count > 0 && (
        <AlertBanner
          level="warning"
          title={`${run.open_items_count} open items — $${run.open_value.toFixed(2)} unreconciled`}
          message="Review mismatches and unmatched transactions in Open Items."
          className="mb-4"
        />
      )}

      {/* Tabs */}
      <div className="bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
        <div className="border-b border-[rgba(255,255,255,0.06)] px-1 pt-1 flex items-center justify-between pr-4">
          <div className="flex overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-[11px] font-medium border-b-2 transition-all flex-shrink-0 flex items-center gap-1.5
                  ${tab === t.id
                    ? "text-[#4f8fff] border-[#4f8fff]"
                    : "text-[#8080a0] border-transparent hover:text-[#eeeef5]"
                  }`}
              >
                {t.label}
                {t.count != null && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full
                      ${tab === t.id
                        ? "bg-[rgba(79,143,255,0.15)] text-[#4f8fff]"
                        : "bg-[#111118] text-[#8080a0]"
                      }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* View toggle (só quando não é diagram) */}
          {tab !== "diagram" && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                size="sm"
                variant={view === "cards" ? "primary" : "ghost"}
                onClick={() => setView("cards")}
              >
                ▦ Cards
              </Button>
              <Button
                size="sm"
                variant={view === "table" ? "primary" : "ghost"}
                onClick={() => setView("table")}
              >
                ☰ Table
              </Button>
            </div>
          )}
        </div>

        <div className="p-5">
          {/* ── DIAGRAM TAB ── */}
          {tab === "diagram" && (
            <div className="space-y-6">
              <FlowDiagram
                tier1Exact={summary?.tier1_exact ?? 0}
                tier2Fuzzy={summary?.tier2_fuzzy ?? 0}
                tier3Probable={summary?.tier3_probable ?? 0}
                mismatches={run.mismatch_count}
                unmatchedA={run.unmatched_a_count}
                unmatchedB={run.unmatched_b_count}
                total={run.ledger_count + run.bank_count}
              />

              {/* Confidence distribution */}
              {items.length > 0 && (
                <Card>
                  <CardHeader title="Confidence Score Distribution" />
                  <CardBody>
                    <ConfidenceDistribution items={items} />
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {/* ── RESULT TABS ── */}
          {tab !== "diagram" && (
            <>
              {/* Tab-specific alerts */}
              {tab === "unmatched_b" && run.unmatched_b_count > 0 && (
                <AlertBanner
                  level="critical"
                  title={`${run.unmatched_b_count} bank transactions have no ledger entry`}
                  message="May indicate unauthorized debits, bank fees not recorded, or missing journal entries."
                  className="mb-4"
                />
              )}
              {tab === "unmatched_a" && run.unmatched_a_count > 0 && (
                <AlertBanner
                  level="warning"
                  title={`${run.unmatched_a_count} ledger entries have no bank counterpart`}
                  message="May indicate timing differences, outstanding cheques, or ledger errors."
                  className="mb-4"
                />
              )}
              {tab === "mismatch" && run.mismatch_count > 0 && (
                <AlertBanner
                  level="warning"
                  title={`${run.mismatch_count} transactions matched by reference but with amount differences`}
                  message="Each requires a resolution note before the period can be closed."
                  className="mb-4"
                />
              )}

              {matchLoading ? (
                <div className="text-center py-12 text-[#4a4a68] text-[11px]">
                  Loading results…
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-3xl mb-2">✓</div>
                  <div className="text-[12px] text-[#00d4aa]">No items in this category</div>
                </div>
              ) : view === "cards" ? (
                <div className="grid grid-cols-2 gap-3">
                  {items.map((m) => (
                    <MatchPairCard key={m.id} match={m} />
                  ))}
                </div>
              ) : (
                /* Table view */
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[#111118]">
                        {[
                          "Type","Ref (Ledger)","Date (L)","Desc (L)","Amount (L)",
                          "Ref (Bank)","Date (B)","Desc (B)","Amount (B)",
                          "Δ Amount","Δ Days","Tier","Conf.","Criteria",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left px-2.5 py-2 text-[9px] font-medium text-[#4a4a68] uppercase tracking-wide whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1c1c28]"
                        >
                          <td className="px-2.5 py-2">
                            <Badge variant={m.match_type as MatchType}>
                              {matchTypeLabel(m.match_type)}
                            </Badge>
                          </td>
                          <td className="px-2.5 py-2 font-mono text-[9px] text-[#8080a0]">
                            {truncate(m.ledger_ref_id, 14)}
                          </td>
                          <td className="px-2.5 py-2 font-mono text-[9px] text-[#8080a0]">
                            {m.ledger_date ?? "—"}
                          </td>
                          <td className="px-2.5 py-2 max-w-[120px] truncate" title={m.ledger_desc ?? ""}>
                            {truncate(m.ledger_desc, 20)}
                          </td>
                          <td className="px-2.5 py-2 font-mono text-[#00d4aa]">
                            {m.ledger_amount != null ? `$${m.ledger_amount.toFixed(2)}` : "—"}
                          </td>
                          <td className="px-2.5 py-2 font-mono text-[9px] text-[#8080a0]">
                            {truncate(m.bank_ref_id, 14)}
                          </td>
                          <td className="px-2.5 py-2 font-mono text-[9px] text-[#8080a0]">
                            {m.bank_date ?? "—"}
                          </td>
                          <td className="px-2.5 py-2 max-w-[120px] truncate" title={m.bank_desc ?? ""}>
                            {truncate(m.bank_desc, 20)}
                          </td>
                          <td className="px-2.5 py-2 font-mono text-[#60a5fa]">
                            {m.bank_amount != null ? `$${m.bank_amount.toFixed(2)}` : "—"}
                          </td>
                          <td
                            className="px-2.5 py-2 font-mono"
                            style={{ color: m.amount_diff !== 0 ? "#ef4444" : "#4a4a68" }}
                          >
                            {m.amount_diff !== 0 ? `$${Math.abs(m.amount_diff).toFixed(2)}` : "—"}
                          </td>
                          <td className="px-2.5 py-2 font-mono text-[#8080a0]">
                            {m.date_diff_days > 0 ? `${m.date_diff_days}d` : "—"}
                          </td>
                          <td className="px-2.5 py-2 text-[9px] text-[#8080a0]">
                            {m.match_tier ?? "—"}
                          </td>
                          <td
                            className="px-2.5 py-2 font-mono"
                            style={{ color: confidenceColor(m.confidence_score) }}
                          >
                            {m.confidence_score}
                          </td>
                          <td className="px-2.5 py-2 text-[9px] text-[#8080a0] max-w-[140px] truncate"
                            title={m.match_criteria ?? ""}>
                            {m.match_criteria ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
