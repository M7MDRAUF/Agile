import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { normalizeText } from "./matcher.ts";
import type { Job } from "./types.ts";

export interface State {
  version: 1;
  /** Dedupe keys (job ids and company+title fingerprints) -> first time they were notified. */
  seen: Record<string, string>;
  /** Source key -> last successful fetch, used for per-source rate limits. */
  fetched: Record<string, string>;
}

const RETENTION_DAYS = 30;
const COMPANY_SUFFIXES = /\b(?:inc|llc|ltd|limited|corp|corporation|gmbh|co|company|plc)\b/g;

export function emptyState(): State {
  return { version: 1, seen: {}, fetched: {} };
}

export function loadState(path: string): State {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyState();
    throw error;
  }
  const parsed = JSON.parse(text) as Partial<State>;
  if (parsed.version !== 1 || typeof parsed.seen !== "object" || parsed.seen === null) {
    throw new Error(`State file ${path} has an unexpected format; delete it to start fresh.`);
  }
  return { version: 1, seen: parsed.seen, fetched: parsed.fetched ?? {} };
}

export function saveState(path: string, state: State): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(state, null, 1)}\n`);
  renameSync(tmp, path);
}

/** Same company + title is one job even when several boards/aggregators list it. */
export function fingerprint(job: Pick<Job, "company" | "title">): string {
  const company = normalizeText(job.company)
    .replace(COMPANY_SUFFIXES, "")
    .replace(/\s+/g, " ")
    .trim();
  return `fp:${company}|${normalizeText(job.title)}`;
}

/** ATS job identifiers embedded in links, so the same posting found via two sources collapses to one. */
export function referenceKeys(job: Pick<Job, "id" | "url">): string[] {
  const keys = new Set<string>();
  const patterns = [
    /[?&](?:gh_jid|token)=(\d{5,})/,
    /greenhouse\.io\/[^/]+\/jobs\/(\d{5,})/,
    /(?:lever\.co|ashbyhq\.com)\/[^/]+\/([0-9a-f]{8}-[0-9a-f-]{27})/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(job.url);
    if (match?.[1]) keys.add(`ref:${match[1]}`);
  }
  const idTail = /^(?:greenhouse|lever|ashby):[^:]+:(.+)$/.exec(job.id);
  if (idTail?.[1]) keys.add(`ref:${idTail[1]}`);
  return [...keys];
}

export function jobKeys(job: Job): string[] {
  return [job.id, fingerprint(job), ...referenceKeys(job)];
}

export function isSeen(state: State, job: Job): boolean {
  return jobKeys(job).some((key) => key in state.seen);
}

export function markSeen(state: State, job: Job, now: Date): void {
  for (const key of jobKeys(job)) state.seen[key] = now.toISOString();
}

/** Drops old entries; returns how many were removed. */
export function prune(state: State, now: Date): number {
  const cutoff = now.getTime() - RETENTION_DAYS * 24 * 3_600_000;
  let removed = 0;
  for (const [key, when] of Object.entries(state.seen)) {
    if (new Date(when).getTime() < cutoff) {
      delete state.seen[key];
      removed++;
    }
  }
  return removed;
}
