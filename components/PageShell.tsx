import type React from "react";
import SetupNav from "@/components/SetupNav";
import AppHeader from "@/components/AppHeader";
import ProviderSwitcher from "@/components/ProviderSwitcher";

export default function PageShell({
  children,
  maxWidth = "max-w-7xl",
}: {
  children: React.ReactNode;
  maxWidth?: "max-w-5xl" | "max-w-6xl" | "max-w-7xl";
}) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-4 text-slate-950 sm:px-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-[104rem] flex-col gap-4 lg:flex-row lg:items-start">
        <SetupNav />

        <div className="min-w-0 flex-1 space-y-4">
          <AppHeader />
          <ProviderSwitcher />

          <div className={`mx-auto w-full ${maxWidth} space-y-4`}>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
