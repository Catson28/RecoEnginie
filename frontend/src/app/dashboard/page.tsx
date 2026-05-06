"use client";

import Link from "next/link";
import { useRuns }         from "@/hooks/useRuns";
import { useOpenItemStats }from "@/hooks/useOpenItems";
import { StatCard }        from "@/components/ui/StatCard";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge }           from "@/components/ui/Badge";
import { Button }          from "@/components/ui/Button";
import { MatchRateGauge }  from "@/components/ui/MatchRateGauge";
import { TrendChart }      from "@/components/charts/TrendChart";
import {
  formatDate, formatDateTime, formatCurrency,
  formatPct, runStatusColor,
} from "@/lib/utils";
import useSWR from "swr";
import { getReportTrends } from "@/lib/api";
import type { ReconciliationRun } from "@/lib/types";

function ActivityFeed({ runs }: { runs: ReconciliationRun[] }) {
  const completed = runs.filter((r) => r.status === "COMPLETED").slice(0, 5);
  if (completed.length === 0) {
    return <p className="text-[11px] text-[#4a4a68] p-4">No activity yet.</p>;
  }
  const dotColor = (r: ReconciliationRun) =>
    r.match_rate >= 0.9  ? "#00d4aa" :
    r.match_rate >= 0.75 ? "#ffc947" : "#ef4444";

  return (
    <div>
      {completed.map((r) => (
        <div key={r.run_id} className="flex items-start gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: dotColor(r) }} />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium">
              {r.period_label} — {(r.match_rate * 100).toFixed(1)}% match rate
            </div>
            <div className="text-[10px] text-[#8080a0] mt-0.5">
              {r.ledger_count} ledger · {r.bank_count} bank ·{" "}
              {r.open_items_count > 0 ? (
                <span className="text-[#ffc947]">{r.open_items_count} open items</span>
              ) : (
                <span className="text-[#00d4aa]">no open items</span>
              )}
            </div>
          </div>
          <div className="text-[10px] text-[#4a4a68] font-mono flex-shrink-0">
            {formatDate(r.started_at)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: runsData, isLoading } = useRuns(10);
  const { stats }  = useOpenItemStats();
  const { data: trends } = useSWR("/reports/trends", () => getReportTrends(10));

  const runs    = runsData?.items ?? [];
  const latest  = runs.find((r) => r.status === "COMPLETED");
  const avgRate = runs.length
    ? runs.filter((r) => r.status === "COMPLETED").reduce((s, r) => s + r.match_rate, 0) /
      Math.max(runs.filter((r) => r.status === "COMPLETED").length, 1)
    : 0;

  return (
    <div className="animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <StatCard
          label="Total Runs"
          value={isLoading ? "…" : runsData?.total ?? 0}
          sub="All reconciliation runs"
          color="accent"
        />
        <StatCard
          label="Avg Match Rate"
          value={isLoading ? "…" : `${(avgRate * 100).toFixed(1)}%`}
          sub="Completed runs"
          color="success"
        />
        <StatCard
          label="Open Items"
          value={stats?.total_open ?? "…"}
          sub="Unmatched + mismatches"
          color={stats && stats.total_open > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Open Value"
          value={stats ? formatCurrency(stats.total_value) : "…"}
          sub="Pending resolution"
          color={stats && stats.total_value > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Latest run gauge */}
        <Card>
          <CardHeader
            title={latest ? `Latest Run — ${latest.period_label}` : "Latest Run"}
            action={
              latest ? (
                <Badge variant={latest.status.toLowerCase() as "completed"}>
                  {latest.status.toLowerCase()}
                </Badge>
              ) : null
            }
          />
          <CardBody>
            {latest ? (
              <>
                <MatchRateGauge
                  matchRate={latest.match_rate}
                  matched={latest.matched_count}
                  unmatchedA={latest.unmatched_a_count}
                  unmatchedB={latest.unmatched_b_count}
                  mismatches={latest.mismatch_count}
                />
                <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)] text-[10px] text-[#8080a0]">
                  {latest.ledger_count + latest.bank_count} transactions ·{" "}
                  Run ID: {latest.run_id.slice(0, 8)}…
                </div>
              </>
            ) : (
              <p className="text-[12px] text-[#4a4a68] py-8 text-center">
                No completed runs yet.{" "}
                <Link href="/runs/new" className="text-[#4f8fff] underline">Start one →</Link>
              </p>
            )}
          </CardBody>
        </Card>

        {/* Trend chart */}
        <Card>
          <CardHeader
            title="Match Rate Trend"
            action={
              <span className="text-[10px] text-[#8080a0] font-mono">Last {trends?.length ?? 0} runs</span>
            }
          />
          <CardBody>
            <TrendChart data={trends ?? []} />
          </CardBody>
        </Card>
      </div>

      {/* Runs table */}
      <Card className="mb-4">
        <CardHeader
          title="Reconciliation Runs"
          action={
            <Link href="/runs">
              <Button variant="ghost" size="sm">View all →</Button>
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[#111118]">
                {["Run ID","Period","Transactions","Match Rate","Open Items","Status",""].map((h) => (
                  <th key={h} className="text-left px-3.5 py-2.5 text-[10px] font-medium text-[#4a4a68] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 5).map((r) => (
                <tr key={r.run_id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1c1c28]">
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#8080a0]">{r.run_id.slice(0, 12)}…</td>
                  <td className="px-3.5 py-2.5">{r.period_label}</td>
                  <td className="px-3.5 py-2.5 font-mono">{r.ledger_count + r.bank_count}</td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-[#111118] rounded h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${r.match_rate * 100}%`,
                            background: r.match_rate >= 0.9 ? "#00d4aa" : "#ffc947",
                          }}
                        />
                      </div>
                      <span
                        className="font-mono text-[11px]"
                        style={{ color: r.match_rate >= 0.9 ? "#00d4aa" : "#ffc947" }}
                      >
                        {(r.match_rate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span className="font-mono" style={{ color: r.open_items_count > 0 ? "#ffc947" : "#00d4aa" }}>
                      {r.open_items_count}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Badge variant={r.status.toLowerCase() as "completed"}>
                      {r.status.toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Link href={`/runs/${r.run_id}`}>
                      <Button size="sm" variant={r.open_items_count > 0 ? "warning" : "default"}>
                        {r.open_items_count > 0 ? "Resolve" : "View"}
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {runs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[#4a4a68] text-[11px]">
                    No runs yet. <Link href="/runs/new" className="text-[#4f8fff] underline">Create your first reconciliation →</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Activity feed */}
      <Card>
        <CardHeader title="Recent Activity" />
        <CardBody className="p-0 px-2">
          <ActivityFeed runs={runs} />
        </CardBody>
      </Card>
    </div>
  );
}
