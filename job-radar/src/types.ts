export interface Job {
  /** Source-scoped identifier, e.g. "greenhouse:stripe:8172510". */
  id: string;
  /** Human readable source label, e.g. "Greenhouse". */
  source: string;
  title: string;
  company: string;
  location: string;
  url: string;
  /** Publication time reported by the source. `null` when the source gives none. */
  postedAt: Date | null;
  /** Plain-text description when the source provides it (truncated). */
  description?: string;
  /** Why the matcher accepted this job (set by the filter; shown in dry runs). */
  matchReason?: string;
  /** Lazily fetches the description for sources whose list endpoint omits it. */
  loadDescription?: () => Promise<string>;
}

export interface SourceFetchContext {
  /** Jobs published before this instant are never useful; sources may stop paging early. */
  cutoff: Date;
  fetchJson: <T>(url: string, init?: RequestInit) => Promise<T>;
}

export interface SourceResult {
  jobs: Job[];
  /** Non-fatal problems (e.g. one company board failed) surfaced in the digest. */
  warnings: string[];
}

export interface JobSource {
  /** Stable key used in config / state, e.g. "greenhouse". */
  key: string;
  /** Sources are skipped when called more often than this (rate-limited public APIs). */
  minIntervalMinutes?: number;
  fetch(ctx: SourceFetchContext): Promise<SourceResult>;
}

export interface Config {
  /** Jobs published before this instant are ignored. */
  startDate: Date;
  /** Jobs older than this many hours (relative to now) are ignored, even if after startDate. */
  maxAgeHours: number;
  /** Highest "N years of experience" a job may require. */
  maxYearsExperience: number;
  /** Accept plain titles ("Software Engineer") when the description proves it is entry level. */
  useDescription: boolean;
  /** Accept plain titles with no level signal at all (noisy; off by default). */
  allowUnleveledTitles: boolean;
  includeInternships: boolean;
  /** Extra role keywords (lowercase) appended to the built-in role list. */
  extraRoleKeywords: string[];
  /** Any title containing one of these (lowercase) is rejected. */
  excludeKeywords: string[];
  /** Empty = anywhere. Otherwise a job must match one of these substrings (case-insensitive). */
  locations: string[];
  /** Remote jobs always pass the location filter when true. */
  remoteAlwaysMatches: boolean;
  notifyWhenEmpty: boolean;
  maxJobsPerRun: number;
  timezone: string;
  intervalMinutes: number;
  sources: {
    simplify: boolean;
    arbeitnow: boolean;
    remoteok: boolean;
    remotive: boolean;
    greenhouse: string[];
    lever: string[];
    ashby: string[];
  };
}

export interface MatchResult {
  matched: boolean;
  /** Short machine-readable reasons, useful for debugging / --verbose output. */
  reason: string;
}
