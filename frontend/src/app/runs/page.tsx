"use client";

import Link from "next/link";
import { useRuns } from "@/hooks/useRuns";
import { StatCard }   from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge }   from "@/components/ui/Badge";
import { Button }  from "@/components/ui/Button";
import { formatDate, formatDuration, formatCurrency } from "@/lib/utils";

export default function RunsPage() {
  const { data, isLoading } = useRuns(50);
  const runs = data?.items ?? [];
  const completed = runs.filter((r) => r.status === "COMPLETED");
  const bestRate  = completed.length ? Math.max(...completed.map((r) => r.match_rate)) : 0;
  const totalOpen = runs.reduce((s, r) => s + r.open_items_count, 0);
  const avgTxn    = completed.length
    ? Math.round(completed.reduce((s, r) => s + r.ledger_count + r.bank_count, 0) / completed.length)
    : 0;

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Total Runs"      value={data?.total ?? "…"} sub="All time" color="accent" />
        <StatCard label="Best Match Rate" value={`${(bestRate * 100).toFixed(1)}%`} sub="Single run record" color="success" />
        <StatCard label="Total Open Items" value={totalOpen} sub="Across all runs" color={totalOpen > 0 ? "warning" : "success"} />
        <StatCard label="Avg Volume"      value={avgTxn} sub="Transactions per run" color="info" />
      </div>

      <Card>
        <CardHeader
          title="Reconciliation Runs"
          action={
            <Link href="/runs/new">
              <Button variant="primary" size="sm">＋ New Run</Button>
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[#111118]">
                {["Run ID","Run Date","Period","Source A","Source B","Txn A","Txn B","Matched","Unm A","Unm B","Mis","Match Rate","Status",""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[9px] font-medium text-[#4a4a68] uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={14} className="py-10 text-center text-[11px] text-[#4a4a68]">Loading…</td></tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-[#4a4a68] text-[11px]">
                    No runs yet.{" "}
                    <Link href="/runs/new" className="text-[#4f8fff] underline">Create the first one →</Link>
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.run_id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1c1c28]">
                    <td className="px-3 py-2.5 font-mono text-[10px] text-[#8080a0]">{r.run_id.slice(0,12)}…</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[#8080a0]">{formatDate(r.started_at)}</td>
                    <td className="px-3 py-2.5 font-medium">{r.period_label}</td>
                    <td className="px-3 py-2.5 text-[11px] text-[#8080a0]">{r.ledger_source ?? "—"}</td>
                    <td className="px-3 py-2.5 text-[11px] text-[#8080a0]">{r.bank_source ?? "—"}</td>
                    <td className="px-3 py-2.5 font-mono">{r.ledger_count}</td>
                    <td className="px-3 py-2.5 font-mono">{r.bank_count}</td>
                    <td className="px-3 py-2.5 font-mono text-[#00d4aa]">{r.matched_count}</td>
                    <td className="px-3 py-2.5 font-mono text-[#ef4444]">{r.unmatched_a_count}</td>
                    <td className="px-3 py-2.5 font-mono text-[#ef4444]">{r.unmatched_b_count}</td>
                    <td className="px-3 py-2.5 font-mono text-[#ffc947]">{r.mismatch_count}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-[#111118] rounded h-1.5 overflow-hidden">
                          <div className="h-full rounded" style={{ width: `${r.match_rate * 100}%`, background: r.match_rate >= 0.9 ? "#00d4aa" : "#ffc947" }} />
                        </div>
                        <span className="font-mono text-[10px]" style={{ color: r.match_rate >= 0.9 ? "#00d4aa" : "#ffc947" }}>
                          {(r.match_rate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={r.status.toLowerCase() as "completed"}>{r.status.toLowerCase()}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/runs/${r.run_id}`}>
                        <Button size="sm" variant={r.open_items_count > 0 ? "warning" : "default"}>
                          {r.open_items_count > 0 ? "Resolve" : "View"}
                        </Button>
                      </Link>
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
