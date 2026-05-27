"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Home,
  Loader2,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

const reportTypes = [
  { value: "annual_fire_drill", label: "Annual Fire Drill", frequency: "Annual" },
  { value: "weekly_house_meeting_minutes", label: "Weekly House Meeting Minutes", frequency: "Weekly" },
  { value: "monthly_staff_meeting_minutes", label: "Monthly Staff/QI Meeting Minutes", frequency: "Monthly" },
  { value: "monthly_self_safety_assessment", label: "Monthly Self-Safety Assessment", frequency: "Monthly" },
  { value: "incident_reporting", label: "Incident Reporting", frequency: "As Needed" },
] as const;

type ReportType = (typeof reportTypes)[number]["value"];

type HouseDetail = {
  id: string;
  provider_id: string;
  name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  gender_served: string | null;
  farr_level: string | null;
  total_beds: number | null;
  status: string | null;
};

type ResidentRow = {
  id: string;
  first_name: string;
  last_name: string;
  admission_date: string | null;
  current_phase: string | null;
  rci_status: string | null;
  medication_status: string | null;
};

type ReportHouseTarget = {
  house_id: string;
};

type ProviderHouseReport = {
  id: string;
  provider_id: string;
  report_type: ReportType;
  report_date: string;
  applies_to_scope: "all_houses" | "single_house" | "selected_houses";
  house_id: string | null;
  completed_by: string | null;
  report_data: Record<string, unknown> | null;
  follow_up_needed: boolean;
  follow_up_notes: string | null;
  follow_up_resolved: boolean | null;
  follow_up_resolved_at: string | null;
  follow_up_resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  provider_house_report_houses?: ReportHouseTarget[] | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not entered";

  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Not entered";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function getReportLabel(reportType: string) {
  return reportTypes.find((type) => type.value === reportType)?.label ?? reportType.replaceAll("_", " ");
}

function getReportFrequency(reportType: string) {
  return reportTypes.find((type) => type.value === reportType)?.frequency ?? "Report";
}

function getNextDueDate(reportType: ReportType, lastReportDate: string | null) {
  if (!lastReportDate || reportType === "incident_reporting") return null;

  const lastDate = toDate(lastReportDate);

  if (reportType === "annual_fire_drill") return addYears(lastDate, 1);
  if (reportType === "weekly_house_meeting_minutes") return addDays(lastDate, 7);

  return addMonths(lastDate, 1);
}

function formatDueDate(value: Date | null) {
  if (!value) return "No report saved";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function getDueStatus(reportType: ReportType, lastReportDate: string | null) {
  if (reportType === "incident_reporting") {
    return {
      label: "As Needed",
      className: "bg-slate-100 text-slate-700 ring-slate-600/20",
      nextDueDate: null,
    };
  }

  const today = toDate(new Date().toISOString().slice(0, 10));
  const nextDueDate = getNextDueDate(reportType, lastReportDate);

  if (!nextDueDate) {
    return {
      label: "Due",
      className: "bg-rose-50 text-rose-700 ring-rose-600/20",
      nextDueDate,
    };
  }

  if (nextDueDate < today) {
    return {
      label: "Overdue",
      className: "bg-rose-50 text-rose-700 ring-rose-600/20",
      nextDueDate,
    };
  }

  if (nextDueDate <= addDays(today, 7)) {
    return {
      label: "Due Soon",
      className: "bg-amber-50 text-amber-700 ring-amber-600/20",
      nextDueDate,
    };
  }

  return {
    label: "Current",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    nextDueDate,
  };
}

function getReportTargetHouseIds(report: ProviderHouseReport) {
  const targetIds = (report.provider_house_report_houses ?? [])
    .map((target) => target.house_id)
    .filter(Boolean);

  if (targetIds.length > 0) return targetIds;
  if (report.house_id) return [report.house_id];

  return [];
}

function reportAppliesToHouse(report: ProviderHouseReport, houseId: string) {
  const targetIds = getReportTargetHouseIds(report);

  if (targetIds.length > 0) return targetIds.includes(houseId);
  if (report.applies_to_scope === "all_houses") return true;

  return report.house_id === houseId;
}

function formatReportValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "None selected";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  const text = String(value ?? "").trim();
  return text || "Not entered";
}

function DetailBlock({ title, value }: { title: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value || "Not entered"}</p>
    </div>
  );
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

export default function HouseDetailPage() {
  const params = useParams<{ id: string }>();
  const houseId = params.id;

  const [house, setHouse] = useState<HouseDetail | null>(null);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [reports, setReports] = useState<ProviderHouseReport[]>([]);
  const [selectedViewReport, setSelectedViewReport] = useState<ProviderHouseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHouseProfile() {
      try {
        const supabase = getSupabaseClient();

        const { data: houseData, error: houseError } = await supabase
          .from("houses")
          .select("*")
          .eq("id", houseId)
          .single();

        if (houseError) {
          throw houseError;
        }

        const loadedHouse = houseData as HouseDetail;
        setHouse(loadedHouse);

        const { data: residentData, error: residentError } = await supabase
          .from("residents")
          .select("id, first_name, last_name, admission_date, current_phase, rci_status, medication_status")
          .eq("house_id", houseId)
          .order("last_name", { ascending: true })
          .order("first_name", { ascending: true });

        if (residentError) {
          throw residentError;
        }

        const { data: reportData, error: reportError } = await supabase
          .from("provider_house_reports")
          .select(`
            *,
            provider_house_report_houses (
              house_id
            )
          `)
          .eq("provider_id", loadedHouse.provider_id)
          .order("report_date", { ascending: false })
          .order("created_at", { ascending: false });

        if (reportError) {
          throw reportError;
        }

        setResidents((residentData ?? []) as ResidentRow[]);
        setReports((reportData ?? []) as ProviderHouseReport[]);
      } catch (err) {
        const profileError = err as { message?: unknown };
        setError(profileError?.message ? String(profileError.message) : "Could not load house profile.");
      } finally {
        setLoading(false);
      }
    }

    void loadHouseProfile();
  }, [houseId]);

  const occupiedBeds = residents.length;
  const totalBeds = Number(house?.total_beds || 0);
  const availableBeds = Math.max(totalBeds - occupiedBeds, 0);

  const houseReports = useMemo(
    () => reports.filter((report) => reportAppliesToHouse(report, houseId)),
    [reports, houseId]
  );

  const openFollowUps = houseReports.filter((report) => report.follow_up_needed && !report.follow_up_resolved);

  function getReportsForType(reportType: ReportType) {
    return houseReports
      .filter((report) => report.report_type === reportType)
      .sort((first, second) => second.report_date.localeCompare(first.report_date));
  }

  function getReportHouseScope(report: ProviderHouseReport) {
    if (report.applies_to_scope === "all_houses") return "All houses";

    const targetIds = getReportTargetHouseIds(report);

    if (targetIds.length > 1) return "Multiple houses";
    if (targetIds.length === 1 || report.house_id) return house?.name ?? "This house";

    return "This house";
  }

  return (
    <PageShell>
      <Link
        href="/houses"
        className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to houses
      </Link>

      {loading ? (
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading house profile...
          </div>
        </section>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {!loading && house ? (
        <>
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
                  <Home className="h-10 w-10 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">House Profile</p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-tight">{house.name}</h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                    {[house.street_address, house.city, house.state, house.zip].filter(Boolean).join(", ") ||
                      "Address not complete"}
                  </p>
                </div>
              </div>

              <Link
                href="/residents"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <UserRound className="h-4 w-4" />
                Add / Manage Residents
              </Link>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetailBlock title="Total Beds" value={totalBeds} />
            <DetailBlock title="Occupied Beds" value={occupiedBeds} />
            <DetailBlock title="Available Beds" value={availableBeds} />
            <DetailBlock title="House Status" value={house.status} />
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">House Details</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DetailBlock title="Gender / Population" value={house.gender_served} />
              <DetailBlock title="FARR/NARR Level" value={house.farr_level} />
              <DetailBlock title="City" value={house.city} />
              <DetailBlock title="State" value={house.state} />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="House Reports" value={String(houseReports.length)} subtitle="Reports applying to this house" icon={ClipboardCheck} />
            <MetricCard title="Open Follow-Ups" value={String(openFollowUps.length)} subtitle="Unresolved report items" icon={AlertTriangle} />
            <MetricCard title="Residents" value={String(residents.length)} subtitle="Assigned to this house" icon={Users} />
            <MetricCard title="Available Beds" value={String(availableBeds)} subtitle="Based on assigned residents" icon={BedDouble} />
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Reports / Logs for This House</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Shows reports submitted for this house, multiple houses including this house, or all houses.
                </p>
              </div>

              <Link
                href="/reports"
                className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                <CalendarDays className="h-4 w-4" />
                Create / Manage Reports
              </Link>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {reportTypes.map((reportType) => {
                const reportsForType = getReportsForType(reportType.value);
                const latestReport = reportsForType[0] ?? null;
                const dueStatus = getDueStatus(reportType.value, latestReport?.report_date ?? null);
                const followUpCount = reportsForType.filter((report) => report.follow_up_needed && !report.follow_up_resolved).length;

                return (
                  <div key={reportType.value} className="rounded-2xl border bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-950">{reportType.label}</h3>
                        <p className="mt-1 text-sm text-slate-500">Frequency: {reportType.frequency}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Last completed: {latestReport ? formatDate(latestReport.report_date) : "None"}
                        </p>
                        {reportType.value !== "incident_reporting" ? (
                          <p className="mt-1 text-sm text-slate-500">
                            Next due: {formatDueDate(dueStatus.nextDueDate)}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-slate-500">
                            Total incidents: {reportsForType.length}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${dueStatus.className}`}>
                          {dueStatus.label}
                        </span>

                        {followUpCount > 0 ? (
                          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20">
                            {followUpCount} follow-up
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {reportsForType.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {reportsForType.slice(0, 3).map((report) => (
                          <div key={report.id} className="flex flex-col gap-2 rounded-xl bg-white p-3 text-sm md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="font-medium text-slate-950">{formatDate(report.report_date)}</p>
                              <p className="text-xs text-slate-500">
                                {getReportHouseScope(report)}
                                {report.completed_by ? ` • Completed by ${report.completed_by}` : ""}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedViewReport(report)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </button>
                          </div>
                        ))}

                        {reportsForType.length > 3 ? (
                          <p className="px-1 text-xs text-slate-500">
                            Showing 3 of {reportsForType.length}. Open Reports for the full history.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-500">
                        No reports saved for this house yet.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Residents in This House</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Residents assigned to {house.name}.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                <Users className="h-4 w-4" />
                {residents.length} resident(s)
              </div>
            </div>

            {residents.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-950">No residents assigned yet.</p>
                <p className="mt-1 text-sm text-slate-500">
                  Assign residents to this house from the Residents page.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {residents.map((resident) => (
                  <Link
                    key={resident.id}
                    href={`/residents/${resident.id}`}
                    className="rounded-2xl bg-slate-50 p-4 transition hover:bg-slate-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">
                          {resident.first_name} {resident.last_name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Assigned to this house
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Phase: {resident.current_phase || "Not selected"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Admission: {formatDate(resident.admission_date)}
                        </p>
                      </div>

                      <BedDouble className="h-5 w-5 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      {selectedViewReport ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-4">
          <div className="my-8 w-full max-w-5xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Submitted Report</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                  {getReportLabel(selectedViewReport.report_type)}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {formatDate(selectedViewReport.report_date)} • {getReportHouseScope(selectedViewReport)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedViewReport(null)}
                className="rounded-xl border bg-white p-2 hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <p className="rounded-xl bg-slate-50 p-3 text-sm">
                <span className="font-medium text-slate-700">Completed by:</span>{" "}
                {selectedViewReport.completed_by ?? "Not entered"}
              </p>
              <p className="rounded-xl bg-slate-50 p-3 text-sm">
                <span className="font-medium text-slate-700">Follow-up:</span>{" "}
                {selectedViewReport.follow_up_needed
                  ? selectedViewReport.follow_up_resolved
                    ? "Resolved"
                    : "Needed"
                  : "Not needed"}
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {Object.entries(selectedViewReport.report_data ?? {}).map(([key, value]) => {
                if (key === "resident_attendance" && Array.isArray(value)) {
                  return (
                    <div key={key} className="rounded-xl border bg-slate-50 p-3 text-sm md:col-span-2">
                      <p className="font-medium text-slate-700">Resident Attendance</p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {(value as { resident_name?: string; present?: boolean }[]).map((item, index) => (
                          <p key={`${item.resident_name}-${index}`} className="rounded-xl bg-white p-3 text-sm">
                            {item.present ? "Present" : "Absent"}: {item.resident_name ?? "Resident"}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={key} className="rounded-xl border bg-slate-50 p-3 text-sm">
                    <p className="font-medium capitalize text-slate-700">{key.replaceAll("_", " ")}</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-600">
                      {formatReportValue(value)}
                    </p>
                  </div>
                );
              })}
            </div>

            {selectedViewReport.follow_up_notes ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-medium">Follow-up notes</p>
                <p className="mt-1 whitespace-pre-wrap">{selectedViewReport.follow_up_notes}</p>
              </div>
            ) : null}

            {selectedViewReport.follow_up_resolution_notes ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <p className="font-medium">Resolution notes</p>
                <p className="mt-1 whitespace-pre-wrap">{selectedViewReport.follow_up_resolution_notes}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
