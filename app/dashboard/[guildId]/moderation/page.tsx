import { Ban, Gavel, ShieldAlert, Timer, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { ModConsole } from "@/components/moderation/mod-console";
import { loadGuildBundle } from "@/lib/data";

export const metadata = { title: "Moderation" };

export default async function ModerationPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const { guild, modActions } = await loadGuildBundle(guildId);

  const count = (t: string) => modActions.filter((a) => a.type === t).length;

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Trust & safety"
        title="Moderation"
        description="Issue warnings, timeouts, kicks and bans, and keep a permanent case log for every action taken in this server."
        actions={
          <Badge tone="coral" dot>
            {count("automod")} automod cases
          </Badge>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Warnings" value={count("warn")} hint="expire after 90 days" tone="amber" icon={TriangleAlert} />
        <Stat label="Timeouts" value={count("timeout")} hint="temporary mutes" tone="violet" icon={Timer} />
        <Stat label="Kicks" value={count("kick")} hint="removed, can rejoin" tone="coral" icon={Gavel} />
        <Stat label="Bans" value={count("ban")} hint={`${count("unban")} unbanned`} tone="coral" icon={Ban} />
      </div>

      {guild.viewerRole === "moderator" ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber/25 bg-amber/8 p-3 text-[12.5px] text-[#f7d394]">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          You have the moderator role on this server — bans are restricted to admins in Discord, but
          cases logged here are still recorded.
        </div>
      ) : null}

      <ModConsole guild={guild} actions={modActions} />
    </div>
  );
}
