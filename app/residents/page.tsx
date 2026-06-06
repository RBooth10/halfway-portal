"use client";

import type React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  Download,
  HeartHandshake,
  Loader2,
  Mail,
  Phone,
  Pencil,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";
import { createAuditLog } from "@/lib/audit";

function getResidentsSupabase() {
  return getSupabaseClient() as unknown as SupabaseClient;
}

type ResidentForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  admission_date: string;
  sobriety_date: string;
  gender: string;
  ethnicity: string;
  drug_of_choice: string;
  referral_resource: string;
  prior_address: string;
  house_id: string;
  resident_status: string;
  file_status: string;
  medication_status: string;
  rci_status: string;
  sponsor_info_updated_at?: string | null;
  latest_rci_completed_at?: string | null;
  high_alert: boolean;
  high_alert_detail: string;
  active_probation_officer: boolean;
  active_mental_health_court: boolean;
  active_drug_court: boolean;
  notes: string;
};

type ResidentRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  admission_date: string | null;
  sobriety_date: string | null;
  gender: string | null;
  ethnicity: string | null;
  drug_of_choice: string | null;
  referral_resource: string | null;
  prior_address: string | null;
  house_id: string | null;
  resident_status: string;
  file_status: string;
  medication_status: string;
  rci_status: string;
  sponsor_info_updated_at: string | null;
  latest_rci_completed_at?: string | null;
  high_alert: boolean;
  high_alert_detail: string | null;
  active_probation_officer: boolean;
  active_mental_health_court: boolean;
  active_drug_court: boolean;
  has_active_mat_mar?: boolean;
  notes: string | null;
};

type HouseOption = {
  id: string;
  name: string;
  provider_id: string;
  status: string | null;
};

const initialForm: ResidentForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  admission_date: "",
  sobriety_date: "",
  gender: "",
  ethnicity: "",
  drug_of_choice: "",
  referral_resource: "",
  prior_address: "",
  house_id: "",
  resident_status: "active",
  file_status: "needs_onboarding_packet",
  medication_status: "not_completed",
  rci_status: "not_started",
  high_alert: false,
  high_alert_detail: "",
  active_probation_officer: false,
  active_mental_health_court: false,
  active_drug_court: false,
  notes: "",
};


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

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return "Not set";

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const localDate = new Date(Number(year), Number(month) - 1, Number(day));

    return localDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDaysAgo(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.max(0, Math.round((todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24)));

  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function normalizeAdmissionDateForSave(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const date = new Date(`${trimmed}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Enter a valid admission date.");
  }

  const year = date.getFullYear();
  const nextYear = new Date().getFullYear() + 1;

  if (year < 1900 || year > nextYear) {
    throw new Error("Admission date year must be entered with four digits.");
  }

  return trimmed;
}

export default function ResidentsPage() {
  const [form, setForm] = useState<ResidentForm>(initialForm);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [houses, setHouses] = useState<HouseOption[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [, setProviderName] = useState("Current Provider");
  const [editingResidentId, setEditingResidentId] = useState<string | null>(null);
  const [residentListTab, setResidentListTab] = useState<"active" | "discharged">("active");
  const [residentSearch, setResidentSearch] = useState("");
  const [showResidentForm, setShowResidentForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField<K extends keyof ResidentForm>(field: K, value: ResidentForm[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function exportResidentsCsv() {
    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Date of Birth",
      "Admission Date",
      "Sobriety Date",
      "Gender",
      "Ethnicity",
      "Drug of Choice",
      "Referral Resource",
      "Prior Address",
      "Resident Status",
    ];

    const rows = residents.map((resident) => {
      const record = resident as unknown as Record<string, string | null | undefined>;

      return [
        record.first_name,
        record.last_name,
        record.email,
        record.phone,
        record.date_of_birth,
        record.admission_date,
        record.sobriety_date,
        record.gender,
        record.ethnicity,
        record.drug_of_choice,
        record.referral_resource,
        record.prior_address,
        record.resident_status,
      ].map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`);
    });

    const csv = [headers.map((header) => `"${header}"`), ...rows]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `residents-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  async function loadData(activeProviderId: string) {
    const supabase = getSupabaseClient() as any;

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
      .select("id, name, provider_id, status")
      .eq("provider_id", activeProviderId)
      .order("name", { ascending: true });

    if (housesResult.error) {
      throw housesResult.error;
    }

    setHouses(
      ((housesResult.data ?? []) as HouseOption[]).filter(
        (house) => String(house.status ?? "active").toLowerCase() !== "inactive"
      )
    );

    const residentsResult = await supabase
      .from("residents")
      .select("*")
      .eq("provider_id", activeProviderId)
      .order("created_at", { ascending: false });

    if (residentsResult.error) {
      throw residentsResult.error;
    }

    const residentRows = (residentsResult.data ?? []) as ResidentRow[];
    const activeMatMarResidentIds = new Set<string>();
    const latestRciByResidentId = new Map<string, string>();

    if (residentRows.length > 0) {
      const residentIds = residentRows.map((resident) => resident.id);

      const medicationResult = await supabase
        .from("medication_records")
        .select("resident_id")
        .eq("provider_id", activeProviderId)
        .eq("status", "active")
        .eq("mat_mar_related", true);

      if (medicationResult.error) {
        throw medicationResult.error;
      }

      ((medicationResult.data ?? []) as { resident_id: string | null }[]).forEach((record) => {
        if (record.resident_id) {
          activeMatMarResidentIds.add(record.resident_id);
        }
      });

      const rciResult = await supabase
        .from("rci_assessments")
        .select("resident_id, assessment_date, client_completed_at")
        .eq("provider_id", activeProviderId)
        .in("resident_id", residentIds);

      if (rciResult.error) {
        throw rciResult.error;
      }

      type RciAssessmentSummary = {
        resident_id: string | null;
        assessment_date: string | null;
        client_completed_at: string | null;
      };

      ((rciResult.data ?? []) as RciAssessmentSummary[])
        .sort((first, second) =>
          String(second.client_completed_at || second.assessment_date || "").localeCompare(
            String(first.client_completed_at || first.assessment_date || "")
          )
        )
        .forEach((assessment) => {
          const completedAt = assessment.client_completed_at || assessment.assessment_date;

          if (assessment.resident_id && completedAt && !latestRciByResidentId.has(assessment.resident_id)) {
            latestRciByResidentId.set(assessment.resident_id, completedAt);
          }
        });
    }

    setResidents(
      residentRows.map((resident) => ({
        ...resident,
        has_active_mat_mar: activeMatMarResidentIds.has(resident.id),
        latest_rci_completed_at: latestRciByResidentId.get(resident.id) ?? null,
      }))
    );
  }

  useEffect(() => {
    async function initialize() {
      try {
        const supabase = getSupabaseClient() as any;

        const latestHouseResult = await supabase
          .from("houses")
          .select("provider_id")
          .order("created_at", { ascending: false })
          .limit(1);

        const latestHouseProviderId = latestHouseResult.data?.[0]?.provider_id as string | undefined;

        let activeProviderId = latestHouseProviderId || localStorage.getItem("current_provider_id");

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
        await loadData(activeProviderId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load residents.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  function startEditingResident(resident: ResidentRow) {
    const residentName = `${resident.first_name} ${resident.last_name}`;

    setEditingResidentId(resident.id);
    setShowResidentForm(true);
    setForm({
      first_name: resident.first_name ?? "",
      last_name: resident.last_name ?? "",
      email: resident.email ?? "",
      phone: resident.phone ?? "",
      date_of_birth: resident.date_of_birth ?? "",
      admission_date: resident.admission_date ?? "",
      sobriety_date: resident.sobriety_date ?? "",
      gender: resident.gender ?? "",
      ethnicity: resident.ethnicity ?? "",
      drug_of_choice: resident.drug_of_choice ?? "",
      referral_resource: resident.referral_resource ?? "",
      prior_address: resident.prior_address ?? "",
      house_id: resident.house_id ?? "",
      resident_status: resident.resident_status ?? "active",
      file_status: resident.file_status ?? "needs_onboarding_packet",
      medication_status: resident.medication_status ?? "not_completed",
      rci_status: resident.rci_status ?? "not_started",
      high_alert: Boolean(resident.high_alert),
      high_alert_detail: resident.high_alert_detail ?? "",
      active_probation_officer: Boolean(resident.active_probation_officer),
      active_mental_health_court: Boolean(resident.active_mental_health_court),
      active_drug_court: Boolean(resident.active_drug_court),
      notes: resident.notes ?? "",
    });

    setMessage(`Editing ${residentName}. Update the form and click Save Changes.`);
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function assignIntakeDocumentsToResident(activeProviderId: string, activeResidentId: string, activeHouseId: string | null) {
    const supabase = getResidentsSupabase();

    const templatesResult = await supabase
      .from("documents")
      .select(`
        id,
        signature_required_from,
        signature_instructions,
        resident_send_scope,
        document_house_targets (
          house_id
        )
      `)
      .eq("provider_id", activeProviderId)
      .eq("category", "Resident")
      .eq("is_signable", true)
      .eq("signature_required_from", "resident")
      .neq("status", "archived");

    if (templatesResult.error) {
      throw templatesResult.error;
    }

    const templates = (templatesResult.data ?? []).filter((template) => {
      const record = template as {
        resident_send_scope?: string | null;
        document_house_targets?: { house_id: string | null }[] | null;
      };

      if (record.resident_send_scope !== "selected_houses") {
        return true;
      }

      if (!activeHouseId) {
        return false;
      }

      return (record.document_house_targets ?? []).some((target) => target.house_id === activeHouseId);
    });

    if (templates.length === 0) {
      return 0;
    }

    const existingAssignmentsResult = await supabase
      .from("resident_document_assignments")
      .select("document_id")
      .eq("resident_id", activeResidentId);

    if (existingAssignmentsResult.error) {
      throw existingAssignmentsResult.error;
    }

    const existingDocumentIds = new Set(
      (existingAssignmentsResult.data ?? []).map((assignment) => assignment.document_id)
    );

    const newAssignments = templates
      .filter((template) => !existingDocumentIds.has(template.id))
      .map((template) => ({
        provider_id: activeProviderId,
        resident_id: activeResidentId,
        document_id: template.id,
        assignment_status: "assigned",
        signature_status: "awaiting_signature",
        signature_required_from: template.signature_required_from ?? "resident",
        signature_instructions: template.signature_instructions ?? null,
      }));

    if (newAssignments.length === 0) {
      return 0;
    }

    const insertResult = await supabase
      .from("resident_document_assignments")
      .insert(newAssignments);

    if (insertResult.error) {
      throw insertResult.error;
    }

    return newAssignments.length;
  }

  async function saveResident() {
    setSaving(true);
    setMessage("");
    setError("");

    if (!providerId) {
      setSaving(false);
      setError("No provider selected. Save a provider profile first.");
      return;
    }

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setSaving(false);
      setError("First name and last name are required.");
      return;
    }

    const residentPayload = {
      provider_id: providerId,
      house_id: form.house_id || null,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      date_of_birth: form.date_of_birth || null,
      admission_date: normalizeAdmissionDateForSave(form.admission_date),
      sobriety_date: form.sobriety_date || null,
      gender: form.gender.trim() || null,
      ethnicity: form.ethnicity.trim() || null,
      drug_of_choice: form.drug_of_choice.trim() || null,
      referral_resource: form.referral_resource.trim() || null,
      prior_address: form.prior_address.trim() || null,
      resident_status: form.resident_status || "active",
      file_status: form.file_status || "needs_onboarding_packet",
      medication_status: form.medication_status || "not_completed",
      rci_status: form.rci_status || "not_started",
      high_alert: form.high_alert_detail.trim().length > 0,
      high_alert_detail: form.high_alert_detail.trim() || null,
      active_probation_officer: form.active_probation_officer,
      active_mental_health_court: form.active_mental_health_court,
      active_drug_court: form.active_drug_court,
      notes: form.notes.trim() || null,
    };

    try {
      const supabase = getSupabaseClient() as any;

      if (editingResidentId) {
        const { data, error } = await supabase
          .from("residents")
          .update(residentPayload)
          .eq("id", editingResidentId)
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        const previousResident = residents.find((resident) => resident.id === editingResidentId) ?? null;

        setResidents((current) =>
          current.map((resident) =>
            resident.id === editingResidentId ? (data as ResidentRow) : resident
          )
        );

        await createAuditLog({
          providerId,
          action: "resident_updated",
          tableName: "residents",
          recordId: editingResidentId,
          oldValues: previousResident as unknown as Record<string, unknown> | null,
          newValues: data as Record<string, unknown>,
          reason: "Resident profile updated from portal.",
        });

        setForm(initialForm);
        setEditingResidentId(null);
        setMessage(`${data.first_name} ${data.last_name} was updated successfully.`);
        return;
      }

      const { data, error } = await supabase
        .from("residents")
        .insert(residentPayload)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const episodeResult = await supabase
        .from("resident_admission_episodes")
        .insert({
          provider_id: providerId,
          resident_id: data.id,
          house_id: form.house_id || null,
          admission_date: normalizeAdmissionDateForSave(form.admission_date) || new Date().toISOString().slice(0, 10),
          status: "active",
          charge_admission_fee: true,
          notes: "Initial admission episode created from resident onboarding.",
        })
        .select("id")
        .single();

      if (episodeResult.error) {
        throw episodeResult.error;
      }

      await supabase.rpc("ensure_current_resident_fees", {
        p_resident_id: data.id,
      });

      const assignedIntakeCount = await assignIntakeDocumentsToResident(providerId, data.id, data.house_id ?? null);

      setResidents((current) => [data as ResidentRow, ...current]);
      setShowResidentForm(false);
      setForm(initialForm);
      setMessage(
        assignedIntakeCount > 0
          ? `${data.first_name} ${data.last_name} was saved successfully. ${assignedIntakeCount} intake document(s) were assigned.`
          : `${data.first_name} ${data.last_name} was saved successfully.`
      );
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

  const activeResidents = residents.filter((resident) => resident.resident_status === "active").length;
  const dischargedResidents = residents.filter((resident) => resident.resident_status === "discharged").length;
  const residentsWithHouse = residents.filter((resident) => resident.house_id).length;
  const normalizedResidentSearch = residentSearch.trim().toLowerCase();

  const displayedResidents = residents.filter((resident) => {
    const residentName = `${resident.first_name} ${resident.last_name}`.toLowerCase();
    const matchesTab = resident.resident_status === residentListTab;
    const matchesSearch =
      !normalizedResidentSearch ||
      residentName.includes(normalizedResidentSearch) ||
      (resident.email ?? "").toLowerCase().includes(normalizedResidentSearch) ||
      (resident.phone ?? "").toLowerCase().includes(normalizedResidentSearch);

    return matchesTab && matchesSearch;
  });

  return (
    <PageShell>
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
              <UserPlus className="h-7 w-7 text-slate-700" />
            </div>
            <div><h1 className="mt-1 text-2xl font-semibold tracking-tight">Residents</h1>
</div>
          </div>

          {residents.length > 0 ? (
            <button
              type="button"
              onClick={exportResidentsCsv}
              disabled={residents.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              Export Residents
            </button>
          ) : null}
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">      </section>

      <section className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Residents</h2>
              <p className="mt-1 text-sm text-slate-500">
                Active and discharged residents remain searchable, with all resident data maintained.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingResidentId(null);
                setForm(initialForm);
                setMessage("");
                setError("");
                setShowResidentForm(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add Resident
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setResidentListTab("active")}
                className={
                  residentListTab === "active"
                    ? "rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                    : "rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                }
              >
                Active Residents ({activeResidents})
              </button>

              <button
                type="button"
                onClick={() => setResidentListTab("discharged")}
                className={
                  residentListTab === "discharged"
                    ? "rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                    : "rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                }
              >
                Discharged Residents ({dischargedResidents})
              </button>
            </div>

            <input
              type="search"
              value={residentSearch}
              onChange={(event) => setResidentSearch(event.target.value)}
              placeholder="Search residents..."
              className="h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4 md:max-w-xs"
            />
          </div>

          {loading ? (
            <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Loading residents...</p>
          ) : residents.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-950">No residents saved yet.</p>
              <p className="mt-1 text-sm text-slate-500">
                Add the first resident to begin managing this provider&apos;s resident list.
              </p>
            </div>
          ) : displayedResidents.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-950">
                No {residentListTab} residents found.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try a different search term or switch tabs.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {displayedResidents.map((resident) => {
                const residentName = `${resident.first_name} ${resident.last_name}`;
                const assignedHouse = houses.find((house) => house.id === resident.house_id);

                return (
                  <div key={resident.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{residentName}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          House: {assignedHouse?.name || "Not assigned"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Status: {resident.resident_status}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {resident.high_alert ? (
                            <span
                              className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                              title={resident.high_alert_detail ?? undefined}
                            >
                              High Alert
                            </span>
                          ) : null}

                          {resident.has_active_mat_mar ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              MAT/MAR
                            </span>
                          ) : null}

                          {resident.active_probation_officer ? (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              Active PO
                            </span>
                          ) : null}

                          {resident.active_mental_health_court ? (
                            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                              Mental Health Court
                            </span>
                          ) : null}

                          {resident.active_drug_court ? (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              Drug Court
                            </span>
                          ) : null}
                        </div>

                        {resident.high_alert && resident.high_alert_detail ? (
                          <p className="mt-2 rounded-xl border border-rose-100 bg-white px-3 py-2 text-xs font-medium text-rose-700">
                            {resident.high_alert_detail}
                          </p>
                        ) : null}

                        <p className="mt-1 text-sm text-slate-500">
                          RCI: {formatDaysAgo(resident.latest_rci_completed_at, "Not completed")}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Sponsor: {resident.sponsor_info_updated_at ? `updated ${formatDaysAgo(resident.sponsor_info_updated_at, "Needs update")}` : "Needs update"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Admission: {formatDisplayDate(resident.admission_date)}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/residents/${resident.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          View Profile
                        </Link>

                        {resident.resident_status === "discharged" ? (
                          <Link
                            href={`/residents/${resident.id}?tab=lifecycle`}
                            className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Readmit
                          </Link>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => startEditingResident(resident)}
                          className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>

                        {resident.resident_status === "active" ? (
                          <Link
                            href={`/residents/${resident.id}?tab=lifecycle`}
                            className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Discharge
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showResidentForm || editingResidentId ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-4">
            <form className="my-8 w-full max-w-5xl rounded-3xl border bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Resident Record</p>
                  <h2 className="text-xl font-semibold text-slate-950">{editingResidentId ? "Edit Resident" : "Add Resident"}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {editingResidentId ? "Update the selected resident profile." : "Add a resident under this provider."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setForm(initialForm);
                    setEditingResidentId(null);
                    setMessage("");
                    setError("");
                    setShowResidentForm(false);
                  }}
                  className="rounded-xl border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="First name" placeholder="First name" icon={Users} value={form.first_name} onChange={(value) => updateField("first_name", value)} required />
              <Field label="Last name" placeholder="Last name" icon={Users} value={form.last_name} onChange={(value) => updateField("last_name", value)} required />
              <Field label="Email" placeholder="resident@example.com" icon={Mail} type="email" value={form.email} onChange={(value) => updateField("email", value)} />
              <Field label="Phone" placeholder="(555) 000-0000" icon={Phone} value={form.phone} onChange={(value) => updateField("phone", value)} />
              <Field label="Date of birth" placeholder="MM/DD/YYYY" icon={CalendarDays} type="date" value={form.date_of_birth} onChange={(value) => updateField("date_of_birth", value)} />
              <Field label="Admission date" placeholder="YYYY-MM-DD" icon={CalendarDays} type="date" value={form.admission_date} onChange={(value) => updateField("admission_date", value)} />
              <Field label="Sobriety date" placeholder="MM/DD/YYYY" icon={CalendarDays} type="date" value={form.sobriety_date} onChange={(value) => updateField("sobriety_date", value)} />

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Gender</span>
                <select
                  value={form.gender}
                  onChange={(event) => updateField("gender", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="">Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="transgender">Transgender</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_answer">Prefer not to answer</option>
                </select>
              </label>

              <Field label="Ethnicity" placeholder="Ethnicity" icon={Users} value={form.ethnicity} onChange={(value) => updateField("ethnicity", value)} />
              <Field label="Drug of choice" placeholder="Primary substance or substances" icon={HeartHandshake} value={form.drug_of_choice} onChange={(value) => updateField("drug_of_choice", value)} />
              <Field label="Referral resource" placeholder="Referral source, agency, person, or program" icon={UserPlus} value={form.referral_resource} onChange={(value) => updateField("referral_resource", value)} />

              <label className="block md:col-span-2 xl:col-span-3">
                <span className="text-sm font-medium text-slate-700">Prior address</span>
                <textarea
                  value={form.prior_address}
                  onChange={(event) => updateField("prior_address", event.target.value)}
                  placeholder="Prior living address or last known address."
                  className="mt-2 min-h-20 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <div className="rounded-2xl border bg-slate-50 p-4 md:col-span-2 xl:col-span-3">
                <h3 className="text-sm font-semibold text-slate-950">Resident Alerts</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Use these indicators for resident-specific compliance, supervision, or safety needs.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.high_alert}
                      onChange={(event) => updateField("high_alert", event.target.checked)}
                    />
                    High Alert
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.active_probation_officer}
                      onChange={(event) => updateField("active_probation_officer", event.target.checked)}
                    />
                    Active PO
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.active_mental_health_court}
                      onChange={(event) => updateField("active_mental_health_court", event.target.checked)}
                    />
                    Active Mental Health Court
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.active_drug_court}
                      onChange={(event) => updateField("active_drug_court", event.target.checked)}
                    />
                    Active Drug Court
                  </label>
                </div>

                {form.high_alert ? (
                  <label className="mt-4 block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      High Alert Detail
                    </span>
                    <textarea
                      value={form.high_alert_detail}
                      onChange={(event) => updateField("high_alert_detail", event.target.value)}
                      className="mt-2 min-h-24 w-full rounded-2xl border bg-white px-3 py-2 text-sm outline-none ring-slate-900/10 focus:ring-4"
                      placeholder="Add the alert reason, precautions, or staff instructions."
                    />
                  </label>
                ) : null}
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Assigned house</span>
                <select
                  value={form.house_id}
                  onChange={(event) => updateField("house_id", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="">No house assigned yet</option>
                  {houses.map((house) => (
                    <option key={house.id} value={house.id}>
                      {house.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2 xl:col-span-3">
                <span className="text-sm font-medium text-slate-700">Admission notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="Brief notes about admission, referral source, or immediate needs."
                  className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveResident}
                disabled={saving || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {saving ? "Saving..." : editingResidentId ? "Save Changes" : "Save Resident"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setEditingResidentId(null);
                  setMessage("");
                  setError("");
                  setShowResidentForm(false);
                }}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>

              <Link
                href="/documents"
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Continue to Documents
              </Link>
            </div>
            </form>
          </div>
        ) : null}
      </section>
    </PageShell>
  );
}
