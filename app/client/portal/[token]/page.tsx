"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  Home,
  Loader2,
  ShieldCheck,
  Send,
  Wrench,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type PortalDocument = {
  assignment_id: string;
  assignment_status: string;
  signature_status: string;
  signature_required_from: string;
  signature_instructions: string | null;
  signed_by_name: string | null;
  signed_at: string | null;
  document_id: string;
  document_name: string;
  category: string;
  file_url: string | null;
  notes: string | null;
};

type FeeCharge = {
  id: string;
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
};

type Payment = {
  id: string;
  fee_charge_id: string | null;
  payment_date: string;
  amount: number | string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
};

type PassRequest = {
  id: string;
  requested_departure_at: string | null;
  requested_return_at: string | null;
  destination: string | null;
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
  status: string;
  provider_notes: string | null;
  denial_reason: string | null;
  requires_court_order: boolean | null;
  requires_clinical_clearance: boolean | null;
  requires_emergency_travel_docs: boolean | null;
  requires_other_attachment: boolean | null;
  other_attachment_note: string | null;
  reviewed_at: string | null;
  created_at: string | null;
};

type MaintenanceRequest = {
  id: string;
  request_title: string | null;
  request_description: string | null;
  location_area: string | null;
  priority: string | null;
  status: string;
  provider_notes: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type SatisfactionSurveyResponse = {
  id: string;
  overall_rating: number | null;
  felt_safe_rating: number | null;
  staff_respect_rating: number | null;
  expectations_clear_rating: number | null;
  recovery_support_rating: number | null;
  would_recommend: string | null;
  most_helpful: string | null;
  could_improve: string | null;
  additional_comments: string | null;
  submitted_at: string | null;
};

type PortalRciAssessment = {
  id: string;
  rci_version: string;
  rci_score: number | string | null;
  recovery_capital_level: string | null;
  assessment_date: string | null;
  client_completed_at: string | null;
  personal_capital_score: number | string | null;
  personal_capital_level: string | null;
  social_capital_score: number | string | null;
  social_capital_level: string | null;
  cultural_capital_score: number | string | null;
  cultural_capital_level: string | null;
  overall_summary: string | null;
  strengths_summary: string | null;
  needs_summary: string | null;
};

type PortalRecoveryGoal = {
  id: string;
  goal_area: string;
  goal_text: string;
  action_steps: string | null;
  supports_needed: string | null;
  target_date: string | null;
  priority: string;
  status: string;
  progress_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PortalRciSummary = {
  assessment_count: number;
  latest_assessment: PortalRciAssessment | null;
  recovery_goals: PortalRecoveryGoal[];
};


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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not entered";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not entered";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

function getResidentRequestStatusClass(status: string | null | undefined) {
  const normalized = String(status ?? "").toLowerCase();

  if (normalized === "completed") return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  if (normalized === "in_progress") return "bg-blue-50 text-blue-700 ring-blue-600/20";
  if (normalized === "approved") return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  if (normalized === "denied") return "bg-rose-50 text-rose-700 ring-rose-600/20";
  if (normalized === "cancelled") return "bg-slate-100 text-slate-600 ring-slate-300";

  return "bg-amber-50 text-amber-700 ring-amber-600/20";
}

function getResidentRequestPriorityClass(priority: string | null | undefined) {
  const normalized = String(priority ?? "").toLowerCase();

  if (normalized === "urgent") return "bg-rose-50 text-rose-700 ring-rose-600/20";
  if (normalized === "low") return "bg-slate-100 text-slate-600 ring-slate-300";

  return "bg-amber-50 text-amber-700 ring-amber-600/20";
}

function formatLabel(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Not entered";
}

function periodEndFallback(value: string | null | undefined) {
  return value || null;
}

function getPassFollowUps(request: PassRequest) {
  const followUps: string[] = [];

  if (request.requires_court_order) followUps.push("Court Order");
  if (request.requires_clinical_clearance) followUps.push("Clinical Clearance");
  if (request.requires_emergency_travel_docs) followUps.push("Emergency Travel Docs");
  if (request.requires_other_attachment) {
    followUps.push(request.other_attachment_note ? `Other: ${request.other_attachment_note}` : "Other Attachment");
  }

  return followUps;
}

export default function ClientPortalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [residentName, setResidentName] = useState("");
  const [houseName, setHouseName] = useState("");
  const [activePortalTab, setActivePortalTab] = useState<"documents" | "rent" | "requests" | "sponsor" | "rci" | "survey">("documents");
  const [activeRequestView, setActiveRequestView] = useState<"status" | "pass" | "maintenance">("status");
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [signatureNames, setSignatureNames] = useState<Record<string, string>>({});
  const [signingAssignmentId, setSigningAssignmentId] = useState<string | null>(null);
  const [feeCharges, setFeeCharges] = useState<FeeCharge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [passRequests, setPassRequests] = useState<PassRequest[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [residentStatus, setResidentStatus] = useState("active");
  const [surveyAvailable, setSurveyAvailable] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [surveyResponse, setSurveyResponse] = useState<SatisfactionSurveyResponse | null>(null);
  const [rciSummary, setRciSummary] = useState<PortalRciSummary | null>(null);
  const [startingRci, setStartingRci] = useState(false);
  const [surveyOverallRating, setSurveyOverallRating] = useState("");
  const [surveyFeltSafeRating, setSurveyFeltSafeRating] = useState("");
  const [surveyStaffRespectRating, setSurveyStaffRespectRating] = useState("");
  const [surveyExpectationsRating, setSurveyExpectationsRating] = useState("");
  const [surveyRecoverySupportRating, setSurveyRecoverySupportRating] = useState("");
  const [surveyWouldRecommend, setSurveyWouldRecommend] = useState("");
  const [surveyMostHelpful, setSurveyMostHelpful] = useState("");
  const [surveyCouldImprove, setSurveyCouldImprove] = useState("");
  const [surveyAdditionalComments, setSurveyAdditionalComments] = useState("");
  const [submittingSurvey, setSubmittingSurvey] = useState(false);
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorPhone, setSponsorPhone] = useState("");
  const [currentStep, setCurrentStep] = useState("");
  const [sponsorInfoUpdatedAt, setSponsorInfoUpdatedAt] = useState<string | null>(null);
  const [savingSponsorInfo, setSavingSponsorInfo] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [locationArea, setLocationArea] = useState("");
  const [priority, setPriority] = useState("normal");
  const [passDepartureAt, setPassDepartureAt] = useState("");
  const [passReturnAt, setPassReturnAt] = useState("");
  const [passDestination, setPassDestination] = useState("");
  const [passDestinationAddress, setPassDestinationAddress] = useState("");
  const [passReason, setPassReason] = useState("");
  const [passTransportationPlan, setPassTransportationPlan] = useState("");
  const [passEmergencyContactName, setPassEmergencyContactName] = useState("");
  const [passEmergencyContactRelationship, setPassEmergencyContactRelationship] = useState("");
  const [passEmergencyContactPhone, setPassEmergencyContactPhone] = useState("");
  const [passEmergencyContactPlan, setPassEmergencyContactPlan] = useState("");
  const [passResidentAgreed, setPassResidentAgreed] = useState(false);
  const [passResidentSignatureName, setPassResidentSignatureName] = useState("");
  const [submittingPassRequest, setSubmittingPassRequest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingMaintenance, setSubmittingMaintenance] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const totalChargeAmount = useMemo(
    () => feeCharges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0),
    [feeCharges]
  );

  const totalPaymentAmount = useMemo(
    () => payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [payments]
  );

  const currentBalance = totalChargeAmount - totalPaymentAmount;

  const feeLedgerEntries = useMemo(() => {
    const entries = [
      ...feeCharges.map((charge) => ({
        id: `charge-${charge.id}`,
        date: charge.due_date || charge.period_start || periodEndFallback(charge.period_end) || "",
        description: `${formatLabel(charge.charge_type)} charge`,
        debit: Number(charge.amount || 0),
        credit: 0,
        status: charge.status,
        sourceType: "charge" as const,
        transactionOrder: 1,
      })),
      ...payments.map((payment) => ({
        id: `payment-${payment.id}`,
        date: payment.payment_date || "",
        description: `${formatLabel(payment.payment_method)} payment`,
        debit: 0,
        credit: Number(payment.amount || 0),
        status: "payment",
        sourceType: "payment" as const,
        transactionOrder: 2,
      })),
    ]
      .filter((entry) => entry.date)
      .sort((first, second) => {
        const dateComparison = first.date.localeCompare(second.date);

        if (dateComparison !== 0) {
          return dateComparison;
        }

        return first.transactionOrder - second.transactionOrder;
      });

    const chronologicalLedger = entries.reduce<
      Array<(typeof entries)[number] & { runningBalance: number }>
    >((ledger, entry) => {
      const previousBalance = ledger[ledger.length - 1]?.runningBalance ?? 0;
      const runningBalance = previousBalance + entry.debit - entry.credit;

      return [
        ...ledger,
        {
          ...entry,
          runningBalance,
        },
      ];
    }, []);

    return chronologicalLedger.reverse();
  }, [feeCharges, payments]);

  async function loadPortal() {
    try {
      setLoading(true);
      setError("");

      const supabase = getSupabaseClient() as any;

      const { data, error } = await supabase.rpc("get_client_portal_context", {
        p_access_token: token,
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        setError(data?.message ?? "This resident portal link is unavailable.");
        return;
      }

      setResidentName(data.resident_name ?? "Resident");
      setHouseName(data.house_name ?? "");
      setResidentStatus(data.resident_status ?? "active");
      setDocuments((data.documents ?? []) as PortalDocument[]);
      setFeeCharges((data.fee_charges ?? []) as FeeCharge[]);
      setPayments((data.payments ?? []) as Payment[]);

      const passRequestsResult = await supabase.rpc("get_client_portal_pass_requests", {
        p_access_token: token,
      });

      if (!passRequestsResult.error && passRequestsResult.data?.ok) {
        setPassRequests((passRequestsResult.data.pass_requests ?? []) as PassRequest[]);
      } else {
        setPassRequests([]);
      }

      const maintenanceRequestsResult = await supabase.rpc("get_client_portal_maintenance_requests", {
        p_access_token: token,
      });

      if (!maintenanceRequestsResult.error && maintenanceRequestsResult.data?.ok) {
        setMaintenanceRequests((maintenanceRequestsResult.data.maintenance_requests ?? []) as MaintenanceRequest[]);
      } else {
        setMaintenanceRequests([]);
      }

      const surveyResult = await supabase.rpc("get_client_portal_satisfaction_survey", {
        p_access_token: token,
      });

      if (!surveyResult.error && surveyResult.data?.ok) {
        setSurveyAvailable(Boolean(surveyResult.data.survey_available));
        setSurveyCompleted(Boolean(surveyResult.data.survey_completed));
        setSurveyResponse((surveyResult.data.survey_response ?? null) as SatisfactionSurveyResponse | null);
      } else {
        setSurveyAvailable(false);
        setSurveyCompleted(false);
        setSurveyResponse(null);
      }

      const rciSummaryResult = await supabase.rpc("get_client_portal_rci_summary", {
        p_access_token: token,
      });

      if (!rciSummaryResult.error && rciSummaryResult.data?.ok) {
        setRciSummary({
          assessment_count: Number(rciSummaryResult.data.assessment_count ?? 0),
          latest_assessment: (rciSummaryResult.data.latest_assessment ?? null) as PortalRciAssessment | null,
          recovery_goals: (rciSummaryResult.data.recovery_goals ?? []) as PortalRecoveryGoal[],
        });
      } else {
        setRciSummary(null);
      }

      setSponsorName(data.sponsor_name ?? "");
      setSponsorPhone(data.sponsor_phone ?? "");
      setCurrentStep(data.current_step ?? "");
      setSponsorInfoUpdatedAt(data.sponsor_info_updated_at ?? null);
    } catch (err) {
      const portalError = err as { message?: unknown };
      setError(portalError?.message ? String(portalError.message) : "Could not load resident portal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPortal();
  }, [token]);

  async function openDocument(document: PortalDocument) {
    if (!document.file_url) {
      setError("No document file is attached to this item.");
      return;
    }

    try {
      setError("");

      const supabase = getSupabaseClient() as any;

      const { data, error } = await supabase.storage
        .from("compliance-documents")
        .createSignedUrl(document.file_url, 300);

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error("Could not create a secure document link.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      const fileError = err as { message?: unknown };
      setError(fileError?.message ? String(fileError.message) : "Could not open document.");
    }
  }


  function updateSignatureName(assignmentId: string, value: string) {
    setSignatureNames((current) => ({
      ...current,
      [assignmentId]: value,
    }));
  }

  async function signDocument(document: PortalDocument) {
    const typedName = signatureNames[document.assignment_id]?.trim();

    if (!typedName) {
      setError("Please type your full name before signing.");
      return;
    }

    try {
      setSigningAssignmentId(document.assignment_id);
      setMessage("");
      setError("");

      const supabase = getSupabaseClient() as any;

      const { data, error } = await supabase.rpc("submit_client_portal_document_signature", {
        p_access_token: token,
        p_assignment_id: document.assignment_id,
        p_signed_by_name: typedName,
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        setError(data?.message ?? "This document could not be signed.");
        return;
      }

      setDocuments((current) =>
        current.map((item) =>
          item.assignment_id === document.assignment_id
            ? {
                ...item,
                assignment_status: "completed",
                signature_status: "signed",
                signed_by_name: typedName,
                signed_at: new Date().toISOString(),
              }
            : item
        )
      );

      setSignatureNames((current) => ({
        ...current,
        [document.assignment_id]: "",
      }));

      setMessage(`${document.document_name} was signed successfully.`);
    } catch (err) {
      const signatureError = err as { message?: unknown };
      setError(signatureError?.message ? String(signatureError.message) : "Could not sign document.");
    } finally {
      setSigningAssignmentId(null);
    }
  }

  async function startRciAssessment() {
    try {
      setStartingRci(true);
      setMessage("");
      setError("");

      const supabase = getSupabaseClient() as any;

      const { data, error } = await supabase.rpc("start_client_portal_rci_assessment", {
        p_access_token: token,
      });

      if (error) {
        throw error;
      }

      if (!data?.ok || !data?.client_access_token) {
        setError(data?.message ?? "Could not start the RCI assessment.");
        return;
      }

      window.location.href = `/client/rci/${data.client_access_token}`;
    } catch (err) {
      const rciError = err as { message?: unknown };
      setError(rciError?.message ? String(rciError.message) : "Could not start the RCI assessment.");
    } finally {
      setStartingRci(false);
    }
  }

  function optionalRating(value: string) {
    return value ? Number(value) : null;
  }

  async function submitSatisfactionSurvey() {
    if (!surveyOverallRating) {
      setError("Select an overall satisfaction rating before submitting.");
      return;
    }

    try {
      setSubmittingSurvey(true);
      setMessage("");
      setError("");

      const supabase = getSupabaseClient() as any;

      const { data, error } = await supabase.rpc("submit_client_portal_satisfaction_survey", {
        p_access_token: token,
        p_overall_rating: Number(surveyOverallRating),
        p_felt_safe_rating: optionalRating(surveyFeltSafeRating),
        p_staff_respect_rating: optionalRating(surveyStaffRespectRating),
        p_expectations_clear_rating: optionalRating(surveyExpectationsRating),
        p_recovery_support_rating: optionalRating(surveyRecoverySupportRating),
        p_would_recommend: surveyWouldRecommend,
        p_most_helpful: surveyMostHelpful,
        p_could_improve: surveyCouldImprove,
        p_additional_comments: surveyAdditionalComments,
      });

      if (error) throw error;

      if (!data?.ok) {
        setError(data?.message ?? "Could not submit survey.");
        return;
      }

      setMessage(data.message ?? "Survey submitted. Thank you.");
      await loadPortal();
    } catch (err) {
      const surveyError = err as { message?: unknown };
      setError(surveyError?.message ? String(surveyError.message) : "Could not submit survey.");
    } finally {
      setSubmittingSurvey(false);
    }
  }

  async function submitPassRequest() {
    if (!passDepartureAt || !passReturnAt) {
      setError("Enter the requested departure and return times.");
      return;
    }

    if (!passDestinationAddress.trim()) {
      setError("Enter the full destination address.");
      return;
    }

    if (!passReason.trim()) {
      setError("Enter the purpose of the pass request.");
      return;
    }

    if (!passEmergencyContactName.trim() || !passEmergencyContactRelationship.trim() || !passEmergencyContactPhone.trim()) {
      setError("Enter the emergency contact name, relationship, and phone number.");
      return;
    }

    if (!passResidentAgreed) {
      setError("Confirm the resident agreement before submitting.");
      return;
    }

    if (!passResidentSignatureName.trim()) {
      setError("Type your full name as the resident signature.");
      return;
    }

    try {
      setSubmittingPassRequest(true);
      setMessage("");
      setError("");

      const supabase = getSupabaseClient() as any;

      const { data, error } = await supabase.rpc("submit_client_portal_pass_request_v2", {
        p_payload: {
          access_token: token,
          requested_departure_at: new Date(passDepartureAt).toISOString(),
          requested_return_at: new Date(passReturnAt).toISOString(),
          destination: passDestination || passDestinationAddress,
          reason: passReason,
          transportation_plan: passTransportationPlan,
          emergency_contact_plan: passEmergencyContactPlan,
          destination_address: passDestinationAddress,
          emergency_contact_name: passEmergencyContactName,
          emergency_contact_relationship: passEmergencyContactRelationship,
          emergency_contact_phone: passEmergencyContactPhone,
          resident_agreed_to_terms: passResidentAgreed,
          resident_signature_name: passResidentSignatureName,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        setError(data?.message ?? "Could not submit pass request.");
        return;
      }

      setPassDepartureAt("");
      setPassReturnAt("");
      setPassDestination("");
      setPassDestinationAddress("");
      setPassReason("");
      setPassTransportationPlan("");
      setPassEmergencyContactName("");
      setPassEmergencyContactRelationship("");
      setPassEmergencyContactPhone("");
      setPassEmergencyContactPlan("");
      setPassResidentAgreed(false);
      setPassResidentSignatureName("");
      setMessage("Pass request submitted successfully.");
    } catch (err) {
      const passError = err as { message?: unknown };
      setError(passError?.message ? String(passError.message) : "Could not submit pass request.");
    } finally {
      setSubmittingPassRequest(false);
    }
  }

  async function saveSponsorInfo() {
    try {
      setSavingSponsorInfo(true);
      setMessage("");
      setError("");

      const supabase = getSupabaseClient() as any;

      const { data, error } = await supabase.rpc("update_client_portal_sponsor_info", {
        p_access_token: token,
        p_sponsor_name: sponsorName,
        p_sponsor_phone: sponsorPhone,
        p_current_step: currentStep,
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        setError(data?.message ?? "Could not update sponsor and step information.");
        return;
      }

      setSponsorInfoUpdatedAt(new Date().toISOString());
      setMessage("Sponsor and step information updated successfully.");
    } catch (err) {
      const sponsorError = err as { message?: unknown };
      setError(sponsorError?.message ? String(sponsorError.message) : "Could not update sponsor and step information.");
    } finally {
      setSavingSponsorInfo(false);
    }
  }

async function submitMaintenanceRequest() {
    if (!requestTitle.trim()) {
      setError("Enter a short title for the maintenance request.");
      return;
    }

    if (requestDescription.trim().length < 10) {
      setError("Please describe the maintenance issue.");
      return;
    }

    try {
      setSubmittingMaintenance(true);
      setMessage("");
      setError("");

      const supabase = getSupabaseClient() as any;

      const { data, error } = await supabase.rpc("submit_client_portal_maintenance_request", {
        p_access_token: token,
        p_request_title: requestTitle,
        p_request_description: requestDescription,
        p_location_area: locationArea,
        p_priority: priority,
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        setError(data?.message ?? "Could not submit maintenance request.");
        return;
      }

      setRequestTitle("");
      setRequestDescription("");
      setLocationArea("");
      setPriority("normal");
      setMessage("Maintenance request submitted successfully.");
    } catch (err) {
      const maintenanceError = err as { message?: unknown };
      setError(maintenanceError?.message ? String(maintenanceError.message) : "Could not submit maintenance request.");
    } finally {
      setSubmittingMaintenance(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
                <ShieldCheck className="h-8 w-8 text-slate-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Resident Portal</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {residentName || "Resident"}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Access your documents, fee records, and request forms from one secure link.
                </p>
                {houseName ? (
                  <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    <Home className="h-3.5 w-3.5" />
                    {houseName}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Current balance: <span className="font-semibold text-slate-950">{formatCurrency(currentBalance)}</span>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 shadow-sm">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading resident portal...
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p>{message}</p>
            </div>
          </div>
        ) : null}

        {!loading && !error ? (
          <section className="rounded-2xl border bg-white p-3 shadow-sm">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["documents", "Documents", `${documents.length} assigned`],
                ["rent", "Rent Records", formatCurrency(currentBalance)],
                ["requests", "Requests & Status", `${passRequests.length + maintenanceRequests.length} submitted`],
                ["sponsor", "Sponsor / Step", sponsorInfoUpdatedAt ? "Updated" : "Needs update"],
                ["rci", "RCI / Plan", rciSummary?.latest_assessment ? `${rciSummary.assessment_count} completed` : "Start RCI"],
                ...(residentStatus === "discharged" || surveyAvailable || surveyCompleted
                  ? [["survey", "Discharge Survey", surveyCompleted ? "Completed" : "Available"]]
                  : []),
              ].map(([tab, label, status]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActivePortalTab(tab as "documents" | "rent" | "requests" | "sponsor" | "rci" | "survey")}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    activePortalTab === tab
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className={`mt-1 block text-xs ${activePortalTab === tab ? "text-slate-200" : "text-slate-500"}`}>
                    {status}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && !error ? (
          <div className={activePortalTab === "requests" ? "grid gap-6 xl:grid-cols-2" : "space-y-6"}>
            <div className={activePortalTab === "requests" || activePortalTab === "sponsor" ? "hidden" : "space-y-6"}>
              <section className={activePortalTab === "documents" ? "rounded-2xl border bg-white p-5 shadow-sm" : "hidden"}>
                <div className="flex items-start gap-3">
                  <FileText className="mt-1 h-5 w-5 text-slate-600" />
                  <div>
                    <h2 className="text-lg font-semibold">Documents</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Review documents assigned to you, including signed and newly added items.
                    </p>
                  </div>
                </div>

                {documents.length === 0 ? (
                  <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    No documents are currently assigned.
                  </p>
                ) : (
                  <div className="mt-5 grid gap-3">
                    {documents.map((document) => (
                      <div key={document.assignment_id} className="rounded-2xl border bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-950">{document.document_name}</h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {formatLabel(document.category)} • {formatLabel(document.signature_status)}
                              {document.signed_at ? ` • Signed ${formatDateTime(document.signed_at)}` : ""}
                            </p>
                            {document.notes ? (
                              <p className="mt-2 text-sm text-slate-600">{document.notes}</p>
                            ) : null}

                            {document.signature_status === "signed" ? (
                              <p className="mt-2 text-xs font-medium text-emerald-700">
                                Signed by {document.signed_by_name || "resident"}
                                {document.signed_at ? ` on ${formatDateTime(document.signed_at)}` : ""}
                              </p>
                            ) : null}
                          </div>

                          {document.file_url ? (
                            <button
                              type="button"
                              onClick={() => openDocument(document)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-medium shadow-sm hover:bg-slate-50"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Open
                            </button>
                          ) : null}
                        </div>

                        {document.signature_required_from === "resident" && document.signature_status !== "signed" ? (
                          <div className="mt-4 rounded-2xl bg-white p-4">
                            <p className="text-sm font-semibold text-slate-950">Electronic Signature Required</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {document.signature_instructions || "Type your full legal name to electronically sign this document."}
                            </p>

                            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                              <input
                                value={signatureNames[document.assignment_id] ?? ""}
                                onChange={(event) => updateSignatureName(document.assignment_id, event.target.value)}
                                placeholder="Type your full name"
                                className="h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                              />

                              <button
                                type="button"
                                onClick={() => signDocument(document)}
                                disabled={signingAssignmentId === document.assignment_id}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {signingAssignmentId === document.assignment_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                {signingAssignmentId === document.assignment_id ? "Signing..." : "Sign Document"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={activePortalTab === "rent" ? "rounded-2xl border bg-white p-5 shadow-sm" : "hidden"}>
                <div className="flex items-start gap-3">
                  <CreditCard className="mt-1 h-5 w-5 text-slate-600" />
                  <div>
                    <h2 className="text-lg font-semibold">Rent / Fee Records</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      View charges, payments, and current balances.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Charges</p>
                    <p className="mt-1 text-xl font-semibold">
                      {formatCurrency(totalChargeAmount)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Paid</p>
                    <p className="mt-1 text-xl font-semibold">
                      {formatCurrency(totalPaymentAmount)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Balance Due</p>
                    <p className="mt-1 text-xl font-semibold">{formatCurrency(currentBalance)}</p>
                  </div>
                </div>

                {feeLedgerEntries.length === 0 ? (
                  <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    No fee or payment records are currently available.
                  </p>
                ) : (
                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full divide-y text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-3 font-semibold">Date</th>
                          <th className="px-3 py-3 font-semibold">Description</th>
                          <th className="px-3 py-3 text-right font-semibold">Charge</th>
                          <th className="px-3 py-3 text-right font-semibold">Payment</th>
                          <th className="px-3 py-3 text-right font-semibold">Running Balance</th>
                          <th className="px-3 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {feeLedgerEntries.map((entry) => (
                          <tr key={entry.id} className="bg-white">
                            <td className="px-3 py-3 text-slate-600">{formatDate(entry.date)}</td>
                            <td className="px-3 py-3">
                              <span className="font-medium text-slate-950">{entry.description}</span>
                              {entry.sourceType === "payment" ? (
                                <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                                  Payment applied
                                </span>
                              ) : null}
                            </td>
                            <td className="px-3 py-3 text-right text-slate-600">
                              {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                            </td>
                            <td className="px-3 py-3 text-right text-slate-600">
                              {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-slate-950">
                              {formatCurrency(entry.runningBalance)}
                            </td>
                            <td className="px-3 py-3 text-slate-600">{formatLabel(entry.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {payments.length > 0 ? (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-slate-950">Payment History</h3>
                    <div className="mt-3 grid gap-2">
                      {payments.map((payment) => (
                        <div key={payment.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                          <p className="font-medium text-slate-950">
                            {formatCurrency(payment.amount)} paid on {formatDate(payment.payment_date)}
                          </p>
                          <p className="mt-1 text-slate-500">
                            {formatLabel(payment.payment_method)}
                            {payment.reference_number ? ` • Ref: ${payment.reference_number}` : ""}
                          </p>
                          {payment.notes ? <p className="mt-1 text-slate-600">{payment.notes}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            </div>

            {activePortalTab === "rci" ? (
              <section className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">RCI / Recovery Plan</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Complete or reassess your RCI and keep your recovery plan updated for your support team.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={startRciAssessment}
                    disabled={startingRci}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {startingRci ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {rciSummary?.latest_assessment ? "Reassess RCI" : "Complete RCI"}
                  </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Completed RCIs</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                      {rciSummary?.assessment_count ?? 0}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Latest Score</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                      {rciSummary?.latest_assessment?.rci_score ?? "Not completed"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recovery Capital</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                      {formatLabel(rciSummary?.latest_assessment?.recovery_capital_level)}
                    </p>
                  </div>
                </div>

                {rciSummary?.latest_assessment ? (
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-950">
                      Latest RCI completed {formatDateTime(rciSummary.latest_assessment.client_completed_at || rciSummary.latest_assessment.assessment_date)}
                    </p>
                    {rciSummary.latest_assessment.overall_summary ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {rciSummary.latest_assessment.overall_summary}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    No completed RCI is on file yet. Complete your first RCI to create your recovery plan.
                  </p>
                )}

                <div className="mt-5">
                  <h3 className="text-base font-semibold text-slate-950">Current Recovery Plan Goals</h3>
                  {rciSummary?.recovery_goals?.length ? (
                    <div className="mt-3 grid gap-3">
                      {rciSummary.recovery_goals.map((goal) => (
                        <div key={goal.id} className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                {formatLabel(goal.goal_area)} • {formatLabel(goal.priority)}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">{goal.goal_text}</p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                              {formatLabel(goal.status)}
                            </span>
                          </div>

                          {goal.action_steps ? (
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              <span className="font-medium text-slate-950">Action steps:</span> {goal.action_steps}
                            </p>
                          ) : null}

                          {goal.supports_needed ? (
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              <span className="font-medium text-slate-950">Supports needed:</span> {goal.supports_needed}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      No recovery goals have been submitted yet.
                    </p>
                  )}
                </div>
              </section>
            ) : null}

            {activePortalTab === "survey" ? (
              <section className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 text-slate-600" />
                  <div>
                    <h2 className="text-lg font-semibold">Discharge Satisfaction Survey</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      This optional survey helps the provider understand resident experience and improve services.
                    </p>
                  </div>
                </div>

                {residentStatus !== "discharged" && !surveyAvailable ? (
                  <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    This survey becomes available after discharge.
                  </p>
                ) : surveyCompleted && surveyResponse ? (
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-950">Survey submitted. Thank you.</p>
                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Overall rating</p>
                        <p className="mt-1 text-slate-700">{surveyResponse.overall_rating ?? "Not entered"} / 5</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Submitted</p>
                        <p className="mt-1 text-slate-700">{formatDateTime(surveyResponse.submitted_at)}</p>
                      </div>
                      {surveyResponse.additional_comments ? (
                        <div className="md:col-span-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Comments</p>
                          <p className="mt-1 whitespace-pre-wrap text-slate-700">{surveyResponse.additional_comments}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Overall satisfaction rating</span>
                      <select value={surveyOverallRating} onChange={(event) => setSurveyOverallRating(event.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                        <option value="">Select rating</option>
                        <option value="1">1 - Very dissatisfied</option>
                        <option value="2">2 - Dissatisfied</option>
                        <option value="3">3 - Neutral</option>
                        <option value="4">4 - Satisfied</option>
                        <option value="5">5 - Very satisfied</option>
                      </select>
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">I felt safe in the residence</span>
                        <select value={surveyFeltSafeRating} onChange={(event) => setSurveyFeltSafeRating(event.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                          <option value="">Optional rating</option>
                          <option value="1">1 - Strongly disagree</option>
                          <option value="2">2 - Disagree</option>
                          <option value="3">3 - Neutral</option>
                          <option value="4">4 - Agree</option>
                          <option value="5">5 - Strongly agree</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">Staff treated me with respect</span>
                        <select value={surveyStaffRespectRating} onChange={(event) => setSurveyStaffRespectRating(event.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                          <option value="">Optional rating</option>
                          <option value="1">1 - Strongly disagree</option>
                          <option value="2">2 - Disagree</option>
                          <option value="3">3 - Neutral</option>
                          <option value="4">4 - Agree</option>
                          <option value="5">5 - Strongly agree</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">House expectations were clear</span>
                        <select value={surveyExpectationsRating} onChange={(event) => setSurveyExpectationsRating(event.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                          <option value="">Optional rating</option>
                          <option value="1">1 - Strongly disagree</option>
                          <option value="2">2 - Disagree</option>
                          <option value="3">3 - Neutral</option>
                          <option value="4">4 - Agree</option>
                          <option value="5">5 - Strongly agree</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">The program supported my recovery goals</span>
                        <select value={surveyRecoverySupportRating} onChange={(event) => setSurveyRecoverySupportRating(event.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                          <option value="">Optional rating</option>
                          <option value="1">1 - Strongly disagree</option>
                          <option value="2">2 - Disagree</option>
                          <option value="3">3 - Neutral</option>
                          <option value="4">4 - Agree</option>
                          <option value="5">5 - Strongly agree</option>
                        </select>
                      </label>
                    </div>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Would you recommend this recovery residence?</span>
                      <select value={surveyWouldRecommend} onChange={(event) => setSurveyWouldRecommend(event.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                        <option value="">Select an option</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                        <option value="unsure">Unsure</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">What was most helpful?</span>
                      <textarea value={surveyMostHelpful} onChange={(event) => setSurveyMostHelpful(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm leading-6 outline-none ring-slate-900/10 focus:ring-4" />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">What could be improved?</span>
                      <textarea value={surveyCouldImprove} onChange={(event) => setSurveyCouldImprove(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm leading-6 outline-none ring-slate-900/10 focus:ring-4" />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Additional comments</span>
                      <textarea value={surveyAdditionalComments} onChange={(event) => setSurveyAdditionalComments(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm leading-6 outline-none ring-slate-900/10 focus:ring-4" />
                    </label>

                    <button type="button" onClick={submitSatisfactionSurvey} disabled={submittingSurvey} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                      {submittingSurvey ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {submittingSurvey ? "Submitting..." : "Submit Survey"}
                    </button>
                  </div>
                )}
              </section>
            ) : null}

            {activePortalTab === "sponsor" ? (
              <section className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 text-slate-600" />
                  <div>
                    <h2 className="text-lg font-semibold">Sponsor / Step Information</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Keep your sponsor contact information and current step updated for staff.
                    </p>
                    {sponsorInfoUpdatedAt ? (
                      <p className="mt-2 text-xs font-medium text-emerald-700">
                        Last updated {formatDateTime(sponsorInfoUpdatedAt)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Sponsor name</span>
                    <input
                      value={sponsorName}
                      onChange={(event) => setSponsorName(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Sponsor phone</span>
                    <input
                      value={sponsorPhone}
                      onChange={(event) => setSponsorPhone(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Current step</span>
                    <input
                      value={currentStep}
                      onChange={(event) => setCurrentStep(event.target.value)}
                      placeholder="Example: Step 4"
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={saveSponsorInfo}
                  disabled={savingSponsorInfo}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingSponsorInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {savingSponsorInfo ? "Saving..." : "Update Sponsor / Step"}
                </button>
              </section>
            ) : null}

            {activePortalTab === "requests" ? (
              <section className="rounded-2xl border bg-white p-4 shadow-sm md:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {[
                    ["status", "Request Status"],
                    ["maintenance", "Submit Maintenance"],
                    ["pass", "Request Pass"],
                  ].map(([view, label]) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setActiveRequestView(view as "status" | "pass" | "maintenance")}
                      className={
                        activeRequestView === view
                          ? "rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                          : "rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className={activePortalTab === "requests" && activeRequestView === "status" ? "rounded-2xl border bg-white p-5 shadow-sm md:col-span-2" : "hidden"}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">My Pass Requests</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review submitted pass requests and staff decisions.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {passRequests.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    No pass requests have been submitted yet.
                  </p>
                ) : (
                  passRequests.map((request) => {
                    const followUps = getPassFollowUps(request);

                    return (
                      <div key={request.id} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              Pass Request • {formatLabel(request.status)}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {formatDateTime(request.requested_departure_at)} - {formatDateTime(request.requested_return_at)}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              Destination: {request.destination_address || request.destination || "Not entered"}
                            </p>
                          </div>

                          <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            {formatLabel(request.status)}
                          </span>
                        </div>

                        {request.reviewed_at || request.provider_notes || request.denial_reason || followUps.length > 0 ? (
                          <div className="mt-4 rounded-xl bg-white p-3 text-sm">
                            <p className="font-semibold text-slate-950">Staff Decision</p>
                            {request.reviewed_at ? (
                              <p className="mt-1 text-slate-600">Reviewed: {formatDateTime(request.reviewed_at)}</p>
                            ) : null}
                            {request.provider_notes ? (
                              <p className="mt-1 text-slate-600">Staff notes: {request.provider_notes}</p>
                            ) : null}
                            {request.denial_reason ? (
                              <p className="mt-1 text-rose-700">Denial reason: {request.denial_reason}</p>
                            ) : null}
                            {followUps.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {followUps.map((followUp) => (
                                  <span key={followUp} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                    {followUp}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-500">
                            Staff has not reviewed this pass request yet.
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className={activePortalTab === "requests" && activeRequestView === "status" ? "rounded-2xl border bg-white p-5 shadow-sm md:col-span-2" : "hidden"}>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-slate-600" />
                <div>
                  <h2 className="text-lg font-semibold">Maintenance Request Status</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Track maintenance requests you submitted and review staff status updates or follow-up notes.
                  </p>
                </div>
              </div>

              {maintenanceRequests.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed bg-slate-50 p-5 text-sm text-slate-500">
                  <p className="font-medium text-slate-700">No maintenance requests submitted yet.</p>
                  <p className="mt-1">
                    Use Submit Maintenance to send a concern. Once staff reviews it, updates will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-3">
                  {[...maintenanceRequests]
                    .sort((first, second) => String(second.created_at ?? "").localeCompare(String(first.created_at ?? "")))
                    .map((request) => (
                      <div key={request.id} className="rounded-2xl border bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-slate-950">
                                {request.request_title || "Maintenance request"}
                              </h3>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getResidentRequestStatusClass(request.status)}`}>
                                {formatLabel(request.status)}
                              </span>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getResidentRequestPriorityClass(request.priority)}`}>
                                {formatLabel(request.priority)}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              Submitted {formatDateTime(request.created_at)}
                              {request.location_area ? ` • ${request.location_area}` : ""}
                            </p>

                            {request.request_description ? (
                              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-3 text-sm leading-6 text-slate-600">
                                {request.request_description}
                              </p>
                            ) : null}

                            {request.provider_notes ? (
                              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                                <p className="font-semibold">Staff follow-up</p>
                                <p className="mt-1 whitespace-pre-wrap">{request.provider_notes}</p>
                              </div>
                            ) : (
                              <p className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-500">
                                Staff has not added follow-up notes yet.
                              </p>
                            )}

                            {request.completed_at ? (
                              <p className="mt-3 text-xs font-medium text-emerald-700">
                                Completed {formatDateTime(request.completed_at)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>

            <section className={activePortalTab === "requests" && activeRequestView === "pass" ? "rounded-2xl border bg-white p-5 shadow-sm md:col-span-2" : "hidden"}>
              <div className="flex items-start gap-3">
                <Send className="mt-1 h-5 w-5 text-slate-600" />
                <div>
                  <h2 className="text-lg font-semibold">Pass Request</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Submit a pass request for staff review.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Requested departure</span>
                  <input
                    type="datetime-local"
                    value={passDepartureAt}
                    onChange={(event) => setPassDepartureAt(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Requested return</span>
                  <input
                    type="datetime-local"
                    value={passReturnAt}
                    onChange={(event) => setPassReturnAt(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Destination address, full</span>
                  <textarea
                    value={passDestinationAddress}
                    onChange={(event) => setPassDestinationAddress(event.target.value)}
                    placeholder="Enter the full destination address."
                    className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm leading-6 outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Destination name or place</span>
                  <input
                    value={passDestination}
                    onChange={(event) => setPassDestination(event.target.value)}
                    placeholder="Optional. Example: Court, work, family visit"
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Purpose of request</span>
                  <textarea
                    value={passReason}
                    onChange={(event) => setPassReason(event.target.value)}
                    placeholder="Briefly explain the purpose of the pass request."
                    className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm leading-6 outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <div className="rounded-2xl border bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">Emergency Contact for Trip</p>
                  <p className="mt-1 text-xs text-slate-500">
                    By listing the contact below, the resident authorizes staff to verify the details of this pass with the identified individual.
                  </p>

                  <div className="mt-4 grid gap-3">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Contact name</span>
                      <input
                        value={passEmergencyContactName}
                        onChange={(event) => setPassEmergencyContactName(event.target.value)}
                        className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Relationship to you</span>
                      <input
                        value={passEmergencyContactRelationship}
                        onChange={(event) => setPassEmergencyContactRelationship(event.target.value)}
                        className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Phone number</span>
                      <input
                        value={passEmergencyContactPhone}
                        onChange={(event) => setPassEmergencyContactPhone(event.target.value)}
                        className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                      />
                    </label>
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Transportation plan</span>
                  <textarea
                    value={passTransportationPlan}
                    onChange={(event) => setPassTransportationPlan(event.target.value)}
                    placeholder="How will you get there and back?"
                    className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm leading-6 outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Additional safety plan or notes</span>
                  <textarea
                    value={passEmergencyContactPlan}
                    onChange={(event) => setPassEmergencyContactPlan(event.target.value)}
                    placeholder="Optional additional safety information."
                    className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm leading-6 outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <div className="rounded-2xl border bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">Resident Agreement</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    I confirm that the above information is accurate. I understand that approval of this pass is contingent upon program compliance, and I agree to submit to a drug screen prior to departure and upon return, follow all program expectations while away from the residence, and communicate any changes to this request immediately.
                  </p>

                  <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={passResidentAgreed}
                      onChange={(event) => setPassResidentAgreed(event.target.checked)}
                      className="mt-1 h-4 w-4"
                    />
                    <span>I agree to the resident pass terms above.</span>
                  </label>

                  <label className="mt-4 block">
                    <span className="text-sm font-medium text-slate-700">Resident signature</span>
                    <input
                      value={passResidentSignatureName}
                      onChange={(event) => setPassResidentSignatureName(event.target.value)}
                      placeholder="Type your full name"
                      className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={submitPassRequest}
                  disabled={submittingPassRequest}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingPassRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {submittingPassRequest ? "Submitting..." : "Submit Pass Request"}
                </button>
              </div>
            </section>

            <section className={activePortalTab === "requests" && activeRequestView === "maintenance" ? "rounded-2xl border bg-white p-5 shadow-sm md:col-span-2" : "hidden"}>
              <div className="flex items-start gap-3">
                <Wrench className="mt-1 h-5 w-5 text-slate-600" />
                <div>
                  <h2 className="text-lg font-semibold">Maintenance Request</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Submit a maintenance concern for staff review.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Title</span>
                  <input
                    value={requestTitle}
                    onChange={(event) => setRequestTitle(event.target.value)}
                    placeholder="Example: Bathroom sink leaking"
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Location / area</span>
                  <input
                    value={locationArea}
                    onChange={(event) => setLocationArea(event.target.value)}
                    placeholder="Example: Upstairs bathroom"
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Priority</span>
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Description</span>
                  <textarea
                    value={requestDescription}
                    onChange={(event) => setRequestDescription(event.target.value)}
                    placeholder="Describe what is happening and anything staff should know."
                    className="mt-2 min-h-32 w-full rounded-xl border bg-white p-3 text-sm leading-6 outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <button
                  type="button"
                  onClick={submitMaintenanceRequest}
                  disabled={submittingMaintenance}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingMaintenance ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {submittingMaintenance ? "Submitting..." : "Submit Maintenance Request"}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
