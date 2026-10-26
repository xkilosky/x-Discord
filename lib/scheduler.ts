import "server-only";
import { getRepo } from "@/lib/repo";
import { postChannelMessage } from "@/lib/discord/rest";

export type TickResult = { delivered: number; failed: number; guildIds: string[] };

/**
 * Delivers every scheduled message whose time has passed.
 *
 * Used by three callers so behaviour can never drift:
 *  - the server action (demo mode heartbeat + manual "run now")
 *  - POST /api/scheduler/tick (cron)
 *  - the bot process loop (when a long-running host is available)
 */
export async function tickScheduler(now = new Date()): Promise<TickResult> {
  const repo = await getRepo();
  const due = await repo.listDueMessages(now);

  let delivered = 0;
  let failed = 0;
  const guildIds = new Set<string>();

  for (const message of due) {
    guildIds.add(message.guildId);

    const result = await postChannelMessage({
      channelId: message.channelId,
      content: message.content,
      embed: message.embed,
    });

    if (result.ok) {
      await repo.markMessage(message.id, {
        status: "sent",
        sentAt: new Date().toISOString(),
      });
      delivered++;
    } else {
      await repo.markMessage(message.id, {
        status: "failed",
        error: result.error ?? "Delivery failed",
      });
      failed++;
    }
  }

  return { delivered, failed, guildIds: [...guildIds] };
}
