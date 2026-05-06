"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface Props {
  open:      boolean;
  onClose:   () => void;
  title:     string;
  children:  React.ReactNode;
  footer?:   React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, footer, maxWidth = "max-w-lg" }: Props) {
  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 p-5"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={cn(
          "bg-[#16161f] border border-[rgba(255,255,255,0.11)] rounded-2xl w-full max-h-[90vh] overflow-y-auto",
          "shadow-[0_24px_64px_rgba(0,0,0,0.5)]",
          maxWidth
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
          <span className="text-[13px] font-medium">{title}</span>
          <button
            onClick={onClose}
            className="text-[#8080a0] hover:text-[#eeeef5] text-base px-2 py-1 rounded-md hover:bg-[#1c1c28] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.06)] flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
