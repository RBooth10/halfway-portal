import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  FileText,
  Home,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";

const setupSteps = [
  {
    title: "Provider Profile",
    description: "Add organization name, contact info, certification status, and provider details.",
    href: "/onboarding",
    status: "Started",
    icon: Building2,
  },
  {
    title: "Houses",
    description: "Add each recovery residence house, address, bed count, and population served.",
    href: "/houses",
    status: "Next",
    icon: Home,
  },
  {
    title: "Staff & Roles",
    description: "Invite staff, assign roles, and limit access by provider and house.",
    href: "/staff",
    status: "Pending",
    icon: UserCog,
  },
  {
    title: "Residents",
    description: "Onboard residents and begin file, RCI, medication, and recovery-plan tracking.",
    href: "/residents",
    status: "Pending",
    icon: Users,
  },
  {
    title: "Documents",
    description: "Upload provider, house, resident, and staff compliance documents.",
    href: "/documents",
    status: "Pending",
    icon: FileText,
  },
  {
    title: "Reports",
    description: "Review missing items and prepare readiness reports.",
    href: "/reports",
    status: "Pending",
    icon: BarChart3,
  },
];

function StatusBadge({ value }: { value: string }) {
  const style =
    value === "Started"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      : value === "Next"
        ? "bg-amber-50 text-amber-700 ring-amber-600/20"
        : "bg-slate-50 text-slate-600 ring-slate-600/20";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${style}`}>
      {value}
    </span>
  );
}

export default function SetupProgress() {
  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Provider Setup Progress</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Complete these sections to prepare the portal for a recovery residence provider.
            Once the database is connected, this panel will update automatically based on real records.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-slate-950">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Setup mode
          </div>
          <p className="mt-1 text-slate-500">1 of 6 sections started</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {setupSteps.map((step) => (
          <Link
            key={step.title}
            href={step.href}
            className="group rounded-2xl border p-5 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-xl bg-slate-100 p-2">
                <step.icon className="h-5 w-5 text-slate-700" />
              </div>
              <StatusBadge value={step.status} />
            </div>

            <h3 className="mt-4 font-semibold text-slate-950">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{step.description}</p>

            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
              Open section
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
