"use client";

import { openFilePreview } from "@/lib/filePreview";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  FileSignature,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type IntakeDocument = {
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
  signing_content: string | null;
  signature_statement: string | null;
  notes: string | null;
};

function formatSignatureStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

export default function ClientIntakeSigningPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [residentName, setResidentName] = useState("");
  const [documents, setDocuments] = useState<IntakeDocument[]>([]);
  const [signatureNames, setSignatureNames] = useState<Record<string, string>>({});
  const [signingAssignmentId, setSigningAssignmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadDocuments() {
    try {
      setLoading(true);
      setError("");

      const supabase = getSupabaseClient() as any;

      const { data, error } = await supabase.rpc("get_client_intake_documents", {
        p_access_token: token,
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        setError(data?.message ?? "This intake document link is unavailable.");
        return;
      }

      const loadedDocuments = (data.documents ?? []) as IntakeDocument[];

      setResidentName(data.resident_name ?? "Resident");
      setDocuments(loadedDocuments);

      const unsignedDocuments = loadedDocuments.filter(
        (document) => document.signature_status !== "signed"
      );

      setComplete(loadedDocuments.length > 0 && unsignedDocuments.length === 0);
    } catch (err) {
      const intakeError = err as { message?: unknown };
      setError(intakeError?.message ? String(intakeError.message) : "Could not load intake documents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, [token]);

  function updateSignatureName(assignmentId: string, value: string) {
    setSignatureNames((current) => ({
      ...current,
      [assignmentId]: value,
    }));
  }

  async function openDocumentFile(document: IntakeDocument) {
    if (!document.file_url) {
      setError("No uploaded document file is attached to this intake item.");
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

      await openFilePreview(data.signedUrl, document.document_name || "Document", document.file_url);
    } catch (err) {
      const fileError = err as { message?: unknown };
      setError(fileError?.message ? String(fileError.message) : "Could not open document file.");
    }
  }

  async function signDocument(document: IntakeDocument) {
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

      const { data, error } = await supabase.rpc("submit_client_intake_signature", {
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

      setMessage(`${document.document_name} was signed successfully.`);
    } catch (err) {
      const signatureError = err as { message?: unknown };
      setError(signatureError?.message ? String(signatureError.message) : "Could not sign document.");
    } finally {
      setSigningAssignmentId(null);
    }
  }

  const signedCount = documents.filter((document) => document.signature_status === "signed").length;
  const unsignedCount = documents.length - signedCount;

  useEffect(() => {
    if (documents.length > 0 && unsignedCount === 0) {
      setComplete(true);
    }
  }, [documents.length, unsignedCount]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
                <ShieldCheck className="h-8 w-8 text-slate-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Resident Intake Documents</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">Review and Sign</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  {residentName ? `${residentName}, please review and electronically sign the intake documents listed below.` : "Please review and electronically sign the intake documents listed below."}
                </p>
              </div>
            </div>

            {documents.length > 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {signedCount} signed / {documents.length} total
              </div>
            ) : null}
          </div>
        </section>

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p>{message}</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <section className="rounded-3xl border bg-white p-8 text-center shadow-sm">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" />
            <p className="mt-3 text-sm text-slate-500">Loading intake documents...</p>
          </section>
        ) : documents.length === 0 && !error ? (
          <section className="rounded-3xl border bg-white p-8 text-center shadow-sm">
            <FileSignature className="mx-auto h-8 w-8 text-slate-400" />
            <h2 className="mt-4 text-lg font-semibold">No intake documents assigned</h2>
            <p className="mt-2 text-sm text-slate-500">
              There are no intake documents ready for signature at this time.
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            {documents.map((document) => {
              const isSigned = document.signature_status === "signed";

              return (
                <div key={document.assignment_id} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">{document.document_name}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Status: {formatSignatureStatus(document.signature_status)}
                      </p>

                      {document.signature_instructions ? (
                        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                          {document.signature_instructions}
                        </p>
                      ) : null}

                      <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
                        <h3 className="text-sm font-semibold text-slate-950">Document Review</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Open and review the uploaded document before signing.
                        </p>

                        {document.file_url ? (
                          <button
                            type="button"
                            onClick={() => openDocumentFile(document)}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Document
                          </button>
                        ) : (
                          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            No uploaded document file is attached. Please contact staff before signing.
                          </p>
                        )}
                      </div>

                      {document.notes ? (
                        <p className="mt-3 text-sm leading-6 text-slate-600">{document.notes}</p>
                      ) : null}
                    </div>

                    {isSigned ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                        <CheckCircle2 className="h-4 w-4" />
                        Signed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 ring-1 ring-amber-600/20">
                        <FileSignature className="h-4 w-4" />
                        Signature Needed
                      </span>
                    )}
                  </div>

                  {isSigned ? (
                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                          <p className="font-semibold">Signed Record</p>
                          <p className="mt-1">
                            This document was electronically signed by {document.signed_by_name ?? "resident"}
                            {document.signed_at ? ` on ${formatDate(document.signed_at)}` : ""}.
                          </p>
                          <p className="mt-1 text-xs leading-5">
                            Signature method: electronic typed signature. This signed record is locked and cannot be edited from this link.
                          </p>

                          {document.file_url ? (
                            <button
                              type="button"
                              onClick={() => openDocumentFile(document)}
                              className="mt-4 inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View Signed Document
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 border-t pt-5">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">Typed electronic signature</span>
                        <input
                          type="text"
                          value={signatureNames[document.assignment_id] ?? ""}
                          onChange={(event) => updateSignatureName(document.assignment_id, event.target.value)}
                          placeholder="Type your full legal name"
                          className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                        />
                      </label>

                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        By typing your name and clicking Sign Document, you acknowledge this electronic signature as your signature for this document.
                      </p>

                      <button
                        type="button"
                        onClick={() => signDocument(document)}
                        disabled={signingAssignmentId === document.assignment_id}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {signingAssignmentId === document.assignment_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileSignature className="h-4 w-4" />
                        )}
                        {signingAssignmentId === document.assignment_id ? "Signing..." : "Sign Document"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {complete ? (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
            <div className="flex gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <div>
                <h2 className="font-semibold">All intake documents are signed.</h2>
                <p className="mt-1 text-sm leading-6">
                  Thank you. Your program staff can now see the completed signatures in your resident record.
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
