"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bot,
  Command,
  Hash,
  Megaphone,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Guild } from "@/lib/types";

type Item = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
};

const PAGES = [
  { slug: "", label: "Overview", icon: Activity, hint: "Health, activity and quick actions" },
  { slug: "messages", label: "Messages", icon: Megaphone, hint: "Compose, schedule and broadcast" },
  { slug: "automod", label: "AutoMod", icon: ShieldCheck, hint: "Spam, links and word filters" },
  { slug: "moderation", label: "Moderation", icon: ShieldAlert, hint: "Cases, warnings and timeouts" },
  { slug: "commands", label: "Commands", icon: Command, hint: "Slash command behaviour" },
  { slug: "settings", label: "Settings", icon: Settings2, hint: "Logs, timezone and bot access" },
] as const;

export function CommandPalette({
  guilds,
  activeGuild,
}: {
  guilds: Guild[];
  activeGuild: Guild | null;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("xd:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("xd:open-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const pageItems: Item[] = activeGuild
      ? PAGES.map((p) => ({
          id: `page-${p.slug || "overview"}`,
          label: p.label,
          hint: p.hint,
          group: activeGuild.name,
          icon: p.icon,
          href: `/dashboard/${activeGuild.id}${p.slug ? `/${p.slug}` : ""}`,
        }))
      : [
          {
            id: "all-servers",
            label: "All servers",
            hint: "Portfolio overview",
            group: "Navigation",
            icon: Bot,
            href: "/dashboard",
          },
        ];

    const guildItems: Item[] = guilds.map((g) => ({
      id: `guild-${g.id}`,
      label: g.name,
      hint: g.botInstalled ? "Manage server" : "Bot not installed",
      group: "Servers",
      icon: Hash,
      href: `/dashboard/${g.id}`,
    }));

    return [...pageItems, ...guildItems];
  }, [activeGuild, guilds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.hint ?? "").toLowerCase().includes(q) ||
        i.group.toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  const run = (item: Item) => {
    setOpen(false);
    router.push(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (filtered.length ? (c + 1) % filtered.length : 0));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (filtered.length ? (c - 1 + filtered.length) % filtered.length : 0));
    }
    if (e.key === "Enter" && filtered[cursor]) {
      e.preventDefault();
      run(filtered[cursor]);
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center px-4 pt-[12vh]">
      <div
        className="absolute inset-0 bg-ink-950/75 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-xl animate-rise overflow-hidden rounded-2xl border border-white/12 bg-ink-800/95 shadow-2xl shadow-black/70"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2.5 border-b border-white/8 px-4 py-3">
          <Search className="h-4 w-4 text-mist-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a server, page or setting…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-mist-500"
            aria-label="Search commands"
          />
          <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-mist-400">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-mist-500">Nothing found. Try “messages”.</p>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon;
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <div key={item.id}>
                  {showGroup ? (
                    <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-mist-500">
                      {item.group}
                    </p>
                  ) : null}
                  <button
                    data-index={i}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => run(item)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition",
                      i === cursor ? "bg-violet/18 text-white" : "text-mist-200 hover:bg-white/5",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-mist-400" />
                    <span className="flex-1 truncate text-[13px] font-medium">{item.label}</span>
                    {item.hint ? (
                      <span className="hidden truncate text-[11px] text-mist-500 sm:block">{item.hint}</span>
                    ) : null}
                    {i === cursor ? <CornerDownLeft className="h-3.5 w-3.5 text-mist-400" /> : null}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/8 px-4 py-2 text-[11px] text-mist-500">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[10px]">↑</kbd>
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[10px]">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[10px]">↵</kbd>
              open
            </span>
          </span>
          <span className="flex items-center gap-1">
            <ArrowRight className="h-3 w-3" /> {filtered.length} results
          </span>
        </div>
      </div>
    </div>
  );
}
