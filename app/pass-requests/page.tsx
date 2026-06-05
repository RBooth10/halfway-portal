"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

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

export default function PassRequestsPage() {
  const [providerId, setProviderId] = useState("");
  const [provider, setProvider] = useState<ProviderRow | null>(null);
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [passRequests, setPassRequests] = useState<PassRequestRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [passHouseFilter, setPassHouseFilter] = useState("all");
  const [passStatusFilter, setPassStatusFilter] = useState("pending");

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

  const filteredPassRequests = useMemo(() => {
    return passRequests
      .filter((request) => {
        const matchesHouse = passHouseFilter === "all" || request.house_id === passHouseFilter;
        const matchesStatus = passStatusFilter === "all" || request.status === passStatusFilter;
        return matchesHouse && matchesStatus;
      })
      .sort((first, second) => second.created_at.localeCompare(first.created_at));
  }, [passRequests, passHouseFilter, passStatusFilter]);

  const pendingPassRequestCount = useMemo(
    () => passRequests.filter((request) => request.status === "pending").length,
    [passRequests]
  );

  function getHouseName(houseId: string | null) {
    if (!houseId) return "No house assigned";
    return houses.find((house) => house.id === houseId)?.name ?? "Unknown house";
  }

  function getResidentName(residentId: string | null) {
    if (!residentId) return "Unknown resident";
    const resident = residents.find((item) => item.id === residentId);
    return resident ? `${resident.first_name} ${resident.last_name}` : "Unknown resident";
  }

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
        const storedProviderId =
          typeof window !== "undefined" ? window.localStorage.getItem("activeProviderId") : null;

        let activeProviderId = storedProviderId || "";

        if (!activeProviderId) {
          const providerResult = await supabase
            .from("providers")
            .select("*")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (providerResult.error) throw providerResult.error;

          activeProviderId = providerResult.data?.id ?? "";

          if (activeProviderId && typeof window !== "undefined") {
            window.localStorage.setItem("activeProviderId", activeProviderId);
          }
        }

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

  return (
    <PageShell>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
              <ClipboardCheck className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pass Requests</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Pass Request Queue</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Review resident-submitted pass requests, approve or deny requests, record documentation requirements, and return status updates to the resident portal.
              </p>
              {provider ? (
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Provider: {provider.legal_name || provider.provider_name || provider.business_name || provider.name || "Provider"}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Pending requests: <span className="font-semibold text-slate-950">{pendingPassRequestCount}</span>
          </div>
        </div>
      </section>

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

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
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

        {loading ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading pass requests...
            </div>
          </div>
        ) : filteredPassRequests.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
            No pass requests match the selected filters.
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {filteredPassRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-950">{getResidentName(request.resident_id)}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {getHouseName(request.house_id)} • Submitted {formatDateTime(request.created_at)}
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
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        {formatLabel(request.status)}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                        Signed {formatDateTime(request.resident_signed_at)}
                      </span>
                    </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
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

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
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
