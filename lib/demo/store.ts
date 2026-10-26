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
  ModActionType,
} from "@/lib/types";

/* -------------------------------------------------------------------------- */
/*  Demo dataset                                                              */
/*                                                                             */
/*  The dashboard is fully usable without Discord or Supabase credentials.     */
/*  This module is an in-memory implementation of the same repository          */
/*  contract the Supabase adapter implements, so every screen, action and     */
/*  query is exercised in demo mode.                                          */
/* -------------------------------------------------------------------------- */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const later = (ms: number) => new Date(Date.now() + ms).toISOString();

type GuildSeed = {
  id: string;
  name: string;
  accent: string;
  memberCount: number;
  onlineCount: number;
  botInstalled: boolean;
  viewerRole: Guild["viewerRole"];
  channels: string[];
};

const GUILD_SEEDS: GuildSeed[] = [
  {
    id: "1192847104857523914",
    name: "Pixel Forge",
    accent: "#7c5cff",
    memberCount: 12_840,
    onlineCount: 1_204,
    botInstalled: true,
    viewerRole: "owner",
    channels: [
      "welcome",
      "announcements",
      "patch-notes",
      "showcase",
      "help-desk",
      "general",
      "screenshots",
      "dev-log",
      "off-topic",
      "voice-lounge",
    ],
  },
  {
    id: "1088345220110991336",
    name: "Late Night Lounge",
    accent: "#22d3ee",
    memberCount: 3_216,
    onlineCount: 512,
    botInstalled: true,
    viewerRole: "admin",
    channels: [
      "rules",
      "announcements",
      "general",
      "music",
      "memes",
      "late-night",
      "introductions",
      "suggestions",
      "voice-hangout",
    ],
  },
  {
    id: "955310992774123520",
    name: "Apex Circuit",
    accent: "#ff5d6c",
    memberCount: 28_905,
    onlineCount: 3_981,
    botInstalled: true,
    viewerRole: "moderator",
    channels: [
      "welcome",
      "announcements",
      "scrims",
      "match-results",
      "clips",
      "looking-for-team",
      "general",
      "staff-log",
      "voice-scrim-1",
      "voice-scrim-2",
    ],
  },
  {
    id: "1301468822445999114",
    name: "Study Hall",
    accent: "#3ddc97",
    memberCount: 842,
    onlineCount: 96,
    botInstalled: false,
    viewerRole: "owner",
    channels: ["welcome", "resources", "general", "homework-help"],
  },
];

const ANNOUNCEMENT_CHANNELS = new Set(["announcements", "patch-notes", "rules"]);

function channelType(name: string): Channel["type"] {
  if (name.startsWith("voice")) return "voice";
  if (ANNOUNCEMENT_CHANNELS.has(name)) return "announcement";
  if (name === "showcase" || name === "clips") return "forum";
  return "text";
}

function categoryFor(name: string): string {
  if (ANNOUNCEMENT_CHANNELS.has(name) || name === "welcome") return "Information";
  if (name.startsWith("voice")) return "Voice";
  if (["staff-log", "help-desk", "tickets"].includes(name)) return "Staff";
  return "Community";
}

function buildGuild(seed: GuildSeed): Guild {
  return {
    id: seed.id,
    name: seed.name,
    initials: seed.name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase(),
    iconUrl: null,
    accent: seed.accent,
    memberCount: seed.memberCount,
    onlineCount: seed.onlineCount,
    botInstalled: seed.botInstalled,
    ownerId: "482915773012771020",
    viewerRole: seed.viewerRole,
  };
}

const RULE_BLUEPRINTS: Array<
  Pick<AutomodRule, "kind" | "name" | "description" | "threshold" | "action" | "terms"> & {
    timeoutMinutes?: number;
  }
> = [
  {
    kind: "spam",
    name: "Anti-spam",
    description: "Deletes bursts of messages sent faster than the threshold.",
    threshold: 5,
    action: "timeout",
    timeoutMinutes: 10,
    terms: [],
  },
  {
    kind: "invites",
    name: "Block Discord invites",
    description: "Removes discord.gg links posted by members without staff roles.",
    threshold: 1,
    action: "delete",
    terms: [],
  },
  {
    kind: "banned_words",
    name: "Banned words",
    description: "Filters slurs and blacklisted phrases before they reach the channel.",
    threshold: 1,
    action: "warn",
    terms: ["slur-placeholder", "buy-followers", "free-nitro"],
  },
  {
    kind: "caps",
    name: "Excessive caps",
    description: "Flags messages above the caps percentage when longer than 12 characters.",
    threshold: 70,
    action: "delete",
    terms: [],
  },
  {
    kind: "links",
    name: "Link filter",
    description: "Blocks URLs that are not on the allowlist. Great for scam waves.",
    threshold: 1,
    action: "delete",
    terms: ["github.com", "youtube.com", "steamcommunity.com", "twitch.tv"],
  },
  {
    kind: "mentions",
    name: "Mass mention guard",
    description: "Stops @everyone style pile-ons and mention spam.",
    threshold: 6,
    action: "timeout",
    timeoutMinutes: 30,
    terms: [],
  },
  {
    kind: "attachments",
    name: "Attachment screening",
    description: "Holds executables and archives for staff review before they post.",
    threshold: 1,
    action: "log",
    terms: [".exe", ".scr", ".bat", ".zip"],
  },
];

const COMMAND_BLUEPRINTS: Array<Pick<CommandConfig, "name" | "description" | "response">> = [
  {
    name: "rules",
    description: "Show the server rules",
    response: "Read the rules in <#rules> before posting. Breaking them gets you timed out, not banned. Ask staff if anything is unclear.",
  },
  {
    name: "announce",
    description: "Post an announcement to the configured channel",
    response: "Announcement queued and posted.",
  },
  {
    name: "ping",
    description: "Check bot latency",
    response: "Pong — shard 1 is healthy.",
  },
  {
    name: "poll",
    description: "Create a quick reaction poll",
    response: "Poll created. Voting closes in 24 hours.",
  },
  {
    name: "ticket",
    description: "Open a private staff ticket",
    response: "Ticket opened. A moderator will reply here shortly.",
  },
  {
    name: "rank",
    description: "Show a member's activity rank",
    response: "Rank lookup complete.",
  },
];

function buildRules(guildId: string): AutomodRule[] {
  return RULE_BLUEPRINTS.map((blueprint, i) => ({
    id: `${guildId}-rule-${i}`,
    guildId,
    kind: blueprint.kind,
    name: blueprint.name,
    description: blueprint.description,
    enabled: i < 5,
    threshold: blueprint.threshold,
    action: blueprint.action,
    timeoutMinutes: blueprint.timeoutMinutes ?? 10,
    terms: blueprint.terms,
    triggers24h: [38, 12, 4, 21, 7, 2, 0][i] ?? 0,
  }));
}

function buildCommands(guildId: string): CommandConfig[] {
  return COMMAND_BLUEPRINTS.map((blueprint, i) => ({
    id: `${guildId}-cmd-${i}`,
    guildId,
    name: blueprint.name,
    description: blueprint.description,
    enabled: i !== 5,
    response: blueprint.response,
    adminOnly: blueprint.name === "announce",
    runs7d: [412, 9, 318, 26, 41, 0][i] ?? 0,
  }));
}

type ModSeed = [ModActionType, string, string, string, string | null, number];

const MOD_SEEDS: Record<string, ModSeed[]> = {
  "1192847104857523914": [
    ["automod", "cypher.dev", "AutoMod · Anti-spam", "Message burst detected (9 msgs / 10s)", "10m", 12 * MINUTE],
    ["timeout", "void_walker", "kaya", "Repeated off-topic posting after a warning", "1h", 2 * HOUR],
    ["warn", "pixelpete", "kaya", "Leaked unreleased build screenshots", null, 5 * HOUR],
    ["automod", "spamseller", "AutoMod · Block Discord invites", "Posted a discord.gg invite", null, 9 * HOUR],
    ["ban", "griefer99", "marcus", "Doxxing attempt in #general", null, 27 * HOUR],
    ["warn", "luna.art", "kaya", "Kept bumping their showcase thread", null, 3 * DAY],
  ],
  "1088345220110991336": [
    ["automod", "n1tro_bot", "AutoMod · Link filter", "Blocked nitro scam domain", null, 40 * MINUTE],
    ["warn", "midnight.max", "iris", "Spoilers without tags in #general", null, 4 * HOUR],
    ["timeout", "loudlucas", "iris", "Mic spam in #voice-hangout", "20m", 8 * HOUR],
    ["kick", "throwaway_22", "iris", "Underage account, removed per policy", null, 2 * DAY],
  ],
  "955310992774123520": [
    ["automod", "aim_assist_andy", "AutoMod · Banned words", "Filtered harassment", null, 6 * MINUTE],
    ["timeout", "smurf_hunter", "val", "Trash talk escalated past the line", "30m", 1 * HOUR],
    ["ban", "cheat_seller", "val", "Advertising cheat software in DMs", null, 14 * HOUR],
    ["warn", "scrim_captain", "val", "Missed scrim check-in without notice", null, 20 * HOUR],
    ["automod", "capsrage", "AutoMod · Excessive caps", "ALL CAPS rant", null, 2 * DAY],
    ["warn", "clutchgod", "val", "Posting clips in #match-results", null, 4 * DAY],
  ],
  "1301468822445999114": [],
};

const MESSAGE_SEEDS: Record<string, Array<[string, string, MessageRecord["status"], number]>> = {
  "1192847104857523914": [
    [
      "announcements",
      "**Patch 0.9.4 is live** — new lighting pass, controller remap, and 31 bug fixes. Full notes in the thread.",
      "sent",
      3 * HOUR,
    ],
    [
      "patch-notes",
      "Hotfix rolling out now: resolved the save-corruption bug reported last night. No downtime expected.",
      "sent",
      28 * HOUR,
    ],
    [
      "announcements",
      "🎮 **Game Jam #7 starts Friday.** Theme drops at 18:00 UTC in #dev-log. Teams of up to 4, 48 hours, no engine limits.",
      "scheduled",
      -2 * DAY,
    ],
    [
      "showcase",
      "Weekly showcase roundup is coming Sunday — reply with your best screenshot to be featured.",
      "scheduled",
      -3 * DAY,
    ],
  ],
  "1088345220110991336": [
    [
      "announcements",
      "Late Night Radio returns tonight at 23:00. Bring requests, we're taking the whole queue.",
      "sent",
      6 * HOUR,
    ],
    [
      "announcements",
      "Server milestone: 3,000 members 🎉 Thanks for keeping this place warm.",
      "sent",
      2 * DAY,
    ],
    [
      "announcements",
      "New voice channel rule: keep background noise to a minimum during movie nights.",
      "scheduled",
      -22 * HOUR,
    ],
  ],
  "955310992774123520": [
    [
      "announcements",
      "**Circuit Cup #12 sign-ups are open.** Solo queue bracket, 128 slots, check-in 30 minutes before start.",
      "sent",
      9 * HOUR,
    ],
    [
      "match-results",
      "Grand final: Vanta 3–2 Northlight. Full VOD and stats in the thread below.",
      "sent",
      31 * HOUR,
    ],
    [
      "announcements",
      "Scrim scheduling for next week opens Monday. Captains, confirm your slots in #scrims.",
      "scheduled",
      -4 * DAY,
    ],
    [
      "announcements",
      "Roster deadline reminder — submit your five before Friday 20:00 UTC.",
      "failed",
      5 * HOUR,
    ],
  ],
  "1301468822445999114": [],
};

type MessageSeedMeta = { author: string };

function buildMessages(guildId: string): MessageRecord[] {
  const seeds = MESSAGE_SEEDS[guildId] ?? [];
  const meta: MessageSeedMeta[] = [
    { author: "kaya" },
    { author: "marcus" },
    { author: "you" },
    { author: "you" },
  ];
  return seeds.map(([channelName, content, status, offset], i) => ({
    id: `${guildId}-msg-${i}`,
    guildId,
    channelId: `${guildId}-ch-${channelName}`,
    channelName,
    content,
    embed: null,
    status,
    scheduledFor: status === "scheduled" ? later(-offset) : null,
    sentAt: status === "sent" ? ago(offset) : null,
    author: meta[i % meta.length].author,
    createdAt: status === "scheduled" ? ago(DAY) : ago(offset + MINUTE),
    error:
      status === "failed"
        ? "Missing Access — the bot cannot post in this channel. Re-check channel permissions."
        : undefined,
  }));
}

function buildModActions(guildId: string): ModAction[] {
  const seeds = MOD_SEEDS[guildId] ?? [];
  return seeds.map(([type, targetName, moderator, reason, duration, offset], i) => ({
    id: `${guildId}-mod-${i}`,
    guildId,
    type,
    targetId: `target-${i}`,
    targetName,
    moderator,
    reason,
    duration,
    createdAt: ago(offset),
  }));
}

function buildSettings(guildId: string, channels: Channel[]): GuildSettings {
  return {
    guildId,
    logChannelId:
      channels.find((c) => c.name === "staff-log")?.id ??
      channels.find((c) => c.name === "announcements")?.id ??
      null,
    alertChannelId: channels.find((c) => c.name === "announcements")?.id ?? null,
    timezone: "UTC",
    automodDm: true,
    mentionAlertRole: "@Moderators",
  };
}

const BOT_STARTED_AT = Date.now() - 6 * DAY;

export type DemoState = {
  guilds: Guild[];
  channels: Channel[];
  rules: AutomodRule[];
  commands: CommandConfig[];
  messages: MessageRecord[];
  modActions: ModAction[];
  settings: GuildSettings[];
};

function seed(): DemoState {
  const guilds = GUILD_SEEDS.map(buildGuild);
  const channels: Channel[] = [];
  for (const g of GUILD_SEEDS) {
    g.channels.forEach((name, i) => {
      channels.push({
        id: `${g.id}-ch-${name}`,
        guildId: g.id,
        name,
        category: categoryFor(name),
        type: channelType(name),
        canPost: true,
      });
    });
  }
  return {
    guilds,
    channels,
    rules: GUILD_SEEDS.flatMap((g) => buildRules(g.id)),
    commands: GUILD_SEEDS.flatMap((g) => buildCommands(g.id)),
    messages: GUILD_SEEDS.flatMap((g) => buildMessages(g.id)),
    modActions: GUILD_SEEDS.flatMap((g) => buildModActions(g.id)),
    settings: GUILD_SEEDS.map((g) => buildSettings(g.id, channels.filter((c) => c.guildId === g.id))),
  };
}

/* --------------------------- global singleton ----------------------------- */

const KEY = "__xDiscordDemoState_v1";

function state(): DemoState {
  const g = globalThis as unknown as Record<string, DemoState | undefined>;
  if (!g[KEY]) g[KEY] = seed();
  return g[KEY]!;
}

export function resetDemoState() {
  (globalThis as unknown as Record<string, DemoState | undefined>)[KEY] = seed();
}

/* ------------------------------- queries ---------------------------------- */

export const demo = {
  listGuilds(): Guild[] {
    return [...state().guilds].sort((a, b) => Number(b.botInstalled) - Number(a.botInstalled));
  },

  getGuild(id: string): Guild | null {
    return state().guilds.find((g) => g.id === id) ?? null;
  },

  listChannels(guildId: string): Channel[] {
    const order = { Information: 0, Community: 1, Staff: 2, Voice: 3 } as Record<string, number>;
    return state()
      .channels.filter((c) => c.guildId === guildId)
      .sort((a, b) => (order[a.category] ?? 9) - (order[b.category] ?? 9));
  },

  getBundle(guildId: string): GuildBundle | null {
    const s = state();
    const guild = s.guilds.find((g) => g.id === guildId);
    if (!guild) return null;
    const settings = s.settings.find((x) => x.guildId === guildId)!;
    return {
      guild,
      channels: demo.listChannels(guildId),
      rules: s.rules.filter((r) => r.guildId === guildId),
      messages: s.messages
        .filter((m) => m.guildId === guildId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      modActions: s.modActions
        .filter((m) => m.guildId === guildId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      commands: s.commands.filter((c) => c.guildId === guildId),
      settings,
    };
  },

  listMessages(guildId: string): MessageRecord[] {
    return state()
      .messages.filter((m) => m.guildId === guildId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  listModActions(guildId: string): ModAction[] {
    return state()
      .modActions.filter((m) => m.guildId === guildId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /* ------------------------------ mutations ------------------------------ */

  createMessage(input: {
    guildId: string;
    channelId: string;
    content: string;
    embed: MessageRecord["embed"];
    scheduledFor: string | null;
    author: string;
  }): MessageRecord {
    const channel = state().channels.find((c) => c.id === input.channelId);
    const record: MessageRecord = {
      id: crypto.randomUUID(),
      guildId: input.guildId,
      channelId: input.channelId,
      channelName: channel?.name ?? "unknown-channel",
      content: input.content,
      embed: input.embed,
      status: input.scheduledFor ? "scheduled" : "sent",
      scheduledFor: input.scheduledFor,
      sentAt: input.scheduledFor ? null : new Date().toISOString(),
      author: input.author,
      createdAt: new Date().toISOString(),
    };
    state().messages.unshift(record);
    return record;
  },

  updateMessage(id: string, patch: Partial<MessageRecord>): MessageRecord | null {
    const msg = state().messages.find((m) => m.id === id);
    if (!msg) return null;
    Object.assign(msg, patch);
    return msg;
  },

  deleteMessage(id: string) {
    const s = state();
    s.messages = s.messages.filter((m) => m.id !== id);
  },

  listDue(now = new Date()): MessageRecord[] {
    return state().messages.filter(
      (m) => m.status === "scheduled" && m.scheduledFor && new Date(m.scheduledFor) <= now,
    );
  },

  deliverDue(now = Date.now()): MessageRecord[] {
    const due = state().messages.filter(
      (m) => m.status === "scheduled" && m.scheduledFor && new Date(m.scheduledFor).getTime() <= now,
    );
    for (const m of due) {
      m.status = "sent";
      m.sentAt = new Date().toISOString();
    }
    return due;
  },

  updateRule(guildId: string, ruleId: string, patch: Partial<AutomodRule>) {
    const rule = state().rules.find((r) => r.guildId === guildId && r.id === ruleId);
    if (!rule) return null;
    Object.assign(rule, patch);
    return rule;
  },

  updateCommand(guildId: string, commandId: string, patch: Partial<CommandConfig>) {
    const cmd = state().commands.find((c) => c.guildId === guildId && c.id === commandId);
    if (!cmd) return null;
    Object.assign(cmd, patch);
    return cmd;
  },

  logModAction(input: Omit<ModAction, "id" | "createdAt">): ModAction {
    const action: ModAction = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    state().modActions.unshift(action);
    return action;
  },

  updateSettings(guildId: string, patch: Partial<GuildSettings>) {
    const settings = state().settings.find((s) => s.guildId === guildId);
    if (!settings) return null;
    Object.assign(settings, patch);
    return settings;
  },

  installBot(guildId: string) {
    const guild = state().guilds.find((g) => g.id === guildId);
    if (guild) guild.botInstalled = true;
    return guild ?? null;
  },

  botStatus(): BotStatus {
    const s = state();
    return {
      online: true,
      mode: "demo",
      latencyMs: 42,
      uptimeSeconds: Math.floor((Date.now() - BOT_STARTED_AT) / 1000),
      guildCount: s.guilds.filter((g) => g.botInstalled).length,
      commandsRegistered: s.commands.filter((c) => c.enabled).length,
      tag: "xDiscord#4821",
    };
  },

  recentActivity(guildId: string, limit = 8): ActivityItem[] {
    const s = state();
    const items: ActivityItem[] = [];

    for (const m of s.messages.filter((x) => x.guildId === guildId)) {
      if (m.status === "sent" && m.sentAt) {
        items.push({
          id: `act-${m.id}`,
          kind: "message",
          title: `Message posted in #${m.channelName}`,
          detail: m.content.replace(/\*\*/g, "").slice(0, 90),
          at: m.sentAt,
        });
      }
    }
    for (const a of s.modActions.filter((x) => x.guildId === guildId)) {
      items.push({
        id: `act-${a.id}`,
        kind: a.type === "automod" ? "automod" : "moderation",
        title:
          a.type === "automod"
            ? `AutoMod caught ${a.targetName}`
            : `${a.type[0].toUpperCase()}${a.type.slice(1)} · ${a.targetName}`,
        detail: a.reason,
        at: a.createdAt,
      });
    }

    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  },
};
