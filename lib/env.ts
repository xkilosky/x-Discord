/**
 * Single source of truth for runtime configuration.
 *
 * The app is designed to run with **zero credentials**: if Supabase is not
 * configured we fall back to the in-memory demo dataset so every screen works.
 * Add the env vars from `.env.example` to switch to the live stacks.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Force demo mode even when Supabase is configured (handy for previews). */
const forcedDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

export const DEMO_MODE = forcedDemo || !supabaseConfigured;

export const serverEnv = {
  supabaseUrl,
  supabaseAnonKey,
  serviceRoleKey,
  discordClientId: process.env.DISCORD_CLIENT_ID ?? "",
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
  botToken: process.env.DISCORD_BOT_TOKEN ?? "",
  /** Public base URL used for OAuth redirects and invite links. */
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export const hasBotToken = Boolean(serverEnv.botToken);

/** Discord permissions integer used when generating the bot invite link. */
export const BOT_INVITE_PERMISSIONS = "1099780057142"; // manage + send + moderate + read history

export function botInviteUrl(guildId?: string) {
  const params = new URLSearchParams({
    client_id: serverEnv.discordClientId || "YOUR_CLIENT_ID",
    scope: "bot applications.commands",
    permissions: BOT_INVITE_PERMISSIONS,
  });
  if (guildId) {
    params.set("guild_id", guildId);
    params.set("disable_guild_select", "true");
  }
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
