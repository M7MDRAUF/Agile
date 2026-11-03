import { fetchJson } from "./http.ts";
import { filterJobs, freshnessCutoff, type FilterStats } from "./filter.ts";
import type { Channel } from "./notify/channels.ts";
import type { DigestContext } from "./notify/format.ts";
import { buildSources } from "./sources/index.ts";
import { isSeen, jobKeys, markSeen, prune, type State } from "./state.ts";
import type { Config, Job, JobSource } from "./types.ts";

export interface RunOptions {
  config: Config;
  state: State;
  channels: Channel[];
  now: Date;
  dryRun?: boolean;
  verbose?: boolean;
  /** Override for tests. */
  sources?: JobSource[];
  log?: (line: string) => void;
}

export interface RunResult {
  newJobs: Job[];
  stats: FilterStats;
  warnings: string[];
  sourcesChecked: number;
  /** True when state changed and should be written to disk. */
  stateChanged: boolean;
  notified: boolean;
  /** Set when every source failed or every channel failed: the run must be reported as failed. */
  error?: string;
}

function throttled(source: JobSource, state: State, now: Date): boolean {
  if (!source.minIntervalMinutes) return false;
  const last = state.fetched[source.key];
  if (!last) return false;
  return now.getTime() - new Date(last).getTime() < source.minIntervalMinutes * 60_000;
}

export async function runOnce(options: RunOptions): Promise<RunResult> {
  const { config, state, channels, now, dryRun = false, verbose = false } = options;
  const log = options.log ?? ((line: string) => console.log(line));
  const cutoff = freshnessCutoff(config, now);
  const sources = options.sources ?? buildSources(config);

  log(`Run at ${now.toISOString()} | accepting jobs published since ${cutoff.toISOString()}`);

  const warnings: string[] = [];
  const collected: Job[] = [];
  const fetchedKeys: string[] = [];
  let sourcesChecked = 0;
  let failedSources = 0;

  const active = sources.filter((source) => {
    if (throttled(source, state, now)) {
      log(`- ${source.key}: skipped (rate limit, fetched at ${state.fetched[source.key]})`);
      return false;
    }
    return true;
  });

  const outcomes = await Promise.allSettled(
    active.map((source) => source.fetch({ cutoff, fetchJson })),
  );
  outcomes.forEach((outcome, i) => {
    const source = active[i]!;
    if (outcome.status === "fulfilled") {
      sourcesChecked++;
      fetchedKeys.push(source.key);
      collected.push(...outcome.value.jobs);
      warnings.push(...outcome.value.warnings);
      log(
        `- ${source.key}: ${outcome.value.jobs.length} recent job(s)` +
          (outcome.value.warnings.length ? `, ${outcome.value.warnings.length} warning(s)` : ""),
      );
    } else {
      failedSources++;
      const message = (outcome.reason as Error).message;
      warnings.push(`${source.key}: ${message}`);
      log(`- ${source.key}: FAILED (${message})`);
    }
  });

  const emptyStats: FilterStats = {
    total: 0,
    notFresh: 0,
    titleRejected: 0,
    locationRejected: 0,
    matched: 0,
    descriptionErrors: 0,
  };

  if (active.length > 0 && failedSources === active.length) {
    return {
      newJobs: [],
      stats: emptyStats,
      warnings,
      sourcesChecked,
      stateChanged: false,
      notified: false,
      error: "every job source failed",
    };
  }

  const { jobs: matched, stats, reasons } = await filterJobs(collected, config, cutoff, now);
  if (verbose) log(`  rejection reasons: ${JSON.stringify(reasons)}`);

  const batchSeen = new Set<string>();
  const unseen: Job[] = [];
  for (const job of matched) {
    const keys = jobKeys(job);
    if (isSeen(state, job) || keys.some((key) => batchSeen.has(key))) continue;
    for (const key of keys) batchSeen.add(key);
    unseen.push(job);
  }
  unseen.sort((a, b) => (b.postedAt?.getTime() ?? 0) - (a.postedAt?.getTime() ?? 0));
  const newJobs = unseen.slice(0, config.maxJobsPerRun);
  if (unseen.length > newJobs.length) {
    log(
      `  ${unseen.length - newJobs.length} more job(s) will be sent next run (maxJobsPerRun=${config.maxJobsPerRun})`,
    );
  }

  log(
    `Checked ${stats.total} job(s): ${stats.notFresh} too old/undated, ` +
      `${stats.titleRejected} not junior/new-grad SWE, ${stats.locationRejected} wrong location, ` +
      `${matched.length} matched, ${newJobs.length} new.`,
  );

  const ctx: DigestContext = {
    now,
    timezone: config.timezone,
    warnings,
    checked: stats.total - stats.notFresh,
    sourcesChecked,
  };

  const shouldNotify = newJobs.length > 0 || config.notifyWhenEmpty;

  if (dryRun) {
    for (const job of newJobs) {
      log(
        `  NEW  ${job.title} | ${job.company} | ${job.location} | ${job.postedAt?.toISOString()} | ${job.url} [${job.matchReason}]`,
      );
    }
    return { newJobs, stats, warnings, sourcesChecked, stateChanged: false, notified: false };
  }

  let notified = false;
  if (shouldNotify) {
    if (channels.length === 0) {
      return {
        newJobs,
        stats,
        warnings,
        sourcesChecked,
        stateChanged: false,
        notified: false,
        error:
          "no notification channel configured (set NTFY_TOPIC or TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)",
      };
    }
    const failures: string[] = [];
    for (const channel of channels) {
      try {
        if (newJobs.length > 0) {
          const count = await channel.sendJobs(newJobs, ctx);
          log(`  ${channel.name}: sent ${newJobs.length} job(s) in ${count} message(s)`);
        } else {
          await channel.sendHeartbeat(ctx);
          log(`  ${channel.name}: sent heartbeat`);
        }
        notified = true;
      } catch (error) {
        failures.push(`${channel.name}: ${(error as Error).message}`);
        log(`  ${channel.name}: FAILED (${(error as Error).message})`);
      }
    }
    if (!notified) {
      return {
        newJobs,
        stats,
        warnings,
        sourcesChecked,
        stateChanged: false,
        notified: false,
        error: `all notification channels failed (${failures.join("; ")})`,
      };
    }
  }

  let stateChanged = false;
  for (const job of newJobs) {
    markSeen(state, job, now);
    stateChanged = true;
  }
  for (const key of fetchedKeys) {
    const source = sources.find((s) => s.key === key);
    if (source?.minIntervalMinutes) {
      state.fetched[key] = now.toISOString();
      stateChanged = true;
    }
  }
  if (prune(state, now) > 0) stateChanged = true;

  return { newJobs, stats, warnings, sourcesChecked, stateChanged, notified };
}
