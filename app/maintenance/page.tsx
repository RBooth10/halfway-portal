"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  Plus,
  Wrench,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase/client";

type ProviderRow = {
  id: string;
  name: string;
};

type HouseRow = {
  id: string;
  name: string;
  total_beds: number | string | null;
  status: string | null;
};

type ResidentRow = {
  id: string;
  first_name: string;
  last_name: string;
  house_id: string | null;
  resident_status: string | null;
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

function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function MaintenancePage() {
  const [providerId, setProviderId] = useState("");
  const [provider, setProvider] = useState<ProviderRow | null>(null);
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequestRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [maintenanceHouseFilter, setMaintenanceHouseFilter] = useState("all");
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState("open");
  const [maintenancePriorityFilter, setMaintenancePriorityFilter] = useState("all");

  const [maintenanceFormHouseId, setMaintenanceFormHouseId] = useState("");
  const [maintenanceFormResidentId, setMaintenanceFormResidentId] = useState("");
  const [maintenanceFormTitle, setMaintenanceFormTitle] = useState("");
  const [maintenanceFormDescription, setMaintenanceFormDescription] = useState("");
  const [maintenanceFormLocation, setMaintenanceFormLocation] = useState("");
  const [maintenanceFormPriority, setMaintenanceFormPriority] = useState("normal");
  const [maintenanceFormNotes, setMaintenanceFormNotes] = useState("");
  const [savingMaintenanceRequest, setSavingMaintenanceRequest] = useState(false);

  const activeHouses = useMemo(
    () => houses.filter((house) => String(house.status ?? "active").toLowerCase() !== "inactive"),
    [houses]
  );

  const activeResidents = useMemo(
    () => residents.filter((resident) => String(resident.resident_status ?? "active").toLowerCase() !== "discharged"),
    [residents]
  );

  const filteredMaintenanceRequests = useMemo(() => {
    return maintenanceRequests.filter((request) => {
      const houseMatches =
        maintenanceHouseFilter === "all" ||
        request.house_id === maintenanceHouseFilter;

      const statusMatches =
        maintenanceStatusFilter === "all" ||
        request.status === maintenanceStatusFilter;

      const priorityMatches =
        maintenancePriorityFilter === "all" ||
        request.priority === maintenancePriorityFilter;

      return houseMatches && statusMatches && priorityMatches;
    });
  }, [maintenanceRequests, maintenanceHouseFilter, maintenanceStatusFilter, maintenancePriorityFilter]);

  const openMaintenanceCount = useMemo(
    () => maintenanceRequests.filter((request) => request.status === "open").length,
    [maintenanceRequests]
  );

  function getHouseName(houseId: string | null) {
    if (!houseId) return "No house assigned";
    return houses.find((house) => house.id === houseId)?.name ?? "Unknown house";
  }

  function getResidentName(residentId: string | null, submittedByName: string | null) {
    if (!residentId) return submittedByName || "Staff entered";
    const resident = residents.find((item) => item.id === residentId);
    return resident ? `${resident.first_name} ${resident.last_name}` : submittedByName || "Unknown resident";
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

  async function loadMaintenance(activeProviderId: string) {
    const supabase = getSupabaseClient() as any;

    const providerResult = await supabase
      .from("providers")
      .select("id, name")
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

    const maintenanceResult = await supabase
      .from("resident_maintenance_requests")
      .select("id, provider_id, house_id, resident_id, submitted_by_name, request_title, request_description, location_area, priority, status, provider_notes, completed_at, created_at, updated_at")
      .eq("provider_id", activeProviderId)
      .order("created_at", { ascending: false });

    if (providerResult.error) throw providerResult.error;
    if (housesResult.error) throw housesResult.error;
    if (residentsResult.error) throw residentsResult.error;
    if (maintenanceResult.error) throw maintenanceResult.error;

    setProvider(providerResult.data as ProviderRow);
    setHouses((housesResult.data ?? []) as HouseRow[]);
    setResidents((residentsResult.data ?? []) as ResidentRow[]);
    setMaintenanceRequests((maintenanceResult.data ?? []) as MaintenanceRequestRow[]);
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
            .select("id, name")
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
          setError("No provider profile found. Create a provider before using the maintenance log.");
          return;
        }

        setProviderId(activeProviderId);
        await loadMaintenance(activeProviderId);
      } catch (err) {
        const loadError = err as { message?: unknown };
        setError(loadError?.message ? String(loadError.message) : "Could not load maintenance log.");
      } finally {
        setLoading(false);
      }
    }

    void loadInitial();
  }, []);

  async function openLargeTextPrompt(title: string, initialValue: string) {
    return window.prompt(title, initialValue);
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
      "Completed At",
    ];

    const rows = filteredMaintenanceRequests.map((request) => [
      formatDateTime(request.created_at),
      request.request_title,
      getHouseName(request.house_id),
      getResidentName(request.resident_id, request.submitted_by_name),
      request.location_area ?? "",
      formatLabel(request.priority),
      formatLabel(request.status),
      request.request_description,
      request.provider_notes ?? "",
      request.completed_at ? formatDateTime(request.completed_at) : "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `maintenance-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
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

      if (insertError) throw insertError;

      if (!data?.ok) {
        throw new Error(data?.message ?? "Could not create maintenance request.");
      }

      resetMaintenanceForm();
      setShowMaintenanceForm(false);
      setMessage("Maintenance request created.");
      await loadMaintenance(providerId);
    } catch (err) {
      const maintenanceError = err as { message?: unknown };
      setError(maintenanceError?.message ? String(maintenanceError.message) : "Could not create maintenance request.");
    } finally {
      setSavingMaintenanceRequest(false);
    }
  }

  async function updateMaintenanceRequestStatus(request: MaintenanceRequestRow, nextStatus: string) {
    if (!providerId) {
      setError("No provider selected.");
      return;
    }

    const providerNotes = await openLargeTextPrompt("Provider notes or follow-up details:", request.provider_notes ?? "");

    if (providerNotes === null) return;

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

      if (updateError) throw updateError;

      setMessage("Maintenance request updated.");
      await loadMaintenance(providerId);
    } catch (err) {
      const maintenanceError = err as { message?: unknown };
      setError(maintenanceError?.message ? String(maintenanceError.message) : "Could not update maintenance request.");
    } finally {
      setSavingMaintenanceRequest(false);
    }
  }

  return (
    <PageShell>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
              <Wrench className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Maintenance</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Maintenance Log</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Review resident-submitted maintenance requests, create staff-entered requests, update status, and return staff notes to the resident portal.
              </p>
              {provider ? (
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Provider: {provider.name}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Open requests: <span className="font-semibold text-slate-950">{openMaintenanceCount}</span>
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Maintenance Requests</h2>
            <p className="mt-1 text-sm text-slate-500">
              Filter, export, create, and update maintenance requests.
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
                  {activeResidents.map((resident) => (
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

        {loading ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading maintenance requests...
            </div>
          </div>
        ) : filteredMaintenanceRequests.length === 0 ? (
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
                      {getHouseName(request.house_id)} • {getResidentName(request.resident_id, request.submitted_by_name)}
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
                    {request.completed_at ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Completed {formatDateTime(request.completed_at)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        {formatLabel(request.status)}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        {formatLabel(request.priority)}
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
    </PageShell>
  );
}
