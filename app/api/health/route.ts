import { NextResponse } from "next/server";
import { DEMO_MODE, hasBotToken, serverEnv, supabaseConfigured } from "@/lib/env";
import { getProviderStatus } from "@/lib/oauth-status";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Deployment readiness. Returns configuration state and — when Supabase is
 * configured — live row counts, so you can tell at a glance whether the
 * dashboard is talking to a real database.
 */
export async function GET() {
  const providers = await getProviderStatus();

  let database: { reachable: boolean; guilds?: number; channels?: number; messages?: number; error?: string } =
    { reachable: false };

  if (supabaseConfigured && serverEnv.serviceRoleKey) {
    try {
      const db = supabaseAdmin();
      const [guilds, channels, messages] = await Promise.all([
        db.from("guilds").select("id", { count: "exact", head: true }),
        db.from("channels").select("id", { count: "exact", head: true }),
        db.from("messages").select("id", { count: "exact", head: true }),
      ]);
      database = {
        reachable: !guilds.error,
        guilds: guilds.count ?? 0,
        channels: channels.count ?? 0,
        messages: messages.count ?? 0,
        error: guilds.error?.message,
      };
    } catch (error) {
      database = { reachable: false, error: error instanceof Error ? error.message : "unknown" };
    }
  }

  const ready = supabaseConfigured && providers.discord && Boolean(serverEnv.serviceRoleKey);

  return NextResponse.json({
    ready,
    mode: DEMO_MODE ? "demo" : "live",
    checks: {
      supabase: supabaseConfigured,
      serviceRole: Boolean(serverEnv.serviceRoleKey),
      discordOAuth: providers.discord,
      botToken: hasBotToken,
      appUrl: serverEnv.appUrl,
    },
    database,
    providers,
  });
}
