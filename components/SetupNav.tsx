"use client";

import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Home,
  Landmark,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  ReceiptText,
  Settings,
  ShieldCheck,
  Shuffle,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navGroups = [
  {
    label: "Core",
    items: [
      { label: "Dashboard", href: "/", icon: ShieldCheck },
      { label: "Residents", href: "/residents", icon: Users },
      { label: "Houses", href: "/houses", icon: Home },
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "UA Randomizer", href: "/ua-randomizer", icon: Shuffle },
      { label: "Fees", href: "/fees", icon: ReceiptText },
      { label: "Maintenance", href: "/maintenance", icon: Wrench },
      { label: "Pass Requests", href: "/pass-requests", icon: ClipboardCheck },
    ],
  },
  {
    label: "Records",
    items: [
      { label: "Meeting Minutes", href: "/meeting-minutes", icon: ClipboardList },
      { label: "Compliance Reports", href: "/reports", icon: Landmark },
      { label: "Data / Analytics", href: "/data-analytics", icon: PieChart },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Settings", href: "/account", icon: Settings },
    ],
  },
];

export default function SetupNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`rounded-2xl border bg-white p-3 shadow-sm transition-all duration-200 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:shrink-0 lg:overflow-y-auto ${
        collapsed ? "lg:w-24" : "lg:w-72"
      }`}
    >
      <div
        className={
          collapsed
            ? "mb-4 hidden flex-col items-center gap-2 lg:flex"
            : "mb-4 hidden items-start justify-between gap-3 lg:flex"
        }
      >
        <div className={collapsed ? "flex justify-center" : ""}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>

          {!collapsed ? (
            <div>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">Navigation</p>
              <h2 className="text-base font-semibold text-slate-950">Halfway Portal</h2>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="rounded-xl border p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-950"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p
              className={`mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 ${
                collapsed ? "lg:sr-only" : ""
              }`}
            >
              {group.label}
            </p>

            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={
                      active
                        ? `flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-medium text-white ${
                            collapsed ? "lg:justify-center" : ""
                          }`
                        : `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 ${
                            collapsed ? "lg:justify-center" : ""
                          }`
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className={collapsed ? "lg:sr-only" : ""}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
