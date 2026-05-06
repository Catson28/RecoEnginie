import { cn } from "@/lib/utils";

interface CardProps {
  children:  React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title:     React.ReactNode;
  action?:   React.ReactNode;
  className?: string;
}

export function CardHeader({ title, action, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-5 py-3.5",
        "border-b border-[rgba(255,255,255,0.06)]",
        className
      )}
    >
      <span className="text-[13px] font-medium text-[#eeeef5]">{title}</span>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardBody({ children, className }: CardProps) {
  return (
    <div className={cn("p-5", className)}>
      {children}
    </div>
  );
}
