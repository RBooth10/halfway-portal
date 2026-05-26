"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FolderOpen,
  Home,
  Loader2,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

const reportTypes = [
  { value: "annual_fire_drill", label: "Annual Fire Drill", frequency: "Annual" },
  { value: "weekly_house_meeting_minutes", label: "Weekly House Meeting Minutes", frequency: "Weekly" },
  { value: "monthly_staff_meeting_minutes", label: "Monthly Staff/QI Meeting Minutes", frequency: "Monthly" },
  { value: "monthly_self_safety_assessment", label: "Monthly Self-Safety Assessment", frequency: "Monthly" },
] as const;

type ReportType = (typeof reportTypes)[number]["value"];

type Counts = {
  providerName: string;
  houses: number;
  beds: number;
  staff: number;
  residents: number;
  documents: number;
  uploadedDocuments: number;
  providerReports: number;
};

type HouseRow = {
  id: string;
  name: string;
  total_beds: number | null;
  status: string | null;
};

type ResidentRow = {
  id: string;
  first_name: string;
  last_name: string;
  house_id: string | null;
  resident_status: string | null;
};

type ReportHouseTarget = {
  house_id: string;
};

type ReportJson = Record<string, unknown>;

type ProviderHouseReport = {
  id: string;
  provider_id: string;
  report_type: ReportType;
  report_date: string;
  applies_to_scope: "all_houses" | "single_house" | "selected_houses";
  house_id: string | null;
  completed_by: string | null;
  report_data: ReportJson | null;
  follow_up_needed: boolean;
  follow_up_notes: string | null;
  created_at: string;
  updated_at: string;
  provider_house_report_houses?: ReportHouseTarget[] | null;
};

type ReportForm = {
  report_date: string;
  completed_by: string;
  follow_up_needed: boolean;
  follow_up_notes: string;
  report_data: Record<string, string>;
};

const emptyCounts: Counts = {
  providerName: "Current Provider",
  houses: 0,
  beds: 0,
  staff: 0,
  residents: 0,
  documents: 0,
  uploadedDocuments: 0,
  providerReports: 0,
};

const initialForm: ReportForm = {
  report_date: new Date().toISOString().slice(0, 10),
  completed_by: "",
  follow_up_needed: false,
  follow_up_notes: "",
  report_data: {},
};

const reportFields: Record<ReportType, { key: string; label: string; placeholder: string }[]> = {
  annual_fire_drill: [
    { key: "house_name_address", label: "House name / address", placeholder: "Confirm the house name and address where the drill occurred." },
    { key: "start_time", label: "Start time", placeholder: "Example: 10:30 AM" },
    { key: "end_time", label: "End time", placeholder: "Example: 10:36 AM" },
    { key: "safety_monitor_name", label: "Safety monitor's name", placeholder: "Name of person monitoring the drill." },
    { key: "number_of_participants", label: "Number of participants", placeholder: "Total residents/staff who participated." },
    { key: "meeting_point", label: "Meeting point", placeholder: "Designated evacuation meeting location." },
    { key: "summary_of_drill", label: "Summary of drill", placeholder: "Summarize how the drill was conducted and whether everyone followed the evacuation plan." },
    { key: "barriers_obstacles", label: "Barriers / obstacles noted", placeholder: "Document blocked exits, confusion, delayed response, missing participants, or other barriers." },
    { key: "areas_of_improvement", label: "Areas of improvement", placeholder: "Document training needs, signage needs, timing concerns, or corrective steps." },
    { key: "notes_to_provider", label: "Notes to the provider", placeholder: "Provider-level notes or follow-up needed." },
    { key: "safety_monitor_signature", label: "Safety monitor signature", placeholder: "Typed name/signature of safety monitor." },
  ],
  weekly_house_meeting_minutes: [
    { key: "location", label: "Location", placeholder: "House/location where the meeting was held." },
    { key: "resident_meeting_attendance_notes", label: "Attendance notes", placeholder: "Note missing/incomplete meeting sheets or attendance follow-up." },
    { key: "sponsorship_requirement", label: "Sponsorship requirement", placeholder: "Document sponsorship status updates, challenges, noncompliance, or sponsor changes." },
    { key: "recovery_plan_review", label: "Recovery plan review", placeholder: "Document resident progress, setbacks, barriers, and assistance requested." },
    { key: "house_maintenance_requests", label: "House maintenance requests", placeholder: "List maintenance issues reported and completion status or repair plan." },
    { key: "general_observations", label: "General observations", placeholder: "Document chores, supply needs, upkeep concerns, and general house observations." },
    { key: "resident_concerns_successes", label: "Resident concerns or successes", placeholder: "Document altercations, complaints, concerns, personal wins, or positive milestones." },
    { key: "staff_concerns_acknowledgments", label: "Staff concerns or acknowledgments", placeholder: "Staff notes about the residence, individual concerns, achievements, phase-ups, or behavioral concerns." },
  ],
  monthly_staff_meeting_minutes: [
    { key: "facilitator", label: "Facilitator", placeholder: "Name of meeting facilitator." },
    { key: "recorder", label: "Recorder", placeholder: "Name of person recording minutes." },
    { key: "staff_present", label: "Staff present", placeholder: "List staff present." },
    { key: "absent_staff", label: "Absent staff", placeholder: "List absent staff, if any." },
    { key: "residents_participating", label: "Residents participating, if applicable", placeholder: "List residents participating or note not applicable." },
    { key: "prior_month_action_items", label: "Review of prior month's action items", placeholder: "Action item, responsible party, status, and notes." },
    { key: "program_developments", label: "Program developments", placeholder: "Document program updates or operational changes." },
    { key: "staff_updates", label: "Staff updates", placeholder: "Document staffing updates, training, role changes, or concerns." },
    { key: "incident_report_review", label: "Review of incident reports", placeholder: "Summarize incidents without resident names, discussion points, and corrective actions." },
    { key: "discharges_resident_feedback", label: "Discharges and resident feedback", placeholder: "Number of discharges, types, resident feedback, surveys, exit interviews, and improvement opportunities." },
    { key: "property_maintenance_issues", label: "Property and maintenance issues", placeholder: "Maintenance concerns identified, actions taken or needed, and status." },
    { key: "resident_progress_review", label: "Resident progress review", placeholder: "General trends, successes, barriers, areas of concern, or positive growth." },
    { key: "financial_admin_review", label: "Financial and administrative review", placeholder: "Notable financial trends, charges, refunds, third-party payers, or discrepancies." },
    { key: "house_meeting_feedback", label: "Resident feedback from house meetings", placeholder: "Resident suggestions or themes from house meetings." },
  ],
  monthly_self_safety_assessment: [
    { key: "smoke_detectors_fire_extinguishers", label: "Smoke detectors / fire extinguishers", placeholder: "Document alarms on each level/sleeping area, monthly testing/cleaning, batteries, age, and extinguisher status." },
    { key: "cooking_safety", label: "Cooking safety", placeholder: "Document cooking area hazards, stove hood condition, unattended pots, and kitchen/fridge/microwave/oven cleanliness." },
    { key: "electrical_appliance_safety", label: "Electrical and appliance safety", placeholder: "Document cords, adapters, appliances, dryer lint/venting, and appliance condition." },
    { key: "gas_appliance_carbon_monoxide", label: "Gas appliances / carbon monoxide", placeholder: "If applicable, document carbon monoxide alarms on each level and alarm age." },
    { key: "smoking_safety", label: "Smoking safety", placeholder: "Document smoke-free environment, designated smoking area, cigarette butt disposal, ashtray safety, and fire-proof disposal." },
    { key: "heating_safety", label: "Heating safety", placeholder: "Document chimney/furnace inspection, clearance from heaters/fireplaces, ash disposal, extension cord use, and heater safety." },
    { key: "home_escape_plan", label: "Home escape plan", placeholder: "Document two exits from sleeping rooms, meeting place, fire escape practice, and evacuation maps posted." },
    { key: "resident_safety_farr_compliance", label: "Resident safety / FARR compliance", placeholder: "Document resident rights, grievance policy, emergency numbers/procedures, training, and Narcan availability." },
    { key: "not_applicable_items", label: "Items marked not applicable", placeholder: "List any safety items marked not applicable and why." },
    { key: "person_completing", label: "Person completing assessment", placeholder: "Typed name/signature of person completing the assessment." },
  ],
};

function getReportLabel(reportType: string) {
  return reportTypes.find((type) => type.value === reportType)?.label ?? reportType.replaceAll("_", " ");
}

function getReportFrequency(reportType: string) {
  return reportTypes.find((type) => type.value === reportType)?.frequency ?? "Report";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not entered";

  const date = new Date(`${value}T00:00:00`);
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

function getNextDueDate(reportType: ReportType, lastReportDate: string | null) {
  if (!lastReportDate) return null;

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

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
      />
    </label>
  );
}

export default function ReportsPage() {
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [reports, setReports] = useState<ProviderHouseReport[]>([]);
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
  const [savedReportsTab, setSavedReportsTab] = useState<ReportType>("annual_fire_drill");
  const [selectedHouseIds, setSelectedHouseIds] = useState<string[]>([]);
  const [residentAttendance, setResidentAttendance] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<ReportForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeHouses = useMemo(
    () => houses.filter((house) => String(house.status ?? "active").toLowerCase() !== "inactive"),
    [houses]
  );

  const selectedHouseResidents = useMemo(
    () =>
      residents
        .filter((resident) => resident.house_id && selectedHouseIds.includes(resident.house_id))
        .filter((resident) => resident.resident_status !== "discharged")
        .sort((first, second) =>
          `${first.last_name}, ${first.first_name}`.localeCompare(`${second.last_name}, ${second.first_name}`)
        ),
    [residents, selectedHouseIds]
  );

  const filteredReports = useMemo(
    () => reports.filter((report) => report.report_type === savedReportsTab),
    [reports, savedReportsTab]
  );

  useEffect(() => {
    if (!selectedReportType || selectedReportType !== "weekly_house_meeting_minutes") {
      setResidentAttendance({});
      return;
    }

    setResidentAttendance((current) => {
      const next: Record<string, boolean> = {};

      selectedHouseResidents.forEach((resident) => {
        next[resident.id] = current[resident.id] ?? true;
      });

      return next;
    });
  }, [selectedReportType, selectedHouseResidents]);

  async function loadReports(activeProviderId: string) {
    const supabase = getSupabaseClient();

    const providerResult = await supabase
      .from("providers")
      .select("legal_name")
      .eq("id", activeProviderId)
      .single();

    const housesResult = await supabase
      .from("houses")
      .select("id, name, total_beds, status")
      .eq("provider_id", activeProviderId)
      .order("name", { ascending: true });

    const staffResult = await supabase
      .from("staff_profiles")
      .select("id")
      .eq("provider_id", activeProviderId);

    const residentsResult = await supabase
      .from("residents")
      .select("id, first_name, last_name, house_id, resident_status")
      .eq("provider_id", activeProviderId)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    const documentsResult = await supabase
      .from("documents")
      .select("id, status")
      .eq("provider_id", activeProviderId);

    const reportsResult = await supabase
      .from("provider_house_reports")
      .select(`
        *,
        provider_house_report_houses (
          house_id
        )
      `)
      .eq("provider_id", activeProviderId)
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (providerResult.error) throw providerResult.error;
    if (housesResult.error) throw housesResult.error;
    if (staffResult.error) throw staffResult.error;
    if (residentsResult.error) throw residentsResult.error;
    if (documentsResult.error) throw documentsResult.error;
    if (reportsResult.error) throw reportsResult.error;

    const loadedHouses = (housesResult.data ?? []) as HouseRow[];
    const loadedResidents = (residentsResult.data ?? []) as ResidentRow[];
    const staff = staffResult.data ?? [];
    const documents = documentsResult.data ?? [];
    const loadedReports = (reportsResult.data ?? []) as ProviderHouseReport[];

    setHouses(loadedHouses);
    setResidents(loadedResidents);
    setReports(loadedReports);
    setCounts({
      providerName: providerResult.data?.legal_name ?? "Current Provider",
      houses: loadedHouses.length,
      beds: loadedHouses.reduce((sum, house) => sum + Number(house.total_beds || 0), 0),
      staff: staff.length,
      residents: loadedResidents.length,
      documents: documents.length,
      uploadedDocuments: documents.filter((doc) => doc.status === "uploaded").length,
      providerReports: loadedReports.length,
    });
  }

  useEffect(() => {
    async function initialize() {
      try {
        const supabase = getSupabaseClient();

        let activeProviderId = localStorage.getItem("current_provider_id");

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
        await loadReports(activeProviderId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load reports.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, []);

  function updateForm<K extends keyof ReportForm>(field: K, value: ReportForm[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateReportDataField(field: string, value: string) {
    setForm((current) => ({
      ...current,
      report_data: {
        ...current.report_data,
        [field]: value,
      },
    }));
  }

  function toggleHouse(houseId: string) {
    setSelectedHouseIds((current) =>
      current.includes(houseId)
        ? current.filter((id) => id !== houseId)
        : [...current, houseId]
    );
  }

  function toggleAllHouses() {
    if (selectedHouseIds.length === activeHouses.length) {
      setSelectedHouseIds([]);
      return;
    }

    setSelectedHouseIds(activeHouses.map((house) => house.id));
  }

  function toggleResidentAttendance(residentId: string) {
    setResidentAttendance((current) => ({
      ...current,
      [residentId]: !current[residentId],
    }));
  }

  function getHouseName(houseId: string | null) {
    if (!houseId) return "Multiple houses";

    return houses.find((house) => house.id === houseId)?.name ?? "Selected house";
  }

  function getReportHouseNames(report: ProviderHouseReport) {
    const targetIds = getReportTargetHouseIds(report);

    if (targetIds.length === 0 && report.applies_to_scope === "all_houses") {
      return "All houses";
    }

    if (targetIds.length === 0) {
      return getHouseName(report.house_id);
    }

    if (targetIds.length === activeHouses.length) {
      return "All houses";
    }

    return targetIds
      .map((houseId) => houses.find((house) => house.id === houseId)?.name)
      .filter(Boolean)
      .join(", ");
  }

  function getLastReportForHouse(houseId: string, reportType: ReportType) {
    return (
      reports
        .filter((report) => report.report_type === reportType)
        .filter((report) => {
          const targetIds = getReportTargetHouseIds(report);

          if (targetIds.length > 0) {
            return targetIds.includes(houseId);
          }

          return report.applies_to_scope === "all_houses" || report.house_id === houseId;
        })
        .sort((first, second) => second.report_date.localeCompare(first.report_date))[0] ?? null
    );
  }

  async function saveReport() {
    setSaving(true);
    setMessage("");
    setError("");

    if (!providerId) {
      setSaving(false);
      setError("No provider selected. Save a provider profile first.");
      return;
    }

    if (!selectedReportType) {
      setSaving(false);
      setError("Select a report type before saving.");
      return;
    }

    if (selectedHouseIds.length === 0) {
      setSaving(false);
      setError("Select at least one house for this report.");
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { data: userData } = await supabase.auth.getUser();

      const reportScope =
        selectedHouseIds.length === activeHouses.length
          ? "all_houses"
          : selectedHouseIds.length === 1
            ? "single_house"
            : "selected_houses";

      const residentAttendanceData =
        selectedReportType === "weekly_house_meeting_minutes"
          ? selectedHouseResidents.map((resident) => ({
              resident_id: resident.id,
              resident_name: `${resident.first_name} ${resident.last_name}`,
              house_id: resident.house_id,
              present: residentAttendance[resident.id] ?? false,
            }))
          : [];

      const fullReportData: ReportJson = {
        ...form.report_data,
        ...(selectedReportType === "weekly_house_meeting_minutes"
          ? { resident_attendance: residentAttendanceData }
          : {}),
      };

      const { data, error: insertError } = await supabase
        .from("provider_house_reports")
        .insert({
          provider_id: providerId,
          report_type: selectedReportType,
          report_date: form.report_date,
          applies_to_scope: reportScope,
          house_id: selectedHouseIds.length === 1 ? selectedHouseIds[0] : null,
          completed_by: form.completed_by.trim() || null,
          report_data: fullReportData,
          follow_up_needed: form.follow_up_needed,
          follow_up_notes: form.follow_up_notes.trim() || null,
          created_by_auth_user_id: userData.user?.id ?? null,
        })
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      const targetInsertResult = await supabase
        .from("provider_house_report_houses")
        .insert(
          selectedHouseIds.map((houseId) => ({
            provider_id: providerId,
            report_id: data.id,
            house_id: houseId,
          }))
        );

      if (targetInsertResult.error) {
        throw targetInsertResult.error;
      }

      setForm({
        ...initialForm,
        report_date: new Date().toISOString().slice(0, 10),
      });
      setSelectedHouseIds([]);
      setResidentAttendance({});
      setMessage(`${getReportLabel(selectedReportType)} saved successfully.`);
      await loadReports(providerId);
    } catch (err) {
      const reportError = err as { message?: unknown };
      setError(reportError?.message ? String(reportError.message) : "Could not save report.");
    } finally {
      setSaving(false);
    }
  }

  function exportReportsCsv() {
    const headers = [
      "Report Type",
      "Report Date",
      "Houses",
      "Completed By",
      "Follow Up Needed",
      "Follow Up Notes",
    ];

    const rows = reports.map((report) => [
      getReportLabel(report.report_type),
      report.report_date,
      getReportHouseNames(report),
      report.completed_by ?? "",
      report.follow_up_needed ? "Yes" : "No",
      report.follow_up_notes ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `provider-house-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  const selectedReportLabel = selectedReportType ? getReportLabel(selectedReportType) : "Select a Report";
  const selectedReportFrequency = selectedReportType ? getReportFrequency(selectedReportType) : "";
  const savedReportsLabel = getReportLabel(savedReportsTab);

  const overdueCount = selectedReportType
    ? activeHouses.reduce((total, house) => {
        const latestReport = getLastReportForHouse(house.id, selectedReportType);
        return total + (getDueStatus(selectedReportType, latestReport?.report_date ?? null).label === "Overdue" ? 1 : 0);
      }, 0)
    : 0;

  return (
    <PageShell>
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
              <BarChart3 className="h-10 w-10 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Provider Reports / Logs</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Reports</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Select a report folder, choose the house or houses it applies to, and save the completed log.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={exportReportsCsv}
            disabled={reports.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Export Reports
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 shadow-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading report data...
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Houses" value={String(activeHouses.length)} subtitle="Active/pending houses" icon={Home} />
        <MetricCard title="Saved Reports" value={String(counts.providerReports)} subtitle="Provider logs on file" icon={ClipboardCheck} />
        <MetricCard title="Overdue Items" value={String(overdueCount)} subtitle={`For ${selectedReportLabel}`} icon={AlertTriangle} />
        <MetricCard title="Documents" value={String(counts.documents)} subtitle={`${counts.uploadedDocuments} marked uploaded`} icon={FolderOpen} />
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {reportTypes.map((reportType) => (
            <button
              key={reportType.value}
              type="button"
              onClick={() => {
                setSelectedReportType(reportType.value);
                setSavedReportsTab(reportType.value);
                setSelectedHouseIds([]);
                setResidentAttendance({});
                setForm({
                  ...initialForm,
                  report_date: new Date().toISOString().slice(0, 10),
                });
                setMessage("");
                setError("");
              }}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                selectedReportType === reportType.value
                  ? "bg-slate-950 text-white"
                  : "border bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {reportType.label}
            </button>
          ))}
        </div>
      </section>

      {selectedReportType ? (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Plus className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">New {selectedReportLabel}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Frequency: {selectedReportFrequency}. Select one or more houses before saving.
              </p>
            </div>
          </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TextField
            label="Report date"
            type="date"
            value={form.report_date}
            onChange={(value) => updateForm("report_date", value)}
          />

          <TextField
            label="Completed by"
            value={form.completed_by}
            onChange={(value) => updateForm("completed_by", value)}
            placeholder="Staff name"
          />
        </div>

        <div className="mt-6 rounded-2xl border bg-slate-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Select Houses</h3>
              <p className="mt-1 text-sm text-slate-500">
                Choose every house this report applies to.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleAllHouses}
              className="inline-flex items-center justify-center rounded-xl border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              {selectedHouseIds.length === activeHouses.length ? "Clear all" : "Select all active houses"}
            </button>
          </div>

          {activeHouses.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No active houses found.</p>
          ) : (
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {activeHouses.map((house) => (
                <label key={house.id} className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedHouseIds.includes(house.id)}
                    onChange={() => toggleHouse(house.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span>{house.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {selectedReportType === "weekly_house_meeting_minutes" ? (
          <div className="mt-6 rounded-2xl border bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-2">
                <Users className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Resident Attendance</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Residents are populated from the selected houses.
                </p>
              </div>
            </div>

            {selectedHouseResidents.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Select a house with active residents to populate attendance.
              </p>
            ) : (
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {selectedHouseResidents.map((resident) => (
                  <label key={resident.id} className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={residentAttendance[resident.id] ?? false}
                      onChange={() => toggleResidentAttendance(resident.id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span>
                      {resident.first_name} {resident.last_name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {reportFields[selectedReportType].map((field) => (
            <TextAreaField
              key={field.key}
              label={field.label}
              value={form.report_data[field.key] ?? ""}
              onChange={(value) => updateReportDataField(field.key, value)}
              placeholder={field.placeholder}
            />
          ))}
        </div>

        <div className="mt-6 rounded-2xl border bg-slate-50 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.follow_up_needed}
              onChange={(event) => updateForm("follow_up_needed", event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            <span>
              <span className="block text-sm font-medium text-slate-700">Follow-up needed</span>
              <span className="mt-1 block text-sm leading-5 text-slate-500">
                Check this when the report identifies an issue, repair, corrective action, or staff follow-up.
              </span>
            </span>
          </label>

          {form.follow_up_needed ? (
            <div className="mt-4">
              <TextAreaField
                label="Follow-up notes"
                value={form.follow_up_notes}
                onChange={(value) => updateForm("follow_up_notes", value)}
                placeholder="Document what needs to happen next, who is responsible, and the target completion date."
              />
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={saveReport}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Report"}
          </button>
        </div>
        </section>
      ) : (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <FolderOpen className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Select a Report Folder</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose Annual Fire Drill, Weekly House Meeting Minutes, Monthly Staff/QI Meeting Minutes, or Monthly Self-Safety Assessment to open the fillable form.
              </p>
            </div>
          </div>
        </section>
      )}

      {selectedReportType ? (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <CalendarDays className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Next Due by House</h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing due status for {selectedReportLabel}.
            </p>
          </div>
        </div>

        {activeHouses.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
            No active houses found.
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeHouses.map((house) => {
              const latestReport = getLastReportForHouse(house.id, selectedReportType);
              const dueStatus = getDueStatus(selectedReportType, latestReport?.report_date ?? null);

              return (
                <div key={house.id} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-950">{house.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Last: {latestReport ? formatDate(latestReport.report_date) : "None"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Next due: {formatDueDate(dueStatus.nextDueDate)}
                      </p>
                    </div>

                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${dueStatus.className}`}>
                      {dueStatus.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </section>
      ) : null}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <ShieldCheck className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Saved Reports</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review saved reports by folder. This section stays visible even when no new form is open.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {reportTypes.map((reportType) => (
            <button
              key={reportType.value}
              type="button"
              onClick={() => setSavedReportsTab(reportType.value)}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                savedReportsTab === reportType.value
                  ? "bg-slate-950 text-white"
                  : "border bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {reportType.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <h3 className="text-base font-semibold text-slate-950">Saved {savedReportsLabel} Reports</h3>
        </div>

        {filteredReports.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
            No {savedReportsLabel.toLowerCase()} reports have been saved yet.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {filteredReports.map((report) => (
              <div key={report.id} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-950">{getReportLabel(report.report_type)}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(report.report_date)} • {getReportHouseNames(report)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Frequency: {getReportFrequency(report.report_type)}
                      {report.completed_by ? ` • Completed by ${report.completed_by}` : ""}
                    </p>
                  </div>

                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                    report.follow_up_needed
                      ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                      : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                  }`}>
                    {report.follow_up_needed ? "Follow-up needed" : "Complete"}
                  </span>
                </div>

                {report.follow_up_notes ? (
                  <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-600">
                    {report.follow_up_notes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
