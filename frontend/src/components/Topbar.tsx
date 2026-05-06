"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";

const titles: Record<string, { title: string; crumb: string }> = {
  "/dashboard":  { title: "Dashboard",    crumb: "ReconEngine / Overview" },
  "/runs":       { title: "All Runs",     crumb: "ReconEngine / Reconciliation" },
  "/runs/new":   { title: "New Run",      crumb: "ReconEngine / New Reconciliation" },
  "/open-items": { title: "Open Items",   crumb: "ReconEngine / Resolution" },
  "/reports":    { title: "Reports",      crumb: "ReconEngine / Analytics" },
  "/engine":     { title: "Engine Config",crumb: "ReconEngine / Analytics" },
};

function getPageMeta(pathname: string) {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith("/matching/"))
    return { title: "Matching Diagram", crumb: "ReconEngine / Runs / Matching" };
  if (pathname.includes("/resolve"))
    return { title: "Resolve Open Items", crumb: "ReconEngine / Runs / Resolve" };
  if (pathname.startsWith("/runs/"))
    return { title: "Run Detail", crumb: "ReconEngine / Reconciliation" };
  return { title: "ReconEngine", crumb: "ReconEngine" };
}

export function Topbar() {
  const pathname = usePathname();
  const meta     = getPageMeta(pathname);

  return (
    <header className="sticky top-0 z-40 bg-[#111118] border-b border-[rgba(255,255,255,0.06)] h-14 flex items-center px-7 justify-between">
      <div>
        <span className="text-[15px] font-medium">{meta.title}</span>
        <span className="ml-3 text-[11px] text-[#4a4a68] font-mono hidden sm:inline">
          {meta.crumb}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/runs/new">
          <Button variant="default" size="sm">＋ New Reconciliation</Button>
        </Link>
      </div>
    </header>
  );
}
