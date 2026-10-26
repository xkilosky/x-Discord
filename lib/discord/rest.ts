import "server-only";
import { REST, Routes } from "discord.js";
import { serverEnv, hasBotToken } from "@/lib/env";
import type { Embed } from "@/lib/types";

/**
 * Thin REST wrapper. Server-only — the bot token is never serialized to the
 * client and never imported by a client component.
 */
let rest: REST | null = null;

function client() {
  if (!hasBotToken) throw new Error("DISCORD_BOT_TOKEN is not configured");
  if (!rest) rest = new REST({ version: "10" }).setToken(serverEnv.botToken);
  return rest;
}

export type DispatchResult = { ok: boolean; messageId?: string; error?: string };

/** Post a message into a channel, optionally with an embed. */
export async function postChannelMessage(input: {
  channelId: string;
  content: string;
  embed?: Embed | null;
}): Promise<DispatchResult> {
  if (!hasBotToken) {
    return { ok: true, messageId: `demo-${Date.now()}` };
  }

  try {
    const payload: Record<string, unknown> = {};
    if (input.content.trim()) payload.content = input.content.slice(0, 2000);
    if (input.embed && (input.embed.title || input.embed.description)) {
      payload.embeds = [
        {
          title: input.embed.title || undefined,
          description: input.embed.description || undefined,
          color: parseInt(input.embed.color.replace("#", ""), 16) || undefined,
          footer: input.embed.footer ? { text: input.embed.footer } : undefined,
        },
      ];
    }
    if (!payload.content && !payload.embeds) return { ok: false, error: "Nothing to send" };

    const res = (await client().post(Routes.channelMessages(input.channelId), {
      body: payload,
    })) as { id: string };

    return { ok: true, messageId: res.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Discord rejected the message" };
  }
}

/** Register or refresh this guild's slash commands. */
export async function registerGuildCommands(
  guildId: string,
  commands: Array<{ name: string; description: string }>,
) {
  if (!hasBotToken || !serverEnv.discordClientId) return { ok: false, error: "Bot not configured" };
  try {
    await client().put(Routes.applicationGuildCommands(serverEnv.discordClientId, guildId), {
      body: commands.map((c) => ({ name: c.name, description: c.description.slice(0, 100) })),
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Command sync failed" };
  }
}

/** Timeout / kick / ban helpers used by the moderation console. */
export async function applyModeration(input: {
  guildId: string;
  userId: string;
  type: "timeout" | "kick" | "ban" | "unban";
  minutes?: number;
  reason?: string;
}): Promise<DispatchResult> {
  if (!hasBotToken) {
    return { ok: true, messageId: `demo-${Date.now()}` };
  }
  try {
    const base = `/guilds/${input.guildId}/bans/${input.userId}` as `/${string}`;
    switch (input.type) {
      case "ban":
        await client().put(base, { body: { reason: input.reason ?? undefined } });
        break;
      case "unban":
        await client().delete(base);
        break;
      case "kick":
        await client().delete(`/guilds/${input.guildId}/members/${input.userId}` as `/${string}`, {
          reason: input.reason ?? undefined,
        } as never);
        break;
      case "timeout": {
        const until = new Date(Date.now() + (input.minutes ?? 10) * 60_000).toISOString();
        await client().patch(`/guilds/${input.guildId}/members/${input.userId}` as `/${string}`, {
          body: { communication_disabled_until: until, reason: input.reason ?? undefined },
        });
        break;
      }
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Discord rejected the action" };
  }
}
