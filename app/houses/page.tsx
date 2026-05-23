import type React from "react";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  Download,
  Home,
  MapPin,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import SetupNav from "@/components/SetupNav";

const setupItems = [
  "House name",
  "Physical address",
  "Gender/population served",
  "Total bed count",
  "House manager assignment",
  "Emergency/safety documents",
  "House-specific compliance binder",
];

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3">
          <Icon className="h-6 w-6 text-slate-700" />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  icon: Icon,
  type = "text",
}: {
  label: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="relative mt-2">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type={type}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
        />
      </div>
    </label>
  );
}

export default function HousesPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <SetupNav />
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
                <Home className="h-10 w-10 text-slate-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Provider House Setup</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">Houses</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  Add each recovery residence house for the provider. Bed counts, residents,
                  documents, safety checks, incidents, grievances, and readiness scores will roll up
                  from the house level.
                </p>
              </div>
            </div>

            <button className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50">
              <Download className="h-4 w-4" />
              Export Houses
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Houses" value="0" subtitle="No houses added yet" icon={Home} />
          <MetricCard title="Beds" value="0" subtitle="Add houses to calculate" icon={BedDouble} />
          <MetricCard title="Residents" value="0" subtitle="No residents assigned" icon={Users} />
          <MetricCard title="Readiness" value="Setup" subtitle="Waiting for house data" icon={ShieldCheck} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <form className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Add House</h2>
            <p className="mt-1 text-sm text-slate-500">
              This creates a house record under the selected provider.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="House name" placeholder="Example: Oak House" icon={Home} />
              <Field label="Total beds" placeholder="0" icon={BedDouble} type="number" />
              <Field label="Street address" placeholder="123 Main Street" icon={MapPin} />
              <Field label="City" placeholder="City" icon={MapPin} />
              <Field label="State" placeholder="FL" icon={MapPin} />
              <Field label="ZIP code" placeholder="00000" icon={MapPin} />

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Gender / population served</span>
                <select className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                  <option>Male</option>
                  <option>Female</option>
                  <option>All Gender</option>
                  <option>Other / Specialized Population</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">FARR/NARR level</span>
                <select className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                  <option>Level 1</option>
                  <option>Level 2</option>
                  <option>Level 3</option>
                  <option>Level 4</option>
                  <option>Not sure yet</option>
                </select>
              </label>

              <Field label="House manager" placeholder="Assign later or enter name" icon={Building2} />

              <label className="block">
                <span className="text-sm font-medium text-slate-700">House status</span>
                <select className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                  <option>Active</option>
                  <option>Pending setup</option>
                  <option>Inactive</option>
                </select>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Save House
              </button>
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Save Draft
              </button>

              <Link
                href="/staff"
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Continue to Staff Setup
              </Link>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">House setup checklist</h2>
              <div className="mt-4 space-y-3">
                {setupItems.map((item) => (
                  <div key={item} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Why houses matter</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Houses are the center of occupancy, resident assignment, safety checks, fire drills,
                maintenance, incidents, grievances, and house-specific compliance documents.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
