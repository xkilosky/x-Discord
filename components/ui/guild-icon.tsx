import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-8 w-8 rounded-[9px] text-[11px]",
  md: "h-10 w-10 rounded-xl text-xs",
  lg: "h-14 w-14 rounded-2xl text-base",
  xl: "h-16 w-16 rounded-2xl text-lg",
} as const;

export function GuildIcon({
  name,
  initials,
  accent,
  iconUrl,
  size = "md",
  className,
  online,
}: {
  name: string;
  initials?: string;
  accent?: string;
  iconUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  online?: boolean;
}) {
  const label = initials ?? name.slice(0, 2).toUpperCase();
  const color = accent ?? "#7c5cff";

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center overflow-hidden font-semibold tracking-tight text-white",
          "ring-1 ring-white/10",
          SIZES[size],
        )}
        style={{
          backgroundImage: iconUrl
            ? undefined
            : `linear-gradient(145deg, ${color}, color-mix(in oklab, ${color} 55%, #0b0d13))`,
        }}
        aria-hidden
      >
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          label
        )}
      </span>
      {online ? (
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink-900 bg-mint" />
      ) : null}
    </span>
  );
}
