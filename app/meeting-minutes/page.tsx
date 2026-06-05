import PageShell from "@/components/PageShell";

export default function PlaceholderPage() {
  return (
    <PageShell>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Meeting Minutes</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Meeting Minutes</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This page will hold Weekly House Meeting Minutes and Monthly Staff/QI Meeting Minutes.
        </p>
      </section>
    </PageShell>
  );
}
