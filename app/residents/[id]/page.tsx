"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  FileSignature,
  FolderOpen,
  HeartHandshake,
  Home,
  Loader2,
  Pill,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

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

export default function ResidentProfilePage() {
  const params = useParams<{ id: string }>();
  const residentId = params.id;

  const [resident, setResident] = useState<ResidentDetail | null>(null);
  const [house, setHouse] = useState<HouseRow | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [providerName, setProviderName] = useState("Current Provider");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
      } catch (err) {
        const profileError = err as { message?: unknown };
        setError(profileError?.message ? String(profileError.message) : "Could not load resident profile.");
      } finally {
        setLoading(false);
      }
    }

    loadResidentProfile();
  }, [residentId]);

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
              This page will become the main resident record with notes, documents, UA/BA, medication,
              RCI, and discharge workflows.
            </p>
          </div>
        </div>
      </section>

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
            <MetricCard title="Medication" value={resident.medication_status} subtitle="Medication / MAT-MAR disclosure" icon={Pill} />
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
                  <DetailBlock title="RCI Status" value={resident.rci_status} />
                  <DetailBlock title="House" value={house?.name ?? "Not assigned"} />
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Admission Notes</h2>
                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {resident.notes || "No admission notes entered yet."}
                </p>
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
                    <p className="mt-1">Coming next.</p>
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
