"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRun } from "@/hooks/useRuns";
import { useOpenItems } from "@/hooks/useOpenItems";
import { resolveItems } from "@/lib/api";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OpenItem, ResolutionType } from "@/lib/types";

const RESOLUTION_TYPES: { value: ResolutionType; label: string; desc: string; color: string }[] = [
  { value: "timing_diff",  label: "Timing Difference", desc: "Posted in different accounting periods",     color: "#4f8fff" },
  { value: "bank_error",   label: "Bank Error",         desc: "Incorrect posting by the bank",             color: "#ffc947" },
  { value: "ledger_error", label: "Ledger Error",       desc: "Incorrect entry in internal books",         color: "#ffc947" },
  { value: "write_off",    label: "Write Off",          desc: "Immaterial difference — write off",         color: "#00d4aa" },
  { value: "fx_diff",      label: "FX Difference",      desc: "Currency conversion rounding difference",   color: "#60a5fa" },
  { value: "other",        label: "Other",              desc: "Custom reason — specify in notes",          color: "#8080a0" },
];

const TYPE_LABELS: Record<string, string> = {
  unmatched_a: "Unmatched A",
  unmatched_b: "Unmatched B",
  mismatch:    "Mismatch",
  probable:    "Probable",
};

// ── Resolve Modal ──────────────────────────────────────────────
function ResolveModal({
  open,
  onClose,
  selectedItems,
  onResolved,
}: {
  open: boolean;
  onClose: () => void;
  selectedItems: OpenItem[];
  onResolved: (count: number) => void;
}) {
  const [resType, setResType]   = useState<ResolutionType>("timing_diff");
  const [resolver, setResolver] = useState("");
  const [notes, setNotes]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const totalValue = selectedItems.reduce((s, i) => s + i.amount, 0);
  const hasMismatches = selectedItems.some((i) => i.item_type === "mismatch");

  const handleConfirm = async () => {
    if (!resolver.trim()) return setError("Your name or email is required.");
    if (resType === "other" && !notes.trim()) return setError("Notes are required for 'Other' resolution type.");
    setError(null);
    setLoading(true);
    try {
      const res = await resolveItems({
        item_ids:        selectedItems.map((i) => i.id),
        resolver:        resolver.trim(),
        resolution_type: resType,
        notes:           notes.trim() || undefined,
      });
      onResolved(res.resolved_count);
      onClose();
      setResolver("");
      setNotes("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to resolve items.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Resolve ${selectedItems.length} Open Item${selectedItems.length !== 1 ? "s" : ""}`}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="success" loading={loading} disabled={!resolver.trim()} onClick={handleConfirm}>
            ✓ Confirm Resolution
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Summary of selected */}
        <div className="bg-[#111118] rounded-xl p-4 border border-[rgba(255,255,255,0.06)]">
          <div className="text-[11px] text-[#8080a0] mb-2.5 uppercase tracking-wide font-medium">
            Selected Items Summary
          </div>
          <div className="flex gap-5">
            <div>
              <div className="text-[20px] font-semibold font-mono text-[#eeeef5]">{selectedItems.length}</div>
              <div className="text-[10px] text-[#8080a0]">items</div>
            </div>
            <div>
              <div className="text-[20px] font-semibold font-mono text-[#ffc947]">{formatCurrency(totalValue)}</div>
              <div className="text-[10px] text-[#8080a0]">total value</div>
            </div>
            <div>
              <div className="flex gap-1.5 flex-wrap mt-0.5">
                {Array.from(new Set(selectedItems.map((i) => i.item_type))).map((t) => (
                  <Badge key={t} variant={t as "mismatch"}>{TYPE_LABELS[t] ?? t}</Badge>
                ))}
              </div>
            </div>
          </div>
          {hasMismatches && (
            <div className="mt-2 text-[10px] text-[#ffc947]">
              ⚠ Includes mismatches — ensure you have verified the amount differences.
            </div>
          )}
        </div>

        {error && <AlertBanner level="critical" message={error} />}

        {/* Resolution type */}
        <div>
          <label className="block text-[10px] font-medium text-[#8080a0] uppercase tracking-wide mb-2">
            Resolution Type *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {RESOLUTION_TYPES.map((rt) => (
              <label
                key={rt.value}
                className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all
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
                  <div className="text-[11.5px] font-medium" style={{ color: resType === rt.value ? rt.color : "#eeeef5" }}>
                    {rt.label}
                  </div>
                  <div className="text-[10px] text-[#8080a0] mt-0.5">{rt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Resolver */}
        <div>
          <label className="block text-[10px] font-medium text-[#8080a0] uppercase tracking-wide mb-1.5">
            Resolved By *
          </label>
          <input
            type="text"
            placeholder="Your name or email (e.g. finance@company.com)"
            value={resolver}
            onChange={(e) => setResolver(e.target.value)}
            className="w-full px-3 py-2 bg-[#111118] border border-[rgba(255,255,255,0.11)] rounded-lg text-[12.5px] text-[#eeeef5] outline-none focus:border-[#4f8fff]"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[10px] font-medium text-[#8080a0] uppercase tracking-wide mb-1.5">
            Notes {resType === "other" ? "*" : "(optional)"}
          </label>
          <textarea
            rows={2}
            placeholder="Explain the resolution for the audit trail…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-[#111118] border border-[rgba(255,255,255,0.11)] rounded-lg text-[12.5px] text-[#eeeef5] outline-none focus:border-[#4f8fff] resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}

// ── Item Row — Detailed view ───────────────────────────────────
function ItemRow({
  item,
  selected,
  onToggle,
  onResolveOne,
}: {
  item: OpenItem;
  selected: boolean;
  onToggle: () => void;
  onResolveOne: () => void;
}) {
  const isMismatch = item.item_type === "mismatch";

  return (
    <div
      className={`bg-[#111118] rounded-xl border p-4 transition-all
        ${selected
          ? "border-[rgba(79,143,255,0.4)] bg-[rgba(79,143,255,0.05)]"
          : "border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.11)]"
        }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1 accent-[#4f8fff] flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant={item.item_type as "mismatch"}>{TYPE_LABELS[item.item_type] ?? item.item_type}</Badge>
            <Badge variant={item.priority as "high"}>{item.priority}</Badge>
            {item.ref_id && (
              <span className="text-[10px] font-mono text-[#8080a0]">{item.ref_id}</span>
            )}
            <span className="text-[10px] text-[#8080a0] font-mono ml-auto">
              {formatDate(item.txn_date)}
            </span>
          </div>

          {/* Description */}
          <div className="text-[12.5px] text-[#eeeef5] mb-2 truncate">
            {item.description ?? "No description"}
          </div>

          {/* Amount comparison for mismatches */}
          {isMismatch && item.ledger_amount != null && item.bank_amount != null ? (
            <div className="flex items-center gap-3 bg-[#16161f] rounded-lg p-2.5 border border-[rgba(255,201,71,0.15)]">
              <div className="text-center">
                <div className="text-[9px] text-[#4f8fff] uppercase tracking-wide mb-0.5">Ledger</div>
                <div className="text-[13px] font-semibold font-mono text-[#4f8fff]">
                  {formatCurrency(item.ledger_amount, item.currency)}
                </div>
              </div>
              <div className="text-[#4a4a68] text-lg">↔</div>
              <div className="text-center">
                <div className="text-[9px] text-[#60a5fa] uppercase tracking-wide mb-0.5">Bank</div>
                <div className="text-[13px] font-semibold font-mono text-[#60a5fa]">
                  {formatCurrency(item.bank_amount, item.currency)}
                </div>
              </div>
              <div className="text-center ml-auto">
                <div className="text-[9px] text-[#ffc947] uppercase tracking-wide mb-0.5">Difference</div>
                <div className="text-[13px] font-semibold font-mono text-[#ffc947]">
                  {formatCurrency(Math.abs(item.amount_diff ?? 0), item.currency)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-[9px] text-[#8080a0] uppercase tracking-wide">
                {item.source === "ledger" ? "📊 Ledger only" : item.source === "bank" ? "🏦 Bank only" : "Both"}
              </div>
              <div
                className="text-[13px] font-semibold font-mono ml-auto"
                style={{ color: item.item_type === "unmatched_b" ? "#ef4444" : "#ffc947" }}
              >
                {formatCurrency(item.amount, item.currency)}
              </div>
            </div>
          )}
        </div>

        {/* Action */}
        <Button
          size="sm"
          variant="success"
          onClick={onResolveOne}
          className="flex-shrink-0 mt-1"
        >
          ✓ Resolve
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function ResolvePage() {
  const { runId } = useParams<{ runId: string }>();
  const router    = useRouter();
  const { run }   = useRun(runId);

  const [filter, setFilter]         = useState("all");
  const [selected, setSelected]     = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen]   = useState(false);
  const [singleItem, setSingleItem] = useState<OpenItem | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data, isLoading, mutate } = useOpenItems({
    run_id:      runId,
    item_type:   filter === "all" ? undefined : filter,
    is_resolved: false,
    limit:       200,
  });

  const items  = data?.items ?? [];
  const allIds = items.map((i) => i.id);

  const toggle = (id: number) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const openModalForSelected = () => {
    setSingleItem(null);
    setModalOpen(true);
  };

  const openModalForOne = (item: OpenItem) => {
    setSingleItem(item);
    setSelected(new Set([item.id]));
    setModalOpen(true);
  };

  const handleResolved = async (count: number) => {
    setSuccessMsg(`${count} item${count !== 1 ? "s" : ""} resolved successfully.`);
    setSelected(new Set());
    setSingleItem(null);
    await mutate();
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const unresolved = data?.open ?? 0;
  const totalValue = data?.total_value ?? 0;

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-[#8080a0] mb-5">
        <Link href="/runs" className="hover:text-[#eeeef5]">Runs</Link>
        <span>›</span>
        <Link href={`/runs/${runId}`} className="hover:text-[#eeeef5]">
          {run?.period_label ?? runId.slice(0, 12) + "…"}
        </Link>
        <span>›</span>
        <span className="text-[#eeeef5]">Resolve Open Items</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Open Items"    value={unresolved}               sub="Pending resolution"     color={unresolved > 0 ? "danger" : "success"} />
        <StatCard label="Open Value"    value={formatCurrency(totalValue)} sub="Unreconciled amount"   color="warning" />
        <StatCard label="Mismatches"    value={data?.items.filter((i) => i.item_type === "mismatch").length ?? 0}    sub="Amount differences"     color="warning" />
        <StatCard label="Unmatched B"   value={data?.items.filter((i) => i.item_type === "unmatched_b").length ?? 0} sub="Bank only — high priority" color="danger" />
      </div>

      {successMsg && <AlertBanner level="success" message={successMsg} className="mb-4" />}

      {unresolved === 0 && !isLoading && (
        <div className="bg-[rgba(0,212,170,0.08)] border border-[rgba(0,212,170,0.25)] rounded-xl p-8 text-center mb-4">
          <div className="text-4xl mb-3">✓</div>
          <div className="text-[15px] font-semibold text-[#00d4aa] mb-1">All Open Items Resolved!</div>
          <div className="text-[12px] text-[#8080a0] mb-4">
            The reconciliation for {run?.period_label} is complete.
          </div>
          <Link href={`/runs/${runId}`}>
            <Button variant="success">← Back to Run Detail</Button>
          </Link>
        </div>
      )}

      {unresolved > 0 && (
        <Card>
          <CardHeader
            title={`Open Items — ${run?.period_label ?? ""}`}
            action={
              <div className="flex items-center gap-2">
                {/* Filter tabs */}
                <div className="flex bg-[#111118] rounded-lg p-0.5 gap-0.5">
                  {[
                    { id: "all",         label: "All" },
                    { id: "mismatch",    label: "Mismatches" },
                    { id: "unmatched_a", label: "Unmatched A" },
                    { id: "unmatched_b", label: "Unmatched B" },
                    { id: "probable",    label: "Probable" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setFilter(f.id); setSelected(new Set()); }}
                      className={`px-2.5 py-1 rounded-md text-[10.5px] font-medium transition-all
                        ${filter === f.id
                          ? "bg-[#4f8fff] text-white"
                          : "text-[#8080a0] hover:text-[#eeeef5]"
                        }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {selected.size > 0 && (
                  <Button variant="success" size="sm" onClick={openModalForSelected}>
                    ✓ Resolve {selected.size} selected
                  </Button>
                )}

                {allIds.length > 0 && selected.size < allIds.length && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelected(new Set(allIds))}
                  >
                    Select all {allIds.length}
                  </Button>
                )}

                {selected.size > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                    Clear
                  </Button>
                )}
              </div>
            }
          />

          <CardBody className="p-4">
            {isLoading ? (
              <div className="text-center py-10 text-[#4a4a68] text-[11px]">Loading open items…</div>
            ) : items.length === 0 ? (
              <div className="text-center py-10 text-[#4a4a68] text-[11px]">
                No items in this category.
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    selected={selected.has(item.id)}
                    onToggle={() => toggle(item.id)}
                    onResolveOne={() => openModalForOne(item)}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Resolve Modal */}
      <ResolveModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSingleItem(null); }}
        selectedItems={
          singleItem
            ? [singleItem]
            : items.filter((i) => selected.has(i.id))
        }
        onResolved={handleResolved}
      />
    </div>
  );
}
