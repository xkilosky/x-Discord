import { Bot, ExternalLink, ShieldCheck, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { GuildIcon } from "@/components/ui/guild-icon";
import { SettingsForm } from "@/components/settings/settings-form";
import { loadGuildBundle } from "@/lib/data";
import { botInviteUrl, DEMO_MODE, hasBotToken, serverEnv } from "@/lib/env";
import { formatNumber } from "@/lib/utils";
import { installBot } from "@/app/actions/guild";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const { guild, channels, settings, rules, commands } = await loadGuildBundle(guildId);
  const invite = botInviteUrl(guild.id);

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Configuration"
        title="Server settings"
        description="Routing, timezone and bot access for this server. Changes are applied the moment you save."
        actions={
          <Badge tone={guild.botInstalled ? "mint" : "amber"} dot>
            {guild.botInstalled ? "bot installed" : "bot missing"}
          </Badge>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <SettingsForm guild={guild} channels={channels} settings={settings} />

          <section className="panel p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-violet" />
              <h2 className="text-[13.5px] font-semibold text-white">Access</h2>
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-mist-500">
              Dashboard access mirrors Discord permissions. Anyone with <strong>Manage Server</strong>{" "}
              sees this server; moderators get the moderation console but cannot change routing.
            </p>

            <div className="mt-3 space-y-1.5">
              {[
                { role: "Owner", who: "you", note: "full control" },
                { role: "Admin", who: "2 accounts", note: "everything except deletion" },
                { role: "Moderator", who: "9 accounts", note: "cases + AutoMod view" },
              ].map((row) => (
                <div
                  key={row.role}
                  className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/[0.02] px-2.5 py-1.5"
                >
                  <span className="w-20 text-[11.5px] font-medium text-mist-200">{row.role}</span>
                  <span className="text-[11.5px] text-mist-400">{row.who}</span>
                  <span className="ml-auto text-[10.5px] text-mist-500">{row.note}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel border-coral/20 p-4">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-coral" />
              <h2 className="text-[13.5px] font-semibold text-white">Danger zone</h2>
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-mist-400">
              Removing the bot stops scheduled sends and AutoMod. The case log stays intact for 30
              days in case you change your mind.
            </p>
            <button
              type="button"
              disabled
              className="btn btn-danger mt-3 !py-2 !text-[12.5px]"
              title="Requires Discord Manage Server permission"
            >
              Remove bot from {guild.name}
            </button>
            <p className="mt-1.5 text-[10.5px] text-mist-500">
              Disabled here — removal is done from Discord&apos;s Integrations page.
            </p>
          </section>
        </div>

        <aside className="space-y-3">
          <section className="panel p-4">
            <div className="flex items-center gap-3">
              <GuildIcon
                name={guild.name}
                initials={guild.initials}
                accent={guild.accent}
                iconUrl={guild.iconUrl}
                size="lg"
                online={guild.botInstalled}
              />
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-white">{guild.name}</p>
                <p className="text-[11px] text-mist-500">
                  {formatNumber(guild.memberCount)} members · {guild.viewerRole}
                </p>
              </div>
            </div>

            <dl className="mt-3 space-y-1.5 text-[11.5px]">
              <div className="flex justify-between">
                <dt className="text-mist-500">Server ID</dt>
                <dd className="font-mono text-[10.5px] text-mist-300">{guild.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-mist-500">AutoMod rules</dt>
                <dd className="text-mist-300">
                  {rules.filter((r) => r.enabled).length}/{rules.length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-mist-500">Commands</dt>
                <dd className="text-mist-300">{commands.filter((c) => c.enabled).length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-mist-500">Channels</dt>
                <dd className="text-mist-300">{channels.length}</dd>
              </div>
            </dl>
          </section>

          <section className="panel p-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-violet" />
              <h2 className="text-[13.5px] font-semibold text-white">Bot access</h2>
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-mist-500">
              The bot needs Manage Server, Send Messages, Manage Messages, Moderate Members and Read
              Message History. Nothing else is requested.
            </p>

            <div className="mt-2.5 flex items-center gap-1.5">
              <Badge tone={hasBotToken ? "mint" : "amber"} dot>
                {hasBotToken ? "token configured" : "token missing"}
              </Badge>
              <Badge tone={serverEnv.discordClientId ? "mint" : "amber"}>
                {serverEnv.discordClientId ? "client id set" : "client id missing"}
              </Badge>
            </div>

            {!guild.botInstalled ? (
              <form action={installBot} className="mt-3">
                <input type="hidden" name="guildId" value={guild.id} />
                <button type="submit" className="btn btn-primary w-full !py-2 !text-[12.5px]">
                  <Bot className="h-3.5 w-3.5" /> Install bot here
                </button>
              </form>
            ) : null}

            <a
              href={invite}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost mt-2 w-full !py-2 !text-[12.5px]"
            >
              Open Discord invite <ExternalLink className="h-3.5 w-3.5" />
            </a>

            {DEMO_MODE ? (
              <p className="mt-2 text-[10.5px] leading-relaxed text-mist-500">
                Demo mode: installing only updates this dashboard. Set DISCORD_BOT_TOKEN and
                DISCORD_CLIENT_ID to make the invite real.
              </p>
            ) : null}
          </section>

          <section className="panel-flat flex items-start gap-2.5 p-3.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
            <p className="text-[11.5px] leading-relaxed text-mist-500">
              Bot tokens live only in server-side env vars. The dashboard talks to Discord through
              Next.js server actions, never from the browser.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
