"use client";

import type { TrendPoint } from "@/lib/types";

interface Props {
  data: TrendPoint[];
}

export function TrendChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-20 flex items-center justify-center text-[11px] text-[#4a4a68]">
        No trend data available
      </div>
    );
  }

  const W = 400, H = 80, PAD = 8;
  const rates = data.map((d) => d.match_rate);
  const minR  = Math.min(...rates);
  const maxR  = Math.max(...rates, minR + 1);

  const toY = (v: number) =>
    PAD + ((maxR - v) / (maxR - minR)) * (H - PAD * 2);
  const toX = (i: number) =>
    data.length === 1 ? W / 2 : (i / (data.length - 1)) * W;

  const points = data.map((d, i) => `${toX(i)},${toY(d.match_rate)}`).join(" ");
  const areaPath = `M${toX(0)},${toY(data[0].match_rate)} ${data
    .slice(1)
    .map((d, i) => `L${toX(i + 1)},${toY(d.match_rate)}`)
    .join(" ")} L${toX(data.length - 1)},${H} L0,${H}Z`;

  const lastColor = rates[rates.length - 1] >= 90 ? "#00d4aa" : "#ffc947";

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00d4aa" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00d4aa" stopOpacity="0"   />
          </linearGradient>
        </defs>
        {[20, 40, 60].map((y) => (
          <line key={y} x1={0} y1={y} x2={W} y2={y}
            stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}
        <path d={areaPath} fill="url(#trendGrad)" />
        <polyline points={points} fill="none" stroke="#00d4aa"
          strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={i}
            cx={toX(i)} cy={toY(d.match_rate)} r={i === data.length - 1 ? 3.5 : 3}
            fill={i === data.length - 1 ? lastColor : "#00d4aa"}
            stroke={i === data.length - 1 ? "#16161f" : "none"} strokeWidth={1.5}
          >
            <title>{d.period}: {d.match_rate}%</title>
          </circle>
        ))}
        {data.length >= 1 && (
          <text x={2} y={H - 4} fill="#4a4a68" fontSize={9} fontFamily="DM Mono">
            {data[0].period}
          </text>
        )}
        {data.length >= 1 && (
          <text x={W - 2} y={H - 4} textAnchor="end" fill="#4a4a68" fontSize={9} fontFamily="DM Mono">
            {data[data.length - 1].period}
          </text>
        )}
      </svg>

      <div className="flex gap-3.5 flex-wrap mt-3.5">
        {data.map((d, i) => {
          const color = d.match_rate >= 90 ? "#00d4aa" : "#ffc947";
          return (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-[#8080a0]">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              {d.period} · {d.match_rate}%
            </div>
          );
        })}
      </div>
    </div>
  );
}
