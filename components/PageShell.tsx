import type React from "react";
import SetupNav from "@/components/SetupNav";

export default function PageShell({
  children,
  maxWidth = "max-w-7xl",
}: {
  children: React.ReactNode;
  maxWidth?: "max-w-5xl" | "max-w-6xl" | "max-w-7xl";
}) {
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
      <div className={`mx-auto ${maxWidth} space-y-6`}>
        <SetupNav />
        {children}
      </div>
    </main>
  );
}
