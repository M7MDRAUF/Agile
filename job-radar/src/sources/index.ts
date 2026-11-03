import type { Config, JobSource } from "../types.ts";
import { arbeitnowSource } from "./arbeitnow.ts";
import { ashbySource, greenhouseSource, leverSource } from "./ats.ts";
import { remoteOkSource } from "./remoteok.ts";
import { remotiveSource } from "./remotive.ts";
import { simplifySource } from "./simplify.ts";

/** Direct company boards first so a job also listed on an aggregator keeps the primary link. */
export function buildSources(config: Config): JobSource[] {
  const { sources } = config;
  const list: JobSource[] = [];
  if (sources.greenhouse.length) list.push(greenhouseSource(sources.greenhouse));
  if (sources.lever.length) list.push(leverSource(sources.lever));
  if (sources.ashby.length) list.push(ashbySource(sources.ashby));
  if (sources.simplify) list.push(simplifySource);
  if (sources.arbeitnow) list.push(arbeitnowSource);
  if (sources.remoteok) list.push(remoteOkSource);
  if (sources.remotive) list.push(remotiveSource);
  return list;
}
