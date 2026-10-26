"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Command, Loader2, Lock, Save, Slash, Unlock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MiniBars } from "@/components/charts/mini-bars";
import { useToast } from "@/components/ui/toast";
import { saveCommand, toggleCommand } from "@/app/actions/guild";
import { cn } from "@/lib/utils";
import type { CommandConfig, Guild } from "@/lib/types";

function CommandRow({ cmd, guild }: { cmd: CommandConfig; guild: Guild }) {
  const [on, setOn] = useState(cmd.enabled);
  const [open, setOpen] = useState(false);
  const [adminOnly, setAdminOnly] = useState(cmd.adminOnly);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const flip = (next: boolean) => {
    setOn(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("guildId", guild.id);
      fd.set("commandId", cmd.id);
      fd.set("enabled", String(next));
      await toggleCommand(fd);
      toast(`/${cmd.name} ${next ? "enabled" : "disabled"}.`, next ? "success" : "info");
    });
  };

  const spark = [1, 3, 2, 5, 4, 6, Math.max(localRuns(cmd.runs7d), 1)];

  return (
    <article className={cn("panel overflow-hidden", !on && "opacity-80")}>
      <div className="flex items-start gap-3 p-3.5">
        <span
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-mono text-[13px]",
            on ? "border-violet/25 bg-violet/12 text-[#c9c0ff]" : "border-white/8 bg-white/4 text-mist-500",
          )}
        >
          /
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-[13px] font-semibold text-white">/{cmd.name}</h3>
            {on ? <Badge tone="mint">live</Badge> : <Badge tone="neutral">off</Badge>}
            {cmd.adminOnly ? (
              <Badge tone="amber">
                <Lock className="h-2.5 w-2.5" /> staff
              </Badge>
            ) : null}
            {pending ? <Loader2 className="h-3 w-3 animate-spin text-violet" /> : null}
          </div>
          <p className="mt-0.5 text-[12px] text-mist-400">{cmd.description}</p>
          <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-mist-500">
            <MiniBars values={spark} color={guild.accent} />
            {cmd.runs7d} runs · 7d
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Switch checked={on} onChange={flip} label={`Toggle /${cmd.name}`} size="sm" />
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-1.5 text-mist-500 transition hover:bg-white/6 hover:text-white"
            aria-label="Edit command"
            aria-expanded={open}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>

      {open ? (
        <form action={saveCommand} className="animate-rise border-t border-white/7 bg-ink-850/60 p-3.5">
          <input type="hidden" name="guildId" value={guild.id} />
          <input type="hidden" name="commandId" value={cmd.id} />
          {on ? <input type="hidden" name="enabled" value="on" /> : null}
          {adminOnly ? <input type="hidden" name="adminOnly" value="on" /> : null}

          <label className="label" htmlFor={`resp-${cmd.id}`}>
            Bot response
          </label>
          <textarea
            id={`resp-${cmd.id}`}
            name="response"
            rows={3}
            defaultValue={cmd.response}
            className="input resize-y !text-[12.5px]"
          />

          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[11.5px] text-mist-300">
              <Switch
                checked={adminOnly}
                onChange={setAdminOnly}
                label="Restrict to staff"
                size="sm"
              />
              {adminOnly ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              Staff only
            </label>

            <button type="submit" className="btn btn-primary ml-auto !py-1.5 !text-[12px]">
              <Save className="h-3 w-3" /> Save command
            </button>
          </div>

          <p className="mt-2 text-[10.5px] text-mist-500">
            Discord caps slash command names at 32 characters and descriptions at 100. Responses are
            delivered ephemerally by default.
          </p>
        </form>
      ) : null}
    </article>
  );
}

// Tiny helper so the sparkline has a stable shape for zero-run commands.
function localRuns(runs: number) {
  return Math.min(8, Math.round(runs / 60) + 1);
}

export function CommandList({ guild, commands }: { guild: Guild; commands: CommandConfig[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {commands.map((cmd) => (
        <CommandRow key={cmd.id} cmd={cmd} guild={guild} />
      ))}
      {commands.length === 0 ? (
        <div className="panel col-span-full px-4 py-14 text-center">
          <Command className="mx-auto h-5 w-5 text-mist-500" />
          <p className="mt-2 text-[13px] font-medium text-mist-300">No commands registered yet</p>
          <p className="mt-1 text-[12px] text-mist-500">
            Install the bot, then sync commands from a server&apos;s settings page.
          </p>
        </div>
      ) : null}
    </div>
  );
}
