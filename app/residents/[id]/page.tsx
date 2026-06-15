"use client";

import { openFilePreview } from "@/lib/filePreview";
import type React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Upload,
  User,
  X,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";
import { createAuditLog } from "@/lib/audit";

function getResidentSupabase() {
  return getSupabaseClient() as unknown as SupabaseClient;
}

type ProviderPhaseRow = {
  id: string;
  provider_id: string;
  phase_name: string;
  phase_order: number;
  minimum_days: number | null;
  curfew_description: string | null;
  requirements_description: string | null;
  is_active: boolean;
  created_at: string;
};

type ResidentDetail = {
  sobriety_date: string | null;
  gender: string | null;
  ethnicity: string | null;
  drug_of_choice: string | null;
  referral_resource: string | null;
  prior_address: string | null;
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
  discharge_date?: string | null;
  discharge_reason?: string | null;
  discharge_notes?: string | null;
  discharge_satisfaction_survey_completed?: boolean | null;
  discharge_satisfaction_survey_rating?: number | null;
  discharge_satisfaction_survey_notes?: string | null;
  discharge_satisfaction_survey_completed_at?: string | null;
  file_status: string;
  medication_status: string;
  rci_status: string;
  high_alert: boolean;
  high_alert_detail: string | null;
  active_probation_officer: boolean;
  active_mental_health_court: boolean;
  active_drug_court: boolean;
  current_phase_id: string | null;
  current_phase: string | null;
  has_sponsor: boolean;
  sponsor_name: string | null;
  sponsor_phone: string | null;
  current_step: string | null;
  sponsor_info_updated_at: string | null;
  has_home_group: boolean;
  attending_required_meetings: boolean;
  recovery_plan_started: boolean;
  program_fees_current: boolean;
  medication_status_reviewed: boolean;
  notes: string | null;
  created_at: string;};

type HouseRow = {
  id: string;
  name: string;
  status?: string | null;
};

type DocumentRow = {
  id: string;
  document_name: string;
  category: string;
  status: string;
  file_url: string | null;
};

type ResidentDocumentAssignmentRow = {
  id: string;
  provider_id: string;
  resident_id: string;
  document_id: string;
  assignment_status: string;
  signature_status: string;
  signature_required_from: string;
  signature_instructions: string | null;
  signed_by_name: string | null;
  signed_at: string | null;
  signature_method: string | null;
  signed_file_url: string | null;
  created_at: string;
  documents: DocumentRow | DocumentRow[] | null;
};

type ResidentAdmissionEpisodeRow = {
  id: string;
  provider_id: string;
  resident_id: string;
  house_id: string | null;
  admission_date: string | null;
  discharge_date: string | null;
  discharge_reason: string | null;
  discharge_notes: string | null;
  status: string;
  charge_admission_fee: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function getAssignedDocument(assignment: ResidentDocumentAssignmentRow) {
  return Array.isArray(assignment.documents)
    ? assignment.documents[0] ?? null
    : assignment.documents;
}

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

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

type ScheduledUaItemRow = {
  id: string;
  provider_id: string;
  resident_id: string;
  house_id: string | null;
  scheduled_date: string;
  status: string;
  reason: string | null;
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
  self_administered?: boolean | null;
  follow_up_needed: boolean;
  follow_up_notes: string | null;
  created_at: string;};

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
  amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  notes: string | null;
  created_at: string;
};

type ResidentEmergencyContactRow = {
  id: string;
  provider_id: string;
  resident_id: string;
  contact_name: string;
  contact_role: string;
  approved_for_roi: boolean;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_primary: boolean;
  emergency_contact_authorized: boolean;
  roi_on_file: boolean;
  roi_signed_date: string | null;
  roi_expiration_date: string | null;
  roi_allows_emergency_contact: boolean;
  roi_allows_general_updates: boolean;
  roi_allows_billing_discussion: boolean;
  roi_allows_clinical_discussion: boolean;
  roi_restrictions: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

type ResidentRoiAuthorizationRow = {
  id: string;
  provider_id: string;
  resident_id: string;
  emergency_contact_id: string | null;
  authorization_title: string;
  approved_contacts_snapshot: Array<{
    id: string;
    contact_name: string;
    contact_role: string;
    relationship: string | null;
    phone: string | null;
    email: string | null;
  }>;
  allows_recovery_plans: boolean;
  allows_status_updates: boolean;
  allows_progress_notes: boolean;
  allows_discharge_planning: boolean;
  allows_financial_status: boolean;
  effective_date: string;
  expiration_date: string;
  revoked_at: string | null;
  revocation_notes: string | null;
  signature_text: string;
  signed_by_name: string;
  signed_at: string;
  signature_method: string;
  authorization_text: string;
  status: string;
  created_at: string;
};

type ResidentPaymentRow = {
  id: string;
  provider_id: string;
  resident_id: string;
  fee_charge_id: string | null;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
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

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";

  const dateOnlyMatch = value.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);

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
      className={`flex min-h-16 flex-col justify-center rounded-xl border px-4 py-3 text-left transition ${
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-sm"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white hover:shadow-sm"
      }`}
    >
      <span className="text-sm font-semibold leading-5">{label}</span>
      {status ? (
        <span className={`mt-1 text-xs leading-4 ${active ? "text-slate-200" : "text-slate-500"}`}>
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
      title={description}
      className="h-9 rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
    >
      {title}
    </button>
  );
}

function formatLedgerDate(value: string | null | undefined) {
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

export default function ResidentProfilePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const residentId = params.id;

  const [resident, setResident] = useState<ResidentDetail | null>(null);
  const [house, setHouse] = useState<HouseRow | null>(null);
  const [houseOptions, setHouseOptions] = useState<HouseRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [assignedDocuments, setAssignedDocuments] = useState<ResidentDocumentAssignmentRow[]>([]);
  const [admissionEpisodes, setAdmissionEpisodes] = useState<ResidentAdmissionEpisodeRow[]>([]);
  const [showResidentUploadModal, setShowResidentUploadModal] = useState(false);
  const [residentUploadName, setResidentUploadName] = useState("");
  const [residentUploadCategory, setResidentUploadCategory] = useState("Resident Upload");
  const [residentUploadStatus, setResidentUploadStatus] = useState("uploaded");
  const [residentUploadNotes, setResidentUploadNotes] = useState("");
  const [residentUploadFile, setResidentUploadFile] = useState<File | null>(null);
  const [savingResidentUpload, setSavingResidentUpload] = useState(false);
  const [assigningIntakeDocuments, setAssigningIntakeDocuments] = useState(false);
  const [progressNotes, setProgressNotes] = useState<ProgressNoteRow[]>([]);
  const [uaBaLogs, setUaBaLogs] = useState<UaBaLogRow[]>([]);
  const [scheduledUaItems, setScheduledUaItems] = useState<ScheduledUaItemRow[]>([]);
  const [medicationRecords, setMedicationRecords] = useState<MedicationRecordRow[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLogRow[]>([]);
  const [rciAssessments, setRciAssessments] = useState<RciAssessmentRow[]>([]);
  const [recoveryGoals, setRecoveryGoals] = useState<RecoveryGoalRow[]>([]);
  const [feeCharges, setFeeCharges] = useState<ResidentFeeChargeRow[]>([]);
  const [residentPayments, setResidentPayments] = useState<ResidentPaymentRow[]>([]);
  const [satisfactionSurveyResponse, setSatisfactionSurveyResponse] = useState<any | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<ResidentEmergencyContactRow[]>([]);
  const [roiAuthorizations, setRoiAuthorizations] = useState<ResidentRoiAuthorizationRow[]>([]);
  const [showRoiSignatureModal, setShowRoiSignatureModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [roiSignatureName, setRoiSignatureName] = useState("");
  const [roiSignatureAgreement, setRoiSignatureAgreement] = useState(false);
  const [savingRoiAuthorization, setSavingRoiAuthorization] = useState(false);
  const [selectedRoiAuthorization, setSelectedRoiAuthorization] = useState<ResidentRoiAuthorizationRow | null>(null);
  const [selectedRoiContact, setSelectedRoiContact] = useState<ResidentEmergencyContactRow | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("Emergency Contact");
  const [contactRelationship, setContactRelationship] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactIsPrimary, setContactIsPrimary] = useState(false);
  const [emergencyContactAuthorized, setEmergencyContactAuthorized] = useState(true);
  const [roiOnFile, setRoiOnFile] = useState(false);
  const [roiSignedDate, setRoiSignedDate] = useState("");
  const [roiExpirationDate, setRoiExpirationDate] = useState("");
  const [roiAllowsEmergencyContact, setRoiAllowsEmergencyContact] = useState(true);
  const [roiAllowsGeneralUpdates, setRoiAllowsGeneralUpdates] = useState(false);
  const [roiAllowsBillingDiscussion, setRoiAllowsBillingDiscussion] = useState(false);
  const [roiAllowsClinicalDiscussion, setRoiAllowsClinicalDiscussion] = useState(false);
  const [roiRestrictions, setRoiRestrictions] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  const [contactStatus, setContactStatus] = useState("active");
  const [savingEmergencyContact, setSavingEmergencyContact] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showManualChargeModal, setShowManualChargeModal] = useState(false);
  const [manualChargeDescription, setManualChargeDescription] = useState("");
  const [manualChargeAmount, setManualChargeAmount] = useState("");
  const [manualChargeDueDate, setManualChargeDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualChargeNotes, setManualChargeNotes] = useState("");
  const [savingManualCharge, setSavingManualCharge] = useState(false);
  const [showProgressNoteModal, setShowProgressNoteModal] = useState(false);
  const [showUaBaModal, setShowUaBaModal] = useState(false);
  const [selectedScheduledUaId, setSelectedScheduledUaId] = useState<string | null>(null);
  const [clientRciLink, setClientRciLink] = useState("");
  const [generatingRciLink, setGeneratingRciLink] = useState(false);
  const [clientIntakeLink, setClientIntakeLink] = useState("");
  const [clientPortalLink, setClientPortalLink] = useState("");
  const [generatingPortalLink, setGeneratingPortalLink] = useState(false);
  const [showRciActionModal, setShowRciActionModal] = useState(false);
  const [savingSnapshotStatus, setSavingSnapshotStatus] = useState(false);
  const [dischargeDate, setDischargeDate] = useState(new Date().toISOString().slice(0, 10));
  const [dischargeReason, setDischargeReason] = useState("");
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [dischargeSatisfactionCompleted, setDischargeSatisfactionCompleted] = useState(false);
  const [dischargeSatisfactionRating, setDischargeSatisfactionRating] = useState("");
  const [dischargeSatisfactionNotes, setDischargeSatisfactionNotes] = useState("");
  const [selectedDischargeContactIds, setSelectedDischargeContactIds] = useState<string[]>([]);
  const [readmissionDate, setReadmissionDate] = useState(new Date().toISOString().slice(0, 10));
  const [readmissionHouseId, setReadmissionHouseId] = useState("");
  const [chargeAdmissionFeeAgain, setChargeAdmissionFeeAgain] = useState(false);
  const [readmissionNotes, setReadmissionNotes] = useState("");
  const [savingLifecycle, setSavingLifecycle] = useState(false);
  const [showLifecycleModal, setShowLifecycleModal] = useState(() => {
    const requestedAction = searchParams.get("action");
    return requestedAction === "discharge" || requestedAction === "readmit" || searchParams.get("tab") === "lifecycle";
  });
  const [providerPhaseLevels, setProviderPhaseLevels] = useState<ProviderPhaseRow[]>([]);
  const [activeTab, setActiveTab] = useState(() => {
    const requestedTab = searchParams.get("tab");
    return requestedTab && requestedTab !== "lifecycle" ? requestedTab : "snapshot";
  });
  const [medLogDate, setMedLogDate] = useState("");
  const [medLogType, setMedLogType] = useState("med_box_check");
  const [selectedMedicationRecordId, setSelectedMedicationRecordId] = useState("");
  const [checkedMedicationIds, setCheckedMedicationIds] = useState<string[]>([]);
  const [medLogNote, setMedLogNote] = useState("");
  const [medLogSelfAdministered, setMedLogSelfAdministered] = useState(true);
  const [medFollowUpNeeded, setMedFollowUpNeeded] = useState(false);
  const [medFollowUpNotes, setMedFollowUpNotes] = useState("");
  const [savingMedicationLog, setSavingMedicationLog] = useState(false);
  const [showMedicationLogModal, setShowMedicationLogModal] = useState(false);
  const [medicationName, setMedicationName] = useState("");
  const [medicationType, setMedicationType] = useState("prescription");
  const [dosage, setDosage] = useState("");
  const [prescribingProvider, setPrescribingProvider] = useState("");
  const [pharmacy, setPharmacy] = useState("");
  const [medicationStartDate, setMedicationStartDate] = useState("");
  const [medicationEndDate, setMedicationEndDate] = useState("");
  const [medicationStatus, setMedicationStatus] = useState("active");
  const [storageNotes, setStorageNotes] = useState("");
  const [medicationNotes, setMedicationNotes] = useState("");
  const [savingMedication, setSavingMedication] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);
  const [medicationSubTab, setMedicationSubTab] = useState<"records" | "log">("records");
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

  async function openResidentStoredFile(filePath: string | null) {
    if (!filePath) return;

    setError("");

    try {
      const supabase = getResidentSupabase();

      const { data, error } = await supabase.storage
        .from("compliance-documents")
        .createSignedUrl(filePath, 60);

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error("Could not create a signed file link.");
      }

      await openFilePreview(data.signedUrl, "Document", filePath);
    } catch (err) {
      const storageError = err as { message?: unknown };
      setError(storageError?.message ? String(storageError.message) : "Could not open file.");
    }
  }

  function resetResidentUploadForm() {
    setResidentUploadName("");
    setResidentUploadCategory("Resident Upload");
    setResidentUploadStatus("uploaded");
    setResidentUploadNotes("");
    setResidentUploadFile(null);
  }

  function closeResidentUploadModal() {
    setShowResidentUploadModal(false);
    resetResidentUploadForm();
  }

  async function saveResidentUpload() {
    setSavingResidentUpload(true);
    setMessage("");
    setError("");

    if (!resident) {
      setSavingResidentUpload(false);
      setError("Resident profile is not loaded yet.");
      return;
    }

    if (!residentUploadName.trim()) {
      setSavingResidentUpload(false);
      setError("Document name is required.");
      return;
    }

    if (!residentUploadFile) {
      setSavingResidentUpload(false);
      setError("Attach a file before saving the resident upload.");
      return;
    }

    try {
      const supabase = getResidentSupabase();

      const safeFileName = sanitizeFileName(residentUploadFile.name);
      const filePath = `${resident.provider_id}/residents/${resident.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("compliance-documents")
        .upload(filePath, residentUploadFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data, error } = await supabase
        .from("documents")
        .insert({
          provider_id: resident.provider_id,
          resident_id: resident.id,
          document_name: residentUploadName.trim(),
          category: residentUploadCategory,
          compliance_domain: "Resident File",
          applies_to: "Specific resident",
          status: residentUploadStatus,
          file_url: filePath,
          notes: residentUploadNotes.trim() || null,
        })
        .select("id, document_name, category, status, file_url")
        .single();

      if (error) {
        throw error;
      }

      setDocuments((current) => [data as DocumentRow, ...current]);
      setMessage(`${data.document_name} was uploaded to the resident file.`);
      closeResidentUploadModal();
    } catch (err) {
      const uploadError = err as { message?: unknown };
      setError(uploadError?.message ? String(uploadError.message) : "Could not upload resident document.");
    } finally {
      setSavingResidentUpload(false);
    }
  }

  async function assignIntakeDocuments() {
    if (!resident) {
      setError("Resident profile is not loaded yet.");
      return;
    }

    setAssigningIntakeDocuments(true);
    setMessage("");
    setError("");

    try {
      const supabase = getResidentSupabase();

      const templatesResult = await supabase
        .from("documents")
        .select(`
          id,
          signature_required_from,
          signature_instructions,
          resident_send_scope,
          document_house_targets (
            house_id
          )
        `)
        .eq("provider_id", resident.provider_id)
        .eq("category", "Resident")
        .eq("is_signable", true)
        .eq("signature_required_from", "resident")
        .neq("status", "archived");

      if (templatesResult.error) {
        throw templatesResult.error;
      }

      const templates = (templatesResult.data ?? []).filter((template) => {
        const record = template as {
          resident_send_scope?: string | null;
          document_house_targets?: { house_id: string | null }[] | null;
        };

        if (record.resident_send_scope !== "selected_houses") {
          return true;
        }

        if (!resident.house_id) {
          return false;
        }

        return (record.document_house_targets ?? []).some((target) => target.house_id === resident.house_id);
      });

      if (templates.length === 0) {
        setMessage("No signable Resident Packet documents are available to assign.");
        return;
      }

      const existingAssignmentsResult = await supabase
        .from("resident_document_assignments")
        .select("document_id")
        .eq("resident_id", resident.id);

      if (existingAssignmentsResult.error) {
        throw existingAssignmentsResult.error;
      }

      const existingDocumentIds = new Set(
        (existingAssignmentsResult.data ?? []).map((assignment) => assignment.document_id)
      );

      const newAssignments = templates
        .filter((template) => !existingDocumentIds.has(template.id))
        .map((template) => ({
          provider_id: resident.provider_id,
          resident_id: resident.id,
          document_id: template.id,
          assignment_status: "assigned",
          signature_status: "awaiting_signature",
          signature_required_from: template.signature_required_from ?? "resident",
          signature_instructions: template.signature_instructions ?? null,
        }));

      if (newAssignments.length === 0) {
        setMessage("All available intake documents are already assigned to this resident.");
        return;
      }

      const insertResult = await supabase
        .from("resident_document_assignments")
        .insert(newAssignments)
        .select(`
          id,
          provider_id,
          resident_id,
          document_id,
          assignment_status,
          signature_status,
          signature_required_from,
          signature_instructions,
          signed_by_name,
          signed_at,
          signature_method,
          signed_file_url,
          created_at,
          documents (
            id,
            document_name,
            category,
            status,
            file_url
          )
        `);

      if (insertResult.error) {
        throw insertResult.error;
      }

      setAssignedDocuments((current) => [
        ...((insertResult.data ?? []) as ResidentDocumentAssignmentRow[]),
        ...current,
      ]);

      setMessage(`${newAssignments.length} intake document(s) assigned to this resident.`);
    } catch (err) {
      const assignmentError = err as { message?: unknown };
      setError(assignmentError?.message ? String(assignmentError.message) : "Could not assign intake documents.");
    } finally {
      setAssigningIntakeDocuments(false);
    }
  }

  async function loadResidentProfile() {
    try {
      const supabase = getResidentSupabase();

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

      const admissionEpisodesResult = await supabase
        .from("resident_admission_episodes")
        .select("*")
        .eq("resident_id", residentData.id)
        .order("admission_date", { ascending: false })
        .order("created_at", { ascending: false });

          if (!admissionEpisodesResult.error) {
        setAdmissionEpisodes((admissionEpisodesResult.data ?? []) as ResidentAdmissionEpisodeRow[]);
      }

      const houseOptionsResult = await supabase
        .from("houses")
        .select("*")
        .eq("provider_id", residentData.provider_id)
        .or("status.is.null,status.neq.inactive")
        .order("name", { ascending: true });

      if (houseOptionsResult.error) {
        throw houseOptionsResult.error;
      }

      setHouseOptions(
        ((houseOptionsResult.data ?? []) as HouseRow[]).filter(
          (houseOption) => String(houseOption.status ?? "active").toLowerCase() !== "inactive"
        )
      );
      localStorage.setItem("current_provider_id", residentData.provider_id);

      const providerResult = await supabase
        .from("providers")
        .select("legal_name")
        .eq("id", residentData.provider_id)
        .single();

      if (!providerResult.error && providerResult.data?.legal_name) {
      }

      const phaseLevelsResult = await supabase
        .from("provider_phase_levels")
        .select("*")
        .eq("provider_id", residentData.provider_id)
        .eq("is_active", true)
        .order("phase_order", { ascending: true });

      if (phaseLevelsResult.error) {
        throw phaseLevelsResult.error;
      }

      setProviderPhaseLevels((phaseLevelsResult.data ?? []) as ProviderPhaseRow[]);

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

      const assignedDocumentsResult = await supabase
        .from("resident_document_assignments")
        .select(`
          id,
          provider_id,
          resident_id,
          document_id,
          assignment_status,
          signature_status,
          signature_required_from,
          signature_instructions,
          signed_by_name,
          signed_at,
          signature_method,
          signed_file_url,
          created_at,
          documents (
            id,
            document_name,
            category,
            status,
            file_url
          )
        `)
        .eq("resident_id", residentData.id)
        .order("created_at", { ascending: false });

      if (!assignedDocumentsResult.error) {
        setAssignedDocuments((assignedDocumentsResult.data ?? []) as ResidentDocumentAssignmentRow[]);
      }

      const intakeLinkResult = await supabase
        .from("resident_intake_signing_links")
        .select("access_token, expires_at")
        .eq("resident_id", residentData.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!intakeLinkResult.error && intakeLinkResult.data?.[0]?.access_token) {
        setClientIntakeLink(`${window.location.origin}/client/intake/${intakeLinkResult.data[0].access_token}`);
      }

      const portalLinkResult = await supabase
        .from("resident_portal_links")
        .select("access_token, status")
        .eq("resident_id", residentData.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!portalLinkResult.error && portalLinkResult.data?.[0]?.access_token) {
        setClientPortalLink(`${window.location.origin}/client/portal/${portalLinkResult.data[0].access_token}`);
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

      const scheduledUaItemsResult = await supabase
        .from("ua_randomizer_schedule")
        .select("id, provider_id, resident_id, house_id, scheduled_date, status, reason, created_at")
        .eq("resident_id", residentData.id)
        .eq("status", "scheduled")
        .order("scheduled_date", { ascending: true });

      if (!scheduledUaItemsResult.error) {
        setScheduledUaItems((scheduledUaItemsResult.data ?? []) as ScheduledUaItemRow[]);
      }


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

      const ensureFeesResult = await supabase.rpc("ensure_current_resident_fees", {
        p_resident_id: residentData.id,
      });

      if (ensureFeesResult.error) {
        console.warn("Could not refresh resident fees:", ensureFeesResult.error.message);
      }

      const feeChargesResult = await supabase
        .from("resident_fee_charges")
        .select("*")
        .eq("resident_id", residentData.id)
        .order("due_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (feeChargesResult.error) {
        throw feeChargesResult.error;
      }

      setFeeCharges((feeChargesResult.data ?? []) as ResidentFeeChargeRow[]);

      const paymentsResult = await supabase
        .from("resident_payments")
        .select("*")
        .eq("resident_id", residentData.id)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (paymentsResult.error) {
        throw paymentsResult.error;
      }

      setResidentPayments((paymentsResult.data ?? []) as ResidentPaymentRow[]);

      const satisfactionSurveyResult = await supabase
        .from("resident_satisfaction_survey_responses")
        .select("*")
        .eq("resident_id", residentData.id)
        .maybeSingle();

      if (satisfactionSurveyResult.error) {
        throw satisfactionSurveyResult.error;
      }

      setSatisfactionSurveyResponse(satisfactionSurveyResult.data ?? null);

      const emergencyContactsResult = await supabase
        .from("resident_emergency_contacts")
        .select("*")
        .eq("resident_id", residentData.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });

      if (emergencyContactsResult.error) {
        throw emergencyContactsResult.error;
      }

      setEmergencyContacts((emergencyContactsResult.data ?? []) as ResidentEmergencyContactRow[]);

      const roiAuthorizationsResult = await supabase
        .from("resident_roi_authorizations")
        .select("*")
        .eq("resident_id", residentData.id)
        .order("signed_at", { ascending: false });

      if (roiAuthorizationsResult.error) {
        throw roiAuthorizationsResult.error;
      }

      setRoiAuthorizations((roiAuthorizationsResult.data ?? []) as ResidentRoiAuthorizationRow[]);
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
      const supabase = getSupabaseClient() as any;

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
      setShowProgressNoteModal(false);
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

  function cleanScheduledUaReason(reason: string | null) {
    return (reason || "Rolling UA schedule")
      .replace(/\s*Phase:\s*[^.]+\.?/i, "")
      .trim()
      .replace(/\.$/, "") || "Rolling UA schedule";
  }

  function openScheduledUaLog(scheduledUa: ScheduledUaItemRow) {
    setSelectedScheduledUaId(scheduledUa.id);
    setCollectionDate(scheduledUa.scheduled_date || new Date().toISOString().slice(0, 10));
    setTestType("UA_BA");
    setTestResult("pending");
    setBreathalyzerResult("");
    setTestReason("Random UA schedule");
    setTestNotes(cleanScheduledUaReason(scheduledUa.reason));
    setShowUaBaModal(true);
  }

  function openManualUaBaLog() {
    setSelectedScheduledUaId(null);
    setCollectionDate("");
    setTestType("UA");
    setTestResult("pending");
    setBreathalyzerResult("");
    setTestReason("");
    setTestNotes("");
    setShowUaBaModal(true);
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
      const supabase = getSupabaseClient() as any;

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
          ua_randomizer_schedule_id: selectedScheduledUaId,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setUaBaLogs((current) => [data as UaBaLogRow, ...current]);

      if (selectedScheduledUaId) {
        const { error: scheduleUpdateError } = await supabase
          .from("ua_randomizer_schedule")
          .update({
            status: "completed",
            reason: testNotes.trim() || testReason.trim() || "Scheduled UA completed from resident profile.",
          })
          .eq("id", selectedScheduledUaId);

        if (scheduleUpdateError) {
          throw scheduleUpdateError;
        }

        setScheduledUaItems((current) => current.filter((item) => item.id !== selectedScheduledUaId));
      }
      setCollectionDate("");
      setTestType("UA");
      setTestResult("pending");
      setBreathalyzerResult("");
      setTestReason("");
      setTestNotes("");
      setSelectedScheduledUaId(null);
      setShowUaBaModal(false);
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
      const supabase = getSupabaseClient() as any;

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
      setShowMedicationLogModal(false);
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

  function resetMedicationForm() {
    setEditingMedicationId(null);
    setMedicationName("");
    setMedicationType("prescription");
    setDosage("");
    setMedicationStatus("active");
    setPrescribingProvider("");
    setPharmacy("");
    setMedicationStartDate("");
    setMedicationEndDate("");
    setStorageNotes("");
    setMedicationNotes("");
  }

  function openMedicationModal() {
    resetMedicationForm();
    setShowMedicationModal(true);
  }

  function openEditMedicationModal(medication: MedicationRecordRow) {
    setEditingMedicationId(medication.id);
    setMedicationName(medication.medication_name || "");
    setMedicationType(medication.medication_type || "prescription");
    setDosage(medication.dosage || "");
    setMedicationStatus(medication.status || "active");
    setPrescribingProvider(medication.prescribing_provider || "");
    setPharmacy(medication.pharmacy || "");
    setMedicationStartDate(medication.start_date || "");
    setMedicationEndDate(medication.end_date || "");
    setStorageNotes(medication.storage_notes || "");
    setMedicationNotes(medication.notes || "");
    setShowMedicationModal(true);
  }

  async function discontinueMedicationRecord(medication: MedicationRecordRow) {
    const confirmed = window.confirm(`Discontinue ${medication.medication_name}? This keeps the record but moves it to the discontinued list.`);

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseClient() as any;

      const { data, error } = await supabase
        .from("medication_records")
        .update({
          status: "discontinued",
          end_date: new Date().toISOString().slice(0, 10),
        })
        .eq("id", medication.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setMedicationRecords((current) =>
        current.map((item) =>
          item.id === medication.id ? (data as MedicationRecordRow) : item
        )
      );

      setMessage("Medication discontinued.");
    } catch (err) {
      const medicationError = err as { message?: unknown };
      setError(medicationError?.message ? String(medicationError.message) : "Could not discontinue medication.");
    }
  }

  async function saveMedicationRecord() {
    if (!resident) {
      setError("Resident profile is not loaded yet.");
      return;
    }

    if (!medicationName.trim()) {
      setError("Medication name is required.");
      return;
    }

    setSavingMedication(true);
    setError("");
    setMessage("");

    const medicationPayload = {
      provider_id: resident.provider_id,
      resident_id: resident.id,
      medication_name: medicationName.trim(),
      medication_type: medicationType,
      dosage: dosage.trim() || null,
      prescribing_provider: prescribingProvider.trim() || null,
      pharmacy: pharmacy.trim() || null,
      start_date: medicationStartDate || null,
      end_date: medicationEndDate || null,
      mat_mar_related: medicationType === "mat_mar",
      storage_notes: storageNotes.trim() || null,
      notes: medicationNotes.trim() || null,
      status: medicationStatus,
    };

    try {
      const supabase = getSupabaseClient() as any;

      if (editingMedicationId) {
        const previousMedication = medicationRecords.find((medication) => medication.id === editingMedicationId) ?? null;

        const { data, error } = await supabase
          .from("medication_records")
          .update(medicationPayload)
          .eq("id", editingMedicationId)
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        setMedicationRecords((current) =>
          current.map((medication) =>
            medication.id === editingMedicationId ? (data as MedicationRecordRow) : medication
          )
        );

        if (resident.provider_id) {
          await createAuditLog({
            providerId: resident.provider_id,
            action: "medication_record_updated",
            tableName: "medication_records",
            recordId: editingMedicationId,
            oldValues: previousMedication as unknown as Record<string, unknown> | null,
            newValues: data as Record<string, unknown>,
            reason: "Medication / MAT-MAR record updated from resident profile.",
          });
        }

        setMessage("Medication record updated.");
      } else {
        const { data, error } = await supabase
          .from("medication_records")
          .insert(medicationPayload)
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        setMedicationRecords((current) => [data as MedicationRecordRow, ...current]);

        if (resident.provider_id) {
          await createAuditLog({
            providerId: resident.provider_id,
            action: "medication_record_created",
            tableName: "medication_records",
            recordId: (data as MedicationRecordRow).id,
            oldValues: null,
            newValues: data as Record<string, unknown>,
            reason: "Medication / MAT-MAR record created from resident profile.",
          });
        }

        setMessage("Medication record saved.");
      }

      resetMedicationForm();
      setShowMedicationModal(false);
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
      const supabase = getSupabaseClient() as any;
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

const totalCharges = feeCharges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0);
  const totalPayments = residentPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const currentBalance = totalCharges - totalPayments;
  const currentBalanceDisplay = currentBalance < 0 ? `-$${Math.abs(currentBalance).toFixed(2)}` : `$${currentBalance.toFixed(2)}`;
  const currentBalanceStatus = currentBalance > 0 ? "Balance due" : currentBalance < 0 ? "Paid ahead" : "Paid in full";
  const currentBalanceTextClass = currentBalance > 0 ? "text-rose-700" : "text-emerald-700";
  const currentBalanceCardClass =
    currentBalance > 0
      ? "rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100"
      : "rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100";

  const formatSurveyRating = (value?: number | null) => {
    return value ? `${value} / 5` : "Not answered";
  };

  const sortedMedicationRecords = [...medicationRecords].sort((firstMedication, secondMedication) => {
    const firstIsDiscontinued = firstMedication.status === "discontinued";
    const secondIsDiscontinued = secondMedication.status === "discontinued";

    if (firstIsDiscontinued !== secondIsDiscontinued) {
      return firstIsDiscontinued ? 1 : -1;
    }

    return firstMedication.medication_name.localeCompare(secondMedication.medication_name);
  });

  const activeMedicationRecords = sortedMedicationRecords.filter(
    (medication) => medication.status !== "discontinued"
  );

  const discontinuedMedicationRecords = sortedMedicationRecords.filter(
    (medication) => medication.status === "discontinued"
  );

  const openFeeCharges = feeCharges.filter((charge) => Number(charge.balance_due || 0) > 0);

  const feeLedgerEntries = [
    ...feeCharges.map((charge) => ({
      id: `charge-${charge.id}`,
      date: charge.due_date || charge.period_start || charge.created_at,
      description: `${charge.charge_type.replaceAll("_", " ")} charge`,
      debit: Number(charge.amount || 0),
      credit: 0,
      status: charge.status,
      sourceType: "charge" as const,
      transactionOrder: 1,
    })),
    ...residentPayments.map((payment) => ({
      id: `payment-${payment.id}`,
      date: payment.payment_date || payment.created_at,
      description: `${payment.payment_method.replaceAll("_", " ")} payment`,
      debit: 0,
      credit: Number(payment.amount || 0),
      status: "payment",
      sourceType: "payment" as const,
      transactionOrder: 2,
    })),
  ]
    .filter((entry) => entry.date)
    .sort((a, b) => {
      const dateA = a.date.slice(0, 10);
      const dateB = b.date.slice(0, 10);
      const dateComparison = dateA.localeCompare(dateB);

      if (dateComparison !== 0) return dateComparison;

      return a.transactionOrder - b.transactionOrder;
    });

  const feeLedgerRowsAscending = feeLedgerEntries.reduce<
    Array<(typeof feeLedgerEntries)[number] & { rollingBalance: number }>
  >((rows, entry) => {
    const previousBalance = rows.length > 0 ? rows[rows.length - 1].rollingBalance : 0;
    const rollingBalance = previousBalance + entry.debit - entry.credit;

    return [
      ...rows,
      {
        ...entry,
        rollingBalance,
      },
    ];
  }, []);

  const feeLedgerRows = [...feeLedgerRowsAscending].reverse();

  const latestCompletedRci = rciAssessments.find((assessment) => assessment.status === "completed");
  const rciCompletedLabel = latestCompletedRci
    ? daysSince(latestCompletedRci.client_completed_at || latestCompletedRci.assessment_date)
    : "Not completed";

  const daysWithProviderLabel = resident?.admission_date
    ? String(
        Math.max(
          0,
          Math.floor(
            (new Date(new Date().toDateString()).getTime() -
              new Date(`${resident.admission_date}T00:00:00`).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        )
      )
    : "Not available";

  function getSignedRoiForContact(contactId: string) {
    return roiAuthorizations.find((authorization) =>
      authorization.status === "active" &&
      !authorization.revoked_at &&
      (
        authorization.emergency_contact_id === contactId ||
        authorization.approved_contacts_snapshot.some((contact) => contact.id === contactId)
      )
    ) ?? null;
  }

  function getRevokedRoiForContact(contactId: string) {
    return roiAuthorizations.find((authorization) =>
      authorization.status === "revoked" &&
      (
        authorization.emergency_contact_id === contactId ||
        authorization.approved_contacts_snapshot.some((contact) => contact.id === contactId)
      )
    ) ?? null;
  }

  function contactHasSignedRoi(contactId: string) {
    return Boolean(getSignedRoiForContact(contactId));
  }

  const sortedEmergencyContacts = [...emergencyContacts].sort((firstContact, secondContact) => {
    const firstHasActiveRoi = contactHasSignedRoi(firstContact.id);
    const secondHasActiveRoi = contactHasSignedRoi(secondContact.id);

    if (firstHasActiveRoi !== secondHasActiveRoi) {
      return firstHasActiveRoi ? -1 : 1;
    }

    const firstHasRevokedRoi = Boolean(getRevokedRoiForContact(firstContact.id));
    const secondHasRevokedRoi = Boolean(getRevokedRoiForContact(secondContact.id));

    if (firstHasRevokedRoi !== secondHasRevokedRoi) {
      return firstHasRevokedRoi ? 1 : -1;
    }

    if (firstContact.is_primary !== secondContact.is_primary) {
      return firstContact.is_primary ? -1 : 1;
    }

    return firstContact.contact_name.localeCompare(secondContact.contact_name);
  });

  const sponsorContact =
    sortedEmergencyContacts.find((contact) =>
      contact.status === "active" &&
      contact.contact_role === "Chosen Sponsor" &&
      resident?.sponsor_name &&
      contact.contact_name.trim().toLowerCase() === resident.sponsor_name.trim().toLowerCase()
    ) ??
    sortedEmergencyContacts.find((contact) =>
      contact.status === "active" &&
      contact.contact_role === "Chosen Sponsor"
    ) ??
    null;

  const sponsorRoiAuthorization = sponsorContact ? getSignedRoiForContact(sponsorContact.id) : null;
  const sponsorRevokedRoiAuthorization = sponsorContact ? getRevokedRoiForContact(sponsorContact.id) : null;

  const dischargeCallableContacts = emergencyContacts.filter((contact) =>
    contact.status === "active" &&
    Boolean(getSignedRoiForContact(contact.id)) &&
    !getRevokedRoiForContact(contact.id)
  );

  function buildRoiAuthorizationText(approvedContacts: ResidentEmergencyContactRow[]) {
    const contactLines = approvedContacts
      .map((contact) => `${contact.contact_name} — ${contact.contact_role}${contact.relationship ? ` (${contact.relationship})` : ""}`)
      .join("\n");

    return `Consent for Release of Information

I, the undersigned resident, hereby authorize staff to disclose information to the individuals listed in my Approved Contacts List. This consent includes communication with my designated:
• Emergency Contact (required for residency)
• Referral Source
• Probation Officer or Court Rep.
• Chosen Sponsor
• Prescribing Healthcare Provider

Approved Contacts List:
${contactLines || "No approved contacts listed."}

Scope of Disclosure
I authorize the disclosure of the following information to my approved contacts, as applicable to their role in supporting my recovery:
☒ Recovery Plans
☒ Status Updates or Progress Reports
☒ Progress Notes
☒ Discharge Planning and Summaries
☒ Financial Status

Information will only be shared with those listed in my approved contacts, as necessary for coordination of care, safety, legal compliance, or recovery support.

Duration of Authorization
This authorization is valid for twelve (12) months from the date of signature unless revoked earlier in writing.

Revocation of Consent
I understand I may revoke this consent at any time by submitting a signed, written request. Revocation will not apply to information already disclosed prior to the date of revocation.

Emergency Contact: Maintaining one Emergency Contact is mandatory. Revocation of all contacts, including the emergency contact, may result in discharge.

Other Contacts: I may revoke individual contacts by submitting a signed request, after which that individual will be removed from the Approved Contacts List.

Confidentiality Protections
All shared information is protected under:
• 42 CFR Part 2 (Confidentiality of Substance Use Disorder Patient Records)
• HIPAA (45 C.F.R. Parts 160 & 164)

Disclosure without written consent may occur only as permitted or required by law, including:
• In a medical emergency, to medical personnel to address an immediate threat to health or safety
• In response to a valid court order meeting the requirements of 42 CFR §2.61–2.67
• For audits or evaluations conducted by authorized oversight agencies
• When mandatory reporting laws apply, including suspected child abuse or threats of harm to self or others
• As required under state public health or criminal statutes
• Re-disclosure of information is strictly prohibited without further written consent, except as specifically authorized by 42 CFR Part 2 and applicable law.

Resident Acknowledgment
By signing below, I confirm that I have read and understand this Release of Information. I consent voluntarily and acknowledge that this ROI is consistent with the program Confidentiality Policy.

Resident Signature Collected Electronically`;
  }

  async function generateResidentPortalLink() {
    setGeneratingPortalLink(true);
    setMessage("");
    setError("");

    if (!resident) {
      setGeneratingPortalLink(false);
      setError("Resident profile is not loaded yet.");
      return;
    }

    try {
      const supabase = getResidentSupabase();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        throw new Error("You must be signed in before generating a resident portal link.");
      }

      const existingLinkResult = await supabase
        .from("resident_portal_links")
        .select("*")
        .eq("resident_id", resident.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingLinkResult.error) {
        throw existingLinkResult.error;
      }

      const existingLink = existingLinkResult.data?.[0];

      if (existingLink?.access_token) {
        const link = `${window.location.origin}/client/portal/${existingLink.access_token}`;
        setClientPortalLink(link);
        await navigator.clipboard.writeText(link).catch(() => undefined);
        setMessage("Existing resident portal link copied.");
        return;
      }

      const token = crypto.randomUUID();

      const { data, error } = await supabase
        .from("resident_portal_links")
        .insert({
          provider_id: resident.provider_id,
          resident_id: resident.id,
          house_id: resident.house_id,
          created_by_auth_user_id: userData.user.id,
          access_token: token,
          status: "active",
          expires_at: null,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const link = `${window.location.origin}/client/portal/${token}`;

      setClientPortalLink(link);
      await navigator.clipboard.writeText(link).catch(() => undefined);
      setMessage("Resident portal link generated and copied.");

      await createAuditLog({
        providerId: resident.provider_id,
        action: "resident_portal_link_generated",
        tableName: "resident_portal_links",
        recordId: data.id,
        oldValues: null,
        newValues: data as Record<string, unknown>,
        reason: "Persistent resident portal link generated from resident profile.",
      });
    } catch (err) {
      const portalLinkError = err as { message?: unknown };
      setError(portalLinkError?.message ? String(portalLinkError.message) : "Could not generate resident portal link.");
    } finally {
      setGeneratingPortalLink(false);
    }
  }


  async function saveRoiAuthorization() {
    if (!resident) {
      setError("Resident profile is not loaded yet.");
      return;
    }

    if (!selectedRoiContact) {
      setError("Select or save the contact before signing the ROI.");
      return;
    }

    const approvedContacts = [selectedRoiContact];

    if (!roiSignatureAgreement) {
      setError("The resident must confirm they reviewed and agree to the ROI.");
      return;
    }

    if (roiSignatureName.trim().length < 2) {
      setError("Resident electronic signature is required.");
      return;
    }

    setSavingRoiAuthorization(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseClient() as any;
      const today = new Date().toISOString().slice(0, 10);
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);

      const approvedContactsSnapshot = approvedContacts.map((contact) => ({
        id: contact.id,
        contact_name: contact.contact_name,
        contact_role: contact.contact_role,
        relationship: contact.relationship,
        phone: contact.phone,
        email: contact.email,
      }));

      const authorizationText = buildRoiAuthorizationText(approvedContacts);

      const { data, error } = await supabase
        .from("resident_roi_authorizations")
        .insert({
          provider_id: resident.provider_id,
          resident_id: resident.id,
          emergency_contact_id: selectedRoiContact.id,
          approved_contacts_snapshot: approvedContactsSnapshot,
          allows_recovery_plans: true,
          allows_status_updates: true,
          allows_progress_notes: true,
          allows_discharge_planning: true,
          allows_financial_status: true,
          effective_date: today,
          expiration_date: expirationDate.toISOString().slice(0, 10),
          signature_text: roiSignatureName.trim(),
          signed_by_name: roiSignatureName.trim(),
          signature_method: "electronic_typed_signature",
          authorization_text: authorizationText,
          status: "active",
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setRoiAuthorizations((current) => [data as ResidentRoiAuthorizationRow, ...current]);
      setRoiSignatureName("");
      setRoiSignatureAgreement(false);
      setSelectedRoiContact(null);
      setShowRoiSignatureModal(false);
      setMessage("ROI authorization signed and saved for this contact.");
    } catch (err) {
      const roiError = err as { message?: unknown };
      setError(roiError?.message ? String(roiError.message) : "Could not save ROI authorization.");
    } finally {
      setSavingRoiAuthorization(false);
    }
  }

  async function saveContactAndOpenRoi() {
    if (!resident) {
      setError("Resident profile is not loaded yet.");
      return;
    }

    if (!contactName.trim()) {
      setError("Enter the contact name before signing the ROI.");
      return;
    }

    setSavingEmergencyContact(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseClient() as any;

      if (contactIsPrimary) {
        const primaryUpdateResult = await supabase
          .from("resident_emergency_contacts")
          .update({ is_primary: false })
          .eq("resident_id", resident.id);

        if (primaryUpdateResult.error) {
          throw primaryUpdateResult.error;
        }
      }

      const { data, error } = await supabase
        .from("resident_emergency_contacts")
        .insert({
          provider_id: resident.provider_id,
          resident_id: resident.id,
          contact_name: contactName.trim(),
          contact_role: contactRole,
          approved_for_roi: true,
          relationship: contactRelationship.trim() || null,
          phone: contactPhone.trim() || null,
          email: contactEmail.trim() || null,
          address: contactAddress.trim() || null,
          is_primary: contactIsPrimary,
          emergency_contact_authorized: emergencyContactAuthorized,
          status: contactStatus,
          notes: contactNotes.trim() || null,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const newContact = data as ResidentEmergencyContactRow;

      setEmergencyContacts((current) => {
        const cleaned = contactIsPrimary
          ? current.map((contact) => ({ ...contact, is_primary: false }))
          : current;

        return [newContact, ...cleaned];
      });

      setSelectedRoiContact(newContact);
      setRoiSignatureName("");
      setRoiSignatureAgreement(false);
      setShowContactModal(false);
      setShowRoiSignatureModal(true);
      setMessage("Contact saved. Complete the ROI signature for this contact.");
    } catch (err) {
      const contactError = err as { message?: unknown };
      setError(contactError?.message ? String(contactError.message) : "Could not save contact before ROI signature.");
    } finally {
      setSavingEmergencyContact(false);
    }
  }

  async function revokeRoiAuthorization(authorization: ResidentRoiAuthorizationRow) {
    const reason = window.prompt("Enter the reason this ROI is being revoked.");

    if (!reason || !reason.trim()) {
      setError("Revocation reason is required.");
      return;
    }

    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseClient() as any;

      const { data, error } = await supabase
        .from("resident_roi_authorizations")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
          revocation_notes: reason.trim(),
        })
        .eq("id", authorization.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setRoiAuthorizations((current) =>
        current.map((item) =>
          item.id === authorization.id ? (data as ResidentRoiAuthorizationRow) : item
        )
      );

      setMessage("ROI authorization revoked.");
    } catch (err) {
      const revokeError = err as { message?: unknown };
      setError(revokeError?.message ? String(revokeError.message) : "Could not revoke ROI authorization.");
    }
  }

  async function saveEmergencyContact() {
    if (!resident) {
      setError("Resident profile is not loaded yet.");
      return;
    }

    if (!contactName.trim()) {
      setError("Emergency contact name is required.");
      return;
    }

    setSavingEmergencyContact(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseClient() as any;

      if (contactIsPrimary) {
        const primaryUpdateResult = await supabase
          .from("resident_emergency_contacts")
          .update({ is_primary: false })
          .eq("resident_id", resident.id);

        if (primaryUpdateResult.error) {
          throw primaryUpdateResult.error;
        }
      }

      const { data, error } = await supabase
        .from("resident_emergency_contacts")
        .insert({
          provider_id: resident.provider_id,
          resident_id: resident.id,
          contact_name: contactName.trim(),
          contact_role: contactRole,
          approved_for_roi: true,
          relationship: contactRelationship.trim() || null,
          phone: contactPhone.trim() || null,
          email: contactEmail.trim() || null,
          address: contactAddress.trim() || null,
          is_primary: contactIsPrimary,
          emergency_contact_authorized: emergencyContactAuthorized,
          roi_on_file: roiOnFile,
          roi_signed_date: roiSignedDate || null,
          roi_expiration_date: roiExpirationDate || null,
          roi_allows_emergency_contact: roiAllowsEmergencyContact,
          roi_allows_general_updates: roiAllowsGeneralUpdates,
          roi_allows_billing_discussion: roiAllowsBillingDiscussion,
          roi_allows_clinical_discussion: roiAllowsClinicalDiscussion,
          roi_restrictions: roiRestrictions.trim() || null,
          notes: contactNotes.trim() || null,
          status: contactStatus,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setEmergencyContacts((current) => {
        const cleaned = contactIsPrimary
          ? current.map((contact) => ({ ...contact, is_primary: false }))
          : current;

        return [data as ResidentEmergencyContactRow, ...cleaned];
      });

      setContactName("");
      setContactRole("Emergency Contact");
      setContactRelationship("");
      setContactPhone("");
      setContactEmail("");
      setContactAddress("");
      setContactIsPrimary(false);
      setEmergencyContactAuthorized(true);
      setRoiOnFile(false);
      setRoiSignedDate("");
      setRoiExpirationDate("");
      setRoiAllowsEmergencyContact(true);
      setRoiAllowsGeneralUpdates(false);
      setRoiAllowsBillingDiscussion(false);
      setRoiAllowsClinicalDiscussion(false);
      setRoiRestrictions("");
      setContactNotes("");
      setContactStatus("active");

      setShowContactModal(false);
      setMessage("Emergency contact and ROI information saved.");
    } catch (err) {
      const contactError = err as { message?: unknown };
      setError(contactError?.message ? String(contactError.message) : "Could not save emergency contact.");
    } finally {
      setSavingEmergencyContact(false);
    }
  }

  async function saveManualCharge() {
    if (!resident) {
      setError("Resident profile is not loaded yet.");
      return;
    }

    const amount = Number(manualChargeAmount);

    if (!manualChargeDescription.trim()) {
      setError("Manual charge description is required.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid manual charge amount.");
      return;
    }

    setSavingManualCharge(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseClient() as any;

      const noteParts = [
        `Manual charge: ${manualChargeDescription.trim()}`,
        manualChargeNotes.trim() ? `Notes: ${manualChargeNotes.trim()}` : "",
      ].filter(Boolean);

      const { data, error } = await supabase
        .from("resident_fee_charges")
        .insert({
          provider_id: resident.provider_id,
          resident_id: resident.id,
          house_id: resident.house_id,
          charge_type: "manual_charge",
          billing_frequency: "one_time",
          period_start: null,
          period_end: null,
          due_date: manualChargeDueDate || new Date().toISOString().slice(0, 10),
          amount,
          amount_paid: 0,
          balance_due: amount,
          status: "open",
          notes: noteParts.join("\n"),
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setFeeCharges((current) => [data as ResidentFeeChargeRow, ...current]);
      setManualChargeDescription("");
      setManualChargeAmount("");
      setManualChargeDueDate(new Date().toISOString().slice(0, 10));
      setManualChargeNotes("");
      setShowManualChargeModal(false);
      setMessage("Manual charge added.");
    } catch (err) {
      const chargeError = err as { message?: unknown };
      setError(chargeError?.message ? String(chargeError.message) : "Could not add manual charge.");
    } finally {
      setSavingManualCharge(false);
    }
  }

  async function saveResidentPayment() {
    if (!resident) {
      setError("Resident profile is not loaded yet.");
      return;
    }

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    setSavingPayment(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseClient() as any;

      const { data, error } = await supabase
        .from("resident_payments")
        .insert({
          provider_id: resident.provider_id,
          resident_id: resident.id,
          fee_charge_id: null,
          payment_date: paymentDate || new Date().toISOString().slice(0, 10),
          amount,
          payment_method: paymentMethod,
          reference_number: paymentReference.trim() || null,
          notes: paymentNotes.trim() || null,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setResidentPayments((current) => [data as ResidentPaymentRow, ...current]);
      setPaymentAmount("");
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod("cash");
      setPaymentReference("");
      setPaymentNotes("");
      setShowPaymentModal(false);
      setMessage("Payment recorded.");
    } catch (err) {
      const paymentError = err as { message?: unknown };
      setError(paymentError?.message ? String(paymentError.message) : "Could not record payment.");
    } finally {
      setSavingPayment(false);
    }
  }


  function toggleDischargeContact(contactId: string) {
    const contact = dischargeCallableContacts.find((item) => item.id === contactId);

    if (!contact) {
      setError("Only active contacts with a signed, non-revoked ROI can be selected for discharge calls.");
      return;
    }

    setSelectedDischargeContactIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId]
    );
  }

  async function dischargeResidentProfile() {
    if (!resident) {
      setError("Resident profile is not loaded yet.");
      return;
    }

    setSavingLifecycle(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseClient() as any;

      if (!dischargeReason) {
        setError("Select a discharge reason.");
        return;
      }

      if (dischargeSatisfactionCompleted && !dischargeSatisfactionRating) {
        setError("Select a satisfaction survey rating or uncheck Satisfaction survey completed.");
        return;
      }

      const { data, error } = await supabase.rpc("discharge_resident", {
        p_resident_id: resident.id,
        p_discharge_date: dischargeDate || new Date().toISOString().slice(0, 10),
        p_discharge_reason: dischargeReason,
        p_discharge_notes: dischargeNotes,
        p_emergency_contact_ids: selectedDischargeContactIds.filter((contactId) =>
          dischargeCallableContacts.some((contact) => contact.id === contactId)
        ),
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        setError(data?.message ?? "Could not discharge resident.");
        return;
      }

      const satisfactionPayload = {
        discharge_satisfaction_survey_completed: dischargeSatisfactionCompleted,
        discharge_satisfaction_survey_rating:
          dischargeSatisfactionCompleted && dischargeSatisfactionRating
            ? Number(dischargeSatisfactionRating)
            : null,
        discharge_satisfaction_survey_notes: dischargeSatisfactionCompleted
          ? dischargeSatisfactionNotes.trim() || null
          : null,
        discharge_satisfaction_survey_completed_at: dischargeSatisfactionCompleted
          ? new Date().toISOString()
          : null,
      };

      const satisfactionResult = await supabase
        .from("residents")
        .update(satisfactionPayload)
        .eq("id", resident.id);

      if (satisfactionResult.error) {
        throw satisfactionResult.error;
      }

      setResident({
        ...resident,
        resident_status: "discharged",
        discharge_date: dischargeDate || new Date().toISOString().slice(0, 10),
        discharge_reason: dischargeReason,
        discharge_notes: dischargeNotes,
        ...satisfactionPayload,
      });

      setSelectedDischargeContactIds([]);
      setDischargeSatisfactionCompleted(false);
      setDischargeSatisfactionRating("");
      setDischargeSatisfactionNotes("");
            setShowLifecycleModal(false);
      await loadResidentProfile();
      setMessage("Resident discharged. Future program fees will stop.");
    } catch (err) {
      const lifecycleError = err as { message?: unknown };
      setError(lifecycleError?.message ? String(lifecycleError.message) : "Could not discharge resident.");
    } finally {
      setSavingLifecycle(false);
    }
  }

  async function readmitResidentProfile() {
    if (!resident) {
      setError("Resident profile is not loaded yet.");
      return;
    }

    setSavingLifecycle(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseClient() as any;

      const { data, error } = await supabase.rpc("readmit_resident", {
        p_resident_id: resident.id,
        p_admission_date: readmissionDate || new Date().toISOString().slice(0, 10),
        p_house_id: readmissionHouseId || resident.house_id || null,
        p_charge_admission_fee: chargeAdmissionFeeAgain,
        p_notes: readmissionNotes,
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        setError(data?.message ?? "Could not readmit resident.");
        return;
      }

      const ensureFeesResult = await supabase.rpc("ensure_current_resident_fees", {
        p_resident_id: resident.id,
      });

      if (ensureFeesResult.error) {
        console.warn("Could not refresh readmitted resident fees:", ensureFeesResult.error.message);
      }

      setResident({
        ...resident,
        resident_status: "active",
        admission_date: readmissionDate || new Date().toISOString().slice(0, 10),
        discharge_date: null,
        discharge_reason: null,
        discharge_notes: null,
        house_id: readmissionHouseId || resident.house_id,
      });

      setMessage(
        chargeAdmissionFeeAgain
          ? "Resident readmitted. Program fees resumed and admission fee was applied."
          : "Resident readmitted. Program fees resumed without a new admission fee."
      );

            setShowLifecycleModal(false);
      await loadResidentProfile();
      setActiveTab("snapshot");
    } catch (err) {
      const lifecycleError = err as { message?: unknown };
      setError(lifecycleError?.message ? String(lifecycleError.message) : "Could not readmit resident.");
    } finally {
      setSavingLifecycle(false);
    }
  }

async function updateResidentPhase(phaseId: string) {
    if (!resident) {
      setError("Resident profile is not loaded yet.");
      return;
    }

    const selectedPhase = providerPhaseLevels.find((phase) => phase.id === phaseId);

    setSavingSnapshotStatus(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseClient() as any;

      const { data, error } = await supabase
        .from("residents")
        .update({
          current_phase_id: selectedPhase?.id ?? null,
          current_phase: selectedPhase?.phase_name ?? null,
        })
        .eq("id", resident.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setResident(data as ResidentDetail);
      setMessage("Resident phase updated.");
    } catch (err) {
      const phaseError = err as { message?: unknown };
      setError(phaseError?.message ? String(phaseError.message) : "Could not update resident phase.");
    } finally {
      setSavingSnapshotStatus(false);
    }
  }

  const residentName = resident ? `${resident.first_name} ${resident.last_name}` : "Resident Profile";
  const hasActiveMatMar = medicationRecords.some(
    (medication) => medication.status === "active" && medication.mat_mar_related
  );

  return (
    <PageShell>
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
          <section className="space-y-6">
            <div className="space-y-6">
              {/* Resident Profile Tabs */}

              <div className="rounded-2xl border bg-white p-2 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3 px-2 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Resident Sections
                  </p>
                  <p className="text-xs text-slate-400">
                    Select a profile area
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <TabButton active={activeTab === "snapshot"} label="Profile" status="Snapshot & phase" onClick={() => setActiveTab("snapshot")} />
                  <TabButton active={activeTab === "documents"} label="Documents" status={`${assignedDocuments.length} assigned • ${documents.length} uploads`} onClick={() => setActiveTab("documents")} />
                  <TabButton active={activeTab === "fees"} label="Fees" status={currentBalanceStatus} onClick={() => setActiveTab("fees")} />
                  <TabButton active={activeTab === "ua"} label="UA / BA" status={uaBaLogs.length > 0 ? `${uaBaLogs.length} logged` : "Needs log"} onClick={() => setActiveTab("ua")} />
                  <TabButton active={activeTab === "medication"} label="Medications" status={medicationRecords.length > 0 ? "Complete" : "Needs meds"} onClick={() => setActiveTab("medication")} />
                  <TabButton active={activeTab === "notes"} label="Progress Notes" status={`${progressNotes.length} saved`} onClick={() => setActiveTab("notes")} />
                  <TabButton active={activeTab === "contacts"} label="Contacts / ROI" status={`${emergencyContacts.length} saved`} onClick={() => setActiveTab("contacts")} />
                  <TabButton active={activeTab === "rci"} label="RCI / Plan" status={latestCompletedRci ? `Complete • ${rciCompletedLabel}` : "Needs RCI"} onClick={() => setActiveTab("rci")} />
                </div>
              </div>
            </div>

              <div className="contents">
                <div className={activeTab === "contacts" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">ROI & Emergency Contacts</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Review approved contacts and signed ROI records.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowContactModal(true)}
                    className="rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Add Contact
                  </button>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Manage the approved contacts list and collect the resident&apos;s signed Release of Information.
                </p>

                <div className="mt-6 rounded-2xl border bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">Sponsor / Step Information</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Sponsor details submitted from the resident portal and linked to sponsor ROI when signed.
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        sponsorRoiAuthorization
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : sponsorRevokedRoiAuthorization
                            ? "bg-rose-100 text-rose-800 ring-1 ring-rose-300"
                            : "bg-white text-slate-600"
                      }`}
                    >
                      {sponsorRoiAuthorization
                        ? "Signed ROI on file"
                        : sponsorRevokedRoiAuthorization
                          ? "Sponsor ROI revoked"
                          : resident?.sponsor_name
                            ? "ROI not signed"
                            : "Needs sponsor update"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sponsor name</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {resident?.sponsor_name || sponsorContact?.contact_name || "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sponsor phone</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {resident?.sponsor_phone || sponsorContact?.phone || "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current step</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {resident?.current_step || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {resident?.sponsor_info_updated_at ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        Updated {formatDateTime(resident.sponsor_info_updated_at)}
                      </span>
                    ) : null}

                    {sponsorRoiAuthorization ? (
                      <button
                        type="button"
                        onClick={() => setSelectedRoiAuthorization(sponsorRoiAuthorization)}
                        className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        View Signed Sponsor ROI
                      </button>
                    ) : sponsorRevokedRoiAuthorization ? (
                      <button
                        type="button"
                        onClick={() => setSelectedRoiAuthorization(sponsorRevokedRoiAuthorization)}
                        className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-200"
                      >
                        View Revoked Sponsor ROI
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Approved Contacts List</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Each contact has its own ROI. Sign or view the ROI from the contact card.
                    </p>
                  </div>

                </div>

                <div className="mt-4 space-y-3">
                  {emergencyContacts.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      No emergency contacts or approved contacts saved yet.
                    </p>
                  ) : (
                    sortedEmergencyContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className={`rounded-2xl p-4 ${
                          getRevokedRoiForContact(contact.id)
                            ? "border border-rose-300 bg-rose-50 ring-1 ring-rose-200"
                            : "bg-slate-50"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              {contact.contact_name}
                              {contact.is_primary ? " • Primary" : ""}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {[contact.contact_role, contact.relationship, contact.phone, contact.email].filter(Boolean).join(" • ") || "No contact details listed"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                contactHasSignedRoi(contact.id)
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                  : getRevokedRoiForContact(contact.id)
                                    ? "bg-rose-100 text-rose-800 ring-1 ring-rose-300"
                                    : "bg-white text-slate-600"
                              }`}
                            >
                              {contactHasSignedRoi(contact.id)
                                ? "Signed ROI on file"
                                : getRevokedRoiForContact(contact.id)
                                  ? "ROI REVOKED"
                                  : "ROI not signed"}
                            </span>

                            {getSignedRoiForContact(contact.id) ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setSelectedRoiAuthorization(getSignedRoiForContact(contact.id))}
                                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                                >
                                  View Signed ROI
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const authorization = getSignedRoiForContact(contact.id);
                                    if (authorization) void revokeRoiAuthorization(authorization);
                                  }}
                                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                                >
                                  Revoke ROI
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRoiContact(contact);
                                  setRoiSignatureName("");
                                  setRoiSignatureAgreement(false);
                                  setShowRoiSignatureModal(true);
                                }}
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  getRevokedRoiForContact(contact.id)
                                    ? "bg-rose-100 text-rose-800 hover:bg-rose-200"
                                    : "bg-white text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {getRevokedRoiForContact(contact.id) ? "Re-sign ROI" : "Sign ROI"}
                              </button>
                            )}
                          </div>
                        </div>

                        {getRevokedRoiForContact(contact.id) ? (
                          <div className="mt-3 rounded-xl border border-rose-200 bg-white p-3">
                            <p className="text-sm font-semibold text-rose-800">
                              ROI revoked. Staff should not communicate with this contact unless a new ROI is signed.
                            </p>
                            {getRevokedRoiForContact(contact.id)?.revoked_at ? (
                              <p className="mt-1 text-xs text-rose-700">
                                Revoked {formatDateTime(getRevokedRoiForContact(contact.id)?.revoked_at ?? "")}
                              </p>
                            ) : null}
                            {getRevokedRoiForContact(contact.id)?.revocation_notes ? (
                              <p className="mt-1 text-xs text-rose-700">
                                Reason: {getRevokedRoiForContact(contact.id)?.revocation_notes}
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        {contact.notes ? (
                          <p className="mt-2 text-sm text-slate-600">Notes: {contact.notes}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>

              </div>

              {activeTab === "snapshot" ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100">
                          <User className="h-8 w-8 text-slate-500" />
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Resident Profile</p>
                          <h2 className="mt-1 text-2xl font-semibold text-slate-950">{residentName}</h2>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {hasActiveMatMar ? (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                MAT/MAR
                              </span>
                            ) : null}

                            {resident.active_probation_officer ? (
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                Active PO
                              </span>
                            ) : null}

                            {resident.active_mental_health_court ? (
                              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                                Mental Health Court
                              </span>
                            ) : null}

                            {resident.active_drug_court ? (
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                Drug Court
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowLifecycleModal(true)}
                        className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                        title="Snapshot status discharge action"
                      >
                        {resident.resident_status === "active" ? "Discharge Resident" : "Readmit Resident"}
                      </button>
                    </div>

                    {resident.high_alert_detail ? (
                      <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                          High Alert Detail
                        </p>
                        <p className="mt-1 text-sm font-medium text-rose-800">
                          {resident.high_alert_detail}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">LOT in Program</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{daysWithProviderLabel}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">House</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{house?.name || "Not assigned"}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sobriety Date</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">
                          {resident.sobriety_date ? formatDate(resident.sobriety_date) : "Not entered"}
                        </p>
                      </div>

                      <div className={currentBalanceCardClass}>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Balance</p>
                        <p className={`mt-1 text-sm font-semibold ${currentBalanceTextClass}`}>{currentBalanceDisplay}</p>
                        <p className={`mt-1 text-xs font-semibold ${currentBalanceTextClass}`}>{currentBalanceStatus}</p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">Phase Level</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Select the resident current program phase.
                          </p>
                        </div>

                        <select
                          value={resident.current_phase_id || ""}
                          onChange={(event) => updateResidentPhase(event.target.value)}
                          disabled={savingSnapshotStatus}
                          className="h-11 min-w-48 rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                        >
                          <option value="">Select phase</option>
                          {providerPhaseLevels.map((phase) => (
                            <option key={phase.id} value={phase.id}>
                              {phase.phase_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                      <SnapshotAction
                        title="Record Payment"
                        description={`${currentBalanceStatus}: ${currentBalanceDisplay}.`}
                        onClick={() => setShowPaymentModal(true)}
                      />

                      <SnapshotAction
                        title="Complete UA/BA"
                        description={uaBaLogs.length > 0 ? `${uaBaLogs.length} logged.` : "Add UA/BA result."}
                        onClick={openManualUaBaLog}
                      />

                      <SnapshotAction
                        title="Create Progress Note"
                        description={`${progressNotes.length} saved.`}
                        onClick={() => setShowProgressNoteModal(true)}
                      />

                      <SnapshotAction
                        title="Add Medication"
                        description={medicationRecords.length > 0 ? "Medication records started." : "Add medication or MAT/MAR."}
                        onClick={() => { setMedicationSubTab("records"); openMedicationModal(); }}
                      />

                      <SnapshotAction
                        title="Add ROI / Contact"
                        description="Add an approved contact or collect a signed ROI."
                        onClick={() => setShowContactModal(true)}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {resident.resident_status === "discharged" ? (
                <div className={activeTab === "snapshot" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">Resident Satisfaction Survey Response</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Submitted by the resident through the post-discharge portal survey.
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {satisfactionSurveyResponse ? "Completed" : "Not submitted"}
                    </span>
                  </div>

                  {satisfactionSurveyResponse ? (
                    <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Overall rating</p>
                        <p className="mt-1 font-semibold text-slate-950">
                          {formatSurveyRating(satisfactionSurveyResponse.overall_rating)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Submitted</p>
                        <p className="mt-1 font-semibold text-slate-950">
                          {formatDate(satisfactionSurveyResponse.submitted_at)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Felt safe</p>
                        <p className="mt-1 text-slate-700">
                          {formatSurveyRating(satisfactionSurveyResponse.felt_safe_rating)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Staff respect</p>
                        <p className="mt-1 text-slate-700">
                          {formatSurveyRating(satisfactionSurveyResponse.staff_respect_rating)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Clear expectations</p>
                        <p className="mt-1 text-slate-700">
                          {formatSurveyRating(satisfactionSurveyResponse.expectations_clear_rating)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recovery support</p>
                        <p className="mt-1 text-slate-700">
                          {formatSurveyRating(satisfactionSurveyResponse.recovery_support_rating)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3 md:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Would recommend</p>
                        <p className="mt-1 text-slate-700">
                          {satisfactionSurveyResponse.would_recommend
                            ? String(satisfactionSurveyResponse.would_recommend).replaceAll("_", " ")
                            : "Not answered"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3 md:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Most helpful</p>
                        <p className="mt-1 whitespace-pre-wrap text-slate-700">
                          {satisfactionSurveyResponse.most_helpful || "Not answered"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3 md:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Could improve</p>
                        <p className="mt-1 whitespace-pre-wrap text-slate-700">
                          {satisfactionSurveyResponse.could_improve || "Not answered"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3 md:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Additional comments</p>
                        <p className="mt-1 whitespace-pre-wrap text-slate-700">
                          {satisfactionSurveyResponse.additional_comments || "No additional comments."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                      The resident has not submitted the post-discharge satisfaction survey yet.
                    </p>
                  )}
                </div>
              ) : null}

              <div className={activeTab === "snapshot" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                <h2 className="text-lg font-semibold">Profile Overview</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <DetailBlock title="Email" value={resident.email || "Not entered"} />
                  <DetailBlock title="Phone" value={resident.phone || "Not entered"} />
                  <DetailBlock title="Date of Birth" value={resident.date_of_birth ? formatDate(resident.date_of_birth) : "Not entered"} />
                  <DetailBlock title="Admission Date" value={resident.admission_date ? formatDate(resident.admission_date) : "Not entered"} />
                  <DetailBlock title="Sobriety Date" value={resident.sobriety_date ? formatDate(resident.sobriety_date) : "Not entered"} />
                  <DetailBlock title="Gender" value={resident.gender || "Not entered"} />
                  <DetailBlock title="Ethnicity" value={resident.ethnicity || "Not entered"} />
                  <DetailBlock title="Drug of Choice" value={resident.drug_of_choice || "Not entered"} />
                  <DetailBlock title="Referral Resource" value={resident.referral_resource || "Not entered"} />
                  <DetailBlock title="Prior Address" value={resident.prior_address || "Not entered"} />
                </div>
              </div>

              <div className={activeTab === "snapshot" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
  <h2 className="text-lg font-semibold">Admission Notes</h2>
  <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
    {resident.notes || "No admission notes entered yet."}
  </p>
</div>

<div className={activeTab === "snapshot" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
  <h2 className="text-lg font-semibold">Prior Admission / Readmission History</h2>
  <p className="mt-1 text-sm text-slate-500">
    Previous admission episodes, discharge details, and readmission notes are preserved here.
  </p>

  {admissionEpisodes.length === 0 ? (
    <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
      No prior admission history has been recorded yet.
    </p>
  ) : (
    <div className="mt-4 space-y-3">
      {admissionEpisodes.map((episode) => (
        <div key={episode.id} className="rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {episode.status === "active" ? "Current Admission" : "Prior Admission"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Admission: {formatDate(episode.admission_date)}
                {episode.discharge_date ? ` • Discharge: ${formatDate(episode.discharge_date)}` : ""}
                {" • Status: "}{episode.status}
              </p>
            </div>

            {episode.charge_admission_fee ? (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                Admission fee charged
              </span>
            ) : null}
          </div>

          {episode.discharge_reason ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              <span className="font-medium text-slate-950">Discharge reason:</span> {episode.discharge_reason}
            </p>
          ) : null}

          {episode.discharge_notes ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              <span className="font-medium text-slate-950">Discharge notes:</span> {episode.discharge_notes}
            </p>
          ) : null}

          {episode.notes ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              <span className="font-medium text-slate-950">Admission/readmission notes:</span> {episode.notes}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )}
</div>

              <div className={activeTab === "fees" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Fee Ledger</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Review charges, balances, and payment history.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowManualChargeModal(true)}
                      className="rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Add Manual Charge
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(true)}
                      className="rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Record Payment
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className={currentBalanceCardClass}>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Balance</p>
                    <p className={`mt-1 text-2xl font-semibold ${currentBalanceTextClass}`}>{currentBalanceDisplay}</p>
                    <p className={`mt-1 text-xs font-semibold ${currentBalanceTextClass}`}>{currentBalanceStatus}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Open Charges</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{openFeeCharges.length}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Payments Logged</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{residentPayments.length}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">Rolling Balance</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Charges increase the balance. Payments reduce the balance.
                      </p>
                    </div>
                  </div>

                  {feeLedgerRows.length === 0 ? (
                    <p className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-500">
                      No fee ledger activity found.
                    </p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left text-sm">
                        <thead>
                          <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                            <th className="py-2 pr-4 font-medium">Date</th>
                            <th className="py-2 pr-4 font-medium">Description</th>
                            <th className="py-2 pr-4 font-medium">Charge</th>
                            <th className="py-2 pr-4 font-medium">Payment</th>
                            <th className="py-2 font-medium">Running Balance</th>
                          </tr>
                        </thead>

                        <tbody>
                          {feeLedgerRows.map((row) => (
                            <tr key={row.id} className="border-b last:border-0">
                              <td className="py-3 pr-4 text-slate-600">
                                {formatLedgerDate(row.date)}
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-slate-950">{row.description}</p>
                                  {row.sourceType === "payment" ? (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                                      Payment applied
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-xs text-slate-500">{row.status}</p>
                              </td>
                              <td className="py-3 pr-4 text-slate-600">
                                {row.debit > 0 ? `$${row.debit.toFixed(2)}` : "—"}
                              </td>
                              <td className="py-3 pr-4 text-slate-600">
                                {row.credit > 0 ? `$${row.credit.toFixed(2)}` : "—"}
                              </td>
                              <td className="py-3 font-semibold text-slate-950">
                                ${row.rollingBalance.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

<div className={activeTab === "notes" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                <div className="mb-6 rounded-2xl border bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Sponsor / Step Information</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Latest sponsor and step update submitted from the resident portal.
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {resident?.sponsor_info_updated_at ? `Updated ${formatDateTime(resident.sponsor_info_updated_at)}` : "Needs update"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sponsor name</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {resident?.sponsor_name || "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sponsor phone</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {resident?.sponsor_phone || "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current step</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {resident?.current_step || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Progress Notes</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Review saved internal notes related to progress, support needs, accountability, recovery goals, or house placement.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowProgressNoteModal(true)}
                    className="rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Create Progress Note
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">UA/BA Records</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Review drug screen and breathalyzer records tied to this resident profile.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowUaBaModal(true)}
                    className="rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Log UA/BA
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">Scheduled UA Items</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Rolling UA schedule items assigned to this resident.
                      </p>
                    </div>                  </div>

                  <div className="mt-4 space-y-3">
                    {scheduledUaItems.length === 0 ? (
                      <p className="rounded-xl bg-white p-3 text-sm text-slate-500">
                        No scheduled UA items for this resident.
                      </p>
                    ) : (
                      scheduledUaItems.map((scheduledUa) => (
                        <div key={scheduledUa.id} className="rounded-xl bg-white p-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                Scheduled UA • {formatDate(scheduledUa.scheduled_date)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {cleanScheduledUaReason(scheduledUa.reason)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => openScheduledUaLog(scheduledUa)}
                              className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                            >
                              Log Scheduled UA
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-950">Completed UA/BA History</h3>
                </div>

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

              {activeTab === "medication" ? (
                <div className="rounded-2xl border bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setMedicationSubTab("records")}
                      className={`rounded-xl px-3 py-2 text-xs font-medium ${
                        medicationSubTab === "records"
                          ? "bg-slate-950 text-white"
                          : "border bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Medication List
                    </button>

                    <button
                      type="button"
                      onClick={() => setMedicationSubTab("log")}
                      className={`rounded-xl px-3 py-2 text-xs font-medium ${
                        medicationSubTab === "log"
                          ? "bg-slate-950 text-white"
                          : "border bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Medication Log
                    </button>
                  </div>
                </div>
              ) : null}

              <div className={activeTab === "medication" && medicationSubTab === "records" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Medication Records</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Review the resident medication list. Add medications once, then edit or discontinue them as needed.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openMedicationModal}
                    className="rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Add Medication
                  </button>
                </div>

                <div className="mt-5 space-y-5">
                  {medicationRecords.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      No medication records saved yet.
                    </p>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-950">Active Medications</h3>

                        {activeMedicationRecords.length === 0 ? (
                          <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                            No active medications listed.
                          </p>
                        ) : (
                          <div className="mt-3 grid gap-3 xl:grid-cols-2">
                            {activeMedicationRecords.map((medication) => (
                              <div key={medication.id} className="rounded-2xl bg-slate-50 p-3">
                                <div className="flex flex-col gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-950">
                                      {medication.medication_name}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-600">
                                      {medication.medication_type} • {medication.status} • {medication.dosage || "No dosage entered"}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                      {medication.mat_mar_related ? "MAT/MAR" : "Non-MAT/MAR"}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => openEditMedicationModal(medication)}
                                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => void discontinueMedicationRecord(medication)}
                                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                                    >
                                      Discontinue
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                                  {medication.prescribing_provider ? (
                                    <p>Prescriber: {medication.prescribing_provider}</p>
                                  ) : null}

                                  {medication.pharmacy ? (
                                    <p>Pharmacy: {medication.pharmacy}</p>
                                  ) : null}

                                  {medication.storage_notes ? (
                                    <p>Storage: {medication.storage_notes}</p>
                                  ) : null}

                                  {medication.notes ? (
                                    <p className="whitespace-pre-wrap">Notes: {medication.notes}</p>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {discontinuedMedicationRecords.length > 0 ? (
                        <div>
                          <h3 className="text-sm font-semibold text-slate-950">Discontinued Medications</h3>

                          <div className="mt-3 grid gap-3 xl:grid-cols-2">
                            {discontinuedMedicationRecords.map((medication) => (
                              <div key={medication.id} className="rounded-2xl bg-slate-50 p-3 opacity-75">
                                <div className="flex flex-col gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-950">
                                      {medication.medication_name}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-600">
                                      {medication.medication_type} • discontinued • {medication.dosage || "No dosage entered"}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                      {medication.mat_mar_related ? "MAT/MAR" : "Non-MAT/MAR"}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => openEditMedicationModal(medication)}
                                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                                  {medication.end_date ? (
                                    <p>Ended: {formatDate(medication.end_date)}</p>
                                  ) : null}

                                  {medication.prescribing_provider ? (
                                    <p>Prescriber: {medication.prescribing_provider}</p>
                                  ) : null}

                                  {medication.notes ? (
                                    <p className="whitespace-pre-wrap">Notes: {medication.notes}</p>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              <div className={activeTab === "medication" && medicationSubTab === "log" ? "rounded-2xl border bg-white p-6 shadow-sm" : "hidden"}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Medication Log</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Review medication activity logs, med box checks, refills, discontinuations, and discrepancies.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowMedicationLogModal(true)}
                    className="rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Add Medication Log
                  </button>
                </div>

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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">RCI & Recovery Plan Records</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Review the resident&apos;s latest RCI score, assessment history, and resident-created recovery goals.
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Resident portal managed
                  </span>
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
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Intake Documents</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Assigned resident paperwork generated from signable intake document templates.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-slate-500">{assignedDocuments.length} assigned</p>
                    <button
                      type="button"
                      onClick={assignIntakeDocuments}
                      disabled={assigningIntakeDocuments}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {assigningIntakeDocuments ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {assigningIntakeDocuments ? "Assigning..." : "Assign Missing Packet Documents"}
                    </button>
                  </div>
                </div>

                                <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-950">Resident portal</p>
                      <p className="mt-1 text-sm text-slate-500">
                        One permanent link for signing documents, viewing fee records, and submitting requests.
                      </p>
                      {clientPortalLink ? (
                        <p className="mt-2 text-xs font-medium text-emerald-700">Portal link is ready.</p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={generateResidentPortalLink}
                      disabled={generatingPortalLink}
                      className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {generatingPortalLink ? "Working..." : clientPortalLink ? "Copy Portal Link" : "Generate Portal Link"}
                    </button>
                  </div>
                </div>


                {assignedDocuments.length === 0 ? (
                  <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    No intake documents have been assigned to this resident yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {assignedDocuments.map((assignment) => {
                      const assignedDocument = getAssignedDocument(assignment);

                      return (
                        <div key={assignment.id} className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-medium text-slate-950">
                                {assignedDocument?.document_name ?? "Document template unavailable"}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {assignedDocument?.category ?? "Document"} • Assignment: {assignment.assignment_status.replaceAll("_", " ")} • Signature: {assignment.signature_status === "not_sent" || assignment.signature_status === "awaiting_signature" ? "awaiting resident signature" : assignment.signature_status.replaceAll("_", " ")}
                              </p>
                              {assignment.signature_instructions ? (
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                  {assignment.signature_instructions}
                                </p>
                              ) : null}
                              {assignment.signed_by_name ? (
                                <p className="mt-2 text-xs text-slate-500">
                                  Signed by {assignment.signed_by_name}
                                  {assignment.signed_at ? ` on ${formatDate(assignment.signed_at)}` : ""}
                                </p>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {assignment.signature_status === "signed" && clientIntakeLink ? (
                                <button
                                  type="button"
                                  onClick={() => window.open(clientIntakeLink, "_blank", "noopener,noreferrer")}
                                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  View Signed Record
                                </button>
                              ) : assignment.signature_status === "signed" ? (
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                                  Signed
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20">
                                  Awaiting resident signature
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-8 border-t pt-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Resident Uploads</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Individual resident-specific files uploaded by staff, such as IDs, insurance cards, court paperwork, outside treatment records, or manually received signed forms.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowResidentUploadModal(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Resident Document
                    </button>
                  </div>

                  {documents.length === 0 ? (
                    <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      No resident uploads have been added yet.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {documents.map((document) => (
                        <div key={document.id} className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-medium text-slate-950">{document.document_name}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {document.category} • {document.status} • {document.file_url ? "File stored" : "No file"}
                              </p>
                            </div>

                            {document.file_url ? (
                              <button
                                type="button"
                                onClick={() => openResidentStoredFile(document.file_url)}
                                className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}
      {showResidentUploadModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Upload Resident Document</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add an individual file to this resident record.
                </p>
              </div>

              <button
                type="button"
                onClick={closeResidentUploadModal}
                className="rounded-xl border p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                aria-label="Close resident upload modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Document name</span>
                <input
                  type="text"
                  value={residentUploadName}
                  onChange={(event) => setResidentUploadName(event.target.value)}
                  placeholder="Example: Driver license"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Category</span>
                <select
                  value={residentUploadCategory}
                  onChange={(event) => setResidentUploadCategory(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option>Resident Upload</option>
                  <option>Identification</option>
                  <option>Insurance</option>
                  <option>Court Document</option>
                  <option>Medical Document</option>
                  <option>Treatment Document</option>
                  <option>Manually Signed Form</option>
                  <option>Other</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select
                  value={residentUploadStatus}
                  onChange={(event) => setResidentUploadStatus(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="uploaded">Uploaded</option>
                  <option value="needs_review">Needs Review</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Attach file</span>
                <input
                  type="file"
                  onChange={(event) => setResidentUploadFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
                {residentUploadFile ? (
                  <p className="mt-2 text-sm text-slate-500">Selected: {residentUploadFile.name}</p>
                ) : null}
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Notes</span>
                <textarea
                  value={residentUploadNotes}
                  onChange={(event) => setResidentUploadNotes(event.target.value)}
                  placeholder="Add upload notes, review needs, or source information."
                  className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t pt-5">
              <button
                type="button"
                onClick={closeResidentUploadModal}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveResidentUpload}
                disabled={savingResidentUpload}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingResidentUpload ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {savingResidentUpload ? "Uploading..." : "Save Upload"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRoiSignatureModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Consent for Release of Information</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Resident electronic signature applies only to the selected contact.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowRoiSignatureModal(false)}
                className="rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
              <p>
                I, the undersigned resident, hereby authorize staff to disclose information to the selected approved contact listed below. This consent applies only to this contact and their designated role.
              </p>

              <div className="rounded-2xl bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-950">Approved Contacts List</h3>
                <div className="mt-3 space-y-2">
                  {selectedRoiContact ? (
                    <p>
                      {selectedRoiContact.contact_name} — {selectedRoiContact.contact_role}
                      {selectedRoiContact.relationship ? ` (${selectedRoiContact.relationship})` : ""}
                    </p>
                  ) : (
                    <p>No contact selected.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-950">Scope of Disclosure</h3>
                <p>I authorize the disclosure of the following information to my approved contacts, as applicable to their role in supporting my recovery:</p>
                <ul className="mt-2 list-inside list-disc">
                  <li>Recovery Plans</li>
                  <li>Status Updates or Progress Reports</li>
                  <li>Progress Notes</li>
                  <li>Discharge Planning and Summaries</li>
                  <li>Financial Status</li>
                </ul>
              </div>

              <p>
                Information will only be shared with those listed in my approved contacts, as necessary for coordination of care, safety, legal compliance, or recovery support.
              </p>

              <div>
                <h3 className="font-semibold text-slate-950">Duration of Authorization</h3>
                <p>This authorization is valid for twelve (12) months from the date of signature unless revoked earlier in writing.</p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-950">Revocation of Consent</h3>
                <p>I understand I may revoke this consent at any time by submitting a signed, written request. Revocation will not apply to information already disclosed prior to the date of revocation.</p>
                <p className="mt-2">Maintaining one Emergency Contact is mandatory. Revocation of all contacts, including the emergency contact, may result in discharge. Other contacts may be revoked individually by signed request.</p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-950">Confidentiality Protections</h3>
                <p>All shared information is protected under 42 CFR Part 2 and HIPAA. Disclosure without written consent may occur only as permitted or required by law, including medical emergency, valid court order, audits/evaluations, mandatory reporting, public health or criminal statutes, or other legally required disclosures. Re-disclosure is prohibited without further written consent except as specifically authorized by law.</p>
              </div>

              <label className="flex items-center gap-3 rounded-xl border bg-white p-4">
                <input
                  type="checkbox"
                  checked={roiSignatureAgreement}
                  onChange={(event) => setRoiSignatureAgreement(event.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-slate-700">
                  Resident confirms they have read, understand, and voluntarily consent to this Release of Information.
                </span>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Resident electronic signature</span>
                <input
                  type="text"
                  value={roiSignatureName}
                  onChange={(event) => setRoiSignatureName(event.target.value)}
                  placeholder="Type resident full legal name"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <button
                type="button"
                onClick={saveRoiAuthorization}
                disabled={savingRoiAuthorization}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingRoiAuthorization ? "Saving..." : "Sign and Save ROI"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedRoiAuthorization ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Signed ROI Authorization
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Signed by {selectedRoiAuthorization.signed_by_name} on {formatDate(selectedRoiAuthorization.signed_at)}. Expires {formatDate(selectedRoiAuthorization.expiration_date)}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRoiAuthorization(null)}
                className="rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">Contact Included</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {selectedRoiAuthorization.approved_contacts_snapshot.map((contact) => (
                  <p key={contact.id}>
                    {contact.contact_name} — {contact.contact_role}
                    {contact.relationship ? ` (${contact.relationship})` : ""}
                  </p>
                ))}
              </div>
            </div>

            <pre className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {selectedRoiAuthorization.authorization_text}
            </pre>

            <div className="mt-5 rounded-2xl border bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">
                Electronic Signature
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {selectedRoiAuthorization.signature_text}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {showPaymentModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Record Resident Payment</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Apply a payment to an open resident fee charge.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Payment date</span>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Payment amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  placeholder="0.00"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Payment method</span>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="check">Check</option>
                  <option value="money_order">Money order</option>
                  <option value="zelle">Zelle</option>
                  <option value="cash_app">Cash App</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Reference number</span>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  placeholder="Optional receipt, transaction, or check number"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Payment notes</span>
                <textarea
                  value={paymentNotes}
                  onChange={(event) => setPaymentNotes(event.target.value)}
                  placeholder="Optional payment notes"
                  className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <button
                type="button"
                onClick={saveResidentPayment}
                disabled={savingPayment}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingPayment ? "Saving..." : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showProgressNoteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Create Progress Note</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add an internal progress note to this resident record.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowProgressNoteModal(false)}
                className="rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

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
          </div>
        </div>
      ) : null}

      {showUaBaModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {selectedScheduledUaId ? "Log Scheduled UA" : "Log UA/BA"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedScheduledUaId
                    ? "Complete the scheduled UA assigned to this resident."
                    : "Add a drug screen or breathalyzer record to this resident profile."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedScheduledUaId(null);
                  setShowUaBaModal(false);
                }}
                className="rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

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

              <button
                type="button"
                onClick={saveUaBaLog}
                disabled={savingUaBaLog}
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingUaBaLog ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {savingUaBaLog ? "Saving..." : "Save UA/BA Log"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRciActionModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Generate Client RCI Link</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a resident-facing RCI assessment link for this client.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowRciActionModal(false)}
                className="rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm leading-6 text-slate-600">
                Generate a link the resident can use to complete the RCI assessment and create recovery goals.
              </p>

              <button
                type="button"
                onClick={generateClientRciLink}
                disabled={generatingRciLink}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generatingRciLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {generatingRciLink ? "Generating..." : "Generate Client RCI Link"}
              </button>

              {clientRciLink ? (
                <div className="mt-4 rounded-2xl bg-white p-4">
                  <p className="text-sm font-semibold text-slate-950">Client RCI Link</p>
                  <p className="mt-2 break-all text-sm text-slate-600">{clientRciLink}</p>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(clientRciLink)}
                    className="mt-3 rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Copy Link
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showLifecycleModal && resident ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {resident.resident_status === "active" ? "Discharge Resident" : "Readmit Resident"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {resident.resident_status === "active"
                    ? "Complete discharge details before moving this resident to discharged status."
                    : "Readmit this resident and resume program fees from the readmission date."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowLifecycleModal(false)}
                className="rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {resident.resident_status === "active" ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Discharge date</span>
                  <input
                    type="date"
                    value={dischargeDate}
                    onChange={(event) => setDischargeDate(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Discharge reason</span>
                  <select
                    value={dischargeReason}
                    onChange={(event) => setDischargeReason(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  >
                    <option value="">Select reason</option>
                    <option value="Completion">Completion</option>
                    <option value="Admin">Admin</option>
                    <option value="Abandonment">Abandonment</option>
                    <option value="Relapse">Relapse</option>
                  </select>
                </label>

                <div className="md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">
                    Emergency contacts called or attempted
                  </span>

                  <div className="mt-2 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2">
                    {dischargeCallableContacts.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No active contacts with a signed, non-revoked ROI are available for discharge calls. You can still discharge this resident without selecting a contact.
                      </p>
                    ) : (
                      dischargeCallableContacts.map((contact) => (
                          <label key={contact.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                            <input
                              type="checkbox"
                              checked={selectedDischargeContactIds.includes(contact.id)}
                              onChange={() => toggleDischargeContact(contact.id)}
                              className="mt-1 h-4 w-4"
                            />
                            <span>
                              <span className="block text-sm font-medium text-slate-800">
                                {contact.contact_name}
                                {contact.is_primary ? " • Primary" : ""}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {[contact.contact_role, contact.relationship, contact.phone].filter(Boolean).join(" • ")}
                              </span>
                            </span>
                          </label>
                        ))
                    )}
                  </div>
                </div>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Discharge note</span>
                  <textarea
                    value={dischargeNotes}
                    onChange={(event) => setDischargeNotes(event.target.value)}
                    placeholder="Document what happened, who was contacted or attempted, resident status, belongings, safety concerns, and follow-up needs."
                    className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <button
                  type="button"
                  onClick={dischargeResidentProfile}
                  disabled={savingLifecycle}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingLifecycle ? "Saving..." : "Discharge Resident"}
                </button>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Readmission date</span>
                  <input
                    type="date"
                    value={readmissionDate}
                    onChange={(event) => setReadmissionDate(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">House assignment</span>
                  <select
                    value={readmissionHouseId}
                    onChange={(event) => setReadmissionHouseId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  >
                    <option value="">Keep current house</option>
                    {houseOptions.map((houseOption) => (
                      <option key={houseOption.id} value={houseOption.id}>
                        {houseOption.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-3 rounded-xl border bg-white p-4 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={chargeAdmissionFeeAgain}
                    onChange={(event) => setChargeAdmissionFeeAgain(event.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Charge admission fee again
                  </span>
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Readmission notes</span>
                  <textarea
                    value={readmissionNotes}
                    onChange={(event) => setReadmissionNotes(event.target.value)}
                    placeholder="Document readmission details, house assignment, and fee decision."
                    className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <button
                  type="button"
                  onClick={readmitResidentProfile}
                  disabled={savingLifecycle}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingLifecycle ? "Saving..." : "Readmit Resident"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showManualChargeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Add Manual Charge</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add one-time charges for extra fees, replacement items, supplies, damages, transportation, or other resident-specific costs.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowManualChargeModal(false)}
                className="rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Charge description</span>
                <input
                  type="text"
                  value={manualChargeDescription}
                  onChange={(event) => setManualChargeDescription(event.target.value)}
                  placeholder="Example: Replacement key, transportation fee, damaged item, supplies"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualChargeAmount}
                  onChange={(event) => setManualChargeAmount(event.target.value)}
                  placeholder="0.00"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Due date</span>
                <input
                  type="date"
                  value={manualChargeDueDate}
                  onChange={(event) => setManualChargeDueDate(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Notes</span>
                <textarea
                  value={manualChargeNotes}
                  onChange={(event) => setManualChargeNotes(event.target.value)}
                  placeholder="Optional details about why this charge was added."
                  className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <button
                type="button"
                onClick={saveManualCharge}
                disabled={savingManualCharge}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingManualCharge ? "Saving..." : "Add Manual Charge"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showContactModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Add Approved Contact</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a contact record, then save the contact or collect an ROI for this contact.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">Add Approved Contact</h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
              <span className="text-sm font-medium text-slate-700">Contact name</span>
              <input
                type="text"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="Full name"
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
                </label>

                <label className="block">
              <span className="text-sm font-medium text-slate-700">Contact role</span>
              <select
                value={contactRole}
                onChange={(event) => setContactRole(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              >
                <option>Emergency Contact</option>
                <option>Referral Source</option>
                <option>Probation Officer / Court Rep.</option>
                <option>Chosen Sponsor</option>
                <option>Prescribing Healthcare Provider</option>
                <option>Other Approved Contact</option>
              </select>
                </label>

                <label className="block">
              <span className="text-sm font-medium text-slate-700">Relationship</span>
              <input
                type="text"
                value={contactRelationship}
                onChange={(event) => setContactRelationship(event.target.value)}
                placeholder="Mother, father, spouse, friend, sponsor, etc."
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
                </label>

                <label className="block">
              <span className="text-sm font-medium text-slate-700">Phone</span>
              <input
                type="tel"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                placeholder="Phone number"
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
                </label>

                <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="Email address"
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
                </label>

                <label className="block">
              <span className="text-sm font-medium text-slate-700">Contact status</span>
              <select
                value={contactStatus}
                onChange={(event) => setContactStatus(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
                </label>

                <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Address</span>
              <input
                type="text"
                value={contactAddress}
                onChange={(event) => setContactAddress(event.target.value)}
                placeholder="Mailing address"
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
                </label>

                <label className="flex items-center gap-3 rounded-xl border bg-white p-4">
              <input
                type="checkbox"
                checked={contactIsPrimary}
                onChange={(event) => setContactIsPrimary(event.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium text-slate-700">Primary emergency contact</span>
                </label>

                <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Notes</span>
              <textarea
                value={contactNotes}
                onChange={(event) => setContactNotes(event.target.value)}
                placeholder="Optional contact notes"
                className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
              type="button"
              onClick={saveContactAndOpenRoi}
              disabled={savingEmergencyContact}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
              Sign ROI for This Contact
                </button>

                <button
              type="button"
              onClick={saveEmergencyContact}
              disabled={savingEmergencyContact}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
              {savingEmergencyContact ? "Saving..." : "Save Contact"}
                </button>
              </div>
            </div>


          </div>
        </div>
      ) : null}

      {showMedicationModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {editingMedicationId ? "Edit Medication" : "Add Medication"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add the medication once, then update or discontinue the record as needed.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetMedicationForm();
                  setShowMedicationModal(false);
                }}
                className="rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

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
              {savingMedication ? "Saving..." : editingMedicationId ? "Update Medication Record" : "Save Medication Record"}
            </button>
          </div>
        </div>
      ) : null}

      {showMedicationLogModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Add Medication Log</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Document a medication activity event, med box check, refill, discontinuation, or discrepancy.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMedicationLogModal(false)}
                className="rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
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
              <option value="med_box_check">Med Box</option>
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


          </div>
        </div>
      ) : null}

    </PageShell>
  );
}
