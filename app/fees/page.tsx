"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Loader2,
  ReceiptText,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

type ProviderRow = {
  id: string;
  legal_name?: string | null;
  provider_name?: string | null;
  business_name?: string | null;
  name?: string | null;
};

type HouseRow = {
  id: string;
  name: string;
  status: string | null;
};

type ResidentRow = {
  id: string;
  first_name: string;
  last_name: string;
  house_id: string | null;
  resident_status: string | null;
};

type ResidentFeeChargeRow = {
  id: string;
  provider_id: string;
  resident_id: string;
  house_id: string | null;
  charge_type: string;
  billing_frequency: string;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  amount: number | string | null;
  amount_paid: number | string | null;
  balance_due: number | string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const localDate = new Date(Number(year), Number(month) - 1, Number(day));

    return localDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "Not set";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function FeesPage() {
  const [providerId, setProviderId] = useState("");
  const [provider, setProvider] = useState<ProviderRow | null>(null);
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [feeCharges, setFeeCharges] = useState<ResidentFeeChargeRow[]>([]);

  const [feeHouseFilter, setFeeHouseFilter] = useState("all");
  const [feeResidentStatusFilter, setFeeResidentStatusFilter] = useState("active");
  const [feeChargeStatusFilter, setFeeChargeStatusFilter] = useState("open");
  const today = new Date().toISOString().slice(0, 10);
  const [feeDueStart, setFeeDueStart] = useState(today);
  const [feeDueEnd, setFeeDueEnd] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeHouses = useMemo(
    () => houses.filter((house) => String(house.status ?? "active").toLowerCase() !== "inactive"),
    [houses]
  );

  const filteredFeeCharges = useMemo(() => {
    return feeCharges
      .filter((charge) => {
        const resident = residents.find((item) => item.id === charge.resident_id);
        const residentStatus = String(resident?.resident_status ?? "active").toLowerCase();
        const residentHouseId = resident?.house_id ?? null;
        const dueDate = charge.due_date;

        const matchesHouse =
          feeHouseFilter === "all" ||
          charge.house_id === feeHouseFilter ||
          residentHouseId === feeHouseFilter;

        const matchesResidentStatus =
          feeResidentStatusFilter === "all" ||
          residentStatus === feeResidentStatusFilter;

        const matchesChargeStatus =
          feeChargeStatusFilter === "all" ||
          String(charge.status ?? "").toLowerCase() === feeChargeStatusFilter;

        const matchesStart = !feeDueStart || (dueDate && dueDate >= feeDueStart);
        const matchesEnd = !feeDueEnd || (dueDate && dueDate <= feeDueEnd);

        return matchesHouse && matchesResidentStatus && matchesChargeStatus && matchesStart && matchesEnd;
      })
      .sort((first, second) => {
        const firstDue = first.due_date ?? "9999-12-31";
        const secondDue = second.due_date ?? "9999-12-31";
        return firstDue.localeCompare(secondDue);
      });
  }, [feeCharges, residents, feeHouseFilter, feeResidentStatusFilter, feeChargeStatusFilter, feeDueStart, feeDueEnd]);

  const filteredFeeTotals = useMemo(
    () =>
      filteredFeeCharges.reduce(
        (totals, charge) => ({
          amount: totals.amount + Number(charge.amount || 0),
          paid: totals.paid + Number(charge.amount_paid || 0),
          balance: totals.balance + Number(charge.balance_due || 0),
        }),
        { amount: 0, paid: 0, balance: 0 }
      ),
    [filteredFeeCharges]
  );

  function getResidentName(residentId: string | null) {
    if (!residentId) return "Unknown resident";

    const resident = residents.find((item) => item.id === residentId);
    return resident ? `${resident.first_name} ${resident.last_name}` : "Unknown resident";
  }

  function getFeeHouseName(charge: ResidentFeeChargeRow) {
    const resident = residents.find((item) => item.id === charge.resident_id);
    const houseId = charge.house_id || resident?.house_id;

    if (!houseId) return "Not assigned";

    return houses.find((house) => house.id === houseId)?.name ?? "Unknown house";
  }

  function formatFeePeriod(charge: ResidentFeeChargeRow) {
    if (charge.period_start && charge.period_end) {
      return `${formatDate(charge.period_start)} - ${formatDate(charge.period_end)}`;
    }

    if (charge.period_start) {
      return formatDate(charge.period_start);
    }

    return "Not set";
  }

  async function loadFees(activeProviderId: string) {
    const supabase = getSupabaseClient() as any;

    const providerResult = await supabase
      .from("providers")
      .select("*")
      .eq("id", activeProviderId)
      .single();

    const housesResult = await supabase
      .from("houses")
      .select("id, name, status")
      .eq("provider_id", activeProviderId)
      .order("name", { ascending: true });

    const residentsResult = await supabase
      .from("residents")
      .select("id, first_name, last_name, house_id, resident_status")
      .eq("provider_id", activeProviderId)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    const feeChargesResult = await supabase
      .from("resident_fee_charges")
      .select("id, provider_id, resident_id, house_id, charge_type, billing_frequency, period_start, period_end, due_date, amount, amount_paid, balance_due, status, notes, created_at")
      .eq("provider_id", activeProviderId)
      .eq("status", "open")
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(500);

    if (providerResult.error) throw providerResult.error;
    if (housesResult.error) throw housesResult.error;
    if (residentsResult.error) throw residentsResult.error;
    if (feeChargesResult.error) throw feeChargesResult.error;

    setProvider(providerResult.data as ProviderRow);
    setHouses((housesResult.data ?? []) as HouseRow[]);
    setResidents((residentsResult.data ?? []) as ResidentRow[]);
    setFeeCharges((feeChargesResult.data ?? []) as ResidentFeeChargeRow[]);
  }

  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true);
        setError("");

        const supabase = getSupabaseClient() as any;
        const storedProviderId =
          typeof window !== "undefined" ? window.localStorage.getItem("activeProviderId") : null;

        let activeProviderId = storedProviderId || "";

        if (!activeProviderId) {
          const providerResult = await supabase
            .from("providers")
            .select("*")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (providerResult.error) throw providerResult.error;

          activeProviderId = providerResult.data?.id ?? "";

          if (activeProviderId && typeof window !== "undefined") {
            window.localStorage.setItem("activeProviderId", activeProviderId);
          }
        }

        if (!activeProviderId) {
          setError("No provider profile found. Create a provider before using fees.");
          return;
        }

        setProviderId(activeProviderId);
        await loadFees(activeProviderId);
      } catch (err) {
        const loadError = err as { message?: unknown };
        setError(loadError?.message ? String(loadError.message) : "Could not load fees.");
      } finally {
        setLoading(false);
      }
    }

    void loadInitial();
  }, []);

  function exportRollingFeeListCsv() {
    const headers = [
      "Resident",
      "House",
      "Charge Type",
      "Billing Frequency",
      "Period",
      "Due Date",
      "Amount",
      "Paid",
      "Balance",
      "Status",
      "Notes",
    ];

    const rows = filteredFeeCharges.map((charge) => [
      getResidentName(charge.resident_id),
      getFeeHouseName(charge),
      formatLabel(charge.charge_type),
      formatLabel(charge.billing_frequency),
      formatFeePeriod(charge),
      formatDate(charge.due_date),
      formatCurrency(charge.amount),
      formatCurrency(charge.amount_paid),
      formatCurrency(charge.balance_due),
      formatLabel(charge.status),
      charge.notes ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `rolling-fee-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <PageShell>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
              <ReceiptText className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Fees</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Rolling Fee List</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Filter and export resident fee charges across houses, residents, due dates, and charge statuses.
              </p>
              {provider ? (
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Provider: {provider.legal_name || provider.provider_name || provider.business_name || provider.name || "Provider"}
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={exportRollingFeeListCsv}
            disabled={filteredFeeCharges.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Export Rolling Fee List
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section id="rolling-fee-list-print" className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">House</span>
            <select
              value={feeHouseFilter}
              onChange={(event) => setFeeHouseFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            >
              <option value="all">All houses</option>
              {activeHouses.map((house) => (
                <option key={house.id} value={house.id}>
                  {house.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Resident status</span>
            <select
              value={feeResidentStatusFilter}
              onChange={(event) => setFeeResidentStatusFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            >
              <option value="active">Active residents</option>
              <option value="discharged">Discharged residents</option>
              <option value="all">All residents</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Charge status</span>
            <select
              value={feeChargeStatusFilter}
              onChange={(event) => setFeeChargeStatusFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            >
              <option value="open">Open</option>
              <option value="paid">Paid</option>
              <option value="all">All statuses</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Charged / Due start</span>
            <input
              type="date"
              value={feeDueStart}
              onChange={(event) => setFeeDueStart(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Charged / Due end</span>
            <input
              type="date"
              value={feeDueEnd}
              onChange={(event) => setFeeDueEnd(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Charges</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{formatCurrency(filteredFeeTotals.amount)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Paid</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{formatCurrency(filteredFeeTotals.paid)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Balance Due</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{formatCurrency(filteredFeeTotals.balance)}</p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading fee charges...
              </div>
            </div>
          ) : filteredFeeCharges.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              No fee charges match the selected filters.
            </div>
          ) : (
            <table className="min-w-full divide-y text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-semibold">Resident</th>
                  <th className="px-3 py-3 font-semibold">House</th>
                  <th className="px-3 py-3 font-semibold">Charge</th>
                  <th className="px-3 py-3 font-semibold">Period</th>
                  <th className="px-3 py-3 font-semibold">Due</th>
                  <th className="px-3 py-3 text-right font-semibold">Amount</th>
                  <th className="px-3 py-3 text-right font-semibold">Paid</th>
                  <th className="px-3 py-3 text-right font-semibold">Balance</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredFeeCharges.map((charge) => (
                  <tr key={charge.id} className="bg-white">
                    <td className="px-3 py-3 font-medium text-slate-950">{getResidentName(charge.resident_id)}</td>
                    <td className="px-3 py-3 text-slate-600">{getFeeHouseName(charge)}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {formatLabel(charge.charge_type)}
                      <span className="block text-xs text-slate-400">{formatLabel(charge.billing_frequency)}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{formatFeePeriod(charge)}</td>
                    <td className="px-3 py-3 text-slate-600">{formatDate(charge.due_date)}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{formatCurrency(charge.amount)}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{formatCurrency(charge.amount_paid)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-950">{formatCurrency(charge.balance_due)}</td>
                    <td className="px-3 py-3 text-slate-600">{formatLabel(charge.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </PageShell>
  );
}
