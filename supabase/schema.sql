-- x-Discord schema — namespaced with the `xd_` prefix.
--
-- This project is shared with other apps, so every object here is prefixed and
-- nothing else in `public` is touched. Run in the Supabase SQL editor, or apply
-- with `supabase db push`. Idempotent: safe to re-run.
--
-- Auth model: users sign in with Discord through Supabase Auth. We mirror the
-- Discord identity in xd_user_profiles and grant server access through
-- xd_guild_members, which the sync job fills from Discord's /users/@me/guilds.

create extension if not exists "pgcrypto";

/* ------------------------------- identity -------------------------------- */

create table if not exists public.xd_user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_id text unique not null,
  username text not null,
  display_name text,
  avatar_url text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.xd_guilds (
  id text primary key,                       -- Discord guild id (snowflake)
  name text not null,
  initials text,
  icon_url text,
  accent text not null default '#7c5cff',
  member_count int not null default 0,
  online_count int not null default 0,
  bot_installed boolean not null default false,
  owner_discord_id text,
  viewer_role text not null default 'moderator'
    check (viewer_role in ('owner', 'admin', 'moderator')),
  created_at timestamptz not null default now()
);

-- Which dashboard user may manage which guild.
create table if not exists public.xd_guild_members (
  guild_id text not null references public.xd_guilds(id) on delete cascade,
  user_id uuid not null references public.xd_user_profiles(id) on delete cascade,
  role text not null default 'moderator'
    check (role in ('owner', 'admin', 'moderator')),
  primary key (guild_id, user_id)
);

create table if not exists public.xd_channels (
  id text primary key,
  guild_id text not null references public.xd_guilds(id) on delete cascade,
  name text not null,
  category text not null default 'Community',
  type text not null default 'text'
    check (type in ('text', 'announcement', 'voice', 'forum')),
  can_post boolean not null default true,
  position int not null default 0
);

/* ------------------------------- messaging -------------------------------- */

create table if not exists public.xd_messages (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null references public.xd_guilds(id) on delete cascade,
  channel_id text not null references public.xd_channels(id) on delete cascade,
  channel_name text not null,
  content text not null default '',
  embed jsonb,
  status text not null default 'sent'
    check (status in ('sent', 'scheduled', 'failed', 'canceled')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  author text not null default 'dashboard',
  error text,
  discord_message_id text,
  created_at timestamptz not null default now()
);

create index if not exists xd_messages_due_idx
  on public.xd_messages (scheduled_for) where status = 'scheduled';
create index if not exists xd_messages_guild_idx
  on public.xd_messages (guild_id, created_at desc);

/* -------------------------------- automod --------------------------------- */

create table if not exists public.xd_automod_rules (
  id text primary key,
  guild_id text not null references public.xd_guilds(id) on delete cascade,
  kind text not null,
  name text not null,
  description text not null default '',
  enabled boolean not null default true,
  threshold int not null default 1,
  action text not null default 'delete'
    check (action in ('delete', 'warn', 'timeout', 'log')),
  timeout_minutes int not null default 10,
  terms jsonb not null default '[]'::jsonb,
  triggers_24h int not null default 0
);

create table if not exists public.xd_mod_actions (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null references public.xd_guilds(id) on delete cascade,
  type text not null check (type in ('warn', 'timeout', 'kick', 'ban', 'unban', 'automod')),
  target_id text not null,
  target_name text not null,
  moderator text not null,
  reason text not null default '',
  duration text,
  created_at timestamptz not null default now()
);

create index if not exists xd_mod_actions_guild_idx
  on public.xd_mod_actions (guild_id, created_at desc);

/* -------------------------------- commands -------------------------------- */

create table if not exists public.xd_bot_commands (
  id text primary key,
  guild_id text not null references public.xd_guilds(id) on delete cascade,
  name text not null,
  description text not null default '',
  enabled boolean not null default true,
  response text not null default '',
  admin_only boolean not null default false,
  runs_7d int not null default 0
);

create table if not exists public.xd_guild_settings (
  guild_id text primary key references public.xd_guilds(id) on delete cascade,
  log_channel_id text,
  alert_channel_id text,
  timezone text not null default 'UTC',
  automod_dm boolean not null default true,
  mention_alert_role text
);

create table if not exists public.xd_bot_status (
  id text primary key default 'singleton',
  online boolean not null default false,
  latency_ms int not null default 0,
  uptime_seconds int not null default 0,
  guild_count int not null default 0,
  tag text not null default 'xDiscord',
  heartbeat_at timestamptz not null default now()
);

/* ------------------------------ row level security ------------------------ */

alter table public.xd_user_profiles enable row level security;
alter table public.xd_guilds enable row level security;
alter table public.xd_guild_members enable row level security;
alter table public.xd_channels enable row level security;
alter table public.xd_messages enable row level security;
alter table public.xd_automod_rules enable row level security;
alter table public.xd_mod_actions enable row level security;
alter table public.xd_bot_commands enable row level security;
alter table public.xd_guild_settings enable row level security;
alter table public.xd_bot_status enable row level security;

-- Read: any guild you are a member of.
drop policy if exists "xd read own guilds" on public.xd_guilds;
create policy "xd read own guilds" on public.xd_guilds for select
  using (
    exists (
      select 1 from public.xd_guild_members m
      where m.guild_id = xd_guilds.id and m.user_id = auth.uid()
    )
  );

-- Update: owner/admin only (bot install flag, counts, name).
drop policy if exists "xd manage own guilds" on public.xd_guilds;
create policy "xd manage own guilds" on public.xd_guilds for update
  using (
    exists (
      select 1 from public.xd_guild_members m
      where m.guild_id = xd_guilds.id and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

drop policy if exists "xd read own memberships" on public.xd_guild_members;
create policy "xd read own memberships" on public.xd_guild_members for select
  using (user_id = auth.uid());

drop policy if exists "xd read own profile" on public.xd_user_profiles;
create policy "xd read own profile" on public.xd_user_profiles for select
  using (id = auth.uid());

drop policy if exists "xd update own profile" on public.xd_user_profiles;
create policy "xd update own profile" on public.xd_user_profiles for update
  using (id = auth.uid());

drop policy if exists "xd read bot status" on public.xd_bot_status;
create policy "xd read bot status" on public.xd_bot_status for select using (true);

/* Child tables: members read, owner/admin write. */

drop policy if exists "xd read channels" on public.xd_channels;
create policy "xd read channels" on public.xd_channels for select using (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_channels.guild_id and m.user_id = auth.uid())
);
drop policy if exists "xd write channels" on public.xd_channels;
create policy "xd write channels" on public.xd_channels for all using (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_channels.guild_id and m.user_id = auth.uid()
            and m.role in ('owner', 'admin'))
) with check (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_channels.guild_id and m.user_id = auth.uid()
            and m.role in ('owner', 'admin'))
);

drop policy if exists "xd read messages" on public.xd_messages;
create policy "xd read messages" on public.xd_messages for select using (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_messages.guild_id and m.user_id = auth.uid())
);
drop policy if exists "xd write messages" on public.xd_messages;
create policy "xd write messages" on public.xd_messages for all using (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_messages.guild_id and m.user_id = auth.uid()
            and m.role in ('owner', 'admin'))
) with check (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_messages.guild_id and m.user_id = auth.uid()
            and m.role in ('owner', 'admin'))
);

drop policy if exists "xd read rules" on public.xd_automod_rules;
create policy "xd read rules" on public.xd_automod_rules for select using (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_automod_rules.guild_id and m.user_id = auth.uid())
);
drop policy if exists "xd write rules" on public.xd_automod_rules;
create policy "xd write rules" on public.xd_automod_rules for all using (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_automod_rules.guild_id and m.user_id = auth.uid()
            and m.role in ('owner', 'admin'))
) with check (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_automod_rules.guild_id and m.user_id = auth.uid()
            and m.role in ('owner', 'admin'))
);

drop policy if exists "xd read mod actions" on public.xd_mod_actions;
create policy "xd read mod actions" on public.xd_mod_actions for select using (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_mod_actions.guild_id and m.user_id = auth.uid())
);
drop policy if exists "xd write mod actions" on public.xd_mod_actions;
create policy "xd write mod actions" on public.xd_mod_actions for insert with check (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_mod_actions.guild_id and m.user_id = auth.uid())
);
-- Cases are immutable once written: no update or delete policy on purpose.

drop policy if exists "xd read commands" on public.xd_bot_commands;
create policy "xd read commands" on public.xd_bot_commands for select using (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_bot_commands.guild_id and m.user_id = auth.uid())
);
drop policy if exists "xd write commands" on public.xd_bot_commands;
create policy "xd write commands" on public.xd_bot_commands for all using (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_bot_commands.guild_id and m.user_id = auth.uid()
            and m.role in ('owner', 'admin'))
) with check (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_bot_commands.guild_id and m.user_id = auth.uid()
            and m.role in ('owner', 'admin'))
);

drop policy if exists "xd read settings" on public.xd_guild_settings;
create policy "xd read settings" on public.xd_guild_settings for select using (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_guild_settings.guild_id and m.user_id = auth.uid())
);
drop policy if exists "xd write settings" on public.xd_guild_settings;
create policy "xd write settings" on public.xd_guild_settings for all using (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_guild_settings.guild_id and m.user_id = auth.uid()
            and m.role in ('owner', 'admin'))
) with check (
  exists (select 1 from public.xd_guild_members m
          where m.guild_id = xd_guild_settings.guild_id and m.user_id = auth.uid()
            and m.role in ('owner', 'admin'))
);
