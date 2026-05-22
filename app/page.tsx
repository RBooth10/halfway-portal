import type React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  Building2,
  ClipboardCheck,
  FileSignature,
  Home,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

const setupSteps = [
  {
    title: "Create provider profile",
    detail: "Add the recovery residence organization name, contact information, certification status, and service area.",
    icon: Building2,
  },
  {
    title: "Add houses",
    detail: "Create each recovery residence house with bed count, gender served, address, and house manager.",
    icon: Home,
  },
  {
    title: "Invite staff",
    detail: "Assign roles such as Owner/Admin, Compliance Manager, House Manager, Peer Leader, or Read-Only Reviewer.",
    icon: UserPlus,
  },
  {
    title: "Upload compliance documents",
    detail: "Add policies, resident handbook, emergency plan, COI, staff training documents, and house-specific records.",
    icon: FileSignature,
  },
];

const stats = [
  { title: "Providers", value: "Setup", subtitle: "Create first provider", icon: Building2 },
  { title: "Houses", value: "0", subtitle: "No houses added yet", icon: Home },
  { title: "Beds", value: "0", subtitle: "Add houses to calculate beds", icon: BedDouble },
  { title: "Residents", value: "0", subtitle: "No residents added yet", icon: Users },
];

function StatCard({
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

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100">
                <ShieldCheck className="h-10 w-10 text-slate-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Provider Setup Dashboard</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                  Recovery Residence Compliance Portal
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  This portal is designed to support multiple recovery residence providers. Create a
                  provider profile, add houses, invite staff, upload compliance documents, and begin
                  tracking FARR readiness from one centralized system.
                </p>
              </div>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Start Provider Onboarding
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <StatCard key={item.title} {...item} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Provider Onboarding</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Complete these steps before compliance scores and reports are calculated.
                </p>
              </div>
              <ClipboardCheck className="h-6 w-6 text-slate-700" />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {setupSteps.map((item) => (
                <div key={item.title} className="rounded-2xl bg-slate-50 p-5">
                  <div className="flex gap-3">
                    <div className="rounded-xl bg-white p-2 shadow-sm">
                      <item.icon className="h-5 w-5 text-slate-700" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-950">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Compliance Readiness</h2>
            <p className="mt-1 text-sm text-slate-500">
              Readiness tracking begins after a provider, houses, staff, and required documents are added.
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium">Administrative Operations</p>
                <p className="mt-1 text-sm text-slate-500">Waiting for provider documents and staff setup.</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium">Physical Environment</p>
                <p className="mt-1 text-sm text-slate-500">Waiting for house records and safety documents.</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium">Recovery Support</p>
                <p className="mt-1 text-sm text-slate-500">Waiting for resident file and support workflow setup.</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium">Good Neighbor</p>
                <p className="mt-1 text-sm text-slate-500">Waiting for policies, grievance process, and house setup.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
