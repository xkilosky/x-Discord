import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { DEMO_MODE } from "@/lib/env";

/**
 * OAuth callback. Supabase exchanges the Discord code for a session and drops
 * the auth cookies; we then mirror the Discord identity into user_profiles and
 * sync the servers the user can manage.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (DEMO_MODE) return NextResponse.redirect(new URL("/dashboard", url.origin));
  if (!code) return NextResponse.redirect(new URL("/?error=missing_code", url.origin));

  const db = await supabaseServer();
  const { error } = await db.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error.message)}`, url.origin));
  }

  const {
    data: { user },
  } = await db.auth.getUser();

  if (user) {
    const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
    const discordId = meta.provider_id ?? meta.sub ?? user.id;

    await db.from("user_profiles").upsert(
      {
        id: user.id,
        discord_id: discordId,
        username: meta.user_name ?? "unknown",
        display_name: meta.full_name ?? meta.name ?? meta.user_name ?? null,
        avatar_url: meta.avatar_url ?? null,
        email: user.email ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    // Guild membership sync runs with the service role from the bot process.
    try {
      const { syncUserGuilds } = await import("@/lib/discord/sync");
      await syncUserGuilds(user.id, meta.provider_token ?? null);
    } catch {
      // Non-fatal: the dashboard will show an empty state and the nightly
      // sync job will retry.
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
