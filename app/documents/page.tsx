import type React from "react";
import {
  ArrowLeft,
  Building2,
  ClipboardCheck,
  FileSignature,
  FileText,
  FolderOpen,
  Home,
  Plus,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import SetupNav from "@/components/SetupNav";

const documentCategories = [
  {
    title: "Provider Documents",
    description: "Organization-level policies, certification documents, insurance, and operating procedures.",
    examples: ["Policies and procedures", "Resident handbook", "Certificate of insurance", "MAT/MAR policy", "Grievance procedure"],
    icon: Building2,
  },
  {
    title: "House Documents",
    description: "House-specific evidence such as safety checks, fire drills, evacuation maps, and location documents.",
    examples: ["Evacuation map", "Fire drill log", "Safety checklist", "Owner/lease letter", "House rules"],
    icon: Home,
  },
  {
    title: "Resident Packet",
    description: "Documents assigned during admission and maintained in each resident file.",
    examples: ["Application", "Fee agreement", "Release of information", "Emergency contacts", "Recovery plan"],
    icon: Users,
  },
  {
    title: "Staff Training",
    description: "Training and acknowledgment records required for staff and peer leaders.",
    examples: ["Ethics training", "Standards orientation", "Confidentiality", "Emergency response", "MAT/MAR awareness"],
    icon: ShieldCheck,
  },
];

const requiredDocuments = [
  { name: "Provider Policies and Procedures", category: "Provider", status: "Not Uploaded" },
  { name: "Resident Handbook", category: "Provider", status: "Not Uploaded" },
  { name: "Certificate of Insurance", category: "Provider", status: "Not Uploaded" },
  { name: "Emergency Preparedness Plan", category: "Provider", status: "Not Uploaded" },
  { name: "MAT/MAR Access Statement", category: "Provider", status: "Not Uploaded" },
  { name: "Grievance Procedure", category: "Provider", status: "Not Uploaded" },
  { name: "House Rules", category: "House", status: "Not Uploaded" },
  { name: "Fire Drill Log", category: "House", status: "Not Uploaded" },
  { name: "Resident Fee Agreement", category: "Resident", status: "Not Uploaded" },
  { name: "Release of Information", category: "Resident", status: "Not Uploaded" },
  { name: "Staff Ethics Acknowledgment", category: "Staff", status: "Not Uploaded" },
  { name: "Staff Training Record", category: "Staff", status: "Not Uploaded" },
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
    value === "Uploaded"
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

export default function DocumentsPage() {
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
            href="/residents"
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
          >
            <Users className="h-4 w-4" />
            Residents
          </Link>
        </div>

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
                <FolderOpen className="h-10 w-10 text-slate-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Compliance Document Setup</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">Documents</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  Upload and organize provider documents, house documents, resident packet documents,
                  and staff training records. These documents will support the provider's compliance
                  binder and readiness reporting.
                </p>
              </div>
            </div>

            <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              <Upload className="h-4 w-4" />
              Upload Document
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Documents" value="0" subtitle="No uploads yet" icon={FileText} />
          <MetricCard title="Required Items" value="12" subtitle="Starter checklist" icon={ClipboardCheck} />
          <MetricCard title="Resident Packet" value="Setup" subtitle="Admission documents" icon={FileSignature} />
          <MetricCard title="Compliance Binder" value="Pending" subtitle="Waiting for uploads" icon={ShieldCheck} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_390px]">
          <div className="space-y-6">
            <form className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Add Document</h2>
              <p className="mt-1 text-sm text-slate-500">
                This creates a document record. File upload storage will be connected later.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Field label="Document name" placeholder="Example: Resident Handbook" icon={FileText} />

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Category</span>
                  <select className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                    <option>Provider</option>
                    <option>House</option>
                    <option>Resident</option>
                    <option>Staff</option>
                    <option>Other</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Compliance domain</span>
                  <select className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                    <option>Administrative Operations</option>
                    <option>Physical Environment</option>
                    <option>Recovery Support</option>
                    <option>Good Neighbor</option>
                    <option>Not sure yet</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Applies to</span>
                  <select className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                    <option>Provider-wide</option>
                    <option>Specific house</option>
                    <option>Resident packet</option>
                    <option>Staff training</option>
                  </select>
                </label>

                <Field label="Version label" placeholder="Example: 2026 v1" icon={FileSignature} />
                <Field label="Effective date" placeholder="MM/DD/YYYY" icon={ClipboardCheck} type="date" />

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Notes</span>
                  <textarea
                    placeholder="Add any document notes, review needs, or FARR/NARR references."
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
                  Save Document
                </button>

                <button
                  type="button"
                  className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Save Draft
                </button>

                <Link
                  href="/reports"
                  className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Continue to Reports
                </Link>

                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Return to Dashboard
                </Link>
              </div>
            </form>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Required Document Checklist</h2>
              <p className="mt-1 text-sm text-slate-500">
                Starter checklist for provider setup. Later, this will be generated by provider level and state requirements.
              </p>

              <div className="mt-6 overflow-hidden rounded-2xl border">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Document</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {requiredDocuments.map((doc) => (
                      <tr key={doc.name} className="hover:bg-slate-50">
                        <td className="px-4 py-4 font-medium text-slate-950">{doc.name}</td>
                        <td className="px-4 py-4 text-slate-600">{doc.category}</td>
                        <td className="px-4 py-4">
                          <StatusBadge value={doc.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            {documentCategories.map((category) => (
              <div key={category.title} className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex gap-3">
                  <div className="rounded-xl bg-slate-100 p-2">
                    <category.icon className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <h2 className="font-semibold">{category.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{category.description}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {category.examples.map((example) => (
                    <div key={example} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      {example}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </aside>
        </section>
      </div>
    </main>
  );
}
