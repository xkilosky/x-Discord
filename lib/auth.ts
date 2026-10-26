import "server-only";
import { cookies } from "next/headers";
import { DEMO_MODE } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/types";

export const DEMO_SESSION_COOKIE = "xd_session";
export const MODE_COOKIE = "xd_mode";

/**
 * The demo account. Signing in with Discord in demo mode sets a cookie and
 * signs you in as this profile, so the whole dashboard is explorable without
 * Discord or Supabase credentials.
 */
export const DEMO_USER: SessionUser = {
  id: "demo-user",
  discordId: "482915773012771020",
  username: "alex.r",
  displayName: "Alex Rivera",
  avatarUrl: null,
  initials: "AR",
  accent: "#7c5cff",
  email: "alex@example.com",
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();

  // Demo mode by configuration, or a session explicitly started with
  // "Explore the demo" on a live deployment.
  const demoPinned = store.get(MODE_COOKIE)?.value === "demo";
  if (DEMO_MODE || demoPinned) {
    return store.get(DEMO_SESSION_COOKIE)?.value === "1" ? DEMO_USER : null;
  }

  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const discordId = meta.provider_id ?? meta.sub ?? user.id;

  const { data: profile } = await db
    .from("user_profiles")
    .select("*")
    .eq("discord_id", discordId)
    .maybeSingle();

  const displayName = profile?.display_name || meta.full_name || meta.name || meta.user_name || "Discord user";
  const username = profile?.username || meta.user_name || "unknown";

  return {
    id: user.id,
    discordId,
    username,
    displayName,
    avatarUrl: profile?.avatar_url ?? (meta.avatar_url || null),
    initials: displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((p: string) => p[0])
      .join("")
      .toUpperCase(),
    accent: "#7c5cff",
    email: profile?.email ?? user.email ?? null,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
