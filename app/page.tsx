"use client";

import type React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  FileText,
  Home,
  Loader2,
  ShieldCheck,
  Shuffle,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

type DashboardCounts = {
  providerName: string;
  houses: number;
  activeHouses: number;
  residents: number;
  activeResidents: number;
  staff: number;
  activeStaff: number;
  documents: number;
  uploadedDocuments: number;
};

const initialCounts: DashboardCounts = {
  providerName: "Current Provider",
  houses: 0,
  activeHouses: 0,
  residents: 0,
  activeResidents: 0,
  staff: 0,
  activeStaff: 0,
  documents: 0,
  uploadedDocuments: 0,
};

type IconComponent = React.ComponentType<{ className?: string }>;

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: IconComponent;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  subtitle,
  cta,
  href,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  cta: string;
  href: string;
  icon: IconComponent;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-40 flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 transition group-hover:bg-slate-200">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" />
      </div>

      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
        <p className="mt-3 text-sm font-semibold text-slate-950">{cta}</p>
      </div>
    </Link>
  );
}

function getDashboardSupabase() {
  return getSupabaseClient() as unknown as SupabaseClient;
}
export default function DashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts>(initialCounts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const supabase = getDashboardSupabase();
        let activeProviderId = localStorage.getItem("current_provider_id");

        if (!activeProviderId) {
          const latestProviderResult = await supabase
            .from("providers")
            .select("id")
            .order("created_at", { ascending: false })
            .limit(1);

activeProviderId = latestProviderResult.data?.[0]?.id ?? null;
        }

        if (!activeProviderId) {
          setCounts(initialCounts);
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
          .select("id, status")
          .eq("provider_id", activeProviderId);

        const residentsResult = await supabase
          .from("residents")
          .select("id, resident_status")
          .eq("provider_id", activeProviderId);

        const staffResult = await supabase
          .from("staff_profiles")
          .select("id, status")
          .eq("provider_id", activeProviderId);

        const documentsResult = await supabase
          .from("documents")
          .select("id, status")
          .eq("provider_id", activeProviderId);

        if (providerResult.error) throw providerResult.error;
        if (housesResult.error) throw housesResult.error;
        if (residentsResult.error) throw residentsResult.error;
        if (staffResult.error) throw staffResult.error;
        if (documentsResult.error) throw documentsResult.error;

        const houses = housesResult.data ?? [];
        const residents = residentsResult.data ?? [];
        const staff = staffResult.data ?? [];
        const documents = documentsResult.data ?? [];

        setCounts({
          providerName: providerResult.data?.legal_name ?? "Current Provider",
          houses: houses.length,
          activeHouses: houses.filter((house) => house.status !== "inactive").length,
          residents: residents.length,
          activeResidents: residents.filter((resident) => resident.resident_status === "active").length,
          staff: staff.length,
          activeStaff: staff.filter((person) => person.status !== "inactive").length,
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

  const dashboardCards = useMemo(
    () => [
      {
        title: "Edit Provider Profile",
        value: counts.providerName === "Current Provider" ? "Setup" : "Open",
        subtitle:
          counts.providerName === "Current Provider"
            ? "Create the provider profile."
            : counts.providerName,
        cta: counts.providerName === "Current Provider" ? "Create provider profile" : "Update provider profile",
        href: "/onboarding",
        icon: UserRound,
      },
      {
        title: "Houses",
        value: String(counts.houses),
        subtitle: counts.houses ? `${counts.activeHouses} active house(s)` : "No houses created yet.",
        cta: counts.houses ? "Manage houses" : "Create your house",
        href: "/houses",
        icon: Home,
      },
      {
        title: "Residents",
        value: String(counts.residents),
        subtitle: counts.residents ? `${counts.activeResidents} active resident(s)` : "No residents added yet.",
        cta: counts.residents ? "Manage residents" : "Add residents",
        href: "/residents",
        icon: Users,
      },
      {
        title: "Staff",
        value: String(counts.staff),
        subtitle: counts.staff ? `${counts.activeStaff} active staff member(s)` : "No staff profiles added yet.",
        cta: counts.staff ? "Manage staff" : "Onboard staff",
        href: "/staff",
        icon: ShieldCheck,
      },
      {
        title: "Documents",
        value: String(counts.documents),
        subtitle: counts.documents ? `${counts.uploadedDocuments} uploaded file(s)` : "No document records yet.",
        cta: counts.documents ? "Manage documents" : "Add documents",
        href: "/documents",
        icon: FileText,
      },
      {
        title: "Rolling UA Schedule",
        value: "Open",
        subtitle: "Generate and review scheduled UA/BA testing.",
        cta: "Open UA schedule",
        href: "/ua-randomizer",
        icon: Shuffle,
      },
      {
        title: "Reports",
        value: "Review",
        subtitle: "View provider-level compliance and activity snapshots.",
        cta: "Open reports",
        href: "/reports",
        icon: BarChart3,
      },
    ],
    [counts],
  );

  const savedRecordCount = counts.houses + counts.residents + counts.staff + counts.documents;

  return (
    <PageShell>
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
              <Building2 className="h-7 w-7 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Provider Dashboard</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Halfway Portal</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Current provider: <span className="font-medium text-slate-950">{counts.providerName}</span>. Use the cards below to open each workflow and continue setup or daily operations.
              </p>
            </div>
          </div>

          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
          >
            Edit Provider Profile
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" />
          <p className="mt-3 text-sm text-slate-500">Loading dashboard...</p>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Saved Records"
              value={String(savedRecordCount)}
              subtitle="Houses, residents, staff, documents"
              icon={CheckCircle2}
            />
            <StatCard
              title="Active Houses"
              value={String(counts.activeHouses)}
              subtitle={`${counts.houses} total house record(s)`}
              icon={Home}
            />
            <StatCard
              title="Active Residents"
              value={String(counts.activeResidents)}
              subtitle={`${counts.residents} total resident record(s)`}
              icon={Users}
            />
            <StatCard
              title="Uploaded Documents"
              value={String(counts.uploadedDocuments)}
              subtitle={`${counts.documents} total document record(s)`}
              icon={FileText}
            />
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Workflows</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Smaller clickable cards replace the former setup progress checklist.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {dashboardCards.map((card) => (
                <DashboardCard key={card.title} {...card} />
              ))}
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}
