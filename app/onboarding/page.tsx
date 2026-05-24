"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Home,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

const certificationOptions = [
  "Not certified",
  "Application in progress",
  "FARR Certified",
];

type ProviderForm = {
  legal_name: string;
  dba_name: string;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  website: string;
  certification_status: string;
  farr_level: string;
  mat_mar_statement: string;
  program_fee_model: string;
  cost_per_client: string;
  split_rent_total_amount: string;
  split_rent_client_count: string;
  program_fee_frequency: string;
  program_fee_charge_day_of_month: string;
  program_fee_charge_day_of_week: string;
  admission_fee_amount: string;
  admission_fee_refundable: boolean;
};

type ProviderPhaseRow = {
  id: string;
  provider_id: string;
  phase_name: string;
  phase_order: number;
  minimum_days: number | null;
  curfew_description: string | null;
  requirements_description: string | null;
  is_active: boolean;
  created_at: string;
};

function providerToForm(provider: Record<string, unknown>): ProviderForm {
  return {
    legal_name: String(provider.legal_name ?? ""),
    dba_name: String(provider.dba_name ?? ""),
    primary_contact_name: String(provider.primary_contact_name ?? ""),
    primary_contact_email: String(provider.primary_contact_email ?? ""),
    primary_contact_phone: String(provider.primary_contact_phone ?? ""),
    website: String(provider.website ?? ""),
    certification_status: String(provider.certification_status ?? "Not certified"),
    farr_level: String(provider.farr_level ?? ""),
    mat_mar_statement: String(provider.mat_mar_statement ?? ""),
    program_fee_model: String(provider.program_fee_model ?? "cost_per_client"),
    cost_per_client: provider.cost_per_client === null || provider.cost_per_client === undefined ? "" : String(provider.cost_per_client),
    split_rent_total_amount: provider.split_rent_total_amount === null || provider.split_rent_total_amount === undefined ? "" : String(provider.split_rent_total_amount),
    split_rent_client_count: provider.split_rent_client_count === null || provider.split_rent_client_count === undefined ? "" : String(provider.split_rent_client_count),
    program_fee_frequency: String(provider.program_fee_frequency ?? "monthly"),
    program_fee_charge_day_of_month:
      provider.program_fee_charge_day_of_month === null || provider.program_fee_charge_day_of_month === undefined
        ? ""
        : String(provider.program_fee_charge_day_of_month),
    program_fee_charge_day_of_week: String(provider.program_fee_charge_day_of_week ?? ""),
    admission_fee_amount: provider.admission_fee_amount === null || provider.admission_fee_amount === undefined ? "" : String(provider.admission_fee_amount),
    admission_fee_refundable: Boolean(provider.admission_fee_refundable),
  };
}

const initialForm: ProviderForm = {
  legal_name: "",
  dba_name: "",
  primary_contact_name: "",
  primary_contact_email: "",
  primary_contact_phone: "",
  website: "",
  certification_status: "Not certified yet",
  farr_level: "Not sure yet",
  mat_mar_statement: "",
};

export default function ProviderOnboardingPage() {
  const [form, setForm] = useState<ProviderForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [savedProviderId, setSavedProviderId] = useState<string | null>(null);
  const [phaseLevels, setPhaseLevels] = useState<ProviderPhaseRow[]>([]);
  const [phaseName, setPhaseName] = useState("");
  const [phaseOrder, setPhaseOrder] = useState("");
  const [minimumDays, setMinimumDays] = useState("");
  const [curfewDescription, setCurfewDescription] = useState("");
  const [requirementsDescription, setRequirementsDescription] = useState("");
  const [savingPhase, setSavingPhase] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const activeProviderId = localStorage.getItem("current_provider_id");

    if (activeProviderId) {
      void Promise.resolve().then(async () => {
        await loadProviderProfile(activeProviderId);
        await loadProviderPhases(activeProviderId);
      });
    }
  }, []);

  async function loadProviderProfile(providerId: string) {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .eq("id", providerId)
        .single();

      if (error) {
        throw error;
      }

      setForm(providerToForm(data as Record<string, unknown>));
      setSavedProviderId(providerId);
    } catch (err) {
      const providerError = err as { message?: unknown };
      setError(providerError?.message ? String(providerError.message) : "Could not load provider profile.");
    }
  }

  async function loadProviderPhases(providerId: string) {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("provider_phase_levels")
        .select("*")
        .eq("provider_id", providerId)
        .order("phase_order", { ascending: true });

      if (error) {
        throw error;
      }

      setPhaseLevels((data ?? []) as ProviderPhaseRow[]);
    } catch (err) {
      const phaseError = err as { message?: unknown };
      setError(phaseError?.message ? String(phaseError.message) : "Could not load provider phase levels.");
    }
  }

  function updateField(field: keyof ProviderForm, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveProvider() {
    setSaving(true);
    setMessage("");
    setError("");

    if (!form.legal_name.trim()) {
      setSaving(false);
      setError("Legal business name is required.");
      return;
    }

    try {
      const supabase = getSupabaseClient();

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setError("You must be signed in before saving a provider profile. Go to Sign In first.");
        setSaving(false);
        return;
      }

      const providerPayload = {
        legal_name: form.legal_name.trim(),
        dba_name: form.dba_name.trim() || null,
        primary_contact_name: form.primary_contact_name.trim() || null,
        primary_contact_email: form.primary_contact_email.trim() || null,
        primary_contact_phone: form.primary_contact_phone.trim() || null,
        website: form.website.trim() || null,
        certification_status: form.certification_status,
        farr_level: form.farr_level || null,
        mat_mar_statement: form.mat_mar_statement.trim() || null,
        program_fee_model: form.program_fee_model,
        cost_per_client: form.cost_per_client ? Number(form.cost_per_client) : null,
        split_rent_total_amount: form.split_rent_total_amount ? Number(form.split_rent_total_amount) : null,
        split_rent_client_count: form.split_rent_client_count ? Number(form.split_rent_client_count) : null,
        program_fee_frequency: form.program_fee_frequency,
        program_fee_charge_day_of_month: form.program_fee_charge_day_of_month ? Number(form.program_fee_charge_day_of_month) : null,
        program_fee_charge_day_of_week: form.program_fee_charge_day_of_week || null,
        admission_fee_amount: form.admission_fee_amount ? Number(form.admission_fee_amount) : null,
        admission_fee_refundable: form.admission_fee_refundable,
        status: "setup",
      };

      if (savedProviderId) {
        const { data, error } = await supabase
          .from("providers")
          .update(providerPayload)
          .eq("id", savedProviderId)
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        setForm(providerToForm(data as Record<string, unknown>));
        setMessage(`${data.legal_name} was updated successfully.`);
      } else {
        const { data, error } = await supabase
          .from("providers")
          .insert({
            ...providerPayload,
            created_by_auth_user_id: userData.user.id,
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        setSavedProviderId(data.id);
        localStorage.setItem("current_provider_id", data.id);
        setForm(providerToForm(data as Record<string, unknown>));
        await loadProviderPhases(data.id);
        setMessage(`${data.legal_name} was saved successfully.`);
      }
    } catch (err) {
      if (err && typeof err === "object" && "message" in err) {
        setError(String((err as { message: unknown }).message));
      } else {
        setError(JSON.stringify(err));
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveProviderPhase() {
    setSavingPhase(true);
    setError("");
    setMessage("");

    if (!savedProviderId) {
      setSavingPhase(false);
      setError("Save the provider profile before adding phase levels.");
      return;
    }

    if (!phaseName.trim()) {
      setSavingPhase(false);
      setError("Phase name is required.");
      return;
    }

    try {
      const supabase = getSupabaseClient();

      const payload = {
        provider_id: savedProviderId,
        phase_name: phaseName.trim(),
        phase_order: Number(phaseOrder || phaseLevels.length + 1),
        minimum_days: minimumDays ? Number(minimumDays) : null,
        curfew_description: curfewDescription.trim() || null,
        requirements_description: requirementsDescription.trim() || null,
        is_active: true,
      };

      if (editingPhaseId) {
        const { data, error } = await supabase
          .from("provider_phase_levels")
          .update(payload)
          .eq("id", editingPhaseId)
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        setPhaseLevels((current) =>
          current
            .map((phase) => (phase.id === editingPhaseId ? (data as ProviderPhaseRow) : phase))
            .sort((a, b) => a.phase_order - b.phase_order)
        );
        setMessage("Provider phase level updated.");
      } else {
        const { data, error } = await supabase
          .from("provider_phase_levels")
          .insert(payload)
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        setPhaseLevels((current) =>
          [...current, data as ProviderPhaseRow].sort((a, b) => a.phase_order - b.phase_order)
        );
        setMessage("Provider phase level saved.");
      }

      setEditingPhaseId(null);
      setPhaseName("");
      setPhaseOrder("");
      setMinimumDays("");
      setCurfewDescription("");
      setRequirementsDescription("");
    } catch (err) {
      const phaseError = err as { message?: unknown };
      setError(phaseError?.message ? String(phaseError.message) : "Could not save provider phase level.");
    } finally {
      setSavingPhase(false);
    }
  }

  function editProviderPhase(phase: ProviderPhaseRow) {
    setEditingPhaseId(phase.id);
    setPhaseName(phase.phase_name);
    setPhaseOrder(String(phase.phase_order));
    setMinimumDays(phase.minimum_days === null ? "" : String(phase.minimum_days));
    setCurfewDescription(phase.curfew_description ?? "");
    setRequirementsDescription(phase.requirements_description ?? "");
    setMessage("");
    setError("");
  }

  function cancelPhaseEdit() {
    setEditingPhaseId(null);
    setPhaseName("");
    setPhaseOrder("");
    setMinimumDays("");
    setCurfewDescription("");
    setRequirementsDescription("");
  }

  async function toggleProviderPhase(phase: ProviderPhaseRow) {
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("provider_phase_levels")
        .update({ is_active: !phase.is_active })
        .eq("id", phase.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setPhaseLevels((current) =>
        current
          .map((item) => (item.id === phase.id ? (data as ProviderPhaseRow) : item))
          .sort((a, b) => a.phase_order - b.phase_order)
      );
      setMessage("Provider phase level updated.");
    } catch (err) {
      const phaseError = err as { message?: unknown };
      setError(phaseError?.message ? String(phaseError.message) : "Could not update provider phase level.");
    }
  }

  return (
    <PageShell maxWidth="max-w-7xl">
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
            <Building2 className="h-10 w-10 text-slate-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Provider Onboarding</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Add a Recovery Residence Provider
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Use this setup page to create the organization profile before adding houses,
              staff, residents, documents, and compliance workflows.
            </p>
          </div>
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

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Organization Information</h2>
          <p className="mt-1 text-sm text-slate-500">
            This information creates the provider profile in Supabase.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field
              label="Legal business name"
              placeholder="Example Recovery Housing LLC"
              icon={Building2}
              value={form.legal_name}
              onChange={(value) => updateField("legal_name", value)}
              required
            />

            <Field
              label="DBA / program name"
              placeholder="Example Recovery Homes"
              icon={Home}
              value={form.dba_name}
              onChange={(value) => updateField("dba_name", value)}
            />

            <Field
              label="Primary contact name"
              placeholder="Full name"
              icon={UserPlus}
              value={form.primary_contact_name}
              onChange={(value) => updateField("primary_contact_name", value)}
            />

            <Field
              label="Primary contact email"
              placeholder="email@example.com"
              icon={Mail}
              value={form.primary_contact_email}
              onChange={(value) => updateField("primary_contact_email", value)}
              type="email"
            />

            <Field
              label="Phone number"
              placeholder="(555) 000-0000"
              icon={Phone}
              value={form.primary_contact_phone}
              onChange={(value) => updateField("primary_contact_phone", value)}
            />

            <Field
              label="Website"
              placeholder="www.example.com"
              icon={ShieldCheck}
              value={form.website}
              onChange={(value) => updateField("website", value)}
            />

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Certification status</span>
              <select
                value={form.certification_status}
                onChange={(event) => updateField("certification_status", event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              >
                {certificationOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">FARR/NARR level</span>
              <select
                value={form.farr_level}
                onChange={(event) => updateField("farr_level", event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              >
                <option value="">Select level</option>
                <option>Level 1</option>
                <option>Level 2</option>
                <option>Level 3</option>
                <option>Level 4</option>
                <option>Not applicable</option>
              </select>
            </label>
          </div>

          <div className="mt-8 rounded-2xl border bg-slate-50 p-5 md:col-span-2">
            <h2 className="text-lg font-semibold text-slate-950">Program Fees</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Set the provider-level fee structure. House-specific billing can be connected later.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Fee model</span>
                <select
                  value={form.program_fee_model}
                  onChange={(event) => updateField("program_fee_model", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="cost_per_client">Cost per client</option>
                  <option value="split_rent">Split rent among clients per house</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Cost per client</span>
                <input
                  type="number"
                  value={form.cost_per_client}
                  onChange={(event) => updateField("cost_per_client", event.target.value)}
                  placeholder="$"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Split rent total amount</span>
                <input
                  type="number"
                  value={form.split_rent_total_amount}
                  onChange={(event) => updateField("split_rent_total_amount", event.target.value)}
                  placeholder="$"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Split among number of clients</span>
                <input
                  type="number"
                  value={form.split_rent_client_count}
                  onChange={(event) => updateField("split_rent_client_count", event.target.value)}
                  placeholder="# of clients"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Paid</span>
                <select
                  value={form.program_fee_frequency}
                  onChange={(event) => updateField("program_fee_frequency", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="daily">By day</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Program fee charge day of month</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={form.program_fee_charge_day_of_month}
                  onChange={(event) => updateField("program_fee_charge_day_of_month", event.target.value)}
                  placeholder="1-31"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Selected day of week</span>
                <select
                  value={form.program_fee_charge_day_of_week}
                  onChange={(event) => updateField("program_fee_charge_day_of_week", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="">Select day</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">One-time admission fee</span>
                <input
                  type="number"
                  value={form.admission_fee_amount}
                  onChange={(event) => updateField("admission_fee_amount", event.target.value)}
                  placeholder="$"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl border bg-white p-4">
                <input
                  type="checkbox"
                  checked={form.admission_fee_refundable}
                  onChange={(event) => updateField("admission_fee_refundable", event.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-slate-700">
                  Admission fee is refundable
                </span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveProvider}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving..." : savedProviderId ? "Update Provider Profile" : "Save Provider Profile"}
            </button>

            {!savedProviderId ? (
              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setMessage("");
                  setError("");
                  setSavedProviderId(null);
                }}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Clear Form
              </button>
            ) : null}
          </div>
        </form>
      </section>

      {savedProviderId ? (
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Provider Phase Levels</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Define the number of phases this provider uses. Resident profiles will only allow staff to select from these provider-defined phases.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Phase name</span>
              <input
                type="text"
                value={phaseName}
                onChange={(event) => setPhaseName(event.target.value)}
                placeholder="Phase 1"
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Display order</span>
              <input
                type="number"
                value={phaseOrder}
                onChange={(event) => setPhaseOrder(event.target.value)}
                placeholder={String(phaseLevels.length + 1)}
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Minimum days</span>
              <input
                type="number"
                value={minimumDays}
                onChange={(event) => setMinimumDays(event.target.value)}
                placeholder="30"
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Curfew</span>
              <input
                type="text"
                value={curfewDescription}
                onChange={(event) => setCurfewDescription(event.target.value)}
                placeholder="10:00 PM curfew"
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Requirements</span>
              <textarea
                value={requirementsDescription}
                onChange={(event) => setRequirementsDescription(event.target.value)}
                placeholder="Sponsor, home group, meeting attendance, employment, payment status, recovery plan, etc."
                className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveProviderPhase}
              disabled={savingPhase}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingPhase ? "Saving..." : editingPhaseId ? "Save Phase Changes" : "Add Phase Level"}
            </button>

            {editingPhaseId ? (
              <button
                type="button"
                onClick={cancelPhaseEdit}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>

          <div className="mt-6 space-y-3">
            {phaseLevels.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No phase levels have been added yet.
              </p>
            ) : (
              phaseLevels.map((phase) => (
                <div key={phase.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {phase.phase_order}. {phase.phase_name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Minimum days: {phase.minimum_days ?? "Not set"} • Curfew: {phase.curfew_description || "Not set"}
                      </p>
                      {phase.requirements_description ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {phase.requirements_description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => editProviderPhase(phase)}
                        className="rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleProviderPhase(phase)}
                        className="rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {phase.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

    </PageShell>
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
