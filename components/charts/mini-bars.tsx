/** Tiny inline sparkline used inside rule + command cards. */
export function MiniBars({
  values,
  color = "#7c5cff",
  className = "",
}: {
  values: number[];
  color?: string;
  className?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <span className={`inline-flex items-end gap-[2px] ${className}`} aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className="w-[3px] rounded-sm"
          style={{
            height: `${Math.max(2, (v / max) * 16)}px`,
            background: color,
            opacity: 0.35 + (v / max) * 0.65,
          }}
        />
      ))}
    </span>
  );
}
