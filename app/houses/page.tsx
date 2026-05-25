"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  Archive,
  ArrowLeft,
  BedDouble,
  CheckCircle2,
  Download,
  Home,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";
import { createAuditLog } from "@/lib/audit";

type HouseForm = {
  name: string;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  gender_served: string;
  farr_level: string;
  total_beds: string;
  status: string;
  program_fee_model_override: string;
  cost_per_client_override: string;
  split_rent_total_amount_override: string;
  split_rent_client_count_override: string;
  program_fee_frequency_override: string;
  program_fee_charge_day_of_month_override: string;
  program_fee_charge_day_of_week_override: string;
  prorate_first_period_override: string;
};

type HouseRow = {
  id: string;
  name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  gender_served: string | null;
  farr_level: string | null;
  total_beds: number;
  status: string;
  program_fee_model_override: string | null;
  cost_per_client_override: number | null;
  split_rent_total_amount_override: number | null;
  split_rent_client_count_override: number | null;
  program_fee_frequency_override: string | null;
  program_fee_charge_day_of_month_override: number | null;
  program_fee_charge_day_of_week_override: string | null;
  prorate_first_period_override: boolean | null;
};

const initialForm: HouseForm = {
  name: "",
  street_address: "",
  city: "",
  state: "",
  zip: "",
  gender_served: "Male",
  farr_level: "Level 2",
  total_beds: "",
  status: "pending_setup",
  program_fee_model_override: "",
  cost_per_client_override: "",
  split_rent_total_amount_override: "",
  split_rent_client_count_override: "",
  program_fee_frequency_override: "",
  program_fee_charge_day_of_month_override: "",
  program_fee_charge_day_of_week_override: "",
  prorate_first_period_override: "",
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

export default function HousesPage() {
  const [form, setForm] = useState<HouseForm>(initialForm);
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerName, setProviderName] = useState("Current Provider");
  const [editingHouseId, setEditingHouseId] = useState<string | null>(null);
  const [showHouseForm, setShowHouseForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField(field: keyof HouseForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function loadHouses(activeProviderId: string) {
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
      .from("houses")
      .select("*")
      .eq("provider_id", activeProviderId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    setHouses((data ?? []) as HouseRow[]);
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
        await loadHouses(activeProviderId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load houses.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  function startEditingHouse(house: HouseRow) {
    setEditingHouseId(house.id);
    setShowHouseForm(true);
    setForm({
      name: house.name ?? "",
      street_address: house.street_address ?? "",
      city: house.city ?? "",
      state: house.state ?? "",
      zip: house.zip ?? "",
      gender_served: house.gender_served ?? "Male",
      farr_level: house.farr_level ?? "Level 2",
      total_beds: String(house.total_beds ?? ""),
      status: house.status ?? "pending_setup",
      program_fee_model_override: house.program_fee_model_override ?? "",
      cost_per_client_override: house.cost_per_client_override == null ? "" : String(house.cost_per_client_override),
      split_rent_total_amount_override: house.split_rent_total_amount_override == null ? "" : String(house.split_rent_total_amount_override),
      split_rent_client_count_override: house.split_rent_client_count_override == null ? "" : String(house.split_rent_client_count_override),
      program_fee_frequency_override: house.program_fee_frequency_override ?? "",
      program_fee_charge_day_of_month_override: house.program_fee_charge_day_of_month_override == null ? "" : String(house.program_fee_charge_day_of_month_override),
      program_fee_charge_day_of_week_override: house.program_fee_charge_day_of_week_override ?? "",
      prorate_first_period_override:
        house.prorate_first_period_override == null ? "" : String(house.prorate_first_period_override),
    });
    setMessage(`Editing ${house.name}. Update the form and click Save Changes.`);
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function archiveHouse(houseId: string, houseName: string) {
    const confirmed = window.confirm(`Archive ${houseName}? This keeps the house record but marks it inactive.`);

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("houses")
        .update({ status: "inactive" })
        .eq("id", houseId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const previousHouse = houses.find((house) => house.id === houseId) ?? null;

      setHouses((current) =>
        current.map((house) =>
          house.id === houseId ? (data as HouseRow) : house
        )
      );

      if (providerId) {
        await createAuditLog({
          providerId,
          action: "house_archived",
          tableName: "houses",
          recordId: houseId,
          oldValues: previousHouse,
          newValues: data as Record<string, unknown>,
          reason: "House archived from portal.",
        });
      }

      setMessage(`${houseName} was archived successfully.`);
    } catch (err) {
      const houseError = err as { message?: unknown };
      setError(houseError?.message ? String(houseError.message) : "Could not archive house.");
    }
  }

  async function saveHouse() {
    setSaving(true);
    setMessage("");
    setError("");

    if (!providerId) {
      setSaving(false);
      setError("No provider selected. Save a provider profile first.");
      return;
    }

    if (!form.name.trim()) {
      setSaving(false);
      setError("House name is required.");
      return;
    }

    const totalBeds = Number(form.total_beds || 0);

    if (Number.isNaN(totalBeds) || totalBeds < 0) {
      setSaving(false);
      setError("Total beds must be zero or greater.");
      return;
    }

    function optionalNumber(value: string, label: string) {
      if (!value.trim()) return null;

      const parsedValue = Number(value);

      if (Number.isNaN(parsedValue) || parsedValue < 0) {
        throw new Error(`${label} must be zero or greater.`);
      }

      return parsedValue;
    }

    let costPerClientOverride: number | null = null;
    let splitRentTotalAmountOverride: number | null = null;
    let splitRentClientCountOverride: number | null = null;
    let programFeeChargeDayOfMonthOverride: number | null = null;

    try {
      costPerClientOverride = optionalNumber(form.cost_per_client_override, "Cost per client override");
      splitRentTotalAmountOverride = optionalNumber(form.split_rent_total_amount_override, "Split rent total override");
      splitRentClientCountOverride = optionalNumber(form.split_rent_client_count_override, "Split rent client count override");
      programFeeChargeDayOfMonthOverride = optionalNumber(form.program_fee_charge_day_of_month_override, "Charge day of month override");
    } catch (validationError) {
      setSaving(false);
      setError(validationError instanceof Error ? validationError.message : "Check the house fee override fields.");
      return;
    }

    if (
      programFeeChargeDayOfMonthOverride !== null &&
      (programFeeChargeDayOfMonthOverride < 1 || programFeeChargeDayOfMonthOverride > 31)
    ) {
      setSaving(false);
      setError("Charge day of month override must be between 1 and 31.");
      return;
    }

    const housePayload = {
      provider_id: providerId,
      name: form.name.trim(),
      street_address: form.street_address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      zip: form.zip.trim() || null,
      gender_served: form.gender_served,
      farr_level: form.farr_level,
      total_beds: totalBeds,
      status: form.status,
      program_fee_model_override: form.program_fee_model_override || null,
      cost_per_client_override: costPerClientOverride,
      split_rent_total_amount_override: splitRentTotalAmountOverride,
      split_rent_client_count_override: splitRentClientCountOverride,
      program_fee_frequency_override: form.program_fee_frequency_override || null,
      program_fee_charge_day_of_month_override: programFeeChargeDayOfMonthOverride,
      program_fee_charge_day_of_week_override: form.program_fee_charge_day_of_week_override || null,
      prorate_first_period_override:
        form.prorate_first_period_override === ""
          ? null
          : form.prorate_first_period_override === "true",
    };

    try {
      const supabase = getSupabaseClient();

      if (editingHouseId) {
        const { data, error } = await supabase
          .from("houses")
          .update(housePayload)
          .eq("id", editingHouseId)
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        const previousHouse = houses.find((house) => house.id === editingHouseId) ?? null;

        setHouses((current) =>
          current.map((house) =>
            house.id === editingHouseId ? (data as HouseRow) : house
          )
        );

        await createAuditLog({
          providerId,
          action: "house_updated",
          tableName: "houses",
          recordId: editingHouseId,
          oldValues: previousHouse,
          newValues: data as Record<string, unknown>,
          reason: "House updated from portal.",
        });

        setForm(initialForm);
        setEditingHouseId(null);
        setMessage(`${data.name} was updated successfully.`);
        return;
      }

      const { data, error } = await supabase
        .from("houses")
        .insert(housePayload)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setHouses((current) => [data as HouseRow, ...current]);
      setShowHouseForm(false);
      setForm(initialForm);
      setMessage(`${data.name} was saved successfully.`);
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

  const totalBeds = houses.reduce((sum, house) => sum + Number(house.total_beds || 0), 0);

  const visibleHouses = houses.filter(
    (house) => String(house.status ?? "active").toLowerCase() !== "inactive"
  );

  const showCostPerClientOverride = form.program_fee_model_override === "cost_per_client";
  const showSplitRentOverride = form.program_fee_model_override === "split_rent";
  const showMonthlyChargeDayOverride = form.program_fee_frequency_override === "monthly";
  const showWeeklyChargeDayOverride =
    form.program_fee_frequency_override === "weekly" || form.program_fee_frequency_override === "biweekly";


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
      </div>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
              <Home className="h-10 w-10 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Provider House Setup</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Houses</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Add recovery residence houses for <span className="font-medium text-slate-950">{providerName}</span>.
                Bed counts, residents, documents, safety checks, incidents, grievances, and readiness scores will roll up from the house level.
              </p>
            </div>
          </div>

          <button className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50">
            <Download className="h-4 w-4" />
            Export Houses
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
        <MetricCard title="Houses" value={String(houses.length)} subtitle="Saved to Supabase" icon={Home} />
        <MetricCard title="Beds" value={String(totalBeds)} subtitle="Total saved bed count" icon={BedDouble} />
        <MetricCard title="Residents" value="0" subtitle="No residents assigned yet" icon={Users} />
        <MetricCard title="Readiness" value={houses.length ? "In Progress" : "Setup"} subtitle="Waiting for house documents" icon={ShieldCheck} />
      </section>

      <section className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Saved Houses</h2>
              <p className="mt-1 text-sm text-slate-500">
                Existing houses are the primary workspace. Add a new house only when needed.
              </p>
            </div>

            {houses.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setEditingHouseId(null);
                  setForm(initialForm);
                  setShowHouseForm((current) => !current);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                {showHouseForm && !editingHouseId ? "Hide Add House" : "Add House"}
              </button>
            ) : null}
          </div>

          {loading ? (
            <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Loading houses...</p>
          ) : houses.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-950">No houses saved yet.</p>
              <p className="mt-1 text-sm text-slate-500">
                Add the first house to begin tracking beds, residents, documents, and house-level compliance.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleHouses.map((house) => (
                <div key={house.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{house.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {house.total_beds} beds • {house.gender_served || "Population not set"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {[house.city, house.state].filter(Boolean).join(", ") || "Address not complete"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Status: {house.status}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/houses/${house.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Home className="h-3.5 w-3.5" />
                        View
                      </Link>

                      <button
                        type="button"
                        onClick={() => startEditingHouse(house)}
                        className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => archiveHouse(house.id, house.name)}
                        disabled={house.status === "inactive"}
                        className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        {house.status === "inactive" ? "Archived" : "Archive"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {houses.length === 0 || showHouseForm || editingHouseId ? (
          <form className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">{editingHouseId ? "Edit House" : "Add House"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {editingHouseId
                ? "Update the selected house record."
                : houses.length === 0
                  ? "Add the first house for this provider."
                  : "Add another house under this provider."}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field
                label="House name"
                placeholder="Example: Oak House"
                icon={Home}
                value={form.name}
                onChange={(value) => updateField("name", value)}
                required
              />

              <Field
                label="Total beds"
                placeholder="0"
                icon={BedDouble}
                type="number"
                value={form.total_beds}
                onChange={(value) => updateField("total_beds", value)}
              />

              <Field
                label="Street address"
                placeholder="123 Main Street"
                icon={MapPin}
                value={form.street_address}
                onChange={(value) => updateField("street_address", value)}
              />

              <Field
                label="City"
                placeholder="City"
                icon={MapPin}
                value={form.city}
                onChange={(value) => updateField("city", value)}
              />

              <Field
                label="State"
                placeholder="FL"
                icon={MapPin}
                value={form.state}
                onChange={(value) => updateField("state", value)}
              />

              <Field
                label="ZIP code"
                placeholder="00000"
                icon={MapPin}
                value={form.zip}
                onChange={(value) => updateField("zip", value)}
              />

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Gender / population served</span>
                <select
                  value={form.gender_served}
                  onChange={(event) => updateField("gender_served", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>All Gender</option>
                  <option>Other / Specialized Population</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">FARR/NARR level</span>
                <select
                  value={form.farr_level}
                  onChange={(event) => updateField("farr_level", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option>Level 1</option>
                  <option>Level 2</option>
                  <option>Level 3</option>
                  <option>Level 4</option>
                  <option>Not sure yet</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">House status</span>
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="active">Active</option>
                  <option value="pending_setup">Pending setup</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div className="mt-8 rounded-2xl border bg-slate-50 p-5">
              <div>
                <h3 className="text-base font-semibold text-slate-950">House Fee Overrides</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Leave these fields blank to use the provider default fee setting.
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Fee model override</span>
                  <select
                    value={form.program_fee_model_override}
                    onChange={(event) => updateField("program_fee_model_override", event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  >
                    <option value="">Use provider default</option>
                    <option value="cost_per_client">Cost per client</option>
                    <option value="split_rent">Split rent</option>
                  </select>
                </label>

                {showCostPerClientOverride ? (
                  <Field
                    label="Cost per client override"
                    placeholder="Example: 850"
                    icon={Home}
                    type="number"
                    value={form.cost_per_client_override}
                    onChange={(value) => updateField("cost_per_client_override", value)}
                  />
                ) : null}

                {showSplitRentOverride ? (
                  <>
                    <Field
                      label="Split rent total override"
                      placeholder="Example: 3200"
                      icon={Home}
                      type="number"
                      value={form.split_rent_total_amount_override}
                      onChange={(value) => updateField("split_rent_total_amount_override", value)}
                    />

                    <Field
                      label="Split rent client count override"
                      placeholder="Example: 4"
                      icon={Users}
                      type="number"
                      value={form.split_rent_client_count_override}
                      onChange={(value) => updateField("split_rent_client_count_override", value)}
                    />
                  </>
                ) : null}

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Frequency override</span>
                  <select
                    value={form.program_fee_frequency_override}
                    onChange={(event) => updateField("program_fee_frequency_override", event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  >
                    <option value="">Use provider default</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>

                {showMonthlyChargeDayOverride ? (
                  <Field
                    label="Charge day of month override"
                    placeholder="1-31"
                    icon={Home}
                    type="number"
                    value={form.program_fee_charge_day_of_month_override}
                    onChange={(value) => updateField("program_fee_charge_day_of_month_override", value)}
                  />
                ) : null}

                {showWeeklyChargeDayOverride ? (
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Charge day of week override</span>
                    <select
                      value={form.program_fee_charge_day_of_week_override}
                      onChange={(event) => updateField("program_fee_charge_day_of_week_override", event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    >
                      <option value="">Use provider default</option>
                      <option>Monday</option>
                      <option>Tuesday</option>
                      <option>Wednesday</option>
                      <option>Thursday</option>
                      <option>Friday</option>
                      <option>Saturday</option>
                      <option>Sunday</option>
                    </select>
                  </label>
                ) : null}

                {form.program_fee_frequency_override && form.program_fee_frequency_override !== "daily" ? (
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Prorate first period override</span>
                    <select
                      value={form.prorate_first_period_override}
                      onChange={(event) => updateField("prorate_first_period_override", event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    >
                      <option value="">Use provider default</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveHouse}
                disabled={saving || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {saving ? "Saving..." : editingHouseId ? "Save Changes" : "Save House"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setEditingHouseId(null);
                  if (houses.length > 0) {
                    setShowHouseForm(false);
                  }
                }}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                {houses.length > 0 ? "Cancel" : "Clear Form"}
              </button>

              <Link
                href="/staff"
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Continue to Staff Setup
              </Link>
            </div>
          </form>
        ) : null}
      </section>
    </PageShell>
  );
}
