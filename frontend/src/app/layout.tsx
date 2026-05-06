import type { Metadata } from "next";
import "@/styles/globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Topbar }  from "@/components/Topbar";

export const metadata: Metadata = {
  title:       "ReconEngine — Bank Reconciliation",
  description: "Automated 3-tier bank reconciliation engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col ml-[210px]">
            <Topbar />
            <main className="flex-1 p-7">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
