import { cn } from "@/lib/utils";

interface Props {
  label:    string;
  value:    string | number;
  sub?:     string;
  color?:   "accent" | "success" | "warning" | "danger" | "info" | "default";
  className?: string;
}

const colorMap = {
  accent:  "text-[#4f8fff]",
  success: "text-[#00d4aa]",
  warning: "text-[#ffc947]",
  danger:  "text-[#ef4444]",
  info:    "text-[#60a5fa]",
  default: "text-[#eeeef5]",
};

export function StatCard({ label, value, sub, color = "default", className }: Props) {
  return (
    <div
      className={cn(
        "bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-xl p-5",
        "hover:border-[rgba(255,255,255,0.11)] transition-colors",
        className
      )}
    >
      <div className="text-[10px] font-medium text-[#8080a0] uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className={cn("text-[28px] font-semibold font-mono tracking-tight leading-none", colorMap[color])}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-[#8080a0] mt-1.5">{sub}</div>
      )}
    </div>
  );
}
