"use client";

import useSWR from "swr";
import Link   from "next/link";
import { getReportSummary, getReportTrends, exportFullReport } from "@/lib/api";
import { StatCard }  from "@/components/ui/StatCard";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button }    from "@/components/ui/Button";
import { Badge }     from "@/components/ui/Badge";
import { TrendChart }from "@/components/charts/TrendChart";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ReportsPage() {
  const { data: summary, isLoading } = useSWR("/reports/summary", () => getReportSummary(12));
  const { data: trends }  = useSWR("/reports/trends",  () => getReportTrends(12));

  const avgRate  = summary?.avg_match_rate ?? 0;
  const runs     = summary?.runs ?? [];

  return (
    <div className="animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Total Runs"      value={isLoading ? "…" : summary?.total_runs ?? 0}    sub="All completed" color="accent" />
        <StatCard label="Avg Match Rate"  value={`${(avgRate * 100).toFixed(1)}%`}               sub="Across all periods" color={avgRate >= 0.9 ? "success" : "warning"} />
        <StatCard label="Total Open Items" value={summary?.total_open_items ?? 0}                sub="Cumulative" color="warning" />
        <StatCard label="Total Open Value" value={formatCurrency(summary?.total_open_value ?? 0)} sub="Not yet reconciled" color="danger" />
      </div>

      {/* Trend Chart */}
      <Card className="mb-4">
        <CardHeader title="Match Rate Trend — Last 12 Periods" />
        <CardBody>
          <TrendChart data={trends ?? []} />
        </CardBody>
      </Card>

      {/* Period breakdown table */}
      <Card>
        <CardHeader
          title="Period Breakdown"
          action={
            <span className="text-[10px] text-[#8080a0] font-mono">Last {runs.length} runs</span>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[#111118]">
                {["Period","Date","Match Rate","Open Items","Open Value","Report"].map((h) => (
                  <th key={h} className="text-left px-3.5 py-2.5 text-[10px] font-medium text-[#4a4a68] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-10 text-center text-[11px] text-[#4a4a68]">Loading…</td></tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#4a4a68] text-[11px]">
                    No completed runs yet.{" "}
                    <Link href="/runs/new" className="text-[#4f8fff] underline">Create a run →</Link>
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.run_id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1c1c28]">
                    <td className="px-3.5 py-3 font-medium">{r.period_label}</td>
                    <td className="px-3.5 py-3 font-mono text-[10px] text-[#8080a0]">
                      {formatDate(r.started_at)}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-20 bg-[#111118] rounded h-1.5 overflow-hidden">
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
                    <td className="px-3.5 py-3 font-mono" style={{ color: r.open_items > 0 ? "#ffc947" : "#00d4aa" }}>
                      {r.open_items}
                    </td>
                    <td className="px-3.5 py-3 font-mono" style={{ color: r.open_value > 0 ? "#ef4444" : "#00d4aa" }}>
                      {formatCurrency(r.open_value)}
                    </td>
                    <td className="px-3.5 py-3 flex gap-2">
                      <Link href={`/runs/${r.run_id}`}>
                        <Button size="sm" variant="ghost">View</Button>
                      </Link>
                      <a href={exportFullReport(r.run_id)} download>
                        <Button size="sm">↓ CSV</Button>
                      </a>
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
