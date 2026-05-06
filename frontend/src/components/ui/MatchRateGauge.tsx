"use client";

interface Props {
  matchRate:   number;   // 0.0 – 1.0
  matched:     number;
  unmatchedA:  number;
  unmatchedB:  number;
  mismatches:  number;
}

export function MatchRateGauge({ matchRate, matched, unmatchedA, unmatchedB, mismatches }: Props) {
  const pct = Math.round(matchRate * 100);
  const total = matched + unmatchedA + unmatchedB + mismatches;

  const bar = (label: string, count: number, color: string) => (
    <div className="flex items-center gap-2.5 mb-2.5">
      <span className="text-[11px] text-[#8080a0] w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-[#111118] rounded h-1.5 overflow-hidden">
        <div
          className="h-full rounded transition-all duration-500"
          style={{ width: `${total > 0 ? (count / total) * 100 : 0}%`, background: color }}
        />
      </div>
      <span className="text-[11px] font-mono text-right w-8 flex-shrink-0" style={{ color }}>
        {count}
      </span>
    </div>
  );

  return (
    <div className="flex items-center gap-7">
      {/* Gauge circle */}
      <div
        className="gauge-circle w-28 h-28 rounded-full flex-shrink-0"
        style={{ ["--pct" as string]: pct }}
      >
        <div className="w-[82px] h-[82px] rounded-full bg-[#16161f] flex flex-col items-center justify-center m-auto">
          <span className="text-[22px] font-semibold font-mono text-[#00d4aa] leading-none tracking-tight">
            {pct}%
          </span>
          <span className="text-[8px] text-[#8080a0] uppercase tracking-wide mt-0.5">matched</span>
        </div>
      </div>

      {/* Bars */}
      <div className="flex-1">
        {bar("Matched",     matched,    "#00d4aa")}
        {bar("Unmatched A", unmatchedA, "#ef4444")}
        {bar("Unmatched B", unmatchedB, "#ef4444")}
        {bar("Mismatches",  mismatches, "#ffc947")}
      </div>
    </div>
  );
}
