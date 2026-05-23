"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BedDouble,
  Building2,
  CheckCircle2,
  FileText,
  Home,
  Loader2,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

type DashboardCounts = {
  providerName: string;
  houses: number;
  beds: number;
  staff: number;
  residents: number;
  assignedResidents: number;
  documents: number;
  uploadedDocuments: number;
};

const emptyCounts: DashboardCounts = {
  providerName: "Current Provider",
  houses: 0,
  beds: 0,
  staff: 0,
  residents: 0,
  assignedResidents: 0,
  documents: 0,
  uploadedDocuments: 0,
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

function SetupStep({
  title,
  description,
  href,
  icon: Icon,
  complete,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  complete: boolean;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-xl bg-slate-100 p-2">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>

        <span
          className={
            complete
              ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20"
              : "inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20"
          }
        >
          {complete ? "Started" : "Pending"}
        </span>
      </div>

      <h3 className="mt-4 font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

      <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
        Open section
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function getReadinessScore(counts: DashboardCounts) {
  const checks = [
    counts.providerName !== "Current Provider",
    counts.houses > 0,
    counts.beds > 0,
    counts.staff > 0,
    counts.residents > 0,
    counts.assignedResidents > 0,
    counts.documents > 0,
    counts.uploadedDocuments > 0,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts>(emptyCounts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
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
          setCounts(emptyCounts);
          return;
        }

        localStorage.setItem("current_provider_id", activeProviderId);

        const providerResult = await supabase
          .from("providers")
          .select("legal_name")
          .eq("id", activeProviderId)
          .single();

        const housesResult = await supabase
          .from("houses")
          .select("id, total_beds")
          .eq("provider_id", activeProviderId);

        const staffResult = await supabase
          .from("staff_profiles")
          .select("id")
          .eq("provider_id", activeProviderId);

        const residentsResult = await supabase
          .from("residents")
          .select("id, house_id")
          .eq("provider_id", activeProviderId);

        const documentsResult = await supabase
          .from("documents")
          .select("id, status")
          .eq("provider_id", activeProviderId);

        if (providerResult.error) throw providerResult.error;
        if (housesResult.error) throw housesResult.error;
        if (staffResult.error) throw staffResult.error;
        if (residentsResult.error) throw residentsResult.error;
        if (documentsResult.error) throw documentsResult.error;

        const houses = housesResult.data ?? [];
        const staff = staffResult.data ?? [];
        const residents = residentsResult.data ?? [];
        const documents = documentsResult.data ?? [];

        setCounts({
          providerName: providerResult.data?.legal_name ?? "Current Provider",
          houses: houses.length,
          beds: houses.reduce((sum, house) => sum + Number(house.total_beds || 0), 0),
          staff: staff.length,
          residents: residents.length,
          assignedResidents: residents.filter((resident) => Boolean(resident.house_id)).length,
          documents: documents.length,
          uploadedDocuments: documents.filter((document) => document.status === "uploaded").length,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load dashboard.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const readinessScore = getReadinessScore(counts);

  const setupSteps = [
    {
      title: "Provider Profile",
      description: "Create the recovery residence provider profile.",
      href: "/onboarding",
      icon: Building2,
      complete: counts.providerName !== "Current Provider",
    },
    {
      title: "Houses",
      description: "Add house records, addresses, levels, and bed counts.",
      href: "/houses",
      icon: Home,
      complete: counts.houses > 0,
    },
    {
      title: "Staff & Roles",
      description: "Invite staff and begin assigning access levels.",
      href: "/staff",
      icon: UserCog,
      complete: counts.staff > 0,
    },
    {
      title: "Residents",
      description: "Add residents and assign them to houses.",
      href: "/residents",
      icon: Users,
      complete: counts.residents > 0,
    },
    {
      title: "Documents",
      description: "Start provider, house, resident, and staff document records.",
      href: "/documents",
      icon: FileText,
      complete: counts.documents > 0,
    },
    {
      title: "Reports",
      description: "Review setup progress and readiness calculations.",
      href: "/reports",
      icon: BarChart3,
      complete: readinessScore > 0,
    },
  ];

  const openItems = setupSteps.filter((step) => !step.complete).length;

  return (
    <PageShell>
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
              <ShieldCheck className="h-10 w-10 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Provider Dashboard</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                Recovery Residence Compliance Portal
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Current provider:{" "}
                <span className="font-medium text-slate-950">{counts.providerName}</span>. This dashboard now pulls saved setup records from Supabase.
              </p>
            </div>
          </div>

          <Link
            href="/reports"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            View Readiness Report
            <ArrowRight className="h-4 w-4" />
          </Link>
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
            Loading dashboard data...
          </div>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Houses" value={String(counts.houses)} subtitle={`${counts.beds} total beds`} icon={Home} />
        <MetricCard title="Staff" value={String(counts.staff)} subtitle="Saved staff profiles" icon={UserCog} />
        <MetricCard title="Residents" value={String(counts.residents)} subtitle={`${counts.assignedResidents} assigned to houses`} icon={Users} />
        <MetricCard title="Readiness" value={`${readinessScore}%`} subtitle={`${openItems} setup sections pending`} icon={ShieldCheck} />
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Setup Progress</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Complete each setup area to prepare the provider for compliance tracking and reporting.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-slate-950">
              {openItems === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              {openItems === 0 ? "Setup started across all sections" : `${openItems} sections still pending`}
            </div>
            <p className="mt-1 text-slate-500">Readiness score: {readinessScore}%</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {setupSteps.map((step) => (
            <SetupStep key={step.title} {...step} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Current Setup Snapshot</h2>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <p className="rounded-2xl bg-slate-50 p-4">Provider: {counts.providerName}</p>
            <p className="rounded-2xl bg-slate-50 p-4">Houses: {counts.houses}</p>
            <p className="rounded-2xl bg-slate-50 p-4">Beds: {counts.beds}</p>
            <p className="rounded-2xl bg-slate-50 p-4">Staff: {counts.staff}</p>
            <p className="rounded-2xl bg-slate-50 p-4">Residents: {counts.residents}</p>
            <p className="rounded-2xl bg-slate-50 p-4">Documents: {counts.documents}</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Next Priority</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            {setupSteps
              .filter((step) => !step.complete)
              .slice(0, 3)
              .map((step) => (
                <Link key={step.title} href={step.href} className="block rounded-2xl bg-slate-50 p-4 hover:bg-slate-100">
                  <span className="font-medium text-slate-950">{step.title}</span>
                  <br />
                  {step.description}
                </Link>
              ))}

            {openItems === 0 && (
              <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                All core setup sections have been started. Continue building detailed workflows next.
              </div>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
