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

type ResidentFeeChargeRow = {
  id: string;
  provider_id: string;
  resident_id: string;
  house_id: string | null;
  charge_type: string;
  billing_frequency: string;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  amount: number | string | null;
  amount_paid: number | string | null;
  balance_due: number | string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

type MaintenanceRequestRow = {
  id: string;
  provider_id: string;
  house_id: string | null;
  resident_id: string | null;
  submitted_by_name: string | null;
  request_title: string;
  request_description: string;
  location_area: string | null;
  priority: string;
  status: string;
  provider_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type PassRequestRow = {
  id: string;
  provider_id: string;
  house_id: string | null;
  resident_id: string;
  requested_departure_at: string;
  requested_return_at: string;
  destination: string;
  destination_address: string | null;
  reason: string | null;
  transportation_plan: string | null;
  emergency_contact_plan: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
  resident_agreed_to_terms: boolean | null;
  resident_signature_name: string | null;
  resident_signed_at: string | null;
  requires_court_order: boolean | null;
  requires_clinical_clearance: boolean | null;
  requires_emergency_travel_docs: boolean | null;
  requires_other_attachment: boolean | null;
  other_attachment_note: string | null;
  denial_reason: string | null;
  status: string;
  provider_notes: string | null;
  reviewed_by_auth_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
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
    {
      key: "meeting_minutes",
      label: "Meeting minutes / notes",
      placeholder: "Document attendance notes, topics discussed, sponsorship or home group updates, recovery plan progress, maintenance requests, resident concerns or successes, staff observations, action items, and follow-up needs.",
    },
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
  const [feeCharges, setFeeCharges] = useState<ResidentFeeChargeRow[]>([]);
  const [feeHouseFilter, setFeeHouseFilter] = useState("all");
  const [feeResidentStatusFilter, setFeeResidentStatusFilter] = useState("active");
  const [feeChargeStatusFilter, setFeeChargeStatusFilter] = useState("open");
  const [feeDueStart, setFeeDueStart] = useState("");
  const [feeDueEnd, setFeeDueEnd] = useState("");
  const [showRollingFeeList, setShowRollingFeeList] = useState(false);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequestRow[]>([]);
  const [showMaintenanceLog, setShowMaintenanceLog] = useState(false);
  const [maintenanceHouseFilter, setMaintenanceHouseFilter] = useState("all");
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState("open");
  const [maintenancePriorityFilter, setMaintenancePriorityFilter] = useState("all");
  const [passRequests, setPassRequests] = useState<PassRequestRow[]>([]);
  const [showPassRequests, setShowPassRequests] = useState(false);
  const [passHouseFilter, setPassHouseFilter] = useState("all");
  const [passStatusFilter, setPassStatusFilter] = useState("pending");
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [maintenanceFormHouseId, setMaintenanceFormHouseId] = useState("");
  const [maintenanceFormResidentId, setMaintenanceFormResidentId] = useState("");
  const [maintenanceFormTitle, setMaintenanceFormTitle] = useState("");
  const [maintenanceFormDescription, setMaintenanceFormDescription] = useState("");
  const [maintenanceFormLocation, setMaintenanceFormLocation] = useState("");
  const [maintenanceFormPriority, setMaintenanceFormPriority] = useState("normal");
  const [maintenanceFormNotes, setMaintenanceFormNotes] = useState("");
  const [savingMaintenanceRequest, setSavingMaintenanceRequest] = useState(false);
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

  const filteredFeeCharges = useMemo(() => {
    return feeCharges
      .filter((charge) => {
        const resident = residents.find((item) => item.id === charge.resident_id);
        const residentHouseId = resident?.house_id ?? null;
        const residentStatus = String(resident?.resident_status ?? "unknown").toLowerCase();
        const chargeStatus = String(charge.status ?? "").toLowerCase();
        const dueDate = charge.due_date ?? "";

        const matchesHouse =
          feeHouseFilter === "all" ||
          charge.house_id === feeHouseFilter ||
          residentHouseId === feeHouseFilter;

        const matchesResidentStatus =
          feeResidentStatusFilter === "all" ||
          residentStatus === feeResidentStatusFilter;

        const matchesChargeStatus =
          feeChargeStatusFilter === "all" ||
          chargeStatus === feeChargeStatusFilter;

        const matchesStart = !feeDueStart || (dueDate && dueDate >= feeDueStart);
        const matchesEnd = !feeDueEnd || (dueDate && dueDate <= feeDueEnd);

        return matchesHouse && matchesResidentStatus && matchesChargeStatus && matchesStart && matchesEnd;
      })
      .sort((first, second) => {
        const firstDue = first.due_date ?? "9999-12-31";
        const secondDue = second.due_date ?? "9999-12-31";
        return firstDue.localeCompare(secondDue);
      });
  }, [feeCharges, residents, feeHouseFilter, feeResidentStatusFilter, feeChargeStatusFilter, feeDueStart, feeDueEnd]);

  const filteredFeeTotals = useMemo(
    () =>
      filteredFeeCharges.reduce(
        (totals, charge) => ({
          amount: totals.amount + Number(charge.amount || 0),
          paid: totals.paid + Number(charge.amount_paid || 0),
          balance: totals.balance + Number(charge.balance_due || 0),
        }),
        { amount: 0, paid: 0, balance: 0 }
      ),
    [filteredFeeCharges]
  );

  const filteredMaintenanceRequests = useMemo(() => {
    return maintenanceRequests
      .filter((request) => {
        const matchesHouse =
          maintenanceHouseFilter === "all" ||
          request.house_id === maintenanceHouseFilter;

        const matchesStatus =
          maintenanceStatusFilter === "all" ||
          request.status === maintenanceStatusFilter;

        const matchesPriority =
          maintenancePriorityFilter === "all" ||
          request.priority === maintenancePriorityFilter;

        return matchesHouse && matchesStatus && matchesPriority;
      })
      .sort((first, second) => second.created_at.localeCompare(first.created_at));
  }, [maintenanceRequests, maintenanceHouseFilter, maintenanceStatusFilter, maintenancePriorityFilter]);

  const filteredPassRequests = useMemo(() => {
    return passRequests
      .filter((request) => {
        const matchesHouse =
          passHouseFilter === "all" ||
          request.house_id === passHouseFilter;

        const matchesStatus =
          passStatusFilter === "all" ||
          request.status === passStatusFilter;

        return matchesHouse && matchesStatus;
      })
      .sort((first, second) => second.created_at.localeCompare(first.created_at));
  }, [passRequests, passHouseFilter, passStatusFilter]);

  const openMaintenanceCount = useMemo(
    () => maintenanceRequests.filter((request) => request.status === "open").length,
    [maintenanceRequests]
  );

  const pendingPassRequestCount = useMemo(
    () => passRequests.filter((request) => request.status === "pending").length,
    [passRequests]
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

    const feeChargesResult = await supabase
      .from("resident_fee_charges")
      .select("id, provider_id, resident_id, house_id, charge_type, billing_frequency, period_start, period_end, due_date, amount, amount_paid, balance_due, status, notes, created_at")
      .eq("provider_id", activeProviderId)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false });

    const maintenanceResult = await supabase
      .from("resident_maintenance_requests")
      .select("id, provider_id, house_id, resident_id, submitted_by_name, request_title, request_description, location_area, priority, status, provider_notes, completed_at, created_at, updated_at")
      .eq("provider_id", activeProviderId)
      .order("created_at", { ascending: false });

    const passRequestsResult = await supabase
      .from("resident_pass_requests")
      .select("id, provider_id, house_id, resident_id, requested_departure_at, requested_return_at, destination, destination_address, reason, transportation_plan, emergency_contact_plan, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, resident_agreed_to_terms, resident_signature_name, resident_signed_at, requires_court_order, requires_clinical_clearance, requires_emergency_travel_docs, requires_other_attachment, other_attachment_note, denial_reason, status, provider_notes, reviewed_by_auth_user_id, reviewed_at, created_at, updated_at")
      .eq("provider_id", activeProviderId)
      .order("created_at", { ascending: false });

    if (providerResult.error) throw providerResult.error;
    if (housesResult.error) throw housesResult.error;
    if (staffResult.error) throw staffResult.error;
    if (residentsResult.error) throw residentsResult.error;
    if (reportsResult.error) throw reportsResult.error;
    if (feeChargesResult.error) throw feeChargesResult.error;
    if (maintenanceResult.error) throw maintenanceResult.error;
    if (passRequestsResult.error) throw passRequestsResult.error;

    const loadedHouses = (housesResult.data ?? []) as HouseRow[];
    const loadedResidents = (residentsResult.data ?? []) as ResidentRow[];
    const loadedReports = (reportsResult.data ?? []) as ProviderHouseReport[];
    const loadedFeeCharges = (feeChargesResult.data ?? []) as ResidentFeeChargeRow[];
    const loadedMaintenanceRequests = (maintenanceResult.data ?? []) as MaintenanceRequestRow[];
    const loadedPassRequests = (passRequestsResult.data ?? []) as PassRequestRow[];
    const staff = staffResult.data ?? [];

    setHouses(loadedHouses);
    setResidents(loadedResidents);
    setReports(loadedReports);
    setFeeCharges(loadedFeeCharges);
    setMaintenanceRequests(loadedMaintenanceRequests);
    setPassRequests(loadedPassRequests);
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
        const loadError = err as { message?: unknown };
        setError(loadError?.message ? String(loadError.message) : "Could not load reports.");
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

  function getResidentName(residentId: string) {
    const resident = residents.find((item) => item.id === residentId);
    if (!resident) return "Unknown resident";
    return `${resident.first_name} ${resident.last_name}`;
  }

  function getFeeHouseName(charge: ResidentFeeChargeRow) {
    const resident = residents.find((item) => item.id === charge.resident_id);
    const houseId = charge.house_id || resident?.house_id || null;
    if (!houseId) return "Not assigned";
    return houses.find((house) => house.id === houseId)?.name ?? "Unknown house";
  }

  function formatCurrency(value: number | string | null | undefined) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(value || 0));
  }

  function formatFeeLabel(value: string | null | undefined) {
    return String(value ?? "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Not entered";
  }

  function formatFeePeriod(charge: ResidentFeeChargeRow) {
    if (charge.period_start || charge.period_end) {
      return `${formatDate(charge.period_start)} - ${formatDate(charge.period_end)}`;
    }

    return "One-time";
  }

  function formatDateTime(value: string | null | undefined) {
    if (!value) return "Not entered";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not entered";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function getMaintenanceResidentName(request: MaintenanceRequestRow) {
    if (request.resident_id) {
      return getResidentName(request.resident_id);
    }

    return request.submitted_by_name || "Not entered";
  }

  function getMaintenanceHouseName(request: MaintenanceRequestRow) {
    if (!request.house_id) return "Not assigned";
    return houses.find((house) => house.id === request.house_id)?.name ?? "Unknown house";
  }

  function exportMaintenanceLogCsv() {
    const headers = [
      "Created",
      "Title",
      "House",
      "Resident / Submitted By",
      "Location",
      "Priority",
      "Status",
      "Description",
      "Provider Notes",
    ];

    const rows = filteredMaintenanceRequests.map((request) => [
      formatDateTime(request.created_at),
      request.request_title,
      getMaintenanceHouseName(request),
      getMaintenanceResidentName(request),
      request.location_area ?? "",
      formatFeeLabel(request.priority),
      formatFeeLabel(request.status),
      request.request_description,
      request.provider_notes ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `maintenance-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
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

  function openLargeTextPrompt(title: string, defaultValue = "") {
    return new Promise<string | null>((resolve) => {
      if (typeof document === "undefined") {
        resolve(null);
        return;
      }

      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.zIndex = "9999";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.background = "rgba(15, 23, 42, 0.45)";
      overlay.style.padding = "16px";

      const modal = document.createElement("div");
      modal.style.width = "100%";
      modal.style.maxWidth = "560px";
      modal.style.borderRadius = "24px";
      modal.style.background = "white";
      modal.style.padding = "24px";
      modal.style.boxShadow = "0 24px 80px rgba(15, 23, 42, 0.25)";

      const heading = document.createElement("h2");
      heading.textContent = title;
      heading.style.fontSize = "18px";
      heading.style.fontWeight = "700";
      heading.style.margin = "0";
      heading.style.color = "#020617";

      const helperText = document.createElement("p");
      helperText.textContent = "Add staff review notes, follow-up details, or decision comments below.";
      helperText.style.marginTop = "8px";
      helperText.style.fontSize = "14px";
      helperText.style.lineHeight = "20px";
      helperText.style.color = "#64748b";

      const textarea = document.createElement("textarea");
      textarea.value = defaultValue;
      textarea.rows = 7;
      textarea.style.marginTop = "16px";
      textarea.style.width = "100%";
      textarea.style.minHeight = "150px";
      textarea.style.border = "1px solid #cbd5e1";
      textarea.style.borderRadius = "16px";
      textarea.style.padding = "12px";
      textarea.style.fontSize = "14px";
      textarea.style.outline = "none";
      textarea.style.resize = "vertical";

      const buttonRow = document.createElement("div");
      buttonRow.style.display = "flex";
      buttonRow.style.justifyContent = "flex-end";
      buttonRow.style.gap = "12px";
      buttonRow.style.marginTop = "18px";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.textContent = "Cancel";
      cancelButton.style.border = "1px solid #cbd5e1";
      cancelButton.style.borderRadius = "12px";
      cancelButton.style.background = "white";
      cancelButton.style.padding = "9px 14px";
      cancelButton.style.fontSize = "14px";
      cancelButton.style.fontWeight = "600";
      cancelButton.style.cursor = "pointer";

      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.textContent = "Continue";
      saveButton.style.border = "1px solid #020617";
      saveButton.style.borderRadius = "12px";
      saveButton.style.background = "#020617";
      saveButton.style.color = "white";
      saveButton.style.padding = "9px 14px";
      saveButton.style.fontSize = "14px";
      saveButton.style.fontWeight = "600";
      saveButton.style.cursor = "pointer";

      const close = (value: string | null) => {
        overlay.remove();
        resolve(value);
      };

      cancelButton.onclick = () => close(null);
      saveButton.onclick = () => close(textarea.value);

      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          close(null);
        }
      });

      buttonRow.append(cancelButton, saveButton);
      modal.append(heading, helperText, textarea, buttonRow);
      overlay.append(modal);
      document.body.append(overlay);

      setTimeout(() => textarea.focus(), 0);
    });
  }


  async function markFollowUpResolved(report: ProviderHouseReport) {
    if (!providerId) return;

    const resolutionNotes = (await openLargeTextPrompt("Resolution notes, if any:", "")) ?? "";

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

  function exportRollingFeeListCsv() {
    const headers = [
      "Resident",
      "House",
      "Charge Type",
      "Billing Frequency",
      "Period",
      "Due Date",
      "Amount",
      "Paid",
      "Balance",
      "Status",
      "Notes",
    ];

    const rows = filteredFeeCharges.map((charge) => [
      getResidentName(charge.resident_id),
      getFeeHouseName(charge),
      formatFeeLabel(charge.charge_type),
      formatFeeLabel(charge.billing_frequency),
      formatFeePeriod(charge),
      formatDate(charge.due_date),
      formatCurrency(charge.amount),
      formatCurrency(charge.amount_paid),
      formatCurrency(charge.balance_due),
      formatFeeLabel(charge.status),
      charge.notes ?? "",
    ]);

    const totalsRow = [
      "TOTALS",
      "",
      "",
      "",
      "",
      "",
      formatCurrency(filteredFeeTotals.amount),
      formatCurrency(filteredFeeTotals.paid),
      formatCurrency(filteredFeeTotals.balance),
      "",
      "",
    ];

    const csv = [headers, ...rows, totalsRow]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `rolling-fee-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function renderRollingFeeList() {
    return (
      <section id="rolling-fee-list-print" className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Rolling Fee List</h2>
            <p className="mt-1 text-sm text-slate-500">
              Filter and export resident fee charges across houses, residents, due dates, and charge statuses.
            </p>
          </div>


        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">House</span>
            <select
              value={feeHouseFilter}
              onChange={(event) => setFeeHouseFilter(event.target.value)}
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
              value={feeResidentStatusFilter}
              onChange={(event) => setFeeResidentStatusFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            >
              <option value="active">Active residents</option>
              <option value="discharged">Discharged residents</option>
              <option value="all">All residents</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Charge status</span>
            <select
              value={feeChargeStatusFilter}
              onChange={(event) => setFeeChargeStatusFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            >
              <option value="open">Open</option>
              <option value="paid">Paid</option>
              <option value="all">All statuses</option>
            </select>
          </label>

          <TextField
            label="Due start"
            type="date"
            value={feeDueStart}
            onChange={setFeeDueStart}
          />

          <TextField
            label="Due end"
            type="date"
            value={feeDueEnd}
            onChange={setFeeDueEnd}
          />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Charges</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{formatCurrency(filteredFeeTotals.amount)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Paid</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{formatCurrency(filteredFeeTotals.paid)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Balance Due</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{formatCurrency(filteredFeeTotals.balance)}</p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {filteredFeeCharges.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              No fee charges match the selected filters.
            </div>
          ) : (
            <table className="min-w-full divide-y text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-semibold">Resident</th>
                  <th className="px-3 py-3 font-semibold">House</th>
                  <th className="px-3 py-3 font-semibold">Charge</th>
                  <th className="px-3 py-3 font-semibold">Period</th>
                  <th className="px-3 py-3 font-semibold">Due</th>
                  <th className="px-3 py-3 text-right font-semibold">Amount</th>
                  <th className="px-3 py-3 text-right font-semibold">Paid</th>
                  <th className="px-3 py-3 text-right font-semibold">Balance</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredFeeCharges.map((charge) => (
                  <tr key={charge.id} className="bg-white">
                    <td className="px-3 py-3 font-medium text-slate-950">{getResidentName(charge.resident_id)}</td>
                    <td className="px-3 py-3 text-slate-600">{getFeeHouseName(charge)}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {formatFeeLabel(charge.charge_type)}
                      <span className="block text-xs text-slate-400">{formatFeeLabel(charge.billing_frequency)}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{formatFeePeriod(charge)}</td>
                    <td className="px-3 py-3 text-slate-600">{formatDate(charge.due_date)}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{formatCurrency(charge.amount)}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{formatCurrency(charge.amount_paid)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-950">{formatCurrency(charge.balance_due)}</td>
                    <td className="px-3 py-3 text-slate-600">{formatFeeLabel(charge.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    );
  }

  function getPassResidentName(request: PassRequestRow) {
    return getResidentName(request.resident_id);
  }

  function getPassHouseName(request: PassRequestRow) {
    if (!request.house_id) return "Not assigned";
    return houses.find((house) => house.id === request.house_id)?.name ?? "Unknown house";
  }

  async function updatePassRequestStatus(request: PassRequestRow, nextStatus: string) {
    if (!providerId) {
      setError("No provider selected.");
      return;
    }

    const providerNotes = await openLargeTextPrompt("Follow-up action or notes:", request.provider_notes ?? "");

    if (providerNotes === null) {
      return;
    }

    if (providerNotes === null) {
      return;
    }

    let denialReason = request.denial_reason ?? null;
    let requiresCourtOrder = Boolean(request.requires_court_order);
    let requiresClinicalClearance = Boolean(request.requires_clinical_clearance);
    let requiresEmergencyTravelDocs = Boolean(request.requires_emergency_travel_docs);
    let requiresOtherAttachment = Boolean(request.requires_other_attachment);
    let otherAttachmentNote = request.other_attachment_note ?? null;

    if (nextStatus === "denied") {
      const denialInput = await openLargeTextPrompt("Reason for denial:", request.denial_reason ?? "");

      if (denialInput === null) {
        return;
      }

      denialReason = denialInput.trim() || null;
    }

    if (nextStatus === "approved" || nextStatus === "denied") {
      const attachmentSelection = await openAttachmentChecklistPrompt({
        courtOrder: request.requires_court_order,
        clinicalClearance: request.requires_clinical_clearance,
        emergencyTravelDocs: request.requires_emergency_travel_docs,
        otherAttachment: request.requires_other_attachment,
        otherAttachmentNote: request.other_attachment_note,
      });

      if (attachmentSelection === null) {
        return;
      }

      requiresCourtOrder = attachmentSelection.courtOrder;
      requiresClinicalClearance = attachmentSelection.clinicalClearance;
      requiresEmergencyTravelDocs = attachmentSelection.emergencyTravelDocs;
      requiresOtherAttachment = attachmentSelection.otherAttachment;
      otherAttachmentNote = attachmentSelection.otherAttachmentNote;
    }

    try {
      setSavingMaintenanceRequest(true);
      setError("");
      setMessage("");

      const supabase = getSupabaseClient() as any;
      const { data: userData } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from("resident_pass_requests")
        .update({
          status: nextStatus,
          provider_notes: providerNotes.trim() || null,
          denial_reason: nextStatus === "denied" ? denialReason : null,
          requires_court_order: requiresCourtOrder,
          requires_clinical_clearance: requiresClinicalClearance,
          requires_emergency_travel_docs: requiresEmergencyTravelDocs,
          requires_other_attachment: requiresOtherAttachment,
          other_attachment_note: otherAttachmentNote,
          reviewed_by_auth_user_id: userData.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) {
        throw updateError;
      }

      setMessage("Pass request updated.");
      await loadReports(providerId);
    } catch (err) {
      const passError = err as { message?: unknown };
      setError(passError?.message ? String(passError.message) : "Could not update pass request.");
    } finally {
      setSavingMaintenanceRequest(false);
    }
  }


  function renderPassRequests() {
    return (
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Pass Requests</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review pass requests submitted from the resident portal.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">House</span>
            <select
              value={passHouseFilter}
              onChange={(event) => setPassHouseFilter(event.target.value)}
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
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              value={passStatusFilter}
              onChange={(event) => setPassStatusFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
              <option value="all">All statuses</option>
            </select>
          </label>
        </div>

        {filteredPassRequests.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
            No pass requests match the selected filters.
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {filteredPassRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-950">{getPassResidentName(request)}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {getPassHouseName(request)} • Date of request: {formatDateTime(request.created_at)}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-white p-3 text-sm">
                        <p className="font-medium text-slate-700">Destination Address</p>
                        <p className="mt-1 whitespace-pre-wrap text-slate-600">
                          {request.destination_address || request.destination}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-3 text-sm">
                        <p className="font-medium text-slate-700">Travel / Curfew Details</p>
                        <p className="mt-1 text-slate-600">Departure: {formatDateTime(request.requested_departure_at)}</p>
                        <p className="text-slate-600">Return: {formatDateTime(request.requested_return_at)}</p>
                      </div>

                      <div className="rounded-xl bg-white p-3 text-sm md:col-span-2">
                        <p className="font-medium text-slate-700">Purpose of Request</p>
                        <p className="mt-1 whitespace-pre-wrap text-slate-600">
                          {request.reason || "Not entered"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-3 text-sm md:col-span-2">
                        <p className="font-medium text-slate-700">Emergency Contact for Trip</p>
                        <p className="mt-1 text-slate-600">
                          Contact: {request.emergency_contact_name || "Not entered"}
                        </p>
                        <p className="text-slate-600">
                          Relationship: {request.emergency_contact_relationship || "Not entered"}
                        </p>
                        <p className="text-slate-600">
                          Phone: {request.emergency_contact_phone || "Not entered"}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Resident authorized staff to verify this pass with the identified individual.
                        </p>
                      </div>

                      {request.transportation_plan ? (
                        <div className="rounded-xl bg-white p-3 text-sm md:col-span-2">
                          <p className="font-medium text-slate-700">Transportation Plan</p>
                          <p className="mt-1 whitespace-pre-wrap text-slate-600">{request.transportation_plan}</p>
                        </div>
                      ) : null}

                      {request.emergency_contact_plan ? (
                        <div className="rounded-xl bg-white p-3 text-sm md:col-span-2">
                          <p className="font-medium text-slate-700">Additional Safety Plan / Notes</p>
                          <p className="mt-1 whitespace-pre-wrap text-slate-600">{request.emergency_contact_plan}</p>
                        </div>
                      ) : null}

                      <div className="rounded-xl bg-white p-3 text-sm md:col-span-2">
                        <p className="font-medium text-slate-700">Resident Agreement</p>
                        <p className="mt-1 text-slate-600">
                          Agreement confirmed: {request.resident_agreed_to_terms ? "Yes" : "No"}
                        </p>
                        <p className="text-slate-600">
                          Signature: {request.resident_signature_name || "Not entered"}
                        </p>
                        <p className="text-slate-600">
                          Signed: {formatDateTime(request.resident_signed_at)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-3 text-sm md:col-span-2">
                        <p className="font-medium text-slate-700">Staff Review</p>
                        <p className="mt-1 text-slate-600">Reviewed: {formatDateTime(request.reviewed_at)}</p>
                        <p className="text-slate-600">Status: {formatFeeLabel(request.status)}</p>
                        {request.denial_reason ? (
                          <p className="mt-2 whitespace-pre-wrap text-slate-600">
                            Denial reason: {request.denial_reason}
                          </p>
                        ) : null}
                        {request.provider_notes ? (
                          <p className="mt-2 whitespace-pre-wrap text-slate-600">
                            Follow-up action or notes: {request.provider_notes}
                          </p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {request.requires_court_order ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Court Order</span>
                          ) : null}
                          {request.requires_clinical_clearance ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Clinical Clearance</span>
                          ) : null}
                          {request.requires_emergency_travel_docs ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Emergency Travel Docs</span>
                          ) : null}
                          {request.requires_other_attachment ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              Other: {request.other_attachment_note || "Required"}
                            </span>
                          ) : null}
                          {!request.requires_court_order &&
                          !request.requires_clinical_clearance &&
                          !request.requires_emergency_travel_docs &&
                          !request.requires_other_attachment ? (
                            <span className="text-xs text-slate-500">No attachments marked required.</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        {formatFeeLabel(request.status)}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                        Submitted {formatDateTime(request.created_at)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {request.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => updatePassRequestStatus(request, "approved")}
                            disabled={savingMaintenanceRequest}
                            className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => updatePassRequestStatus(request, "denied")}
                            disabled={savingMaintenanceRequest}
                            className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-60"
                          >
                            Deny
                          </button>
                        </>
                      ) : null}

                      {request.status === "approved" ? (
                        <button
                          type="button"
                          onClick={() => updatePassRequestStatus(request, "completed")}
                          disabled={savingMaintenanceRequest}
                          className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                          Mark Complete
                        </button>
                      ) : null}

                      {request.status !== "completed" && request.status !== "cancelled" ? (
                        <button
                          type="button"
                          onClick={() => updatePassRequestStatus(request, "cancelled")}
                          disabled={savingMaintenanceRequest}
                          className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  function resetMaintenanceForm() {
    setMaintenanceFormHouseId("");
    setMaintenanceFormResidentId("");
    setMaintenanceFormTitle("");
    setMaintenanceFormDescription("");
    setMaintenanceFormLocation("");
    setMaintenanceFormPriority("normal");
    setMaintenanceFormNotes("");
  }

  async function createStaffMaintenanceRequest() {
    if (!providerId) {
      setError("No provider selected.");
      return;
    }

    if (!maintenanceFormTitle.trim()) {
      setError("Enter a maintenance request title.");
      return;
    }

    if (maintenanceFormDescription.trim().length < 10) {
      setError("Enter a maintenance description.");
      return;
    }

    try {
      setSavingMaintenanceRequest(true);
      setError("");
      setMessage("");

      const supabase = getSupabaseClient() as any;
      const selectedResident = residents.find((resident) => resident.id === maintenanceFormResidentId);
      const selectedHouseId = maintenanceFormHouseId || selectedResident?.house_id || null;

      const { data, error: insertError } = await supabase.rpc("create_staff_maintenance_request", {
        p_payload: {
          provider_id: providerId,
          house_id: selectedHouseId || null,
          resident_id: maintenanceFormResidentId || null,
          request_title: maintenanceFormTitle.trim(),
          request_description: maintenanceFormDescription.trim(),
          location_area: maintenanceFormLocation.trim() || null,
          priority: maintenanceFormPriority,
          provider_notes: maintenanceFormNotes.trim() || null,
        },
      });

      if (insertError) {
        throw insertError;
      }

      if (!data?.ok) {
        throw new Error(data?.message ?? "Could not create maintenance request.");
      }

      resetMaintenanceForm();
      setShowMaintenanceForm(false);
      setMessage("Maintenance request created.");
      await loadReports(providerId);
    } catch (err) {
      const maintenanceError = err as { message?: unknown };
      setError(maintenanceError?.message ? String(maintenanceError.message) : "Could not create maintenance request.");
    } finally {
      setSavingMaintenanceRequest(false);
    }
  }


  function openAttachmentChecklistPrompt(defaults: {
    courtOrder: boolean;
    clinicalClearance: boolean;
    emergencyTravelDocs: boolean;
    otherAttachment: boolean;
    otherAttachmentNote: string | null;
  }) {
    return new Promise<{
      courtOrder: boolean;
      clinicalClearance: boolean;
      emergencyTravelDocs: boolean;
      otherAttachment: boolean;
      otherAttachmentNote: string | null;
    } | null>((resolve) => {
      if (typeof document === "undefined") {
        resolve(null);
        return;
      }

      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.zIndex = "9999";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.background = "rgba(15, 23, 42, 0.45)";
      overlay.style.padding = "16px";

      const modal = document.createElement("div");
      modal.style.width = "100%";
      modal.style.maxWidth = "580px";
      modal.style.borderRadius = "24px";
      modal.style.background = "white";
      modal.style.padding = "24px";
      modal.style.boxShadow = "0 24px 80px rgba(15, 23, 42, 0.25)";

      const heading = document.createElement("h2");
      heading.textContent = "Required Attachments";
      heading.style.fontSize = "18px";
      heading.style.fontWeight = "700";
      heading.style.margin = "0";
      heading.style.color = "#020617";

      const helperText = document.createElement("p");
      helperText.textContent = "Select any documents or follow-up items required for this pass decision.";
      helperText.style.marginTop = "8px";
      helperText.style.fontSize = "14px";
      helperText.style.lineHeight = "20px";
      helperText.style.color = "#64748b";

      const checklist = document.createElement("div");
      checklist.style.marginTop = "16px";
      checklist.style.display = "grid";
      checklist.style.gap = "10px";

      function makeCheckbox(labelText: string, checked: boolean) {
        const label = document.createElement("label");
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "10px";
        label.style.border = "1px solid #e2e8f0";
        label.style.borderRadius = "14px";
        label.style.padding = "12px";
        label.style.fontSize = "14px";
        label.style.fontWeight = "600";
        label.style.color = "#334155";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = checked;
        input.style.width = "16px";
        input.style.height = "16px";

        const span = document.createElement("span");
        span.textContent = labelText;

        label.append(input, span);
        checklist.append(label);

        return input;
      }

      const courtOrderInput = makeCheckbox("Court Order", defaults.courtOrder);
      const clinicalInput = makeCheckbox("Clinical Clearance", defaults.clinicalClearance);
      const travelInput = makeCheckbox("Emergency Travel Docs", defaults.emergencyTravelDocs);
      const otherInput = makeCheckbox("Other Attachment", defaults.otherAttachment);

      const otherNote = document.createElement("textarea");
      otherNote.value = defaults.otherAttachmentNote ?? "";
      otherNote.rows = 4;
      otherNote.placeholder = "Describe other required attachment or follow-up item...";
      otherNote.style.marginTop = "12px";
      otherNote.style.width = "100%";
      otherNote.style.border = "1px solid #cbd5e1";
      otherNote.style.borderRadius = "14px";
      otherNote.style.padding = "12px";
      otherNote.style.fontSize = "14px";
      otherNote.style.outline = "none";
      otherNote.style.resize = "vertical";

      const buttonRow = document.createElement("div");
      buttonRow.style.display = "flex";
      buttonRow.style.justifyContent = "flex-end";
      buttonRow.style.gap = "12px";
      buttonRow.style.marginTop = "18px";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.textContent = "Cancel";
      cancelButton.style.border = "1px solid #cbd5e1";
      cancelButton.style.borderRadius = "12px";
      cancelButton.style.background = "white";
      cancelButton.style.padding = "9px 14px";
      cancelButton.style.fontSize = "14px";
      cancelButton.style.fontWeight = "600";
      cancelButton.style.cursor = "pointer";

      const continueButton = document.createElement("button");
      continueButton.type = "button";
      continueButton.textContent = "Continue";
      continueButton.style.border = "1px solid #020617";
      continueButton.style.borderRadius = "12px";
      continueButton.style.background = "#020617";
      continueButton.style.color = "white";
      continueButton.style.padding = "9px 14px";
      continueButton.style.fontSize = "14px";
      continueButton.style.fontWeight = "600";
      continueButton.style.cursor = "pointer";

      const close = (value: null | {
        courtOrder: boolean;
        clinicalClearance: boolean;
        emergencyTravelDocs: boolean;
        otherAttachment: boolean;
        otherAttachmentNote: string | null;
      }) => {
        overlay.remove();
        resolve(value);
      };

      cancelButton.onclick = () => close(null);
      continueButton.onclick = () =>
        close({
          courtOrder: courtOrderInput.checked,
          clinicalClearance: clinicalInput.checked,
          emergencyTravelDocs: travelInput.checked,
          otherAttachment: otherInput.checked,
          otherAttachmentNote: otherInput.checked ? otherNote.value.trim() || null : null,
        });

      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          close(null);
        }
      });

      buttonRow.append(cancelButton, continueButton);
      modal.append(heading, helperText, checklist, otherNote, buttonRow);
      overlay.append(modal);
      document.body.append(overlay);
    });
  }

  async function updateMaintenanceRequestStatus(request: MaintenanceRequestRow, nextStatus: string) {
    if (!providerId) {
      setError("No provider selected.");
      return;
    }

    const providerNotes = await openLargeTextPrompt("Provider notes or follow-up details:", request.provider_notes ?? "");

    if (providerNotes === null) {
      return;
    }

    if (providerNotes === null) {
      return;
    }

    try {
      setSavingMaintenanceRequest(true);
      setError("");
      setMessage("");

      const supabase = getSupabaseClient() as any;

      const { error: updateError } = await supabase
        .from("resident_maintenance_requests")
        .update({
          status: nextStatus,
          provider_notes: providerNotes.trim() || null,
          completed_at: nextStatus === "completed" ? new Date().toISOString() : request.completed_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) {
        throw updateError;
      }

      setMessage("Maintenance request updated.");
      await loadReports(providerId);
    } catch (err) {
      const maintenanceError = err as { message?: unknown };
      setError(maintenanceError?.message ? String(maintenanceError.message) : "Could not update maintenance request.");
    } finally {
      setSavingMaintenanceRequest(false);
    }
  }

  function renderMaintenanceLog() {
    return (
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Maintenance Log</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review maintenance requests submitted by residents or entered by staff.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowMaintenanceForm((current) => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              {showMaintenanceForm ? "Hide Form" : "Create Request"}
            </button>

            <button
              type="button"
              onClick={exportMaintenanceLogCsv}
              disabled={filteredMaintenanceRequests.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              Export Maintenance Log
            </button>
          </div>
        </div>

        {showMaintenanceForm ? (
          <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">Create Maintenance Request</h3>
            <p className="mt-1 text-sm text-slate-500">
              Staff can create requests here when an issue is reported outside the resident portal.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">House</span>
                <select
                  value={maintenanceFormHouseId}
                  onChange={(event) => setMaintenanceFormHouseId(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="">Select house, if applicable</option>
                  {activeHouses.map((house) => (
                    <option key={house.id} value={house.id}>
                      {house.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Resident</span>
                <select
                  value={maintenanceFormResidentId}
                  onChange={(event) => {
                    setMaintenanceFormResidentId(event.target.value);
                    const selectedResident = residents.find((resident) => resident.id === event.target.value);
                    if (selectedResident?.house_id) {
                      setMaintenanceFormHouseId(selectedResident.house_id);
                    }
                  }}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="">No resident selected</option>
                  {residents
                    .filter((resident) => String(resident.resident_status ?? "active").toLowerCase() !== "discharged")
                    .map((resident) => (
                      <option key={resident.id} value={resident.id}>
                        {resident.first_name} {resident.last_name}
                      </option>
                    ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Priority</span>
                <select
                  value={maintenanceFormPriority}
                  onChange={(event) => setMaintenanceFormPriority(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Request title</span>
                <input
                  value={maintenanceFormTitle}
                  onChange={(event) => setMaintenanceFormTitle(event.target.value)}
                  placeholder="Example: Bathroom sink leaking"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Location / area</span>
                <input
                  value={maintenanceFormLocation}
                  onChange={(event) => setMaintenanceFormLocation(event.target.value)}
                  placeholder="Example: Kitchen, bedroom 2"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block md:col-span-2 xl:col-span-3">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <textarea
                  value={maintenanceFormDescription}
                  onChange={(event) => setMaintenanceFormDescription(event.target.value)}
                  placeholder="Describe the maintenance issue and what staff should know."
                  className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block md:col-span-2 xl:col-span-3">
                <span className="text-sm font-medium text-slate-700">Provider notes</span>
                <textarea
                  value={maintenanceFormNotes}
                  onChange={(event) => setMaintenanceFormNotes(event.target.value)}
                  placeholder="Optional internal notes."
                  className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  resetMaintenanceForm();
                  setShowMaintenanceForm(false);
                }}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createStaffMaintenanceRequest}
                disabled={savingMaintenanceRequest}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingMaintenanceRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {savingMaintenanceRequest ? "Saving..." : "Save Request"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">House</span>
            <select
              value={maintenanceHouseFilter}
              onChange={(event) => setMaintenanceHouseFilter(event.target.value)}
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
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              value={maintenanceStatusFilter}
              onChange={(event) => setMaintenanceStatusFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="all">All statuses</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Priority</span>
            <select
              value={maintenancePriorityFilter}
              onChange={(event) => setMaintenancePriorityFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            >
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>

        {filteredMaintenanceRequests.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
            No maintenance requests match the selected filters.
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {filteredMaintenanceRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-950">{request.request_title}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {getMaintenanceHouseName(request)} • {getMaintenanceResidentName(request)}
                      {request.location_area ? ` • ${request.location_area}` : ""}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {request.request_description}
                    </p>
                    {request.provider_notes ? (
                      <p className="mt-2 whitespace-pre-wrap rounded-xl bg-white p-3 text-sm text-slate-600">
                        Provider notes: {request.provider_notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        {formatFeeLabel(request.status)}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        {formatFeeLabel(request.priority)}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                        {formatDateTime(request.created_at)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {request.status === "open" ? (
                        <button
                          type="button"
                          onClick={() => updateMaintenanceRequestStatus(request, "in_progress")}
                          disabled={savingMaintenanceRequest}
                          className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-60"
                        >
                          Start
                        </button>
                      ) : null}

                      {request.status !== "completed" ? (
                        <button
                          type="button"
                          onClick={() => updateMaintenanceRequestStatus(request, "completed")}
                          disabled={savingMaintenanceRequest}
                          className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                          Mark Complete
                        </button>
                      ) : null}

                      {request.status !== "cancelled" && request.status !== "completed" ? (
                        <button
                          type="button"
                          onClick={() => updateMaintenanceRequestStatus(request, "cancelled")}
                          disabled={savingMaintenanceRequest}
                          className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
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
          <div
            key={key}
            className={`rounded-xl border bg-slate-50 p-3 text-sm ${
              key === "meeting_minutes" ? "md:col-span-2" : ""
            }`}
          >
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Report folder</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              {showPassRequests
                ? "Pass Requests"
                : showMaintenanceLog
                  ? "Maintenance Log"
                  : showRollingFeeList
                    ? "Rolling Fee List"
                    : selectedReportType
                      ? selectedReportLabel
                      : "Select a report type"}
            </h2>
          </div>

          {showMaintenanceLog ? (
            <button
              type="button"
              onClick={exportMaintenanceLogCsv}
              disabled={filteredMaintenanceRequests.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              Export Maintenance Log
            </button>
          ) : showRollingFeeList ? (
            <button
              type="button"
              onClick={exportRollingFeeListCsv}
              disabled={filteredFeeCharges.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              Export Fee List
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowReportForm((current) => !current)}
              disabled={!selectedReportType}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {showReportForm ? "Hide Form" : "Create Report"}
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1">
          {reportTypes.map((reportType) => (
            <button
              key={reportType.value}
              type="button"
              onClick={() => {
                setSelectedReportType(reportType.value);
                setSavedReportsTab(reportType.value);
                setShowRollingFeeList(false);
                setShowMaintenanceLog(false);
                setShowPassRequests(false);
                setSelectedHouseIds([]);
                setResidentAttendance({});
                setShowReportForm(false);
                setForm({ ...initialForm, report_date: new Date().toISOString().slice(0, 10) });
                setMessage("");
                setError("");
              }}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                !showRollingFeeList && !showMaintenanceLog && !showPassRequests && selectedReportType === reportType.value
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {reportType.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              setShowRollingFeeList(true);
              setShowMaintenanceLog(false);
              setSelectedReportType(null);
              setShowReportForm(false);
              setMessage("");
              setError("");
            }}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              showRollingFeeList
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Rolling Fee List
          </button>

          <button
            type="button"
            onClick={() => {
              setShowMaintenanceLog(true);
              setShowRollingFeeList(false);
              setShowPassRequests(false);
              setSelectedReportType(null);
              setShowReportForm(false);
              setMessage("");
              setError("");
            }}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              showMaintenanceLog
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Maintenance Log{openMaintenanceCount > 0 ? ` (${openMaintenanceCount} open)` : ""}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowPassRequests(true);
              setShowMaintenanceLog(false);
              setShowRollingFeeList(false);
              setSelectedReportType(null);
              setShowReportForm(false);
              setMessage("");
              setError("");
            }}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              showPassRequests
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Pass Requests{pendingPassRequestCount > 0 ? ` (${pendingPassRequestCount} pending)` : ""}
          </button>
        </div>
      </section>

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

      {showRollingFeeList ? renderRollingFeeList() : null}
      {showMaintenanceLog ? renderMaintenanceLog() : null}
      {showPassRequests ? renderPassRequests() : null}

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
