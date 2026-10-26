# Making x-Discord real

This is the exact sequence to go from the demo dataset to a live dashboard driving a real Discord
server. Budget ~15 minutes. You need a Discord account and a Supabase project.

Check progress any time at **`/api/health`** or the **`/setup`** page — both report what's missing.

---

## 1. Create the Discord application

1. Open <https://discord.com/developers/applications> → **New Application**, name it (e.g. `x-Discord`).
2. **OAuth2** tab → copy:
   - **Client ID** → goes in `DISCORD_CLIENT_ID`
   - **Client Secret** ("Reset Secret") → used by Supabase, *not* by the dashboard
3. Still on **OAuth2**, add these **Redirect URLs** (they must match exactly):
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   https://xcord-three.vercel.app/auth/callback
   ```
   The first one is what Supabase uses in production. Your project ref is the subdomain of your
   Supabase URL.
4. **Bot** tab → **Reset Token** → copy → `DISCORD_BOT_TOKEN`.
5. **Bot** tab → enable the **privileged intents**:
   - ✅ **Server Members Intent** (needed to look up members for kick/ban)
   - ✅ **Message Content Intent** (needed for AutoMod to read messages)
6. **Installation** tab → Install Link: **Discord Provided Link** is fine. Scopes `bot` +
   `applications.commands` are added by the invite URL the dashboard generates.

## 2. Supabase

1. Create a project (or pick one). **Free plan allows 2 projects per organization.**
2. **SQL Editor** → paste the entire contents of [`supabase/schema.sql`](../supabase/schema.sql) → Run.
   This creates `user_profiles`, `guilds`, `guild_members`, `channels`, `messages`, `automod_rules`,
   `mod_actions`, `bot_commands`, `guild_settings`, `bot_status`, plus indexes and RLS policies.
3. **Authentication → Providers → Discord** → enable, paste the **Client ID** and **Client Secret**
   from step 1. Copy the callback URL Supabase shows and make sure it is in Discord's redirect list.
4. **Authentication → URL Configuration** → set **Site URL** to your app URL, and add
   `https://<app-url>/auth/callback` under **Redirect URLs**.
5. **Project settings → API** → copy **Project URL**, **anon public** key, **service_role** key.

## 3. Environment variables

Set these on the host (Vercel → Project → Settings → Environment Variables, for Production+Preview):

| Variable | Where to get it | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API → Project URL | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → anon public | no |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role | **yes** |
| `DISCORD_BOT_TOKEN` | Discord → Bot → Reset Token | **yes** |
| `DISCORD_CLIENT_ID` | Discord → OAuth2 → Client ID | no |
| `NEXT_PUBLIC_APP_URL` | your deployment URL | no |
| `CRON_SECRET` | any long random string | **yes** |
| `BOT_DISABLED` | `1` on serverless hosts | no |

`DISCORD_CLIENT_SECRET` is only needed if you run the OAuth flow yourself; with Supabase Auth the
secret lives in the Supabase dashboard.

Changing `NEXT_PUBLIC_*` variables requires a **redeploy** — they are inlined at build time.

## 4. Verify

1. `GET /api/health` → `ready: true`, `checks.discordOAuth: true`, `database.reachable: true`.
2. Open `/` → **Sign in with Discord** → approve the consent screen.
   - Supabase creates the session, `/auth/callback` mirrors your Discord profile into
     `user_profiles` and pulls the servers where you have **Manage Server**.
   - Each server is provisioned with the default AutoMod rules, slash commands and a settings row,
     so nothing renders empty.
3. On a server card click **Invite bot** → authorize it for that guild.
4. Back in the dashboard → **Settings → Sync from Discord**. This imports real channels, registers
   slash commands and flips `bot_installed`.
5. Compose a message and send it. The log records the Discord message ID.

## 5. Running the bot

The gateway (discord.js) needs a **long-lived process**. Vercel functions cannot hold a websocket.

- **Vercel**: set `BOT_DISABLED=1`. Dashboard, composer, AutoMod config and case log still work —
  they use Discord's REST API. Scheduled sends run from `/api/scheduler/tick`.
- **A small worker** (Railway/Fly/any VPS): run the same repo with `DISCORD_BOT_TOKEN` and Supabase
  env vars, no `BOT_DISABLED`. `instrumentation.ts` boots the gateway, syncs guilds on ready, and
  ticks the scheduler every 30s.

**Cron cadence:** Vercel Hobby allows one cron per day. `vercel.json` uses `0 3 * * *`. On Pro,
change it to `* * * * *` for minute-accurate scheduled sends.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Sign-in redirects to `/setup?reason=provider` | Discord provider not enabled in Supabase |
| `redirect_uri_mismatch` at Discord | Supabase callback URL missing from Discord's redirect list |
| Dashboard empty after sign-in | You have no servers with **Manage Server**, or `guild_members` wasn't written (check service role key) |
| “The bot is not a member of this server yet” | Invite hasn't completed, or bot lacks access to that guild |
| Message send fails with `Missing Access` | Bot lacks **Send Messages** / **View Channel** in that channel |
| `listGuilds` permission error | `schema.sql` not run, so RLS policies are missing |
