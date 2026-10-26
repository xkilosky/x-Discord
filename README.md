# x-Discord

**A control room for Discord servers.** Connect your Discord account once, then manage bots,
channels, scheduled messages, AutoMod and moderation for every server you own — from a dashboard
that loads faster than the client.

Built with Next.js 16 (App Router) · TypeScript · Tailwind 4 · Supabase · discord.js 14.

---

## What it does

| Area | What you get |
| --- | --- |
| **One-time OAuth** | Sign in with Discord. `identify` + `guilds` scopes, one consent screen, ever. |
| **Multi-server rail** | Every server you can manage, live member counts, instant switching, ⌘K jump bar. |
| **Message composer** | Pick any channel the bot can reach, write markdown, attach an embed, see a Discord-accurate preview before sending. |
| **Scheduling** | Queue sends for a specific time. A scheduler delivers them even across restarts. |
| **AutoMod** | Spam, invites, banned words, caps, link allowlists, mass mentions, attachment screening — toggle and tune thresholds per server. |
| **Moderation** | Warn / timeout / kick / ban with a permanent, append-only case log. |
| **Slash commands** | Edit response text and staff-only permissions per server; registered per guild so nothing leaks between communities. |
| **Bot health** | Latency, uptime, guild count and scheduler heartbeats in the UI. |

## Two ways to run it

### 1. Demo mode — zero credentials (default)

With no env vars set, the app boots against a full in-memory dataset: 4 servers, 10 channels each,
AutoMod rules, case logs, queued announcements. Every button works — sends, schedules, toggles,
settings — they just don't leave the dashboard.

```bash
npm install
npm run dev
# → http://localhost:3000  · click "Connect Discord"
```

The demo session is a cookie. Nothing is written to disk, so a restart resets the story.

### 2. Live mode — real Discord

**a. Create the Discord application**
1. https://discord.com/developers/applications → *New Application*.
2. **OAuth2** → copy the Client ID and Client Secret; add redirect URL
   `{NEXT_PUBLIC_APP_URL}/auth/callback`.
3. **Bot** → *Reset Token* and copy it; enable **Message Content** and **Server Members** intents.

**b. Create the Supabase project**
1. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor. It creates the tables,
   indexes and row-level-security policies.
2. **Authentication → Providers → Discord**: paste the Client ID/Secret, and copy the callback URL
   Supabase gives you into the Discord app's redirects.
3. **Project settings → API**: copy the URL, anon key and service-role key.

**c. Configure and run**

```bash
cp .env.example .env.local   # fill in the values
npm run dev
```

Then open the dashboard and click **Invite bot** to add it to a server. The sync job fills
`guild_members` from the servers where you have *Manage Server*, and RLS keeps everything else out.

## Scheduling in production

Three interchangeable callers hit the same `tickScheduler()` implementation:

- **Vercel Cron** — [`vercel.json`](vercel.json) points at `/api/scheduler/tick`. It ships on a
  daily schedule because Vercel **Hobby** only allows once-per-day crons; on Pro/Enterprise change
  `schedule` to `* * * * *` for minute-accurate sends. Set `CRON_SECRET` — the route requires
  `Authorization: Bearer $CRON_SECRET`.
- **Self-hosted bot** — the bot loop ticks every 30 seconds on its own.
- **Manual** — the heartbeat chip on the Messages page runs a tick for you (demo mode).

## Where the bot lives

`instrumentation.ts` boots a discord.js gateway connection inside the same deployment, so there is
one thing to deploy. It only starts when `DISCORD_BOT_TOKEN` is present.

On serverless hosts that can't hold a socket open, set `BOT_DISABLED=1` and let the cron route
handle scheduled sends. Everything else (composing, rule changes, case logging) keeps working
because it goes through REST.

## Architecture

```
app/
  page.tsx                        landing + "Connect Discord"
  auth/callback/route.ts          OAuth exchange + guild sync
  dashboard/                      shell layout (sidebar, ⌘K palette)
    page.tsx                      all servers
    activity/page.tsx             cross-server ledger
    [guildId]/
      page.tsx                    overview: health chart, delivery log, config
      messages/page.tsx           composer + queue + log
      automod/page.tsx            rules
      moderation/page.tsx         case console
      commands/page.tsx           slash command editor
      settings/page.tsx           routing, timezone, access
  api/scheduler/tick/route.ts     cron entry point
  api/bot/status/route.ts         telemetry
  api/guilds/route.ts             servers the session can manage
app/actions/                      every mutation (server actions)

lib/
  repo.ts                         storage contract: demo ⇄ Supabase, one interface
  demo/store.ts                   in-memory dataset + mutations
  supabase/repo.ts                Postgres adapter
  supabase/server.ts              cookie client (RLS) + service-role client
  discord/rest.ts                 channel posts, command registration, moderation
  discord/sync.ts                 mirrors /users/@me/guilds into Postgres
  scheduler.ts                    delivers due messages
  bot/runtime.ts                  gateway client (lazy discord.js import)
  auth.ts                         session resolution
  types.ts                        shared domain types

supabase/schema.sql               tables, indexes, RLS policies
```

**One rule:** pages and actions never touch a database directly — they go through `getRepo()`, which
returns either the demo store or the Supabase adapter. That's why the whole UI is exercisable with
no credentials.

## Security notes

- Bot token, client secret and service-role key are server-only; none are referenced from a client
  component. `lib/discord/rest.ts` and `lib/supabase/server.ts` are marked `server-only`.
- RLS ties every guild row to a `guild_members` entry, so an authenticated user can't read a server
  they don't administer, even with a crafted request.
- Writes go through server actions, which re-check the session and revalidate the affected paths.
- Moderation cases are insert-only; there is no update path in the UI.

## Scripts

```bash
npm run dev        # dev server on 0.0.0.0:3000
npm run build      # production build
npm start          # production server
npm run typecheck  # tsc --noEmit
```

## Roadmap

- Broadcast one message to many servers at once (fan-out queue with per-channel results)
- Discord webhook ingestion for real-time AutoMod hits in the dashboard
- Message templates with variables (`{server}`, `{member_count}`)
- Reusable audit export (CSV / webhook)
- Role-based dashboard permissions independent of Discord roles

---

Not affiliated with Discord Inc. Discord is a trademark of Discord Inc.

## Hosting

The project is set up for Vercel out of the box (framework detected as Next.js, no build flags
needed). Two hosting notes:

- **Cron cadence** is limited to once per day on the Hobby plan (see above). Scheduled messages
  still queue correctly — they are delivered on the next tick, so a 24h cadence means a message
  scheduled for 09:00 may land at the daily run instead. For minute-accurate delivery run the bot
  as a long-lived worker (`BOT_DISABLED` unset) or upgrade the plan.
- **The Discord gateway cannot run on serverless functions.** Set `BOT_DISABLED=1` on the Vercel
  project and host the bot process separately; the dashboard, composer, AutoMod config and case log
  all keep working through REST.
