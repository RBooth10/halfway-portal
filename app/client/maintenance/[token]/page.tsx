"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Home, Loader2, ShieldCheck, Wrench } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

export default function ClientMaintenanceRequestPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [residentName, setResidentName] = useState("");
  const [houseName, setHouseName] = useState("");
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [locationArea, setLocationArea] = useState("");
  const [priority, setPriority] = useState("normal");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadContext() {
      try {
        const supabase = getSupabaseClient() as any;

        const { data, error } = await supabase.rpc("get_client_maintenance_context", {
          p_access_token: token,
        });

        if (error) {
          throw error;
        }

        if (!data?.ok) {
          setError(data?.message ?? "This maintenance request link is unavailable.");
          return;
        }

        setResidentName(data.resident_name ?? "Resident");
        setHouseName(data.house_name ?? "");
      } catch (err) {
        const maintenanceError = err as { message?: unknown };
        setError(maintenanceError?.message ? String(maintenanceError.message) : "Could not load maintenance request form.");
      } finally {
        setLoading(false);
      }
    }

    void loadContext();
  }, [token]);

  async function submitRequest() {
    if (!requestTitle.trim()) {
      setError("Enter a short title for the maintenance request.");
      return;
    }

    if (requestDescription.trim().length < 10) {
      setError("Please describe the maintenance issue.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");
      setError("");

      const supabase = getSupabaseClient() as any;

      const { data, error } = await supabase.rpc("submit_client_maintenance_request", {
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

      setComplete(true);
      setMessage("Maintenance request submitted successfully.");
      setRequestTitle("");
      setRequestDescription("");
      setLocationArea("");
      setPriority("normal");
    } catch (err) {
      const maintenanceError = err as { message?: unknown };
      setError(maintenanceError?.message ? String(maintenanceError.message) : "Could not submit maintenance request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
              <Wrench className="h-8 w-8 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Maintenance Request</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Submit a Request</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                {residentName ? `${residentName}, use this form to report a maintenance concern.` : "Use this form to report a maintenance concern."}
              </p>
              {houseName ? (
                <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  <Home className="h-3.5 w-3.5" />
                  {houseName}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 shadow-sm">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading maintenance request form...
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

        {!loading && !complete && !error ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-slate-600" />
              <div>
                <h2 className="text-lg font-semibold">Request Details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Describe the issue clearly so staff can review and follow up.
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
                  placeholder="Example: Upstairs bathroom, kitchen, bedroom 2"
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
                  placeholder="Describe what is happening, when it started, and anything staff should know."
                  className="mt-2 min-h-32 w-full rounded-xl border bg-white p-3 text-sm leading-6 outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <button
                type="button"
                onClick={submitRequest}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </section>
        ) : null}

        {complete ? (
          <section className="rounded-2xl border bg-white p-5 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="mt-3 text-lg font-semibold">Request Submitted</h2>
            <p className="mt-2 text-sm text-slate-500">
              Staff will review your maintenance request and follow up as needed.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
