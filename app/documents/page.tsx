"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  FileText,
  FolderOpen,
  Home,
  Loader2,
  Plus,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

type DocumentForm = {
  document_name: string;
  category: string;
  compliance_domain: string;
  applies_to: string;
  version_label: string;
  effective_date: string;
  status: string;
  notes: string;
};

type DocumentRow = {
  id: string;
  document_name: string;
  category: string;
  compliance_domain: string | null;
  applies_to: string | null;
  version_label: string | null;
  effective_date: string | null;
  status: string;
  notes: string | null;
};

const initialForm: DocumentForm = {
  document_name: "",
  category: "Provider",
  compliance_domain: "Administrative Operations",
  applies_to: "Provider-wide",
  version_label: "",
  effective_date: "",
  status: "not_uploaded",
  notes: "",
};

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
  const label =
    value === "uploaded"
      ? "Uploaded"
      : value === "needs_review"
      ? "Needs Review"
      : value === "archived"
      ? "Archived"
      : "Not Uploaded";

  const style =
    value === "uploaded"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      : value === "needs_review"
      ? "bg-amber-50 text-amber-700 ring-amber-600/20"
      : value === "archived"
      ? "bg-slate-50 text-slate-600 ring-slate-600/20"
      : "bg-rose-50 text-rose-700 ring-rose-600/20";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${style}`}>
      {label}
    </span>
  );
}

function Field({
  label,
  placeholder,
  icon: Icon,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      <div className="relative mt-2">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
        />
      </div>
    </label>
  );
}

export default function DocumentsPage() {
  const [form, setForm] = useState<DocumentForm>(initialForm);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerName, setProviderName] = useState("Current Provider");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField(field: keyof DocumentForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function loadDocuments(activeProviderId: string) {
    const supabase = getSupabaseClient();

    const providerResult = await supabase
      .from("providers")
      .select("legal_name")
      .eq("id", activeProviderId)
      .single();

    if (!providerResult.error && providerResult.data?.legal_name) {
      setProviderName(providerResult.data.legal_name);
    }

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("provider_id", activeProviderId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    setDocuments((data ?? []) as DocumentRow[]);
  }

  useEffect(() => {
    async function initialize() {
      try {
        const supabase = getSupabaseClient();

        let activeProviderId = localStorage.getItem("current_provider_id");

        if (!activeProviderId) {
          const latestProviderResult = await supabase
            .from("providers")
            .select("id")
            .order("created_at", { ascending: false })
            .limit(1);

          activeProviderId = latestProviderResult.data?.[0]?.id as string | undefined;
        }

        if (!activeProviderId) {
          setError("No provider selected yet. Go to Provider Onboarding first and save a provider profile.");
          return;
        }

        localStorage.setItem("current_provider_id", activeProviderId);
        setProviderId(activeProviderId);
        await loadDocuments(activeProviderId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load documents.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  async function saveDocument() {
    setSaving(true);
    setMessage("");
    setError("");

    if (!providerId) {
      setSaving(false);
      setError("No provider selected. Save a provider profile first.");
      return;
    }

    if (!form.document_name.trim()) {
      setSaving(false);
      setError("Document name is required.");
      return;
    }

    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("documents")
        .insert({
          provider_id: providerId,
          document_name: form.document_name.trim(),
          category: form.category,
          compliance_domain: form.compliance_domain,
          applies_to: form.applies_to,
          version_label: form.version_label.trim() || null,
          effective_date: form.effective_date || null,
          status: form.status,
          notes: form.notes.trim() || null,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setDocuments((current) => [data as DocumentRow, ...current]);
      setForm(initialForm);
      setMessage(`${data.document_name} was saved successfully.`);
    } catch (err) {
      const supabaseError = err as {
        message?: unknown;
        details?: unknown;
        hint?: unknown;
        code?: unknown;
      };

      const errorParts = [
        supabaseError?.message ? `Message: ${String(supabaseError.message)}` : null,
        supabaseError?.details ? `Details: ${String(supabaseError.details)}` : null,
        supabaseError?.hint ? `Hint: ${String(supabaseError.hint)}` : null,
        supabaseError?.code ? `Code: ${String(supabaseError.code)}` : null,
      ].filter(Boolean);

      setError(errorParts.length ? errorParts.join(" ") : "Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  }

  const uploadedCount = documents.filter((doc) => doc.status === "uploaded").length;
  const needsReviewCount = documents.filter((doc) => doc.status === "needs_review").length;

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
                Upload and organize compliance document records for{" "}
                <span className="font-medium text-slate-950">{providerName}</span>.
                File storage will be connected later; this step saves the document tracking record.
              </p>
            </div>
          </div>

          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
        </div>
      </section>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>{message}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Documents" value={String(documents.length)} subtitle="Saved to Supabase" icon={FileText} />
        <MetricCard title="Uploaded" value={String(uploadedCount)} subtitle="Marked uploaded" icon={CheckCircle2} />
        <MetricCard title="Needs Review" value={String(needsReviewCount)} subtitle="Open review items" icon={ClipboardCheck} />
        <MetricCard title="Compliance Binder" value={documents.length ? "In Progress" : "Pending"} subtitle="Document records" icon={ShieldCheck} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_390px]">
        <div className="space-y-6">
          <form className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Add Document Record</h2>
            <p className="mt-1 text-sm text-slate-500">
              This creates a document record. Actual file upload storage will be connected later.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field
                label="Document name"
                placeholder="Example: Resident Handbook"
                icon={FileText}
                value={form.document_name}
                onChange={(value) => updateField("document_name", value)}
                required
              />

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Category</span>
                <select
                  value={form.category}
                  onChange={(event) => updateField("category", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option>Provider</option>
                  <option>House</option>
                  <option>Resident</option>
                  <option>Staff</option>
                  <option>Other</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Compliance domain</span>
                <select
                  value={form.compliance_domain}
                  onChange={(event) => updateField("compliance_domain", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option>Administrative Operations</option>
                  <option>Physical Environment</option>
                  <option>Recovery Support</option>
                  <option>Good Neighbor</option>
                  <option>Not sure yet</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Applies to</span>
                <select
                  value={form.applies_to}
                  onChange={(event) => updateField("applies_to", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option>Provider-wide</option>
                  <option>Specific house</option>
                  <option>Resident packet</option>
                  <option>Staff training</option>
                </select>
              </label>

              <Field
                label="Version label"
                placeholder="Example: 2026 v1"
                icon={FileSignature}
                value={form.version_label}
                onChange={(value) => updateField("version_label", value)}
              />

              <Field
                label="Effective date"
                placeholder="MM/DD/YYYY"
                icon={ClipboardCheck}
                type="date"
                value={form.effective_date}
                onChange={(value) => updateField("effective_date", value)}
              />

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="not_uploaded">Not Uploaded</option>
                  <option value="uploaded">Uploaded</option>
                  <option value="needs_review">Needs Review</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="Add document notes, review needs, or FARR/NARR references."
                  className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveDocument}
                disabled={saving || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Document"}
              </button>

              <button
                type="button"
                onClick={() => setForm(initialForm)}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Clear Form
              </button>

              <Link
                href="/reports"
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Continue to Reports
              </Link>
            </div>
          </form>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Saved Documents</h2>
            {loading ? (
              <p className="mt-3 text-sm text-slate-500">Loading documents...</p>
            ) : documents.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No documents saved yet.</p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Document</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Domain</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4 font-medium text-slate-950">{doc.document_name}</td>
                        <td className="px-4 py-4 text-slate-600">{doc.category}</td>
                        <td className="px-4 py-4 text-slate-600">{doc.compliance_domain || "Not set"}</td>
                        <td className="px-4 py-4">
                          <StatusBadge value={doc.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
    </PageShell>
  );
}
