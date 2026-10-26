import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { serverEnv, supabaseConfigured } from "@/lib/env";

/** Cookie-aware server client — respects RLS as the signed-in user. */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — safe to ignore, the
          // session is refreshed in the route handler / server action.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS and is used only by server-side jobs
 * (bot scheduler, guild sync). Never import this into a client component.
 */
export function supabaseAdmin() {
  if (!supabaseConfigured || !serverEnv.serviceRoleKey) {
    throw new Error("Supabase service role is not configured.");
  }
  return createClient(serverEnv.supabaseUrl, serverEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
