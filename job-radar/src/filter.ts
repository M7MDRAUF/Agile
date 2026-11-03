import { matchJob, needsDescription } from "./matcher.ts";
import type { Config, Job } from "./types.ts";

const MS_PER_HOUR = 3_600_000;
/** Sources occasionally stamp dates slightly in the future (time zone mistakes). */
const FUTURE_TOLERANCE_MS = 24 * MS_PER_HOUR;

/** Earliest publication time that still counts: the later of startDate and now - maxAgeHours. */
export function freshnessCutoff(
  config: Pick<Config, "startDate" | "maxAgeHours">,
  now: Date,
): Date {
  const windowStart = now.getTime() - config.maxAgeHours * MS_PER_HOUR;
  return new Date(Math.max(config.startDate.getTime(), windowStart));
}

/** Jobs without a publication date can never be proven new, so they are dropped. */
export function isFresh(job: Pick<Job, "postedAt">, cutoff: Date, now: Date): boolean {
  if (!job.postedAt) return false;
  const time = job.postedAt.getTime();
  if (Number.isNaN(time)) return false;
  return time >= cutoff.getTime() && time <= now.getTime() + FUTURE_TOLERANCE_MS;
}

const REMOTE_PATTERN = /\b(?:remote|anywhere|worldwide|work from home|wfh)\b/i;

export function matchesLocation(
  job: Pick<Job, "location" | "title">,
  config: Pick<Config, "locations" | "remoteAlwaysMatches">,
): boolean {
  if (config.locations.length === 0) return true;
  if (config.remoteAlwaysMatches && REMOTE_PATTERN.test(`${job.location} ${job.title}`))
    return true;
  const haystack = job.location.toLowerCase();
  return config.locations.some((needle) => haystack.includes(needle));
}

export interface FilterStats {
  total: number;
  notFresh: number;
  titleRejected: number;
  locationRejected: number;
  matched: number;
  descriptionErrors: number;
}

export interface FilterOutcome {
  jobs: Job[];
  stats: FilterStats;
  /** Rejection reason counts, handy with --verbose. */
  reasons: Record<string, number>;
}

/**
 * Applies the full pipeline: freshness window -> title / description match -> location.
 * Descriptions that must be fetched lazily are only requested for the few survivors.
 */
export async function filterJobs(
  jobs: Job[],
  config: Config,
  cutoff: Date,
  now: Date,
): Promise<FilterOutcome> {
  const stats: FilterStats = {
    total: jobs.length,
    notFresh: 0,
    titleRejected: 0,
    locationRejected: 0,
    matched: 0,
    descriptionErrors: 0,
  };
  const reasons: Record<string, number> = {};
  const kept: Job[] = [];

  for (const job of jobs) {
    if (!isFresh(job, cutoff, now)) {
      stats.notFresh++;
      continue;
    }
    let result = matchJob(job, config);
    if (
      !result.matched &&
      needsDescription(job, config) &&
      !job.description &&
      job.loadDescription
    ) {
      try {
        job.description = await job.loadDescription();
        result = matchJob(job, config);
      } catch {
        stats.descriptionErrors++;
      }
    }
    if (!result.matched) {
      stats.titleRejected++;
      reasons[result.reason] = (reasons[result.reason] ?? 0) + 1;
      continue;
    }
    job.matchReason = result.reason;
    if (!matchesLocation(job, config)) {
      stats.locationRejected++;
      continue;
    }
    kept.push(job);
  }
  stats.matched = kept.length;
  return { jobs: kept, stats, reasons };
}
