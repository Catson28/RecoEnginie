"use client";

import { useEffect, useRef } from "react";
import type { LogLine } from "@/lib/types";

interface Props {
  lines: LogLine[];
}

const levelClass: Record<string, string> = {
  ok:    "text-[#00d4aa]",
  info:  "text-[#60a5fa]",
  warn:  "text-[#ffc947]",
  error: "text-[#ef4444]",
};

export function LogViewer({ lines }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      ref={ref}
      className="bg-[#0a0a0f] rounded-lg p-3.5 font-mono text-[11px] h-52 overflow-y-auto leading-relaxed border border-[rgba(255,255,255,0.06)]"
    >
      {lines.length === 0 ? (
        <span className="text-[#4a4a68]">Awaiting execution…</span>
      ) : (
        lines.map((line, i) => (
          <div key={i} className="flex gap-2.5 mb-0.5">
            <span className="text-[#4a4a68] flex-shrink-0">{line.timestamp}</span>
            <span className={`flex-shrink-0 ${levelClass[line.level] ?? "text-[#8080a0]"}`}>
              [{line.level.toUpperCase()}]
            </span>
            <span className="text-[#8080a0]">{line.message}</span>
          </div>
        ))
      )}
    </div>
  );
}
