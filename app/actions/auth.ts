"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_MODE, serverEnv } from "@/lib/env";
import { DEMO_SESSION_COOKIE } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * One-time Discord connection.
 *
 * Demo mode: sets a session cookie so the whole dashboard is explorable.
 * Live mode: hands off to Supabase's Discord OAuth provider with the
 * `identify guilds` scopes — the same consent a user grants exactly once.
 */
export async function signInWithDiscord() {
  if (DEMO_MODE) {
    const store = await cookies();
    store.set(DEMO_SESSION_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    redirect("/dashboard");
  }

  const db = await supabaseServer();
  const { data, error } = await db.auth.signInWithOAuth({
    provider: "discord",
    options: {
      scopes: "identify guilds",
      redirectTo: `${serverEnv.appUrl}/auth/callback`,
      queryParams: { prompt: "consent" },
    },
  });

  if (error || !data.url) redirect("/?error=oauth");
  redirect(data.url);
}

export async function signOut() {
  if (DEMO_MODE) {
    const store = await cookies();
    store.delete(DEMO_SESSION_COOKIE);
    redirect("/");
  }

  const db = await supabaseServer();
  await db.auth.signOut();
  redirect("/");
}
