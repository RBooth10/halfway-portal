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
    <header className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-500">
              Multi-Provider Recovery Housing Platform
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Recovery Residence Compliance Portal
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-600/20">
            <LockKeyhole className="h-4 w-4" />
            Private Build
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 ring-1 ring-amber-600/20">
            <Building2 className="h-4 w-4" />
            Setup Mode
          </div>

          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>

          <Link
            href="/account"
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <UserCog className="h-4 w-4" />
            Account
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
