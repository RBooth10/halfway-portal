import {
  Building2,
  Home,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Multi-Provider Recovery Housing Platform
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-slate-950">
              Recovery Residence Compliance Portal
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
            <LockKeyhole className="h-3.5 w-3.5" />
            Private Build
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20">
            <Building2 className="h-3.5 w-3.5" />
            Setup Mode
          </div>

          <Link
            href="/auth"
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign In
          </Link>

          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50"
          >
            <UserCog className="h-3.5 w-3.5" />
            Account
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50"
          >
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
