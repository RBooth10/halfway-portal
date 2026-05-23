"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Download,
  FolderOpen,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

type Counts = {
  providerName: string;
  houses: number;
  beds: number;
  staff: number;
  residents: number;
  assignedResidents: number;
  documents: number;
  uploadedDocuments: number;
  providerDocuments: number;
  houseDocuments: number;
  residentDocuments: number;
  staffDocuments: number;
  goodNeighborDocuments: number;
};

const emptyCounts: Counts = {
  providerName: "Current Provider",
  houses: 0,
  beds: 0,
  staff: 0,
  residents: 0,
  assignedResidents: 0,
  documents: 0,
  uploadedDocuments: 0,
  providerDocuments: 0,
  houseDocuments: 0,
  residentDocuments: 0,
  staffDocuments: 0,
  goodNeighborDocuments: 0,
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

function ReadinessCard({
  title,
  score,
  items,
}: {
  title: string;
  score: number;
  items: { label: string; complete: boolean }[];
}) {
  const status = score >= 85 ? "Ready" : score >= 40 ? "Needs Review" : "Setup Needed";

  const statusStyle =
    status === "Ready"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      : status === "Needs Review"
        ? "bg-amber-50 text-amber-700 ring-amber-600/20"
        : "bg-rose-50 text-rose-700 ring-rose-600/20";

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Calculated from the records currently saved in Supabase.
          </p>
        </div>

        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusStyle}`}>
          {status}
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Completion</span>
          <span className="font-semibold text-slate-950">{score}%</span>
        </div>
        <div className="mt-2 h-3 rounded-full bg-slate-100">
          <div className="h-3 rounded-full bg-slate-950" style={{ width: `${score}%` }} />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            {item.complete ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function score(items: { complete: boolean }[]) {
  if (items.length === 0) return 0;
  return Math.round((items.filter((item) => item.complete).length / items.length) * 100);
}

export default function ReportsPage() {
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReports() {
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
          setError("No provider selected yet. Go to Provider Onboarding first and save a provider profile.");
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
          .select("id, category, compliance_domain, status")
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
          uploadedDocuments: documents.filter((doc) => doc.status === "uploaded").length,
          providerDocuments: documents.filter((doc) => doc.category === "Provider").length,
          houseDocuments: documents.filter((doc) => doc.category === "House").length,
          residentDocuments: documents.filter((doc) => doc.category === "Resident").length,
          staffDocuments: documents.filter((doc) => doc.category === "Staff").length,
          goodNeighborDocuments: documents.filter((doc) => doc.compliance_domain === "Good Neighbor").length,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load reports.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  const adminItems = [
    { label: "Provider profile created", complete: counts.providerName !== "Current Provider" },
    { label: "At least one staff profile added", complete: counts.staff > 0 },
    { label: "Provider document records started", complete: counts.providerDocuments > 0 },
    { label: "At least one document marked uploaded", complete: counts.uploadedDocuments > 0 },
  ];

  const physicalItems = [
    { label: "At least one house added", complete: counts.houses > 0 },
    { label: "Bed count entered", complete: counts.beds > 0 },
    { label: "House document records started", complete: counts.houseDocuments > 0 },
  ];

  const recoveryItems = [
    { label: "At least one resident added", complete: counts.residents > 0 },
    { label: "Resident assigned to a house", complete: counts.assignedResidents > 0 },
    { label: "Resident document records started", complete: counts.residentDocuments > 0 },
  ];

  const neighborItems = [
    { label: "Good Neighbor document records started", complete: counts.goodNeighborDocuments > 0 },
    { label: "House records created", complete: counts.houses > 0 },
    { label: "Resident records created", complete: counts.residents > 0 },
  ];

  const overallScore = Math.round(
    (score(adminItems) + score(physicalItems) + score(recoveryItems) + score(neighborItems)) / 4
  );

  const openItems = [...adminItems, ...physicalItems, ...recoveryItems, ...neighborItems].filter(
    (item) => !item.complete
  ).length;

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
          href="/documents"
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          <FolderOpen className="h-4 w-4" />
          Documents
        </Link>
      </div>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
              <BarChart3 className="h-10 w-10 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Provider Readiness</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Reports</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Review setup progress and missing compliance items for{" "}
                <span className="font-medium text-slate-950">{counts.providerName}</span>.
              </p>
            </div>
          </div>

          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            <Download className="h-4 w-4" />
            Export Readiness Report
          </button>
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
            Loading readiness data...
          </div>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Provider Readiness" value={`${overallScore}%`} subtitle="Calculated from setup data" icon={ShieldCheck} />
        <MetricCard title="Open Setup Items" value={String(openItems)} subtitle="Incomplete readiness checks" icon={AlertTriangle} />
        <MetricCard title="Saved Records" value={String(counts.houses + counts.staff + counts.residents + counts.documents)} subtitle="Houses, staff, residents, documents" icon={BarChart3} />
        <MetricCard title="Documents" value={String(counts.documents)} subtitle={`${counts.uploadedDocuments} marked uploaded`} icon={FolderOpen} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ReadinessCard title="Administrative Operations" score={score(adminItems)} items={adminItems} />
        <ReadinessCard title="Physical Environment" score={score(physicalItems)} items={physicalItems} />
        <ReadinessCard title="Recovery Support" score={score(recoveryItems)} items={recoveryItems} />
        <ReadinessCard title="Good Neighbor" score={score(neighborItems)} items={neighborItems} />
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Current Setup Snapshot</h2>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <p className="rounded-2xl bg-slate-50 p-4">Houses: {counts.houses}</p>
          <p className="rounded-2xl bg-slate-50 p-4">Beds: {counts.beds}</p>
          <p className="rounded-2xl bg-slate-50 p-4">Staff: {counts.staff}</p>
          <p className="rounded-2xl bg-slate-50 p-4">Residents: {counts.residents}</p>
          <p className="rounded-2xl bg-slate-50 p-4">Assigned residents: {counts.assignedResidents}</p>
          <p className="rounded-2xl bg-slate-50 p-4">Documents: {counts.documents}</p>
          <p className="rounded-2xl bg-slate-50 p-4">Provider docs: {counts.providerDocuments}</p>
          <p className="rounded-2xl bg-slate-50 p-4">House docs: {counts.houseDocuments}</p>
        </div>
      </section>
    </PageShell>
  );
}
