-- x-Discord schema
-- Run in the Supabase SQL editor, or `npm run db:push` with SUPABASE_DB_URL set.
--
-- Auth model: users sign in with Discord once. Supabase's Discord provider
-- creates an auth.users row; we mirror the linked Discord identity in
-- user_profiles. Server access is granted through guild_members rows that the
-- sync job fills from Discord's /users/@me/guilds response.

create extension if not exists "pgcrypto";

/* ------------------------------- identity -------------------------------- */

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_id text unique not null,
  username text not null,
  display_name text,
  avatar_url text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guilds (
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
create table if not exists public.guild_members (
  guild_id text not null references public.guilds(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  role text not null default 'moderator'
    check (role in ('owner', 'admin', 'moderator')),
  primary key (guild_id, user_id)
);

create table if not exists public.channels (
  id text primary key,
  guild_id text not null references public.guilds(id) on delete cascade,
  name text not null,
  category text not null default 'Community',
  type text not null default 'text'
    check (type in ('text', 'announcement', 'voice', 'forum')),
  can_post boolean not null default true,
  position int not null default 0
);

/* ------------------------------- messaging -------------------------------- */

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null references public.guilds(id) on delete cascade,
  channel_id text not null references public.channels(id) on delete cascade,
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

create index if not exists messages_due_idx
  on public.messages (scheduled_for) where status = 'scheduled';
create index if not exists messages_guild_idx on public.messages (guild_id, created_at desc);

/* -------------------------------- automod --------------------------------- */

create table if not exists public.automod_rules (
  id text primary key,
  guild_id text not null references public.guilds(id) on delete cascade,
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

create table if not exists public.mod_actions (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null references public.guilds(id) on delete cascade,
  type text not null check (type in ('warn', 'timeout', 'kick', 'ban', 'unban', 'automod')),
  target_id text not null,
  target_name text not null,
  moderator text not null,
  reason text not null default '',
  duration text,
  created_at timestamptz not null default now()
);

create index if not exists mod_actions_guild_idx
  on public.mod_actions (guild_id, created_at desc);

/* -------------------------------- commands -------------------------------- */

create table if not exists public.bot_commands (
  id text primary key,
  guild_id text not null references public.guilds(id) on delete cascade,
  name text not null,
  description text not null default '',
  enabled boolean not null default true,
  response text not null default '',
  admin_only boolean not null default false,
  runs_7d int not null default 0
);

create table if not exists public.guild_settings (
  guild_id text primary key references public.guilds(id) on delete cascade,
  log_channel_id text,
  alert_channel_id text,
  timezone text not null default 'UTC',
  automod_dm boolean not null default true,
  mention_alert_role text
);

create table if not exists public.bot_status (
  id text primary key default 'singleton',
  online boolean not null default false,
  latency_ms int not null default 0,
  uptime_seconds int not null default 0,
  guild_count int not null default 0,
  tag text not null default 'xDiscord',
  heartbeat_at timestamptz not null default now()
);

/* ------------------------------ row level security ------------------------ */

alter table public.user_profiles enable row level security;
alter table public.guilds enable row level security;
alter table public.guild_members enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.automod_rules enable row level security;
alter table public.mod_actions enable row level security;
alter table public.bot_commands enable row level security;
alter table public.guild_settings enable row level security;
alter table public.bot_status enable row level security;

create or replace function public.current_profile_id()
returns uuid language sql stable as $$
  select id from public.user_profiles where discord_id = (
    select coalesce(
      auth.jwt() -> 'user_metadata' ->> 'provider_id',
      auth.jwt() -> 'user_metadata' ->> 'sub'
    )
  )
$$;

-- A user can read guilds they are a member of.
drop policy if exists "read own guilds" on public.guilds;
create policy "read own guilds" on public.guilds for select
  using (
    exists (
      select 1 from public.guild_members m
      where m.guild_id = guilds.id and m.user_id = auth.uid()
    )
  );

drop policy if exists "manage own guilds" on public.guilds;
create policy "manage own guilds" on public.guilds for update
  using (
    exists (
      select 1 from public.guild_members m
      where m.guild_id = guilds.id and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- Child tables: readable by guild members, writable by admins/owners.
do $$
declare t text;
begin
  foreach t in array array['channels', 'messages', 'automod_rules', 'mod_actions',
                           'bot_commands', 'guild_settings']
  loop
    execute format('drop policy if exists "member read %1$s" on public.%1$I', t);
    execute format($f$
      create policy "member read %1$s" on public.%1$I for select using (
        exists (
          select 1 from public.guild_members m
          where m.guild_id = %1$I.guild_id and m.user_id = auth.uid()
        )
      )
    $f$, t);

    execute format('drop policy if exists "admin write %1$s" on public.%1$I', t);
    execute format($f$
      create policy "admin write %1$s" on public.%1$I for all using (
        exists (
          select 1 from public.guild_members m
          where m.guild_id = %1$I.guild_id and m.user_id = auth.uid()
            and m.role in ('owner', 'admin')
        )
      ) with check (
        exists (
          select 1 from public.guild_members m
          where m.guild_id = %1$I.guild_id and m.user_id = auth.uid()
            and m.role in ('owner', 'admin')
        )
      )
    $f$, t);
  end loop;
end $$;

drop policy if exists "read own profile" on public.user_profiles;
create policy "read own profile" on public.user_profiles for select using (id = auth.uid());

drop policy if exists "update own profile" on public.user_profiles;
create policy "update own profile" on public.user_profiles for update using (id = auth.uid());

drop policy if exists "read own memberships" on public.guild_members;
create policy "read own memberships" on public.guild_members for select using (user_id = auth.uid());

drop policy if exists "public bot status" on public.bot_status;
create policy "public bot status" on public.bot_status for select using (true);
