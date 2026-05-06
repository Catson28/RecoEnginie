"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useOpenItemStats } from "@/hooks/useOpenItems";

interface NavItem {
  label:  string;
  href:   string;
  icon:   string;
  badge?: string | number;
  badgeColor?: "warn" | "danger";
}

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "◈" },
    ],
  },
  {
    title: "Reconciliation",
    items: [
      { label: "All Runs",         href: "/runs",         icon: "▤" },
      { label: "New Run",          href: "/runs/new",     icon: "＋" },
      { label: "Matching Diagram", href: "/matching",     icon: "⟁" },
    ],
  },
  {
    title: "Resolution",
    items: [
      { label: "Open Items",  href: "/open-items", icon: "⚠" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Reports",       href: "/reports", icon: "◻" },
      { label: "Engine Config", href: "/engine",  icon: "⚙" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { stats }  = useOpenItemStats();
  const openCount  = stats?.total_open ?? 0;

  return (
    <aside className="w-[210px] flex-shrink-0 bg-[#111118] border-r border-[rgba(255,255,255,0.06)] flex flex-col fixed top-0 left-0 bottom-0 z-50">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#4f8fff] rounded-lg flex items-center justify-center text-white text-lg">
            ⚖
          </div>
          <div>
            <div className="text-[14px] font-semibold tracking-tight">ReconEngine</div>
            <div className="text-[10px] text-[#8080a0] font-mono uppercase tracking-wider mt-0.5">
              Bank Reconciliation
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {sections.map((sec) => (
          <div key={sec.title} className="mb-4">
            <div className="text-[10px] font-medium text-[#4a4a68] uppercase tracking-widest px-2 mb-1.5">
              {sec.title}
            </div>
            {sec.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const badge    = item.label === "Open Items" ? openCount : item.badge;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] mb-0.5 transition-all",
                    isActive
                      ? "bg-[rgba(79,143,255,0.12)] text-[#4f8fff] font-medium"
                      : "text-[#8080a0] hover:bg-[#1c1c28] hover:text-[#eeeef5]"
                  )}
                >
                  <span className="w-4 text-center text-[14px]">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {badge != null && Number(badge) > 0 && (
                    <span className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 rounded-full",
                      "bg-[rgba(239,68,68,0.15)] text-[#ef4444]"
                    )}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Status */}
      <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] text-[10px] text-[#4a4a68] font-mono">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00d4aa] mr-1.5 animate-pulse-dot" />
        Engine v1.0 · Connected
      </div>
    </aside>
  );
}
