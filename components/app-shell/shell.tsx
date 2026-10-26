"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Command,
  ExternalLink,
  LayoutGrid,
  LogOut,
  Megaphone,
  Menu,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { GuildSwitcher } from "@/components/app-shell/guild-switcher";
import { CommandPalette } from "@/components/app-shell/command-palette";
import { GuildIcon } from "@/components/ui/guild-icon";
import { Badge } from "@/components/ui/badge";
import { cn, formatDuration, formatNumber } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import type { BotStatus, Guild, SessionUser } from "@/lib/types";

const NAV = [
  { slug: "", label: "Overview", icon: Activity },
  { slug: "messages", label: "Messages", icon: Megaphone },
  { slug: "automod", label: "AutoMod", icon: ShieldCheck },
  { slug: "moderation", label: "Moderation", icon: ShieldAlert },
  { slug: "commands", label: "Commands", icon: Command },
  { slug: "settings", label: "Settings", icon: Settings2 },
] as const;

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#8b7bff] via-[#6a5cff] to-[#4a45e0] shadow-lg shadow-violet/30">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="currentColor" aria-hidden>
          <path d="M9.2 6.1a1 1 0 0 1 .9-.6h3.8a1 1 0 0 1 .9.6l3.6 8.4a1 1 0 0 1-.1 1l-2.3 2.9a1 1 0 0 1-.8.4h-6.4a1 1 0 0 1-.8-.4l-2.3-2.9a1 1 0 0 1-.1-1l3.6-8.4Z" />
          <circle cx="14.4" cy="12" r="1.4" fill="#3b35c9" />
          <circle cx="9.6" cy="12" r="1.4" fill="#3b35c9" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight text-white">x-Discord</span>
        <span className="block text-[10.5px] font-medium uppercase tracking-[0.14em] text-mist-500">
          Control deck
        </span>
      </span>
    </Link>
  );
}

function BotStatusCard({ status, demo }: { status: BotStatus; demo: boolean }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-mist-400">
          <span className="status-dot" data-online={status.online} />
          Bot {status.online ? "online" : "offline"}
        </span>
        {demo ? <Badge tone="violet">demo</Badge> : null}
      </div>
      <dl className="mt-2.5 grid grid-cols-2 gap-y-1.5 text-[11px]">
        <dt className="text-mist-500">Latency</dt>
        <dd className="text-right font-mono text-mist-200">{status.latencyMs}ms</dd>
        <dt className="text-mist-500">Uptime</dt>
        <dd className="text-right font-mono text-mist-200">{formatDuration(status.uptimeSeconds)}</dd>
        <dt className="text-mist-500">Servers</dt>
        <dd className="text-right font-mono text-mist-200">{status.guildCount}</dd>
      </dl>
    </div>
  );
}

export function AppShell({
  user,
  guilds,
  botStatus,
  demo,
  inviteUrl,
  children,
}: {
  user: SessionUser;
  guilds: Guild[];
  botStatus: BotStatus;
  demo: boolean;
  inviteUrl: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  // The active server is derived from the URL so one layout can serve every
  // nested route without prop drilling.
  const activeGuild = guilds.find((g) => pathname.startsWith(`/dashboard/${g.id}`)) ?? null;

  useEffect(() => setDrawer(false), [pathname]);

  const base = activeGuild ? `/dashboard/${activeGuild.id}` : "";
  const currentLabel = activeGuild
    ? (NAV.find((n) => (n.slug === "" ? base === pathname : pathname === `${base}/${n.slug}`))?.label ??
      "Overview")
    : "All servers";

  const sidebar = (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between px-1 pt-1">
        <Brand />
        <button
          className="rounded-lg p-1.5 text-mist-400 hover:bg-white/6 hover:text-white lg:hidden"
          onClick={() => setDrawer(false)}
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <GuildSwitcher guilds={guilds} activeGuild={activeGuild} inviteUrl={inviteUrl} />

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto pt-1" aria-label="Server sections">
        {activeGuild ? (
          <>
            <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-mist-500">
              Manage
            </p>
            {NAV.map((item) => {
              const href = `${base}${item.slug ? `/${item.slug}` : ""}`;
              const active = pathname === href;
              const Icon = item.icon;
              return (
                <Link key={item.slug} href={href} className="nav-item" data-active={active}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.slug === "automod" ? (
                    <Badge tone="mint" className="!px-1.5 !py-0 !text-[10px]">
                      on
                    </Badge>
                  ) : null}
                </Link>
              );
            })}
          </>
        ) : (
          <>
            <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-mist-500">
              Workspace
            </p>
            <Link href="/dashboard" className="nav-item" data-active={pathname === "/dashboard"}>
              <LayoutGrid className="h-4 w-4" /> All servers
            </Link>
            <Link href="/dashboard/activity" className="nav-item" data-active={pathname === "/dashboard/activity"}>
              <Sparkles className="h-4 w-4" /> Activity feed
            </Link>
          </>
        )}

        <div className="divider my-2" />

        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mist-500">
          Servers
        </p>
        {guilds.slice(0, 5).map((g) => (
          <Link
            key={g.id}
            href={`/dashboard/${g.id}`}
            className="nav-item"
            data-active={g.id === activeGuild?.id}
          >
            <GuildIcon
              name={g.name}
              initials={g.initials}
              accent={g.accent}
              iconUrl={g.iconUrl}
              size="sm"
              className="h-5 w-5 rounded-md text-[9px] [&>span]:h-5 [&>span]:w-5 [&>span]:rounded-md [&>span]:text-[9px]"
            />
            <span className="flex-1 truncate">{g.name}</span>
          </Link>
        ))}
        <a
          href={inviteUrl}
          target="_blank"
          rel="noreferrer"
          className="nav-item text-mist-500"
        >
          <Plus className="h-4 w-4" /> Add a server
        </a>
      </nav>

      <BotStatusCard status={botStatus} demo={demo} />

      <div className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] p-2">
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-[11px] font-semibold text-white ring-1 ring-white/10"
          style={{ background: `linear-gradient(145deg, ${user.accent}, #2a2750)` }}
        >
          {user.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium text-white">{user.displayName}</p>
          <p className="truncate text-[11px] text-mist-500">@{user.username}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg p-1.5 text-mist-400 transition hover:bg-white/6 hover:text-white"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="app-bg min-h-screen">
      <CommandPalette guilds={guilds} activeGuild={activeGuild} />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-white/7 bg-ink-850/85 backdrop-blur-xl lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="animate-rise absolute inset-y-0 left-0 w-[290px] border-r border-white/8 bg-ink-850">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-white/7 bg-ink-900/80 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
            <button
              className="rounded-lg p-1.5 text-mist-300 hover:bg-white/6 hover:text-white lg:hidden"
              onClick={() => setDrawer(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
              <Link href="/dashboard" className="hidden text-mist-500 transition hover:text-mist-200 sm:block">
                Workspace
              </Link>
              <span className="hidden text-mist-600 sm:block">/</span>
              {activeGuild ? (
                <Link
                  href={`/dashboard/${activeGuild.id}`}
                  className="hidden truncate text-mist-400 transition hover:text-mist-200 sm:block"
                >
                  {activeGuild.name}
                </Link>
              ) : null}
              <span className="hidden text-mist-600 sm:block">/</span>
              <span className="truncate font-medium text-white">{currentLabel}</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => window.dispatchEvent(new Event("xd:open-palette"))}
                className="group hidden items-center gap-2 rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-mist-400 transition hover:border-white/15 hover:text-mist-100 sm:flex"
                aria-label="Open command palette"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Quick jump</span>
                <kbd className="ml-2 rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[10px]">
                  ⌘K
                </kbd>
              </button>

              <Badge tone={demo ? "violet" : "mint"} dot className="hidden md:inline-flex">
                {demo ? "Demo workspace" : "Live"}
              </Badge>

              <a
                href={inviteUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost !px-2.5 !py-1.5 !text-[12px]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Invite bot</span>
                <ExternalLink className="hidden h-3 w-3 sm:inline" />
              </a>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1240px] px-3 py-5 sm:px-5 sm:py-7">{children}</main>

        <footer className="mx-auto w-full max-w-[1240px] px-3 pb-8 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/6 pt-4 text-[11px] text-mist-500">
            <span>
              x-Discord · {demo ? "demo dataset" : "live"} · {formatNumber(botStatus.commandsRegistered)}{" "}
              commands registered
            </span>
            <span className="font-mono">{botStatus.tag}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
