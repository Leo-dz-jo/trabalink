import { format, formatDistanceToNow } from "date-fns";
import { CURRENCY } from "./constants";

export function formatDate(value: number | string | undefined): string {
  if (!value) return "—";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "MMM d, yyyy");
}

export function formatShortDate(value: number | string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "MMM d");
}

export function formatMessageTime(value: number): string {
  return format(new Date(value), "h:mm a");
}

export function formatMessageDay(value: number): string {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  return format(date, "MMM d, yyyy");
}

export function timeAgo(value: number | undefined): string {
  if (!value) return "—";
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export function formatSalary(
  min: number | undefined,
  max: number | undefined,
  type = "month",
): string {
  if (!min && !max) return "Salary not disclosed";
  const compact = (value: number) =>
    value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`;
  if (min && max) return `${CURRENCY}${compact(min)} – ${CURRENCY}${compact(max)} / ${type}`;
  return `${CURRENCY}${compact((min ?? max)!)} / ${type}`;
}

export function initials(name: string | undefined): string {
  if (!name) return "TL";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function daysUntil(value: number | string | undefined): number | null {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

export function pluralise(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function initialsColor(seed: string): string {
  const palette = [
    "bg-primary/12 text-primary",
    "bg-[#3f6f8c]/12 text-[#3f6f8c]",
    "bg-[#a96508]/12 text-[#a96508]",
    "bg-[#a8776f]/14 text-[#8c5b53]",
  ];
  const index = seed
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  return palette[index % palette.length];
}
