import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initialsFrom(name: string) {
  const cleaned = name.replace(/[^\p{L}\p{N} ]/gu, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const AVATAR_ACCENTS = [
  "#7c5cff",
  "#22d3ee",
  "#3ddc97",
  "#f5b544",
  "#ff5d6c",
  "#f472b6",
  "#60a5fa",
];

export function accentFrom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  return AVATAR_ACCENTS[hash % AVATAR_ACCENTS.length];
}

export function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`;
  return String(n);
}

export function relativeTime(iso: string, now = Date.now()) {
  const then = new Date(iso).getTime();
  const diff = Math.round((then - now) / 1000);
  const abs = Math.abs(diff);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
    ["week", 4.35],
    ["month", 12],
    ["year", Number.POSITIVE_INFINITY],
  ];
  let value = diff;
  let unit: Intl.RelativeTimeFormatUnit = "second";
  for (const [u, size] of units) {
    if (abs < size) {
      unit = u;
      break;
    }
    value = value / size;
    unit = u;
  }
  const rounded = Math.round(value);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  return rtf.format(rounded, unit);
}

export function countdown(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return "sending now";
  const totalMinutes = Math.ceil(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}

export function formatDateTime(iso: string, timezone = "UTC") {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(iso));
}

export function formatDuration(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Turn a Date into a value usable by <input type="datetime-local">. */
export function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}
