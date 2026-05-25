"use client";

import type React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileSignature,
  FileText,
  FolderOpen,
  Home,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Upload,
  Users,
  X,
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
  is_signable: boolean;
  signature_required_from: string;
  signature_status: string;
  signature_instructions: string;
  resident_send_scope: string;
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
  file_url: string | null;
  is_signable: boolean | null;
  signature_required_from: string | null;
  signature_status: string | null;
  signature_instructions: string | null;
  resident_send_scope: string | null;
  signed_file_url: string | null;
  signed_at: string | null;
  notes: string | null;
};

type HouseOption = {
  id: string;
  name: string;
  status: string | null;
};

type IconComponent = React.ComponentType<{ className?: string }>;

const initialForm: DocumentForm = {
  document_name: "",
  category: "Provider",
  compliance_domain: "Administrative Operations",
  applies_to: "Provider-wide",
  version_label: "",
  effective_date: "",
  status: "not_uploaded",
  is_signable: false,
  signature_required_from: "not_required",
  signature_status: "not_required",
  signature_instructions: "",
  resident_send_scope: "all_residents",
  notes: "",
};

const documentAreas = [
  {
    title: "Provider Documents",
    category: "Provider",
    description: "Organization-level policies, certification files, insurance, operating procedures, and provider-wide compliance records.",
    examples: ["Policies and procedures", "Resident handbook", "Certificate of insurance", "MAT/MAR policy", "Grievance procedure"],
    emptyCta: "Add provider document",
    icon: Building2,
  },
  {
    title: "House Documents",
    category: "House",
    description: "House-specific records for location, safety, fire drills, emergency planning, and physical environment compliance.",
    examples: ["Evacuation map", "Fire drill log", "Safety checklist", "Owner or lease letter", "House rules"],
    emptyCta: "Add house document",
    icon: Home,
  },
  {
    title: "Resident Packet",
    category: "Resident",
    description: "Admission, consent, agreement, recovery planning, and resident-facing documents assigned to individual resident files.",
    examples: ["Application", "Fee agreement", "Release of information", "Emergency contacts", "Recovery plan"],
    emptyCta: "Add resident packet item",
    icon: Users,
  },
  {
    title: "Documents",
    category: "Other",
    description: "General document storage for staff files, training acknowledgments, templates, reference materials, and other supporting records.",
    examples: ["Staff training", "Acknowledgments", "Templates", "Reference documents", "Other support files"],
    emptyCta: "Add document",
    icon: FolderOpen,
  },
];

function getAreaForDocument(document: DocumentRow) {
  if (document.category === "Provider") return "Provider";
  if (document.category === "House") return "House";
  if (document.category === "Resident") return "Resident";
  return "Other";
}

function getAreaDefaults(category: string): Pick<DocumentForm, "category" | "compliance_domain" | "applies_to"> {
  const areaDefaults: Record<string, Pick<DocumentForm, "category" | "compliance_domain" | "applies_to">> = {
    Provider: {
      category: "Provider",
      compliance_domain: "Administrative Operations",
      applies_to: "Provider-wide",
    },
    House: {
      category: "House",
      compliance_domain: "Physical Environment",
      applies_to: "Specific house",
    },
    Resident: {
      category: "Resident",
      compliance_domain: "Recovery Support",
      applies_to: "Resident packet",
    },
    Staff: {
      category: "Staff",
      compliance_domain: "Staff Training",
      applies_to: "Staff file",
    },
    Other: {
      category: "Other",
      compliance_domain: "Not sure yet",
      applies_to: "General documents",
    },
  };

  return areaDefaults[category] ?? areaDefaults.Provider;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: IconComponent;
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

function DocumentAreaCard({
  title,
  description,
  examples,
  count,
  uploadedCount,
  emptyCta,
  icon: Icon,
  active,
  onClick,
}: {
  title: string;
  description: string;
  examples: string[];
  count: number;
  uploadedCount: number;
  emptyCta: string;
  icon: IconComponent;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-full flex-col rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${
        active ? "border-slate-950 bg-slate-50" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-slate-100 p-3 transition group-hover:bg-slate-200">
          <Icon className="h-6 w-6 text-slate-700" />
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" />
      </div>

      <div className="mt-5 flex-1">
        <h3 className="font-semibold text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {examples.slice(0, 3).map((example) => (
            <span key={example} className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              {example}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t pt-4">
        <p className="text-2xl font-semibold tracking-tight text-slate-950">{count}</p>
        <p className="mt-1 text-sm text-slate-500">{count ? `${uploadedCount} uploaded` : "No records yet"}</p>
        <p className="mt-3 text-sm font-semibold text-slate-950">{count ? "View area" : emptyCta}</p>
      </div>
    </button>
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
  icon: IconComponent;
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

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getDocumentSupabase() {
  return getSupabaseClient() as unknown as SupabaseClient;
}

export default function DocumentsPage() {
  const [form, setForm] = useState<DocumentForm>(initialForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [houses, setHouses] = useState<HouseOption[]>([]);
  const [selectedTargetHouseIds, setSelectedTargetHouseIds] = useState<string[]>([]);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerName, setProviderName] = useState("Current Provider");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedAreaCategory, setSelectedAreaCategory] = useState("All");

  function updateField(field: keyof DocumentForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === "resident_send_scope" && value !== "selected_houses") {
      setSelectedTargetHouseIds([]);
    }
  }

  function toggleTargetHouse(houseId: string) {
    setSelectedTargetHouseIds((current) =>
      current.includes(houseId)
        ? current.filter((id) => id !== houseId)
        : [...current, houseId]
    );
  }

  function updateSignatureRequirement(isSignable: boolean) {
    setForm((current) => ({
      ...current,
      is_signable: isSignable,
      signature_required_from: isSignable ? "resident" : "not_required",
      signature_status: isSignable ? "not_sent" : "not_required",
      signature_instructions: isSignable ? current.signature_instructions : "",
      resident_send_scope: isSignable ? current.resident_send_scope : "all_residents",
    }));

    if (!isSignable) {
      setSelectedTargetHouseIds([]);
    }
  }

  function openNewDocumentModal(category = "Provider") {
    setForm({
      ...initialForm,
      ...getAreaDefaults(category),
    });
    setSelectedFile(null);
    setSelectedTargetHouseIds([]);
    setEditingDocumentId(null);
    setMessage("");
    setError("");
    setIsDocumentModalOpen(true);
  }

  function closeDocumentModal() {
    setIsDocumentModalOpen(false);
    setForm(initialForm);
    setSelectedFile(null);
    setSelectedTargetHouseIds([]);
    setEditingDocumentId(null);
  }

  async function loadDocuments(activeProviderId: string) {
    const supabase = getDocumentSupabase();

    const providerResult = await supabase
      .from("providers")
      .select("legal_name")
      .eq("id", activeProviderId)
      .single();

    if (!providerResult.error && providerResult.data?.legal_name) {
      setProviderName(providerResult.data.legal_name);
    }

    const housesResult = await supabase
      .from("houses")
      .select("id, name, status")
      .eq("provider_id", activeProviderId)
      .order("name", { ascending: true });

    if (!housesResult.error) {
      setHouses(
        ((housesResult.data ?? []) as HouseOption[]).filter(
          (house) => String(house.status ?? "active").toLowerCase() !== "inactive"
        )
      );
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
        const supabase = getDocumentSupabase();

        let activeProviderId = localStorage.getItem("current_provider_id");

        if (!activeProviderId) {
          const latestProviderResult = await supabase
            .from("providers")
            .select("id")
            .order("created_at", { ascending: false })
            .limit(1);

          activeProviderId = latestProviderResult.data?.[0]?.id ?? null;
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

  async function openStoredFile(filePath: string | null) {
    if (!filePath) return;

    setError("");

    try {
      const supabase = getDocumentSupabase();

      const { data, error } = await supabase.storage
        .from("compliance-documents")
        .createSignedUrl(filePath, 60);

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error("Could not create a signed file link.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      const storageError = err as { message?: unknown };
      setError(storageError?.message ? String(storageError.message) : "Could not open file.");
    }
  }

  function startEditingDocument(document: DocumentRow) {
    setEditingDocumentId(document.id);
    setForm({
      document_name: document.document_name ?? "",
      category: document.category ?? "Provider",
      compliance_domain: document.compliance_domain ?? "Administrative Operations",
      applies_to: document.applies_to ?? "Provider-wide",
      version_label: document.version_label ?? "",
      effective_date: document.effective_date ?? "",
      status: document.status ?? "not_uploaded",
      is_signable: Boolean(document.is_signable),
      signature_required_from: document.signature_required_from ?? "not_required",
      signature_status: document.signature_status ?? "not_required",
      signature_instructions: document.signature_instructions ?? "",
      resident_send_scope: document.resident_send_scope ?? "all_residents",
      notes: document.notes ?? "",
    });

    void (async () => {
      try {
        const supabase = getDocumentSupabase();
        const targetResult = await supabase
          .from("document_house_targets")
          .select("house_id")
          .eq("document_id", document.id);

        if (!targetResult.error) {
          setSelectedTargetHouseIds(
            (targetResult.data ?? [])
              .map((target) => target.house_id)
              .filter(Boolean) as string[]
          );
        } else {
          setSelectedTargetHouseIds([]);
        }
      } catch {
        setSelectedTargetHouseIds([]);
      }
    })();

    setSelectedFile(null);
    setMessage("");
    setError("");
    setIsDocumentModalOpen(true);
  }

  async function archiveDocument(documentId: string, documentName: string) {
    const confirmed = window.confirm(`Archive ${documentName}? This keeps the record but marks it archived.`);

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const supabase = getDocumentSupabase();

      const { data, error } = await supabase
        .from("documents")
        .update({ status: "archived" })
        .eq("id", documentId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setDocuments((current) =>
        current.map((document) =>
          document.id === documentId ? (data as DocumentRow) : document,
        ),
      );

      setMessage(`${documentName} was archived successfully.`);
    } catch (err) {
      const documentError = err as { message?: unknown };
      setError(documentError?.message ? String(documentError.message) : "Could not archive document.");
    }
  }

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
      const supabase = getDocumentSupabase();

      let filePath: string | null = null;

      if (selectedFile) {
        const safeFileName = sanitizeFileName(selectedFile.name);
        filePath = `${providerId}/${Date.now()}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("compliance-documents")
          .upload(filePath, selectedFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }
      }

      const documentPayload = {
        provider_id: providerId,
        document_name: form.document_name.trim(),
        category: form.category,
        compliance_domain: form.compliance_domain,
        applies_to: form.applies_to,
        version_label: form.version_label.trim() || null,
        effective_date: form.effective_date || null,
        status: selectedFile ? "uploaded" : form.status,
        is_signable: form.is_signable,
        signature_required_from: form.is_signable ? form.signature_required_from : "not_required",
        signature_status: form.is_signable ? form.signature_status : "not_required",
        signature_instructions: form.is_signable ? form.signature_instructions.trim() || null : null,
        resident_send_scope:
          form.category === "Resident" && form.is_signable && form.signature_required_from === "resident"
            ? form.resident_send_scope
            : "all_residents",
        notes: form.notes.trim() || null,
      };

      if (editingDocumentId) {
        const updatePayload = selectedFile
          ? { ...documentPayload, file_url: filePath }
          : documentPayload;

        const { data, error } = await supabase
          .from("documents")
          .update(updatePayload)
          .eq("id", editingDocumentId)
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        await supabase
          .from("document_house_targets")
          .delete()
          .eq("document_id", editingDocumentId);

        if (
          documentPayload.resident_send_scope === "selected_houses" &&
          selectedTargetHouseIds.length > 0
        ) {
          const targetInsertResult = await supabase
            .from("document_house_targets")
            .insert(
              selectedTargetHouseIds.map((houseId) => ({
                provider_id: providerId,
                document_id: editingDocumentId,
                house_id: houseId,
              }))
            );

          if (targetInsertResult.error) {
            throw targetInsertResult.error;
          }
        }

        setDocuments((current) =>
          current.map((document) =>
            document.id === editingDocumentId ? (data as DocumentRow) : document,
          ),
        );

        setForm(initialForm);
        setSelectedFile(null);
        setEditingDocumentId(null);
        setIsDocumentModalOpen(false);
        setMessage(`${data.document_name} was updated successfully.`);
        return;
      }

      const { data, error } = await supabase
        .from("documents")
        .insert({
          ...documentPayload,
          file_url: filePath,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      if (
        documentPayload.resident_send_scope === "selected_houses" &&
        selectedTargetHouseIds.length > 0
      ) {
        const targetInsertResult = await supabase
          .from("document_house_targets")
          .insert(
            selectedTargetHouseIds.map((houseId) => ({
              provider_id: providerId,
              document_id: data.id,
              house_id: houseId,
            }))
          );

        if (targetInsertResult.error) {
          throw targetInsertResult.error;
        }
      }

      setDocuments((current) => [data as DocumentRow, ...current]);
      setForm(initialForm);
      setSelectedFile(null);
      setEditingDocumentId(null);
      setIsDocumentModalOpen(false);
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
  const archivedCount = documents.filter((doc) => doc.status === "archived").length;
  const signableCount = documents.filter((doc) => doc.is_signable).length;

  const areaCounts = useMemo(() => {
    return documentAreas.map((area) => {
      const areaDocuments = documents.filter((document) => getAreaForDocument(document) === area.category);
      return {
        ...area,
        count: areaDocuments.length,
        uploadedCount: areaDocuments.filter((document) => document.status === "uploaded").length,
      };
    });
  }, [documents]);

  const activeDocuments = documents.filter((doc) => doc.status !== "archived");
  const filteredActiveDocuments =
    selectedAreaCategory === "All"
      ? activeDocuments
      : activeDocuments.filter((document) => getAreaForDocument(document) === selectedAreaCategory);
  const selectedAreaLabel =
    selectedAreaCategory === "All"
      ? "All Documents"
      : documentAreas.find((area) => area.category === selectedAreaCategory)?.title ?? "Documents";
  const uploadAreaCategory = selectedAreaCategory === "All" ? "Provider" : selectedAreaCategory;
  const archivedDocuments = documents.filter((doc) => doc.status === "archived");

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
              <p className="text-sm font-medium text-slate-500">Compliance Documents</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Documents</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Upload and organize provider, house, resident packet, and general document records for{" "}
                <span className="font-medium text-slate-950">{providerName}</span>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openNewDocumentModal(uploadAreaCategory)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
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
        <MetricCard title="Documents" value={String(documents.length)} subtitle="Saved records" icon={FileText} />
        <MetricCard title="Uploaded" value={String(uploadedCount)} subtitle="Stored file attached" icon={CheckCircle2} />
        <MetricCard title="E-Signable" value={String(signableCount)} subtitle="Signature-enabled records" icon={FileSignature} />
        <MetricCard title="Archived" value={String(archivedCount)} subtitle="Retained inactive records" icon={Archive} />
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-950">Document Areas</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose an area to filter the saved document list. Use Upload Document when you want to add a new file.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setSelectedAreaCategory("All")}
              className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                selectedAreaCategory === "All" ? "border-slate-950 bg-slate-950 text-white" : "bg-white hover:bg-slate-50"
              }`}
            >
              All Documents
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {areaCounts.map((area) => (
            <DocumentAreaCard
              key={area.title}
              title={area.title}
              description={area.description}
              examples={area.examples}
              count={area.count}
              uploadedCount={area.uploadedCount}
              emptyCta={area.emptyCta}
              icon={area.icon}
              active={selectedAreaCategory === area.category}
              onClick={() => setSelectedAreaCategory(area.category)}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_390px]">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{selectedAreaLabel}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Active document records for the selected document area. {filteredActiveDocuments.length} shown / {activeDocuments.length} active total.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openNewDocumentModal(uploadAreaCategory)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Upload Document
            </button>
          </div>

          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Loading documents...</p>
          ) : filteredActiveDocuments.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-950">No documents found for this area.</p>
              <p className="mt-1 text-sm text-slate-500">Use the upload button to add a document record.</p>
              <button
                type="button"
                onClick={() => openNewDocumentModal(uploadAreaCategory)}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Upload className="h-4 w-4" />
                Upload Document
              </button>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Area</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredActiveDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-950">{doc.document_name}</div>
                        {doc.is_signable ? (
                          <div className="mt-1 text-xs text-slate-500">
                            E-signable template • {(doc.signature_required_from ?? "resident").replaceAll("_", " ")} signature
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{doc.category}</td>
                      <td className="px-4 py-4 text-slate-600">{doc.compliance_domain || "Not set"}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {doc.file_url ? (
                          <button
                            type="button"
                            onClick={() => openStoredFile(doc.file_url)}
                            className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
                          </button>
                        ) : (
                          <span>No file</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge value={doc.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => startEditingDocument(doc)}
                            className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => archiveDocument(doc.id, doc.document_name)}
                            className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">E-Signature Workflow</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              This page is now organized for e-signable provider documents, house documents, resident packet items, and general documents. The next build step can add signature templates, signing status, signed file storage, and resident-facing signature access.
            </p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Current phase: upload popup using the existing documents table and private storage bucket.
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Archived Documents</h2>
            {archivedDocuments.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No archived document records.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {archivedDocuments.map((doc) => (
                  <div key={doc.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                    <div className="font-medium text-slate-950">{doc.document_name}</div>
                    <div className="mt-1 text-slate-500">{doc.category} · {doc.compliance_domain || "Not set"}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditingDocument(doc)}
                        className="rounded-xl border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      {doc.file_url ? (
                        <button
                          type="button"
                          onClick={() => openStoredFile(doc.file_url)}
                          className="rounded-xl border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                        >
                          View File
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>

      {isDocumentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-6">
              <div>
                <p className="text-sm font-medium text-slate-500">Document Upload</p>
                <h2 className="text-xl font-semibold text-slate-950">
                  {editingDocumentId ? "Edit Document Record" : "Upload Document"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingDocumentId
                    ? "Update the selected document record. Attaching a new file will replace the stored file reference."
                    : "Create a document record and optionally attach a file to private Supabase Storage."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDocumentModal}
                className="rounded-xl border p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                aria-label="Close document upload modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-96px)] overflow-y-auto p-6">
              <form>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Document name"
                    placeholder="Example: Resident Handbook"
                    icon={FileText}
                    value={form.document_name}
                    onChange={(value) => updateField("document_name", value)}
                    required
                  />

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Document area</span>
                    <select
                      value={form.category}
                      onChange={(event) => {
                        const nextCategory = event.target.value;
                        setForm((current) => ({
                          ...current,
                          ...getAreaDefaults(nextCategory),
                        }));
                      }}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    >
                      <option value="Provider">Provider Documents</option>
                      <option value="House">House Documents</option>
                      <option value="Resident">Resident Packet</option>
                      <option value="Staff">Documents - Staff</option>
                      <option value="Other">Documents - Other</option>
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
                      <option>Staff Training</option>
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
                      <option>Resident packet</option>
                      <option>Staff file</option>
                      <option>General documents</option>
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

                  <div className="rounded-2xl border bg-slate-50 p-4 md:col-span-2">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={form.is_signable}
                        onChange={(event) => updateSignatureRequirement(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />
                      <span>
                        <span className="block text-sm font-medium text-slate-700">Requires electronic signature</span>
                        <span className="mt-1 block text-sm leading-5 text-slate-500">
                          Use this for resident packet documents, acknowledgments, agreements, and other documents that need a signed record.
                        </span>
                      </span>
                    </label>

                    {form.is_signable ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">Signature required from</span>
                          <select
                            value={form.signature_required_from}
                            onChange={(event) => updateField("signature_required_from", event.target.value)}
                            className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                          >
                            <option value="resident">Resident</option>
                            <option value="staff">Staff</option>
                            <option value="provider">Provider</option>
                            <option value="house_manager">House Manager</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">Signature status</span>
                          <select
                            value={form.signature_status}
                            onChange={(event) => updateField("signature_status", event.target.value)}
                            className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                          >
                            <option value="not_sent">Not Sent</option>
                            <option value="pending">Pending</option>
                            <option value="signed">Signed</option>
                            <option value="declined">Declined</option>
                          </select>
                        </label>

                        <label className="block md:col-span-2">
                          <span className="text-sm font-medium text-slate-700">Signature instructions</span>
                          <textarea
                            value={form.signature_instructions}
                            onChange={(event) => updateField("signature_instructions", event.target.value)}
                            placeholder="Example: Resident must review and electronically sign during intake."
                            className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                          />
                        </label>

                        {form.category === "Resident" && form.signature_required_from === "resident" ? (
                          <div className="rounded-2xl border bg-white p-4 md:col-span-2">
                            <h3 className="text-sm font-semibold text-slate-950">Resident Packet Sending</h3>
                            <p className="mt-1 text-sm leading-5 text-slate-500">
                              Choose whether this form is assigned to every resident or only residents in selected houses.
                            </p>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <label className="flex items-start gap-3 rounded-xl border bg-slate-50 p-3">
                                <input
                                  type="radio"
                                  name="resident_send_scope"
                                  value="all_residents"
                                  checked={form.resident_send_scope !== "selected_houses"}
                                  onChange={(event) => updateField("resident_send_scope", event.target.value)}
                                  className="mt-1 h-4 w-4"
                                />
                                <span>
                                  <span className="block text-sm font-medium text-slate-700">Send to all residents</span>
                                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                                    Use for universal intake documents and policies.
                                  </span>
                                </span>
                              </label>

                              <label className="flex items-start gap-3 rounded-xl border bg-slate-50 p-3">
                                <input
                                  type="radio"
                                  name="resident_send_scope"
                                  value="selected_houses"
                                  checked={form.resident_send_scope === "selected_houses"}
                                  onChange={(event) => updateField("resident_send_scope", event.target.value)}
                                  className="mt-1 h-4 w-4"
                                />
                                <span>
                                  <span className="block text-sm font-medium text-slate-700">Send only to selected houses</span>
                                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                                    Use for house-specific fee agreements, rules, or acknowledgments.
                                  </span>
                                </span>
                              </label>
                            </div>

                            {form.resident_send_scope === "selected_houses" ? (
                              <div className="mt-4 rounded-xl border bg-slate-50 p-4">
                                <p className="text-sm font-medium text-slate-700">Selected houses</p>

                                {houses.length === 0 ? (
                                  <p className="mt-2 text-sm text-slate-500">
                                    No active houses are available for this provider.
                                  </p>
                                ) : (
                                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                                    {houses.map((house) => (
                                      <label key={house.id} className="flex items-center gap-2 rounded-lg bg-white p-2 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={selectedTargetHouseIds.includes(house.id)}
                                          onChange={() => toggleTargetHouse(house.id)}
                                          className="h-4 w-4 rounded border-slate-300"
                                        />
                                        <span>{house.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Attach file</span>
                    <input
                      type="file"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                      className="mt-2 block w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                    {selectedFile ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Selected: {selectedFile.name}
                      </p>
                    ) : null}
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Notes</span>
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateField("notes", event.target.value)}
                      placeholder="Add review needs, FARR/NARR references, signature instructions, or document notes."
                      className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3 border-t pt-5">
                  <button
                    type="button"
                    onClick={closeDocumentModal}
                    className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={saveDocument}
                    disabled={saving || loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {saving ? "Saving..." : editingDocumentId ? "Save Changes" : "Save Document"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
