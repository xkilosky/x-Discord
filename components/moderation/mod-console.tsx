"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  Gavel,
  Loader2,
  LogOut,
  Search,
  ShieldAlert,
  Timer,
  UserX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { applyModAction } from "@/app/actions/guild";
import { cn, relativeTime } from "@/lib/utils";
import type { Guild, ModAction, ModActionType } from "@/lib/types";

const TYPES: Array<{ value: ModActionType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "warn", label: "Warn", icon: AlertTriangle },
  { value: "timeout", label: "Timeout", icon: Timer },
  { value: "kick", label: "Kick", icon: UserX },
  { value: "ban", label: "Ban", icon: Ban },
  { value: "unban", label: "Unban", icon: LogOut },
];

const TYPE_STYLE: Record<ModActionType, { tone: "amber" | "cyan" | "coral" | "violet" | "neutral"; icon: React.ComponentType<{ className?: string }> }> = {
  warn: { tone: "amber", icon: AlertTriangle },
  timeout: { tone: "cyan", icon: Timer },
  kick: { tone: "coral", icon: UserX },
  ban: { tone: "coral", icon: Ban },
  unban: { tone: "violet", icon: LogOut },
  automod: { tone: "violet", icon: ShieldAlert },
};

function ModForm({ guild }: { guild: Guild }) {
  const [state, action, pending] = useActionState(applyModAction, null);
  const [type, setType] = useState<ModActionType>("warn");
  const { toast } = useToast();

  useEffect(() => {
    if (!state) return;
    toast(state.message, state.ok ? "success" : "error");
  }, [state, toast]);

  const destructive = type === "ban" || type === "kick";

  return (
    <form action={action} className="panel p-4">
      <input type="hidden" name="guildId" value={guild.id} />
      <input type="hidden" name="type" value={type} />

      <p className="text-[13px] font-semibold text-white">Take action</p>
      <p className="mt-0.5 text-[11.5px] text-mist-500">
        Every action is written to the case log with your username.
      </p>

      <div className="mt-3 grid grid-cols-5 gap-1 rounded-lg border border-white/8 bg-ink-850 p-0.5">
        {TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md px-1 py-1.5 text-[10.5px] font-medium transition",
                type === t.value
                  ? t.value === "ban" || t.value === "kick"
                    ? "bg-coral/20 text-[#ffb3b9]"
                    : "bg-violet/22 text-white"
                  : "text-mist-400 hover:text-mist-200",
              )}
              aria-pressed={type === t.value}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <label className="label" htmlFor="mod-target">
          Member
        </label>
        <input
          id="mod-target"
          name="target"
          placeholder="@username or 482915773012771020"
          className="input font-mono !text-[12.5px]"
          autoComplete="off"
        />
      </div>

      {type === "timeout" ? (
        <div className="mt-2.5">
          <label className="label" htmlFor="mod-minutes">
            Duration (minutes)
          </label>
          <div className="flex items-center gap-1.5">
            {[5, 10, 30, 60, 1440].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  const input = document.getElementById("mod-minutes") as HTMLInputElement | null;
                  if (input) input.value = String(m);
                }}
                className="chip border-white/8 bg-white/[0.04] text-mist-300 transition hover:text-white"
              >
                {m >= 1440 ? "24h" : `${m}m`}
              </button>
            ))}
          </div>
          <input
            id="mod-minutes"
            type="number"
            name="minutes"
            min={1}
            max={40320}
            defaultValue={10}
            className="input mt-1.5"
          />
        </div>
      ) : null}

      <div className="mt-2.5">
        <label className="label" htmlFor="mod-reason">
          Reason
        </label>
        <textarea
          id="mod-reason"
          name="reason"
          rows={2}
          placeholder="What happened? Be specific — this shows in the log."
          className="input resize-none"
        />
      </div>

      {destructive ? (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-coral/25 bg-coral/8 p-2 text-[11px] text-[#ffb3b9]">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {type === "ban" ? "Bans are applied immediately." : "Kicks remove the member right away."} In
          demo mode nothing leaves this dashboard.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={cn("btn mt-3 w-full !py-2.5 !text-[13px]", destructive ? "btn-danger" : "btn-primary")}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-3.5 w-3.5" />}
        {pending ? "Applying…" : `${TYPES.find((t) => t.value === type)?.label} member`}
      </button>
    </form>
  );
}

export function ModConsole({
  guild,
  actions,
}: {
  guild: Guild;
  actions: ModAction[];
}) {
  const [filter, setFilter] = useState<"all" | "manual" | "automod">("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: actions.length,
      manual: actions.filter((a) => a.type !== "automod").length,
      automod: actions.filter((a) => a.type === "automod").length,
    }),
    [actions],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return actions.filter((a) => {
      const matchesFilter =
        filter === "all" || (filter === "automod" ? a.type === "automod" : a.type !== "automod");
      const matchesQuery =
        !q ||
        a.targetName.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q) ||
        a.moderator.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [actions, filter, query]);

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <div className="space-y-3">
        <ModForm guild={guild} />

        <div className="panel-flat p-3.5">
          <div className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-mint" />
            <p className="text-[12px] font-medium text-mist-200">Escalation policy</p>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-mist-500">
            AutoMod handles volume. Manual actions are reserved for intent: harassment, leaks,
            advertising. Warnings expire after 90 days.
          </p>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/7 p-3">
          <div className="flex items-center gap-0.5 rounded-lg border border-white/8 bg-ink-850 p-0.5">
            {(
              [
                ["all", "All", counts.all],
                ["manual", "Manual", counts.manual],
                ["automod", "AutoMod", counts.automod],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
                  filter === key ? "bg-violet/25 text-white" : "text-mist-400 hover:text-mist-200",
                )}
              >
                {label} <span className="ml-0.5 font-mono text-[10px] text-mist-500">{count}</span>
              </button>
            ))}
          </div>

          <div className="relative ml-auto w-full sm:w-52">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mist-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Member, reason, staff…"
              aria-label="Search cases"
              className="input !py-1.5 !pl-8 !text-[12px]"
            />
          </div>
        </div>

        <ul className="divide-y divide-white/5">
          {visible.map((a) => {
            const style = TYPE_STYLE[a.type];
            const Icon = style.icon;
            return (
              <li key={a.id} className="flex items-start gap-3 px-3 py-2.5 transition hover:bg-white/[0.02]">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5",
                      a.type === "automod"
                        ? "text-violet"
                        : a.type === "warn"
                          ? "text-amber"
                          : a.type === "timeout"
                            ? "text-cyan"
                            : "text-coral",
                    )}
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[12px] font-medium text-white">{a.targetName}</span>
                    <Badge tone={style.tone}>{a.type}</Badge>
                    {a.duration ? (
                      <span className="chip border-white/8 bg-white/[0.04] text-mist-400">{a.duration}</span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-mist-400">{a.reason}</p>
                  <p className="mt-0.5 text-[10.5px] text-mist-600">
                    by {a.moderator} · {relativeTime(a.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
          {visible.length === 0 ? (
            <li className="px-4 py-14 text-center">
              <p className="text-[13px] font-medium text-mist-300">No cases match</p>
              <p className="mt-1 text-[12px] text-mist-500">
                {query ? "Try another search term." : "This server has a clean record."}
              </p>
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
