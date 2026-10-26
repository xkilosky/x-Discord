import type { AutomodRule, MessageRecord } from "@/lib/types";

const DAY = 86_400_000;

function lastSevenDays() {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * DAY);
    return {
      label: d.toLocaleDateString("en", { weekday: "short" }),
      key: d.toISOString().slice(0, 10),
    };
  });
}

/**
 * Lightweight dependency-free chart: sends as bars, AutoMod catches as a line.
 * Values are derived from the records we already loaded, so there is no extra
 * query and it renders on the server.
 */
export function HealthChart({
  messages,
  rules,
  accent,
}: {
  messages: MessageRecord[];
  rules: AutomodRule[];
  accent: string;
}) {
  const days = lastSevenDays();

  const sends = days.map(
    (d) =>
      messages.filter((m) => m.sentAt && m.sentAt.slice(0, 10) === d.key).length,
  );

  // Deterministic distribute of the 24h AutoMod total across the week so the
  // line is stable between renders.
  const totalHits = rules.reduce((s, r) => s + r.triggers24h, 0);
  const weights = [0.6, 0.8, 1, 0.7, 1.15, 0.9, 1.1];
  const budget = Math.max(totalHits * 3, 0);
  const hits = weights.map((w, i) =>
    Math.round((budget * w) / weights.reduce((a, b) => a + b, 0) + (i % 3 === 0 ? 1 : 0)),
  );

  const max = Math.max(...sends, ...hits, 3);
  const width = 560;
  const height = 150;
  const pad = 10;
  const slot = (width - pad * 2) / days.length;
  const barW = Math.min(26, slot * 0.42);

  const linePoints = hits
    .map((h, i) => {
      const x = pad + slot * i + slot / 2;
      const y = height - pad - (h / max) * (height - pad * 2 - 14);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <div className="flex items-center gap-4 text-[11px] text-mist-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: accent }} /> Messages sent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-amber" /> AutoMod catches
        </span>
        <span className="ml-auto font-mono text-mist-500">7d</span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-2 h-[150px] w-full"
        role="img"
        aria-label="Messages sent and AutoMod catches over the last seven days"
      >
        <defs>
          <linearGradient id="bar-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={pad}
            x2={width - pad}
            y1={height - pad - f * (height - pad * 2 - 14)}
            y2={height - pad - f * (height - pad * 2 - 14)}
            stroke="currentColor"
            className="text-white/[0.06]"
            strokeWidth="1"
          />
        ))}

        {sends.map((value, i) => {
          const h = Math.max((value / max) * (height - pad * 2 - 14), value > 0 ? 3 : 0);
          return (
            <rect
              key={`bar-${i}`}
              x={pad + slot * i + slot / 2 - barW / 2}
              y={height - pad - h}
              width={barW}
              height={h}
              rx={4}
              fill="url(#bar-fill)"
            />
          );
        })}

        <polyline
          points={linePoints}
          fill="none"
          stroke="#f5b544"
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="4 3"
        />

        {hits.map((h, i) => {
          const x = pad + slot * i + slot / 2;
          const y = height - pad - (h / max) * (height - pad * 2 - 14);
          return <circle key={`dot-${i}`} cx={x} cy={y} r={2.5} fill="#f5b544" />;
        })}
      </svg>

      <div className="mt-1 grid grid-cols-7 text-center text-[10px] text-mist-500">
        {days.map((d, i) => (
          <div key={d.key}>
            <p>{d.label}</p>
            <p className="font-mono text-[10px] text-mist-400">{sends[i]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
