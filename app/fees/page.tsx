"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Loader2,
  ReceiptText,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";
import { resolveActiveProviderId } from "@/lib/providerAccess";

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

type ResidentPaymentRow = {
  id: string;
  provider_id: string;
  resident_id: string;
  fee_charge_id: string | null;
  payment_date: string;
  amount: number | string | null;
  payment_method: string;
  notes: string | null;
  created_at: string;
};

type FeeLedgerRow = {
  id: string;
  transaction_date: string;
  created_at: string;
  resident_id: string;
  resident_name: string;
  house_name: string;
  type: "charge" | "payment";
  description: string;
  charge_amount: number;
  payment_amount: number;
  balance_due: number | null;
  status: string;
  notes: string | null;
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

function getDateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

export default function FeesPage() {
  const [provider, setProvider] = useState<ProviderRow | null>(null);
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [feeCharges, setFeeCharges] = useState<ResidentFeeChargeRow[]>([]);
  const [payments, setPayments] = useState<ResidentPaymentRow[]>([]);

  const [houseFilter, setHouseFilter] = useState("all");
  const [residentFilter, setResidentFilter] = useState("all");
  const [residentStatusFilter, setResidentStatusFilter] = useState("active");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeHouses = useMemo(
    () => houses.filter((house) => String(house.status ?? "active").toLowerCase() !== "inactive"),
    [houses]
  );

  const visibleResidents = useMemo(() => {
    return residents
      .filter((resident) => {
        const status = String(resident.resident_status ?? "active").toLowerCase();

        return residentStatusFilter === "all" || status === residentStatusFilter;
      })
      .sort((first, second) => {
        const firstName = `${first.last_name} ${first.first_name}`;
        const secondName = `${second.last_name} ${second.first_name}`;
        return firstName.localeCompare(secondName);
      });
  }, [residents, residentStatusFilter]);

  const getResident = useCallback(
    (residentId: string | null) => {
      if (!residentId) return null;
      return residents.find((resident) => resident.id === residentId) ?? null;
    },
    [residents]
  );

  const getResidentName = useCallback(
    (residentId: string | null) => {
      const resident = getResident(residentId);
      return resident ? `${resident.first_name} ${resident.last_name}` : "Unknown resident";
    },
    [getResident]
  );

  const getHouseName = useCallback(
    (houseId: string | null | undefined) => {
      if (!houseId) return "Not assigned";
      return houses.find((house) => house.id === houseId)?.name ?? "Unknown house";
    },
    [houses]
  );

  const getResidentHouseName = useCallback(
    (residentId: string | null) => {
      const resident = getResident(residentId);
      return getHouseName(resident?.house_id);
    },
    [getHouseName, getResident]
  );

  const getChargeHouseName = useCallback(
    (charge: ResidentFeeChargeRow) => {
      const resident = getResident(charge.resident_id);
      return getHouseName(charge.house_id || resident?.house_id);
    },
    [getHouseName, getResident]
  );

  function formatFeePeriod(charge: ResidentFeeChargeRow) {
    if (charge.period_start && charge.period_end) {
      return `${formatDate(charge.period_start)} - ${formatDate(charge.period_end)}`;
    }

    if (charge.period_start) {
      return formatDate(charge.period_start);
    }

    return "Not set";
  }

  const ledgerRows = useMemo<FeeLedgerRow[]>(() => {
    const chargeRows: FeeLedgerRow[] = feeCharges.map((charge) => ({
      id: `charge-${charge.id}`,
      transaction_date: charge.due_date || charge.period_start || charge.created_at,
      created_at: charge.created_at,
      resident_id: charge.resident_id,
      resident_name: getResidentName(charge.resident_id),
      house_name: getChargeHouseName(charge),
      type: "charge",
      description: `${formatLabel(charge.charge_type)} charge`,
      charge_amount: Number(charge.amount || 0),
      payment_amount: 0,
      balance_due: Number(charge.balance_due || 0),
      status: charge.status,
      notes: charge.notes || formatFeePeriod(charge),
    }));

    const paymentRows: FeeLedgerRow[] = payments.map((payment) => ({
      id: `payment-${payment.id}`,
      transaction_date: payment.payment_date || payment.created_at,
      created_at: payment.created_at,
      resident_id: payment.resident_id,
      resident_name: getResidentName(payment.resident_id),
      house_name: getResidentHouseName(payment.resident_id),
      type: "payment",
      description: `${formatLabel(payment.payment_method)} payment`,
      charge_amount: 0,
      payment_amount: Number(payment.amount || 0),
      balance_due: null,
      status: "payment",
      notes: payment.notes,
    }));

    return [...chargeRows, ...paymentRows]
      .filter((row) => {
        const resident = getResident(row.resident_id);
        const residentStatus = String(resident?.resident_status ?? "active").toLowerCase();
        const residentHouseId = resident?.house_id ?? null;
        const transactionDate = getDateOnly(row.transaction_date);

        const matchesHouse =
          houseFilter === "all" ||
          residentHouseId === houseFilter ||
          row.house_name === getHouseName(houseFilter);

        const matchesResident =
          residentFilter === "all" ||
          row.resident_id === residentFilter;

        const matchesResidentStatus =
          residentStatusFilter === "all" ||
          residentStatus === residentStatusFilter;

        const matchesType =
          transactionTypeFilter === "all" ||
          row.type === transactionTypeFilter;

        const matchesStart = !dateStart || (transactionDate && transactionDate >= dateStart);
        const matchesEnd = !dateEnd || (transactionDate && transactionDate <= dateEnd);

        return matchesHouse && matchesResident && matchesResidentStatus && matchesType && matchesStart && matchesEnd;
      })
      .sort((first, second) => {
        const firstDate = getDateOnly(first.transaction_date) || "0000-00-00";
        const secondDate = getDateOnly(second.transaction_date) || "0000-00-00";
        const dateComparison = secondDate.localeCompare(firstDate);

        if (dateComparison !== 0) return dateComparison;

        const createdComparison = String(second.created_at ?? "").localeCompare(String(first.created_at ?? ""));
        if (createdComparison !== 0) return createdComparison;

        if (first.type === second.type) return 0;
        return first.type === "payment" ? -1 : 1;
      });
  }, [
    feeCharges,
    payments,
    houseFilter,
    residentFilter,
    residentStatusFilter,
    transactionTypeFilter,
    dateStart,
    dateEnd,
    getChargeHouseName,
    getHouseName,
    getResident,
    getResidentHouseName,
    getResidentName,
  ]);

  const ledgerTotals = useMemo(
    () =>
      ledgerRows.reduce(
        (totals, row) => ({
          charges: totals.charges + row.charge_amount,
          payments: totals.payments + row.payment_amount,
          balance: totals.balance + row.charge_amount - row.payment_amount,
        }),
        { charges: 0, payments: 0, balance: 0 }
      ),
    [ledgerRows]
  );

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
      .order("due_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000);

    const paymentsResult = await supabase
      .from("resident_payments")
      .select("id, provider_id, resident_id, fee_charge_id, payment_date, amount, payment_method, notes, created_at")
      .eq("provider_id", activeProviderId)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000);

    if (providerResult.error) throw providerResult.error;
    if (housesResult.error) throw housesResult.error;
    if (residentsResult.error) throw residentsResult.error;
    if (feeChargesResult.error) throw feeChargesResult.error;
    if (paymentsResult.error) throw paymentsResult.error;

    setProvider(providerResult.data as ProviderRow);
    setHouses((housesResult.data ?? []) as HouseRow[]);
    setResidents((residentsResult.data ?? []) as ResidentRow[]);
    setFeeCharges((feeChargesResult.data ?? []) as ResidentFeeChargeRow[]);
    setPayments((paymentsResult.data ?? []) as ResidentPaymentRow[]);
  }

  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true);
        setError("");

        const supabase = getSupabaseClient() as any;
        const { providerId: activeProviderId } = await resolveActiveProviderId(supabase);

        if (!activeProviderId) {
          setError("No provider profile found. Create a provider before using fees.");
          return;
        }

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

  function exportFeeLedgerCsv() {
    const headers = [
      "Date",
      "Resident",
      "House",
      "Type",
      "Description",
      "Charge",
      "Payment",
      "Balance Due",
      "Status",
      "Notes",
    ];

    const rows = ledgerRows.map((row) => [
      formatDate(row.transaction_date),
      row.resident_name,
      row.house_name,
      formatLabel(row.type),
      row.description,
      row.charge_amount > 0 ? formatCurrency(row.charge_amount) : "",
      row.payment_amount > 0 ? formatCurrency(row.payment_amount) : "",
      row.balance_due === null ? "" : formatCurrency(row.balance_due),
      formatLabel(row.status),
      row.notes ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `fee-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
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
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Fee Ledger</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Review all resident charges and payments in one ledger, newest to oldest.
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
            onClick={exportFeeLedgerCsv}
            disabled={ledgerRows.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Export Fee Ledger
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Resident</span>
            <select
              value={residentFilter}
              onChange={(event) => setResidentFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            >
              <option value="all">All residents</option>
              {visibleResidents.map((resident) => (
                <option key={resident.id} value={resident.id}>
                  {resident.first_name} {resident.last_name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">House</span>
            <select
              value={houseFilter}
              onChange={(event) => setHouseFilter(event.target.value)}
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
              value={residentStatusFilter}
              onChange={(event) => setResidentStatusFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            >
              <option value="active">Active residents</option>
              <option value="discharged">Discharged residents</option>
              <option value="all">All residents</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Type</span>
            <select
              value={transactionTypeFilter}
              onChange={(event) => setTransactionTypeFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            >
              <option value="all">Charges and payments</option>
              <option value="charge">Charges only</option>
              <option value="payment">Payments only</option>
            </select>
          </label>

          <div className="hidden xl:block" />

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Date start</span>
            <input
              type="date"
              value={dateStart}
              onChange={(event) => setDateStart(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Date end</span>
            <input
              type="date"
              value={dateEnd}
              onChange={(event) => setDateEnd(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Charges</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{formatCurrency(ledgerTotals.charges)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Payments</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{formatCurrency(ledgerTotals.payments)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Net Balance</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{formatCurrency(ledgerTotals.balance)}</p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading fee ledger...
              </div>
            </div>
          ) : ledgerRows.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              No charges or payments match the selected filters.
            </div>
          ) : (
            <table className="min-w-full divide-y text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Resident</th>
                  <th className="px-3 py-3 font-semibold">House</th>
                  <th className="px-3 py-3 font-semibold">Description</th>
                  <th className="px-3 py-3 text-right font-semibold">Charge</th>
                  <th className="px-3 py-3 text-right font-semibold">Payment</th>
                  <th className="px-3 py-3 text-right font-semibold">Balance Due</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ledgerRows.map((row) => (
                  <tr key={row.id} className="bg-white">
                    <td className="px-3 py-3 text-slate-600">{formatDate(row.transaction_date)}</td>
                    <td className="px-3 py-3 font-medium text-slate-950">{row.resident_name}</td>
                    <td className="px-3 py-3 text-slate-600">{row.house_name}</td>
                    <td className="px-3 py-3 text-slate-600">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{row.description}</span>
                        {row.type === "payment" ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                            Payment applied
                          </span>
                        ) : null}
                      </div>
                      {row.notes ? <span className="block text-xs text-slate-400">{row.notes}</span> : null}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">
                      {row.charge_amount > 0 ? formatCurrency(row.charge_amount) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">
                      {row.payment_amount > 0 ? formatCurrency(row.payment_amount) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-950">
                      {row.balance_due === null ? "—" : formatCurrency(row.balance_due)}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{formatLabel(row.status)}</td>
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
