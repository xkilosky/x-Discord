import "server-only";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import type { Repo } from "@/lib/repo";
import type {
  ActivityItem,
  AutomodRule,
  BotStatus,
  Channel,
  CommandConfig,
  Guild,
  GuildBundle,
  GuildSettings,
  MessageRecord,
  ModAction,
} from "@/lib/types";

/* ------------------------------- row types -------------------------------- */

type Row = Record<string, unknown>;

const s = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const n = (v: unknown, fallback = 0) => (typeof v === "number" ? v : fallback);
const b = (v: unknown, fallback = false) => (typeof v === "boolean" ? v : fallback);

function toGuild(row: Row): Guild {
  const name = s(row.name, "Unknown server");
  return {
    id: s(row.id),
    name,
    initials: s(row.initials) || name.slice(0, 2).toUpperCase(),
    iconUrl: (row.icon_url as string | null) ?? null,
    accent: s(row.accent, "#7c5cff"),
    memberCount: n(row.member_count),
    onlineCount: n(row.online_count),
    botInstalled: b(row.bot_installed),
    ownerId: s(row.owner_discord_id),
    viewerRole: (s(row.viewer_role, "moderator") as Guild["viewerRole"]) ?? "moderator",
  };
}

function toChannel(row: Row): Channel {
  return {
    id: s(row.id),
    guildId: s(row.guild_id),
    name: s(row.name),
    category: s(row.category, "Community"),
    type: (s(row.type, "text") as Channel["type"]) ?? "text",
    canPost: b(row.can_post, true),
  };
}

function toMessage(row: Row): MessageRecord {
  const embed = row.embed as MessageRecord["embed"] | null;
  return {
    id: s(row.id),
    guildId: s(row.guild_id),
    channelId: s(row.channel_id),
    channelName: s(row.channel_name),
    content: s(row.content),
    embed: embed ?? null,
    status: (s(row.status, "sent") as MessageRecord["status"]) ?? "sent",
    scheduledFor: (row.scheduled_for as string | null) ?? null,
    sentAt: (row.sent_at as string | null) ?? null,
    author: s(row.author, "dashboard"),
    createdAt: s(row.created_at, new Date().toISOString()),
    error: (row.error as string | undefined) ?? undefined,
  };
}

function toRule(row: Row): AutomodRule {
  return {
    id: s(row.id),
    guildId: s(row.guild_id),
    kind: (s(row.kind, "spam") as AutomodRule["kind"]) ?? "spam",
    name: s(row.name),
    description: s(row.description),
    enabled: b(row.enabled),
    threshold: n(row.threshold, 1),
    action: (s(row.action, "delete") as AutomodRule["action"]) ?? "delete",
    timeoutMinutes: n(row.timeout_minutes, 10),
    terms: Array.isArray(row.terms) ? (row.terms as string[]) : [],
    triggers24h: n(row.triggers_24h),
  };
}

function toCommand(row: Row): CommandConfig {
  return {
    id: s(row.id),
    guildId: s(row.guild_id),
    name: s(row.name),
    description: s(row.description),
    enabled: b(row.enabled, true),
    response: s(row.response),
    adminOnly: b(row.admin_only),
    runs7d: n(row.runs_7d),
  };
}

function toModAction(row: Row): ModAction {
  return {
    id: s(row.id),
    guildId: s(row.guild_id),
    type: (s(row.type, "warn") as ModAction["type"]) ?? "warn",
    targetId: s(row.target_id),
    targetName: s(row.target_name),
    moderator: s(row.moderator),
    reason: s(row.reason),
    duration: (row.duration as string | null) ?? null,
    createdAt: s(row.created_at, new Date().toISOString()),
  };
}

function toSettings(row: Row): GuildSettings {
  return {
    guildId: s(row.guild_id),
    logChannelId: (row.log_channel_id as string | null) ?? null,
    alertChannelId: (row.alert_channel_id as string | null) ?? null,
    timezone: s(row.timezone, "UTC"),
    automodDm: b(row.automod_dm, true),
    mentionAlertRole: (row.mention_alert_role as string | null) ?? null,
  };
}

/* --------------------------------- repo ----------------------------------- */

export const supabaseRepo: Repo = {
  mode: "live",

  async listGuilds() {
    const db = await supabaseServer();
    const { data, error } = await db
      .from("guilds")
      .select("*")
      .order("bot_installed", { ascending: false })
      .order("name");
    if (error) throw new Error(`listGuilds: ${error.message}`);
    return (data ?? []).map(toGuild);
  },

  async getGuild(id) {
    const db = await supabaseServer();
    const { data } = await db.from("guilds").select("*").eq("id", id).maybeSingle();
    return data ? toGuild(data) : null;
  },

  async listChannels(guildId) {
    const db = await supabaseServer();
    const { data, error } = await db.from("channels").select("*").eq("guild_id", guildId);
    if (error) throw new Error(`listChannels: ${error.message}`);
    const order: Record<string, number> = { Information: 0, Community: 1, Staff: 2, Voice: 3 };
    return (data ?? [])
      .map(toChannel)
      .sort((a, b2) => (order[a.category] ?? 9) - (order[b2.category] ?? 9));
  },

  async getBundle(guildId) {
    const db = await supabaseServer();
    const [guild, channels, rules, messages, modActions, commands, settings] = await Promise.all([
      this.getGuild(guildId),
      this.listChannels(guildId),
      db.from("automod_rules").select("*").eq("guild_id", guildId),
      db
        .from("messages")
        .select("*")
        .eq("guild_id", guildId)
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("mod_actions")
        .select("*")
        .eq("guild_id", guildId)
        .order("created_at", { ascending: false })
        .limit(50),
      db.from("bot_commands").select("*").eq("guild_id", guildId).order("name"),
      db.from("guild_settings").select("*").eq("guild_id", guildId).maybeSingle(),
    ]);

    if (!guild) return null;

    return {
      guild,
      channels,
      rules: (rules.data ?? []).map(toRule),
      messages: (messages.data ?? []).map(toMessage),
      modActions: (modActions.data ?? []).map(toModAction),
      commands: (commands.data ?? []).map(toCommand),
      settings: settings.data
        ? toSettings(settings.data)
        : {
            guildId,
            logChannelId: null,
            alertChannelId: null,
            timezone: "UTC",
            automodDm: true,
            mentionAlertRole: null,
          },
    } satisfies GuildBundle;
  },

  async createMessage(input) {
    const db = await supabaseServer();
    const { data: channel } = await db
      .from("channels")
      .select("name")
      .eq("id", input.channelId)
      .maybeSingle();

    const { data, error } = await db
      .from("messages")
      .insert({
        guild_id: input.guildId,
        channel_id: input.channelId,
        channel_name: channel?.name ?? "unknown-channel",
        content: input.content,
        embed: input.embed,
        status: input.scheduledFor ? "scheduled" : "sent",
        scheduled_for: input.scheduledFor,
        sent_at: input.scheduledFor ? null : new Date().toISOString(),
        author: input.author,
      })
      .select("*")
      .single();

    if (error) throw new Error(`createMessage: ${error.message}`);
    return toMessage(data);
  },

  async listDueMessages(now = new Date()) {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("messages")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", now.toISOString())
      .limit(25);
    if (error) throw new Error(`listDueMessages: ${error.message}`);
    return (data ?? []).map(toMessage);
  },

  async markMessage(id, patch) {
    const db = supabaseAdmin();
    const payload: Row = {};
    if (patch.status) payload.status = patch.status;
    if (patch.sentAt !== undefined) payload.sent_at = patch.sentAt;
    if (patch.error !== undefined) payload.error = patch.error;
    if (patch.content !== undefined) payload.content = patch.content;
    if (patch.scheduledFor !== undefined) payload.scheduled_for = patch.scheduledFor;
    if (Object.keys(payload).length === 0) return;
    const { error } = await db.from("messages").update(payload).eq("id", id);
    if (error) throw new Error(`markMessage: ${error.message}`);
  },

  async deleteMessage(id) {
    const db = await supabaseServer();
    const { error } = await db.from("messages").delete().eq("id", id);
    if (error) throw new Error(`deleteMessage: ${error.message}`);
  },

  async updateRule(guildId, ruleId, patch) {
    const db = await supabaseServer();
    const payload: Row = {};
    if (patch.enabled !== undefined) payload.enabled = patch.enabled;
    if (patch.threshold !== undefined) payload.threshold = patch.threshold;
    if (patch.action !== undefined) payload.action = patch.action;
    if (patch.timeoutMinutes !== undefined) payload.timeout_minutes = patch.timeoutMinutes;
    if (patch.terms !== undefined) payload.terms = patch.terms;
    const { error } = await db
      .from("automod_rules")
      .update(payload)
      .eq("guild_id", guildId)
      .eq("id", ruleId);
    if (error) throw new Error(`updateRule: ${error.message}`);
  },

  async updateCommand(guildId, commandId, patch) {
    const db = await supabaseServer();
    const payload: Row = {};
    if (patch.enabled !== undefined) payload.enabled = patch.enabled;
    if (patch.response !== undefined) payload.response = patch.response;
    if (patch.adminOnly !== undefined) payload.admin_only = patch.adminOnly;
    const { error } = await db
      .from("bot_commands")
      .update(payload)
      .eq("guild_id", guildId)
      .eq("id", commandId);
    if (error) throw new Error(`updateCommand: ${error.message}`);
  },

  async logModAction(input) {
    const db = await supabaseServer();
    const { data, error } = await db
      .from("mod_actions")
      .insert({
        guild_id: input.guildId,
        type: input.type,
        target_id: input.targetId,
        target_name: input.targetName,
        moderator: input.moderator,
        reason: input.reason,
        duration: input.duration,
      })
      .select("*")
      .single();
    if (error) throw new Error(`logModAction: ${error.message}`);
    return toModAction(data);
  },

  async updateSettings(guildId, patch) {
    const db = await supabaseServer();
    const payload: Row = { guild_id: guildId };
    if (patch.logChannelId !== undefined) payload.log_channel_id = patch.logChannelId;
    if (patch.alertChannelId !== undefined) payload.alert_channel_id = patch.alertChannelId;
    if (patch.timezone !== undefined) payload.timezone = patch.timezone;
    if (patch.automodDm !== undefined) payload.automod_dm = patch.automodDm;
    if (patch.mentionAlertRole !== undefined) payload.mention_alert_role = patch.mentionAlertRole;
    const { error } = await db.from("guild_settings").upsert(payload, { onConflict: "guild_id" });
    if (error) throw new Error(`updateSettings: ${error.message}`);
  },

  async installBot(guildId) {
    const db = await supabaseServer();
    const { error } = await db.from("guilds").update({ bot_installed: true }).eq("id", guildId);
    if (error) throw new Error(`installBot: ${error.message}`);
  },

  async botStatus() {
    const db = supabaseAdmin();
    const { data } = await db.from("bot_status").select("*").eq("id", "singleton").maybeSingle();
    const { count } = await db
      .from("bot_commands")
      .select("id", { count: "exact", head: true })
      .eq("enabled", true);
    return {
      online: Boolean(data?.online),
      mode: "live",
      latencyMs: n(data?.latency_ms, 0),
      uptimeSeconds: n(data?.uptime_seconds, 0),
      guildCount: n(data?.guild_count, 0),
      commandsRegistered: count ?? 0,
      tag: s(data?.tag, "xDiscord"),
    } satisfies BotStatus;
  },

  async recentActivity(guildId, limit = 8) {
    const db = await supabaseServer();
    const [{ data: messages }, { data: actions }] = await Promise.all([
      db
        .from("messages")
        .select("id, content, channel_name, sent_at")
        .eq("guild_id", guildId)
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(limit),
      db
        .from("mod_actions")
        .select("*")
        .eq("guild_id", guildId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    const items: ActivityItem[] = [
      ...(messages ?? []).map((m, i) => ({
        id: `act-m-${m.id ?? i}`,
        kind: "message" as const,
        title: `Message posted in #${s(m.channel_name)}`,
        detail: s(m.content).replace(/\*\*/g, "").slice(0, 90),
        at: s(m.sent_at, new Date().toISOString()),
      })),
      ...(actions ?? []).map((a) => {
        const action = toModAction(a as Row);
        return {
          id: `act-a-${action.id}`,
          kind: (action.type === "automod" ? "automod" : "moderation") as ActivityItem["kind"],
          title:
            action.type === "automod"
              ? `AutoMod caught ${action.targetName}`
              : `${action.type[0].toUpperCase()}${action.type.slice(1)} · ${action.targetName}`,
          detail: action.reason,
          at: action.createdAt,
        };
      }),
    ];

    return items.sort((x, y) => y.at.localeCompare(x.at)).slice(0, limit);
  },
};
