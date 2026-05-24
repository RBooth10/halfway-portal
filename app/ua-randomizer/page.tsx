"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Dice5,
  Home,
  Loader2,
  Save,
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
};

type HouseRow = {
  id: string;
  name: string;
  status: string | null;
};

type PreviewRow = {
  resident_id: string;
  resident_name: string;
  house_id: string | null;
  scheduled_date: string;
  reason: string;
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

function residentName(resident: ResidentRow) {
  return [resident.first_name, resident.last_name].filter(Boolean).join(" ") || "Unnamed Resident";
}

function daysSinceAdmission(admissionDate: string | null) {
  if (!admissionDate) return 0;

  const start = new Date(`${admissionDate}T00:00:00`).getTime();
  const today = new Date(`${todayDate()}T00:00:00`).getTime();

  if (Number.isNaN(start) || Number.isNaN(today)) return 0;

  return Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1);
}

function dateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function randomInt(min: number, max: number) {
  const safeMin = Math.ceil(min);
  const safeMax = Math.floor(max);

  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

function shuffleValues<T>(values: T[]) {
  const copied = [...values];

  for (let index = copied.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[randomIndex]] = [copied[randomIndex], copied[index]];
  }

  return copied;
}

function testsForResident(
  resident: ResidentRow,
  strategy: "random" | "length_of_stay",
  minTests: number,
  maxTests: number
) {
  if (strategy === "random") {
    return randomInt(minTests, maxTests);
  }

  const daysInProgram = daysSinceAdmission(resident.admission_date);

  if (daysInProgram <= 30) {
    return maxTests;
  }

  if (daysInProgram <= 90) {
    const midpoint = Math.max(minTests, Math.ceil((minTests + maxTests) / 2));
    return randomInt(midpoint, maxTests);
  }

  return minTests;
}

export default function UaRandomizerPage() {
  const [providerId, setProviderId] = useState<string | null>(null);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState("");
  const [strategy, setStrategy] = useState<"random" | "length_of_stay">("random");
  const [startDate, setStartDate] = useState(todayDate());
  const [endDate, setEndDate] = useState(addDays(todayDate(), 30));
  const [minTests, setMinTests] = useState(1);
  const [maxTests, setMaxTests] = useState(2);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeResidents = residents.filter(
    (resident) =>
      String(resident.resident_status ?? "active").toLowerCase() === "active" &&
      (!selectedHouseId || resident.house_id === selectedHouseId)
  );

  useEffect(() => {
    let isMounted = true;

    Promise.resolve()
      .then(async () => {
        const activeProviderId = localStorage.getItem("current_provider_id");

        if (!activeProviderId) {
          throw new Error("No provider selected. Save or select a provider first.");
        }

        const supabase = getSupabaseClient();

        const residentsResult = await supabase
          .from("residents")
          .select("id, first_name, last_name, admission_date, house_id, resident_status")
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

        if (!isMounted) return;

        setProviderId(activeProviderId);
        setResidents((residentsResult.data ?? []) as ResidentRow[]);
        setHouses((housesResult.data ?? []) as HouseRow[]);
      })
      .catch((err: { message?: unknown }) => {
        if (!isMounted) return;
        setError(err?.message ? String(err.message) : "Could not load UA randomizer data.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function generatePreview() {
    setMessage("");
    setError("");

    if (activeResidents.length === 0) {
      setPreviewRows([]);
      setError("No active residents found for the selected house/filter.");
      return;
    }

    if (!startDate || !endDate || startDate > endDate) {
      setError("Enter a valid start and end date.");
      return;
    }

    if (minTests < 0 || maxTests < 1 || minTests > maxTests) {
      setError("Minimum and maximum test counts are not valid.");
      return;
    }

    const availableDates = dateRange(startDate, endDate);

    if (availableDates.length === 0) {
      setError("No dates available in the selected range.");
      return;
    }

    const rows: PreviewRow[] = [];

    activeResidents.forEach((resident) => {
      const requestedCount = testsForResident(resident, strategy, minTests, maxTests);
      const cappedCount = Math.min(requestedCount, availableDates.length);
      const selectedDates = shuffleValues(availableDates).slice(0, cappedCount).sort();

      selectedDates.forEach((scheduledDate) => {
        const daysInProgram = daysSinceAdmission(resident.admission_date);

        rows.push({
          resident_id: resident.id,
          resident_name: residentName(resident),
          house_id: resident.house_id,
          scheduled_date: scheduledDate,
          reason:
            strategy === "length_of_stay"
              ? `Length-of-stay weighted randomization. Days with provider: ${daysInProgram}.`
              : `Randomized between minimum ${minTests} and maximum ${maxTests} tests.`,
        });
      });
    });

    rows.sort((first, second) => {
      if (first.scheduled_date !== second.scheduled_date) {
        return first.scheduled_date.localeCompare(second.scheduled_date);
      }

      return first.resident_name.localeCompare(second.resident_name);
    });

    setPreviewRows(rows);
    setMessage(`Generated ${rows.length} scheduled UA item(s). Review, then save the schedule.`);
  }

  async function saveSchedule() {
    if (!providerId) {
      setError("No provider selected.");
      return;
    }

    if (previewRows.length === 0) {
      setError("Generate a preview before saving the schedule.");
      return;
    }

    setSavingSchedule(true);
    setMessage("");
    setError("");

    try {
      const supabase = getSupabaseClient();

      const { data: runData, error: runError } = await supabase
        .from("ua_randomizer_runs")
        .insert({
          provider_id: providerId,
          house_id: selectedHouseId || null,
          start_date: startDate,
          end_date: endDate,
          strategy,
          min_tests_per_resident: minTests,
          max_tests_per_resident: maxTests,
          generated_count: previewRows.length,
        })
        .select("id")
        .single();

      if (runError) {
        throw runError;
      }

      const scheduleRows = previewRows.map((row) => ({
        provider_id: providerId,
        run_id: runData.id,
        resident_id: row.resident_id,
        house_id: row.house_id,
        scheduled_date: row.scheduled_date,
        status: "scheduled",
        reason: row.reason,
      }));

      const { error: scheduleError } = await supabase
        .from("ua_randomizer_schedule")
        .insert(scheduleRows);

      if (scheduleError) {
        throw scheduleError;
      }

      setPreviewRows([]);
      setMessage(`UA schedule saved with ${scheduleRows.length} scheduled item(s).`);
    } catch (err) {
      const scheduleError = err as { message?: unknown };
      setError(scheduleError?.message ? String(scheduleError.message) : "Could not save UA schedule.");
    } finally {
      setSavingSchedule(false);
    }
  }

  return (
    <PageShell>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">UA/BA Workflow</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">UA Randomizer</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Generate randomized UA schedules for active residents by house, date range, and testing frequency.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-950">{activeResidents.length} active resident(s)</p>
            <p className="mt-1">Current filter: {selectedHouseId ? "Selected house" : "All active houses"}</p>
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
            Loading residents and houses...
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Schedule Settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose who should be randomized and how many UA dates should be generated.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">House filter</span>
              <div className="relative mt-2">
                <Home className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedHouseId}
                  onChange={(event) => {
                    setSelectedHouseId(event.target.value);
                    setPreviewRows([]);
                  }}
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
              <span className="text-sm font-medium text-slate-700">Randomizer type</span>
              <div className="relative mt-2">
                <Shuffle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={strategy}
                  onChange={(event) => {
                    setStrategy(event.target.value as "random" | "length_of_stay");
                    setPreviewRows([]);
                  }}
                  className="h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="random">Random by minimum / maximum</option>
                  <option value="length_of_stay">Weighted by length of stay</option>
                </select>
              </div>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setPreviewRows([]);
                  }}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">End date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setPreviewRows([]);
                  }}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Minimum per resident</span>
                <input
                  type="number"
                  min="0"
                  value={minTests}
                  onChange={(event) => {
                    setMinTests(Number(event.target.value));
                    setPreviewRows([]);
                  }}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Maximum per resident</span>
                <input
                  type="number"
                  min="1"
                  value={maxTests}
                  onChange={(event) => {
                    setMaxTests(Number(event.target.value));
                    setPreviewRows([]);
                  }}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={generatePreview}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Dice5 className="h-4 w-4" />
              Generate Schedule Preview
            </button>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Generated UA Schedule</h2>
              <p className="mt-1 text-sm text-slate-500">
                Preview the randomized schedule before saving it.
              </p>
            </div>

            <button
              type="button"
              onClick={saveSchedule}
              disabled={savingSchedule || previewRows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingSchedule ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingSchedule ? "Saving..." : "Save Schedule"}
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Residents</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{activeResidents.length}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Scheduled Items</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{previewRows.length}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Date Range</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {formatDate(startDate)} - {formatDate(endDate)}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {previewRows.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No schedule generated yet.
              </p>
            ) : (
              previewRows.map((row, index) => (
                <div key={`${row.resident_id}-${row.scheduled_date}-${index}`} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium text-slate-950">{row.resident_name}</p>
                      <p className="mt-1 text-sm text-slate-500">{row.reason}</p>
                    </div>

                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(row.scheduled_date)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Users className="mt-1 h-5 w-5 text-slate-600" />
          <div>
            <h2 className="text-lg font-semibold">How the randomizer works</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Random mode assigns each active resident a random number of UA dates between the minimum and maximum.
              Length-of-stay mode assigns newer residents closer to the maximum, residents between 31 and 90 days
              in the middle range, and longer-term residents closer to the minimum.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
