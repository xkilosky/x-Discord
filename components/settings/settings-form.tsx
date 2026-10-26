"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Hash, Loader2, Save, ScrollText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { saveSettings } from "@/app/actions/guild";
import type { Channel, Guild, GuildSettings } from "@/lib/types";

const TIMEZONES = [
  "UTC",
  "America/Guatemala",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function SettingsForm({
  guild,
  channels,
  settings,
}: {
  guild: Guild;
  channels: Channel[];
  settings: GuildSettings;
}) {
  const [state, action, pending] = useActionState(saveSettings, null);
  const [dm, setDm] = useState(settings.automodDm);
  const { toast } = useToast();

  useEffect(() => {
    if (state) toast(state.message, state.ok ? "success" : "error");
  }, [state, toast]);

  const textChannels = channels.filter((c) => c.type !== "voice");

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="guildId" value={guild.id} />
      {dm ? <input type="hidden" name="automodDm" value="on" /> : null}

      <section className="panel p-4">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-violet" />
          <div>
            <h2 className="text-[13.5px] font-semibold text-white">Logs & routing</h2>
            <p className="text-[11.5px] text-mist-500">Where the bot reports what it did.</p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="log-channel">
              Moderation log channel
            </label>
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mist-500" />
              <select
                id="log-channel"
                name="logChannelId"
                defaultValue={settings.logChannelId ?? ""}
                className="input appearance-none !pl-8"
              >
                <option value="">No log channel</option>
                {textChannels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-[10.5px] text-mist-500">Bans, deletes and AutoMod hits land here.</p>
          </div>

          <div>
            <label className="label" htmlFor="alert-channel">
              Staff alert channel
            </label>
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mist-500" />
              <select
                id="alert-channel"
                name="alertChannelId"
                defaultValue={settings.alertChannelId ?? ""}
                className="input appearance-none !pl-8"
              >
                <option value="">No alerts</option>
                {textChannels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-[10.5px] text-mist-500">Spike warnings and failed deliveries.</p>
          </div>

          <div>
            <label className="label" htmlFor="timezone">
              Timezone
            </label>
            <select
              id="timezone"
              name="timezone"
              defaultValue={settings.timezone}
              className="input appearance-none"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10.5px] text-mist-500">Used for scheduled send times and the log.</p>
          </div>

          <div>
            <label className="label" htmlFor="alert-role">
              Alert ping role
            </label>
            <input
              id="alert-role"
              name="mentionAlertRole"
              defaultValue={settings.mentionAlertRole ?? ""}
              placeholder="@Moderators"
              className="input"
            />
            <p className="mt-1 text-[10.5px] text-mist-500">Left empty, alerts post silently.</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/7 bg-white/[0.02] p-3">
          <div className="pr-4">
            <p className="text-[12.5px] font-medium text-mist-200">DM members when AutoMod fires</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-mist-500">
              Members get a short explanation of why their message was removed. Cuts repeat offences
              roughly in half.
            </p>
          </div>
          <Switch checked={dm} onChange={setDm} label="DM members on AutoMod action" />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button type="submit" disabled={pending} className="btn btn-primary !py-2 !text-[13px]">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {pending ? "Saving…" : "Save settings"}
          </button>
          {state?.ok ? (
            <span className="flex items-center gap-1 text-[11.5px] text-mint">
              <Check className="h-3 w-3" /> saved
            </span>
          ) : null}
          <Badge tone="neutral" className="ml-auto font-mono">
            {guild.id}
          </Badge>
        </div>
      </section>
    </form>
  );
}
