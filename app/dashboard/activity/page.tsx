import Link from "next/link";
import { MessageSquare, ShieldAlert, ShieldCheck, Command } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { GuildIcon } from "@/components/ui/guild-icon";
import { loadShell } from "@/lib/data";
import { getRepo } from "@/lib/repo";
import { relativeTime } from "@/lib/utils";

export const metadata = { title: "Activity" };

const KIND = {
  message: { icon: MessageSquare, tone: "mint" as const, label: "Message" },
  automod: { icon: ShieldCheck, tone: "amber" as const, label: "AutoMod" },
  moderation: { icon: ShieldAlert, tone: "coral" as const, label: "Moderation" },
  command: { icon: Command, tone: "violet" as const, label: "Command" },
};

export default async function ActivityPage() {
  const { guilds } = await loadShell();
  const repo = await getRepo();

  const feeds = await Promise.all(
    guilds.map(async (g) => ({ guild: g, items: await repo.recentActivity(g.id, 12) })),
  );

  const items = feeds
    .flatMap(({ guild, items: list }) => list.map((item) => ({ ...item, guild })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 60);

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Workspace"
        title="Activity feed"
        description="A single chronological ledger of messages, AutoMod catches and moderation across every server you manage."
        actions={<Badge tone="violet">{items.length} events</Badge>}
      />

      <div className="panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/7 px-4 py-2.5">
          <span className="status-dot" data-online />
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mist-400">Live ledger</p>
          <span className="ml-auto text-[11px] text-mist-500">newest first</span>
        </div>

        <ul className="divide-y divide-white/5">
          {items.map((item) => {
            const meta = KIND[item.kind];
            const Icon = meta.icon;
            return (
              <li key={`${item.guild.id}-${item.id}`} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      item.kind === "message"
                        ? "text-mint"
                        : item.kind === "automod"
                          ? "text-amber"
                          : item.kind === "moderation"
                            ? "text-coral"
                            : "text-violet"
                    }`}
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-medium text-white">{item.title}</p>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-mist-400">{item.detail}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                  <Link
                    href={`/dashboard/${item.guild.id}`}
                    className="hidden items-center gap-1.5 text-[11px] text-mist-400 transition hover:text-white sm:flex"
                  >
                    <GuildIcon
                      name={item.guild.name}
                      initials={item.guild.initials}
                      accent={item.guild.accent}
                      iconUrl={item.guild.iconUrl}
                      size="sm"
                      className="[&>span]:h-4 [&>span]:w-4 [&>span]:rounded [&>span]:text-[8px]"
                    />
                    {item.guild.name}
                  </Link>
                  <span className="w-16 text-right text-[11px] text-mist-500">{relativeTime(item.at)}</span>
                </div>
              </li>
            );
          })}
          {items.length === 0 ? (
            <li className="px-4 py-16 text-center text-[13px] text-mist-500">
              Nothing here yet — activity appears as soon as the bot posts or AutoMod fires.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
