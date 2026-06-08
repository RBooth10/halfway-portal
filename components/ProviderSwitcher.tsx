"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { AccessibleProvider, resolveActiveProviderId } from "@/lib/providerAccess";

export default function ProviderSwitcher() {
  const [providerId, setProviderId] = useState("");
  const [providers, setProviders] = useState<AccessibleProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProviders() {
      try {
        setLoading(true);
        setError("");

        const supabase = getSupabaseClient() as any;
        const result = await resolveActiveProviderId(supabase);

        if (!isMounted) return;

        setProviderId(result.providerId);
        setProviders(result.providers);
      } catch (err) {
        if (!isMounted) return;

        const message = err instanceof Error ? err.message : "Could not load providers.";
        setError(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadProviders();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleProviderChange(nextProviderId: string) {
    if (!nextProviderId || nextProviderId === providerId) return;

    window.localStorage.setItem("current_provider_id", nextProviderId);
    window.localStorage.setItem("activeProviderId", nextProviderId);

    setProviderId(nextProviderId);
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading provider...
      </div>
    );
  }

  if (error || providers.length === 0) {
    return null;
  }

  const activeProvider = providers.find((provider) => provider.id === providerId);
  const activeProviderName = activeProvider?.legal_name || "Current Provider";

  return (
    <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="rounded-xl bg-slate-100 p-2">
            <Building2 className="h-4 w-4 text-slate-700" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Provider</p>
            <p className="font-semibold text-slate-950">{activeProviderName}</p>
          </div>
        </div>

        {providers.length > 1 ? (
          <label className="block md:min-w-72">
            <span className="sr-only">Switch provider</span>
            <select
              value={providerId}
              onChange={(event) => handleProviderChange(event.target.value)}
              className="h-10 w-full rounded-xl border bg-white px-3 text-sm font-medium text-slate-700 outline-none ring-slate-900/10 focus:ring-4"
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.legal_name || "Unnamed Provider"}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </div>
  );
}
