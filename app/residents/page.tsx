"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileSignature,
  HeartHandshake,
  Home,
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

type ResidentForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  admission_date: string;
  house_id: string;
  resident_status: string;
  file_status: string;
  medication_status: string;
  rci_status: string;
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
  house_id: string | null;
  resident_status: string;
  file_status: string;
  medication_status: string;
  rci_status: string;
  notes: string | null;
};

type HouseOption = {
  id: string;
  name: string;
  provider_id: string;
};

const initialForm: ResidentForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  admission_date: "",
  house_id: "",
  resident_status: "active",
  file_status: "needs_onboarding_packet",
  medication_status: "not_completed",
  rci_status: "not_started",
  notes: "",
};


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

export default function ResidentsPage() {
  const [form, setForm] = useState<ResidentForm>(initialForm);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [houses, setHouses] = useState<HouseOption[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerName, setProviderName] = useState("Current Provider");
  const [editingResidentId, setEditingResidentId] = useState<string | null>(null);
  const [residentListTab, setResidentListTab] = useState<"active" | "discharged">("active");
  const [residentSearch, setResidentSearch] = useState("");
  const [showResidentForm, setShowResidentForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField(field: keyof ResidentForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function loadData(activeProviderId: string) {
    const supabase = getSupabaseClient();

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
      .select("id, name, provider_id")
      .eq("provider_id", activeProviderId)
      .order("name", { ascending: true });

    if (housesResult.error) {
      throw housesResult.error;
    }

    setHouses((housesResult.data ?? []) as HouseOption[]);

    const residentsResult = await supabase
      .from("residents")
      .select("*")
      .eq("provider_id", activeProviderId)
      .order("created_at", { ascending: false });

    if (residentsResult.error) {
      throw residentsResult.error;
    }

    setResidents((residentsResult.data ?? []) as ResidentRow[]);
  }

  useEffect(() => {
    async function initialize() {
      try {
        const supabase = getSupabaseClient();

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

          activeProviderId = latestProviderResult.data?.[0]?.id as string | undefined;
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
      house_id: resident.house_id ?? "",
      resident_status: resident.resident_status ?? "pending_admission",
      file_status: resident.file_status ?? "needs_onboarding_packet",
      medication_status: resident.medication_status ?? "not_completed",
      rci_status: resident.rci_status ?? "not_started",
      notes: resident.notes ?? "",
    });

    setMessage(`Editing ${residentName}. Update the form and click Save Changes.`);
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function dischargeResident(residentId: string, residentName: string) {
    const confirmed = window.confirm(
      `Discharge ${residentName}? This keeps all resident data but moves the resident to the discharged tab and stops future auto-charges.`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const supabase = getSupabaseClient();
      const today = new Date().toISOString().slice(0, 10);
      const previousResident = residents.find((resident) => resident.id === residentId) ?? null;

      const { data, error } = await supabase.rpc("discharge_resident", {
        p_resident_id: residentId,
        p_discharge_date: today,
        p_discharge_reason: "Discharged from residents list.",
        p_discharge_notes: "",
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        setError(data?.message ?? "Could not discharge resident.");
        return;
      }

      setResidents((current) =>
        current.map((resident) =>
          resident.id === residentId ? { ...resident, resident_status: "discharged" } : resident
        )
      );

      if (providerId) {
        await createAuditLog({
          providerId,
          action: "resident_discharged",
          tableName: "residents",
          recordId: residentId,
          oldValues: previousResident as unknown as Record<string, unknown> | null,
          newValues: { resident_status: "discharged", discharge_date: today },
          reason: "Resident discharged from portal.",
        });
      }

      setResidentListTab("discharged");
      setMessage(`${residentName} was discharged.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not discharge resident.";
      setError(message);
    }
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
      admission_date: form.admission_date || null,
      resident_status: form.resident_status,
      file_status: form.file_status,
      medication_status: form.medication_status,
      rci_status: form.rci_status,
      notes: form.notes.trim() || null,
    };

    try {
      const supabase = getSupabaseClient();

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
          admission_date: form.admission_date || new Date().toISOString().slice(0, 10),
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

      setResidents((current) => [data as ResidentRow, ...current]);
      setShowResidentForm(false);
      setForm(initialForm);
      setMessage(`${data.first_name} ${data.last_name} was saved successfully.`);
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
                Add residents for <span className="font-medium text-slate-950">{providerName}</span>,
                assign them to a house, and start their file, RCI, medication, and recovery-support workflows.
              </p>
            </div>
          </div>

          {residents.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setEditingResidentId(null);
                setForm(initialForm);
                setShowResidentForm((current) => !current);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              {showResidentForm && !editingResidentId ? "Hide Add Resident" : "Add Resident"}
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Active Residents" value={String(activeResidents)} subtitle={`${dischargedResidents} discharged`} icon={Users} />
        <MetricCard title="Assigned Houses" value={`${residentsWithHouse}/${residents.length}`} subtitle="Residents assigned to houses" icon={Home} />
        <MetricCard title="File Checklist" value="Required" subtitle="Documents and signatures" icon={FileSignature} />
        <MetricCard title="Recovery Support" value="Pending" subtitle="RCI, plan, and supports" icon={HeartHandshake} />
      </section>

      <section className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Saved Residents</h2>
              <p className="mt-1 text-sm text-slate-500">
                Active and discharged residents remain searchable, with all resident data maintained.
              </p>
            </div>

            {residents.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setEditingResidentId(null);
                  setForm(initialForm);
                  setShowResidentForm((current) => !current);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                {showResidentForm && !editingResidentId ? "Hide Add Resident" : "Add Resident"}
              </button>
            ) : null}
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
                Add the first resident to begin tracking files, RCI, medication, phases, notes, and support needs.
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
                        <p className="mt-1 text-sm text-slate-500">
                          Medication: {resident.medication_status}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          RCI: {resident.rci_status}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Admission: {resident.admission_date || "Not set"}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/residents/${resident.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          View Profile
                        </Link>

                        <button
                          type="button"
                          onClick={() => startEditingResident(resident)}
                          className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => dischargeResident(resident.id, residentName)}
                          disabled={resident.resident_status === "discharged"}
                          className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          {resident.resident_status === "discharged" ? "Discharged" : "Discharge"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {residents.length === 0 || showResidentForm || editingResidentId ? (
          <form className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">{editingResidentId ? "Edit Resident" : "Add Resident"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {editingResidentId
                ? "Update the selected resident profile."
                : residents.length === 0
                  ? "Add the first resident for this provider."
                  : "Add another resident under this provider."}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="First name" placeholder="First name" icon={Users} value={form.first_name} onChange={(value) => updateField("first_name", value)} required />
              <Field label="Last name" placeholder="Last name" icon={Users} value={form.last_name} onChange={(value) => updateField("last_name", value)} required />
              <Field label="Email" placeholder="resident@example.com" icon={Mail} type="email" value={form.email} onChange={(value) => updateField("email", value)} />
              <Field label="Phone" placeholder="(555) 000-0000" icon={Phone} value={form.phone} onChange={(value) => updateField("phone", value)} />
              <Field label="Date of birth" placeholder="MM/DD/YYYY" icon={CalendarDays} type="date" value={form.date_of_birth} onChange={(value) => updateField("date_of_birth", value)} />
              <Field label="Admission date" placeholder="MM/DD/YYYY" icon={CalendarDays} type="date" value={form.admission_date} onChange={(value) => updateField("admission_date", value)} />

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

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Resident status</span>
                <select
                  value={form.resident_status}
                  onChange={(event) => updateField("resident_status", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="active">Active</option>
                  <option value="discharged">Discharged</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Medication / MAT-MAR disclosure</span>
                <select
                  value={form.medication_status}
                  onChange={(event) => updateField("medication_status", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="not_completed">Not completed yet</option>
                  <option value="no_medications_disclosed">No medications disclosed</option>
                  <option value="medication_disclosed">Medication disclosed</option>
                  <option value="mat_mar_disclosed">MAT/MAR disclosed</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Initial file status</span>
                <select
                  value={form.file_status}
                  onChange={(event) => updateField("file_status", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="needs_onboarding_packet">Needs onboarding packet</option>
                  <option value="packet_sent">Packet sent</option>
                  <option value="partially_complete">Partially complete</option>
                  <option value="complete">Complete</option>
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
                  if (residents.length > 0) {
                    setShowResidentForm(false);
                  }
                }}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                {residents.length > 0 ? "Cancel" : "Clear Form"}
              </button>

              <Link
                href="/documents"
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Continue to Documents
              </Link>
            </div>
          </form>
        ) : null}
      </section>
    </PageShell>
  );
}
