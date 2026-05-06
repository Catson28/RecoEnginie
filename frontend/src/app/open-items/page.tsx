"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useOpenItems, useOpenItemStats } from "@/hooks/useOpenItems";
import { resolveItems } from "@/lib/api";
import { StatCard }     from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge }        from "@/components/ui/Badge";
import { Button }       from "@/components/ui/Button";
import { Modal }        from "@/components/ui/Modal";
import { AlertBanner }  from "@/components/ui/AlertBanner";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OpenItem, ResolutionType } from "@/lib/types";

const RESOLUTION_TYPES: { value: ResolutionType; label: string; desc: string }[] = [
  { value: "timing_diff", label: "Timing Difference",    desc: "Transaction recorded in different periods" },
  { value: "bank_error",  label: "Bank Error",           desc: "Incorrect posting by the bank" },
  { value: "ledger_error",label: "Ledger Error",         desc: "Incorrect entry in the internal ledger" },
  { value: "write_off",   label: "Write Off",            desc: "Immaterial difference — write off" },
  { value: "fx_diff",     label: "FX Difference",        desc: "Currency conversion rounding" },
  { value: "other",       label: "Other",                desc: "Custom resolution with notes" },
];

const ITEM_TYPE_LABELS: Record<string, string> = {
  unmatched_a: "Unmatched A",
  unmatched_b: "Unmatched B",
  mismatch:    "Mismatch",
  probable:    "Probable",
};

export default function OpenItemsPage() {
  const searchParams = useSearchParams();
  const runId = searchParams.get("run_id") ?? undefined;

  const [filter, setFilter]     = useState<string>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [resolveModal, setResolveModal] = useState(false);
  const [resType, setResType]   = useState<ResolutionType>("timing_diff");
  const [resolver, setResolver] = useState("");
  const [notes, setNotes]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);

  const { data, isLoading, mutate } = useOpenItems({
    run_id:    runId,
    item_type: filter === "all" ? undefined : filter,
    is_resolved: false,
    limit:     200,
  });
  const { stats, mutate: mutateStats } = useOpenItemStats(runId);

  const items   = data?.items ?? [];
  const allIds  = items.map((i) => i.id);

  const toggle = (id: number) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const toggleAll = () => {
    setSelected(selected.size === allIds.length ? new Set() : new Set(allIds));
  };

  const handleResolve = async () => {
    if (selected.size === 0 || !resolver) return;
    setLoading(true);
    try {
      const res = await resolveItems({
        item_ids:        Array.from(selected),
        resolver,
        resolution_type: resType,
        notes,
      });
      setSuccessMsg(res.message);
      setSelected(new Set());
      setResolveModal(false);
      setNotes("");
      await mutate();
      await mutateStats();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to resolve.");
    } finally {
      setLoading(false);
    }
  };

  const itemTypeColor = (type: string) => {
    if (type === "unmatched_b") return "#ef4444";
    if (type === "unmatched_a") return "#ef4444";
    if (type === "mismatch")    return "#ffc947";
    if (type === "probable")    return "#60a5fa";
    return "#8080a0";
  };

  return (
    <div className="animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Total Open"    value={stats?.total_open ?? "…"}  sub="Pending resolution" color={stats && stats.total_open > 0 ? "danger" : "success"} />
        <StatCard label="Open Value"    value={stats ? formatCurrency(stats.total_value) : "…"} sub="Unreconciled amount" color="warning" />
        <StatCard label="Unmatched A"   value={stats?.by_type?.unmatched_a?.count ?? 0} sub="Ledger only" color="danger" />
        <StatCard label="Unmatched B"   value={stats?.by_type?.unmatched_b?.count ?? 0} sub="Bank only"   color="danger" />
      </div>

      {successMsg && <AlertBanner level="success" message={successMsg} className="mb-4" />}
      {errorMsg   && <AlertBanner level="critical" message={errorMsg}  className="mb-4" />}

      <Card>
        <CardHeader
          title="Open Items"
          action={
            <div className="flex items-center gap-2">
              {/* Filter */}
              <select
                value={filter}
                onChange={(e) => { setFilter(e.target.value); setSelected(new Set()); }}
                className="bg-[#111118] border border-[rgba(255,255,255,0.11)] rounded-lg px-2.5 py-1.5 text-[11px] text-[#eeeef5] outline-none"
              >
                <option value="all">All Types</option>
                <option value="unmatched_a">Unmatched A</option>
                <option value="unmatched_b">Unmatched B</option>
                <option value="mismatch">Mismatches</option>
                <option value="probable">Probable</option>
              </select>

              {selected.size > 0 && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setResolveModal(true)}
                >
                  ✓ Resolve {selected.size} selected
                </Button>
              )}
            </div>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[#111118]">
                <th className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allIds.length > 0 && selected.size === allIds.length}
                    onChange={toggleAll}
                    className="accent-[#4f8fff]"
                  />
                </th>
                {["Type","Ref ID","Date","Description","Amount","Currency","Priority","Source",""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[9px] font-medium text-[#4a4a68] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="py-10 text-center text-[11px] text-[#4a4a68]">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center">
                    <div className="text-[36px] mb-2">✓</div>
                    <div className="text-[13px] text-[#00d4aa] font-medium">All items resolved!</div>
                    <div className="text-[11px] text-[#8080a0] mt-1">No open items pending for the selected filter.</div>
                  </td>
                </tr>
              ) : (
                items.map((item: OpenItem) => (
                  <tr
                    key={item.id}
                    className={`border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1c1c28] transition-colors
                      ${selected.has(item.id) ? "bg-[rgba(79,143,255,0.05)]" : ""}`}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className="accent-[#4f8fff]"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={item.item_type as "unmatched_a"}>
                        {ITEM_TYPE_LABELS[item.item_type] ?? item.item_type}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-[#8080a0]">
                      {item.ref_id ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-[#8080a0]">
                      {formatDate(item.txn_date)}
                    </td>
                    <td className="px-3 py-2.5 max-w-[200px] truncate" title={item.description ?? ""}>
                      {item.description ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: itemTypeColor(item.item_type) }}>
                      {formatCurrency(item.amount, item.currency)}
                      {item.amount_diff != null && item.amount_diff !== 0 && (
                        <div className="text-[10px] text-[#ffc947]">
                          Δ {formatCurrency(item.amount_diff)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-[#8080a0]">
                      {item.currency}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={item.priority as "high"}>
                        {item.priority}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-[#8080a0]">
                      {item.source === "ledger" ? "📊 Ledger" : item.source === "bank" ? "🏦 Bank" : "Both"}
                    </td>
                    <td className="px-3 py-2.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setSelected(new Set([item.id])); setResolveModal(true); }}
                      >
                        Resolve
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Resolve Modal */}
      <Modal
        open={resolveModal}
        onClose={() => setResolveModal(false)}
        title={`Resolve ${selected.size} Open Item${selected.size !== 1 ? "s" : ""}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setResolveModal(false)}>Cancel</Button>
            <Button
              variant="success"
              loading={loading}
              disabled={!resolver}
              onClick={handleResolve}
            >
              ✓ Confirm Resolution
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Resolution type */}
          <div>
            <label className="block text-[10px] font-medium text-[#8080a0] uppercase tracking-wide mb-2">
              Resolution Type
            </label>
            <div className="space-y-2">
              {RESOLUTION_TYPES.map((rt) => (
                <label
                  key={rt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                    ${resType === rt.value
                      ? "border-[#4f8fff] bg-[rgba(79,143,255,0.08)]"
                      : "border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.11)]"
                    }`}
                >
                  <input
                    type="radio"
                    name="res-type"
                    value={rt.value}
                    checked={resType === rt.value}
                    onChange={() => setResType(rt.value)}
                    className="mt-0.5 accent-[#4f8fff]"
                  />
                  <div>
                    <div className="text-[12px] font-medium">{rt.label}</div>
                    <div className="text-[11px] text-[#8080a0]">{rt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Resolver */}
          <div>
            <label className="block text-[10px] font-medium text-[#8080a0] uppercase tracking-wide mb-1.5">
              Your Name / Email *
            </label>
            <input
              type="text"
              placeholder="e.g. finance@company.com"
              value={resolver}
              onChange={(e) => setResolver(e.target.value)}
              className="w-full px-3 py-2 bg-[#111118] border border-[rgba(255,255,255,0.11)] rounded-lg text-[12.5px] text-[#eeeef5] outline-none focus:border-[#4f8fff]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-medium text-[#8080a0] uppercase tracking-wide mb-1.5">
              Resolution Notes (optional)
            </label>
            <textarea
              rows={2}
              placeholder="Add context for audit trail…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#111118] border border-[rgba(255,255,255,0.11)] rounded-lg text-[12.5px] text-[#eeeef5] outline-none focus:border-[#4f8fff] resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
