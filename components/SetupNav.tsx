"use client";

import {
  BarChart3,
  Building2,
  FileText,
  Home,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/", icon: ShieldCheck },
  { label: "Onboarding", href: "/onboarding", icon: Building2 },
  { label: "Houses", href: "/houses", icon: Home },
  { label: "Staff", href: "/staff", icon: UserCog },
  { label: "Residents", href: "/residents", icon: Users },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

export default function SetupNav() {
  const pathname = usePathname();

  return (
    <nav className="rounded-2xl border bg-white p-1.5 shadow-sm">
      <div className="flex gap-1.5 overflow-x-auto">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-medium text-white"
                  : "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              }
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
