import { Command, Slash } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { CommandList } from "@/components/commands/command-list";
import { loadGuildBundle } from "@/lib/data";

export const metadata = { title: "Commands" };

export default async function CommandsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const { guild, commands } = await loadGuildBundle(guildId);

  const live = commands.filter((c) => c.enabled).length;
  const runs = commands.reduce((s, c) => s + c.runs7d, 0);
  const staffOnly = commands.filter((c) => c.adminOnly).length;

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Automation"
        title="Slash commands"
        description={`${live} commands are registered with Discord for ${guild.name}. Edit responses and permissions here — no redeploy needed.`}
        actions={
          <Badge tone="violet">
            <Slash className="h-2.5 w-2.5" /> {runs} runs · 7d
          </Badge>
        }
      />

      <div className="panel mb-4 flex flex-wrap items-center gap-4 p-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet/25 bg-violet/12 text-[#c9c0ff]">
          <Command className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white">
            {live} live · {commands.length - live} disabled · {staffOnly} staff-only
          </p>
          <p className="mt-0.5 text-[12px] text-mist-400">
            Commands are registered per server, so one bad test command never leaks into another
            community.
          </p>
        </div>
        <Badge tone="mint" dot>
          synced
        </Badge>
      </div>

      <CommandList guild={guild} commands={commands} />
    </div>
  );
}
