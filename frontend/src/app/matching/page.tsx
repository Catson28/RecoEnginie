"use client";

import Link from "next/link";
import { useRuns } from "@/hooks/useRuns";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

export default function MatchingIndexPage() {
  const { data, isLoading } = useRuns(20);
  const runs = data?.items.filter((r) => r.status === "COMPLETED") ?? [];

  return (
    <div className="animate-fade-in">
      <div className="text-[12px] text-[#8080a0] mb-5">
        Select a completed reconciliation run to view its matching diagram.
      </div>

      <Card>
        <CardHeader title="Completed Runs" />
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[#111118]">
                {["Period","Date","Match Rate","Ledger","Bank","Open Items",""].map((h) => (
                  <th key={h} className="text-left px-3.5 py-2.5 text-[10px] font-medium text-[#4a4a68] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="py-10 text-center text-[11px] text-[#4a4a68]">Loading…</td></tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#4a4a68] text-[11px]">
                    No completed runs yet.{" "}
                    <Link href="/runs/new" className="text-[#4f8fff] underline">Create one →</Link>
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
                      <span
                        className="font-mono text-[12px] font-semibold"
                        style={{ color: r.match_rate >= 0.9 ? "#00d4aa" : "#ffc947" }}
                      >
                        {(r.match_rate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-mono text-[#8080a0]">{r.ledger_count}</td>
                    <td className="px-3.5 py-3 font-mono text-[#8080a0]">{r.bank_count}</td>
                    <td className="px-3.5 py-3 font-mono" style={{ color: r.open_items_count > 0 ? "#ffc947" : "#00d4aa" }}>
                      {r.open_items_count}
                    </td>
                    <td className="px-3.5 py-3">
                      <Link href={`/matching/${r.run_id}`}>
                        <Button size="sm" variant="primary">⟁ View Diagram</Button>
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
