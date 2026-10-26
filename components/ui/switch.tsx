"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  size = "md",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? { track: "h-5 w-9", knob: "h-3.5 w-3.5", shift: "translate-x-4" } : { track: "h-6 w-11", knob: "h-4 w-4", shift: "translate-x-5" };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border transition-colors duration-200",
        dims.track,
        checked
          ? "border-violet/40 bg-violet/80 shadow-[0_0_18px_-6px] shadow-violet/70"
          : "border-white/10 bg-ink-600",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "pointer-events-none ml-0.5 inline-block rounded-full bg-white shadow transition-transform duration-200",
          dims.knob,
          checked ? dims.shift : "translate-x-0",
        )}
      />
    </button>
  );
}
