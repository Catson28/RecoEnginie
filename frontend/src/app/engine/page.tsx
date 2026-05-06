"use client";

import { useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button }      from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Badge }       from "@/components/ui/Badge";

interface TierConfig {
  label:        string;
  color:        string;
  criteria:     string;
  confidence:   string;
  dateTolerance: number;
  fuzzyThreshold?: number;
}

const TIER_DEFS: TierConfig[] = [
  {
    label:        "Tier 1 — Exact Match",
    color:        "#00d4aa",
    criteria:     "ref_id (exact) + amount (exact) + date (±N days)",
    confidence:   "100",
    dateTolerance: 2,
  },
  {
    label:        "Tier 2 — Fuzzy Description",
    color:        "#ffc947",
    criteria:     "description similarity ≥ threshold + amount (exact) + date (±N days)",
    confidence:   "85–99",
    dateTolerance: 5,
    fuzzyThreshold: 85,
  },
  {
    label:        "Tier 3 — Probable",
    color:        "#60a5fa",
    criteria:     "amount (exact) + date (±N days) — no ref or description required",
    confidence:   "50–74",
    dateTolerance: 7,
  },
];

interface FieldProps {
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
  onChange: (v: string) => void;
}

function ConfigField({ label, value, unit, description, onChange }: FieldProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <div className="flex-1">
        <div className="text-[12px] font-medium">{label}</div>
        {description && <div className="text-[10px] text-[#8080a0] mt-0.5">{description}</div>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 px-2.5 py-1.5 bg-[#111118] border border-[rgba(255,255,255,0.11)] rounded-lg text-[12px] font-mono text-[#eeeef5] text-right outline-none focus:border-[#4f8fff]"
        />
        {unit && <span className="text-[11px] text-[#8080a0] w-8">{unit}</span>}
      </div>
    </div>
  );
}

export default function EnginePage() {
  const [tier1Days,    setTier1Days]    = useState("2");
  const [tier2Days,    setTier2Days]    = useState("5");
  const [tier2Fuzzy,   setTier2Fuzzy]   = useState("85");
  const [tier3Days,    setTier3Days]    = useState("7");
  const [minRate,      setMinRate]      = useState("85");
  const [maxOpenItems, setMaxOpenItems] = useState("50");
  const [maxOpenValue, setMaxOpenValue] = useState("100000");
  const [saved, setSaved]              = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="animate-fade-in">

      {saved && (
        <AlertBanner level="success" message="Engine configuration saved successfully." className="mb-4" />
      )}

      <AlertBanner
        level="info"
        title="Configuration reflects .env values"
        message="Changes here are applied to the current session. To persist across restarts, update the .env file on the backend."
        className="mb-5"
      />

      {/* Tier cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {TIER_DEFS.map((tier, i) => (
          <div
            key={i}
            className="bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 hover:border-[rgba(255,255,255,0.11)] transition-colors"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: tier.color }} />
              <span className="text-[12px] font-medium" style={{ color: tier.color }}>
                {tier.label}
              </span>
            </div>
            <div className="text-[10px] text-[#8080a0] mb-3 leading-relaxed">{tier.criteria}</div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#4a4a68]">Confidence</span>
              <span className="font-mono" style={{ color: tier.color }}>{tier.confidence}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] mt-1">
              <span className="text-[#4a4a68]">Date Tolerance</span>
              <span className="font-mono text-[#eeeef5]">±{tier.dateTolerance} days</span>
            </div>
            {tier.fuzzyThreshold && (
              <div className="flex items-center justify-between text-[10px] mt-1">
                <span className="text-[#4a4a68]">Fuzzy Threshold</span>
                <span className="font-mono text-[#eeeef5]">{tier.fuzzyThreshold}%</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Matching Config */}
        <Card>
          <CardHeader title="Matching Parameters" />
          <CardBody>
            <ConfigField
              label="Tier 1 — Date Tolerance"
              value={tier1Days}
              unit="days"
              description="Max days between ledger and bank date for exact match"
              onChange={setTier1Days}
            />
            <ConfigField
              label="Tier 2 — Date Tolerance"
              value={tier2Days}
              unit="days"
              description="Max days between dates for fuzzy matching"
              onChange={setTier2Days}
            />
            <ConfigField
              label="Tier 2 — Fuzzy Threshold"
              value={tier2Fuzzy}
              unit="%"
              description="Minimum description similarity score (0–100)"
              onChange={setTier2Fuzzy}
            />
            <ConfigField
              label="Tier 3 — Date Tolerance"
              value={tier3Days}
              unit="days"
              description="Max days for probable matching (amount only)"
              onChange={setTier3Days}
            />
          </CardBody>
        </Card>

        {/* Alert Thresholds */}
        <Card>
          <CardHeader title="Alert Thresholds" />
          <CardBody>
            <ConfigField
              label="Minimum Match Rate Alert"
              value={minRate}
              unit="%"
              description="Alert if match rate falls below this threshold"
              onChange={setMinRate}
            />
            <ConfigField
              label="Maximum Open Items Alert"
              value={maxOpenItems}
              unit="items"
              description="Alert if open items exceed this number"
              onChange={setMaxOpenItems}
            />
            <ConfigField
              label="Maximum Open Value Alert"
              value={maxOpenValue}
              unit="USD"
              description="Alert if unreconciled value exceeds this amount"
              onChange={setMaxOpenValue}
            />

            <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]">
              <div className="text-[10px] font-medium text-[#8080a0] uppercase tracking-wide mb-2.5">
                Current Status
              </div>
              {[
                { label: "Match Rate",   ok: Number(minRate) <= 90,   val: "90% (last run)" },
                { label: "Open Items",   ok: Number(maxOpenItems) > 5, val: "5 open" },
                { label: "Open Value",   ok: Number(maxOpenValue) > 25000, val: "$25,000" },
              ].map(({ label, ok, val }) => (
                <div key={label} className="flex items-center gap-2 mb-1.5 text-[11px]">
                  <span style={{ color: ok ? "#00d4aa" : "#ef4444" }}>{ok ? "✓" : "⚠"}</span>
                  <span className="text-[#8080a0]">{label}:</span>
                  <span className="font-mono" style={{ color: ok ? "#00d4aa" : "#ffc947" }}>{val}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Save */}
      <div className="flex justify-end mt-4 gap-3">
        <Button variant="ghost" onClick={() => {}}>Reset to Defaults</Button>
        <Button variant="primary" onClick={handleSave}>Save Configuration</Button>
      </div>
    </div>
  );
}
