"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRun, useRunLog } from "@/hooks/useRuns";
import { useMatches }        from "@/hooks/useMatching";
import { Badge }             from "@/components/ui/Badge";
import { Card, CardHeader }  from "@/components/ui/Card";
import { Button }            from "@/components/ui/Button";
import { AlertBanner }       from "@/components/ui/AlertBanner";
import { LogViewer }         from "@/components/ui/LogViewer";
import { MatchRateGauge }    from "@/components/ui/MatchRateGauge";
import { exportMatches }     from "@/lib/api";
import {
  formatDate, formatDateTime, formatCurrency,
  formatDuration, matchTypeLabel, tierLabel, confidenceColor, truncate,
} from "@/lib/utils";
import type { MatchType } from "@/lib/types";

type TabId = "all" | "matched" | "unmatched_a" | "unmatched_b" | "mismatch";

const TABS: { id: TabId; label: string }[] = [
  { id: "all",         label: "All" },
  { id: "matched",     label: "Matched" },
  { id: "unmatched_a", label: "Unmatched A" },
  { id: "unmatched_b", label: "Unmatched B" },
  { id: "mismatch",    label: "Mismatches" },
];

export default function RunDetailPage() {
  const { runId }  = useParams<{ runId: string }>();
  const { run, isLoading } = useRun(runId);
  const { log }    = useRunLog(run?.status === "PROCESSING" ? runId : null);
  const [tab, setTab] = useState<TabId>("all");

  const { data: matchData } = useMatches(runId, tab === "all" ? undefined : tab, 200);
  const matches = matchData?.items ?? [];

  if (isLoading) return <div className="text-[#4a4a68] text-[12px] p-8">Loading run…</div>;
  if (!run)      return <div className="text-[#ef4444] text-[12px] p-8">Run not found.</div>;

  const tabCount = (t: TabId): number => {
    if (!matchData) return 0;
    if (t === "all")         return matchData.total;
    if (t === "matched")     return matchData.matched;
    if (t === "unmatched_a") return matchData.unmatched_a;
    if (t === "unmatched_b") return matchData.unmatched_b;
    if (t === "mismatch")    return matchData.mismatch;
    return 0;
  };

  return (
    <div className="animate-fade-in">
      {/* Run header */}
      <div className="bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="text-[16px] font-semibold mb-1">
              {run.period_label} — Bank Reconciliation
            </div>
            <div className="text-[11px] text-[#8080a0] font-mono">
              Run ID: {run.run_id} · {formatDateTime(run.started_at)} · {formatDuration(run.duration_secs)}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={run.status.toLowerCase() as "completed"}>
              {run.status.toLowerCase()}
            </Badge>
            <Link href={`/matching/${run.run_id}`}>
              <Button size="sm" variant="default">⟁ Matching Diagram</Button>
            </Link>
            {run.open_items_count > 0 && (
              <Link href={`/runs/${run.run_id}/resolve`}>
                <Button size="sm" variant="warning">⚠ Resolve {run.open_items_count} Open Items</Button>
              </Link>
            )}
            <a href={exportMatches(run.run_id)} download>
              <Button size="sm">↓ Export CSV</Button>
            </a>
            <Link href="/runs/new">
              <Button variant="primary" size="sm">↺ Re-run</Button>
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 flex-wrap">
          {[
            { label: "Ledger Txns",   val: run.ledger_count,      color: "#4f8fff" },
            { label: "Bank Txns",     val: run.bank_count,        color: "#60a5fa" },
            { label: "Matched",       val: run.matched_count,     color: "#00d4aa" },
            { label: "Unmatched A",   val: run.unmatched_a_count, color: "#ef4444" },
            { label: "Unmatched B",   val: run.unmatched_b_count, color: "#ef4444" },
            { label: "Mismatches",    val: run.mismatch_count,    color: "#ffc947" },
            { label: "Match Rate",    val: `${(run.match_rate * 100).toFixed(1)}%`, color: run.match_rate >= 0.9 ? "#00d4aa" : "#ffc947" },
            { label: "Open Value",    val: formatCurrency(run.open_value), color: run.open_value > 0 ? "#ef4444" : "#00d4aa" },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center">
              <div className="text-[20px] font-semibold font-mono" style={{ color }}>{val}</div>
              <div className="text-[9px] text-[#8080a0] uppercase tracking-wide mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {run.status === "PROCESSING" && (
        <AlertBanner level="info" message="Reconciliation in progress — results will update automatically." className="mb-4" />
      )}
      {run.status === "FAILED" && (
        <AlertBanner level="critical" title="Run failed" message={run.error_message ?? "Unknown error."} className="mb-4" />
      )}
      {run.open_items_count > 0 && run.status === "COMPLETED" && (
        <AlertBanner
          level="warning"
          title={`${run.open_items_count} open items require resolution`}
          message="Mismatches and unmatched transactions need manual review before closing the period."
          className="mb-4"
        />
      )}

      {/* Log (while running) */}
      {run.status === "PROCESSING" && log.length > 0 && (
        <Card className="mb-4">
          <CardHeader title="Execution Log" />
          <div className="p-4"><LogViewer lines={log} /></div>
        </Card>
      )}

      {/* Results table */}
      <Card>
        <div className="border-b border-[rgba(255,255,255,0.06)] px-1 pt-1">
          <div className="flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-[11.5px] font-medium border-b-2 transition-all flex items-center gap-1.5
                  ${tab === t.id
                    ? "text-[#4f8fff] border-[#4f8fff]"
                    : "text-[#8080a0] border-transparent hover:text-[#eeeef5]"
                  }`}
              >
                {t.label}
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full
                  ${tab === t.id ? "bg-[rgba(79,143,255,0.15)] text-[#4f8fff]" : "bg-[#111118] text-[#8080a0]"}`}>
                  {tabCount(t.id)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Warning banners per tab */}
        {tab === "unmatched_a" && run.unmatched_a_count > 0 && (
          <div className="p-4 pb-0">
            <AlertBanner level="warning"
              title={`${run.unmatched_a_count} ledger transactions have no bank entry.`}
              message="May indicate timing differences, errors, or missing bank postings." />
          </div>
        )}
        {tab === "unmatched_b" && run.unmatched_b_count > 0 && (
          <div className="p-4 pb-0">
            <AlertBanner level="critical"
              title={`${run.unmatched_b_count} bank transactions have no ledger entry.`}
              message="May indicate unauthorized debits, bank fees, or recording gaps." />
          </div>
        )}
        {tab === "mismatch" && run.mismatch_count > 0 && (
          <div className="p-4 pb-0">
            <AlertBanner level="warning"
              title={`${run.mismatch_count} transactions matched by reference but with amount discrepancies.`}
              message="Review each difference and add resolution notes." />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px] border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[#111118]">
                {["Type","Ref ID","Date","Description","Amount A","Amount B","Diff","Tier","Conf.","Status",""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[9px] font-medium text-[#4a4a68] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matches.length === 0 ? (
                <tr><td colSpan={11} className="py-10 text-center text-[#4a4a68] text-[11px]">
                  {run.status === "PROCESSING" ? "Processing…" : "No results for this filter."}
                </td></tr>
              ) : (
                matches.map((m) => (
                  <tr key={m.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1c1c28]">
                    <td className="px-3 py-2">
                      <Badge variant={m.match_type as MatchType}>
                        {matchTypeLabel(m.match_type)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-[#8080a0]">
                      {m.ledger_ref_id ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-[#8080a0]">
                      {m.ledger_date ?? "—"}
                    </td>
                    <td className="px-3 py-2 max-w-[160px] truncate" title={m.ledger_desc ?? ""}>
                      {truncate(m.ledger_desc, 32)}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: m.ledger_amount ? "#00d4aa" : "#4a4a68" }}>
                      {m.ledger_amount != null ? `$${m.ledger_amount.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: m.bank_amount ? "#60a5fa" : "#4a4a68" }}>
                      {m.bank_amount != null ? `$${m.bank_amount.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: m.amount_diff !== 0 ? "#ef4444" : "#4a4a68" }}>
                      {m.amount_diff !== 0 ? `$${m.amount_diff.toFixed(2)}` : "$0.00"}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-[#8080a0]">
                      {tierLabel(m.match_tier)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px]" style={{ color: confidenceColor(m.confidence_score) }}>
                      {m.confidence_score}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={m.status === "resolved" ? "resolved" : "open"}>
                        {m.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {m.status === "open" && (
                        <Link href={`/runs/${runId}/resolve`}>
                          <Button size="sm" variant="warning">Resolve</Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
