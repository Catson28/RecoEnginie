"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CSVDropzone } from "@/components/ui/CSVDropzone";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { createRun } from "@/lib/api";

export default function NewRunPage() {
  const router = useRouter();
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);
  const [bankFile,   setBankFile]   = useState<File | null>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd,   setPeriodEnd]   = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [loading, setLoading]         = useState(false);
  const [error,   setError]           = useState<string | null>(null);
  const [ledgerPreview, setLedgerPreview] = useState<string[][] | null>(null);
  const [bankPreview,   setBankPreview]   = useState<string[][] | null>(null);
  const [activeTab, setActiveTab] = useState<"a" | "b">("a");

  const parseCSVPreview = (file: File, setter: (rows: string[][]) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.trim().split("\n").slice(0, 6).map((l) => l.split(",").map((c) => c.trim().replace(/"/g, "")));
      setter(rows);
    };
    reader.readAsText(file);
  };

  const handleLedger = (file: File) => {
    setLedgerFile(file);
    parseCSVPreview(file, setLedgerPreview);
  };
  const handleBank = (file: File) => {
    setBankFile(file);
    parseCSVPreview(file, setBankPreview);
  };

  const handleSubmit = async () => {
    if (!ledgerFile || !bankFile) return setError("Both files are required.");
    if (!periodStart || !periodEnd) return setError("Period start and end are required.");
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("ledger_file", ledgerFile);
      fd.append("bank_file",   bankFile);
      fd.append("period_start", periodStart);
      fd.append("period_end",   periodEnd);
      fd.append("period_label", periodLabel);
      const run = await createRun(fd);
      router.push(`/runs/${run.run_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create run.");
    } finally {
      setLoading(false);
    }
  };

  const PreviewTable = ({ rows }: { rows: string[][] | null }) => {
    if (!rows) return <div className="text-center py-7 text-[11px] text-[#4a4a68]">No file loaded</div>;
    const [headers, ...data] = rows;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr>{headers.map((h, i) => (
              <th key={i} className="text-left px-2 py-1.5 text-[9px] text-[#4a4a68] uppercase border-b border-[rgba(255,255,255,0.06)] bg-[#111118]">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-[rgba(255,255,255,0.04)]">
                {row.map((cell, j) => (
                  <td key={j} className="px-2 py-1.5 text-[#8080a0] font-mono">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      {error && <AlertBanner level="critical" message={error} className="mb-4" />}

      <div className="grid grid-cols-2 gap-5">
        {/* Left: uploads */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Upload Source A — Internal Ledger" />
            <CardBody>
              <CSVDropzone
                label="Drop CSV or Excel here"
                icon="📊"
                onFile={handleLedger}
                fileName={ledgerFile?.name}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Upload Source B — Bank Statement" />
            <CardBody>
              <CSVDropzone
                label="Drop CSV or Excel here"
                icon="🏦"
                onFile={handleBank}
                fileName={bankFile?.name}
              />
            </CardBody>
          </Card>
        </div>

        {/* Right: preview + config */}
        <div className="flex flex-col gap-4">
          {/* Preview */}
          <Card>
            <CardHeader title="File Preview (first 5 rows)" />
            <CardBody>
              <div className="flex border-b border-[rgba(255,255,255,0.06)] mb-4 -mt-1">
                {(["a","b"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-4 py-2 text-[11.5px] font-medium border-b-2 transition-all
                      ${activeTab === t
                        ? "text-[#4f8fff] border-[#4f8fff]"
                        : "text-[#8080a0] border-transparent hover:text-[#eeeef5]"
                      }`}
                  >
                    Source {t.toUpperCase()}
                  </button>
                ))}
              </div>
              {activeTab === "a"
                ? <PreviewTable rows={ledgerPreview} />
                : <PreviewTable rows={bankPreview} />
              }
            </CardBody>
          </Card>

          {/* Config */}
          <Card>
            <CardHeader title="Run Configuration" />
            <CardBody>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] font-medium text-[#8080a0] uppercase tracking-wide mb-1.5">
                    Period Start
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#111118] border border-[rgba(255,255,255,0.11)] rounded-lg text-[12.5px] text-[#eeeef5] outline-none focus:border-[#4f8fff]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#8080a0] uppercase tracking-wide mb-1.5">
                    Period End
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#111118] border border-[rgba(255,255,255,0.11)] rounded-lg text-[12.5px] text-[#eeeef5] outline-none focus:border-[#4f8fff]"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-[10px] font-medium text-[#8080a0] uppercase tracking-wide mb-1.5">
                  Run Name (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Horizon Bank — June 2024"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#111118] border border-[rgba(255,255,255,0.11)] rounded-lg text-[12.5px] text-[#eeeef5] outline-none focus:border-[#4f8fff]"
                />
              </div>
              <Button
                variant="primary"
                className="w-full justify-center"
                loading={loading}
                disabled={!ledgerFile || !bankFile || !periodStart || !periodEnd}
                onClick={handleSubmit}
              >
                ▶ &nbsp;Start Reconciliation
              </Button>
            </CardBody>
          </Card>

          {/* Format guide */}
          <Card>
            <CardHeader title="Expected CSV Format" />
            <CardBody>
              <div className="text-[10px] text-[#8080a0] mb-1.5">Source A — Internal Ledger:</div>
              <div className="font-mono text-[10px] bg-[#0a0a0f] p-2.5 rounded-lg text-[#8080a0] leading-relaxed mb-3">
                ref_id, transaction_date, description,<br />amount, currency, category
              </div>
              <div className="text-[10px] text-[#8080a0] mb-1.5">Source B — Bank Statement:</div>
              <div className="font-mono text-[10px] bg-[#0a0a0f] p-2.5 rounded-lg text-[#8080a0] leading-relaxed">
                ref_id, value_date, narrative,<br />debit, credit, currency, balance
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
