import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts deterministically. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compact initials from a display name (e.g. "Ada Lovelace" -> "AL"). */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Title-case an enum-like token: "in_progress" -> "In Progress". */
export function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type Rgb = { r: number; g: number; b: number };

/** Parse a `#rgb` or `#rrggbb` hex string into RGB channels (0-255). */
function parseHex(hex: string): Rgb {
  const normalized = hex.replace(/^#/, "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized.padEnd(6, "0").slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: Rgb): string {
  const channel = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** WCAG relative luminance of an sRGB color. */
function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between white (#fff) and the given color. */
function contrastWithWhite(color: Rgb): number {
  const l = relativeLuminance(color);
  return (1 + 0.05) / (l + 0.05);
}

/**
 * Darken an arbitrary brand color until white text on it meets the WCAG AA
 * contrast ratio (4.5:1). Used for avatar badges so any user-chosen
 * `avatarColor` stays readable (BUG-H12 / color-contrast). Falls back to a
 * safe indigo when the input cannot be parsed.
 */
export function accessibleBadgeBackground(hex?: string | null): string {
  const source = hex && /^#?[0-9a-fA-F]{3,6}$/.test(hex) ? hex : "#4338ca";
  let color = parseHex(source);
  // Scale channels toward black until the contrast target is reached.
  for (let i = 0; i < 24 && contrastWithWhite(color) < 4.5; i++) {
    color = { r: color.r * 0.92, g: color.g * 0.92, b: color.b * 0.92 };
  }
  return toHex(color);
}
