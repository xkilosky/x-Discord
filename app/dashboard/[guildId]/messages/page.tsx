import { Megaphone } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Composer } from "@/components/messages/composer";
import { MessageList } from "@/components/messages/message-list";
import { SchedulerHeartbeat } from "@/components/messages/scheduler-heartbeat";
import { loadGuildBundle } from "@/lib/data";
import { getSessionUser, DEMO_USER } from "@/lib/auth";

export const metadata = { title: "Messages" };

export default async function MessagesPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const { guild, channels, messages, settings } = await loadGuildBundle(guildId);
  const user = (await getSessionUser()) ?? DEMO_USER;

  const scheduled = messages.filter((m) => m.status === "scheduled").length;

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Messaging"
        title="Compose & schedule"
        description="Pick a channel, write the message, choose when it lands. Sends go through the bot, so they appear as a normal server message."
        actions={
          <>
            {scheduled > 0 ? <Badge tone="violet">{scheduled} queued</Badge> : null}
            <Badge tone="mint" dot>
              <Megaphone className="h-3 w-3" /> bot connected
            </Badge>
          </>
        }
      />

      <Composer guild={guild} channels={channels} author={user.username} />

      <div className="mt-5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[14px] font-semibold text-white">Message log</h2>
            <p className="mt-0.5 text-[12px] text-mist-500">
              Everything this server sent, queued or failed.
            </p>
          </div>
          <SchedulerHeartbeat />
        </div>

        <MessageList messages={messages} timezone={settings.timezone} />
      </div>
    </div>
  );
}
