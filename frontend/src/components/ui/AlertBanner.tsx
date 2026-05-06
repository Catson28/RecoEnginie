import { cn } from "@/lib/utils";

type Level = "critical" | "warning" | "info" | "success";

const styles: Record<Level, string> = {
  critical: "bg-[rgba(239,68,68,0.1)]  border-[rgba(239,68,68,0.22)]  text-[#ef4444]",
  warning:  "bg-[rgba(255,201,71,0.1)] border-[rgba(255,201,71,0.22)] text-[#ffc947]",
  info:     "bg-[rgba(96,165,250,0.1)] border-[rgba(96,165,250,0.22)] text-[#60a5fa]",
  success:  "bg-[rgba(0,212,170,0.1)]  border-[rgba(0,212,170,0.22)]  text-[#00d4aa]",
};

const icons: Record<Level, string> = {
  critical: "⛔", warning: "⚠", info: "ℹ", success: "✓",
};

interface Props {
  level:    Level;
  title?:   string;
  message:  string;
  className?: string;
}

export function AlertBanner({ level, title, message, className }: Props) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl px-4 py-3.5 border text-[13px]",
        styles[level],
        className
      )}
    >
      <span className="text-base flex-shrink-0 mt-0.5">{icons[level]}</span>
      <div>
        {title && <strong className="block font-medium mb-0.5">{title}</strong>}
        <span className="opacity-90">{message}</span>
      </div>
    </div>
  );
}
