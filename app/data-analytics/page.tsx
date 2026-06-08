"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Download,
  Loader2,
  ShieldCheck,
  Users,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

type ProviderRow = {
  id: string;
  legal_name: string | null;
};

type HouseRow = {
  id: string;
  name: string;
  total_beds: number | null;
  status: string | null;
};

type ResidentRow = {
  id: string;
  provider_id: string;
  house_id: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  admission_date: string | null;
  resident_status: string | null;
  discharge_date: string | null;
  discharge_reason: string | null;
  discharge_notes: string | null;
  gender: string | null;
  ethnicity: string | null;
  sobriety_date: string | null;
  drug_of_choice: string | null;
  referral_resource: string | null;
  high_alert: boolean | null;
  high_alert_detail: string | null;
  active_probation_officer: boolean | null;
  active_mental_health_court: boolean | null;
  active_drug_court: boolean | null;
  discharge_satisfaction_survey_completed: boolean | null;
  discharge_satisfaction_survey_rating: number | null;
  discharge_satisfaction_survey_notes: string | null;
  discharge_satisfaction_survey_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type CountRow = {
  label: string;
  count: number;
};

function formatLabel(value: string | null | undefined) {
  if (!value) return "Not entered";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null | undefined) {
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

function truncateText(value: string | null | undefined, maxLength = 120) {
  const cleanValue = value?.trim();

  if (!cleanValue) return "No notes entered";
  if (cleanValue.length <= maxLength) return cleanValue;

  return `${cleanValue.slice(0, maxLength).trim()}...`;
}

function getDateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function parseLocalDate(value: string | null | undefined) {
  if (!value) return null;

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function calculateAge(dateOfBirth: string | null) {
  const birthDate = parseLocalDate(dateOfBirth);
  if (!birthDate) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function daysBetween(startValue: string | null | undefined, endValue: string | null | undefined) {
  const start = parseLocalDate(startValue);
  const end = parseLocalDate(endValue) ?? new Date();

  if (!start) return null;

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const days = Math.round((end.getTime() - start.getTime()) / millisecondsPerDay);

  return days >= 0 ? days : null;
}

function average(values: number[]) {
  if (values.length === 0) return 0;

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function countByLabel(labels: string[]) {
  const counts = new Map<string, number>();

  labels.forEach((label) => {
    const cleanLabel = label.trim() || "Not entered";
    counts.set(cleanLabel, (counts.get(cleanLabel) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label));
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Users;
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
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </div>
  );
}

function CountTable({
  title,
  rows,
}: {
  title: string;
  rows: CountRow[];
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          No data available.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3 font-semibold">Category</th>
                <th className="px-3 py-3 text-right font-semibold">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.label} className="bg-white">
                  <td className="px-3 py-3 text-slate-700">{row.label}</td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-950">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DataAnalyticsPage() {
  const [provider, setProvider] = useState<ProviderRow | null>(null);
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [residents, setResidents] = useState<ResidentRow[]>([]);

  const [houseFilter, setHouseFilter] = useState("all");
  const [residentStatusFilter, setResidentStatusFilter] = useState("all");
  const [dateBasis, setDateBasis] = useState<"admission_date" | "discharge_date" | "created_at">("admission_date");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const houseNameById = useMemo(() => {
    return new Map(houses.map((house) => [house.id, house.name]));
  }, [houses]);

  const activeHouses = useMemo(
    () => houses.filter((house) => String(house.status ?? "active").toLowerCase() !== "inactive"),
    [houses]
  );

  const filteredResidents = useMemo(() => {
    return residents.filter((resident) => {
      const status = String(resident.resident_status ?? "active").toLowerCase();
      const basisDate = getDateOnly(resident[dateBasis]);

      const matchesHouse = houseFilter === "all" || resident.house_id === houseFilter;
      const matchesStatus = residentStatusFilter === "all" || status === residentStatusFilter;
      const matchesStart = !dateStart || (basisDate && basisDate >= dateStart);
      const matchesEnd = !dateEnd || (basisDate && basisDate <= dateEnd);

      return matchesHouse && matchesStatus && matchesStart && matchesEnd;
    });
  }, [residents, houseFilter, residentStatusFilter, dateBasis, dateStart, dateEnd]);

  const activeResidents = useMemo(
    () => filteredResidents.filter((resident) => String(resident.resident_status ?? "active").toLowerCase() === "active"),
    [filteredResidents]
  );

  const dischargedResidents = useMemo(
    () => filteredResidents.filter((resident) => String(resident.resident_status ?? "").toLowerCase() === "discharged"),
    [filteredResidents]
  );

  const ageBuckets = useMemo(() => {
    const buckets = {
      "Under 18": 0,
      "18-24": 0,
      "25-34": 0,
      "35-44": 0,
      "45-54": 0,
      "55+": 0,
      "Unknown": 0,
    };

    filteredResidents.forEach((resident) => {
      const age = calculateAge(resident.date_of_birth);

      if (age === null) {
        buckets.Unknown += 1;
      } else if (age < 18) {
        buckets["Under 18"] += 1;
      } else if (age <= 24) {
        buckets["18-24"] += 1;
      } else if (age <= 34) {
        buckets["25-34"] += 1;
      } else if (age <= 44) {
        buckets["35-44"] += 1;
      } else if (age <= 54) {
        buckets["45-54"] += 1;
      } else {
        buckets["55+"] += 1;
      }
    });

    return Object.entries(buckets).map(([label, count]) => ({ label, count }));
  }, [filteredResidents]);

  const genderCounts = useMemo(
    () => countByLabel(filteredResidents.map((resident) => formatLabel(resident.gender))),
    [filteredResidents]
  );

  const ethnicityCounts = useMemo(
    () => countByLabel(filteredResidents.map((resident) => formatLabel(resident.ethnicity))),
    [filteredResidents]
  );

  const drugOfChoiceCounts = useMemo(
    () => countByLabel(filteredResidents.map((resident) => formatLabel(resident.drug_of_choice))),
    [filteredResidents]
  );

  const referralCounts = useMemo(
    () => countByLabel(filteredResidents.map((resident) => formatLabel(resident.referral_resource))),
    [filteredResidents]
  );

  const docCounts = useMemo(() => {
    const probation = filteredResidents.filter((resident) => resident.active_probation_officer).length;
    const mentalHealthCourt = filteredResidents.filter((resident) => resident.active_mental_health_court).length;
    const drugCourt = filteredResidents.filter((resident) => resident.active_drug_court).length;
    const anyDoc = filteredResidents.filter(
      (resident) =>
        resident.active_probation_officer ||
        resident.active_mental_health_court ||
        resident.active_drug_court
    ).length;

    return [
      { label: "Active probation officer", count: probation },
      { label: "Active mental health court", count: mentalHealthCourt },
      { label: "Active drug court", count: drugCourt },
      { label: "Any DOC / court involvement", count: anyDoc },
      { label: "No DOC / court flag", count: Math.max(filteredResidents.length - anyDoc, 0) },
    ];
  }, [filteredResidents]);

  const dischargeReasonCounts = useMemo(
    () => countByLabel(dischargedResidents.map((resident) => formatLabel(resident.discharge_reason))),
    [dischargedResidents]
  );

  const lengthOfStayStats = useMemo(() => {
    const dischargedDays = dischargedResidents
      .map((resident) => daysBetween(resident.admission_date, resident.discharge_date))
      .filter((value): value is number => value !== null);

    const activeDays = activeResidents
      .map((resident) => daysBetween(resident.admission_date, null))
      .filter((value): value is number => value !== null);

    const allDays = [...dischargedDays, ...activeDays];

    return {
      dischargedAverage: average(dischargedDays),
      activeAverage: average(activeDays),
      allAverage: average(allDays),
      dischargedCount: dischargedDays.length,
      activeCount: activeDays.length,
    };
  }, [activeResidents, dischargedResidents]);


  const dischargeSatisfactionStats = useMemo(() => {
    const eligibleResidents = dischargedResidents;
    const completedResidents = eligibleResidents.filter(
      (resident) => resident.discharge_satisfaction_survey_completed
    );

    const ratings = completedResidents
      .map((resident) => Number(resident.discharge_satisfaction_survey_rating))
      .filter((rating) => Number.isFinite(rating) && rating > 0);

    const averageRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
        : 0;

    const completionRate =
      eligibleResidents.length > 0
        ? Math.round((completedResidents.length / eligibleResidents.length) * 100)
        : 0;

    const recentResponses = completedResidents
      .filter(
        (resident) =>
          resident.discharge_satisfaction_survey_rating ||
          resident.discharge_satisfaction_survey_notes ||
          resident.discharge_satisfaction_survey_completed_at
      )
      .sort((first, second) =>
        String(second.discharge_satisfaction_survey_completed_at ?? second.updated_at ?? "").localeCompare(
          String(first.discharge_satisfaction_survey_completed_at ?? first.updated_at ?? "")
        )
      )
      .slice(0, 8);

    return {
      eligibleCount: eligibleResidents.length,
      completedCount: completedResidents.length,
      completionRate,
      averageRating,
      ratedCount: ratings.length,
      recentResponses,
    };
  }, [dischargedResidents]);

  async function loadData(activeProviderId: string) {
    const supabase = getSupabaseClient() as any;

    const providerResult = await supabase
      .from("providers")
      .select("id, legal_name")
      .eq("id", activeProviderId)
      .single();

    const housesResult = await supabase
      .from("houses")
      .select("id, name, total_beds, status")
      .eq("provider_id", activeProviderId)
      .order("name", { ascending: true });

    const residentsResult = await supabase
      .from("residents")
      .select("id, provider_id, house_id, first_name, last_name, date_of_birth, admission_date, resident_status, discharge_date, discharge_reason, discharge_notes, gender, ethnicity, sobriety_date, drug_of_choice, referral_resource, high_alert, high_alert_detail, active_probation_officer, active_mental_health_court, active_drug_court, discharge_satisfaction_survey_completed, discharge_satisfaction_survey_rating, discharge_satisfaction_survey_notes, discharge_satisfaction_survey_completed_at, created_at, updated_at")
      .eq("provider_id", activeProviderId)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (providerResult.error) throw providerResult.error;
    if (housesResult.error) throw housesResult.error;
    if (residentsResult.error) throw residentsResult.error;

    setProvider(providerResult.data as ProviderRow);
    setHouses((housesResult.data ?? []) as HouseRow[]);
    setResidents((residentsResult.data ?? []) as ResidentRow[]);
  }

  useEffect(() => {
    async function initialize() {
      try {
        setLoading(true);
        setError("");

        const supabase = getSupabaseClient() as any;
        let activeProviderId: string | null =
          localStorage.getItem("current_provider_id") ||
          localStorage.getItem("activeProviderId");

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
        localStorage.setItem("activeProviderId", activeProviderId);
        await loadData(activeProviderId);
      } catch (err) {
        const loadError = err as { message?: unknown };
        setError(loadError?.message ? String(loadError.message) : "Could not load data analytics.");
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, []);

  function getHouseName(houseId: string | null | undefined) {
    if (!houseId) return "Not assigned";

    return houseNameById.get(houseId) ?? "Unknown house";
  }

  function exportResidentDataCsv() {
    const headers = [
      "Resident",
      "House",
      "Status",
      "Gender",
      "Ethnicity",
      "Age",
      "Admission Date",
      "Discharge Date",
      "Discharge Reason",
      "Length of Stay Days",
      "Survey Completed",
      "Survey Rating",
      "Survey Completed At",
      "Survey Notes",
      "Drug of Choice",
      "Referral Resource",
      "Probation Officer",
      "Mental Health Court",
      "Drug Court",
    ];

    const rows = filteredResidents.map((resident) => [
      `${resident.first_name} ${resident.last_name}`,
      getHouseName(resident.house_id),
      formatLabel(resident.resident_status),
      formatLabel(resident.gender),
      formatLabel(resident.ethnicity),
      calculateAge(resident.date_of_birth) ?? "",
      formatDate(resident.admission_date),
      formatDate(resident.discharge_date),
      formatLabel(resident.discharge_reason),
      daysBetween(resident.admission_date, resident.discharge_date),
      resident.discharge_satisfaction_survey_completed ? "Yes" : "No",
      resident.discharge_satisfaction_survey_rating ?? "",
      formatDate(resident.discharge_satisfaction_survey_completed_at),
      resident.discharge_satisfaction_survey_notes ?? "",
      formatLabel(resident.drug_of_choice),
      formatLabel(resident.referral_resource),
      resident.active_probation_officer ? "Yes" : "No",
      resident.active_mental_health_court ? "Yes" : "No",
      resident.active_drug_court ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `resident-data-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <PageShell>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
              <BarChart3 className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Data / Analytics</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                Operational Data Dashboard
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Review resident census, demographics, discharge trends, length of stay, recovery-related indicators, and program outcomes in one place.
              </p>
              {provider ? (
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Provider: {provider.legal_name ?? "Current Provider"}
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={exportResidentDataCsv}
            disabled={filteredResidents.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Export Resident Data
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">House</span>
            <select
              value={houseFilter}
              onChange={(event) => setHouseFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            >
              <option value="all">All houses</option>
              {activeHouses.map((house) => (
                <option key={house.id} value={house.id}>
                  {house.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Resident status</span>
            <select
              value={residentStatusFilter}
              onChange={(event) => setResidentStatusFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            >
              <option value="all">All residents</option>
              <option value="active">Active residents</option>
              <option value="discharged">Discharged residents</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Date basis</span>
            <select
              value={dateBasis}
              onChange={(event) => setDateBasis(event.target.value as "admission_date" | "discharge_date" | "created_at")}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            >
              <option value="admission_date">Admission date</option>
              <option value="discharge_date">Discharge date</option>
              <option value="created_at">Created date</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Date start</span>
            <input
              type="date"
              value={dateStart}
              onChange={(event) => setDateStart(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Date end</span>
            <input
              type="date"
              value={dateEnd}
              onChange={(event) => setDateEnd(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            />
          </label>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border bg-white p-5 text-sm text-slate-500 shadow-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading data analytics...
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Residents in View"
          value={String(filteredResidents.length)}
          subtitle={`${activeResidents.length} active • ${dischargedResidents.length} discharged`}
          icon={Users}
        />
        <StatCard
          title="Total Beds"
          value={String(houses.reduce((sum, house) => sum + Number(house.total_beds || 0), 0))}
          subtitle={`${activeHouses.length} active houses`}
          icon={ShieldCheck}
        />
        <StatCard
          title="Average LOS"
          value={`${lengthOfStayStats.allAverage} days`}
          subtitle={`${lengthOfStayStats.activeCount} active • ${lengthOfStayStats.dischargedCount} discharged`}
          icon={CalendarDays}
        />
        <StatCard
          title="Discharged Residents"
          value={String(dischargedResidents.length)}
          subtitle="Discharged residents in selected view"
          icon={BarChart3}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CountTable title="Demographics: Gender" rows={genderCounts} />
        <CountTable title="Demographics: Ethnicity" rows={ethnicityCounts} />
        <CountTable title="Age Ranges" rows={ageBuckets} />
        <CountTable title="DOC / Court Involvement" rows={docCounts} />
        <CountTable title="Drug of Choice" rows={drugOfChoiceCounts} />
        <CountTable title="Referral Resources" rows={referralCounts} />
        <CountTable title="Discharge Types / Reasons" rows={dischargeReasonCounts} />
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-950">Average Length of Stay</h3>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Discharged residents</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{lengthOfStayStats.dischargedAverage} days</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Currently active residents</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{lengthOfStayStats.activeAverage} days</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Combined average</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{lengthOfStayStats.allAverage} days</p>
            </div>
          </div>
        </div>
      </section>

    </PageShell>
  );
}
