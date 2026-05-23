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
  "Not certified yet",
  "Preparing for FARR certification",
  "FARR certified",
  "NARR affiliate certified",
  "Other",
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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const activeProviderId = localStorage.getItem("current_provider_id");

    if (activeProviderId) {
      void Promise.resolve().then(() => {
        setSavedProviderId(activeProviderId);
        void loadProviderPhases(activeProviderId);
      });
    }
  }, []);

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

  function updateField(field: keyof ProviderForm, value: string) {
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
        setError("You must be signed in before creating a provider profile. Go to Sign In first.");
        setSaving(false);
        return;
      }

      const { data, error } = await supabase
        .from("providers")
        .insert({
          legal_name: form.legal_name.trim(),
          created_by_auth_user_id: userData.user.id,
          dba_name: form.dba_name.trim() || null,
          primary_contact_name: form.primary_contact_name.trim() || null,
          primary_contact_email: form.primary_contact_email.trim() || null,
          primary_contact_phone: form.primary_contact_phone.trim() || null,
          website: form.website.trim() || null,
          certification_status: form.certification_status,
          farr_level: form.farr_level,
          mat_mar_statement: form.mat_mar_statement.trim() || null,
          status: "setup",
        })
        .select("id, legal_name")
        .single();

      if (error) {
        throw error;
      }

      setSavedProviderId(data.id);
      localStorage.setItem("current_provider_id", data.id);
      await loadProviderPhases(data.id);
      setMessage(`${data.legal_name} was saved successfully. You can continue to house setup.`);
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

      const { data, error } = await supabase
        .from("provider_phase_levels")
        .insert({
          provider_id: savedProviderId,
          phase_name: phaseName.trim(),
          phase_order: Number(phaseOrder || phaseLevels.length + 1),
          minimum_days: minimumDays ? Number(minimumDays) : null,
          curfew_description: curfewDescription.trim() || null,
          requirements_description: requirementsDescription.trim() || null,
          is_active: true,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setPhaseLevels((current) =>
        [...current, data as ProviderPhaseRow].sort((a, b) => a.phase_order - b.phase_order)
      );
      setPhaseName("");
      setPhaseOrder("");
      setMinimumDays("");
      setCurfewDescription("");
      setRequirementsDescription("");
      setMessage("Provider phase level saved.");
    } catch (err) {
      const phaseError = err as { message?: unknown };
      setError(phaseError?.message ? String(phaseError.message) : "Could not save provider phase level.");
    } finally {
      setSavingPhase(false);
    }
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
    <PageShell maxWidth="max-w-5xl">
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
                <option>Not sure yet</option>
                <option>Level 1</option>
                <option>Level 2</option>
                <option>Level 3</option>
                <option>Level 4</option>
                <option>Not applicable</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">
                MAT/MAR access statement
              </span>
              <textarea
                value={form.mat_mar_statement}
                onChange={(event) => updateField("mat_mar_statement", event.target.value)}
                placeholder="Describe how the provider supports residents prescribed MAT/MAR."
                className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveProvider}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving..." : "Save Provider Profile"}
            </button>

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

            {savedProviderId && (
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

                <button
                  type="button"
                  onClick={saveProviderPhase}
                  disabled={savingPhase}
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingPhase ? "Saving..." : "Add Phase Level"}
                </button>

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

                          <button
                            type="button"
                            onClick={() => toggleProviderPhase(phase)}
                            className="rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {phase.is_active ? "Deactivate" : "Reactivate"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {savedProviderId && (
              <Link
                href="/houses"
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Continue to House Setup
              </Link>
            )}
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">After this step</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p className="rounded-2xl bg-slate-50 p-4">Add houses and bed counts.</p>
              <p className="rounded-2xl bg-slate-50 p-4">Invite staff and assign roles.</p>
              <p className="rounded-2xl bg-slate-50 p-4">Upload provider policies and compliance documents.</p>
              <p className="rounded-2xl bg-slate-50 p-4">Start resident onboarding.</p>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Access model</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Each provider should only see its own houses, residents, staff, documents,
              UA/BA records, incidents, grievances, and reports. We will add stronger
              authentication and row-level security after the core forms are working.
            </p>
          </div>
        </aside>
      </section>
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
