import type { AutomodRule, CommandConfig } from "@/lib/types";

/**
 * Defaults provisioned for every server the bot joins.
 *
 * Shared by the demo dataset and the live provisioning job so a freshly
 * installed server behaves exactly like the demo — no "empty dashboard" state.
 */

export type RuleBlueprint = Pick<
  AutomodRule,
  "kind" | "name" | "description" | "threshold" | "action" | "terms"
> & { timeoutMinutes?: number; defaultEnabled?: boolean };

export const RULE_BLUEPRINTS: RuleBlueprint[] = [
  {
    kind: "spam",
    name: "Anti-spam",
    description: "Deletes bursts of messages sent faster than the threshold.",
    threshold: 5,
    action: "timeout",
    timeoutMinutes: 10,
    terms: [],
    defaultEnabled: true,
  },
  {
    kind: "invites",
    name: "Block Discord invites",
    description: "Removes discord.gg links posted by members without staff roles.",
    threshold: 1,
    action: "delete",
    terms: [],
    defaultEnabled: true,
  },
  {
    kind: "banned_words",
    name: "Banned words",
    description: "Filters slurs and blacklisted phrases before they reach the channel.",
    threshold: 1,
    action: "warn",
    terms: ["slur-placeholder", "buy-followers", "free-nitro"],
    defaultEnabled: true,
  },
  {
    kind: "caps",
    name: "Excessive caps",
    description: "Flags messages above the caps percentage when longer than 12 characters.",
    threshold: 70,
    action: "delete",
    terms: [],
    defaultEnabled: true,
  },
  {
    kind: "links",
    name: "Link filter",
    description: "Blocks URLs that are not on the allowlist. Great for scam waves.",
    threshold: 1,
    action: "delete",
    terms: ["github.com", "youtube.com", "steamcommunity.com", "twitch.tv"],
    defaultEnabled: true,
  },
  {
    kind: "mentions",
    name: "Mass mention guard",
    description: "Stops @everyone style pile-ons and mention spam.",
    threshold: 6,
    action: "timeout",
    timeoutMinutes: 30,
    terms: [],
    defaultEnabled: false,
  },
  {
    kind: "attachments",
    name: "Attachment screening",
    description: "Holds executables and archives for staff review before they post.",
    threshold: 1,
    action: "log",
    terms: [".exe", ".scr", ".bat", ".zip"],
    defaultEnabled: false,
  },
];

export type CommandBlueprint = Pick<CommandConfig, "name" | "description" | "response"> & {
  adminOnly?: boolean;
  defaultEnabled?: boolean;
};

export const COMMAND_BLUEPRINTS: CommandBlueprint[] = [
  {
    name: "rules",
    description: "Show the server rules",
    response:
      "Read the rules in <#rules> before posting. Breaking them gets you timed out, not banned. Ask staff if anything is unclear.",
    defaultEnabled: true,
  },
  {
    name: "announce",
    description: "Post an announcement to the configured channel",
    response: "Announcement queued and posted.",
    adminOnly: true,
    defaultEnabled: true,
  },
  {
    name: "ping",
    description: "Check bot latency",
    response: "Pong — the gateway is healthy.",
    defaultEnabled: true,
  },
  {
    name: "poll",
    description: "Create a quick reaction poll",
    response: "Poll created. Voting closes in 24 hours.",
    defaultEnabled: true,
  },
  {
    name: "ticket",
    description: "Open a private staff ticket",
    response: "Ticket opened. A moderator will reply here shortly.",
    defaultEnabled: true,
  },
  {
    name: "rank",
    description: "Show a member's activity rank",
    response: "Rank lookup complete.",
    defaultEnabled: false,
  },
];

/** Stable ids so re-provisioning is idempotent (upsert on primary key). */
export function ruleId(guildId: string, kind: string) {
  return `${guildId}-rule-${kind}`;
}

export function commandId(guildId: string, name: string) {
  return `${guildId}-cmd-${name}`;
}

export const DEFAULT_TIMEZONE = "UTC";
