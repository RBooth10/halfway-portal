import PageShell from "@/components/PageShell";

export default function PlaceholderPage() {
  return (
    <PageShell>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Pass Requests</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Pass Request Queue</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This page will hold resident pass requests, approval/denial workflows, follow-up requirements, and completion tracking.
        </p>
      </section>
    </PageShell>
  );
}
