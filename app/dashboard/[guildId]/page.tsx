import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  CalendarClock,
  Clock3,
  Hash,
  Megaphone,
  MessageSquare,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { GuildIcon } from "@/components/ui/guild-icon";
import { HealthChart } from "@/components/charts/health-chart";
import { loadGuildBundle } from "@/lib/data";
import { getRepo } from "@/lib/repo";
import { countdown, formatNumber, relativeTime } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const bundle = await getRepo().then((r) => r.getBundle(guildId));
  return { title: bundle?.guild.name ?? "Server" };
}

export default async function GuildOverviewPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const { guild, channels, rules, messages, modActions, commands, settings } =
    await loadGuildBundle(guildId);

  const repo = await getRepo();
  const activity = await repo.recentActivity(guildId, 8);

  if (!guild) notFound();

  const textChannels = channels.filter((c) => c.type !== "voice");
  const scheduled = messages.filter((m) => m.status === "scheduled");
  const sent = messages.filter((m) => m.status === "sent");
  const failed = messages.filter((m) => m.status === "failed");
  const enabledRules = rules.filter((r) => r.enabled);
  const automodHits = rules.reduce((s, r) => s + r.triggers24h, 0);
  const nextUp = scheduled
    .filter((m) => m.scheduledFor && new Date(m.scheduledFor).getTime() > Date.now())
    .sort((a, b) => (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? ""))[0];

  const logChannel = channels.find((c) => c.id === settings.logChannelId);

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Overview"
        title={guild.name}
        description={`${guild.viewerRole === "owner" ? "You own" : `You ${guild.viewerRole === "admin" ? "administer" : "moderate"}`} this server. ${textChannels.length} text channels, ${rules.length} AutoMod filters.`}
        actions={
          <>
            <Link href={`/dashboard/${guildId}/automod`} className="btn btn-ghost !py-2 !text-[13px]">
              <ShieldCheck className="h-3.5 w-3.5" /> AutoMod
            </Link>
            <Link href={`/dashboard/${guildId}/messages`} className="btn btn-primary !py-2 !text-[13px]">
              <Megaphone className="h-3.5 w-3.5" /> Compose
            </Link>
          </>
        }
      />

      {!guild.botInstalled ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber/25 bg-amber/8 p-3.5">
          <Sparkles className="h-4 w-4 shrink-0 text-amber" />
          <p className="flex-1 text-[13px] text-[#f7d394]">
            The bot isn&apos;t in this server yet — messaging and AutoMod are read-only until it joins.
          </p>
          <Link href={`/dashboard/${guildId}/settings`} className="btn btn-ghost !py-1.5 !text-[12px]">
            Add the bot
          </Link>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Members"
          value={formatNumber(guild.memberCount)}
          hint={`${formatNumber(guild.onlineCount)} online now`}
          icon={Users}
        />
        <Stat
          label="Scheduled"
          value={scheduled.length}
          hint={nextUp ? `Next ${countdown(nextUp.scheduledFor!)}` : "Queue is empty"}
          tone="violet"
          icon={CalendarClock}
        />
        <Stat
          label="AutoMod · 24h"
          value={automodHits}
          hint={`${enabledRules.length} of ${rules.length} filters active`}
          tone="amber"
          icon={ShieldCheck}
        />
        <Stat
          label="Mod cases"
          value={modActions.length}
          hint={`${modActions.filter((a) => a.type === "automod").length} automatic`}
          tone={failed.length ? "coral" : "mint"}
          icon={Radio}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <section className="panel p-4">
            <SectionTitle
              title="Delivery health"
              hint="Messages posted vs. AutoMod catches, last 7 days"
              action={<Badge tone="mint" dot>steady</Badge>}
            />
            <HealthChart messages={messages} rules={rules} accent={guild.accent} />
          </section>

          <section className="panel p-4">
            <SectionTitle
              title="Message log"
              hint="Latest sends, schedules and failures"
              action={
                <Link
                  href={`/dashboard/${guildId}/messages`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-violet transition hover:text-[#c9c0ff]"
                >
                  Open composer <ArrowUpRight className="h-3 w-3" />
                </Link>
              }
            />

            <ul className="divide-y divide-white/5">
              {messages.slice(0, 4).map((m) => (
                <li key={m.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-mist-300">
                    <Hash className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-medium text-mist-200">#{m.channelName}</p>
                      <StatusBadge status={m.status} />
                      <span className="ml-auto shrink-0 text-[10.5px] text-mist-500">
                        {m.status === "scheduled" && m.scheduledFor
                          ? countdown(m.scheduledFor)
                          : m.sentAt
                            ? relativeTime(m.sentAt)
                            : relativeTime(m.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[12px] text-mist-500">
                      {m.content.replace(/\*\*/g, "") || m.embed?.title || "Embed"}
                    </p>
                  </div>
                </li>
              ))}
              {messages.length === 0 ? (
                <li className="py-8 text-center text-[12.5px] text-mist-500">
                  No messages yet.{" "}
                  <Link href={`/dashboard/${guildId}/messages`} className="text-violet hover:underline">
                    Send the first one
                  </Link>
                  .
                </li>
              ) : null}
            </ul>
          </section>

          <section className="panel p-4">
            <SectionTitle title="Channels the bot can reach" hint="Targets available in the composer" />
            <div className="flex flex-wrap gap-1.5">
              {channels.map((c) => (
                <span
                  key={c.id}
                  className={`chip border-white/8 ${
                    c.type === "announcement"
                      ? "bg-violet/10 text-[#c9c0ff]"
                      : c.type === "voice"
                        ? "bg-white/[0.03] text-mist-500"
                        : "bg-white/[0.04] text-mist-300"
                  }`}
                >
                  {c.type === "voice" ? <Radio className="h-2.5 w-2.5" /> : <Hash className="h-2.5 w-2.5" />}
                  {c.name}
                </span>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          {nextUp ? (
            <section className="panel border-violet/25 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-violet">
                  Next scheduled
                </p>
                <Badge tone="violet">{countdown(nextUp.scheduledFor!)}</Badge>
              </div>
              <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-mist-200">
                {nextUp.content.replace(/\*\*/g, "")}
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-mist-500">
                <Hash className="h-3 w-3" /> {nextUp.channelName}
                <span className="text-mist-600">·</span>
                <Clock3 className="h-3 w-3" />
                {new Date(nextUp.scheduledFor!).toLocaleString("en", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: settings.timezone,
                })}
              </div>
            </section>
          ) : null}

          <section className="panel p-4">
            <SectionTitle
              title="Recent activity"
              action={
                <Link
                  href="/dashboard/activity"
                  className="text-[11px] font-medium text-violet transition hover:text-[#c9c0ff]"
                >
                  All
                </Link>
              }
            />
            <ul className="space-y-2.5">
              {activity.map((item) => (
                <li key={item.id} className="flex gap-2.5">
                  <span
                    className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                      item.kind === "message" ? "bg-mint/12 text-mint" : "bg-amber/12 text-amber"
                    }`}
                  >
                    {item.kind === "message" ? (
                      <MessageSquare className="h-3 w-3" />
                    ) : (
                      <ShieldCheck className="h-3 w-3" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] text-mist-200">{item.title}</p>
                    <p className="truncate text-[10.5px] text-mist-500">{relativeTime(item.at)}</p>
                  </div>
                </li>
              ))}
              {activity.length === 0 ? (
                <li className="py-4 text-center text-[12px] text-mist-500">Quiet in here.</li>
              ) : null}
            </ul>
          </section>

          <section className="panel p-4">
            <SectionTitle title="Server config" hint="Where the bot writes logs" />
            <dl className="space-y-2 text-[12px]">
              <div className="flex items-center justify-between">
                <dt className="text-mist-500">Log channel</dt>
                <dd className="font-medium text-mist-200">
                  {logChannel ? `#${logChannel.name}` : <span className="text-amber">not set</span>}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-mist-500">Timezone</dt>
                <dd className="font-mono text-mist-200">{settings.timezone}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-mist-500">Commands on</dt>
                <dd className="text-mist-200">{commands.filter((c) => c.enabled).length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-mist-500">AutoMod DMs</dt>
                <dd className={settings.automodDm ? "text-mint" : "text-mist-500"}>
                  {settings.automodDm ? "enabled" : "off"}
                </dd>
              </div>
            </dl>
            <Link
              href={`/dashboard/${guildId}/settings`}
              className="mt-3 flex items-center justify-between rounded-lg border border-white/7 bg-white/[0.03] px-2.5 py-2 text-[12px] text-mist-200 transition hover:border-violet/35 hover:text-white"
            >
              Edit settings <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          <div className="panel flex items-center gap-3 p-4">
            <GuildIcon
              name={guild.name}
              initials={guild.initials}
              accent={guild.accent}
              iconUrl={guild.iconUrl}
              size="md"
              online={guild.botInstalled}
            />
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-medium text-white">{guild.name}</p>
              <p className="truncate font-mono text-[10.5px] text-mist-500">{guild.id}</p>
            </div>
            <Zap className="ml-auto h-4 w-4 text-mist-500" />
          </div>
        </aside>
      </div>
    </div>
  );
}
