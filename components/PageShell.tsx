import type React from "react";
import SetupNav from "@/components/SetupNav";
import AppHeader from "@/components/AppHeader";

export default function PageShell({
  children,
  maxWidth = "max-w-7xl",
}: {
  children: React.ReactNode;
  maxWidth?: "max-w-5xl" | "max-w-6xl" | "max-w-7xl";
}) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-4 text-slate-950 sm:px-5 lg:px-6">
      <div className={`mx-auto ${maxWidth} space-y-4`}>
        <AppHeader />
        <SetupNav />
        {children}
      </div>
    </main>
  );
}
