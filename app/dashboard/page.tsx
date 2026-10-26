import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  ChevronRight,
  Clock3,
  Hash,
  Layers,
  MessageSquare,
  Plus,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { GuildIcon } from "@/components/ui/guild-icon";
import { loadShell } from "@/lib/data";
import { getRepo } from "@/lib/repo";
import { botInviteUrl } from "@/lib/env";
import { countdown, formatNumber, relativeTime } from "@/lib/utils";
import { installBot } from "@/app/actions/guild";
import { SyncButton } from "@/components/settings/sync-button";

export const metadata = { title: "All servers" };

export default async function DashboardPage() {
  const { guilds, botStatus, demo } = await loadShell();
  const repo = await getRepo();

  const bundles = await Promise.all(guilds.map((g) => repo.getBundle(g.id)));

  const allMessages = bundles.flatMap((b) => b?.messages ?? []);
  const allActions = bundles.flatMap((b) => b?.modActions ?? []);
  const scheduled = allMessages.filter((m) => m.status === "scheduled");
  const sent7d = allMessages.filter(
    (m) => m.status === "sent" && m.sentAt && Date.now() - new Date(m.sentAt).getTime() < 7 * 86_400_000,
  );
  const automodHits = bundles.reduce(
    (sum, b) => sum + (b?.rules.reduce((s, r) => s + r.triggers24h, 0) ?? 0),
    0,
  );
  const installed = guilds.filter((g) => g.botInstalled);
  const totalMembers = guilds.reduce((s, g) => s + g.memberCount, 0);

  const upcoming = [...scheduled]
    .filter((m) => m.scheduledFor && new Date(m.scheduledFor).getTime() > Date.now())
    .sort((a, b) => (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? ""))
    .slice(0, 4);

  const recent = [...allMessages, ...allActions]
    .filter((x) => ("sentAt" in x ? x.sentAt : x.createdAt))
    .sort((a, b) => {
      const at = (x: typeof a) => ("sentAt" in x ? (x.sentAt ?? x.createdAt) : x.createdAt);
      return at(b).localeCompare(at(a));
    })
    .slice(0, 7);

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Workspace"
        title="All servers"
        description={`${installed.length} of ${guilds.length} servers have the bot installed. Everything below is scoped to servers you can manage.`}
        actions={
          <>
            <Link href="/dashboard/activity" className="btn btn-ghost !py-2 !text-[13px]">
              <Sparkles className="h-3.5 w-3.5" /> Activity
            </Link>
            <a
              href={botInviteUrl()}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary !py-2 !text-[13px]"
            >
              <Plus className="h-3.5 w-3.5" /> Add bot
            </a>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Servers"
          value={guilds.length}
          hint={`${formatNumber(totalMembers)} members reachable`}
          icon={Server}
        />
        <Stat
          label="Scheduled"
          value={scheduled.length}
          hint={upcoming[0] ? `Next ${countdown(upcoming[0].scheduledFor!)}` : "Nothing queued"}
          tone="violet"
          icon={Clock3}
        />
        <Stat
          label="Sent · 7d"
          value={sent7d.length}
          hint="Across every channel"
          tone="mint"
          icon={MessageSquare}
        />
        <Stat
          label="AutoMod · 24h"
          value={automodHits}
          hint={`${allActions.filter((a) => a.type === "automod").length} logged cases`}
          tone="amber"
          icon={ShieldCheck}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <section>
          <SectionTitle
            title="Your servers"
            hint="Open a server to manage channels, messages and moderation."
            action={
              <Badge tone={botStatus.online ? "mint" : "coral"} dot>
                bot {botStatus.online ? "online" : "offline"}
              </Badge>
            }
          />

          <div className="grid gap-2.5 sm:grid-cols-2">
            {guilds.map((g) => {
              const bundle = bundles.find((b) => b?.guild.id === g.id);
              const queued = bundle?.messages.filter((m) => m.status === "scheduled").length ?? 0;
              const enabledRules = bundle?.rules.filter((r) => r.enabled).length ?? 0;

              return (
                <article key={g.id} className="panel panel-hover flex flex-col p-4">
                  <div className="flex items-start gap-3">
                    <GuildIcon
                      name={g.name}
                      initials={g.initials}
                      accent={g.accent}
                      iconUrl={g.iconUrl}
                      size="lg"
                      online={g.botInstalled}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-[15px] font-semibold text-white">{g.name}</h3>
                        <Badge tone={g.viewerRole === "owner" ? "violet" : "neutral"}>
                          {g.viewerRole}
                        </Badge>
                      </div>
                      <p className="mt-0.5 flex items-center gap-2.5 text-[11.5px] text-mist-500">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" /> {formatNumber(g.memberCount)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                          {formatNumber(g.onlineCount)} online
                        </span>
                      </p>
                    </div>
                  </div>

                  {g.botInstalled ? (
                    <>
                      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                        {[
                          { label: "Queued", value: queued },
                          { label: "Rules on", value: enabledRules },
                          { label: "Commands", value: bundle?.commands.filter((c) => c.enabled).length ?? 0 },
                        ].map((m) => (
                          <div key={m.label} className="rounded-lg border border-white/6 bg-white/[0.02] py-1.5">
                            <p className="text-[13px] font-semibold text-white">{m.value}</p>
                            <p className="text-[9.5px] uppercase tracking-wide text-mist-500">{m.label}</p>
                          </div>
                        ))}
                      </div>
                      <Link
                        href={`/dashboard/${g.id}`}
                        className="mt-3 flex items-center justify-between rounded-lg border border-white/7 bg-white/[0.03] px-2.5 py-2 text-[12px] font-medium text-mist-200 transition hover:border-violet/35 hover:bg-violet/10 hover:text-white"
                      >
                        Manage server
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </>
                  ) : (
                    <div className="mt-3">
                      <p className="rounded-lg border border-amber/20 bg-amber/8 px-2.5 py-2 text-[11.5px] leading-relaxed text-[#f7d394]">
                        The bot isn&apos;t in this server yet. Add it to unlock messaging and AutoMod.
                      </p>
                      {demo ? (
                        <form action={installBot}>
                          <input type="hidden" name="guildId" value={g.id} />
                          <button
                            type="submit"
                            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-b from-[#7b6bff] to-[#5b57f0] px-2.5 py-2 text-[12px] font-semibold text-white transition hover:brightness-110"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add bot to {g.name}
                          </button>
                        </form>
                      ) : (
                        <div className="mt-2 space-y-1.5">
                          <a
                            href={botInviteUrl(g.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-b from-[#7b6bff] to-[#5b57f0] px-2.5 py-2 text-[12px] font-semibold text-white transition hover:brightness-110"
                          >
                            <Plus className="h-3.5 w-3.5" /> Invite bot to {g.name}
                          </a>
                          <SyncButton guildId={g.id} label="Already invited? Sync" />
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="panel p-4">
            <SectionTitle
              title="Up next"
              hint={upcoming.length ? "Scheduled sends" : "Nothing scheduled yet"}
              action={<Clock3 className="h-3.5 w-3.5 text-mist-500" />}
            />
            {upcoming.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-[12px] text-mist-500">
                Queue an announcement from any server&apos;s Messages tab.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {upcoming.map((m) => {
                  const guild = guilds.find((g) => g.id === m.guildId);
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/dashboard/${m.guildId}/messages`}
                        className="block rounded-lg border border-white/7 bg-white/[0.02] p-2.5 transition hover:border-violet/30 hover:bg-white/[0.04]"
                      >
                        <div className="flex items-center gap-1.5 text-[10.5px] text-mist-500">
                          <Hash className="h-2.5 w-2.5" />
                          <span className="truncate">{m.channelName}</span>
                          <span className="text-mist-600">·</span>
                          <span className="truncate">{guild?.name}</span>
                          <span className="ml-auto shrink-0 text-violet">{countdown(m.scheduledFor!)}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-mist-200">
                          {m.content.replace(/\*\*/g, "")}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="panel p-4">
            <SectionTitle
              title="Recent activity"
              action={
                <Link
                  href="/dashboard/activity"
                  className="text-[11px] font-medium text-violet transition hover:text-[#c9c0ff]"
                >
                  View all
                </Link>
              }
            />
            <ul className="space-y-2">
              {recent.map((item) => {
                const guild = guilds.find((g) => g.id === item.guildId);
                const isMessage = "sentAt" in item;
                const at = isMessage ? (item.sentAt ?? item.createdAt) : item.createdAt;
                return (
                  <li key={item.id} className="flex gap-2.5">
                    <span
                      className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                        isMessage ? "bg-mint/12 text-mint" : "bg-amber/12 text-amber"
                      }`}
                    >
                      {isMessage ? <MessageSquare className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] text-mist-200">
                        {isMessage
                          ? `Posted in #${item.channelName}`
                          : `${item.type} · ${item.targetName}`}
                      </p>
                      <p className="truncate text-[10.5px] text-mist-500">
                        {guild?.name} · {relativeTime(at)}
                      </p>
                    </div>
                    {isMessage ? <StatusBadge status={item.status} /> : null}
                  </li>
                );
              })}
              {recent.length === 0 ? (
                <li className="py-6 text-center text-[12px] text-mist-500">No activity yet.</li>
              ) : null}
            </ul>
          </section>

          <section className="panel p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet" />
              <p className="text-[13px] font-semibold text-white">One connection</p>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-mist-400">
              Your Discord account is linked {demo ? "(demo session)" : "with OAuth"}. The bot uses its own
              server-side token, so nothing else needs authorizing.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Badge tone="mint" dot>
                <BellRing className="h-3 w-3" /> alerts on
              </Badge>
              <Link
                href={`/dashboard/${guilds[0]?.id ?? ""}/settings`}
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-mist-300 transition hover:text-white"
              >
                Settings <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
