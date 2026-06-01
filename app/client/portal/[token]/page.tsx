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
  Wrench,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type PortalDocument = {
  assignment_id: string;
  assignment_status: string;
  signature_status: string;
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

function formatDate(value: string | null | undefined) {
  if (!value) return "Not entered";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Not entered";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
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

function formatLabel(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Not entered";
}

export default function ClientPortalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [residentName, setResidentName] = useState("");
  const [houseName, setHouseName] = useState("");
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [feeCharges, setFeeCharges] = useState<FeeCharge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [locationArea, setLocationArea] = useState("");
  const [priority, setPriority] = useState("normal");
  const [loading, setLoading] = useState(true);
  const [submittingMaintenance, setSubmittingMaintenance] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const balanceDue = useMemo(
    () => feeCharges.reduce((sum, charge) => sum + Number(charge.balance_due || 0), 0),
    [feeCharges]
  );

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
      setDocuments((data.documents ?? []) as PortalDocument[]);
      setFeeCharges((data.fee_charges ?? []) as FeeCharge[]);
      setPayments((data.payments ?? []) as Payment[]);
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
              Current balance: <span className="font-semibold text-slate-950">{formatCurrency(balanceDue)}</span>
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
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-6">
              <section className="rounded-2xl border bg-white p-5 shadow-sm">
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
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border bg-white p-5 shadow-sm">
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
                      {formatCurrency(feeCharges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0))}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Paid</p>
                    <p className="mt-1 text-xl font-semibold">
                      {formatCurrency(feeCharges.reduce((sum, charge) => sum + Number(charge.amount_paid || 0), 0))}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Balance Due</p>
                    <p className="mt-1 text-xl font-semibold">{formatCurrency(balanceDue)}</p>
                  </div>
                </div>

                {feeCharges.length === 0 ? (
                  <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    No fee records are currently available.
                  </p>
                ) : (
                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full divide-y text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-3 font-semibold">Charge</th>
                          <th className="px-3 py-3 font-semibold">Due</th>
                          <th className="px-3 py-3 text-right font-semibold">Amount</th>
                          <th className="px-3 py-3 text-right font-semibold">Paid</th>
                          <th className="px-3 py-3 text-right font-semibold">Balance</th>
                          <th className="px-3 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {feeCharges.map((charge) => (
                          <tr key={charge.id} className="bg-white">
                            <td className="px-3 py-3">
                              <span className="font-medium text-slate-950">{formatLabel(charge.charge_type)}</span>
                              <span className="block text-xs text-slate-400">
                                {formatDate(charge.period_start)} - {formatDate(charge.period_end)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-600">{formatDate(charge.due_date)}</td>
                            <td className="px-3 py-3 text-right text-slate-600">{formatCurrency(charge.amount)}</td>
                            <td className="px-3 py-3 text-right text-slate-600">{formatCurrency(charge.amount_paid)}</td>
                            <td className="px-3 py-3 text-right font-semibold text-slate-950">{formatCurrency(charge.balance_due)}</td>
                            <td className="px-3 py-3 text-slate-600">{formatLabel(charge.status)}</td>
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

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
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
