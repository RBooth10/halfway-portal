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

export default function ResidentProfilePage() {
  const params = useParams<{ id: string }>();
  const residentId = params.id;

  const [resident, setResident] = useState<ResidentDetail | null>(null);
  const [house, setHouse] = useState<HouseRow | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [progressNotes, setProgressNotes] = useState<ProgressNoteRow[]>([]);
  const [providerName, setProviderName] = useState("Current Provider");
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
        .eq("resident_id", residentId)
        .order("created_at", { ascending: false });

      if (!documentsResult.error) {
        setDocuments((documentsResult.data ?? []) as DocumentRow[]);
      }

      const notesResult = await supabase
        .from("progress_notes")
        .select("*")
        .eq("resident_id", residentId)
        .order("created_at", { ascending: false });

      if (notesResult.error) {
        throw notesResult.error;
      }

      setProgressNotes((notesResult.data ?? []) as ProgressNoteRow[]);
    } catch (err) {
      const profileError = err as { message?: unknown };
      setError(profileError?.message ? String(profileError.message) : "Could not load resident profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResidentProfile();
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
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Resident Status" value={resident.resident_status} subtitle="Current profile status" icon={ShieldCheck} />
            <MetricCard title="Assigned House" value={house?.name ?? "Not assigned"} subtitle="Current house placement" icon={Home} />
            <MetricCard title="File Status" value={resident.file_status} subtitle="Onboarding packet status" icon={FileSignature} />
            <MetricCard title="Progress Notes" value={String(progressNotes.length)} subtitle="Saved internal notes" icon={MessageSquarePlus} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
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

              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Admission Notes</h2>
                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {resident.notes || "No admission notes entered yet."}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-6 shadow-sm">
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

              <div className="rounded-2xl border bg-white p-6 shadow-sm">
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

            <aside className="space-y-4">
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
                    <p className="mt-1">Future workflow for drug screen and breathalyzer tracking.</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 font-medium text-slate-950">
                      <Pill className="h-4 w-4" />
                      Medication / MAT-MAR
                    </div>
                    <p className="mt-1">Future workflow for medication status and policy compliance.</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 font-medium text-slate-950">
                      <HeartHandshake className="h-4 w-4" />
                      RCI / Recovery Plan
                    </div>
                    <p className="mt-1">Future workflow for RCI and recovery planning.</p>
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
