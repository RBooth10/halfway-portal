"use client";

import type React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Home,
  Landmark,
  ReceiptText,
  Settings,
  ShieldCheck,
  Shuffle,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";
import { resolveActiveProviderId } from "@/lib/providerAccess";

type DashboardCounts = {
  providerName: string;
  houses: number;
  activeHouses: number;
  totalBeds: number;
  residents: number;
  activeResidents: number;
  dischargedResidents: number;
  staff: number;
  activeStaff: number;
  documents: number;
  uploadedDocuments: number;
  openMaintenance: number;
  unresolvedMaintenance: number;
  urgentMaintenance: number;
  pendingPassRequests: number;
  approvedPassRequests: number;
};

const initialCounts: DashboardCounts = {
  providerName: "Current Provider",
  houses: 0,
  activeHouses: 0,
  totalBeds: 0,
  residents: 0,
  activeResidents: 0,
  dischargedResidents: 0,
  staff: 0,
  activeStaff: 0,
  documents: 0,
  uploadedDocuments: 0,
  openMaintenance: 0,
  unresolvedMaintenance: 0,
  urgentMaintenance: 0,
  pendingPassRequests: 0,
  approvedPassRequests: 0,
};

type IconComponent = React.ComponentType<{ className?: string }>;

function getDashboardSupabase() {
  return getSupabaseClient() as unknown as SupabaseClient;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  tone = "default",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: IconComponent;
  href?: string;
  tone?: "default" | "attention";
}) {
  const content = (
    <div
      className={`flex h-full min-h-32 flex-col rounded-2xl border bg-white p-5 shadow-sm transition ${
        href ? "hover:-translate-y-0.5 hover:shadow-md" : ""
      } ${tone === "attention" ? "border-amber-200 bg-amber-50/40" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tone === "attention" ? "bg-amber-100" : "bg-slate-100"}`}>
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </div>
  );

  if (!href) return content;

  return <Link href={href} className="block h-full">{content}</Link>;
}

function ActionCard({
  title,
  subtitle,
  href,
  icon: Icon,
  label = "Open",
}: {
  title: string;
  subtitle: string;
  href: string;
  icon: IconComponent;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 transition group-hover:bg-slate-200">
            <Icon className="h-5 w-5 text-slate-700" />
          </div>

          <div>
            <p className="font-semibold text-slate-950">{title}</p>
            <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
          </div>
        </div>

        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-950">{label}</p>
    </Link>
  );
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
        const { providerId: activeProviderId } = await resolveActiveProviderId(supabase);

        if (!activeProviderId) {
          setCounts(initialCounts);
          return;
        }

        const providerResult = await supabase
          .from("providers")
          .select("legal_name")
          .eq("id", activeProviderId)
          .single();

        const housesResult = await supabase
          .from("houses")
          .select("id, status, total_beds")
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

        const maintenanceResult = await supabase
          .from("resident_maintenance_requests")
          .select("id, status, priority")
          .eq("provider_id", activeProviderId);

        const passRequestsResult = await supabase
          .from("resident_pass_requests")
          .select("id, status")
          .eq("provider_id", activeProviderId);

        if (providerResult.error) throw providerResult.error;
        if (housesResult.error) throw housesResult.error;
        if (residentsResult.error) throw residentsResult.error;
        if (staffResult.error) throw staffResult.error;
        if (documentsResult.error) throw documentsResult.error;
        if (maintenanceResult.error) throw maintenanceResult.error;
        if (passRequestsResult.error) throw passRequestsResult.error;

        const houses = housesResult.data ?? [];
        const activeHouses = houses.filter(
          (house) => String(house.status ?? "active").toLowerCase() !== "inactive"
        );
        const residents = residentsResult.data ?? [];
        const staff = staffResult.data ?? [];
        const documents = documentsResult.data ?? [];
        const maintenance = maintenanceResult.data ?? [];
        const passRequests = passRequestsResult.data ?? [];

        setCounts({
          providerName: providerResult.data?.legal_name ?? "Current Provider",
          houses: activeHouses.length,
          activeHouses: activeHouses.length,
          totalBeds: activeHouses.reduce((sum, house) => sum + Number(house.total_beds || 0), 0),
          residents: residents.length,
          activeResidents: residents.filter((resident) => resident.resident_status === "active").length,
          dischargedResidents: residents.filter((resident) => resident.resident_status === "discharged").length,
          staff: staff.length,
          activeStaff: staff.filter((person) => person.status !== "inactive").length,
          documents: documents.length,
          uploadedDocuments: documents.filter((document) => document.status === "uploaded").length,
          openMaintenance: maintenance.filter((request) => request.status === "open").length,
          unresolvedMaintenance: maintenance.filter(
            (request) => request.status !== "completed" && request.status !== "cancelled"
          ).length,
          urgentMaintenance: maintenance.filter(
            (request) =>
              request.priority === "urgent" &&
              request.status !== "completed" &&
              request.status !== "cancelled"
          ).length,
          pendingPassRequests: passRequests.filter((request) => request.status === "pending").length,
          approvedPassRequests: passRequests.filter((request) => request.status === "approved").length,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load dashboard.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  const occupancyPercent = useMemo(() => {
    if (counts.totalBeds <= 0) return 0;
    return Math.round((counts.activeResidents / counts.totalBeds) * 100);
  }, [counts.activeResidents, counts.totalBeds]);

  const needsAttention = [
    {
      title: "Pending Pass Requests",
      value: String(counts.pendingPassRequests),
      subtitle: "Requests waiting for staff review",
      href: "/pass-requests",
      icon: ClipboardCheck,
      show: counts.pendingPassRequests > 0,
    },
    {
      title: "Maintenance Needs",
      value: String(counts.unresolvedMaintenance),
      subtitle: `${counts.openMaintenance} open • ${counts.urgentMaintenance} urgent`,
      href: "/maintenance",
      icon: Wrench,
      show: counts.unresolvedMaintenance > 0,
    },
    {
      title: "Approved Passes",
      value: String(counts.approvedPassRequests),
      subtitle: "Approved passes awaiting completion",
      href: "/pass-requests",
      icon: CalendarDays,
      show: counts.approvedPassRequests > 0,
    },
  ];

  const activeAttentionItems = needsAttention.filter((item) => item.show);

  const primaryActions = [
    {
      title: "Residents",
      subtitle: "Manage resident profiles, fees, notes, RCI, documents, and discharge records.",
      href: "/residents",
      icon: Users,
      label: "Open residents",
    },
    {
      title: "Houses",
      subtitle: "Review houses, occupancy, bed counts, and house-level details.",
      href: "/houses",
      icon: Home,
      label: "Open houses",
    },
    {
      title: "Fees",
      subtitle: "View the unified fee ledger for charges, payments, and balances.",
      href: "/fees",
      icon: ReceiptText,
      label: "Open fee ledger",
    },
    {
      title: "Documents",
      subtitle: "Manage packet documents, assignments, uploads, and signatures.",
      href: "/documents",
      icon: FileText,
      label: "Open documents",
    },
  ];

  const operationsActions = [
    {
      title: "Maintenance",
      subtitle: "Track maintenance requests, staff follow-up, and completion status.",
      href: "/maintenance",
      icon: Wrench,
      label: "Open maintenance",
    },
    {
      title: "Pass Requests",
      subtitle: "Review pending passes and approved/completed pass history.",
      href: "/pass-requests",
      icon: ClipboardCheck,
      label: "Open pass requests",
    },
    {
      title: "UA Randomizer",
      subtitle: "Review rolling UA schedule coverage and scheduled UA items.",
      href: "/ua-randomizer",
      icon: Shuffle,
      label: "Open UA randomizer",
    },
    {
      title: "Meeting Minutes",
      subtitle: "Create and review weekly house and monthly staff/QI meeting minutes.",
      href: "/meeting-minutes",
      icon: ClipboardList,
      label: "Open meeting minutes",
    },
  ];

  const recordsActions = [
    {
      title: "Compliance Reports",
      subtitle: "Create and review required compliance reports.",
      href: "/reports",
      icon: Landmark,
      label: "Open compliance reports",
    },
    {
      title: "Data / Analytics",
      subtitle: "Review demographics, DOC/court involvement, discharges, and length of stay.",
      href: "/data-analytics",
      icon: BarChart3,
      label: "Open data",
    },
    {
      title: "Provider Setup",
      subtitle: "Update provider profile, program details, and phase settings.",
      href: "/onboarding",
      icon: Settings,
      label: "Open setup",
    },
    {
      title: "Staff",
      subtitle: "Manage staff profiles, roles, and access.",
      href: "/staff",
      icon: ShieldCheck,
      label: "Open staff",
    },
  ];

  return (
    <PageShell>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Dashboard</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Recovery Residence Command Center
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Use this dashboard to monitor occupancy, resident activity, operational requests, compliance tasks, and core program workflows.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Provider: {counts.providerName}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {loading ? "Loading dashboard..." : `${counts.activeResidents} active residents`}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Occupancy"
          value={`${occupancyPercent}%`}
          subtitle={`${counts.activeResidents} active residents / ${counts.totalBeds} total beds`}
          icon={Home}
          href="/houses"
        />
        <MetricCard
          title="Active Residents"
          value={String(counts.activeResidents)}
          subtitle="Currently admitted residents"
          icon={Users}
          href="/residents"
        />
        <MetricCard
          title="Active Houses"
          value={String(counts.activeHouses)}
          subtitle={`${counts.totalBeds} total beds across active houses`}
          icon={ShieldCheck}
          href="/houses"
        />
        <MetricCard
          title="Documents"
          value={String(counts.documents)}
          subtitle={`${counts.uploadedDocuments} uploaded records`}
          icon={FileText}
          href="/documents"
        />
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Needs Attention</h2>
            <p className="mt-1 text-sm text-slate-500">
              Operational items that may need staff review.
            </p>
          </div>
        </div>

        {activeAttentionItems.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
            No unresolved maintenance, pending passes, or approved passes waiting for completion.
          </div>
        ) : (
          <div className="mt-5 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
            {activeAttentionItems.map((item) => (
              <MetricCard
                key={item.title}
                title={item.title}
                value={item.value}
                subtitle={item.subtitle}
                href={item.href}
                icon={item.icon}
                tone="attention"
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Core Workflows</h2>
        <p className="mt-1 text-sm text-slate-500">
          Start with residents, houses, fees, and documents for daily program management.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {primaryActions.map((action) => (
            <ActionCard key={action.href} {...action} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Operations</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage resident requests, house operations, and scheduled testing workflows.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {operationsActions.map((action) => (
            <ActionCard key={action.href} {...action} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Records, Compliance, and Administration</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review compliance records, program data, staff access, and provider setup.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {recordsActions.map((action) => (
            <ActionCard key={action.href} {...action} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
