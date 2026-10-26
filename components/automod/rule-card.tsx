"use client";

import { useState, useTransition } from "react";
import {
  AtSign,
  ChevronDown,
  FileWarning,
  Flame,
  Link2,
  MessageSquareWarning,
  Save,
  ShieldQuestion,
  TextCursorInput,
  Type,
  Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MiniBars } from "@/components/charts/mini-bars";
import { useToast } from "@/components/ui/toast";
import { saveRule, toggleRule } from "@/app/actions/guild";
import { cn } from "@/lib/utils";
import type { AutomodRule } from "@/lib/types";

const ICONS: Record<AutomodRule["kind"], React.ComponentType<{ className?: string }>> = {
  spam: Flame,
  invites: Link2,
  banned_words: MessageSquareWarning,
  caps: Type,
  links: Link2,
  mentions: AtSign,
  attachments: FileWarning,
};

const THRESHOLD_LABEL: Record<AutomodRule["kind"], string> = {
  spam: "Max messages per 10s",
  invites: "Invites allowed",
  banned_words: "Matches allowed",
  caps: "Caps percentage",
  links: "Blocked links allowed",
  mentions: "Mentions per message",
  attachments: "Risky files allowed",
};

const ACTIONS: Array<{ value: AutomodRule["action"]; label: string }> = [
  { value: "delete", label: "Delete message" },
  { value: "warn", label: "Delete + warn" },
  { value: "timeout", label: "Delete + timeout" },
  { value: "log", label: "Log only" },
];

export function RuleCard({
  rule,
  guildId,
  accent,
}: {
  rule: AutomodRule;
  guildId: string;
  accent: string;
}) {
  const [on, setOn] = useState(rule.enabled);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const Icon = ICONS[rule.kind] ?? ShieldQuestion;

  const flip = (next: boolean) => {
    setOn(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("guildId", guildId);
      fd.set("ruleId", rule.id);
      fd.set("enabled", String(next));
      await toggleRule(fd);
      toast(`${rule.name} ${next ? "enabled" : "paused"}.`, next ? "success" : "info");
    });
  };

  const spark = [2, 4, 3, 6, 4, 8, Math.max(rule.triggers24h, 1)];

  return (
    <article
      className={cn(
        "panel overflow-hidden transition",
        on ? "border-white/10" : "border-white/6 opacity-80",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            on ? "border-violet/25 bg-violet/12 text-[#c9c0ff]" : "border-white/8 bg-white/4 text-mist-500",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[13.5px] font-semibold text-white">{rule.name}</h3>
            {on ? (
              <Badge tone="mint">active</Badge>
            ) : (
              <Badge tone="neutral">paused</Badge>
            )}
            {pending ? <Loader2 className="h-3 w-3 animate-spin text-violet" /> : null}
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-mist-400">{rule.description}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-[10.5px] text-mist-500">
            <span className="inline-flex items-center gap-1">
              <MiniBars values={spark} color={accent} />
              {rule.triggers24h} in 24h
            </span>
            <span className="text-mist-600">·</span>
            <span>
              {THRESHOLD_LABEL[rule.kind]}: <span className="font-mono text-mist-300">{rule.threshold}</span>
            </span>
            <span className="text-mist-600">·</span>
            <span>{ACTIONS.find((a) => a.value === rule.action)?.label}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Switch checked={on} onChange={flip} label={`Toggle ${rule.name}`} />
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-1.5 text-mist-500 transition hover:bg-white/6 hover:text-white"
            aria-label={open ? "Collapse rule settings" : "Expand rule settings"}
            aria-expanded={open}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>

      {open ? (
        <form
          action={saveRule}
          className="animate-rise border-t border-white/7 bg-ink-850/60 p-4"
        >
          <input type="hidden" name="guildId" value={guildId} />
          <input type="hidden" name="ruleId" value={rule.id} />

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor={`threshold-${rule.id}`}>
                Threshold
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`threshold-${rule.id}`}
                  type="number"
                  name="threshold"
                  min={1}
                  max={100}
                  defaultValue={rule.threshold}
                  className="input !py-1.5"
                />
                <TextCursorInput className="h-3.5 w-3.5 shrink-0 text-mist-500" />
              </div>
              <p className="mt-1 text-[10px] text-mist-500">{THRESHOLD_LABEL[rule.kind]}</p>
            </div>

            <div>
              <label className="label" htmlFor={`action-${rule.id}`}>
                Action
              </label>
              <select
                id={`action-${rule.id}`}
                name="action"
                defaultValue={rule.action}
                className="input appearance-none !py-1.5"
              >
                {ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor={`timeout-${rule.id}`}>
                Timeout length (min)
              </label>
              <input
                id={`timeout-${rule.id}`}
                type="number"
                name="timeoutMinutes"
                min={1}
                max={40320}
                defaultValue={rule.timeoutMinutes}
                className="input !py-1.5"
              />
              <p className="mt-1 text-[10px] text-mist-500">Used when the action times members out.</p>
            </div>
          </div>

          {rule.kind === "banned_words" || rule.kind === "links" || rule.kind === "attachments" ? (
            <div className="mt-3">
              <label className="label" htmlFor={`terms-${rule.id}`}>
                {rule.kind === "links" ? "Allowed domains" : "Terms (one per line)"}
              </label>
              <textarea
                id={`terms-${rule.id}`}
                name="terms"
                rows={3}
                defaultValue={rule.terms.join("\n")}
                placeholder={rule.kind === "links" ? "github.com\nyoutube.com" : "one term per line"}
                className="input resize-y font-mono !text-[12px]"
              />
              <p className="mt-1 text-[10px] text-mist-500">
                {rule.kind === "links"
                  ? "Links outside this list are removed."
                  : "Matching is case-insensitive and evaluated before the message is stored."}
              </p>
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <button type="submit" className="btn btn-primary !py-1.5 !text-[12px]">
              <Save className="h-3.5 w-3.5" /> Save rule
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-ghost !py-1.5 !text-[12px]"
            >
              Close
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
