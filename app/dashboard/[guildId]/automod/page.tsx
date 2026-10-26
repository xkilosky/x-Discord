import { ShieldCheck, Zap } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { RuleCard } from "@/components/automod/rule-card";
import { loadGuildBundle } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "AutoMod" };

export default async function AutomodPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const { guild, rules } = await loadGuildBundle(guildId);

  const enabled = rules.filter((r) => r.enabled);
  const hits = rules.reduce((s, r) => s + r.triggers24h, 0);
  const topRule = [...rules].sort((a, b) => b.triggers24h - a.triggers24h)[0];

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Safety"
        title="AutoMod"
        description={`Filters run before a message lands in #general. ${enabled.length} of ${rules.length} are on for ${guild.name}.`}
        actions={
          <>
            <Badge tone="amber">{formatNumber(hits)} catches · 24h</Badge>
            <Badge tone="mint" dot>
              protecting
            </Badge>
          </>
        }
      />

      <div className="panel mb-4 flex flex-wrap items-center gap-4 p-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-mint/25 bg-mint/12 text-mint">
          <ShieldCheck className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white">
            {enabled.length === 0
              ? "No filters are running"
              : `${enabled.length} filters are watching every message`}
          </p>
          <p className="mt-0.5 text-[12px] text-mist-400">
            {topRule && topRule.triggers24h > 0
              ? `Busiest rule: ${topRule.name} (${topRule.triggers24h} catches in 24h).`
              : "Nothing has triggered yet — thresholds may be generous."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-mist-500">
          <Zap className="h-3.5 w-3.5 text-violet" />
          changes apply instantly
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {rules.map((rule) => (
          <RuleCard key={rule.id} rule={rule} guildId={guildId} accent={guild.accent} />
        ))}
      </div>

      <p className="mt-4 rounded-xl border border-white/7 bg-white/[0.02] p-3 text-[11.5px] leading-relaxed text-mist-500">
        Thresholds map to Discord&apos;s native AutoMod where possible; rules without a native
        equivalent are enforced by the bot before the message is stored. Deletes happen in under a
        second, and every catch is written to the moderation log.
      </p>
    </div>
  );
}
