import { cn } from "@/lib/utils";

type Variant =
  | "matched" | "mismatch" | "unmatched_a" | "unmatched_b" | "probable"
  | "completed" | "processing" | "pending" | "failed"
  | "open" | "resolved"
  | "high" | "normal" | "low"
  | "tier1" | "tier2" | "tier3";

const styles: Record<Variant, string> = {
  matched:     "bg-[rgba(0,212,170,0.12)]  text-[#00d4aa] border-[rgba(0,212,170,0.2)]",
  mismatch:    "bg-[rgba(255,201,71,0.12)] text-[#ffc947] border-[rgba(255,201,71,0.2)]",
  unmatched_a: "bg-[rgba(239,68,68,0.12)]  text-[#ef4444] border-[rgba(239,68,68,0.2)]",
  unmatched_b: "bg-[rgba(239,68,68,0.12)]  text-[#ef4444] border-[rgba(239,68,68,0.2)]",
  probable:    "bg-[rgba(255,201,71,0.12)] text-[#ffc947] border-[rgba(255,201,71,0.2)]",
  completed:   "bg-[rgba(0,212,170,0.12)]  text-[#00d4aa] border-[rgba(0,212,170,0.2)]",
  processing:  "bg-[rgba(79,143,255,0.12)] text-[#4f8fff] border-[rgba(79,143,255,0.2)]",
  pending:     "bg-[rgba(128,128,160,0.1)] text-[#8080a0] border-[rgba(128,128,160,0.15)]",
  failed:      "bg-[rgba(239,68,68,0.12)]  text-[#ef4444] border-[rgba(239,68,68,0.2)]",
  open:        "bg-[rgba(255,201,71,0.12)] text-[#ffc947] border-[rgba(255,201,71,0.2)]",
  resolved:    "bg-[rgba(0,212,170,0.12)]  text-[#00d4aa] border-[rgba(0,212,170,0.2)]",
  high:        "bg-[rgba(239,68,68,0.12)]  text-[#ef4444] border-[rgba(239,68,68,0.2)]",
  normal:      "bg-[rgba(79,143,255,0.12)] text-[#4f8fff] border-[rgba(79,143,255,0.2)]",
  low:         "bg-[rgba(128,128,160,0.1)] text-[#8080a0] border-[rgba(128,128,160,0.15)]",
  tier1:       "bg-[rgba(0,212,170,0.12)]  text-[#00d4aa] border-[rgba(0,212,170,0.2)]",
  tier2:       "bg-[rgba(255,201,71,0.12)] text-[#ffc947] border-[rgba(255,201,71,0.2)]",
  tier3:       "bg-[rgba(96,165,250,0.12)] text-[#60a5fa] border-[rgba(96,165,250,0.2)]",
};

interface Props {
  variant: Variant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium font-mono uppercase tracking-wide border",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
