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
  Eye,
  Home,
  Loader2,
  Printer,
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

const reportFieldLabels: Record<string, string> = {
  house_name_address: "House name / address",
  start_time: "Start time",
  end_time: "End time",
  safety_monitor_name: "Safety monitor's name",
  number_of_participants: "Number of participants",
  meeting_point: "Meeting point",
  summary_of_drill: "Summary of drill",
  barriers_obstacles: "Barriers / obstacles noted",
  areas_of_improvement: "Areas of improvement",
  notes_to_provider: "Notes to the provider",
  safety_monitor_signature: "Safety monitor signature",
  resident_meeting_attendance_notes: "Attendance notes",
  sponsorship_requirement: "Sponsorship requirement",
  recovery_plan_review: "Recovery plan review",
  house_maintenance_requests: "House maintenance requests",
  general_observations: "General observations",
  resident_concerns_successes: "Resident concerns or successes",
  staff_concerns_acknowledgments: "Staff concerns or acknowledgments",
  facilitator: "Facilitator name",
  recorder: "Recorder name",
  staff_present: "Staff present",
  residents_participating: "Residents participating, if applicable",
  prior_month_action_items: "Review of prior month's action items",
  program_developments: "Program developments",
  staff_updates: "Staff updates",
  incident_report_review: "Review of incident reports",
  discharges_resident_feedback: "Discharges and resident feedback",
  property_maintenance_issues: "Property and maintenance issues",
  resident_progress_review: "Resident progress review",
  financial_admin_review: "Financial and administrative review",
  house_meeting_feedback: "Resident feedback from house meetings",
  reported_to_farr: "Incident reported to FARR",
  incident_date: "Date of incident",
  farr_incident_types: "FARR reporting incident types",
  non_farr_incident_types: "Non-FARR internal incident types",
  narcan_used: "Narcan was used",
  narcan_from_farr: "Narcan was obtained from FARR",
  not_applicable_items: "Items marked not applicable / notes",
  person_completing: "Person completing assessment",
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

const incidentTextFields = [
  ["reporting_first_name", "Reporting party first name"],
  ["reporting_last_name", "Reporting party last name"],
  ["reporting_phone", "Reporting party phone"],
  ["reporting_email", "Reporting party email"],
  ["program_name", "Program name"],
  ["certification_status", "Certification status"],
  ["incident_address", "Address of incident"],
  ["incident_county", "County of incident"],
  ["incident_time", "Approximate time of incident"],
  ["narcan_doses", "If Narcan was used, how many doses?"],
  ["responder_arrival_time", "Emergency responder arrival time"],
  ["other_notified", "Other notifications"],
  ["gender", "Gender"],
  ["age", "Age"],
  ["drug_of_choice", "Drug of choice"],
  ["length_of_stay", "Length of stay in program"],
  ["last_drug_test_result", "Last drug test & result"],
] as const;

const incidentNarrativeFields = [
  ["incident_description", "Describe the incident"],
  ["actions_performed", "What actions were performed?"],
  ["pertinent_behaviors", "Pertinent behaviors prior to the incident"],
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

function escapePrintableHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getReportFieldLabel(fieldKey: string) {
  if (reportFieldLabels[fieldKey]) return reportFieldLabels[fieldKey];

  for (const section of selfSafetySections) {
    const item = section.items.find(([key]) => key === fieldKey);
    if (item) return item[1];
  }

  return fieldKey
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
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
  const [activeHouseTab, setActiveHouseTab] = useState<"residents" | "reports">("residents");
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
          .eq("resident_status", "active")
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

  function printReport(report: ProviderHouseReport) {
    const printWindow = window.open("", "_blank", "noopener,noreferrer");

    if (!printWindow) {
      setError("Pop-up blocked. Allow pop-ups to print or save this report.");
      return;
    }

    const reportDataRows = Object.entries(report.report_data ?? {})
      .map(([key, value]) => {
        if (key === "resident_attendance" && Array.isArray(value)) {
          const attendance = value as { resident_name?: string; present?: boolean }[];

          return `
            <section class="field full">
              <h3>Resident Attendance</h3>
              ${attendance
                .map(
                  (item) =>
                    `<p>${item.present ? "Present" : "Absent"}: ${escapePrintableHtml(item.resident_name ?? "Resident")}</p>`
                )
                .join("")}
            </section>
          `;
        }

        return `
          <section class="field">
            <h3>${escapePrintableHtml(getReportFieldLabel(key))}</h3>
            <p>${escapePrintableHtml(formatReportValue(value)).replaceAll("\n", "<br />")}</p>
          </section>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapePrintableHtml(getReportLabel(report.report_type))}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #0f172a;
              margin: 32px;
              line-height: 1.5;
            }
            header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            h1 {
              font-size: 24px;
              margin: 0 0 8px;
            }
            .meta {
              color: #475569;
              font-size: 13px;
              margin: 3px 0;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .field {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 12px;
              break-inside: avoid;
            }
            .field.full {
              grid-column: 1 / -1;
            }
            h3 {
              font-size: 13px;
              margin: 0 0 6px;
              color: #334155;
            }
            p {
              font-size: 13px;
              margin: 0;
              white-space: normal;
            }
            .follow-up {
              margin-top: 16px;
              border: 1px solid #f59e0b;
              background: #fffbeb;
              border-radius: 12px;
              padding: 12px;
            }
            @media print {
              button {
                display: none;
              }
              body {
                margin: 20px;
              }
            }
          </style>
        </head>
        <body>
          <button onclick="window.print()" style="margin-bottom: 20px; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; background: white; cursor: pointer;">
            Print / Save PDF
          </button>

          <header>
            <h1>${escapePrintableHtml(getReportLabel(report.report_type))}</h1>
            <p class="meta">Report Date: ${escapePrintableHtml(formatDate(report.report_date))}</p>
            <p class="meta">House Scope: ${escapePrintableHtml(getReportHouseScope(report))}</p>
            <p class="meta">Completed By: ${escapePrintableHtml(report.completed_by ?? "Not entered")}</p>
            <p class="meta">Follow-Up: ${
              report.follow_up_needed
                ? report.follow_up_resolved
                  ? "Resolved"
                  : "Needed"
                : "Not needed"
            }</p>
          </header>

          <main class="grid">
            ${reportDataRows || '<section class="field full"><h3>Report Details</h3><p>No detailed form fields were saved.</p></section>'}
          </main>

          ${
            report.follow_up_notes
              ? `<section class="follow-up"><h3>Follow-Up Notes</h3><p>${escapePrintableHtml(report.follow_up_notes).replaceAll("\n", "<br />")}</p></section>`
              : ""
          }

          ${
            report.follow_up_resolution_notes
              ? `<section class="follow-up"><h3>Resolution Notes</h3><p>${escapePrintableHtml(report.follow_up_resolution_notes).replaceAll("\n", "<br />")}</p></section>`
              : ""
          }
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
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

  function renderSelfSafetyReportView(report: ProviderHouseReport) {
    const data = report.report_data ?? {};

    return (
      <div className="mt-6 space-y-4">
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
            <p className="font-medium text-slate-700">{getReportFieldLabel(key)}</p>
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
      <Link
        href="/houses"
        className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to houses
      </Link>

      {loading ? (
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
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
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                  <Home className="h-7 w-7 text-slate-700" />
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">House Profile</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight">{house.name}</h1>

                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                    {[house.street_address, house.city, house.state].filter(Boolean).join(", ") ||
                      "Address not complete"}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {house.gender_served || "Gender not entered"}
                    </span>

                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {house.farr_level || "Level not entered"}
                    </span>
                  </div>
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


          <section className="rounded-2xl border bg-white p-3 shadow-sm">
            <div className="inline-flex rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActiveHouseTab("residents")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  activeHouseTab === "residents"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Residents
              </button>

              <button
                type="button"
                onClick={() => setActiveHouseTab("reports")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  activeHouseTab === "reports"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Reports / Logs
              </button>
            </div>
          </section>

          {activeHouseTab === "residents" ? (
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Residents</h2>
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
                  <div
                    key={resident.id}
                    className="rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {resident.first_name} {resident.last_name}
                        </p>
                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                          Assigned Resident
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-100 p-2">
                        <BedDouble className="h-5 w-5 text-slate-500" />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Phase</p>
                        <p className="mt-1 text-sm font-medium text-slate-950">
                          {resident.current_phase || "Not selected"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Admission</p>
                        <p className="mt-1 text-sm font-medium text-slate-950">
                          {formatDate(resident.admission_date)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Link
                        href={`/residents/${resident.id}`}
                        className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        View Resident
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          ) : (
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Reports / Logs</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Current compliance status for this house.
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

            <div className="mt-5 overflow-hidden rounded-2xl border">
              <div className="hidden grid-cols-[1.4fr_0.8fr_1fr_1fr_0.8fr_0.6fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid">
                <span>Report</span>
                <span>Status</span>
                <span>Last Completed</span>
                <span>Next Due / Count</span>
                <span>Follow-Up</span>
                <span className="text-right">Action</span>
              </div>

              <div className="divide-y">
                {reportTypes.map((reportType) => {
                  const reportsForType = getReportsForType(reportType.value);
                  const latestReport = reportsForType[0] ?? null;
                  const dueStatus = getDueStatus(reportType.value, latestReport?.report_date ?? null);
                  const followUpCount = reportsForType.filter((report) => report.follow_up_needed && !report.follow_up_resolved).length;

                  return (
                    <div
                      key={reportType.value}
                      className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1.4fr_0.8fr_1fr_1fr_0.8fr_0.6fr] md:items-center"
                    >
                      <div>
                        <p className="font-medium text-slate-950">{reportType.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{reportType.frequency}</p>
                      </div>

                      <div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${dueStatus.className}`}>
                          {dueStatus.label}
                        </span>
                      </div>

                      <p className="text-slate-600">
                        {latestReport ? formatDate(latestReport.report_date) : "None"}
                      </p>

                      <p className="text-slate-600">
                        {reportType.value !== "incident_reporting"
                          ? formatDueDate(dueStatus.nextDueDate)
                          : `${reportsForType.length} incident${reportsForType.length === 1 ? "" : "s"}`}
                      </p>

                      <p className={followUpCount > 0 ? "font-medium text-amber-700" : "text-slate-500"}>
                        {followUpCount > 0 ? `${followUpCount} open` : "None"}
                      </p>

                      <div className="flex justify-start md:justify-end">
                        {latestReport ? (
                          <button
                            type="button"
                            onClick={() => setSelectedViewReport(latestReport)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {openFollowUps.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-medium">Open follow-ups need attention.</p>
                <p className="mt-1">
                  Resolve follow-up items from the main Reports page.
                </p>
              </div>
            ) : null}
          </section>
          )}

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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printReport(selectedViewReport)}
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  <Printer className="h-4 w-4" />
                  Print / Save PDF
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedViewReport(null)}
                  className="rounded-xl border bg-white p-2 hover:bg-slate-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
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
