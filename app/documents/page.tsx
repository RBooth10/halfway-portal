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
  document_source: string;
  document_body: string;
  acknowledgment_statement: string;
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
  document_source: string | null;
  document_body: string | null;
  acknowledgment_statement: string | null;
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
  document_source: "upload",
  document_body: "",
  acknowledgment_statement: "",
  resident_send_scope: "all_residents",
  notes: "",
};

const documentAreas = [
  {
    title: "Provider Documents",
    category: "Provider",
    description: "",
    examples: ["", "", "", "MAT/MAR policy", "Grievance procedure"],
    emptyCta: "Add provider document",
    icon: Building2,
  },
  {
    title: "House Documents",
    category: "House",
    description: "",
    examples: ["", "", "", "Owner or lease letter", "House rules"],
    emptyCta: "Add house document",
    icon: Home,
  },
  {
    title: "Resident Packet",
    category: "Resident",
    description: "",
    examples: ["", "", "", "Emergency contacts", "Recovery plan"],
    emptyCta: "Add resident packet item",
    icon: Users,
  },
  {
    title: "Other / General",
    category: "Other",
    description: "",
    examples: ["", "", "", "Reference documents", "Other support files"],
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
      applies_to: "Provider-wide",
    },
    Resident: {
      category: "Resident",
      compliance_domain: "Recovery Support",
      applies_to: "Resident packet",
    },
    Other: {
      category: "Other",
      compliance_domain: "Administrative Operations",
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
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
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
      document_source: document.document_source ?? (document.file_url ? "upload" : "text"),
      document_body: document.document_body ?? "",
      acknowledgment_statement: document.acknowledgment_statement ?? "",
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
        signature_status: form.is_signable
          ? editingDocument?.signature_status ?? "not_sent"
          : "not_required",
        signature_instructions: null,
        document_source: form.document_source === "text" ? "text" : "upload",
        document_body: form.document_source === "text" ? form.document_body.trim() || null : null,
        acknowledgment_statement:
          form.document_source === "text" ? form.acknowledgment_statement.trim() || null : null,
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
  const editingDocument = editingDocumentId
    ? documents.find((document) => document.id === editingDocumentId) ?? null
    : null;

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

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Documents</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Documents: {documents.length}
              </span>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Uploaded: {uploadedCount}
              </span>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                E-Signable: {signableCount}
              </span>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Archived: {archivedDocuments.length}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingDocumentId(null);
              setForm({
                ...initialForm,
                ...getAreaDefaults(uploadAreaCategory),
              });
              setSelectedFile(null);
              setSelectedTargetHouseIds([]);
              setIsDocumentModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add Document
          </button>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setSelectedAreaCategory("All")}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              selectedAreaCategory === "All"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            All Documents
          </button>

          {documentAreas.map((area) => (
            <button
              key={area.category}
              type="button"
              onClick={() => setSelectedAreaCategory(area.category)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                selectedAreaCategory === area.category
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {area.title}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{selectedAreaLabel}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredActiveDocuments.length} active document record{filteredActiveDocuments.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Loading documents...</p>
        ) : filteredActiveDocuments.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-950">No documents in this view yet.</p>
            <p className="mt-1 text-sm text-slate-500">Use Add Document to create the first record.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredActiveDocuments.map((doc) => (
              <div key={doc.id} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{doc.document_name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {getAreaForDocument(doc)} • {doc.compliance_domain ?? "No domain"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {doc.document_source === "text" ? "Text document" : doc.status === "uploaded" ? "Uploaded file" : doc.status ?? "Not uploaded"}
                      {doc.is_signable ? " • E-signable" : ""}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
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
                        onClick={() => {
                          if (doc.file_url) void openStoredFile(doc.file_url);
                        }}
                        className="rounded-xl border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                      >
                        View File
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {archivedDocuments.length > 0 ? (
          <details className="mt-5 rounded-2xl border bg-slate-50 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-950">
              Archived Documents ({archivedDocuments.length})
            </summary>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {archivedDocuments.map((doc) => (
                <div key={doc.id} className="rounded-xl bg-white p-3 text-sm">
                  <p className="font-medium text-slate-950">{doc.document_name}</p>
                  <p className="mt-1 text-slate-500">
                    {getAreaForDocument(doc)} • {doc.compliance_domain ?? "No domain"}
                  </p>
                  <button
                    type="button"
                    onClick={() => startEditingDocument(doc)}
                    className="mt-3 rounded-xl border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </section>

      {isDocumentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-6">
              <div>
                <p className="text-sm font-medium text-slate-500">Document</p>
                <h2 className="text-xl font-semibold text-slate-950">
                  {editingDocumentId ? "Edit Document Record" : "Add Document"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingDocumentId
                    ? "Update the selected document record."
                    : "Create a document record by upload or text."}
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
                      <option value="Other">Other / General</option>
                    </select>
                  </label>

                  <div className="rounded-2xl border bg-slate-50 p-4 md:col-span-2">
                    <p className="text-sm font-semibold text-slate-950">Document Source</p>
<div className="mt-4 grid gap-3 md:grid-cols-2">
                      <label className="flex items-start gap-3 rounded-xl border bg-white p-3">
                        <input
                          type="radio"
                          name="document_source"
                          value="upload"
                          checked={form.document_source !== "text"}
                          onChange={(event) => {
                            updateField("document_source", event.target.value);
                            setSelectedFile(null);
                          }}
                          className="mt-1 h-4 w-4"
                        />
                        <span>
                          <span className="block text-sm font-medium text-slate-700">Upload file</span>
</span>
                      </label>

                      <label className="flex items-start gap-3 rounded-xl border bg-white p-3">
                        <input
                          type="radio"
                          name="document_source"
                          value="text"
                          checked={form.document_source === "text"}
                          onChange={(event) => {
                            updateField("document_source", event.target.value);
                            setSelectedFile(null);
                          }}
                          className="mt-1 h-4 w-4"
                        />
                        <span>
                          <span className="block text-sm font-medium text-slate-700">Create from text</span>
</span>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-slate-50 p-3 md:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Auto-classified as</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {form.compliance_domain} • {form.applies_to}
                    </p>
                  </div>

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

                        {form.category === "Resident" && form.signature_required_from === "resident" ? (
                          <div className="rounded-2xl border bg-white p-4 md:col-span-2">
                            <h3 className="text-sm font-semibold text-slate-950">Resident Packet Sending</h3>
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
</span>
                              </label>
                            </div>

                            {form.resident_send_scope === "selected_houses" ? (
                              <div className="mt-4 rounded-xl border bg-slate-50 p-4">
                                <p className="text-sm font-medium text-slate-700">Houses</p>

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

                  {form.document_source === "text" ? (
                    <div className="md:col-span-2 grid gap-4">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">Document body</span>
                        <textarea
                          value={form.document_body}
                          onChange={(event) => updateField("document_body", event.target.value)}
                          placeholder="Paste or write the document text here. This is the version residents/staff will review before signing."
                          className="mt-2 min-h-64 w-full rounded-xl border bg-white p-3 text-sm leading-6 outline-none ring-slate-900/10 focus:ring-4"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">Acknowledgment statement</span>
                        <textarea
                          value={form.acknowledgment_statement}
                          onChange={(event) => updateField("acknowledgment_statement", event.target.value)}
                          placeholder="Example: I acknowledge that I have read, understand, and agree to follow this document."
                          className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm leading-6 outline-none ring-slate-900/10 focus:ring-4"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="block md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">
                        {editingDocument?.file_url ? "Attached file" : "Attach file"}
                      </span>

                      {editingDocument?.file_url ? (
                        <div className="mt-2 rounded-2xl border bg-slate-50 p-3">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm font-medium text-slate-700">File attached</p>

                            <button
                              type="button"
                              onClick={() => {
                                if (editingDocument?.file_url) void openStoredFile(editingDocument.file_url);
                              }}
                              className="inline-flex items-center justify-center rounded-xl border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                            >
                              View file
                            </button>
                          </div>

                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs font-medium text-slate-600">
                              Replace file
                            </summary>

                            <input
                              type="file"
                              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                              className="mt-3 block w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                            />

                            {selectedFile ? (
                              <p className="mt-2 text-sm text-slate-500">
                                New file selected: {selectedFile.name}
                              </p>
                            ) : null}
                          </details>
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
                    </label>
                  )}

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
