import { readFileSync } from "node:fs";
import type { Config } from "./types.ts";

function asStringArray(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new Error(`config.${field} must be an array of strings`);
  }
  return value as string[];
}

function asBool(value: unknown, field: string, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new Error(`config.${field} must be true or false`);
  return value;
}

function asNumber(value: unknown, field: string, fallback: number, min: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
    throw new Error(`config.${field} must be a number >= ${min}`);
  }
  return value;
}

function asDate(value: unknown, field: string): Date {
  if (typeof value !== "string") throw new Error(`config.${field} is required (ISO date string)`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new Error(`config.${field} is not a valid date: ${value}`);
  return date;
}

export function parseConfig(raw: unknown, env: NodeJS.ProcessEnv = process.env): Config {
  if (typeof raw !== "object" || raw === null) throw new Error("config must be a JSON object");
  const c = raw as Record<string, unknown>;
  const s = (c.sources ?? {}) as Record<string, unknown>;

  const timezone = typeof c.timezone === "string" ? c.timezone : "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new Error(`config.timezone is not a valid IANA time zone: ${timezone}`);
  }

  return {
    startDate: asDate(env.JOB_RADAR_START_DATE ?? c.startDate, "startDate"),
    maxAgeHours: asNumber(c.maxAgeHours, "maxAgeHours", 72, 1),
    maxYearsExperience: asNumber(c.maxYearsExperience, "maxYearsExperience", 2, 0),
    useDescription: asBool(c.useDescription, "useDescription", true),
    allowUnleveledTitles: asBool(c.allowUnleveledTitles, "allowUnleveledTitles", false),
    includeInternships: asBool(c.includeInternships, "includeInternships", false),
    extraRoleKeywords: asStringArray(c.extraRoleKeywords, "extraRoleKeywords").map((v) =>
      v.toLowerCase(),
    ),
    excludeKeywords: asStringArray(c.excludeKeywords, "excludeKeywords").map((v) =>
      v.toLowerCase(),
    ),
    locations: asStringArray(c.locations, "locations").map((v) => v.toLowerCase()),
    remoteAlwaysMatches: asBool(c.remoteAlwaysMatches, "remoteAlwaysMatches", true),
    notifyWhenEmpty: asBool(c.notifyWhenEmpty, "notifyWhenEmpty", true),
    maxJobsPerRun: asNumber(c.maxJobsPerRun, "maxJobsPerRun", 60, 1),
    timezone,
    intervalMinutes: asNumber(c.intervalMinutes, "intervalMinutes", 120, 5),
    sources: {
      simplify: asBool(s.simplify, "sources.simplify", true),
      arbeitnow: asBool(s.arbeitnow, "sources.arbeitnow", true),
      remoteok: asBool(s.remoteok, "sources.remoteok", true),
      remotive: asBool(s.remotive, "sources.remotive", true),
      greenhouse: asStringArray(s.greenhouse, "sources.greenhouse"),
      lever: asStringArray(s.lever, "sources.lever"),
      ashby: asStringArray(s.ashby, "sources.ashby"),
    },
  };
}

export function loadConfig(path: string, env: NodeJS.ProcessEnv = process.env): Config {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    throw new Error(`Cannot read config file ${path}: ${(error as Error).message}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`Config file ${path} is not valid JSON: ${(error as Error).message}`);
  }
  return parseConfig(json, env);
}
