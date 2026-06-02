"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  Home,
  Loader2,
  RefreshCw,
  Shuffle,
  Users,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

type ResidentRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  admission_date: string | null;
  house_id: string | null;
  resident_status: string | null;
  current_phase: string | null;
  current_phase_id: string | null;
};

type HouseRow = {
  id: string;
  name: string;
  status: string | null;
};

type ScheduleRow = {
  id: string;
  resident_id: string;
  house_id: string | null;
  scheduled_date: string;
  status: string;
  reason: string | null;
};

type UaRuleRow = {
  id: string;
  provider_id: string;
  phase_id: string | null;
  phase_name: string | null;
  min_tests_per_window: number;
  max_tests_per_window: number;
  window_days: number;
  is_active: boolean;
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) return "Not entered";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Not entered";

  return date.toLocaleDateString();
}

function residentName(resident: ResidentRow | undefined) {
  if (!resident) return "Unknown Resident";

  return [resident.first_name, resident.last_name].filter(Boolean).join(" ") || "Unnamed Resident";
}

function daysSinceAdmission(admissionDate: string | null) {
  if (!admissionDate) return 0;

  const start = new Date(`${admissionDate}T00:00:00`).getTime();
  const today = new Date(`${todayDate()}T00:00:00`).getTime();

  if (Number.isNaN(start) || Number.isNaN(today)) return 0;

  return Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1);
}

export default function UaRandomizerPage() {
  const [providerId, setProviderId] = useState<string | null>(null);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState("");
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState("all");
  const [scheduleDateStart, setScheduleDateStart] = useState("");
  const [scheduleDateEnd, setScheduleDateEnd] = useState("");
  const [windowDays, setWindowDays] = useState(30);
  const [minTests, setMinTests] = useState(1);
  const [maxTests, setMaxTests] = useState(2);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeResidents = residents.filter(
    (resident) =>
      String(resident.resident_status ?? "active").toLowerCase() === "active" &&
      (!selectedHouseId || resident.house_id === selectedHouseId)
  );

  const phaseOptions = Array.from(
    new Map(
      activeResidents.map((resident) => {
        const value = resident.current_phase_id || resident.current_phase || "not_selected";
        return [
          value,
          {
            value,
            label: resident.current_phase || "Not selected",
          },
        ];
      })
    ).values()
  ).sort((first, second) => first.label.localeCompare(second.label));

  const visibleScheduleRows = scheduleRows.filter((row) => {
    if (row.status !== "scheduled") return false;
    if (selectedHouseId && row.house_id !== selectedHouseId) return false;
    if (scheduleDateStart && row.scheduled_date < scheduleDateStart) return false;
    if (scheduleDateEnd && row.scheduled_date > scheduleDateEnd) return false;

    if (selectedPhaseFilter !== "all") {
      const resident = residents.find((item) => item.id === row.resident_id);
      const residentPhaseValue = resident?.current_phase_id || resident?.current_phase || "not_selected";

      if (residentPhaseValue !== selectedPhaseFilter) {
        return false;
      }
    }

    return true;
  });

  function getResident(residentId: string) {
    return residents.find((resident) => resident.id === residentId);
  }

  function getHouseName(houseId: string | null) {
    if (!houseId) return "No house assigned";

    return houses.find((house) => house.id === houseId)?.name ?? "Unknown house";
  }

  function exportVisibleScheduleCsv() {
    const headers = [
      "Resident",
      "House",
      "Phase",
      "Days With Provider",
      "Scheduled Date",
      "Status",
      "Reason",
    ];

    const rows = visibleScheduleRows.map((row) => {
      const resident = getResident(row.resident_id);

      return [
        residentName(resident),
        getHouseName(row.house_id),
        resident?.current_phase || "Not selected",
        String(daysSinceAdmission(resident?.admission_date ?? null)),
        formatDate(row.scheduled_date),
        row.status,
        row.reason ?? "",
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `rolling-ua-schedule-${todayDate()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  async function refreshSchedule(activeProviderId: string) {
    const supabase = getSupabaseClient() as any;

    const scheduleResult = await supabase
      .from("ua_randomizer_schedule")
      .select("id, resident_id, house_id, scheduled_date, status, reason")
      .eq("provider_id", activeProviderId)
      .eq("status", "scheduled")
      .order("scheduled_date", { ascending: true });

    if (scheduleResult.error) {
      throw scheduleResult.error;
    }

    setScheduleRows((scheduleResult.data ?? []) as ScheduleRow[]);
  }

  useEffect(() => {
    let isMounted = true;

    Promise.resolve()
      .then(async () => {
        const activeProviderId = localStorage.getItem("current_provider_id");

        if (!activeProviderId) {
          throw new Error("No provider selected. Save or select a provider first.");
        }

        const supabase = getSupabaseClient() as any;

        const residentsResult = await supabase
          .from("residents")
          .select("id, first_name, last_name, admission_date, house_id, resident_status, current_phase, current_phase_id")
          .eq("provider_id", activeProviderId)
          .eq("resident_status", "active")
          .order("last_name", { ascending: true });

        if (residentsResult.error) {
          throw residentsResult.error;
        }

        const housesResult = await supabase
          .from("houses")
          .select("id, name, status")
          .eq("provider_id", activeProviderId)
          .or("status.is.null,status.neq.inactive")
          .order("name", { ascending: true });

        if (housesResult.error) {
          throw housesResult.error;
        }

        const ruleResult = await supabase
          .from("ua_randomizer_rules")
          .select("*")
          .eq("provider_id", activeProviderId)
          .is("phase_id", null)
          .is("phase_name", null)
          .eq("is_active", true)
          .maybeSingle();

        if (ruleResult.error) {
          throw ruleResult.error;
        }

        const scheduleResult = await supabase
          .from("ua_randomizer_schedule")
          .select("id, resident_id, house_id, scheduled_date, status, reason")
          .eq("provider_id", activeProviderId)
          .eq("status", "scheduled")
          .order("scheduled_date", { ascending: true });

        if (scheduleResult.error) {
          throw scheduleResult.error;
        }

        if (!isMounted) return;

        const savedRule = ruleResult.data as UaRuleRow | null;

        setProviderId(activeProviderId);
        setResidents((residentsResult.data ?? []) as ResidentRow[]);
        setHouses((housesResult.data ?? []) as HouseRow[]);
        setScheduleRows((scheduleResult.data ?? []) as ScheduleRow[]);

        if (savedRule) {
          setWindowDays(savedRule.window_days);
          setMinTests(savedRule.min_tests_per_window);
          setMaxTests(savedRule.max_tests_per_window);
        }
      })
      .catch((err: { message?: unknown }) => {
        if (!isMounted) return;

        setError(err?.message ? String(err.message) : "Could not load rolling UA schedule.");
      })
      .finally(() => {
        if (!isMounted) return;

        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveDefaultRollingRule(activeProviderId: string) {
    const supabase = getSupabaseClient() as any;

    const existingRuleResult = await supabase
      .from("ua_randomizer_rules")
      .select("id")
      .eq("provider_id", activeProviderId)
      .is("phase_id", null)
      .is("phase_name", null)
      .maybeSingle();

    if (existingRuleResult.error) {
      throw existingRuleResult.error;
    }

    if (existingRuleResult.data?.id) {
      const { error: updateError } = await supabase
        .from("ua_randomizer_rules")
        .update({
          min_tests_per_window: minTests,
          max_tests_per_window: maxTests,
          window_days: windowDays,
          is_active: true,
        })
        .eq("id", existingRuleResult.data.id);

      if (updateError) {
        throw updateError;
      }

      return;
    }

    const { error: insertError } = await supabase
      .from("ua_randomizer_rules")
      .insert({
        provider_id: activeProviderId,
        phase_id: null,
        phase_name: null,
        min_tests_per_window: minTests,
        max_tests_per_window: maxTests,
        window_days: windowDays,
        is_active: true,
      });

    if (insertError) {
      throw insertError;
    }
  }

  async function syncRollingSchedule() {
    if (!providerId) {
      setError("No provider selected.");
      return;
    }

    if (minTests < 0 || maxTests < 1 || minTests > maxTests) {
      setError("Minimum and maximum UA counts are not valid.");
      return;
    }

    setSyncing(true);
    setMessage("");
    setError("");

    try {
      const supabase = getSupabaseClient() as any;

      await saveDefaultRollingRule(providerId);

      const { data, error: syncError } = await supabase.rpc("repopulate_provider_rolling_ua_schedule", {
        p_provider_id: providerId,
        p_window_days: windowDays,
        p_min_tests: minTests,
        p_max_tests: maxTests,
      });

      if (syncError) {
        throw syncError;
      }

      await refreshSchedule(providerId);

      setMessage(`Rolling UA schedule repopulated. ${Number(data ?? 0)} scheduled item(s) generated. Completed UA records were not changed.`);
    } catch (err) {
      const syncError = err as { message?: unknown };
      setError(syncError?.message ? String(syncError.message) : "Could not sync rolling UA schedule.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <PageShell>
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">UA/BA Workflow</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Rolling UA Schedule</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Keep future UA schedules current as residents are added, discharged, readmitted, or moved through phases.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-950">{activeResidents.length} active resident(s)</p>
            <p className="mt-1">{visibleScheduleRows.length} scheduled UA item(s)</p>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>{message}</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 shadow-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading rolling UA schedule...
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Rolling Schedule Rule</h2>
          <p className="mt-1 text-sm text-slate-500">
            Set the rolling UA rule, then repopulate whenever you need a fresh future UA list. Completed UA records are not changed.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">House filter</span>
              <div className="relative mt-2">
                <Home className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedHouseId}
                  onChange={(event) => setSelectedHouseId(event.target.value)}
                  className="h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="">All active houses</option>
                  {houses.map((house) => (
                    <option key={house.id} value={house.id}>
                      {house.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Rolling window days</span>
              <input
                type="number"
                min="1"
                value={windowDays}
                onChange={(event) => setWindowDays(Number(event.target.value))}
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Minimum per resident</span>
                <input
                  type="number"
                  min="0"
                  value={minTests}
                  onChange={(event) => setMinTests(Number(event.target.value))}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Maximum per resident</span>
                <input
                  type="number"
                  min="1"
                  value={maxTests}
                  onChange={(event) => setMaxTests(Number(event.target.value))}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void syncRollingSchedule()}
              disabled={loading || syncing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? "Repopulating..." : "Repopulate Rolling Schedule"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Scheduled UA List</h2>
              <p className="mt-1 text-sm text-slate-500">
                Scheduled UA items stay active until completed, skipped, cancelled, or updated by a resident status/phase change.
              </p>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              <Shuffle className="h-3.5 w-3.5" />
              Rolling schedule
            </span>
          </div>

          <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Phase</span>
                  <select
                    value={selectedPhaseFilter}
                    onChange={(event) => setSelectedPhaseFilter(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  >
                    <option value="all">All phases</option>
                    {phaseOptions.map((phase) => (
                      <option key={phase.value} value={phase.value}>
                        {phase.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Scheduled from</span>
                  <input
                    type="date"
                    value={scheduleDateStart}
                    onChange={(event) => setScheduleDateStart(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Scheduled through</span>
                  <input
                    type="date"
                    value={scheduleDateEnd}
                    onChange={(event) => setScheduleDateEnd(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhaseFilter("all");
                    setScheduleDateStart("");
                    setScheduleDateEnd("");
                  }}
                  className="inline-flex items-center justify-center rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Clear Filters
                </button>

                <button
                  type="button"
                  onClick={exportVisibleScheduleCsv}
                  disabled={visibleScheduleRows.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Export Schedule
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Residents</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{activeResidents.length}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Scheduled</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{visibleScheduleRows.length}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Window</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                Today - {formatDate(addDays(todayDate(), windowDays - 1))}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {visibleScheduleRows.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No UA items scheduled yet. Initialize the rolling schedule once to create the first future list.
              </p>
            ) : (
              visibleScheduleRows.map((row) => {
                const resident = getResident(row.resident_id);

                return (
                  <div key={row.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-medium text-slate-950">{residentName(resident)}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {getHouseName(row.house_id)} • Phase: {resident?.current_phase || "Not selected"} • Days with provider: {daysSinceAdmission(resident?.admission_date ?? null)}
                        </p>
                        {row.reason ? (
                          <p className="mt-1 text-xs text-slate-500">{row.reason}</p>
                        ) : null}
                      </div>

                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(row.scheduled_date)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Users className="mt-1 h-5 w-5 text-slate-600" />
          <div>
            <h2 className="text-lg font-semibold">How rolling UA scheduling works</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Repopulate the schedule whenever you need a fresh future UA list. The system cancels future scheduled
              UA items and regenerates the current rolling window. Completed UA records are not changed.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
