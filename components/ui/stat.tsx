import { cn } from "@/lib/utils";

const TONE = {
  default: "text-white",
  violet: "text-[#c9c0ff]",
  mint: "text-[#9df0c9]",
  amber: "text-[#f7d394]",
  coral: "text-[#ffb3b9]",
} as const;

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: keyof typeof TONE;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("panel p-4", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-mist-500">{label}</p>
        {Icon ? <Icon className="h-3.5 w-3.5 text-mist-500" /> : null}
      </div>
      <p className={cn("mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em]", TONE[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[11.5px] text-mist-500">{hint}</p> : null}
    </div>
  );
}
