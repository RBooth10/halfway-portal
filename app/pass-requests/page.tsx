"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Loader2,
  Printer,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";
import { resolveActiveProviderId } from "@/lib/providerAccess";

type ProviderRow = {
  id: string;
  legal_name?: string | null;
  provider_name?: string | null;
  business_name?: string | null;
  name?: string | null;
};

type HouseRow = {
  id: string;
  name: string;
  status: string | null;
};

type ResidentRow = {
  id: string;
  first_name: string;
  last_name: string;
  house_id: string | null;
  resident_status: string | null;
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

type PassView = "all" | "pending" | "approved";

function formatLabel(value: string | null | undefined) {
  if (!value) return "Not set";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "approved") return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  if (normalized === "completed") return "bg-blue-50 text-blue-700 ring-blue-600/20";
  if (normalized === "denied") return "bg-rose-50 text-rose-700 ring-rose-600/20";
  if (normalized === "cancelled") return "bg-slate-100 text-slate-600 ring-slate-300";

  return "bg-amber-50 text-amber-700 ring-amber-600/20";
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
  icon: ComponentType<{ className?: string }>;
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

export default function PassRequestsPage() {
  const [providerId, setProviderId] = useState("");
  const [provider, setProvider] = useState<ProviderRow | null>(null);
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [passRequests, setPassRequests] = useState<PassRequestRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [passView, setPassView] = useState<PassView>("pending");
  const [passHouseFilter, setPassHouseFilter] = useState("all");
  const [passStatusFilter, setPassStatusFilter] = useState("all");
  const [departureStart, setDepartureStart] = useState("");
  const [departureEnd, setDepartureEnd] = useState("");

  const [selectedPassRequest, setSelectedPassRequest] = useState<PassRequestRow | null>(null);
  const [selectedPassNextStatus, setSelectedPassNextStatus] = useState("");
  const [passProviderNotes, setPassProviderNotes] = useState("");
  const [passDenialReason, setPassDenialReason] = useState("");
  const [requiresCourtOrder, setRequiresCourtOrder] = useState(false);
  const [requiresClinicalClearance, setRequiresClinicalClearance] = useState(false);
  const [requiresEmergencyTravelDocs, setRequiresEmergencyTravelDocs] = useState(false);
  const [requiresOtherAttachment, setRequiresOtherAttachment] = useState(false);
  const [otherAttachmentNote, setOtherAttachmentNote] = useState("");
  const [savingPassRequest, setSavingPassRequest] = useState(false);

  const activeHouses = useMemo(
    () => houses.filter((house) => String(house.status ?? "active").toLowerCase() !== "inactive"),
    [houses]
  );

  function getResident(residentId: string | null) {
    if (!residentId) return null;

    return residents.find((item) => item.id === residentId) ?? null;
  }

  function getHouseName(houseId: string | null) {
    if (!houseId) return "No house assigned";

    return houses.find((house) => house.id === houseId)?.name ?? "Unknown house";
  }

  function getRequestHouseName(request: PassRequestRow) {
    const resident = getResident(request.resident_id);

    return getHouseName(request.house_id || resident?.house_id || null);
  }

  function getResidentName(residentId: string | null) {
    const resident = getResident(residentId);

    return resident ? `${resident.first_name} ${resident.last_name}` : "Unknown resident";
  }

  const requestsWithinHouseAndDate = useMemo(() => {
    return passRequests.filter((request) => {
      const resident = getResident(request.resident_id);
      const departureDate = getDateOnly(request.requested_departure_at);

      const matchesHouse =
        passHouseFilter === "all" ||
        request.house_id === passHouseFilter ||
        resident?.house_id === passHouseFilter;

      const matchesStart = !departureStart || (departureDate && departureDate >= departureStart);
      const matchesEnd = !departureEnd || (departureDate && departureDate <= departureEnd);

      return matchesHouse && matchesStart && matchesEnd;
    });
  }, [passRequests, residents, passHouseFilter, departureStart, departureEnd]);

  const filteredPassRequests = useMemo(() => {
    return requestsWithinHouseAndDate
      .filter((request) => {
        const status = String(request.status ?? "").toLowerCase();

        if (passView === "pending") return status === "pending";
        if (passView === "approved") return status === "approved";

        return passStatusFilter === "all" || status === passStatusFilter;
      })
      .sort((first, second) => {
        const firstDeparture = first.requested_departure_at ?? "";
        const secondDeparture = second.requested_departure_at ?? "";
        const departureComparison = secondDeparture.localeCompare(firstDeparture);

        if (departureComparison !== 0) return departureComparison;

        return second.created_at.localeCompare(first.created_at);
      });
  }, [requestsWithinHouseAndDate, passView, passStatusFilter]);

  const pendingPassRequestCount = useMemo(
    () => passRequests.filter((request) => request.status === "pending").length,
    [passRequests]
  );

  const approvedCount = useMemo(
    () => requestsWithinHouseAndDate.filter((request) => request.status === "approved").length,
    [requestsWithinHouseAndDate]
  );

  const completedCount = useMemo(
    () => requestsWithinHouseAndDate.filter((request) => request.status === "completed").length,
    [requestsWithinHouseAndDate]
  );

  const deniedOrCancelledCount = useMemo(
    () =>
      requestsWithinHouseAndDate.filter((request) => request.status === "denied" || request.status === "cancelled").length,
    [requestsWithinHouseAndDate]
  );

  async function loadPassRequests(activeProviderId: string) {
    const supabase = getSupabaseClient() as any;

    const providerResult = await supabase
      .from("providers")
      .select("*")
      .eq("id", activeProviderId)
      .single();

    const housesResult = await supabase
      .from("houses")
      .select("id, name, status")
      .eq("provider_id", activeProviderId)
      .order("name", { ascending: true });

    const residentsResult = await supabase
      .from("residents")
      .select("id, first_name, last_name, house_id, resident_status")
      .eq("provider_id", activeProviderId)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    const passRequestsResult = await supabase
      .from("resident_pass_requests")
      .select("id, provider_id, house_id, resident_id, requested_departure_at, requested_return_at, destination, destination_address, reason, transportation_plan, emergency_contact_plan, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, resident_agreed_to_terms, resident_signature_name, resident_signed_at, requires_court_order, requires_clinical_clearance, requires_emergency_travel_docs, requires_other_attachment, other_attachment_note, denial_reason, status, provider_notes, reviewed_by_auth_user_id, reviewed_at, created_at, updated_at")
      .eq("provider_id", activeProviderId)
      .order("created_at", { ascending: false });

    if (providerResult.error) throw providerResult.error;
    if (housesResult.error) throw housesResult.error;
    if (residentsResult.error) throw residentsResult.error;
    if (passRequestsResult.error) throw passRequestsResult.error;

    setProvider(providerResult.data as ProviderRow);
    setHouses((housesResult.data ?? []) as HouseRow[]);
    setResidents((residentsResult.data ?? []) as ResidentRow[]);
    setPassRequests((passRequestsResult.data ?? []) as PassRequestRow[]);
  }

  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true);
        setError("");
        setMessage("");

        const supabase = getSupabaseClient() as any;
        const { providerId: activeProviderId } = await resolveActiveProviderId(supabase);

        if (!activeProviderId) {
          setError("No provider profile found. Create a provider before using pass requests.");
          return;
        }

        setProviderId(activeProviderId);
        await loadPassRequests(activeProviderId);
      } catch (err) {
        const loadError = err as { message?: unknown };
        setError(loadError?.message ? String(loadError.message) : "Could not load pass requests.");
      } finally {
        setLoading(false);
      }
    }

    void loadInitial();
  }, []);

  function openPassStatusModal(request: PassRequestRow, nextStatus: string) {
    setSelectedPassRequest(request);
    setSelectedPassNextStatus(nextStatus);
    setPassProviderNotes(request.provider_notes ?? "");
    setPassDenialReason(request.denial_reason ?? "");
    setRequiresCourtOrder(Boolean(request.requires_court_order));
    setRequiresClinicalClearance(Boolean(request.requires_clinical_clearance));
    setRequiresEmergencyTravelDocs(Boolean(request.requires_emergency_travel_docs));
    setRequiresOtherAttachment(Boolean(request.requires_other_attachment));
    setOtherAttachmentNote(request.other_attachment_note ?? "");
  }

  function closePassStatusModal() {
    setSelectedPassRequest(null);
    setSelectedPassNextStatus("");
    setPassProviderNotes("");
    setPassDenialReason("");
    setRequiresCourtOrder(false);
    setRequiresClinicalClearance(false);
    setRequiresEmergencyTravelDocs(false);
    setRequiresOtherAttachment(false);
    setOtherAttachmentNote("");
  }

  async function savePassRequestStatus() {
    if (!providerId) {
      setError("No provider selected.");
      return;
    }

    if (!selectedPassRequest || !selectedPassNextStatus) {
      setError("No pass request selected.");
      return;
    }

    try {
      setSavingPassRequest(true);
      setError("");
      setMessage("");

      const supabase = getSupabaseClient() as any;
      const { data: userData } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from("resident_pass_requests")
        .update({
          status: selectedPassNextStatus,
          provider_notes: passProviderNotes.trim() || null,
          denial_reason: selectedPassNextStatus === "denied" ? passDenialReason.trim() || null : null,
          requires_court_order: requiresCourtOrder,
          requires_clinical_clearance: requiresClinicalClearance,
          requires_emergency_travel_docs: requiresEmergencyTravelDocs,
          requires_other_attachment: requiresOtherAttachment,
          other_attachment_note: requiresOtherAttachment ? otherAttachmentNote.trim() || null : null,
          reviewed_by_auth_user_id: userData.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedPassRequest.id);

      if (updateError) throw updateError;

      setMessage("Pass request updated.");
      closePassStatusModal();
      await loadPassRequests(providerId);
    } catch (err) {
      const passError = err as { message?: unknown };
      setError(passError?.message ? String(passError.message) : "Could not update pass request.");
    } finally {
      setSavingPassRequest(false);
    }
  }

  function exportPassRequestsCsv() {
    const headers = [
      "Resident",
      "House",
      "Status",
      "Submitted",
      "Departure",
      "Return",
      "Destination",
      "Reason",
      "Provider Notes",
      "Denial Reason",
    ];

    const rows = filteredPassRequests.map((request) => [
      getResidentName(request.resident_id),
      getRequestHouseName(request),
      formatLabel(request.status),
      formatDateTime(request.created_at),
      formatDateTime(request.requested_departure_at),
      formatDateTime(request.requested_return_at),
      request.destination_address || request.destination,
      request.reason ?? "",
      request.provider_notes ?? "",
      request.denial_reason ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `pass-requests-${passView}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function printPassRequests() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  return (
    <PageShell>
      <section className="rounded-2xl border bg-white p-6 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
              <ClipboardCheck className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pass Requests</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Pass Request Queue</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Review resident-submitted pass requests, approve or deny requests, track approved passes, and return status updates to the resident portal.
              </p>
              {provider ? (
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Provider: {provider.legal_name || provider.provider_name || provider.business_name || provider.name || "Provider"}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportPassRequestsCsv}
              disabled={filteredPassRequests.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              Export
            </button>

            <button
              type="button"
              onClick={printPassRequests}
              disabled={filteredPassRequests.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 print:hidden">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 print:hidden">
          <div className="flex gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>{message}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 print:hidden">
        <StatCard
          title="Pending Review"
          value={String(pendingPassRequestCount)}
          subtitle="Requests waiting for staff action"
          icon={ClipboardCheck}
        />
        <StatCard
          title="Approved"
          value={String(approvedCount)}
          subtitle="Approved in selected date/house view"
          icon={CheckCircle2}
        />
        <StatCard
          title="Completed"
          value={String(completedCount)}
          subtitle="Completed in selected date/house view"
          icon={CalendarDays}
        />
        <StatCard
          title="Denied / Cancelled"
          value={String(deniedOrCancelledCount)}
          subtitle="Not approved in selected date/house view"
          icon={ClipboardCheck}
        />
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm print:hidden">
        <div className="grid gap-4 xl:grid-cols-3">
          {[
            ["pending", "Pending Review", "Only requests waiting for staff action."],
            ["approved", "Approved Passes", "Only passes currently approved and not yet completed."],
            ["all", "All Requests", "Review all statuses, including completed passes, with optional status filter."],
          ].map(([view, label, description]) => (
            <button
              key={view}
              type="button"
              onClick={() => setPassView(view as PassView)}
              className={`rounded-2xl border p-4 text-left transition ${
                passView === view
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="block text-sm font-semibold">{label}</span>
              <span className={`mt-1 block text-xs ${passView === view ? "text-slate-200" : "text-slate-500"}`}>
                {description}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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

          {passView === "all" ? (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                value={passStatusFilter}
                onChange={(event) => setPassStatusFilter(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          ) : null}

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Departure start</span>
            <input
              type="date"
              value={departureStart}
              onChange={(event) => setDepartureStart(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Departure end</span>
            <input
              type="date"
              value={departureEnd}
              onChange={(event) => setDepartureEnd(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm" id="pass-requests-print">
        <div className="hidden print:block">
          <h1 className="text-xl font-semibold text-slate-950">Pass Requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            View: {passView === "approved" ? "Approved Passes" : passView === "pending" ? "Pending Review" : "All Requests"}
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading pass requests...
            </div>
          </div>
        ) : filteredPassRequests.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
            No pass requests match the selected filters.
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredPassRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border bg-slate-50 p-4 break-inside-avoid">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-950">{getResidentName(request.resident_id)}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusClass(request.status)}`}>
                        {formatLabel(request.status)}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {getRequestHouseName(request)} • Submitted {formatDateTime(request.created_at)}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-white p-3 text-sm">
                        <p className="font-medium text-slate-700">Destination</p>
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
                        <p className="font-medium text-slate-700">Purpose</p>
                        <p className="mt-1 whitespace-pre-wrap text-slate-600">
                          {request.reason || "Not entered"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-3 text-sm md:col-span-2">
                        <p className="font-medium text-slate-700">Emergency Contact</p>
                        <p className="mt-1 text-slate-600">Contact: {request.emergency_contact_name || "Not entered"}</p>
                        <p className="text-slate-600">Relationship: {request.emergency_contact_relationship || "Not entered"}</p>
                        <p className="text-slate-600">Phone: {request.emergency_contact_phone || "Not entered"}</p>
                      </div>

                      {request.provider_notes || request.denial_reason ? (
                        <div className="rounded-xl bg-white p-3 text-sm md:col-span-2">
                          <p className="font-medium text-slate-700">Staff Review</p>
                          {request.denial_reason ? (
                            <p className="mt-1 whitespace-pre-wrap text-slate-600">Denial reason: {request.denial_reason}</p>
                          ) : null}
                          {request.provider_notes ? (
                            <p className="mt-1 whitespace-pre-wrap text-slate-600">Follow-up notes: {request.provider_notes}</p>
                          ) : null}
                          {request.reviewed_at ? (
                            <p className="mt-1 text-xs text-slate-500">Reviewed {formatDateTime(request.reviewed_at)}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:items-end print:hidden">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                      Signed {formatDateTime(request.resident_signed_at)}
                    </span>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {request.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openPassStatusModal(request, "approved")}
                            disabled={savingPassRequest}
                            className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => openPassStatusModal(request, "denied")}
                            disabled={savingPassRequest}
                            className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-60"
                          >
                            Deny
                          </button>
                        </>
                      ) : null}

                      {request.status === "approved" ? (
                        <button
                          type="button"
                          onClick={() => openPassStatusModal(request, "completed")}
                          disabled={savingPassRequest}
                          className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                          Mark Complete
                        </button>
                      ) : null}

                      {request.status !== "completed" && request.status !== "cancelled" ? (
                        <button
                          type="button"
                          onClick={() => openPassStatusModal(request, "cancelled")}
                          disabled={savingPassRequest}
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

      {selectedPassRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 print:hidden">
          <div className="w-full max-w-2xl rounded-2xl border bg-white p-5 shadow-xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Pass Request Status Update</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  {getResidentName(selectedPassRequest.resident_id)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Change status to {formatLabel(selectedPassNextStatus)} and add staff follow-up information for the resident portal.
                </p>
              </div>

              <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusClass(selectedPassRequest.status)}`}>
                {formatLabel(selectedPassRequest.status)}
              </span>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-slate-700">Follow-up action or notes</span>
              <textarea
                value={passProviderNotes}
                onChange={(event) => setPassProviderNotes(event.target.value)}
                placeholder="Example: Approved for requested time. Resident must return by curfew."
                className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
              />
            </label>

            {selectedPassNextStatus === "denied" ? (
              <label className="mt-4 block">
                <span className="text-sm font-medium text-slate-700">Reason for denial</span>
                <textarea
                  value={passDenialReason}
                  onChange={(event) => setPassDenialReason(event.target.value)}
                  placeholder="Explain why the pass request is denied."
                  className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>
            ) : null}

            {selectedPassNextStatus === "approved" || selectedPassNextStatus === "denied" ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">Documentation / requirements</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={requiresCourtOrder} onChange={(event) => setRequiresCourtOrder(event.target.checked)} />
                    Court order required
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={requiresClinicalClearance} onChange={(event) => setRequiresClinicalClearance(event.target.checked)} />
                    Clinical clearance required
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={requiresEmergencyTravelDocs} onChange={(event) => setRequiresEmergencyTravelDocs(event.target.checked)} />
                    Emergency travel docs required
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={requiresOtherAttachment} onChange={(event) => setRequiresOtherAttachment(event.target.checked)} />
                    Other requirement
                  </label>
                </div>

                {requiresOtherAttachment ? (
                  <input
                    value={otherAttachmentNote}
                    onChange={(event) => setOtherAttachmentNote(event.target.value)}
                    placeholder="Describe other requirement"
                    className="mt-3 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  />
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closePassStatusModal}
                disabled={savingPassRequest}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={savePassRequestStatus}
                disabled={savingPassRequest}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingPassRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {savingPassRequest ? "Saving..." : `Save as ${formatLabel(selectedPassNextStatus)}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
