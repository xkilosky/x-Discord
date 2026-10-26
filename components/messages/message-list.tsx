"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  Hash,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
  Undo2,
  XCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { cancelScheduledMessage, deleteMessageRecord, retryMessage } from "@/app/actions/guild";
import { cn, countdown, formatDateTime, relativeTime } from "@/lib/utils";
import type { MessageRecord } from "@/lib/types";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "scheduled", label: "Scheduled" },
  { key: "sent", label: "Sent" },
  { key: "failed", label: "Failed" },
] as const;

export function MessageList({
  messages,
  timezone,
}: {
  messages: MessageRecord[];
  timezone: string;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: messages.length,
      scheduled: messages.filter((m) => m.status === "scheduled").length,
      sent: messages.filter((m) => m.status === "sent").length,
      failed: messages.filter((m) => m.status === "failed").length,
    }),
    [messages],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages.filter((m) => {
      const matchesFilter = filter === "all" || m.status === filter;
      const matchesQuery =
        !q || m.content.toLowerCase().includes(q) || m.channelName.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [messages, filter, query]);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/7 p-3">
        <div className="flex items-center gap-0.5 rounded-lg border border-white/8 bg-ink-850 p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
                filter === f.key ? "bg-violet/25 text-white" : "text-mist-400 hover:text-mist-200",
              )}
            >
              {f.label}
              <span className="ml-1 font-mono text-[10px] text-mist-500">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        <div className="relative ml-auto w-full sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mist-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages…"
            aria-label="Search messages"
            className="input !py-1.5 !pl-8 !text-[12px]"
          />
        </div>
      </div>

      <ul className="divide-y divide-white/5">
        {visible.map((m) => (
          <li key={m.id} className="relative px-3 py-3 transition hover:bg-white/[0.02]">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-mist-400">
                <Hash className="h-3.5 w-3.5" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[12.5px] font-medium text-white">#{m.channelName}</p>
                  <StatusBadge status={m.status} />
                  {m.embed ? (
                    <span className="chip border-white/8 bg-white/[0.04] text-mist-400">embed</span>
                  ) : null}
                  <span className="ml-auto flex shrink-0 items-center gap-1 text-[10.5px] text-mist-500">
                    {m.status === "scheduled" && m.scheduledFor ? (
                      <>
                        <CalendarClock className="h-2.5 w-2.5" />
                        {countdown(m.scheduledFor)} · {formatDateTime(m.scheduledFor, timezone)}
                      </>
                    ) : m.sentAt ? (
                      relativeTime(m.sentAt)
                    ) : (
                      relativeTime(m.createdAt)
                    )}
                  </span>
                </div>

                <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-mist-300">
                  {m.content.replace(/\*\*/g, "") || m.embed?.title || "(empty)"}
                </p>

                {m.error ? (
                  <p className="mt-1.5 rounded-md border border-coral/25 bg-coral/8 px-2 py-1 text-[11px] text-[#ffb3b9]">
                    {m.error}
                  </p>
                ) : null}

                <p className="mt-1 text-[10px] text-mist-600">
                  by {m.author}
                  {m.scheduledFor && m.status === "scheduled"
                    ? ` · created ${relativeTime(m.createdAt)}`
                    : ""}
                </p>
              </div>

              <div className="relative shrink-0">
                <button
                  onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                  className="rounded-lg p-1.5 text-mist-500 transition hover:bg-white/6 hover:text-white"
                  aria-label="Message actions"
                  aria-expanded={openMenu === m.id}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {openMenu === m.id ? (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} aria-hidden />
                    <div className="absolute right-0 top-8 z-20 w-44 animate-rise overflow-hidden rounded-xl border border-white/10 bg-ink-750 shadow-2xl">
                      {m.status === "scheduled" ? (
                        <form action={cancelScheduledMessage}>
                          <input type="hidden" name="id" value={m.id} />
                          <input type="hidden" name="guildId" value={m.guildId} />
                          <button
                            type="submit"
                            onClick={() => setOpenMenu(null)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-mist-200 transition hover:bg-white/6 hover:text-white"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Cancel send
                          </button>
                        </form>
                      ) : null}

                      {m.status === "failed" ? (
                        <form action={retryMessage}>
                          <input type="hidden" name="id" value={m.id} />
                          <input type="hidden" name="guildId" value={m.guildId} />
                          <input type="hidden" name="channelId" value={m.channelId} />
                          <input type="hidden" name="content" value={m.content} />
                          <button
                            type="submit"
                            onClick={() => setOpenMenu(null)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-mist-200 transition hover:bg-white/6 hover:text-white"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Retry delivery
                          </button>
                        </form>
                      ) : null}

                      {m.status === "canceled" ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-[11.5px] text-mist-500">
                          <Undo2 className="h-3.5 w-3.5" /> Canceled — re-queue from composer
                        </div>
                      ) : null}

                      <form action={deleteMessageRecord}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="guildId" value={m.guildId} />
                        <button
                          type="submit"
                          onClick={() => setOpenMenu(null)}
                          className="flex w-full items-center gap-2 border-t border-white/7 px-3 py-2 text-left text-[12px] text-[#ffb3b9] transition hover:bg-coral/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove from log
                        </button>
                      </form>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        ))}

        {visible.length === 0 ? (
          <li className="px-4 py-14 text-center">
            <p className="text-[13px] font-medium text-mist-300">Nothing here</p>
            <p className="mt-1 text-[12px] text-mist-500">
              {query ? "Try a different search." : "Send a message to start the log."}
            </p>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
