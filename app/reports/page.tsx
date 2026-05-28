"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Plus,
  ShieldCheck,
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

type Counts = {
  providerName: string;
  houses: number;
  beds: number;
  staff: number;
  residents: number;
  providerReports: number;
  openFollowUps: number;
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
  follow_up_resolved: boolean | null;
  follow_up_resolved_at: string | null;
  follow_up_resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  provider_house_report_houses?: ReportHouseTarget[] | null;
};

type ReportForm = {
  report_date: string;
  completed_by: string;
  follow_up_needed: boolean;
  follow_up_notes: string;
  report_data: ReportJson;
};

const emptyCounts: Counts = {
  providerName: "Current Provider",
  houses: 0,
  beds: 0,
  staff: 0,
  residents: 0,
  providerReports: 0,
  openFollowUps: 0,
};

const initialForm: ReportForm = {
  report_date: new Date().toISOString().slice(0, 10),
  completed_by: "",
  follow_up_needed: false,
  follow_up_notes: "",
  report_data: {},
};

const reportFields: Record<Exclude<ReportType, "monthly_self_safety_assessment" | "incident_reporting">, { key: string; label: string; placeholder: string }[]> = {
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
};

const selfSafetySections = [
  {
    title: "Smoke Detectors / Fire Extinguishers",
    items: [
      ["smoke_alarm_every_level", "There is one smoke alarm on every level of the home and inside and outside each sleeping area."],
      ["smoke_alarms_tested_cleaned", "Smoke alarms are tested and cleaned monthly."],
      ["smoke_alarm_batteries_changed", "Smoke alarm batteries are changed as needed."],
      ["smoke_alarms_under_10_years", "Smoke alarms are less than 10 years old."],
      ["fire_extinguishers_visible", "Functioning fire extinguishers are mounted in plain sight and in clear locations."],
    ],
  },
  {
    title: "Cooking Safety",
    items: [
      ["cooking_area_clear", "Cooking area is free from items that can catch fire."],
      ["stove_hood_clean", "Kitchen stove hood is clean and vented to the outside."],
      ["pots_not_unattended", "Pots are not left unattended on the stove."],
      ["kitchen_appliances_clean", "Kitchen, fridge, microwave, and oven are clean of bacteria and mold."],
    ],
  },
  {
    title: "Electrical & Appliance Safety",
    items: [
      ["cords_not_under_rugs", "Electrical cords do not run under rugs."],
      ["cords_not_frayed", "Electrical cords are not frayed or cracked."],
      ["protected_adapters_used", "Circuit-protected, multi-prong adapters are used for additional outlets."],
      ["appliances_wall_outlets", "Large and small appliances are plugged directly into wall outlets."],
      ["dryer_lint_clean", "Clothes dryer lint filter and venting system are clean."],
      ["appliances_working", "Appliances are in working order and in good condition."],
    ],
  },
  {
    title: "Smoking",
    items: [
      ["smoke_free_environment", "Residence is a smoke-free living environment."],
      ["designated_smoking_area", "Designated smoking areas are located outside the residence."],
      ["cigarette_butts_ashtrays", "Cigarette butts are discarded in ashtrays and not tossed on the ground."],
      ["ashtrays_safe", "Ashtrays are large, deep, and kept away from items that can catch fire."],
      ["ashtrays_emptied", "Ashtrays are emptied regularly into a fire-proof container."],
    ],
  },
  {
    title: "Heating Safety",
    items: [
      ["chimney_furnace_inspected", "Chimney and furnace are cleaned and inspected yearly."],
      ["items_three_feet_from_heat", "Furniture and other items that can catch fire are at least 3 feet from heat sources."],
      ["ashes_metal_container", "Fireplace and barbecue ashes are placed outdoors in a covered metal container."],
      ["no_extension_space_heaters", "Extension cords are never used with space heaters."],
      ["heaters_approved", "Heaters are approved by a national testing laboratory and have tip-over shut-off function."],
    ],
  },
  {
    title: "Home Escape Plan",
    items: [
      ["two_ways_out_sleeping_room", "Have two ways out of each sleeping room."],
      ["meeting_location_known", "Know where to meet after escape."],
      ["meeting_place_front", "Meeting place should be near the front of the home."],
      ["fire_escape_practiced", "Practice your fire escape plan."],
      ["evacuation_maps_posted", "Evacuation maps are posted in conspicuous locations."],
    ],
  },
  {
    title: "Resident Safety / FARR Compliance",
    items: [
      ["resident_rights_posted", "Resident Rights & Requirements posted."],
      ["grievance_policy_posted", "Grievance Policy & Procedure posted."],
      ["emergency_numbers_posted", "Emergency phone numbers are posted."],
      ["emergency_procedures_posted", "Emergency procedures are posted and staff/residents are trained."],
      ["narcan_available", "Narcan is readily available and staff/residents are trained in its use."],
    ],
  },
  {
    title: "Gas Appliances / Carbon Monoxide",
    items: [
      ["gas_appliances_not_applicable", "N/A - No gas appliances are present in this home."],
      ["co_alarms_each_level", "Carbon monoxide alarms are located on each level of the home."],
      ["co_alarms_under_7_years", "Carbon monoxide alarms are less than 7 years old."],
    ],
  },
];

const farrIncidentTypes = [
  "Overdose (Fatal or Non-fatal)",
  "Life-threatening incident",
  "Death",
  "Resident arrest",
  "Staff/Owner arrest",
  "Criminal activity",
  "Mental Health Crisis with EMS Involvement",
  "Other: Lost/stolen medication, emergency services called, staff/owner relapse",
];

const nonFarrIncidentTypes = [
  "Verbal Altercation",
  "Physical Altercation (no EMS called)",
  "Severe Rule Violation",
  "Trespassing",
  "Contraband",
  "Alcohol/Drug Use",
  "Property Loss or Damage",
  "Injury or Accident (no EMS called)",
];

const incidentTextFields = [
  ["reporting_first_name", "Reporting party first name", "First name"],
  ["reporting_last_name", "Reporting party last name", "Last name"],
  ["reporting_phone", "Reporting party phone", "Phone number"],
  ["reporting_email", "Reporting party email", "Email address"],
  ["program_name", "Program name", "Program name"],
  ["certification_status", "Certification status", "Level 1, Level 2, Level 3, Level 4"],
  ["incident_address", "Address of incident", "Street address or location"],
  ["incident_county", "County of incident", "County"],
  ["incident_time", "Approximate time of incident", "Example: 8:15 PM"],
  ["narcan_doses", "If Narcan was used, how many doses?", "Number of doses"],
  ["responder_arrival_time", "Emergency responder arrival time", "How long did responders take to arrive?"],
  ["other_notified", "Other notifications", "Who else was notified other than emergency responders?"],
  ["gender", "Gender", "Gender"],
  ["age", "Age", "Age"],
  ["drug_of_choice", "Drug of choice", "Drug of choice"],
  ["length_of_stay", "Length of stay in program", "Length of stay"],
  ["last_drug_test_result", "Last drug test & result", "Last drug test and result"],
] as const;

const incidentNarrativeFields = [
  ["incident_description", "Describe the incident", "Document the incident in detail."],
  ["actions_performed", "What actions were performed?", "Document interventions, staff response, emergency response, and immediate actions."],
  ["pertinent_behaviors", "Pertinent behaviors prior to the incident", "Document behaviors, warning signs, or relevant context before the incident."],
] as const;

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
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
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
  if (!lastReportDate || reportType === "incident_reporting") return null;
  const lastDate = toDate(lastReportDate);
  if (reportType === "annual_fire_drill") return addYears(lastDate, 1);
  if (reportType === "weekly_house_meeting_minutes") return addDays(lastDate, 7);
  return addMonths(lastDate, 1);
}

function formatDueDate(value: Date | null) {
  if (!value) return "No report saved";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(value);
}

function getDueStatus(reportType: ReportType, lastReportDate: string | null) {
  const today = toDate(new Date().toISOString().slice(0, 10));
  const nextDueDate = getNextDueDate(reportType, lastReportDate);

  if (!nextDueDate) {
    return { label: "Due", className: "bg-rose-50 text-rose-700 ring-rose-600/20", nextDueDate };
  }

  if (nextDueDate < today) {
    return { label: "Overdue", className: "bg-rose-50 text-rose-700 ring-rose-600/20", nextDueDate };
  }

  if (nextDueDate <= addDays(today, 7)) {
    return { label: "Due Soon", className: "bg-amber-50 text-amber-700 ring-amber-600/20", nextDueDate };
  }

  return { label: "Current", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", nextDueDate };
}

function getReportTargetHouseIds(report: ProviderHouseReport) {
  const targetIds = (report.provider_house_report_houses ?? []).map((target) => target.house_id).filter(Boolean);
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
    <div className="rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3">
          <Icon className="h-6 w-6 text-slate-600" />
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
        className="mt-2 min-h-32 w-full rounded-xl border bg-white p-3 text-sm leading-6 outline-none ring-slate-900/10 focus:ring-4"
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
  const [showReportForm, setShowReportForm] = useState(false);
  const [savedReportsTab, setSavedReportsTab] = useState<ReportType>("annual_fire_drill");
  const [selectedHouseIds, setSelectedHouseIds] = useState<string[]>([]);
  const [residentAttendance, setResidentAttendance] = useState<Record<string, boolean>>({});
  const [selectedViewReport, setSelectedViewReport] = useState<ProviderHouseReport | null>(null);
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
    const supabase = getSupabaseClient() as any;

    const providerResult = await supabase.from("providers").select("legal_name").eq("id", activeProviderId).single();
    const housesResult = await supabase.from("houses").select("id, name, total_beds, status").eq("provider_id", activeProviderId).order("name", { ascending: true });
    const staffResult = await supabase.from("staff_profiles").select("id").eq("provider_id", activeProviderId);
    const residentsResult = await supabase
      .from("residents")
      .select("id, first_name, last_name, house_id, resident_status")
      .eq("provider_id", activeProviderId)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });
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
    if (reportsResult.error) throw reportsResult.error;

    const loadedHouses = (housesResult.data ?? []) as HouseRow[];
    const loadedResidents = (residentsResult.data ?? []) as ResidentRow[];
    const loadedReports = (reportsResult.data ?? []) as ProviderHouseReport[];
    const staff = staffResult.data ?? [];

    setHouses(loadedHouses);
    setResidents(loadedResidents);
    setReports(loadedReports);
    setCounts({
      providerName: providerResult.data?.legal_name ?? "Current Provider",
      houses: loadedHouses.length,
      beds: loadedHouses.reduce((sum, house) => sum + Number(house.total_beds || 0), 0),
      staff: staff.length,
      residents: loadedResidents.length,
      providerReports: loadedReports.length,
      openFollowUps: loadedReports.filter((report) => report.follow_up_needed && !report.follow_up_resolved).length,
    });
  }

  useEffect(() => {
    async function initialize() {
      try {
        const supabase = getSupabaseClient() as any;
        let activeProviderId: string | null = localStorage.getItem("current_provider_id");

        if (!activeProviderId) {
          const latestProviderResult = await supabase.from("providers").select("id").order("created_at", { ascending: false }).limit(1);
          activeProviderId = latestProviderResult.data?.[0]?.id ?? null;
        }

        if (!activeProviderId) {
          setError("No provider selected yet. Go to Provider Onboarding first and save a provider profile.");
          return;
        }

        localStorage.setItem("current_provider_id", activeProviderId);
        setProviderId(activeProviderId);
        await loadReports(activeProviderId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load reports.");
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, []);

  function getTextValue(key: string) {
    const value = form.report_data[key];
    return typeof value === "string" ? value : "";
  }

  function getBoolValue(key: string) {
    return Boolean(form.report_data[key]);
  }

  function getArrayValue(key: string) {
    const value = form.report_data[key];
    return Array.isArray(value) ? value.map(String) : [];
  }

  function updateForm<K extends keyof ReportForm>(field: K, value: ReportForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateReportDataField(field: string, value: unknown) {
    setForm((current) => ({
      ...current,
      report_data: {
        ...current.report_data,
        [field]: value,
      },
    }));
  }

  function toggleArrayValue(field: string, value: string) {
    const currentValues = getArrayValue(field);
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];

    updateReportDataField(field, nextValues);
  }

  function toggleHouse(houseId: string) {
    setSelectedHouseIds((current) =>
      current.includes(houseId) ? current.filter((id) => id !== houseId) : [...current, houseId]
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
    setResidentAttendance((current) => ({ ...current, [residentId]: !current[residentId] }));
  }

  function getHouseName(houseId: string | null) {
    if (!houseId) return "Multiple houses";
    return houses.find((house) => house.id === houseId)?.name ?? "Selected house";
  }

  function getReportHouseNames(report: ProviderHouseReport) {
    const targetIds = getReportTargetHouseIds(report);

    if (targetIds.length === 0 && report.applies_to_scope === "all_houses") return "All houses";
    if (targetIds.length === 0) return getHouseName(report.house_id);
    if (targetIds.length === activeHouses.length) return "All houses";

    return targetIds.map((houseId) => houses.find((house) => house.id === houseId)?.name).filter(Boolean).join(", ");
  }

  function getLastReportForHouse(houseId: string, reportType: ReportType) {
    return (
      reports
        .filter((report) => report.report_type === reportType)
        .filter((report) => {
          const targetIds = getReportTargetHouseIds(report);
          if (targetIds.length > 0) return targetIds.includes(houseId);
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
      setError("Select a report folder before saving.");
      return;
    }

    if (selectedHouseIds.length === 0) {
      setSaving(false);
      setError("Select at least one house for this report.");
      return;
    }

    try {
      const supabase = getSupabaseClient() as any;
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
        ...(selectedReportType === "weekly_house_meeting_minutes" ? { resident_attendance: residentAttendanceData } : {}),
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

      if (insertError) throw insertError;

      const targetInsertResult = await supabase
        .from("provider_house_report_houses")
        .insert(
          selectedHouseIds.map((houseId) => ({
            provider_id: providerId,
            report_id: data.id,
            house_id: houseId,
          }))
        );

      if (targetInsertResult.error) throw targetInsertResult.error;

      setForm({ ...initialForm, report_date: new Date().toISOString().slice(0, 10) });
      setSelectedHouseIds([]);
      setResidentAttendance({});
      setSavedReportsTab(selectedReportType);
      setMessage(`${getReportLabel(selectedReportType)} saved successfully.`);
      await loadReports(providerId);
    } catch (err) {
      const reportError = err as { message?: unknown };
      setError(reportError?.message ? String(reportError.message) : "Could not save report.");
    } finally {
      setSaving(false);
    }
  }

  async function markFollowUpResolved(report: ProviderHouseReport) {
    if (!providerId) return;

    const resolutionNotes = window.prompt("Resolution notes, if any:") ?? "";

    try {
      const supabase = getSupabaseClient() as any;
      const { data: userData } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from("provider_house_reports")
        .update({
          follow_up_resolved: true,
          follow_up_resolved_at: new Date().toISOString(),
          follow_up_resolved_by_auth_user_id: userData.user?.id ?? null,
          follow_up_resolution_notes: resolutionNotes.trim() || null,
        })
        .eq("id", report.id);

      if (updateError) throw updateError;

      setMessage("Follow-up marked resolved.");
      await loadReports(providerId);
    } catch (err) {
      const resolveError = err as { message?: unknown };
      setError(resolveError?.message ? String(resolveError.message) : "Could not resolve follow-up.");
    }
  }

  function exportReportsCsv() {
    const headers = [
      "Report Type",
      "Report Date",
      "Houses",
      "Completed By",
      "Follow Up Needed",
      "Resolved",
      "Follow Up Notes",
    ];

    const rows = reports.map((report) => [
      getReportLabel(report.report_type),
      report.report_date,
      getReportHouseNames(report),
      report.completed_by ?? "",
      report.follow_up_needed ? "Yes" : "No",
      report.follow_up_resolved ? "Yes" : "No",
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

  const overdueCount = selectedReportType && selectedReportType !== "incident_reporting"
    ? activeHouses.reduce((total, house) => {
        const latestReport = getLastReportForHouse(house.id, selectedReportType);
        return total + (getDueStatus(selectedReportType, latestReport?.report_date ?? null).label === "Overdue" ? 1 : 0);
      }, 0)
    : 0;

  function calculateDrillMinutes() {
    const startTime = getTextValue("start_time");
    const endTime = getTextValue("end_time");

    if (!startTime || !endTime || !startTime.includes(":") || !endTime.includes(":")) {
      return null;
    }

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    if (
      Number.isNaN(startHour) ||
      Number.isNaN(startMinute) ||
      Number.isNaN(endHour) ||
      Number.isNaN(endMinute)
    ) {
      return null;
    }

    const startTotal = startHour * 60 + startMinute;
    let endTotal = endHour * 60 + endMinute;

    if (endTotal < startTotal) {
      endTotal += 24 * 60;
    }

    return endTotal - startTotal;
  }

  function renderFireDrillFields() {
    const durationMinutes = calculateDrillMinutes();

    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Fire Drill Details</h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-4 md:col-span-2">
              <TextField
                label="House name / address"
                value={getTextValue("house_name_address")}
                onChange={(value) => updateReportDataField("house_name_address", value)}
                placeholder="Confirm the house name and address where the drill occurred."
              />
            </div>

            <div className="rounded-2xl bg-white p-4">
              <TextField
                label="Start time"
                type="time"
                value={getTextValue("start_time")}
                onChange={(value) => updateReportDataField("start_time", value)}
              />
            </div>

            <div className="rounded-2xl bg-white p-4">
              <TextField
                label="End time"
                type="time"
                value={getTextValue("end_time")}
                onChange={(value) => updateReportDataField("end_time", value)}
              />
            </div>

            <div className="rounded-2xl bg-white p-4">
              <TextField
                label="Safety monitor's name"
                value={getTextValue("safety_monitor_name")}
                onChange={(value) => updateReportDataField("safety_monitor_name", value)}
                placeholder="Staff name"
              />
            </div>

            <div className="rounded-2xl bg-white p-4">
              <TextField
                label="Number of participants"
                type="number"
                value={getTextValue("number_of_participants")}
                onChange={(value) => updateReportDataField("number_of_participants", value)}
                placeholder="Total"
              />
            </div>

            <div className="rounded-2xl bg-white p-4">
              <TextField
                label="Safety monitor signature"
                value={getTextValue("safety_monitor_signature")}
                onChange={(value) => updateReportDataField("safety_monitor_signature", value)}
                placeholder="Typed signature"
              />
            </div>

            <div className="rounded-2xl bg-white p-4">
              <p className="text-sm font-medium text-slate-700">Drill duration</p>
              <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950">
                {durationMinutes === null ? "Enter start and end time" : `${durationMinutes} minute${durationMinutes === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Fire Drill Narrative</h3>

          <div className="mt-4 grid gap-4">
            {[
              ["meeting_point", "Meeting point", "Designated evacuation meeting location."],
              ["summary_of_drill", "Summary of drill", "Summarize how the drill was conducted and whether everyone followed the evacuation plan."],
              ["barriers_obstacles", "Barriers / obstacles noted", "Document blocked exits, confusion, delayed response, missing participants, or other barriers."],
              ["areas_of_improvement", "Areas of improvement", "Document training needs, signage needs, timing concerns, or corrective steps."],
              ["notes_to_provider", "Notes to the provider", "Provider-level notes or follow-up needed."],
            ].map(([key, label, placeholder]) => (
              <div key={key} className="rounded-2xl bg-white p-4">
                <TextAreaField
                  label={label}
                  value={getTextValue(key)}
                  onChange={(value) => updateReportDataField(key, value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderMonthlyStaffMeetingFields() {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Meeting Details</h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-4">
              <TextField
                label="Facilitator name"
                value={getTextValue("facilitator")}
                onChange={(value) => updateReportDataField("facilitator", value)}
                placeholder="Facilitator name"
              />
            </div>

            <div className="rounded-2xl bg-white p-4">
              <TextField
                label="Recorder name"
                value={getTextValue("recorder")}
                onChange={(value) => updateReportDataField("recorder", value)}
                placeholder="Recorder name"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Monthly Staff/QI Meeting Notes</h3>

          <div className="mt-4 grid gap-4">
            {reportFields.monthly_staff_meeting_minutes
              .filter((field) => field.key !== "facilitator" && field.key !== "recorder")
              .map((field) => (
                <div key={field.key} className="rounded-2xl bg-white p-4">
                  <TextAreaField
                    label={field.label}
                    value={getTextValue(field.key)}
                    onChange={(value) => updateReportDataField(field.key, value)}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  function renderStandardReportFields() {
    if (!selectedReportType || selectedReportType === "monthly_self_safety_assessment" || selectedReportType === "incident_reporting") {
      return null;
    }

    if (selectedReportType === "annual_fire_drill") {
      return renderFireDrillFields();
    }

    if (selectedReportType === "monthly_staff_meeting_minutes") {
      return renderMonthlyStaffMeetingFields();
    }

    return (
      <div className="mt-6 rounded-2xl border bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-950">House Meeting Notes</h3>
        <p className="mt-1 text-sm text-slate-500">
          Complete the sections below based on the weekly house meeting format.
        </p>

        <div className="mt-4 grid gap-4">
          {reportFields[selectedReportType].map((field) => (
            <div key={field.key} className="rounded-2xl bg-white p-4">
              <TextAreaField
                label={field.label}
                value={getTextValue(field.key)}
                onChange={(value) => updateReportDataField(field.key, value)}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderSelfSafetyFields() {
    if (selectedReportType !== "monthly_self_safety_assessment") return null;

    return (
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {selfSafetySections.map((section) => (
          <div key={section.title} className="rounded-2xl border bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">{section.title}</h3>
            <div className="mt-3 grid gap-2">
              {section.items.map(([key, label]) => (
                <label key={key} className="flex items-start gap-3 rounded-xl bg-white p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={getBoolValue(key)}
                    onChange={(event) => updateReportDataField(key, event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border bg-slate-50 p-4 xl:col-span-2">
          <h3 className="text-sm font-semibold text-slate-950">Completion Notes</h3>
          <div className="mt-4 grid gap-4">
            <div className="rounded-2xl bg-white p-4">
              <TextAreaField
                label="Items marked not applicable / notes"
                value={getTextValue("not_applicable_items")}
                onChange={(value) => updateReportDataField("not_applicable_items", value)}
                placeholder="List any safety items marked not applicable and why."
              />
            </div>

            <div className="rounded-2xl bg-white p-4">
              <TextField
                label="Person completing assessment"
                value={getTextValue("person_completing")}
                onChange={(value) => updateReportDataField("person_completing", value)}
                placeholder="Typed name/signature"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderIncidentFields() {
    if (selectedReportType !== "incident_reporting") return null;

    return (
      <div className="mt-6 space-y-5">
        <div className="rounded-2xl border bg-slate-50 p-4">
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={getBoolValue("reported_to_farr")}
              onChange={(event) => updateReportDataField("reported_to_farr", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Incident reported to FARR
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Date of incident"
            type="date"
            value={getTextValue("incident_date")}
            onChange={(value) => updateReportDataField("incident_date", value)}
          />

          {incidentTextFields.map(([key, label, placeholder]) => (
            <TextField
              key={key}
              label={label}
              value={getTextValue(key)}
              onChange={(value) => updateReportDataField(key, value)}
              placeholder={placeholder}
            />
          ))}
        </div>

        <div className="rounded-2xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">FARR Reporting Incidents</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {farrIncidentTypes.map((type) => (
              <label key={type} className="flex items-start gap-2 rounded-xl bg-white p-3 text-sm">
                <input
                  type="checkbox"
                  checked={getArrayValue("farr_incident_types").includes(type)}
                  onChange={() => toggleArrayValue("farr_incident_types", type)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span>{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Non-FARR Internal Incident Types</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {nonFarrIncidentTypes.map((type) => (
              <label key={type} className="flex items-start gap-2 rounded-xl bg-white p-3 text-sm">
                <input
                  type="checkbox"
                  checked={getArrayValue("non_farr_incident_types").includes(type)}
                  onChange={() => toggleArrayValue("non_farr_incident_types", type)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span>{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Incident Narrative</h3>
          <div className="mt-4 grid gap-4">
            {incidentNarrativeFields.map(([key, label, placeholder]) => (
              <div key={key} className="rounded-2xl bg-white p-4">
                <TextAreaField
                  label={label}
                  value={getTextValue(key)}
                  onChange={(value) => updateReportDataField(key, value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Narcan / Emergency Response</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm">
              <input
                type="checkbox"
                checked={getBoolValue("narcan_used")}
                onChange={(event) => updateReportDataField("narcan_used", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Narcan was used
            </label>

            <label className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm">
              <input
                type="checkbox"
                checked={getBoolValue("narcan_from_farr")}
                onChange={(event) => updateReportDataField("narcan_from_farr", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Narcan was obtained from FARR
            </label>
          </div>
        </div>
      </div>
    );
  }

  function renderReportDataSummary(report: ProviderHouseReport) {
    const data = report.report_data ?? {};

    if (report.report_type === "weekly_house_meeting_minutes" && Array.isArray(data.resident_attendance)) {
      const attendance = data.resident_attendance as { resident_name?: string; present?: boolean }[];

      return (
        <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Resident Attendance</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {attendance.map((item, index) => (
              <p key={`${item.resident_name}-${index}`} className="rounded-xl bg-white p-3 text-sm">
                {item.present ? "Present" : "Absent"}: {item.resident_name ?? "Resident"}
              </p>
            ))}
          </div>
        </div>
      );
    }

    return null;
  }

  function getReportFieldLabel(reportType: ReportType, fieldKey: string) {
    const specialLabels: Record<string, string> = {
      reported_to_farr: "Incident reported to FARR",
      incident_date: "Date of incident",
      farr_incident_types: "FARR reporting incident types",
      non_farr_incident_types: "Non-FARR internal incident types",
      narcan_used: "Narcan was used",
      narcan_from_farr: "Narcan was obtained from FARR",
      resident_attendance: "Resident Attendance",
      not_applicable_items: "Items marked not applicable / notes",
      person_completing: "Person completing assessment",
    };

    if (specialLabels[fieldKey]) return specialLabels[fieldKey];

    if (reportType !== "monthly_self_safety_assessment" && reportType !== "incident_reporting") {
      const standardReportType = reportType as Exclude<ReportType, "monthly_self_safety_assessment" | "incident_reporting">;
      const field = reportFields[standardReportType].find((item) => item.key === fieldKey);

      if (field) return field.label;
    }

    for (const section of selfSafetySections) {
      const item = section.items.find(([key]) => key === fieldKey);

      if (item) return item[1];
    }

    const incidentTextField = incidentTextFields.find(([key]) => key === fieldKey);
    if (incidentTextField) return incidentTextField[1];

    const incidentNarrativeField = incidentNarrativeFields.find(([key]) => key === fieldKey);
    if (incidentNarrativeField) return incidentNarrativeField[1];

    return fieldKey
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

  function renderSelfSafetyReportView(report: ProviderHouseReport) {
    const data = report.report_data ?? {};

    return (
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {selfSafetySections.map((section) => (
          <div key={section.title} className="rounded-2xl border bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">{section.title}</h3>
            <div className="mt-3 grid gap-2">
              {section.items.map(([key, label]) => {
                const checked = Boolean(data[key]);

                return (
                  <div key={key} className="flex items-start gap-3 rounded-xl bg-white p-3 text-sm">
                    {checked ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <div>
                      <p className="font-medium text-slate-700">{checked ? "Checked" : "Not checked"}</p>
                      <p className="mt-1 text-slate-600">{label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700">Items marked not applicable / notes</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-600">
              {formatReportValue(data.not_applicable_items)}
            </p>
          </div>

          <div className="rounded-xl border bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700">Person completing assessment</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-600">
              {formatReportValue(data.person_completing)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  function renderIncidentReportView(report: ProviderHouseReport) {
    const data = report.report_data ?? {};

    return (
      <div className="mt-6 space-y-5">
        <div className="rounded-2xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Incident Reporting Status</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <p className="rounded-xl bg-white p-3 text-sm">
              <span className="font-medium text-slate-700">Incident reported to FARR:</span>{" "}
              {formatReportValue(data.reported_to_farr)}
            </p>
            <p className="rounded-xl bg-white p-3 text-sm">
              <span className="font-medium text-slate-700">Date of incident:</span>{" "}
              {formatReportValue(data.incident_date)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Reporting Party / Incident Details</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {incidentTextFields.map(([key, label]) => (
              <div key={key} className="rounded-xl bg-white p-3 text-sm">
                <p className="font-medium text-slate-700">{label}</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-600">{formatReportValue(data[key])}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Incident Type</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-white p-3 text-sm">
              <p className="font-medium text-slate-700">FARR reporting incident types</p>
              <p className="mt-1 whitespace-pre-wrap text-slate-600">
                {formatReportValue(data.farr_incident_types)}
              </p>
            </div>

            <div className="rounded-xl bg-white p-3 text-sm">
              <p className="font-medium text-slate-700">Non-FARR internal incident types</p>
              <p className="mt-1 whitespace-pre-wrap text-slate-600">
                {formatReportValue(data.non_farr_incident_types)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Narrative</h3>
          <div className="mt-3 grid gap-3">
            {incidentNarrativeFields.map(([key, label]) => (
              <div key={key} className="rounded-xl bg-white p-3 text-sm">
                <p className="font-medium text-slate-700">{label}</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-600">{formatReportValue(data[key])}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Narcan / Emergency Response</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <p className="rounded-xl bg-white p-3 text-sm">
              <span className="font-medium text-slate-700">Narcan used:</span>{" "}
              {formatReportValue(data.narcan_used)}
            </p>
            <p className="rounded-xl bg-white p-3 text-sm">
              <span className="font-medium text-slate-700">Narcan obtained from FARR:</span>{" "}
              {formatReportValue(data.narcan_from_farr)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  function renderSubmittedReportFields(report: ProviderHouseReport) {
    const data = report.report_data ?? {};

    if (report.report_type === "monthly_self_safety_assessment") {
      return renderSelfSafetyReportView(report);
    }

    if (report.report_type === "incident_reporting") {
      return renderIncidentReportView(report);
    }

    const entries = Object.entries(data).filter(([key]) => key !== "resident_attendance");

    if (entries.length === 0) {
      return (
        <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
          No detailed form fields were saved for this report.
        </div>
      );
    }

    return (
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-xl border bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700">{getReportFieldLabel(report.report_type, key)}</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-600">
              {formatReportValue(value)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <PageShell>
      <section className="rounded-2xl border bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 shadow-inner">
              <BarChart3 className="h-7 w-7 text-slate-600" />
            </div>
            <div><h1 className="mt-1 text-2xl font-semibold tracking-tight">Reports</h1>
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

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : null}

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 shadow-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading report data...
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1">
          {reportTypes.map((reportType) => (
            <button
              key={reportType.value}
              type="button"
              onClick={() => {
                setSelectedReportType(reportType.value);
                setSavedReportsTab(reportType.value);
                setSelectedHouseIds([]);
                setResidentAttendance({});
                setShowReportForm(false);
                setForm({ ...initialForm, report_date: new Date().toISOString().slice(0, 10) });
                setMessage("");
                setError("");
              }}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                selectedReportType === reportType.value
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {reportType.label}
            </button>
          ))}
        </div>
      </section>

      {selectedReportType ? (
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Selected report folder</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">{selectedReportLabel}</h2>
              <p className="mt-1 text-sm text-slate-500">Frequency: {selectedReportFrequency}</p>
            </div>

            <button
              type="button"
              onClick={() => setShowReportForm((current) => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              {showReportForm ? "Hide Form" : "Create Report"}
            </button>
          </div>
        </section>
      ) : null}

      {selectedReportType && showReportForm ? (
        <section className="rounded-2xl border bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
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
            <TextField label="Report date" type="date" value={form.report_date} onChange={(value) => updateForm("report_date", value)} />
            <TextField label="Completed by" value={form.completed_by} onChange={(value) => updateForm("completed_by", value)} placeholder="Staff name" />
          </div>

          <div className="mt-6 rounded-2xl border bg-slate-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Select Houses</h3>
                <p className="mt-1 text-sm text-slate-500">Choose every house this report applies to.</p>
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
                  <p className="mt-1 text-sm text-slate-500">Residents are populated from the selected houses.</p>
                </div>
              </div>

              {selectedHouseResidents.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Select a house with active residents to populate attendance.</p>
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
                      <span>{resident.first_name} {resident.last_name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {renderStandardReportFields()}
          {renderSelfSafetyFields()}
          {renderIncidentFields()}

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
      ) : null}

      {selectedReportType && selectedReportType !== "incident_reporting" ? (
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <CalendarDays className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Next Due by House</h2>
              <p className="mt-1 text-sm text-slate-500">Showing due status for {selectedReportLabel}.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeHouses.map((house) => {
              const latestReport = getLastReportForHouse(house.id, selectedReportType);
              const dueStatus = getDueStatus(selectedReportType, latestReport?.report_date ?? null);

              return (
                <div key={house.id} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-950">{house.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">Last: {latestReport ? formatDate(latestReport.report_date) : "None"}</p>
                      <p className="mt-1 text-xs text-slate-500">Next due: {formatDueDate(dueStatus.nextDueDate)}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${dueStatus.className}`}>
                      {dueStatus.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <ShieldCheck className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Saved Reports</h2>
</div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1">
          {reportTypes.map((reportType) => (
            <button
              key={reportType.value}
              type="button"
              onClick={() => setSavedReportsTab(reportType.value)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                savedReportsTab === reportType.value
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {reportType.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <h3 className="text-base font-semibold text-slate-950">Saved {getReportLabel(savedReportsTab)} Reports</h3>
        </div>

        {filteredReports.length === 0 ? (
          <div className="mt-5 rounded-3xl bg-slate-50 p-5 text-sm text-slate-500">
            No {savedReportsLabel.toLowerCase()} reports have been saved yet.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {filteredReports.map((report) => (
              <div key={report.id} className="rounded-3xl border bg-white p-4 shadow-sm transition hover:shadow-md">
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

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedViewReport(report)}
                      className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-medium shadow-sm hover:bg-slate-50"
                    >
                      <Eye className="h-4 w-4" />
                      View Report
                    </button>

                    {report.follow_up_needed && !report.follow_up_resolved ? (
                      <button
                        type="button"
                        onClick={() => markFollowUpResolved(report)}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark Resolved
                      </button>
                    ) : null}

                    <span className={`inline-flex rounded-full px-2.5 py-2 text-xs font-medium ring-1 ${
                      report.follow_up_needed && !report.follow_up_resolved
                        ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                    }`}>
                      {report.follow_up_needed && !report.follow_up_resolved ? "Follow-up needed" : "Complete"}
                    </span>
                  </div>
                </div>

                {report.follow_up_notes ? (
                  <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-600">{report.follow_up_notes}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedViewReport ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-4">
          <div className="my-8 w-full max-w-5xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Submitted Report</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">{getReportLabel(selectedViewReport.report_type)}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {formatDate(selectedViewReport.report_date)} • {getReportHouseNames(selectedViewReport)}
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
                <span className="font-medium text-slate-700">Completed by:</span> {selectedViewReport.completed_by ?? "Not entered"}
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

            {renderReportDataSummary(selectedViewReport)}

            {renderSubmittedReportFields(selectedViewReport)}

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
