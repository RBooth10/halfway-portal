import type { SupabaseClient } from "@supabase/supabase-js";

export type AccessibleProvider = {
  id: string;
  legal_name: string | null;
};

export type ActiveProviderResolution = {
  providerId: string;
  providers: AccessibleProvider[];
};

export async function resolveActiveProviderId(
  supabase: SupabaseClient
): Promise<ActiveProviderResolution> {
  const providerResult = await supabase
    .from("providers")
    .select("id, legal_name")
    .order("created_at", { ascending: false });

  if (providerResult.error) {
    throw providerResult.error;
  }

  const providers = (providerResult.data ?? []) as AccessibleProvider[];

  const storedProviderId =
    typeof window !== "undefined"
      ? window.localStorage.getItem("current_provider_id") ||
        window.localStorage.getItem("activeProviderId")
      : null;

  const storedProviderIsAccessible = providers.some(
    (provider) => provider.id === storedProviderId
  );

  const providerId = storedProviderIsAccessible
    ? storedProviderId ?? ""
    : providers[0]?.id ?? "";

  if (providerId && typeof window !== "undefined") {
    window.localStorage.setItem("current_provider_id", providerId);
    window.localStorage.setItem("activeProviderId", providerId);
  }

  return {
    providerId,
    providers,
  };
}
