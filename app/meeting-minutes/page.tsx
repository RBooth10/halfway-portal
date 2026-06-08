"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  Loader2,
  Users,
  X,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";
import { resolveActiveProviderId } from "@/lib/providerAccess";

const meetingTypes = [
  { value: "weekly_house_meeting_minutes", label: "Weekly House Meeting Minutes", frequency: "Weekly" },
  { value: "monthly_staff_meeting_minutes", label: "Monthly Staff/QI Meeting Minutes", frequency: "Monthly" },
] as const;

type MeetingType = (typeof meetingTypes)[number]["value"];

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
  report_type: MeetingType;
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

type MeetingForm = {
  report_date: string;
  completed_by: string;
  follow_up_needed: boolean;
  follow_up_notes: string;
  report_data: ReportJson;
};

const initialForm: MeetingForm = {
  report_date: new Date().toISOString().slice(0, 10),
  completed_by: "",
  follow_up_needed: false,
  follow_up_notes: "",
  report_data: {},
};

const weeklyFields = [
  {
    key: "meeting_minutes",
    label: "Meeting minutes / notes",
    placeholder:
      "Document attendance notes, topics discussed, sponsorship or home group updates, recovery plan progress, maintenance requests, resident concerns or successes, staff observations, action items, and follow-up needs.",
  },
];

const monthlyStaffFields = [
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
];

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

function formatLabel(value: string | null | undefined) {
  if (!value) return "Not set";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(dateString: string, months: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
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

export default function MeetingMinutesPage() {
  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerName, setProviderName] = useState("Current Provider");
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [meetingReports, setMeetingReports] = useState<ProviderHouseReport[]>([]);

  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingType>("weekly_house_meeting_minutes");
  const [savedMeetingTab, setSavedMeetingTab] = useState<MeetingType>("weekly_house_meeting_minutes");
  const [selectedHouseIds, setSelectedHouseIds] = useState<string[]>([]);
  const [residentAttendance, setResidentAttendance] = useState<Record<string, boolean>>({});
  const [selectedViewReport, setSelectedViewReport] = useState<ProviderHouseReport | null>(null);

  const [form, setForm] = useState<MeetingForm>(initialForm);
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
    () => meetingReports.filter((report) => report.report_type === savedMeetingTab),
    [meetingReports, savedMeetingTab]
  );

  useEffect(() => {
    if (selectedMeetingType !== "weekly_house_meeting_minutes") {
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
  }, [selectedMeetingType, selectedHouseResidents]);

  async function loadMeetingMinutes(activeProviderId: string) {
    const supabase = getSupabaseClient() as any;

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
      .in("report_type", ["weekly_house_meeting_minutes", "monthly_staff_meeting_minutes"])
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (providerResult.error) throw providerResult.error;
    if (housesResult.error) throw housesResult.error;
    if (residentsResult.error) throw residentsResult.error;
    if (reportsResult.error) throw reportsResult.error;

    const providerData = providerResult.data ?? {};
    setProviderName(providerData.legal_name || "Current Provider");
    setHouses((housesResult.data ?? []) as HouseRow[]);
    setResidents((residentsResult.data ?? []) as ResidentRow[]);
    setMeetingReports((reportsResult.data ?? []) as ProviderHouseReport[]);
  }

  useEffect(() => {
    async function initialize() {
      try {
        setLoading(true);
        setError("");

        const supabase = getSupabaseClient() as any;
        const { providerId: activeProviderId } = await resolveActiveProviderId(supabase);

        if (!activeProviderId) {
          setError("No provider selected yet. Go to Provider Onboarding first and save a provider profile.");
          return;
        }

        setProviderId(activeProviderId);
        await loadMeetingMinutes(activeProviderId);
      } catch (err) {
        const loadError = err as { message?: unknown };
        setError(loadError?.message ? String(loadError.message) : "Could not load meeting minutes.");
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, []);

  function getMeetingLabel(type: MeetingType) {
    return meetingTypes.find((item) => item.value === type)?.label ?? formatLabel(type);
  }

  function getMeetingFrequency(type: MeetingType) {
    return meetingTypes.find((item) => item.value === type)?.frequency ?? "Meeting";
  }

  function getReportTargetHouseIds(report: ProviderHouseReport) {
    return report.provider_house_report_houses?.map((target) => target.house_id).filter(Boolean) ?? [];
  }

  function getHouseName(houseId: string | null | undefined) {
    if (!houseId) return "Not assigned";
    return houses.find((house) => house.id === houseId)?.name ?? "Unknown house";
  }

  function getReportHouseNames(report: ProviderHouseReport) {
    const targetIds = getReportTargetHouseIds(report);

    if (targetIds.length === 0 && report.applies_to_scope === "all_houses") return "All houses";
    if (targetIds.length === 0) return getHouseName(report.house_id);
    if (targetIds.length === activeHouses.length) return "All houses";

    return targetIds
      .map((houseId) => houses.find((house) => house.id === houseId)?.name)
      .filter(Boolean)
      .join(", ");
  }

  function getLastReportForHouse(houseId: string, meetingType: MeetingType) {
    return (
      meetingReports
        .filter((report) => report.report_type === meetingType)
        .filter((report) => {
          const targetIds = getReportTargetHouseIds(report);
          if (targetIds.length > 0) return targetIds.includes(houseId);
          return report.applies_to_scope === "all_houses" || report.house_id === houseId;
        })
        .sort((first, second) => second.report_date.localeCompare(first.report_date))[0] ?? null
    );
  }

  function getDueStatus(meetingType: MeetingType, lastReportDate: string | null) {
    if (!lastReportDate) {
      return {
        label: "Not started",
        className: "bg-amber-50 text-amber-700 ring-amber-600/20",
        nextDueDate: null as string | null,
      };
    }

    const nextDueDate =
      meetingType === "weekly_house_meeting_minutes"
        ? addDays(lastReportDate, 7)
        : addMonths(lastReportDate, 1);

    const today = new Date().toISOString().slice(0, 10);

    if (nextDueDate < today) {
      return {
        label: "Overdue",
        className: "bg-rose-50 text-rose-700 ring-rose-600/20",
        nextDueDate,
      };
    }

    return {
      label: "Current",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
      nextDueDate,
    };
  }

  function getTextValue(key: string) {
    const value = form.report_data[key];
    return typeof value === "string" ? value : "";
  }

  function updateReportDataField(key: string, value: string) {
    setForm((current) => ({
      ...current,
      report_data: {
        ...current.report_data,
        [key]: value,
      },
    }));
  }

  function updateForm<K extends keyof MeetingForm>(key: K, value: MeetingForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
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
    setSelectedHouseIds((current) =>
      current.length === activeHouses.length ? [] : activeHouses.map((house) => house.id)
    );
  }

  function toggleResidentAttendance(residentId: string) {
    setResidentAttendance((current) => ({
      ...current,
      [residentId]: !(current[residentId] ?? false),
    }));
  }

  async function saveMeetingMinutes() {
    setSaving(true);
    setMessage("");
    setError("");

    if (!providerId) {
      setSaving(false);
      setError("No provider selected. Save a provider profile first.");
      return;
    }

    if (selectedHouseIds.length === 0) {
      setSaving(false);
      setError("Select at least one house for these meeting minutes.");
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
        selectedMeetingType === "weekly_house_meeting_minutes"
          ? selectedHouseResidents.map((resident) => ({
              resident_id: resident.id,
              resident_name: `${resident.first_name} ${resident.last_name}`,
              house_id: resident.house_id,
              present: residentAttendance[resident.id] ?? false,
            }))
          : [];

      const fullReportData: ReportJson = {
        ...form.report_data,
        ...(selectedMeetingType === "weekly_house_meeting_minutes"
          ? { resident_attendance: residentAttendanceData }
          : {}),
      };

      const { data, error: insertError } = await supabase
        .from("provider_house_reports")
        .insert({
          provider_id: providerId,
          report_type: selectedMeetingType,
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
      setSavedMeetingTab(selectedMeetingType);
      setMessage(`${getMeetingLabel(selectedMeetingType)} saved successfully.`);
      await loadMeetingMinutes(providerId);
    } catch (err) {
      const saveError = err as { message?: unknown };
      setError(saveError?.message ? String(saveError.message) : "Could not save meeting minutes.");
    } finally {
      setSaving(false);
    }
  }

  function renderWeeklyFields() {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border bg-slate-50 p-4">
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

        <div className="rounded-2xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">House Meeting Notes</h3>
          <p className="mt-1 text-sm text-slate-500">
            Complete the sections below based on the weekly house meeting format.
          </p>

          <div className="mt-4 grid gap-4">
            {weeklyFields.map((field) => (
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

  function renderMonthlyStaffFields() {
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
            {monthlyStaffFields
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

  function renderReportDataSummary(report: ProviderHouseReport) {
    const data = report.report_data ?? {};

    if (report.report_type === "weekly_house_meeting_minutes") {
      const attendance = Array.isArray(data.resident_attendance) ? data.resident_attendance : [];

      return (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">Meeting minutes / notes</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {typeof data.meeting_minutes === "string" && data.meeting_minutes ? data.meeting_minutes : "Not entered"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">Resident Attendance</h3>
            {attendance.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No attendance saved.</p>
            ) : (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {attendance.map((item, index) => {
                  const attendee = item as { resident_name?: string; present?: boolean };

                  return (
                    <div key={`${attendee.resident_name ?? "resident"}-${index}`} className="rounded-xl bg-white p-3 text-sm">
                      <span className="font-medium text-slate-950">{attendee.resident_name ?? "Resident"}</span>
                      <span className="ml-2 text-slate-500">{attendee.present ? "Present" : "Absent"}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="mt-6 grid gap-3">
        {monthlyStaffFields.map((field) => {
          const value = data[field.key];

          return (
            <div key={field.key} className="rounded-2xl bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">{field.label}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {typeof value === "string" && value ? value : "Not entered"}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <PageShell>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
            <ClipboardList className="h-6 w-6 text-slate-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Meeting Minutes</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Weekly House Meeting & Monthly Staff/QI Minutes
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Create, review, and track meeting minutes separately from compliance reports.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-500">Provider: {providerName}</p>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <ClipboardList className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Create Meeting Minutes</h2>
            <p className="mt-1 text-sm text-slate-500">Choose a meeting type, select the house or houses, then save the minutes.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Meeting type</span>
            <select
              value={selectedMeetingType}
              onChange={(event) => {
                const nextType = event.target.value as MeetingType;
                setSelectedMeetingType(nextType);
                setSavedMeetingTab(nextType);
                setForm({ ...initialForm, report_date: new Date().toISOString().slice(0, 10) });
                setSelectedHouseIds([]);
                setResidentAttendance({});
              }}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            >
              {meetingTypes.map((meetingType) => (
                <option key={meetingType.value} value={meetingType.value}>
                  {meetingType.label}
                </option>
              ))}
            </select>
          </label>

          <TextField
            label="Meeting date"
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

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Frequency</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{getMeetingFrequency(selectedMeetingType)}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Applies to Houses</h3>
              <p className="mt-1 text-sm text-slate-500">Select one, multiple, or all active houses.</p>
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

        {selectedMeetingType === "weekly_house_meeting_minutes" ? renderWeeklyFields() : renderMonthlyStaffFields()}

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
              <span className="mt-1 block text-sm text-slate-500">Use this for action items, maintenance needs, staffing follow-up, or QI review.</span>
            </span>
          </label>

          {form.follow_up_needed ? (
            <div className="mt-4">
              <TextAreaField
                label="Follow-up notes"
                value={form.follow_up_notes}
                onChange={(value) => updateForm("follow_up_notes", value)}
                placeholder="Describe follow-up needed, person responsible, and timeline."
              />
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={saveMeetingMinutes}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Meeting Minutes"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <CalendarDays className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Next Due by House</h2>
            <p className="mt-1 text-sm text-slate-500">Showing due status for {getMeetingLabel(selectedMeetingType)}.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeHouses.map((house) => {
            const latestReport = getLastReportForHouse(house.id, selectedMeetingType);
            const dueStatus = getDueStatus(selectedMeetingType, latestReport?.report_date ?? null);

            return (
              <div key={house.id} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-950">{house.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">Last: {latestReport ? formatDate(latestReport.report_date) : "None"}</p>
                    <p className="mt-1 text-xs text-slate-500">Next due: {dueStatus.nextDueDate ? formatDate(dueStatus.nextDueDate) : "Not set"}</p>
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

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <ClipboardList className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Saved Meeting Minutes</h2>
            <p className="mt-1 text-sm text-slate-500">Review saved weekly and monthly meeting records.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1">
          {meetingTypes.map((meetingType) => (
            <button
              key={meetingType.value}
              type="button"
              onClick={() => setSavedMeetingTab(meetingType.value)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                savedMeetingTab === meetingType.value
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {meetingType.label}
            </button>
          ))}
        </div>

        {filteredReports.length === 0 ? (
          <div className="mt-5 rounded-3xl bg-slate-50 p-5 text-sm text-slate-500">
            No {getMeetingLabel(savedMeetingTab).toLowerCase()} have been saved yet.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {filteredReports.map((report) => (
              <div key={report.id} className="rounded-3xl border bg-white p-4 shadow-sm transition hover:shadow-md">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-950">{getMeetingLabel(report.report_type)}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(report.report_date)} • {getReportHouseNames(report)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Frequency: {getMeetingFrequency(report.report_type)}
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
                      View Minutes
                    </button>

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
                  <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{report.follow_up_notes}</p>
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
                <p className="text-sm font-medium text-slate-500">Submitted Meeting Minutes</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">{getMeetingLabel(selectedViewReport.report_type)}</h2>
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
