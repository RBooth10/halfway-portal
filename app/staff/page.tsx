"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Home,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Pencil,
  Plus,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

type StaffForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  house_access: string;
};

type StaffRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  house_access: string;
  status: string;
};

const roles = [
  {
    name: "Owner/Admin",
    value: "owner_admin",
    access: "Full provider access",
    description: "Can manage provider profile, houses, staff, permissions, residents, documents, and reports.",
  },
  {
    name: "Compliance Manager",
    value: "compliance_manager",
    access: "Compliance access",
    description: "Can manage compliance binder, staff training, incidents, grievances, reports, and reviews.",
  },
  {
    name: "House Manager",
    value: "house_manager",
    access: "Assigned house access",
    description: "Can manage assigned houses, residents, notes, UA/BA, incidents, grievances, and documents.",
  },
  {
    name: "Peer Leader",
    value: "peer_leader",
    access: "Limited assigned house access",
    description: "Can view limited house tasks and non-sensitive resident workflow items assigned to them.",
  },
  {
    name: "Read-Only Reviewer",
    value: "read_only_reviewer",
    access: "Read-only access",
    description: "Can review selected reports and compliance records without editing.",
  },
];

const permissionGroups = [
  "Provider profile",
  "Houses",
  "Residents",
  "Resident documents",
  "UA/BA logs",
  "Medication / MAT-MAR",
  "Incidents",
  "Grievances",
  "Payments",
  "Reports",
  "Staff permissions",
];

const initialForm: StaffForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  role: "house_manager",
  house_access: "assigned_houses_only",
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

function RoleCard({ role }: { role: (typeof roles)[number] }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-950">{role.name}</h3>
          <p className="mt-1 text-sm font-medium text-slate-600">{role.access}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{role.description}</p>
        </div>
        <ShieldCheck className="h-5 w-5 shrink-0 text-slate-700" />
      </div>
    </div>
  );
}

export default function StaffPage() {
  const [form, setForm] = useState<StaffForm>(initialForm);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerName, setProviderName] = useState("Current Provider");
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField(field: keyof StaffForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function loadStaff(activeProviderId: string) {
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
      .from("staff_profiles")
      .select("*")
      .eq("provider_id", activeProviderId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    setStaff((data ?? []) as StaffRow[]);
  }

  useEffect(() => {
    async function initialize() {
      try {
        const activeProviderId = localStorage.getItem("current_provider_id");

        if (!activeProviderId) {
          setError("No provider selected yet. Go to Provider Onboarding first and save a provider profile.");
          return;
        }

        setProviderId(activeProviderId);
        await loadStaff(activeProviderId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load staff.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  function startEditingStaff(person: StaffRow) {
    setEditingStaffId(person.id);
    setForm({
      first_name: person.first_name ?? "",
      last_name: person.last_name ?? "",
      email: person.email ?? "",
      phone: person.phone ?? "",
      role: person.role ?? "house_manager",
      house_access: person.house_access ?? "assigned_houses_only",
    });
    setMessage(`Editing ${person.email}. Update the form and click Save Changes.`);
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function archiveStaff(staffId: string, staffEmail: string) {
    const confirmed = window.confirm(`Archive ${staffEmail}? This keeps the staff profile but marks it inactive.`);

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("staff_profiles")
        .update({ status: "inactive" })
        .eq("id", staffId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setStaff((current) =>
        current.map((person) =>
          person.id === staffId ? (data as StaffRow) : person
        )
      );

      setMessage(`${staffEmail} was archived successfully.`);
    } catch (err) {
      const staffError = err as { message?: unknown };
      setError(staffError?.message ? String(staffError.message) : "Could not archive staff profile.");
    }
  }

  async function saveStaff() {
    setSaving(true);
    setMessage("");
    setError("");

    if (!providerId) {
      setSaving(false);
      setError("No provider selected. Save a provider profile first.");
      return;
    }

    if (!form.email.trim()) {
      setSaving(false);
      setError("Email is required.");
      return;
    }

    const staffPayload = {
      provider_id: providerId,
      first_name: form.first_name.trim() || null,
      last_name: form.last_name.trim() || null,
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      role: form.role,
      house_access: form.house_access,
      status: editingStaffId ? undefined : "pending_approval",
    };

    try {
      const supabase = getSupabaseClient();

      if (editingStaffId) {
        const { data, error } = await supabase
          .from("staff_profiles")
          .update({
            first_name: staffPayload.first_name,
            last_name: staffPayload.last_name,
            email: staffPayload.email,
            phone: staffPayload.phone,
            role: staffPayload.role,
            house_access: staffPayload.house_access,
          })
          .eq("id", editingStaffId)
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        setStaff((current) =>
          current.map((person) =>
            person.id === editingStaffId ? (data as StaffRow) : person
          )
        );
        setForm(initialForm);
        setEditingStaffId(null);
        setMessage(`${data.email} was updated successfully.`);
        return;
      }

      const { data, error } = await supabase
        .from("staff_profiles")
        .insert({
          provider_id: staffPayload.provider_id,
          first_name: staffPayload.first_name,
          last_name: staffPayload.last_name,
          email: staffPayload.email,
          phone: staffPayload.phone,
          role: staffPayload.role,
          house_access: staffPayload.house_access,
          status: "pending_approval",
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setStaff((current) => [data as StaffRow, ...current]);
      setForm(initialForm);
      setMessage(`${data.email} was saved successfully as a pending staff profile.`);
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

  const activeStaff = staff.filter((person) => person.status !== "inactive").length;

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
          href="/houses"
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          <Home className="h-4 w-4" />
          Houses
        </Link>
      </div>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
              <UserCog className="h-10 w-10 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Provider Staff Setup</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Staff & Roles</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Invite provider staff for <span className="font-medium text-slate-950">{providerName}</span>,
                assign roles, limit access by house, and protect sensitive resident, medication, UA/BA, incident, grievance, payment, and report data.
              </p>
            </div>
          </div>

          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            <UserPlus className="h-4 w-4" />
            Invite Staff
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
        <MetricCard title="Staff" value={String(activeStaff)} subtitle="Saved to Supabase" icon={Users} />
        <MetricCard title="Roles" value="5" subtitle="Default access levels" icon={KeyRound} />
        <MetricCard title="House Access" value="Setup" subtitle="Assign by house later" icon={Home} />
        <MetricCard title="Security" value="Required" subtitle="Role-based controls" icon={LockKeyhole} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <form className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">{editingStaffId ? "Edit Staff Member" : "Invite Staff Member"}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {editingStaffId
              ? "Update this staff profile, role, and access level."
              : "New users remain pending until approval and house access are finalized."}
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="First name" placeholder="First name" icon={Users} value={form.first_name} onChange={(value) => updateField("first_name", value)} />
            <Field label="Last name" placeholder="Last name" icon={Users} value={form.last_name} onChange={(value) => updateField("last_name", value)} />
            <Field label="Email" placeholder="email@example.com" icon={Mail} type="email" value={form.email} onChange={(value) => updateField("email", value)} required />
            <Field label="Phone" placeholder="(555) 000-0000" icon={Building2} value={form.phone} onChange={(value) => updateField("phone", value)} />

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Role</span>
              <select
                value={form.role}
                onChange={(event) => updateField("role", event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>{role.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">House access</span>
              <select
                value={form.house_access}
                onChange={(event) => updateField("house_access", event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              >
                <option value="all_houses">All houses</option>
                <option value="assigned_houses_only">Assigned houses only</option>
                <option value="none">No house access yet</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Access notes</span>
              <textarea
                placeholder="Example: House Manager for Oak House only."
                className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveStaff}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Saving..." : editingStaffId ? "Save Changes" : "Save Staff Invite"}
            </button>

            <button
              type="button"
              onClick={() => {
                setForm(initialForm);
                setEditingStaffId(null);
                setMessage("");
                setError("");
              }}
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              {editingStaffId ? "Cancel Edit" : "Clear Form"}
            </button>

            <Link
              href="/residents"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Continue to Resident Setup
            </Link>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Saved Staff</h2>
            {loading ? (
              <p className="mt-3 text-sm text-slate-500">Loading staff...</p>
            ) : staff.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No staff saved yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {staff.map((person) => (
                  <div key={person.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">
                          {[person.first_name, person.last_name].filter(Boolean).join(" ") || person.email}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{person.email}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {person.role} • {person.house_access} • {person.status}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingStaff(person)}
                          className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => archiveStaff(person.id, person.email)}
                          disabled={person.status === "inactive"}
                          className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          {person.status === "inactive" ? "Archived" : "Archive"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Permission Groups</h2>
            <div className="mt-4 space-y-2">
              {permissionGroups.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-slate-700" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Default Role Types</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <RoleCard key={role.name} role={role} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
