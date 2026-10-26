"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  Hash,
  Image as ImageIcon,
  Loader2,
  Radio,
  Send,
  Smile,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { sendMessage } from "@/app/actions/guild";
import { cn, toDatetimeLocal } from "@/lib/utils";
import type { Channel, Embed, Guild } from "@/lib/types";

const TEMPLATES: Array<{ label: string; body: string; channel?: string }> = [
  {
    label: "Patch notes",
    body: "**Patch notes** — here's what changed this week:\n\n• Fixed the voice reconnect loop\n• New shop rotation\n• Performance pass on large servers\n\nFull list in the thread.",
    channel: "announcements",
  },
  {
    label: "Event reminder",
    body: "📣 **Reminder:** the event starts in one hour. Hop into the stage channel and grab a seat — we're going live at the top of the hour.",
    channel: "announcements",
  },
  {
    label: "Welcome",
    body: "Welcome in! Take a second to read #rules, then introduce yourself. Staff is around if you need anything.",
    channel: "welcome",
  },
  {
    label: "Maintenance",
    body: "🔧 **Heads up:** the bot will be offline for a short maintenance window tonight. Scheduled messages are safe and will send once it's back.",
    channel: "announcements",
  },
];

const COLORS = ["#7c5cff", "#5865f2", "#22d3ee", "#3ddc97", "#f5b544", "#ff5d6c"];

function DiscordPreview({
  guildName,
  channelName,
  content,
  embedOn,
  embed,
  author,
  scheduledFor,
}: {
  guildName: string;
  channelName: string;
  content: string;
  embedOn: boolean;
  embed: Embed;
  author: string;
  scheduledFor: string | null;
}) {
  const rendered = content.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
    chunk.startsWith("**") && chunk.endsWith("**") ? (
      <strong key={i} className="font-semibold text-white">
        {chunk.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{chunk}</span>
    ),
  );

  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-[#313338]">
      <div className="flex items-center gap-2 border-b border-black/20 px-3 py-2">
        <Hash className="h-3.5 w-3.5 text-[#949ba4]" />
        <span className="text-[12.5px] font-semibold text-white">{channelName || "pick-a-channel"}</span>
        <span className="text-[10px] text-[#949ba4]">· {guildName}</span>
        {scheduledFor ? (
          <span className="ml-auto rounded bg-[#5865f2]/25 px-1.5 py-0.5 text-[9px] font-medium text-[#c9c0ff]">
            scheduled
          </span>
        ) : null}
      </div>

      <div className="px-3 py-3">
        <div className="flex gap-2.5">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8b7bff] to-[#4a45e0] text-[10px] font-semibold text-white">
            XD
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline gap-1.5">
              <span className="text-[12.5px] font-semibold text-white">x-Discord</span>
              <span className="rounded bg-[#5865f2] px-1 py-[1px] text-[8.5px] font-semibold uppercase text-white">
                app
              </span>
              <span className="text-[9.5px] text-[#949ba4]">today at {new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}</span>
            </p>

            {content ? (
              <p className="mt-0.5 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-[#dbdee1]">
                {rendered}
                {embedOn ? <span className="ml-1 text-[#949ba4]">(sent by {author})</span> : null}
              </p>
            ) : null}

            {embedOn && (embed.title || embed.description) ? (
              <div
                className="mt-2 max-w-[320px] overflow-hidden rounded-[4px] bg-[#2b2d31]"
                style={{ borderLeft: `4px solid ${embed.color}` }}
              >
                <div className="p-2.5">
                  {embed.title ? (
                    <p className="text-[12.5px] font-semibold text-[#00a8fc]">{embed.title}</p>
                  ) : null}
                  {embed.description ? (
                    <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-relaxed text-[#dbdee1]">
                      {embed.description}
                    </p>
                  ) : null}
                  {embed.footer ? (
                    <p className="mt-2 text-[9.5px] text-[#949ba4]">{embed.footer}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {content && !embedOn ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                {["👍", "🔥", "🎉"].map((e) => (
                  <span
                    key={e}
                    className="inline-flex items-center gap-0.5 rounded bg-[#3f4248] px-1 py-0.5 text-[10px] text-[#dbdee1]"
                  >
                    {e} <span className="text-[9px] text-[#949ba4]">{Math.floor(Math.random() * 12) + 2}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Composer({
  guild,
  channels,
  author,
}: {
  guild: Guild;
  channels: Channel[];
  author: string;
}) {
  const { toast } = useToast();
  const [state, action, pending] = useActionState(sendMessage, null);

  const textable = useMemo(() => channels.filter((c) => c.type !== "voice"), [channels]);
  const defaultChannel =
    textable.find((c) => c.name === "announcements") ?? textable[0] ?? channels[0];

  const [channelId, setChannelId] = useState(defaultChannel?.id ?? "");
  const [content, setContent] = useState("");
  const [embedOn, setEmbedOn] = useState(false);
  const [embed, setEmbed] = useState<Embed>({
    title: "",
    description: "",
    color: "#7c5cff",
    footer: "x-Discord",
  });
  const [mode, setMode] = useState<"now" | "later">("now");
  const [when, setWhen] = useState(() => toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000)));
  const formRef = useRef<HTMLFormElement>(null);

  const channel = textable.find((c) => c.id === channelId);
  const scheduledFor = mode === "later" && when ? new Date(when).toISOString() : null;

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast(state.message, "success");
      setContent("");
      setEmbed({ title: "", description: "", color: "#7c5cff", footer: "x-Discord" });
      setEmbedOn(false);
      setMode("now");
    } else {
      toast(state.message, "error");
    }
  }, [state, toast]);

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    setContent(t.body);
    if (t.channel) {
      const match = textable.find((c) => c.name === t.channel);
      if (match) setChannelId(match.id);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Channel[]>();
    for (const c of textable) {
      const list = map.get(c.category) ?? [];
      list.push(c);
      map.set(c.category, list);
    }
    return [...map.entries()];
  }, [textable]);

  const tooLong = content.length > 2000;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
      <form ref={formRef} action={action} className="panel p-4">
        <input type="hidden" name="guildId" value={guild.id} />
        <input type="hidden" name="channelId" value={channelId} />
        {mode === "later" ? <input type="hidden" name="scheduledFor" value={when} /> : null}
        {embedOn ? <input type="hidden" name="embedOn" value="on" /> : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-white">Compose message</p>
          <div className="flex items-center gap-1 rounded-lg border border-white/8 bg-ink-850 p-0.5">
            {(["now", "later"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
                  mode === m ? "bg-violet/25 text-white" : "text-mist-400 hover:text-mist-200",
                )}
              >
                {m === "now" ? "Send now" : "Schedule"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <label className="label" htmlFor="channel-picker">
            Channel
          </label>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mist-500" />
            <select
              id="channel-picker"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="input appearance-none !pl-8 pr-8"
            >
              {grouped.map(([category, list]) => (
                <optgroup key={category} label={category}>
                  {list.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                      {c.type === "announcement" ? "  (announcements)" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {channel ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-mist-500">
              <Check className="h-3 w-3 text-mint" />
              Bot can post in #{channel.name}
              <span className="text-mist-600">·</span>
              <Badge tone={channel.type === "announcement" ? "violet" : "neutral"}>
                {channel.type}
              </Badge>
            </p>
          ) : null}
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="message-body">
              Message
            </label>
            <span
              className={cn(
                "font-mono text-[10.5px]",
                tooLong ? "text-coral" : "text-mist-500",
              )}
            >
              {content.length}/2000
            </span>
          </div>
          <textarea
            id="message-body"
            name="content"
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write the announcement. **Bold**, bullet points and emoji all render in Discord."
            className="input resize-y !leading-relaxed"
          />

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] uppercase tracking-wide text-mist-500">Templates</span>
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => applyTemplate(t)}
                className="chip border-white/8 bg-white/[0.04] text-mist-300 transition hover:border-violet/35 hover:text-white"
              >
                <Wand2 className="h-2.5 w-2.5" /> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/7 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[12.5px] font-medium text-mist-200">
              <ImageIcon className="h-3.5 w-3.5 text-violet" /> Rich embed
            </span>
            <Switch
              checked={embedOn}
              onChange={setEmbedOn}
              label="Attach an embed"
              size="sm"
            />
          </div>

          {embedOn ? (
            <div className="mt-3 space-y-2.5">
              <input type="hidden" name="embedColor" value={embed.color} />
              <div>
                <label className="label" htmlFor="embed-title">
                  Embed title
                </label>
                <input
                  id="embed-title"
                  name="embedTitle"
                  value={embed.title}
                  onChange={(e) => setEmbed({ ...embed, title: e.target.value })}
                  placeholder="Patch 0.9.4 is live"
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="embed-body">
                  Embed body
                </label>
                <textarea
                  id="embed-body"
                  name="embedBody"
                  rows={3}
                  value={embed.description}
                  onChange={(e) => setEmbed({ ...embed, description: e.target.value })}
                  placeholder="Highlights, links and details."
                  className="input resize-y"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="label !mb-0">Accent</span>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Use ${c}`}
                    onClick={() => setEmbed({ ...embed, color: c })}
                    className={cn(
                      "h-5 w-5 rounded-full ring-offset-2 ring-offset-ink-800 transition",
                      embed.color === c ? "ring-2 ring-white/70" : "ring-1 ring-white/15",
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-mist-500">
              Optional. Embeds give announcements a colored rail, a title and a footer.
            </p>
          )}
        </div>

        {mode === "later" ? (
          <div className="mt-3 rounded-xl border border-violet/25 bg-violet/8 p-3">
            <label className="label !text-[#c9c0ff]" htmlFor="schedule-at">
              Send at ({guild.name} timezone)
            </label>
            <input
              id="schedule-at"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="input [color-scheme:dark]"
            />
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-mist-400">
              <CalendarClock className="h-3 w-3" />
              Queued messages survive restarts — the scheduler picks them up.
            </p>
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          <button
            type="submit"
            disabled={pending || tooLong || (!content.trim() && !embedOn)}
            className="btn btn-primary flex-1 !py-2.5 !text-[13px]"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "now" ? (
              <Send className="h-3.5 w-3.5" />
            ) : (
              <CalendarClock className="h-3.5 w-3.5" />
            )}
            {pending ? "Sending…" : mode === "now" ? "Send to Discord" : "Add to queue"}
          </button>
          <button
            type="button"
            onClick={() => setContent("")}
            className="btn btn-ghost !py-2.5 !text-[13px]"
            disabled={!content}
          >
            Clear
          </button>
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-mist-500">
          <Sparkles className="h-2.5 w-2.5" />
          Sends as <span className="font-mono text-mist-300">{author}</span> — logged in the message log.
        </p>
      </form>

      <div className="space-y-3">
        <div className="panel p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-white">Live preview</p>
            <Badge tone="mint" dot>
              renders first
            </Badge>
          </div>
          <DiscordPreview
            guildName={guild.name}
            channelName={channel?.name ?? ""}
            content={content}
            embedOn={embedOn}
            embed={embed}
            author={author}
            scheduledFor={scheduledFor}
          />
        </div>

        <div className="panel-flat p-3.5">
          <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-mist-200">
            <Radio className="h-3 w-3 text-mint" /> Fast targeting
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-mist-500">
            Announcement channels are pinned to the top of the picker. Everything the bot can reach is
            listed — no permission surprises at send time.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1">
            {textable
              .filter((c) => c.type === "announcement")
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannelId(c.id)}
                  className={cn(
                    "chip border-white/8 transition",
                    channelId === c.id
                      ? "bg-violet/25 text-white"
                      : "bg-white/[0.04] text-mist-300 hover:text-white",
                  )}
                >
                  <Hash className="h-2.5 w-2.5" />
                  {c.name}
                </button>
              ))}
            <span className="chip border-transparent text-mist-600">
              <Smile className="h-2.5 w-2.5" /> more below
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
