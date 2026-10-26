/**
 * Single source of truth for table names.
 *
 * x-Discord shares a Supabase project with other apps, so every table is
 * namespaced with `xd_`. Keeping the names here means a prefix change is a
 * one-line edit instead of a grep across the codebase.
 */
export const T = {
  profiles: "xd_user_profiles",
  guilds: "xd_guilds",
  members: "xd_guild_members",
  channels: "xd_channels",
  messages: "xd_messages",
  rules: "xd_automod_rules",
  modActions: "xd_mod_actions",
  commands: "xd_bot_commands",
  settings: "xd_guild_settings",
  botStatus: "xd_bot_status",
} as const;
