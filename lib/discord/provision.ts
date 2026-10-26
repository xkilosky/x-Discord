import "server-only";
import { REST } from "discord.js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hasBotToken, serverEnv } from "@/lib/env";
import { COMMAND_BLUEPRINTS, RULE_BLUEPRINTS, ruleId, commandId } from "@/lib/presets";

/**
 * Bot-side provisioning and sync.
 *
 * Everything here uses the service role and runs outside a user request
 * (OAuth callback, bot ready, explicit "sync" action). User-scoped reads and
 * writes still go through RLS in the dashboard.
 */

type DiscordChannel = {
  id: string;
  name: string;
  type: number;
  parent_id: string | null;
  position: number;
};

const TEXT_TYPES = new Set([0, 5, 15]); // text, announcement, forum
const VOICE_TYPES = new Set([2, 13]); // voice, stage

function restClient() {
  if (!hasBotToken) throw new Error("DISCORD_BOT_TOKEN is not configured");
  return new REST({ version: "10" }).setToken(serverEnv.botToken);
}

function channelType(type: number): "text" | "announcement" | "voice" | "forum" {
  if (type === 5) return "announcement";
  if (type === 15) return "forum";
  if (VOICE_TYPES.has(type)) return "voice";
  return "text";
}

function categoryFor(channel: DiscordChannel, all: DiscordChannel[]) {
  if (!channel.parent_id) return "Community";
  const parent = all.find((c) => c.id === channel.parent_id && c.type === 4);
  return parent?.name ?? "Community";
}

/* ----------------------------- provisioning ------------------------------- */

/**
 * Creates the default AutoMod rules, slash commands and settings row for a
 * guild. Idempotent: safe to call on every login.
 */
export async function provisionGuild(guildId: string) {
  const db = supabaseAdmin();

  const rules = RULE_BLUEPRINTS.map((blueprint) => ({
    id: ruleId(guildId, blueprint.kind),
    guild_id: guildId,
    kind: blueprint.kind,
    name: blueprint.name,
    description: blueprint.description,
    enabled: blueprint.defaultEnabled ?? true,
    threshold: blueprint.threshold,
    action: blueprint.action,
    timeout_minutes: blueprint.timeoutMinutes ?? 10,
    terms: blueprint.terms,
    triggers_24h: 0,
  }));

  const commands = COMMAND_BLUEPRINTS.map((blueprint) => ({
    id: commandId(guildId, blueprint.name),
    guild_id: guildId,
    name: blueprint.name,
    description: blueprint.description,
    enabled: blueprint.defaultEnabled ?? true,
    response: blueprint.response,
    admin_only: blueprint.adminOnly ?? false,
    runs_7d: 0,
  }));

  // ignoreDuplicates keeps user edits intact on re-login.
  const [rulesResult, commandsResult, settingsResult] = await Promise.all([
    db.from("automod_rules").upsert(rules, { onConflict: "id", ignoreDuplicates: true }),
    db.from("bot_commands").upsert(commands, { onConflict: "id", ignoreDuplicates: true }),
    db
      .from("guild_settings")
      .upsert({ guild_id: guildId }, { onConflict: "guild_id", ignoreDuplicates: true }),
  ]);

  return {
    rules: rules.length,
    commands: commands.length,
    errors: [rulesResult.error, commandsResult.error, settingsResult.error]
      .filter(Boolean)
      .map((e) => e!.message),
  };
}

/* ------------------------------ guild sync -------------------------------- */

export type GuildSyncResult = {
  ok: boolean;
  botInstalled: boolean;
  channels: number;
  commands: number;
  error?: string;
};

/**
 * Pulls the guild's live state from Discord: membership, member count, icon,
 * channels and — when the bot is present — registered slash commands.
 */
export async function syncGuild(guildId: string): Promise<GuildSyncResult> {
  if (!hasBotToken) {
    return { ok: false, botInstalled: false, channels: 0, commands: 0, error: "Bot token not configured" };
  }

  const rest = restClient();
  const db = supabaseAdmin();

  // Is the bot actually in this guild?
  type GuildPayload = { name: string; icon: string | null; approximate_member_count?: number };
  let guild: GuildPayload | null = null;
  try {
    guild = (await rest.get(`/guilds/${guildId}`)) as GuildPayload;
  } catch {
    guild = null;
  }

  if (!guild) {
    await db.from("guilds").update({ bot_installed: false }).eq("id", guildId);
    return {
      ok: false,
      botInstalled: false,
      channels: 0,
      commands: 0,
      error: "The bot is not a member of this server yet.",
    };
  }

  let channels: DiscordChannel[] = [];
  try {
    channels = (await rest.get(`/guilds/${guildId}/channels`)) as DiscordChannel[];
  } catch {
    channels = [];
  }

  const rows = channels
    // Category rows are metadata only; they never appear in the composer.
    .filter((c) => TEXT_TYPES.has(c.type) || VOICE_TYPES.has(c.type))
    .map((c) => ({
      id: c.id,
      guild_id: guildId,
      name: c.name,
      category: categoryFor(c, channels),
      type: channelType(c.type),
      // Category rows are stored so the picker grouping can use them, but the
      // composer filters them out by type.
      can_post: TEXT_TYPES.has(c.type),
      position: c.position ?? 0,
    }));

  const { error: channelError } = rows.length
    ? await db.from("channels").upsert(rows, { onConflict: "id" })
    : { error: null };

  // Drop channels that were deleted in Discord.
  const keep = new Set(rows.map((r) => r.id));
  const { data: existing } = await db.from("channels").select("id").eq("guild_id", guildId);
  const stale = (existing ?? []).map((c) => c.id as string).filter((id) => !keep.has(id));
  if (stale.length) {
    await db.from("channels").delete().in("id", stale);
  }

  await db
    .from("guilds")
    .update({
      name: guild.name,
      icon_url: guild.icon ? `https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.png` : null,
      member_count: guild.approximate_member_count ?? 0,
      bot_installed: true,
    })
    .eq("id", guildId);

  // Register slash commands so the dashboard and Discord agree.
  let registered = 0;
  if (serverEnv.discordClientId) {
    const { data: commands } = await db
      .from("bot_commands")
      .select("name, description")
      .eq("guild_id", guildId)
      .eq("enabled", true);

    if (commands?.length) {
      try {
        await rest.put(`/applications/${serverEnv.discordClientId}/guilds/${guildId}/commands`, {
          body: commands.map((c) => ({
            name: c.name as string,
            description: String(c.description ?? "").slice(0, 100) || "x-Discord command",
            type: 1,
          })),
        });
        registered = commands.length;
      } catch {
        registered = 0;
      }
    }
  }

  return {
    ok: true,
    botInstalled: true,
    channels: rows.length,
    commands: registered,
    error: channelError?.message,
  };
}

/** Refresh every guild the bot is in. Called on bot ready and nightly. */
export async function syncAllGuilds() {
  if (!hasBotToken) return { synced: 0 };
  const db = supabaseAdmin();
  const { data } = await db.from("guilds").select("id");

  let synced = 0;
  for (const row of data ?? []) {
    await provisionGuild(row.id as string);
    const result = await syncGuild(row.id as string);
    if (result.ok) synced++;
  }
  return { synced };
}

/** Member counts come from Discord's approximate count on the guild object. */
export async function refreshGuildStats(guildId: string) {
  if (!hasBotToken) return null;
  try {
    const rest = restClient();
    const guild = (await rest.get(`/guilds/${guildId}?with_counts=true`)) as {
      approximate_member_count?: number;
      approximate_presence_count?: number;
    };
    await supabaseAdmin()
      .from("guilds")
      .update({
        member_count: guild.approximate_member_count ?? 0,
        online_count: guild.approximate_presence_count ?? 0,
      })
      .eq("id", guildId);
    return guild;
  } catch {
    return null;
  }
}
