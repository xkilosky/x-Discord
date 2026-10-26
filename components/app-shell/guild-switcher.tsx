"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronsUpDown, LayoutGrid, Search, Plus } from "lucide-react";
import { GuildIcon } from "@/components/ui/guild-icon";
import { Badge } from "@/components/ui/badge";
import { cn, formatNumber } from "@/lib/utils";
import type { Guild } from "@/lib/types";

export function GuildSwitcher({
  guilds,
  activeGuild,
  inviteUrl,
}: {
  guilds: Guild[];
  activeGuild: Guild | null;
  inviteUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guilds;
    return guilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [guilds, query]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.04] p-2 text-left transition",
          "hover:border-white/15 hover:bg-white/[0.07]",
          open && "border-violet/40 bg-white/[0.07]",
        )}
      >
        {activeGuild ? (
          <GuildIcon
            name={activeGuild.name}
            initials={activeGuild.initials}
            accent={activeGuild.accent}
            iconUrl={activeGuild.iconUrl}
            size="md"
          />
        ) : (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/6 text-mist-200 ring-1 ring-white/10">
            <LayoutGrid className="h-4 w-4" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-white">
            {activeGuild?.name ?? "All servers"}
          </span>
          <span className="block truncate text-[11px] text-mist-400">
            {activeGuild
              ? `${formatNumber(activeGuild.memberCount)} members · ${activeGuild.viewerRole}`
              : `${guilds.length} connected`}
          </span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-mist-500 transition group-hover:text-mist-200" />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 animate-rise overflow-hidden rounded-2xl border border-white/10 bg-ink-800/98 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="border-b border-white/7 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mist-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a server…"
                className="input !py-1.5 !pl-8 text-[13px]"
                aria-label="Search servers"
              />
            </div>
          </div>

          <ul className="max-h-72 overflow-y-auto p-1.5" role="listbox">
            {filtered.map((g) => {
              const active = g.id === activeGuild?.id;
              return (
                <li key={g.id}>
                  <button
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      router.push(`/dashboard/${g.id}`);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition",
                      active ? "bg-violet/15" : "hover:bg-white/6",
                    )}
                  >
                    <GuildIcon
                      name={g.name}
                      initials={g.initials}
                      accent={g.accent}
                      iconUrl={g.iconUrl}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-white">{g.name}</span>
                      <span className="block text-[11px] text-mist-500">
                        {formatNumber(g.memberCount)} members
                      </span>
                    </span>
                    {g.botInstalled ? (
                      active ? (
                        <Check className="h-3.5 w-3.5 text-violet" />
                      ) : null
                    ) : (
                      <Badge tone="amber" className="!text-[10px]">
                        Not added
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-mist-500">No servers match “{query}”.</li>
            ) : null}
          </ul>

          <div className="border-t border-white/7 p-1.5">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-mist-200 transition hover:bg-white/6 hover:text-white"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> All servers
            </Link>
            <a
              href={inviteUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-mist-200 transition hover:bg-white/6 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Add bot to a new server
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
