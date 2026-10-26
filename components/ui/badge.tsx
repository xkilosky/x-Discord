import { cn } from "@/lib/utils";
import type { MessageStatus } from "@/lib/types";

const TONES = {
  neutral: "border-white/10 bg-white/[0.06] text-mist-200",
  violet: "border-violet/30 bg-violet/15 text-[#c9c0ff]",
  mint: "border-mint/30 bg-mint/12 text-[#9df0c9]",
  amber: "border-amber/30 bg-amber/12 text-[#f7d394]",
  coral: "border-coral/30 bg-coral/12 text-[#ffb3b9]",
  cyan: "border-cyan/30 bg-cyan/12 text-[#a5ecf7]",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span className={cn("chip", TONES[tone], className)}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<MessageStatus, Tone> = {
  sent: "mint",
  scheduled: "violet",
  failed: "coral",
  canceled: "neutral",
};

const STATUS_LABEL: Record<MessageStatus, string> = {
  sent: "Sent",
  scheduled: "Scheduled",
  failed: "Failed",
  canceled: "Canceled",
};

export function StatusBadge({ status }: { status: MessageStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
