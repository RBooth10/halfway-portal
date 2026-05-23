import type React from "react";
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  FileSignature,
  HeartHandshake,
  Home,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import SetupNav from "@/components/SetupNav";

const onboardingItems = [
  "Resident demographic information",
  "Admission date and assigned house",
  "Emergency contact",
  "Resident handbook acknowledgment",
  "Fee agreement",
  "Release of information",
  "Medication / MAT-MAR disclosure",
  "Recovery plan",
  "RCI assessment",
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

export default function ResidentsPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <SetupNav />
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          <Link
            href="/staff"
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
          >
            <Users className="h-4 w-4" />
            Staff & Roles
          </Link>
        </div>

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
                <UserPlus className="h-10 w-10 text-slate-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Resident Onboarding</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">Residents</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  Add residents to the provider, assign them to a house, start their required
                  document checklist, and prepare recovery-support workflows such as medication
                  disclosure, RCI, UA/BA, notes, and payment tracking.
                </p>
              </div>
            </div>

            <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              <Plus className="h-4 w-4" />
              Add Resident
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Residents" value="0" subtitle="No residents added yet" icon={Users} />
          <MetricCard title="Assigned Houses" value="Setup" subtitle="Assign each resident" icon={Home} />
          <MetricCard title="File Checklist" value="Required" subtitle="Documents and signatures" icon={FileSignature} />
          <MetricCard title="Recovery Support" value="Pending" subtitle="RCI, plan, and supports" icon={HeartHandshake} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_390px]">
          <form className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Add Resident</h2>
            <p className="mt-1 text-sm text-slate-500">
              This creates the resident profile and starts the onboarding checklist.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="First name" placeholder="First name" icon={Users} />
              <Field label="Last name" placeholder="Last name" icon={Users} />
              <Field label="Email" placeholder="resident@example.com" icon={Mail} type="email" />
              <Field label="Phone" placeholder="(555) 000-0000" icon={Phone} />
              <Field label="Date of birth" placeholder="MM/DD/YYYY" icon={CalendarDays} type="date" />
              <Field label="Admission date" placeholder="MM/DD/YYYY" icon={CalendarDays} type="date" />

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Assigned house</span>
                <select className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                  <option>Select house</option>
                  <option>House will appear here after setup</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Resident status</span>
                <select className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                  <option>Pending admission</option>
                  <option>Active</option>
                  <option>Discharged</option>
                  <option>Archived</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Medication / MAT-MAR disclosure</span>
                <select className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                  <option>Not completed yet</option>
                  <option>No medications disclosed</option>
                  <option>Medication disclosed</option>
                  <option>MAT/MAR disclosed</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Initial file status</span>
                <select className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                  <option>Needs onboarding packet</option>
                  <option>Packet sent</option>
                  <option>Partially complete</option>
                  <option>Complete</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Admission notes</span>
                <textarea
                  placeholder="Brief notes about admission, referral source, or immediate needs."
                  className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Save Resident
              </button>

              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Save Draft
              </button>

              <Link
                href="/documents"
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Continue to Documents
              </Link>

              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Return to Dashboard
              </Link>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Onboarding Checklist</h2>
              <div className="mt-4 space-y-3">
                {onboardingItems.map((item) => (
                  <div key={item} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Compliance note</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Resident records should be provider-specific and house-specific. Discharged
                residents should be archived instead of deleted so documentation history remains
                available for compliance review.
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Next workflows</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p className="rounded-2xl bg-slate-50 p-4">Assign required documents.</p>
                <p className="rounded-2xl bg-slate-50 p-4">Complete medication disclosure.</p>
                <p className="rounded-2xl bg-slate-50 p-4">Start recovery plan and RCI.</p>
                <p className="rounded-2xl bg-slate-50 p-4">Create payment agreement if needed.</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
