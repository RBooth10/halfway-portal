"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  FileClock,
  FolderOpen,
  Home,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

type AuditLogRow = {
  id: string;
  provider_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
};

function formatAction(action: string) {
  return action
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function previewJson(value: Record<string, unknown> | null) {
  if (!value) return "No values recorded.";

  const entries = Object.entries(value)
    .filter(([key]) => !["id", "provider_id", "created_at", "updated_at"].includes(key))
    .slice(0, 6);

  if (entries.length === 0) return "No preview values available.";

  return entries
    .map(([key, val]) => `${key}: ${String(val ?? "empty")}`)
    .join(" • ");
}

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
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3">
          <Icon className="h-6 w-6 text-slate-700" />
        </div>
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [providerName, setProviderName] = useState("Current Provider");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAuditLogs() {
      try {
        const supabase = getSupabaseClient();

        let activeProviderId = localStorage.getItem("current_provider_id");

        if (!activeProviderId) {
          const latestProviderResult = await supabase
            .from("providers")
            .select("id")
            .order("created_at", { ascending: false })
            .limit(1);

          activeProviderId = latestProviderResult.data?.[0]?.id as string | undefined;
        }

        if (!activeProviderId) {
          setError("No provider selected yet.");
          return;
        }

        localStorage.setItem("current_provider_id", activeProviderId);

        const providerResult = await supabase
          .from("providers")
          .select("legal_name")
          .eq("id", activeProviderId)
          .single();

        if (!providerResult.error && providerResult.data?.legal_name) {
          setProviderName(providerResult.data.legal_name);
        }

        const { data, error } = await supabase
          .from("audit_logs")
          .select("*")
          .eq("provider_id", activeProviderId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          throw error;
        }

        setAuditLogs((data ?? []) as AuditLogRow[]);
      } catch (err) {
        const auditError = err as { message?: unknown };
        setError(auditError?.message ? String(auditError.message) : "Could not load audit logs.");
      } finally {
        setLoading(false);
      }
    }

    loadAuditLogs();
  }, []);

  const updatedCount = auditLogs.filter((log) => log.action.includes("updated")).length;
  const archivedCount = auditLogs.filter((log) => log.action.includes("archived")).length;
  const touchedTables = new Set(auditLogs.map((log) => log.table_name)).size;

  return (
    <PageShell>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <Link
          href="/reports"
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          <FolderOpen className="h-4 w-4" />
          Reports
        </Link>
      </div>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
            <ClipboardList className="h-10 w-10 text-slate-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Compliance Trail</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Audit Log</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Review recent edits and archive actions for{" "}
              <span className="font-medium text-slate-950">{providerName}</span>. This page pulls
              directly from the Supabase audit log table.
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
            Loading audit logs...
          </div>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Audit Entries" value={String(auditLogs.length)} subtitle="Most recent 100 actions" icon={ClipboardList} />
        <MetricCard title="Updates" value={String(updatedCount)} subtitle="Edit actions recorded" icon={FileClock} />
        <MetricCard title="Archives" value={String(archivedCount)} subtitle="Archive actions recorded" icon={ShieldCheck} />
        <MetricCard title="Tables Touched" value={String(touchedTables)} subtitle="Areas with logged activity" icon={Home} />
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Recent Activity</h2>

        {!loading && auditLogs.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            No audit log entries yet. Edit or archive a house, staff profile, resident, or document to create an audit entry.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border bg-slate-50 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {formatAction(log.action)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Table: {log.table_name} • Record: {log.record_id ?? "Not recorded"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {log.reason ?? "No reason provided."}
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    {formatDate(log.created_at)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-xs lg:grid-cols-2">
                  <div className="rounded-xl bg-white p-3">
                    <p className="font-semibold text-slate-700">Before</p>
                    <p className="mt-2 leading-5 text-slate-500">{previewJson(log.old_values)}</p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="font-semibold text-slate-700">After</p>
                    <p className="mt-2 leading-5 text-slate-500">{previewJson(log.new_values)}</p>
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
