import type { Config, Job, MatchResult } from "./types.ts";

export type MatcherOptions = Pick<
  Config,
  | "maxYearsExperience"
  | "useDescription"
  | "allowUnleveledTitles"
  | "includeInternships"
  | "extraRoleKeywords"
  | "excludeKeywords"
>;

/** Lowercases and reduces a title to space separated alphanumeric tokens (keeps c++, c#, .net readable). */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/c\+\+/g, "cpp")
    .replace(/c#/g, "csharp")
    .replace(/\.net\b/g, "dotnet")
    .replace(/node\.js/g, "nodejs")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const TECH_WORDS =
  "full stack|fullstack|web|front end|frontend|back end|backend|applications?|mobile|ios|android|" +
  "java|python|javascript|typescript|react|angular|vue|node|nodejs|golang|dotnet|php|ruby|rails|" +
  "csharp|cpp|rust|kotlin|flutter|laravel|django|wordpress";

// Each entry is a way a software-developer title can be written.
const ROLE_PATTERNS: RegExp[] = [
  /\b(swe|sde)\b/,
  /\bsoftware(?: \w+){0,3}? (?:engineer|engineers|developer|developers|development|engineering|programmer)\b/,
  new RegExp(`\\b(?:${TECH_WORDS})(?: \\w+)? (?:engineer|developer|programmer)\\b`),
  /\b(?:full stack|fullstack)\b/,
];

/** Only meaningful together with an entry-level signal ("Junior Developer"). */
const GENERIC_DEV_PATTERN = /\b(?:developer|programmer|developers)\b/;

// Strong signals identify early-career hiring on their own; description years do not override them.
const STRONG_ENTRY_PATTERNS: RegExp[] = [
  /\bnew ?grads?\b/,
  /\bnew graduates?\b/,
  /\b(?:recent|fresh) (?:grads?|graduates?)\b/,
  /\b(?:university|college|campus) (?:grads?|graduates?|hires?|recruiting|talent)\b/,
  /\bgrads?\b/,
  /\bgraduates?\b/,
  /\bentry level\b/,
  /\bentry\b(?= (?:level|engineer|developer|software))/,
  /\bearly (?:in )?careers?\b/,
  /\bearly talent\b/,
  /\bclass of 20\d\d\b/,
  /\b20\d\d (?:new )?grads?\b/,
  /\bfreshers?\b/,
  /\btrainee\b/,
  /\bapprentice(?:ship)?\b/,
];

// Weaker signals: the title says junior-ish, but the description may still disagree.
const WEAK_ENTRY_PATTERNS: RegExp[] = [
  /\b(?:junior|jr)\b/,
  /\b(?:engineer|engineers|developer|developers|programmer|swe|sde|engineering) (?:i|1)\b/,
  /\b(?:level|lvl) (?:1|i)\b/,
];

// "Associate" alone is too vague to promote a bare "developer" title, but fine next to software/tech words.
const ASSOCIATE_PATTERN = /\bassociate\b/;

const INTERN_PATTERN = /\b(?:interns?|internships?|co op|coop|summer \d{4}|placement year)\b/;

const SENIORITY_EXCLUDES: RegExp[] = [
  /\b(?:senior|sr|staff|principal|lead|leader|manager|mgr|director|head|vp|vice president|architect|distinguished|fellow|chief|president|expert|experienced)\b/,
  /\bmid(?: level)?\b/,
  /\b(?:engineer|engineers|developer|developers|programmer|swe|sde|engineering) (?:ii|iii|iv|v|2|3|4|5)\b/,
  /\b(?:level|lvl) (?:2|3|4|5|ii|iii|iv)\b/,
];

const NON_SOFTWARE_EXCLUDES = [
  "support",
  "sales",
  "hardware",
  "mechanical",
  "electrical",
  "civil",
  "chemical",
  "field",
  "customer",
  "marketing",
  "recruiter",
  "technician",
  "analyst",
  "scientist",
  "designer",
  "writer",
  "account",
  "teacher",
  "instructor",
  "driver",
  "nurse",
  "solutions engineer",
  "quality assurance",
  "sdet",
  "qa",
];

const DESCRIPTION_ENTRY_PATTERNS: RegExp[] = [
  /\bentry[- ]level\b/,
  /\bnew ?grads?\b/,
  /\bnew graduates?\b/,
  /\b(?:recent|fresh) (?:grads?|graduates?)\b/,
  /\brecently graduated\b/,
  /\bearly[- ]career\b/,
  /\bno (?:prior|previous)(?: professional| industry| work| software| coding| programming)? experience (?:is )?(?:required|needed|necessary)\b/,
  /\bclass of 20\d\d\b/,
];

function includesPhrase(haystack: string, phrase: string): boolean {
  const needle = normalizeText(phrase);
  if (!needle) return false;
  return new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(haystack);
}

export interface YearBounds {
  /** Lowest lower-bound found: if even this exceeds the limit, every stated requirement does. */
  min: number;
  /** Highest lower-bound found: if even this is tiny, every stated requirement is tiny. */
  max: number;
}

/**
 * "N years of experience" requirements mentioned in a description (lower bound of ranges), or null
 * when the text states none. Mentions that are not about experience ("4 year degree",
 * "founded 10 years ago") are ignored.
 */
export function extractYearBounds(description: string): YearBounds | null {
  const text = description.toLowerCase().replace(/\s+/g, " ");
  const pattern =
    /(\d{1,2})\s*(?:\+|plus)?(?:\s*(?:-|–|—|to)\s*(\d{1,2}))?\s*\+?\s*(?:years?|yrs?)\b/g;
  const related =
    /experience|exp\b|professional|industry|hands[- ]on|working (?:as|in|with)|background/;
  let bounds: YearBounds | null = null;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const before = text.slice(Math.max(0, start - 70), start);
    const after = text.slice(end, end + 70);
    if (/^[\s-]*(?:degree|college|university|bachelor|old)/.test(after)) continue;
    if (/^\s*(?:ago|in business|of age)/.test(after)) continue;
    if (!related.test(`${before} ${after}`)) continue;
    const years = Number.parseInt(match[1] ?? "", 10);
    if (Number.isNaN(years)) continue;
    bounds = bounds
      ? { min: Math.min(bounds.min, years), max: Math.max(bounds.max, years) }
      : { min: years, max: years };
  }
  return bounds;
}

export function matchJob(
  job: Pick<Job, "title" | "description">,
  options: MatcherOptions,
  description?: string,
): MatchResult {
  const title = normalizeText(job.title);
  const reject = (reason: string): MatchResult => ({ matched: false, reason });

  for (const pattern of SENIORITY_EXCLUDES) {
    if (pattern.test(title)) return reject("senior-title");
  }
  const strong = STRONG_ENTRY_PATTERNS.some((p) => p.test(title));
  const weak = WEAK_ENTRY_PATTERNS.some((p) => p.test(title));
  const associate = ASSOCIATE_PATTERN.test(title);
  const internTitle = INTERN_PATTERN.test(title);
  if (internTitle && !strong && !options.includeInternships) return reject("internship");

  for (const word of NON_SOFTWARE_EXCLUDES) {
    if (includesPhrase(title, word)) return reject(`excluded:${word}`);
  }
  for (const word of options.excludeKeywords) {
    if (includesPhrase(title, word)) return reject(`excluded:${word}`);
  }

  const entryInTitle = strong || weak || associate || (options.includeInternships && internTitle);
  const isSoftwareRole =
    ROLE_PATTERNS.some((p) => p.test(title)) ||
    options.extraRoleKeywords.some((k) => includesPhrase(title, k)) ||
    ((strong || weak) && GENERIC_DEV_PATTERN.test(title));
  if (!isSoftwareRole) return reject("not-software-role");

  const text = description ?? job.description ?? "";
  const bounds = text ? extractYearBounds(text) : null;

  if (entryInTitle) {
    if (!strong && bounds && bounds.min > options.maxYearsExperience) {
      return reject(`needs-${bounds.min}-years`);
    }
    return { matched: true, reason: strong ? "title:entry" : "title:junior" };
  }

  if (options.useDescription && text) {
    if (bounds && bounds.min > options.maxYearsExperience)
      return reject(`needs-${bounds.min}-years`);
    const entryPhrase = DESCRIPTION_ENTRY_PATTERNS.some((p) => p.test(text.toLowerCase()));
    if (entryPhrase) return { matched: true, reason: "description:entry" };
    if (bounds && bounds.max <= 1) return { matched: true, reason: "description:years" };
  }

  if (options.allowUnleveledTitles) {
    if (bounds && bounds.min > options.maxYearsExperience)
      return reject(`needs-${bounds.min}-years`);
    return { matched: true, reason: "unleveled-title" };
  }
  return reject("no-entry-signal");
}

/** True when the title is a software role that is not obviously senior, so a description could decide. */
export function needsDescription(job: Pick<Job, "title">, options: MatcherOptions): boolean {
  if (!options.useDescription) return false;
  const first = matchJob({ title: job.title }, { ...options, allowUnleveledTitles: false });
  return !first.matched && first.reason === "no-entry-signal";
}
