import "server-only";
import { serverEnv, supabaseConfigured } from "@/lib/env";

export type ProviderStatus = {
  checked: boolean;
  discord: boolean;
  email: boolean;
  error?: string;
};

/**
 * Asks Supabase which external auth providers are actually enabled.
 * Lets the UI tell the difference between "deployed" and "ready to sign in"
 * instead of showing users a broken OAuth button.
 */
export async function getProviderStatus(): Promise<ProviderStatus> {
  if (!supabaseConfigured) {
    return { checked: false, discord: false, email: false, error: "Supabase is not configured" };
  }

  try {
    const res = await fetch(`${serverEnv.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: serverEnv.supabaseAnonKey },
      cache: "no-store",
    });
    if (!res.ok) {
      return { checked: true, discord: false, email: false, error: `Supabase returned ${res.status}` };
    }
    const data = (await res.json()) as {
      external?: Record<string, boolean>;
      disable_signup?: boolean;
    };
    return {
      checked: true,
      discord: Boolean(data.external?.discord),
      email: Boolean(data.external?.email),
    };
  } catch (error) {
    return {
      checked: false,
      discord: false,
      email: false,
      error: error instanceof Error ? error.message : "Could not reach Supabase",
    };
  }
}
