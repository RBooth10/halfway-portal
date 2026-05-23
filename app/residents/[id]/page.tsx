"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  FolderOpen,
  HeartHandshake,
  Home,
  Loader2,
  MessageSquarePlus,
  Pill,
  Plus,
  ShieldCheck,
  User,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";
import { createAuditLog } from "@/lib/audit";

type ResidentDetail = {
  id: string;
  provider_id: string;
  house_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  admission_date: string | null;
  resident_status: string;
  file_status: string;
  medication_status: string;
  rci_status: string;
  current_phase: string | null;
  has_sponsor: boolean;
  has_home_group: boolean;
  attending_required_meetings: boolean;
  recovery_plan_started: boolean;
  program_fees_current: boolean;
  medication_status_reviewed: boolean;
  notes: string | null;
  created_at: string;
};

type HouseRow = {
  id: string;
  name: string;
};

type DocumentRow = {
  id: string;
  document_name: string;
  category: string;
  status: string;
  file_url: string | null;
};

type ProgressNoteRow = {
  id: string;
  provider_id: string;
  resident_id: string;
  author_auth_user_id: string | null;
  note_type: string;
  note_text: string;
  visibility: string;
  created_at: string;
};

type UaBaLogRow = {
  id: string;
  provider_id: string;
  resident_id: string;
  created_by_auth_user_id: string | null;
  collection_date: string;
  test_type: string;
  result: string;
  breathalyzer_result: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
};

type MedicationRecordRow = {
  id: string;
  provider_id: string;
  resident_id: string;
  created_by_auth_user_id: string | null;
  medication_name: string;
  medication_type: string;
  dosage: string | null;
  prescribing_provider: string | null;
  pharmacy: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  mat_mar_related: boolean;
  storage_notes: string | null;
  notes: string | null;
  created_at: string;
};

type MedicationLogRow = {
  id: string;
  provider_id: string;
  resident_id: string;
  medication_record_id: string | null;
  created_by_auth_user_id: string | null;
  log_date: string;
  log_type: string;
  all_current_meds_checked: boolean;
  checked_medications: Array<{
    id: string;
    medication_name: string;
    dosage: string | null;
    status: string;
    mat_mar_related: boolean;
  }>;
  note_text: string;
  follow_up_needed: boolean;
  follow_up_notes: string | null;
  created_at: string;
};

type RciAssessmentRow = {
  id: string;
  provider_id: string;
  resident_id: string;
  created_by_auth_user_id: string | null;
  assessment_date: string;
  rci_version: string;
  rci_score: number | null;
  recovery_capital_level: string | null;
  status: string;
  strengths_summary: string | null;
  needs_summary: string | null;
  notes: string | null;
  client_access_token: string | null;
  client_link_expires_at: string | null;
  client_completed_at: string | null;
  client_name: string | null;
  client_email: string | null;
  personal_capital_score: number | null;
  personal_capital_level: string | null;
  personal_capital_summary: string | null;
  social_capital_score: number | null;
  social_capital_level: string | null;
  social_capital_summary: string | null;
  cultural_capital_score: number | null;
  cultural_capital_level: string | null;
  cultural_capital_summary: string | null;
  overall_summary: string | null;
  created_at: string;
};

type RecoveryGoalRow = {
  id: string;
  provider_id: string;
  resident_id: string;
  rci_assessment_id: string | null;
  created_by_auth_user_id: string | null;
  created_by_source: string;
  goal_area: string;
  goal_text: string;
  action_steps: string | null;
  supports_needed: string | null;
  target_date: string | null;
  priority: string;
  status: string;
  progress_notes: string | null;
  created_at: string;
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
          <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3">
          <Icon className="h-6 w-6 text-slate-700" />
        </div>
      </div>
    </div>
  );
}

function DetailBlock({
  title,
  value,
}: {
  title: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-medium text-slate-950">{value || "Not entered"}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not entered";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function daysSince(value: string | null) {
  if (!value) return "Not completed";

  const start = new Date(value);
  const today = new Date();

  if (Number.isNaN(start.getTime())) return "Not completed";

  const diffMs = today.getTime() - start.getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function TabButton({
  active,
  label,
  status,
  onClick,
}: {
  active: boolean;
  label: string;
  status?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "border-b-2 border-slate-950 bg-white px-5 py-3 text-left text-sm font-semibold text-slate-950"
          : "border-b-2 border-transparent bg-white px-5 py-3 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }
    >
      <span className="block">{label}</span>
      {status ? (
        <span className="mt-0.5 block text-xs font-normal text-slate-500">
          {status}
        </span>
      ) : null}
    </button>
  );
}

function SnapshotAction({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border bg-white p-4 text-left shadow-sm hover:bg-slate-50"
    >
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </button>
  );
}

export default function ResidentProfilePage() {
  const params = useParams<{ id: string }>();
  const residentId = params.id;

  const [resident, setResident] = useState<ResidentDetail | null>(null);
  const [house, setHouse] = useState<HouseRow | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [progressNotes, setProgressNotes] = useState<ProgressNoteRow[]>([]);
  const [uaBaLogs, setUaBaLogs] = useState<UaBaLogRow[]>([]);
  const [medicationRecords, setMedicationRecords] = useState<MedicationRecordRow[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLogRow[]>([]);
  const [rciAssessments, setRciAssessments] = useState<RciAssessmentRow[]>([]);
  const [recoveryGoals, setRecoveryGoals] = useState<RecoveryGoalRow[]>([]);
  const [clientRciLink, setClientRciLink] = useState("");
  const [generatingRciLink, setGeneratingRciLink] = useState(false);
  const [savingSnapshotStatus, setSavingSnapshotStatus] = useState(false);
  const [providerName, setProviderName] = useState("Current Provider");
  const [activeTab, setActiveTab] = useState("snapshot");
  const [medLogDate, setMedLogDate] = useState("");
  const [medLogType, setMedLogType] = useState("med_box_check");
  const [selectedMedicationRecordId, setSelectedMedicationRecordId] = useState("");
  const [checkedMedicationIds, setCheckedMedicationIds] = useState<string[]>([]);
  const [medLogNote, setMedLogNote] = useState("");
  const [medLogSelfAdministered, setMedLogSelfAdministered] = useState(true);
  const [medFollowUpNeeded, setMedFollowUpNeeded] = useState(false);
  const [medFollowUpNotes, setMedFollowUpNotes] = useState("");
  const [savingMedicationLog, setSavingMedicationLog] = useState(false);
  const [medicationName, setMedicationName] = useState("");
  const [medicationType, setMedicationType] = useState("prescription");
  const [dosage, setDosage] = useState("");
  const [prescribingProvider, setPrescribingProvider] = useState("");
  const [pharmacy, setPharmacy] = useState("");
  const [medicationStartDate, setMedicationStartDate] = useState("");
  const [medicationEndDate, setMedicationEndDate] = useState("");
  const [medicationStatus, setMedicationStatus] = useState("active");
  const [matMarRelated, setMatMarRelated] = useState(false);
  const [storageNotes, setStorageNotes] = useState("");
  const [medicationNotes, setMedicationNotes] = useState("");
  const [savingMedication, setSavingMedication] = useState(false);
  const [collectionDate, setCollectionDate] = useState("");
  const [testType, setTestType] = useState("UA");
  const [testResult, setTestResult] = useState("pending");
  const [breathalyzerResult, setBreathalyzerResult] = useState("");
  const [testReason, setTestReason] = useState("");
  const [testNotes, setTestNotes] = useState("");
  const [savingUaBaLog, setSavingUaBaLog] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [savingNote, setSavingNote] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadResidentProfile() {
    try {
      const supabase = getSupabaseClient();

      const residentResult = await supabase
        .from("residents")
        .select("*")
        .eq("id", residentId)
        .single();

      if (residentResult.error) {
        throw residentResult.error;
      }

      const residentData = residentResult.data as ResidentDetail;
      setResident(residentData);
      localStorage.setItem("current_provider_id", residentData.provider_id);

      const providerResult = await supabase
        .from("providers")
        .select("legal_name")
        .eq("id", residentData.provider_id)
        .single();

      if (!providerResult.error && providerResult.data?.legal_name) {
        setProviderName(providerResult.data.legal_name);
      }

      if (residentData.house_id) {
        const houseResult = await supabase
          .from("houses")
          .select("id, name")
          .eq("id", residentData.house_id)
          .single();

        if (!houseResult.error) {
          setHouse(houseResult.data as HouseRow);
        }
      }

      const documentsResult = await supabase
        .from("documents")
        .select("id, document_name, category, status, file_url")
        .eq("resident_id", residentData.id)
        .order("created_at", { ascending: false });

      if (!documentsResult.error) {
        setDocuments((documentsResult.data ?? []) as DocumentRow[]);
      }

      const notesResult = await supabase
        .from("progress_notes")
        .select("*")
        .eq("resident_id", residentData.id)
        .order("created_at", { ascending: false });

      if (notesResult.error) {
        throw notesResult.error;
      }

      setProgressNotes((notesResult.data ?? []) as ProgressNoteRow[]);

      const uaBaResult = await supabase
        .from("ua_ba_logs")
        .select("*")
        .eq("resident_id", residentData.id)
        .order("collection_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (uaBaResult.error) {
        throw uaBaResult.error;
      }

      setUaBaLogs((uaBaResult.data ?? []) as UaBaLogRow[]);

      const medicationResult = await supabase
        .from("medication_records")
        .select("*")
        .eq("resident_id", residentData.id)
        .order("created_at", { ascending: false });

      if (medicationResult.error) {
        throw medicationResult.error;
      }

      setMedicationRecords((medicationResult.data ?? []) as MedicationRecordRow[]);

      const medicationLogsResult = await supabase
        .from("medication_logs")
        .select("*")
        .eq("resident_id", residentData.id)
        .order("log_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (medicationLogsResult.error) {
        throw medicationLogsResult.error;
      }

      setMedicationLogs((medicationLogsResult.data ?? []) as MedicationLogRow[]);

      const rciResult = await supabase
        .from("rci_assessments")
        .select("*")
        .eq("resident_id", residentData.id)
        .order("created_at", { ascending: false });

      if (rciResult.error) {
        throw rciResult.error;
      }

      setRciAssessments((rciResult.data ?? []) as RciAssessmentRow[]);

      const recoveryGoalsResult = await supabase
        .from("recovery_goals")
        .select("*")
        .eq("resident_id", residentData.id)
        .order("created_at", { ascending: false });

      if (recoveryGoalsResult.error) {
        throw recoveryGoalsResult.error;
      }

      setRecoveryGoals((recoveryGoalsResult.data ?? []) as RecoveryGoalRow[]);
    } catch (err) {
      const profileError = err as { message?: unknown };
      setError(profileError?.message ? String(profileError.message) : "Could not load resident profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadResidentProfile());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentId]);

  async function saveProgressNote() {
    setSavingNote(true);
    setMessage("");
    setError("");

    if (!resident) {
      setSavingNote(false);
      setError("Resident profile is not loaded yet.");
      return;
    }

    if (!noteText.trim()) {
      setSavingNote(false);
      setError("Progress note cannot be blank.");
      return;
    }

    try {
      const supabase = getSupabaseClient();

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("progress_notes")
        .insert({
          provider_id: resident.provider_id,
          resident_id: resident.id,
          author_auth_user_id: userData.user?.id ?? null,
          note_type: noteType,
          note_text: noteText.trim(),
          visibility: "internal",
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setProgressNotes((current) => [data as ProgressNoteRow, ...current]);
      setNoteText("");
      setNoteType("general");
      setMessage("Progress note saved successfully.");

      await createAuditLog({
        providerId: resident.provider_id,
        action: "progress_note_created",
        tableName: "progress_notes",
        recordId: data.id,
        oldValues: null,
        newValues: data as Record<string, unknown>,
        reason: "Progress note created from resident profile.",
      });
    } catch (err) {
      const noteError = err as { message?: unknown };
      setError(noteError?.message ? String(noteError.message) : "Could not save progress note.");
    } finally {
      setSavingNote(false);
    }
  }

  async function saveUaBaLog() {
    setSavingUaBaLog(true);
    setMessage("");
    setError("");

    if (!resident) {
      setSavingUaBaLog(false);
      setError("Resident profile is not loaded yet.");
      return;
    }

    try {
      const supabase = getSupabaseClient();

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("ua_ba_logs")
        .insert({
          provider_id: resident.provider_id,
          resident_id: resident.id,
          created_by_auth_user_id: userData.user?.id ?? null,
          collection_date: collectionDate || new Date().toISOString().slice(0, 10),
          test_type: testType,
          result: testResult,
          breathalyzer_result: breathalyzerResult.trim() || null,
          reason: testReason.trim() || null,
          notes: testNotes.trim() || null,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setUaBaLogs((current) => [data as UaBaLogRow, ...current]);
      setCollectionDate("");
      setTestType("UA");
      setTestResult("pending");
      setBreathalyzerResult("");
      setTestReason("");
      setTestNotes("");
      setMessage("UA/BA log saved successfully.");

      await createAuditLog({
        providerId: resident.provider_id,
        action: "ua_ba_log_created",
        tableName: "ua_ba_logs",
        recordId: data.id,
        oldValues: null,
        newValues: data as Record<string, unknown>,
        reason: "UA/BA log created from resident profile.",
      });
    } catch (err) {
      const testError = err as { message?: unknown };
      setError(testError?.message ? String(testError.message) : "Could not save UA/BA log.");
    } finally {
      setSavingUaBaLog(false);
    }
  }

  function toggleCheckedMedication(medicationId: string) {
    setCheckedMedicationIds((current) =>
      current.includes(medicationId)
        ? current.filter((id) => id !== medicationId)
        : [...current, medicationId]
    );
  }

  function checkAllCurrentMedications() {
    const activeMedicationIds = medicationRecords
      .filter((medication) => medication.status === "active")
      .map((medication) => medication.id);

    setCheckedMedicationIds(activeMedicationIds);
  }

  function clearCheckedMedications() {
    setCheckedMedicationIds([]);
  }

  async function saveMedicationLog() {
    setSavingMedicationLog(true);
    setMessage("");
    setError("");

    if (!resident) {
      setSavingMedicationLog(false);
      setError("Resident profile is not loaded yet.");
      return;
    }

    const selectedMedication = medicationRecords.find(
      (medication) => medication.id === selectedMedicationRecordId
    );

    const checkedMedicationSnapshot = medicationRecords
      .filter((medication) => checkedMedicationIds.includes(medication.id))
      .map((medication) => ({
        id: medication.id,
        medication_name: medication.medication_name,
        dosage: medication.dosage,
        status: medication.status,
        mat_mar_related: medication.mat_mar_related,
      }));

    if (!medLogNote.trim() && checkedMedicationSnapshot.length === 0) {
      setSavingMedicationLog(false);
      setError("Add a medication log note or check off at least one medication.");
      return;
    }

    try {
      const supabase = getSupabaseClient();

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("medication_logs")
        .insert({
          provider_id: resident.provider_id,
          resident_id: resident.id,
          medication_record_id: selectedMedicationRecordId || null,
          created_by_auth_user_id: userData.user?.id ?? null,
          log_date: medLogDate || new Date().toISOString().slice(0, 10),
          log_type: medLogType,
          all_current_meds_checked:
            medicationRecords.filter((medication) => medication.status === "active").length > 0 &&
            checkedMedicationSnapshot.length === medicationRecords.filter((medication) => medication.status === "active").length,
          checked_medications: checkedMedicationSnapshot,
          note_text: medLogNote.trim() || "Medication log completed.",
          self_administered: medLogSelfAdministered,
          follow_up_needed: medFollowUpNeeded,
          follow_up_notes: medFollowUpNotes.trim() || null,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      if (medLogType === "med_discontinued" && selectedMedication?.id) {
        await supabase
          .from("medication_records")
          .update({ status: "discontinued" })
          .eq("id", selectedMedication.id);

        setMedicationRecords((current) =>
          current.map((medication) =>
            medication.id === selectedMedication.id
              ? { ...medication, status: "discontinued" }
              : medication
          )
        );
      }

      setMedicationLogs((current) => [data as MedicationLogRow, ...current]);
      setMedLogDate("");
      setMedLogType("med_box_check");
      setSelectedMedicationRecordId("");
      setCheckedMedicationIds([]);
      setMedLogNote("");
      setMedLogSelfAdministered(true);
      setMedFollowUpNeeded(false);
      setMedFollowUpNotes("");
      setMessage("Medication log saved successfully.");

      await createAuditLog({
        providerId: resident.provider_id,
        action: "medication_log_created",
        tableName: "medication_logs",
        recordId: data.id,
        oldValues: null,
        newValues: data as Record<string, unknown>,
        reason: "Medication log created from resident profile.",
      });
    } catch (err) {
      const medicationLogError = err as { message?: unknown };
      setError(medicationLogError?.message ? String(medicationLogError.message) : "Could not save medication log.");
    } finally {
      setSavingMedicationLog(false);
    }
  }

  async function saveMedicationRecord() {
    setSavingMedication(true);
    setMessage("");
    setError("");

    if (!resident) {
      setSavingMedication(false);
      setError("Resident profile is not loaded yet.");
      return;
    }

    if (!medicationName.trim()) {
      setSavingMedication(false);
      setError("Medication name is required.");
      return;
    }

    try {
      const supabase = getSupabaseClient();

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("medication_records")
        .insert({
          provider_id: resident.provider_id,
          resident_id: resident.id,
          created_by_auth_user_id: userData.user?.id ?? null,
          medication_name: medicationName.trim(),
          medication_type: medicationType,
          dosage: dosage.trim() || null,
          prescribing_provider: prescribingProvider.trim() || null,
          pharmacy: pharmacy.trim() || null,
          start_date: medicationStartDate || null,
          end_date: medicationEndDate || null,
          status: medicationStatus,
          mat_mar_related: matMarRelated,
          storage_notes: storageNotes.trim() || null,
          notes: medicationNotes.trim() || null,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setMedicationRecords((current) => [data as MedicationRecordRow, ...current]);
      setMedicationName("");
      setMedicationType("prescription");
      setDosage("");
      setPrescribingProvider("");
      setPharmacy("");
      setMedicationStartDate("");
      setMedicationEndDate("");
      setMedicationStatus("active");
      setMatMarRelated(false);
      setStorageNotes("");
      setMedicationNotes("");
      setMessage("Medication record saved successfully.");

      await createAuditLog({
        providerId: resident.provider_id,
        action: "medication_record_created",
        tableName: "medication_records",
        recordId: data.id,
        oldValues: null,
        newValues: data as Record<string, unknown>,
        reason: "Medication / MAT-MAR record created from resident profile.",
      });
    } catch (err) {
      const medicationError = err as { message?: unknown };
      setError(medicationError?.message ? String(medicationError.message) : "Could not save medication record.");
    } finally {
      setSavingMedication(false);
    }
  }

  async function generateClientRciLink() {
    setGeneratingRciLink(true);
    setMessage("");
    setError("");

    if (!resident) {
      setGeneratingRciLink(false);
      setError("Resident profile is not loaded yet.");
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { data: userData } = await supabase.auth.getUser();

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      if (!userData.user) {
        throw new Error("You must be signed in before generating a client RCI link.");
      }

      const { data, error } = await supabase
        .from("rci_assessments")
        .insert({
          provider_id: resident.provider_id,
          resident_id: resident.id,
          created_by_auth_user_id: userData.user.id,
          assessment_date: new Date().toISOString().slice(0, 10),
          rci_version: "RCI-36",
          status: "sent",
          client_access_token: token,
          client_link_expires_at: expiresAt.toISOString(),
          notes: "Client-facing RCI link generated from resident profile.",
        })
        .select("*")
        .single();

      if (error) {
        console.error("Client RCI link insert error:", error);
        throw new Error(`${error.message}${error.details ? ` Details: ${error.details}` : ""}${error.hint ? ` Hint: ${error.hint}` : ""}`);
      }

      if (!data?.client_access_token) {
        throw new Error("The RCI record was created, but no client access token was returned.");
      }

      const link = `${window.location.origin}/client/rci/${token}`;

      setClientRciLink(link);
      setRciAssessments((current) => [data as RciAssessmentRow, ...current]);
      setMessage("Client RCI link generated successfully.");

      await createAuditLog({
        providerId: resident.provider_id,
        action: "client_rci_link_generated",
        tableName: "rci_assessments",
        recordId: data.id,
        oldValues: null,
        newValues: data as Record<string, unknown>,
        reason: "Client RCI assessment link generated from resident profile.",
      });
    } catch (err) {
      const rciLinkError = err as { message?: unknown };
      setError(rciLinkError?.message ? String(rciLinkError.message) : "Could not generate client RCI link.");
    } finally {
      setGeneratingRciLink(false);
    }
  }

  const latestCompletedRci = rciAssessments.find((assessment) => assessment.status === "completed");
  const rciCompletedLabel = latestCompletedRci
    ? daysSince(latestCompletedRci.client_completed_at || latestCompletedRci.assessment_date)
    : "Not completed";

  async function updateResidentSnapshotField(
    fieldName:
      | "current_phase"
      | "has_sponsor"
      | "has_home_group"
      | "attending_required_meetings"
      | "recovery_plan_started"
      | "program_fees_current"
      | "medication_status_reviewed",
    value: string | boolean | null
  ) {
    if (!resident) {
      setError("Resident profile is not loaded yet.");
      return;
    }

    setSavingSnapshotStatus(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("residents")
        .update({ [fieldName]: value })
        .eq("id", resident.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setResident(data as ResidentDetail);
      setMessage("Resident snapshot updated.");
    } catch (err) {
      const updateError = err as { message?: unknown };
      setError(updateError?.message ? String(updateError.message) : "Could not update resident snapshot.");
    } finally {
      setSavingSnapshotStatus(false);
    }
  }

  const residentName = resident ? `${resident.first_name} ${resident.last_name}` : "Resident Profile";

  return (
    <PageShell>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/residents"
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to residents
        </Link>

        {resident ? (
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
          >
            <FolderOpen className="h-4 w-4" />
            Documents
          </Link>
        ) : null}
      </div>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
            <UserRound className="h-10 w-10 text-slate-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Resident Profile</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{residentName}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Resident profile for <span className="font-medium text-slate-950">{providerName}</span>.
              This page is the start of the full resident record, including notes, documents,
              UA/BA, medication, RCI, and discharge workflows.
            </p>
          </div>
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

      {loading && (
        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 shadow-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading resident profile...
          </div>
        </div>
      )}

      {resident ? (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <MetricCard title="Resident Status" value={resident.resident_status} subtitle="Current profile status" icon={ShieldCheck} />
            <MetricCard title="Assigned House" value={house?.name ?? "Not assigned"} subtitle="Current house placement" icon={Home} />
            <MetricCard title="File Status" value={resident.file_status} subtitle="Onboarding packet status" icon={FileSignature} />
            <MetricCard title="Progress Notes" value={String(progressNotes.length)} subtitle="Saved internal notes" icon={MessageSquarePlus} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              {/* Resident Profile Tabs */}
              <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="flex flex-wrap border-b bg-white">
                  <TabButton active={activeTab === "snapshot"} label="Snapshot" status="Add or review" onClick={() => setActiveTab("snapshot")} />
                  <TabButton active={activeTab === "notes"} label="Notes" status={`${progressNotes.length} saved`} onClick={() => setActiveTab("notes")} />
                  <TabButton active={activeTab === "ua"} label="UA/BA" status={uaBaLogs.length > 0 ? `${uaBaLogs.length} logged` : "Needs log"} onClick={() => setActiveTab("ua")} />
                  <TabButton active={activeTab === "medication"} label="Medication" status={medicationRecords.length > 0 ? "Complete" : "Needs meds"} onClick={() => setActiveTab("medication")} />
                  <TabButton active={activeTab === "rci"} label="RCI & Plan" status={latestCompletedRci ? `Complete • ${rciCompletedLabel}` : "Needs RCI"} onClick={() => setActiveTab("rci")} />
                  <TabButton active={activeTab === "documents"} label="Documents" status={`${documents.length} uploaded`} onClick={() => setActiveTab("documents")} />
                </div>
              </div>

              {activeTab === "snapshot" ? (
                <div className="space-y-6">
                  <div className="grid gap-6 xl:grid-cols-[minmax(260px,360px)_1fr]">
                    <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                        <User className="h-10 w-10 text-slate-500" />
                      </div>

                      <h2 className="mt-4 text-2xl font-semibold text-slate-950">{residentName}</h2>
                      <p className="mt-1 text-sm text-slate-500">Resident Profile</p>

                      <div className="mt-5 divide-y rounded-2xl border text-left">
                        <div className="flex items-center justify-between gap-4 p-3">
                          <span className="text-sm font-medium text-slate-600">Status</span>
                          <span className="text-sm font-semibold text-slate-950">{resident.status}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 p-3">
                          <span className="text-sm font-medium text-slate-600">House</span>
                          <span className="text-sm font-semibold text-slate-950">{house?.name || "Not assigned"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 p-3">
                          <span className="text-sm font-medium text-slate-600">Phase</span>
                          <span className="text-sm font-semibold text-slate-950">{resident.current_phase || "Not selected"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 p-3">
                          <span className="text-sm font-medium text-slate-600">RCI</span>
                          <span className="text-sm font-semibold text-slate-950">{latestCompletedRci ? rciCompletedLabel : resident.rci_status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-white p-6 shadow-sm">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h2 className="text-lg font-semibold">Resident Snapshot</h2>
                          <p className="mt-1 text-sm text-slate-500">
                            Use the actions below to add or review parts of the resident record.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border bg-slate-50 p-4 md:col-span-2">
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">Phase Level</p>
                              <p className="mt-1 text-sm text-slate-500">
                                Select the resident current program phase. Provider-specific phases can be added later.
                              </p>
                            </div>

                            <select
                              value={resident.current_phase || ""}
                              onChange={(event) => updateResidentSnapshotField("current_phase", event.target.value || null)}
                              disabled={savingSnapshotStatus}
                              className="h-11 min-w-48 rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                            >
                              <option value="">Select phase</option>
                              <option value="Phase 1">Phase 1</option>
                              <option value="Phase 2">Phase 2</option>
                              <option value="Phase 3">Phase 3</option>
                              <option value="Phase 4">Phase 4</option>
                              <option value="Custom / Provider Phase">Custom / Provider Phase</option>
                            </select>
                          </div>
                        </div>

                        <div className="rounded-2xl border bg-slate-50 p-4 md:col-span-2">
                          <p className="text-sm font-semibold text-slate-950">Program Requirements</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Check items as they are confirmed for the resident.
                          </p>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {[
                              ["has_sponsor", "Has sponsor", resident.has_sponsor],
                              ["has_home_group", "Has home group", resident.has_home_group],
                              ["attending_required_meetings", "Attending required meetings", resident.attending_required_meetings],
                              ["recovery_plan_started", "Recovery plan started", resident.recovery_plan_started],
                              ["program_fees_current", "Program fees current", resident.program_fees_current],
                              ["medication_status_reviewed", "Medication status reviewed", resident.medication_status_reviewed],
                            ].map(([field, label, checked]) => (
                              <label key={String(field)} className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm font-medium text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={Boolean(checked)}
                                  disabled={savingSnapshotStatus}
                                  onChange={(event) =>
                                    updateResidentSnapshotField(
                                      field as
                                        | "has_sponsor"
                                        | "has_home_group"
                                        | "attending_required_meetings"
                                        | "recovery_plan_started"
                                        | "program_fees_current"
                                        | "medication_status_reviewed",
                                      event.target.checked
                                    )
                                  }
                                  className="h-4 w-4"
                                />
                                {String(label)}
                              </label>
                            ))}
                          </div>
                        </div>

                        <SnapshotAction
                          title="Complete UA/BA"
                          description={uaBaLogs.length > 0 ? `${uaBaLogs.length} UA/BA log(s) saved.` : "No UA/BA logs yet. Add a screen or breathalyzer result."}
                          onClick={() => setActiveTab("ua")}
                        />
                        <SnapshotAction
                          title="Create Progress Note"
                          description={`${progressNotes.length} note(s) saved. Add a new internal progress note.`}
                          onClick={() => setActiveTab("notes")}
                        />
                        <SnapshotAction
                          title="Add or Review Medication"
                          description={medicationRecords.length > 0 ? "Medication records are started." : "No medication records yet. Add medication or MAT/MAR information."}
                          onClick={() => setActiveTab("medication")}
                        />
                        <SnapshotAction
                          title="RCI & Recovery Plan"
                          description={rciAssessments.some((assessment) => assessment.status === "completed") ? "RCI results and resident-created goals are available." : "Generate a client RCI link or review the recovery plan."}
                          onClick={() => setActiveTab("rci")}
                        />
                        <SnapshotAction
                          title="Resident Documents"
                          description={documents.length > 0 ? `${documents.length} document(s) uploaded.` : "No resident documents uploaded yet."}
                          onClick={() => setActiveTab("documents")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className={activeTab === "snapshot" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                <h2 className="text-lg font-semibold">Profile Overview</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <DetailBlock title="Email" value={resident.email} />
                  <DetailBlock title="Phone" value={resident.phone} />
                  <DetailBlock title="Date of Birth" value={formatDate(resident.date_of_birth)} />
                  <DetailBlock title="Admission Date" value={formatDate(resident.admission_date)} />
                  <DetailBlock title="Medication / MAT-MAR" value={resident.medication_status} />
                  <DetailBlock title="RCI Status" value={resident.rci_status} />
                  <DetailBlock title="House" value={house?.name ?? "Not assigned"} />
                  <DetailBlock title="Resident Status" value={resident.resident_status} />
                </div>
              </div>

              <div className={activeTab === "snapshot" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                <h2 className="text-lg font-semibold">Admission Notes</h2>
                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {resident.notes || "No admission notes entered yet."}
                </p>
              </div>

              <div className={activeTab === "notes" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                <h2 className="text-lg font-semibold">Progress Notes</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add internal notes related to progress, support needs, accountability, recovery goals, or house placement.
                </p>

                <div className="mt-5 grid gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Note type</span>
                    <select
                      value={noteType}
                      onChange={(event) => setNoteType(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    >
                      <option value="general">General</option>
                      <option value="recovery_support">Recovery Support</option>
                      <option value="accountability">Accountability</option>
                      <option value="housing">Housing / Placement</option>
                      <option value="medication">Medication / MAT-MAR</option>
                      <option value="incident_follow_up">Incident Follow-Up</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Progress note</span>
                    <textarea
                      value={noteText}
                      onChange={(event) => setNoteText(event.target.value)}
                      placeholder="Write the progress note here..."
                      className="mt-2 min-h-32 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={saveProgressNote}
                    disabled={savingNote}
                    className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {savingNote ? "Saving..." : "Save Progress Note"}
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {progressNotes.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      No progress notes saved yet.
                    </p>
                  ) : (
                    progressNotes.map((note) => (
                      <div key={note.id} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <p className="text-sm font-semibold text-slate-950">
                            {note.note_type.replaceAll("_", " ")}
                          </p>
                          <p className="text-xs font-medium text-slate-500">
                            {formatDateTime(note.created_at)}
                          </p>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {note.note_text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={activeTab === "ua" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                <h2 className="text-lg font-semibold">UA/BA Logs</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add drug screen and breathalyzer records tied to this resident profile.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Collection date</span>
                    <input
                      type="date"
                      value={collectionDate}
                      onChange={(event) => setCollectionDate(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Test type</span>
                    <select
                      value={testType}
                      onChange={(event) => setTestType(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    >
                      <option value="UA">UA</option>
                      <option value="BA">BA</option>
                      <option value="UA_BA">UA + BA</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Result</span>
                    <select
                      value={testResult}
                      onChange={(event) => setTestResult(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    >
                      <option value="pending">Pending</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                      <option value="not_done">Not Done</option>
                      <option value="refused">Refused</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Breathalyzer result</span>
                    <input
                      type="text"
                      value={breathalyzerResult}
                      onChange={(event) => setBreathalyzerResult(event.target.value)}
                      placeholder="Example: 0.00"
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Reason</span>
                    <input
                      type="text"
                      value={testReason}
                      onChange={(event) => setTestReason(event.target.value)}
                      placeholder="Example: Random screen, intake, relapse in close proximity, house meeting"
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Notes</span>
                    <textarea
                      value={testNotes}
                      onChange={(event) => setTestNotes(event.target.value)}
                      placeholder="Add UA/BA notes here..."
                      className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={saveUaBaLog}
                  disabled={savingUaBaLog}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingUaBaLog ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {savingUaBaLog ? "Saving..." : "Save UA/BA Log"}
                </button>

                <div className="mt-6 space-y-3">
                  {uaBaLogs.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      No UA/BA logs saved yet.
                    </p>
                  ) : (
                    uaBaLogs.map((log) => (
                      <div key={log.id} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <p className="text-sm font-semibold text-slate-950">
                            {log.test_type} • {log.result}
                          </p>
                          <p className="text-xs font-medium text-slate-500">
                            {formatDate(log.collection_date)}
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          BA: {log.breathalyzer_result || "Not entered"} • Reason: {log.reason || "Not entered"}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {log.notes || "No notes entered."}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={activeTab === "medication" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                <h2 className="text-lg font-semibold">Medication / MAT-MAR Tracking</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Track medications disclosed by the resident, including MAT/MAR-related medications.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Medication name</span>
                    <input
                      type="text"
                      value={medicationName}
                      onChange={(event) => setMedicationName(event.target.value)}
                      placeholder="Example: Buprenorphine, Suboxone, Sertraline"
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Medication type</span>
                    <select
                      value={medicationType}
                      onChange={(event) => setMedicationType(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    >
                      <option value="prescription">Prescription</option>
                      <option value="otc">OTC</option>
                      <option value="mat_mar">MAT/MAR</option>
                      <option value="supplement">Supplement</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Dosage / instructions</span>
                    <input
                      type="text"
                      value={dosage}
                      onChange={(event) => setDosage(event.target.value)}
                      placeholder="Example: 8mg daily"
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Status</span>
                    <select
                      value={medicationStatus}
                      onChange={(event) => setMedicationStatus(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    >
                      <option value="active">Active</option>
                      <option value="discontinued">Discontinued</option>
                      <option value="pending_verification">Pending Verification</option>
                      <option value="historical">Historical</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Prescribing provider</span>
                    <input
                      type="text"
                      value={prescribingProvider}
                      onChange={(event) => setPrescribingProvider(event.target.value)}
                      placeholder="Provider or clinic name"
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Pharmacy</span>
                    <input
                      type="text"
                      value={pharmacy}
                      onChange={(event) => setPharmacy(event.target.value)}
                      placeholder="Pharmacy name"
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Start date</span>
                    <input
                      type="date"
                      value={medicationStartDate}
                      onChange={(event) => setMedicationStartDate(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">End date</span>
                    <input
                      type="date"
                      value={medicationEndDate}
                      onChange={(event) => setMedicationEndDate(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={matMarRelated}
                      onChange={(event) => setMatMarRelated(event.target.checked)}
                      className="h-4 w-4"
                    />
                    MAT/MAR-related medication
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Storage notes</span>
                    <input
                      type="text"
                      value={storageNotes}
                      onChange={(event) => setStorageNotes(event.target.value)}
                      placeholder="Example: Stored in resident lockbox, resident-managed, office safe, etc."
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Medication notes</span>
                    <textarea
                      value={medicationNotes}
                      onChange={(event) => setMedicationNotes(event.target.value)}
                      placeholder="Add medication verification notes, refill concerns, MAT/MAR access notes, or follow-up needs."
                      className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={saveMedicationRecord}
                  disabled={savingMedication}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingMedication ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {savingMedication ? "Saving..." : "Save Medication Record"}
                </button>

                <div className="mt-6 space-y-3">
                  {medicationRecords.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      No medication records saved yet.
                    </p>
                  ) : (
                    medicationRecords.map((medication) => (
                      <div key={medication.id} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              {medication.medication_name}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {medication.medication_type} • {medication.status} • {medication.dosage || "No dosage entered"}
                            </p>
                          </div>
                          <p className="text-xs font-medium text-slate-500">
                            {medication.mat_mar_related ? "MAT/MAR" : "Non-MAT/MAR"}
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          Prescriber: {medication.prescribing_provider || "Not entered"} • Pharmacy: {medication.pharmacy || "Not entered"}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {medication.notes || "No medication notes entered."}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={activeTab === "medication" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                <h2 className="text-lg font-semibold">Medication Log</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Document medication activity such as med box checks, refills, discontinuations, new medications, and discrepancies.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Log date</span>
                    <input
                      type="date"
                      value={medLogDate}
                      onChange={(event) => setMedLogDate(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Log type</span>
                    <select
                      value={medLogType}
                      onChange={(event) => setMedLogType(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    >
                      <option value="med_box_check">All meds added to med box / med box check</option>
                      <option value="new_med_added">New medication added</option>
                      <option value="med_refilled">Medication refilled</option>
                      <option value="med_discontinued">Medication discontinued</option>
                      <option value="med_count_check">Medication count checked</option>
                      <option value="med_discrepancy">Medication discrepancy noted</option>
                      <option value="storage_update">Medication storage updated</option>
                      <option value="other">Other medication note</option>
                    </select>
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Medication involved, if specific</span>
                    <select
                      value={selectedMedicationRecordId}
                      onChange={(event) => setSelectedMedicationRecordId(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    >
                      <option value="">No single medication selected</option>
                      {medicationRecords.map((medication) => (
                        <option key={medication.id} value={medication.id}>
                          {medication.medication_name} — {medication.status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="md:col-span-2 rounded-2xl border bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Medication checklist</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Check off medications included in this log, such as meds added to the med box or counted.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={checkAllCurrentMedications}
                          className="rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Check all active meds
                        </button>

                        <button
                          type="button"
                          onClick={clearCheckedMedications}
                          className="rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Clear checks
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {medicationRecords.length === 0 ? (
                        <p className="rounded-xl bg-white p-3 text-sm text-slate-500">
                          No medication records available yet.
                        </p>
                      ) : (
                        medicationRecords.map((medication) => (
                          <label
                            key={medication.id}
                            className="flex items-start gap-3 rounded-xl bg-white p-3 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={checkedMedicationIds.includes(medication.id)}
                              onChange={() => toggleCheckedMedication(medication.id)}
                              className="mt-1 h-4 w-4"
                            />
                            <span>
                              <span className="font-medium text-slate-950">{medication.medication_name}</span>
                              <br />
                              {medication.dosage || "No dosage entered"} • {medication.status}
                              {medication.mat_mar_related ? " • MAT/MAR" : ""}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Medication log note</span>
                    <textarea
                      value={medLogNote}
                      onChange={(event) => setMedLogNote(event.target.value)}
                      placeholder="Example: All current medications were added to the resident medication box. Count verified. No discrepancies noted."
                      className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={medLogSelfAdministered}
                      onChange={(event) => setMedLogSelfAdministered(event.target.checked)}
                      className="h-4 w-4"
                    />
                    Medication was self-administered by resident during this log event
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={medFollowUpNeeded}
                      onChange={(event) => setMedFollowUpNeeded(event.target.checked)}
                      className="h-4 w-4"
                    />
                    Follow-up needed
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Follow-up notes</span>
                    <input
                      type="text"
                      value={medFollowUpNotes}
                      onChange={(event) => setMedFollowUpNotes(event.target.value)}
                      placeholder="Example: Need refill verification"
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={saveMedicationLog}
                  disabled={savingMedicationLog}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingMedicationLog ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {savingMedicationLog ? "Saving..." : "Save Medication Log"}
                </button>

                <div className="mt-6 space-y-3">
                  {medicationLogs.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      No medication logs saved yet.
                    </p>
                  ) : (
                    medicationLogs.map((log) => (
                      <div key={log.id} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              {log.log_type.replaceAll("_", " ")}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {log.all_current_meds_checked ? "All active meds checked" : `${log.checked_medications.length} medication(s) checked`}
                              {" • Self-administered: "}{log.self_administered ? "Yes" : "No"}
                              {log.follow_up_needed ? " • Follow-up needed" : ""}
                            </p>
                          </div>
                          <p className="text-xs font-medium text-slate-500">
                            {formatDate(log.log_date)}
                          </p>
                        </div>

                        {log.checked_medications.length > 0 ? (
                          <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600">
                            <p className="font-medium text-slate-950">Checked medications</p>
                            <p className="mt-1">
                              {log.checked_medications
                                .map((medication) => medication.medication_name)
                                .join(", ")}
                            </p>
                          </div>
                        ) : null}

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {log.note_text}
                        </p>

                        {log.follow_up_notes ? (
                          <p className="mt-2 text-sm text-slate-600">
                            Follow-up: {log.follow_up_notes}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={activeTab === "rci" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                <h2 className="text-lg font-semibold">Client RCI Assessment Link</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Generate a private link the resident can use to complete the assessment without logging into the staff portal.
                </p>

                <button
                  type="button"
                  onClick={generateClientRciLink}
                  disabled={generatingRciLink}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generatingRciLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {generatingRciLink ? "Generating..." : "Generate Client RCI Link"}
                </button>

                {clientRciLink ? (
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-950">Client link</p>
                    <p className="mt-2 break-all text-sm text-slate-600">{clientRciLink}</p>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(clientRciLink)}
                      className="mt-3 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Copy Link
                    </button>
                  </div>
                ) : null}

                <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  Client links now use the RCI-36 assessment. Completed results will return a summary to this resident profile.
                </div>
              </div>

              <div className={activeTab === "rci" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                <h2 className="text-lg font-semibold">RCI Results Summary</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Completed client assessments return a summary to the resident profile. Individual question responses remain stored in Supabase but are not displayed here.
                </p>

                {rciAssessments.filter((assessment) => assessment.status === "completed").length === 0 ? (
                  <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    No completed client RCI assessment has been submitted yet.
                  </p>
                ) : (
                  <div className="mt-5 space-y-4">
                    {rciAssessments
                      .filter((assessment) => assessment.status === "completed")
                      .map((assessment) => (
                        <div key={assessment.id} className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                {assessment.rci_version} Completed
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                Overall score: {assessment.rci_score ?? "Not calculated"} • Level: {assessment.recovery_capital_level || "Not calculated"}
                              </p>
                            </div>

                            <p className="text-xs font-medium text-slate-500">
                              {formatDate(assessment.client_completed_at || assessment.assessment_date)}
                            </p>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="rounded-xl bg-white p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Personal Capital
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-950">
                                {assessment.personal_capital_score ?? "—"} • {assessment.personal_capital_level || "Not calculated"}
                              </p>
                            </div>

                            <div className="rounded-xl bg-white p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Social Capital
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-950">
                                {assessment.social_capital_score ?? "—"} • {assessment.social_capital_level || "Not calculated"}
                              </p>
                            </div>

                            <div className="rounded-xl bg-white p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Cultural Capital
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-950">
                                {assessment.cultural_capital_score ?? "—"} • {assessment.cultural_capital_level || "Not calculated"}
                              </p>
                            </div>
                          </div>

                          {assessment.overall_summary || assessment.notes ? (
                            <div className="mt-4 rounded-xl bg-white p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Overall Summary
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {assessment.overall_summary || assessment.notes}
                              </p>
                            </div>
                          ) : null}

                          {assessment.strengths_summary ? (
                            <div className="mt-3 rounded-xl bg-white p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Strengths
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {assessment.strengths_summary}
                              </p>
                            </div>
                          ) : null}

                          {assessment.needs_summary ? (
                            <div className="mt-3 rounded-xl bg-white p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Needs / Recovery Planning Focus
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {assessment.needs_summary}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className={activeTab === "rci" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                <h2 className="text-lg font-semibold">Resident-Created Recovery Goals</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Goals created by the resident after reviewing their RCI results.
                </p>

                {recoveryGoals.length === 0 ? (
                  <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    No resident-created recovery goals have been submitted yet.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {recoveryGoals.map((goal) => (
                      <div key={goal.id} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              {goal.goal_area.replaceAll("_", " ")} • {goal.priority}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              Status: {goal.status} • Source: {goal.created_by_source.replaceAll("_", " ")}
                            </p>
                          </div>

                          <p className="text-xs font-medium text-slate-500">
                            {formatDate(goal.created_at)}
                          </p>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {goal.goal_text}
                        </p>

                        {goal.action_steps ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            Action steps: {goal.action_steps}
                          </p>
                        ) : null}

                        {goal.supports_needed ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            Supports needed: {goal.supports_needed}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={activeTab === "documents" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                <h2 className="text-lg font-semibold">Resident Documents</h2>
                {documents.length === 0 ? (
                  <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    No resident-specific documents are attached yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {documents.map((document) => (
                      <div key={document.id} className="rounded-2xl bg-slate-50 p-4">
                        <p className="font-medium text-slate-950">{document.document_name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {document.category} • {document.status} • {document.file_url ? "File stored" : "No file"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <aside className="hidden">
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Profile Workflows</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 font-medium text-slate-950">
                      <ClipboardCheck className="h-4 w-4" />
                      Progress Notes
                    </div>
                    <p className="mt-1">Active now.</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 font-medium text-slate-950">
                      <ShieldCheck className="h-4 w-4" />
                      UA/BA Logs
                    </div>
                    <p className="mt-1">Active now.</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 font-medium text-slate-950">
                      <Pill className="h-4 w-4" />
                      Medication / MAT-MAR
                    </div>
                    <p className="mt-1">Active now.</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 font-medium text-slate-950">
                      <HeartHandshake className="h-4 w-4" />
                      RCI / Recovery Plan
                    </div>
                    <p className="mt-1">RCI tracking active now. Recovery plan goals come next.</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 font-medium text-slate-950">
                      <CalendarDays className="h-4 w-4" />
                      Discharge
                    </div>
                    <p className="mt-1">Future workflow for discharge summary and satisfaction survey.</p>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </>
      ) : null}
    </PageShell>
  );
}
