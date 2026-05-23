import {
  ArrowLeft,
  Building2,
  Home,
  Mail,
  Phone,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";

const certificationOptions = [
  "Not certified yet",
  "Preparing for FARR certification",
  "FARR certified",
  "NARR affiliate certified",
  "Other",
];

export default function ProviderOnboardingPage() {
  return (
    <PageShell maxWidth="max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
              <Building2 className="h-10 w-10 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Provider Onboarding</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                Add a Recovery Residence Provider
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Use this setup page to collect the organization profile before adding houses,
                staff, residents, documents, and compliance workflows.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <form className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Organization Information</h2>
            <p className="mt-1 text-sm text-slate-500">
              This information creates the provider profile for the portal.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Legal business name" placeholder="Example Recovery Housing LLC" icon={Building2} />
              <Field label="DBA / program name" placeholder="Example Recovery Homes" icon={Home} />
              <Field label="Primary contact name" placeholder="Full name" icon={UserPlus} />
              <Field label="Primary contact email" placeholder="email@example.com" icon={Mail} />
              <Field label="Phone number" placeholder="(555) 000-0000" icon={Phone} />
              <Field label="Website" placeholder="www.example.com" icon={ShieldCheck} />

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Certification status
                </span>
                <select className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4">
                  {certificationOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Number of houses
                </span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Total bed count
                </span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  MAT/MAR access statement
                </span>
                <textarea
                  placeholder="Describe how the provider supports residents prescribed MAT/MAR."
                  className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save Provider Profile
              </button>
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Save Draft
              </button>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">After this step</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p className="rounded-2xl bg-slate-50 p-4">Add houses and bed counts.</p>
                <p className="rounded-2xl bg-slate-50 p-4">Invite staff and assign roles.</p>
                <p className="rounded-2xl bg-slate-50 p-4">Upload provider policies and compliance documents.</p>
                <p className="rounded-2xl bg-slate-50 p-4">Start resident onboarding.</p>
              </div>

              <Link
                href="/houses"
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Continue to House Setup
              </Link>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Access model</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Each provider should only see its own houses, residents, staff, documents,
                UA/BA records, incidents, grievances, and reports.
              </p>
            </div>
          </aside>
        </section>
    </PageShell>
  );
}

function Field({
  label,
  placeholder,
  icon: Icon,
}: {
  label: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="relative mt-2">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
        />
      </div>
    </label>
  );
}
