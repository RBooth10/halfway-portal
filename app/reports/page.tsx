import type React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSignature,
  FolderOpen,
  Home,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";

const readinessDomains = [
  {
    name: "Administrative Operations",
    status: "Setup Needed",
    score: "0%",
    items: [
      "Provider profile",
      "Policies and procedures",
      "Certificate of insurance",
      "Staff roles and permissions",
      "Staff training records",
    ],
  },
  {
    name: "Physical Environment",
    status: "Setup Needed",
    score: "0%",
    items: [
      "House records",
      "Bed counts",
      "Safety checklist",
      "Fire drill log",
      "Emergency preparedness documents",
    ],
  },
  {
    name: "Recovery Support",
    status: "Setup Needed",
    score: "0%",
    items: [
      "Resident files",
      "Resident handbook acknowledgment",
      "Recovery plans",
      "Medication / MAT-MAR disclosure",
      "RCI assessment",
      "UA/BA follow-up process",
    ],
  },
  {
    name: "Good Neighbor",
    status: "Setup Needed",
    score: "0%",
    items: [
      "Good neighbor policy",
      "Grievance procedure",
      "House rules",
      "Complaint tracking",
      "Incident and grievance logs",
    ],
  },
];

const reportTypes = [
  {
    title: "Provider Readiness Report",
    description: "Overview of setup progress and missing compliance items across the provider.",
    icon: ShieldCheck,
  },
  {
    title: "House Readiness Report",
    description: "House-level bed counts, safety items, documents, fire drills, and open tasks.",
    icon: Home,
  },
  {
    title: "Resident File Report",
    description: "Resident file completion, missing signatures, medication disclosure, RCI, and recovery plan status.",
    icon: Users,
  },
  {
    title: "Document Binder Report",
    description: "Provider, house, resident, and staff document completion status.",
    icon: FolderOpen,
  },
  {
    title: "Staff Training Report",
    description: "Staff roles, assigned houses, required training, and missing acknowledgments.",
    icon: ClipboardCheck,
  },
  {
    title: "FARR Review Packet",
    description: "A future export designed to support readiness review and certification preparation.",
    icon: FileSignature,
  },
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

function StatusBadge({ value }: { value: string }) {
  const style =
    value === "Ready"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      : value === "Needs Review"
        ? "bg-amber-50 text-amber-700 ring-amber-600/20"
        : "bg-rose-50 text-rose-700 ring-rose-600/20";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${style}`}>
      {value}
    </span>
  );
}

function ReadinessDomainCard({
  domain,
}: {
  domain: (typeof readinessDomains)[number];
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{domain.name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Readiness score will calculate after provider data is connected.
          </p>
        </div>
        <StatusBadge value={domain.status} />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Completion</span>
          <span className="font-semibold text-slate-950">{domain.score}</span>
        </div>
        <div className="mt-2 h-3 rounded-full bg-slate-100">
          <div className="h-3 rounded-full bg-slate-950" style={{ width: domain.score }} />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {domain.items.map((item) => (
          <div key={item} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
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
            href="/documents"
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
          >
            <FolderOpen className="h-4 w-4" />
            Documents
          </Link>
        </div>

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
                <BarChart3 className="h-10 w-10 text-slate-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Provider Readiness</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">Reports</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  Review provider setup progress, missing compliance items, document readiness,
                  house readiness, staff training, resident file completion, and future FARR review exports.
                </p>
              </div>
            </div>

            <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              <Download className="h-4 w-4" />
              Export Readiness Report
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Provider Readiness" value="0%" subtitle="Waiting for setup data" icon={ShieldCheck} />
          <MetricCard title="Open Setup Items" value="21" subtitle="Starter checklist items" icon={AlertTriangle} />
          <MetricCard title="Reports" value="6" subtitle="Available report types" icon={BarChart3} />
          <MetricCard title="Export Status" value="Pending" subtitle="Connect data first" icon={Download} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          {readinessDomains.map((domain) => (
            <ReadinessDomainCard key={domain.name} domain={domain} />
          ))}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Available Reports</h2>
              <p className="mt-1 text-sm text-slate-500">
                These exports will become active after the database is connected.
              </p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-slate-700" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reportTypes.map((report) => (
              <div key={report.title} className="rounded-2xl border p-5">
                <div className="flex gap-3">
                  <div className="rounded-xl bg-slate-100 p-2">
                    <report.icon className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-950">{report.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{report.description}</p>
                  </div>
                </div>

                <button className="mt-4 w-full rounded-xl border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Preview Report
                </button>
              </div>
            ))}
          </div>
        </section>
    </PageShell>
  );
}
