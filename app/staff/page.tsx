import type React from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Home,
  KeyRound,
  LockKeyhole,
  Mail,
  Plus,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";

const roles = [
  {
    name: "Owner/Admin",
    access: "Full provider access",
    description: "Can manage provider profile, houses, staff, permissions, residents, documents, and reports.",
  },
  {
    name: "Compliance Manager",
    access: "Compliance access",
    description: "Can manage compliance binder, staff training, incidents, grievances, reports, and reviews.",
  },
  {
    name: "House Manager",
    access: "Assigned house access",
    description: "Can manage assigned houses, residents, notes, UA/BA, incidents, grievances, and documents.",
  },
  {
    name: "Peer Leader",
    access: "Limited assigned house access",
    description: "Can view limited house tasks and non-sensitive resident workflow items assigned to them.",
  },
  {
    name: "Read-Only Reviewer",
    access: "Read-only access",
    description: "Can review selected reports and compliance records without editing.",
  },
];

const permissionGroups = [
  "Provider profile",
  "Houses",
  "Residents",
  "Resident documents",
  "UA/BA logs",
  "Medication / MAT-MAR",
  "Incidents",
  "Grievances",
  "Payments",
  "Reports",
  "Staff permissions",
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

function RoleCard({ role }: { role: (typeof roles)[number] }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-950">{role.name}</h3>
          <p className="mt-1 text-sm font-medium text-slate-600">{role.access}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{role.description}</p>
        </div>
        <ShieldCheck className="h-5 w-5 shrink-0 text-slate-700" />
      </div>
    </div>
  );
}

export default function StaffPage() {
  return (
    <PageShell>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          <Link
            href="/houses"
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
          >
            <Home className="h-4 w-4" />
            Houses
          </Link>
        </div>

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
                <UserCog className="h-10 w-10 text-slate-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Provider Staff Setup</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">Staff & Roles</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  Invite provider staff, assign roles, limit access by house, and protect sensitive
                  resident, medication, UA/BA, incident, grievance, payment, and report data.
                </p>
              </div>
            </div>

            <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              <UserPlus className="h-4 w-4" />
              Invite Staff
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Staff" value="0" subtitle="No staff invited yet" icon={Users} />
          <MetricCard title="Roles" value="5" subtitle="Default access levels" icon={KeyRound} />
          <MetricCard title="House Access" value="Setup" subtitle="Assign by house" icon={Home} />
          <MetricCard title="Security" value="Required" subtitle="Role-based controls" icon={LockKeyhole} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <form className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Invite Staff Member</h2>
            <p className="mt-1 text-sm text-slate-500">
              New users should remain pending until an owner/admin approves their role and house access.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="First name" placeholder="First name" icon={Users} />
              <Field label="Last name" placeholder="Last name" icon={Users} />
              <Field label="Email" placeholder="email@example.com" icon={Mail} type="email" />
              <Field label="Phone" placeholder="(555) 000-0000" icon={Building2} />

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Role</span>
                <select className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                  {roles.map((role) => (
                    <option key={role.name}>{role.name}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">House access</span>
                <select className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                  <option>All houses</option>
                  <option>Assigned houses only</option>
                  <option>No house access yet</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Access notes</span>
                <textarea
                  placeholder="Example: House Manager for Oak House only."
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
                Save Staff Invite
              </button>
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Save Draft
              </button>

              <Link
                href="/residents"
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Continue to Resident Setup
              </Link>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Permission Groups</h2>
              <div className="mt-4 space-y-2">
                {permissionGroups.map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-slate-700" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Default Role Types</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((role) => (
              <RoleCard key={role.name} role={role} />
            ))}
          </div>
        </section>
    </PageShell>
  );
}
