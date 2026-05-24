"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BedDouble,
  Home,
  Loader2,
  UserRound,
  Users,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

type HouseDetail = {
  id: string;
  provider_id: string;
  name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  gender_served: string | null;
  farr_level: string | null;
  total_beds: number | null;
};

type ResidentRow = {
  id: string;
  first_name: string;
  last_name: string;
  admission_date: string | null;
  current_phase: string | null;
  rci_status: string | null;
  medication_status: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Not entered";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not entered";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function DetailBlock({ title, value }: { title: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value || "Not entered"}</p>
    </div>
  );
}

export default function HouseDetailPage() {
  const params = useParams<{ id: string }>();
  const houseId = params.id;

  const [house, setHouse] = useState<HouseDetail | null>(null);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHouseProfile() {
      try {
        const supabase = getSupabaseClient();

        const { data: houseData, error: houseError } = await supabase
          .from("houses")
          .select("*")
          .eq("id", houseId)
          .single();

        if (houseError) {
          throw houseError;
        }

        setHouse(houseData as HouseDetail);

        const { data: residentData, error: residentError } = await supabase
          .from("residents")
          .select("id, first_name, last_name, admission_date, current_phase, rci_status, medication_status")
          .eq("house_id", houseId)
          .order("last_name", { ascending: true })
          .order("first_name", { ascending: true });

        if (residentError) {
          throw residentError;
        }

        setResidents((residentData ?? []) as ResidentRow[]);
      } catch (err) {
        const profileError = err as { message?: unknown };
        setError(profileError?.message ? String(profileError.message) : "Could not load house profile.");
      } finally {
        setLoading(false);
      }
    }

    void loadHouseProfile();
  }, [houseId]);

  const occupiedBeds = residents.length;
  const totalBeds = Number(house?.total_beds || 0);
  const availableBeds = Math.max(totalBeds - occupiedBeds, 0);

  return (
    <PageShell>
      <Link
        href="/houses"
        className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to houses
      </Link>

      {loading ? (
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading house profile...
          </div>
        </section>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {!loading && house ? (
        <>
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
                  <Home className="h-10 w-10 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">House Profile</p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-tight">{house.name}</h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                    {[house.street_address, house.city, house.state, house.zip].filter(Boolean).join(", ") ||
                      "Address not complete"}
                  </p>
                </div>
              </div>

              <Link
                href="/residents"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <UserRound className="h-4 w-4" />
                Add / Manage Residents
              </Link>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetailBlock title="Total Beds" value={totalBeds} />
            <DetailBlock title="Occupied Beds" value={occupiedBeds} />
            <DetailBlock title="Available Beds" value={availableBeds} />
            <DetailBlock title="House Status" value={house.status} />
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">House Details</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DetailBlock title="Gender / Population" value={house.gender_served} />
              <DetailBlock title="FARR/NARR Level" value={house.farr_level} />
              <DetailBlock title="City" value={house.city} />
              <DetailBlock title="State" value={house.state} />
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Residents in This House</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Residents assigned to {house.name}.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                <Users className="h-4 w-4" />
                {residents.length} resident(s)
              </div>
            </div>

            {residents.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-950">No residents assigned yet.</p>
                <p className="mt-1 text-sm text-slate-500">
                  Assign residents to this house from the Residents page.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {residents.map((resident) => (
                  <Link
                    key={resident.id}
                    href={`/residents/${resident.id}`}
                    className="rounded-2xl bg-slate-50 p-4 transition hover:bg-slate-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">
                          {resident.first_name} {resident.last_name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Assigned to this house
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Phase: {resident.current_phase || "Not selected"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Admission: {formatDate(resident.admission_date)}
                        </p>
                      </div>

                      <BedDouble className="h-5 w-5 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </PageShell>
  );
}
