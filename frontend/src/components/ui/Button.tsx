import { cn } from "@/lib/utils";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger" | "success" | "warning" | "ghost";
  size?:    "sm" | "md";
  loading?: boolean;
}

const variants = {
  default: "bg-transparent border border-[rgba(255,255,255,0.11)] text-[#eeeef5] hover:bg-[#1c1c28]",
  primary: "bg-[#4f8fff] border border-[#4f8fff] text-white hover:bg-[#3d7aee]",
  danger:  "bg-[rgba(239,68,68,0.12)] border-transparent text-[#ef4444] hover:bg-[rgba(239,68,68,0.2)]",
  success: "bg-[rgba(0,212,170,0.12)] border-transparent text-[#00d4aa] hover:bg-[rgba(0,212,170,0.2)]",
  warning: "bg-[rgba(255,201,71,0.12)] border-transparent text-[#ffc947] hover:bg-[rgba(255,201,71,0.2)]",
  ghost:   "bg-transparent border-transparent text-[#8080a0] hover:text-[#eeeef5] hover:bg-[#1c1c28]",
};

const sizes = {
  sm: "px-2.5 py-1 text-[11px]",
  md: "px-3.5 py-1.5 text-[12px]",
};

export function Button({ variant = "default", size = "md", loading, children, className, disabled, ...props }: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg font-medium transition-all",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading && (
        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
