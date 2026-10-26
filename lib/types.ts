/** Shared domain types for the x-Discord dashboard. */

export type ID = string;

export type Guild = {
  id: ID;
  name: string;
  /** Two-letter fallback used when the guild has no icon. */
  initials: string;
  /** Remote icon URL (Discord CDN). Null in demo mode. */
  iconUrl: string | null;
  /** Hex accent used for gradients + charts. */
  accent: string;
  memberCount: number;
  onlineCount: number;
  botInstalled: boolean;
  ownerId: ID;
  /** Guild-level role the signed-in user holds. */
  viewerRole: "owner" | "admin" | "moderator";
};

export type Channel = {
  id: ID;
  guildId: ID;
  name: string;
  category: string;
  type: "text" | "announcement" | "voice" | "forum";
  /** Bitflag-ish permission hint: can the bot post here? */
  canPost: boolean;
};

export type Embed = {
  title: string;
  description: string;
  color: string;
  footer: string;
  imageUrl?: string;
};

export type MessageStatus = "sent" | "scheduled" | "failed" | "canceled";

export type MessageRecord = {
  id: ID;
  guildId: ID;
  channelId: ID;
  channelName: string;
  content: string;
  embed: Embed | null;
  status: MessageStatus;
  /** ISO timestamp; only set for scheduled messages. */
  scheduledFor: string | null;
  sentAt: string | null;
  author: string;
  createdAt: string;
  /** Set when status === "failed". */
  error?: string;
};

export type AutomodKind =
  | "spam"
  | "invites"
  | "banned_words"
  | "caps"
  | "links"
  | "mentions"
  | "attachments";

export type AutomodAction = "delete" | "warn" | "timeout" | "log";

export type AutomodRule = {
  id: ID;
  guildId: ID;
  kind: AutomodKind;
  name: string;
  description: string;
  enabled: boolean;
  /** Meaning depends on kind: messages/10s, caps %, mention count, etc. */
  threshold: number;
  action: AutomodAction;
  /** Minutes, only used when action === "timeout". */
  timeoutMinutes: number;
  /** Terms for banned_words, allowed domains for links. */
  terms: string[];
  triggers24h: number;
};

export type ModActionType = "warn" | "timeout" | "kick" | "ban" | "unban" | "automod";

export type ModAction = {
  id: ID;
  guildId: ID;
  type: ModActionType;
  targetId: ID;
  targetName: string;
  moderator: string;
  reason: string;
  /** Human readable duration, e.g. "10m". */
  duration: string | null;
  createdAt: string;
};

export type CommandConfig = {
  id: ID;
  guildId: ID;
  name: string;
  description: string;
  enabled: boolean;
  /** Reply body used by the bot when the command runs. */
  response: string;
  /** true = only users with Manage Server may run it. */
  adminOnly: boolean;
  runs7d: number;
};

export type GuildSettings = {
  guildId: ID;
  logChannelId: ID | null;
  alertChannelId: ID | null;
  timezone: string;
  automodDm: boolean;
  mentionAlertRole: string | null;
};

export type BotStatus = {
  online: boolean;
  mode: "demo" | "live";
  latencyMs: number;
  uptimeSeconds: number;
  guildCount: number;
  commandsRegistered: number;
  tag: string;
};

export type SessionUser = {
  id: ID;
  discordId: ID;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  initials: string;
  accent: string;
  email: string | null;
};

export type ActivityItem = {
  id: ID;
  kind: "message" | "automod" | "moderation" | "command";
  title: string;
  detail: string;
  at: string;
};

/** Everything a guild page needs, loaded in one round trip. */
export type GuildBundle = {
  guild: Guild;
  channels: Channel[];
  rules: AutomodRule[];
  messages: MessageRecord[];
  modActions: ModAction[];
  commands: CommandConfig[];
  settings: GuildSettings;
};
