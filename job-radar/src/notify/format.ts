import type { Job } from "../types.ts";

export interface Notification {
  title: string;
  /** Plain-text body (ntfy, console). */
  text: string;
  /** Telegram-flavoured HTML body. */
  html: string;
  /** First job link, used as the tap target of the notification. */
  clickUrl?: string;
  /** Heartbeats are delivered silently. */
  silent: boolean;
}

export interface DigestContext {
  now: Date;
  timezone: string;
  warnings: string[];
  checked: number;
  sourcesChecked: number;
}

export const NTFY_BYTE_LIMIT = 3600;
export const TELEGRAM_CHAR_LIMIT = 3800;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatAge(postedAt: Date | null, now: Date): string {
  if (!postedAt) return "date unknown";
  const minutes = Math.max(0, Math.round((now.getTime() - postedAt.getTime()) / 60_000));
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatClock(now: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
}

function jobBlock(job: Job, index: number, now: Date) {
  const meta = `${job.company} | ${job.location}`;
  const age = `${formatAge(job.postedAt, now)} | ${job.source}`;
  return {
    text: `${index}. ${job.title}\n   ${meta}\n   ${age}\n   ${job.url}`,
    html:
      `${index}. <a href="${escapeHtml(job.url)}">${escapeHtml(job.title)}</a>\n` +
      `   ${escapeHtml(meta)}\n   ${escapeHtml(age)}`,
  };
}

function footer(ctx: DigestContext, format: "text" | "html"): string {
  const lines = [`${formatClock(ctx.now, ctx.timezone)} (${ctx.timezone})`];
  if (ctx.warnings.length) {
    const shown = ctx.warnings.slice(0, 5).join("; ");
    lines.push(`تعذّر جلب بعض المصادر: ${shown}${ctx.warnings.length > 5 ? " ..." : ""}`);
  }
  const body = lines.join("\n");
  return format === "html" ? escapeHtml(body) : body;
}

/**
 * Packs job blocks into as few messages as possible without exceeding the per-message limit.
 * `measure` differs per channel (ntfy limits bytes, Telegram limits characters).
 */
export function buildJobNotifications(
  jobs: Job[],
  ctx: DigestContext,
  limits: { measure: (s: string) => number; max: number; format: "text" | "html" },
): Notification[] {
  const blocks = jobs.map((job, i) => jobBlock(job, i + 1, ctx.now));
  const key = limits.format;
  const tail = `\n\n${footer(ctx, limits.format)}`;
  const groups: number[][] = [];
  let current: number[] = [];
  let size = limits.measure(tail) + 80;
  blocks.forEach((block, i) => {
    const blockSize = limits.measure(block[key]) + 2;
    if (current.length > 0 && size + blockSize > limits.max) {
      groups.push(current);
      current = [];
      size = limits.measure(tail) + 80;
    }
    current.push(i);
    size += blockSize;
  });
  if (current.length) groups.push(current);

  return groups.map((group, g) => {
    const part = groups.length > 1 ? ` (${g + 1}/${groups.length})` : "";
    const title = `وظائف جديدة: ${jobs.length}${part}`;
    const isLast = g === groups.length - 1;
    const body = group.map((i) => blocks[i]![key]).join("\n\n");
    const suffix = isLast ? tail : "";
    const first = jobs[group[0]!];
    return {
      title,
      text: `${body}${suffix}`,
      html: limits.format === "html" ? `<b>${escapeHtml(title)}</b>\n\n${body}${suffix}` : "",
      clickUrl: first?.url,
      silent: false,
    };
  });
}

export function buildHeartbeat(ctx: DigestContext): Notification {
  const lines = [
    "لا توجد وظائف جديدة مطابقة منذ آخر فحص.",
    `تم فحص ${ctx.checked} وظيفة حديثة من ${ctx.sourcesChecked} مصدر.`,
  ];
  const text = `${lines.join("\n")}\n\n${footer(ctx, "text")}`;
  const title = "لا جديد في هذه الدورة";
  return {
    title,
    text,
    html: `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(lines.join("\n"))}\n\n${footer(ctx, "html")}`,
    silent: true,
  };
}
