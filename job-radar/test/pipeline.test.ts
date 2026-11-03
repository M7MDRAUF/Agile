import { describe, expect, it, vi } from "vitest";
import { parseConfig } from "../src/config.ts";
import { filterJobs, freshnessCutoff, isFresh, matchesLocation } from "../src/filter.ts";
import type { Channel } from "../src/notify/channels.ts";
import { buildJobNotifications, formatAge } from "../src/notify/format.ts";
import { runOnce } from "../src/run.ts";
import { emptyState, fingerprint, isSeen, markSeen, prune } from "../src/state.ts";
import type { Config, Job, JobSource } from "../src/types.ts";

const NOW = new Date("2026-11-03T20:00:00Z");

const config = (overrides: Record<string, unknown> = {}): Config =>
  parseConfig({ startDate: "2026-11-03T00:00:00-08:00", ...overrides }, {});

const job = (overrides: Partial<Job> = {}): Job => ({
  id: "t:1",
  source: "Test",
  title: "Software Engineer, New Grad",
  company: "Acme Inc",
  location: "Remote",
  url: "https://example.com/1",
  postedAt: new Date("2026-11-03T18:00:00Z"),
  ...overrides,
});

describe("freshness", () => {
  it("never goes earlier than startDate", () => {
    const c = config({ maxAgeHours: 24 * 30 });
    expect(freshnessCutoff(c, NOW).toISOString()).toBe("2026-11-03T08:00:00.000Z");
  });

  it("is limited by maxAgeHours once startDate is old", () => {
    const c = config({ maxAgeHours: 6 });
    expect(freshnessCutoff(c, NOW).toISOString()).toBe("2026-11-03T14:00:00.000Z");
  });

  it("rejects old, undated and far-future jobs", () => {
    const cutoff = freshnessCutoff(config(), NOW);
    expect(isFresh(job(), cutoff, NOW)).toBe(true);
    expect(isFresh(job({ postedAt: new Date("2026-11-02T23:00:00Z") }), cutoff, NOW)).toBe(false);
    expect(isFresh(job({ postedAt: null }), cutoff, NOW)).toBe(false);
    expect(isFresh(job({ postedAt: new Date("2026-12-25T00:00:00Z") }), cutoff, NOW)).toBe(false);
  });
});

describe("location filter", () => {
  it("allows everything when no locations are configured", () => {
    expect(matchesLocation(job({ location: "Tokyo" }), config())).toBe(true);
  });

  it("matches substrings and always lets remote through", () => {
    const c = config({ locations: ["Riyadh", "Canada"] });
    expect(matchesLocation(job({ location: "Riyadh, Saudi Arabia" }), c)).toBe(true);
    expect(matchesLocation(job({ location: "Toronto, Canada" }), c)).toBe(true);
    expect(matchesLocation(job({ location: "Remote - US" }), c)).toBe(true);
    expect(matchesLocation(job({ location: "Berlin" }), c)).toBe(false);
    expect(
      matchesLocation(
        job({ location: "Berlin" }),
        config({ locations: ["riyadh"], remoteAlwaysMatches: false }),
      ),
    ).toBe(false);
  });
});

describe("filterJobs", () => {
  it("combines date, title and lazily loaded descriptions", async () => {
    const c = config();
    const cutoff = freshnessCutoff(c, NOW);
    const loader = vi.fn(async () => "Entry-level role, 0-1 years of experience.");
    const unrelated = vi.fn(async () => "x");
    const result = await filterJobs(
      [
        job({ id: "a", title: "Junior Full Stack Developer" }),
        job({ id: "b", title: "Senior Software Engineer", loadDescription: unrelated }),
        job({ id: "c", title: "Software Engineer", loadDescription: loader }),
        job({
          id: "d",
          title: "Junior Software Engineer",
          postedAt: new Date("2026-10-30T00:00:00Z"),
        }),
      ],
      c,
      cutoff,
      NOW,
    );
    expect(result.jobs.map((j) => j.id)).toEqual(["a", "c"]);
    expect(loader).toHaveBeenCalledOnce();
    expect(unrelated).not.toHaveBeenCalled();
    expect(result.stats.notFresh).toBe(1);
  });

  it("survives a failing description loader", async () => {
    const c = config();
    const result = await filterJobs(
      [
        job({
          title: "Software Engineer",
          loadDescription: async () => {
            throw new Error("boom");
          },
        }),
      ],
      c,
      freshnessCutoff(c, NOW),
      NOW,
    );
    expect(result.jobs).toHaveLength(0);
    expect(result.stats.descriptionErrors).toBe(1);
  });
});

describe("state", () => {
  it("dedupes across sources by company + title", () => {
    const state = emptyState();
    markSeen(state, job({ id: "greenhouse:acme:1", company: "Acme, Inc." }), NOW);
    expect(isSeen(state, job({ id: "simplify:xyz", company: "ACME" }))).toBe(true);
    expect(isSeen(state, job({ id: "x", title: "Software Engineer, Early Career" }))).toBe(false);
    expect(fingerprint(job({ company: "Acme LLC" }))).toBe(fingerprint(job({ company: "acme" })));
  });

  it("recognises the same ATS posting reached through different sources", () => {
    const state = emptyState();
    markSeen(
      state,
      job({
        id: "greenhouse:databricks:8847747002",
        title: "Software Engineer New Grad",
        url: "https://boards.greenhouse.io/databricks/jobs/8847747002",
      }),
      NOW,
    );
    const viaSimplify = job({
      id: "simplify:abc",
      title: "Software Engineer - New Grad (2027 Start) - London",
      company: "Databricks",
      url: "https://databricks.com/company/careers/open-positions/job?gh_jid=8847747002",
    });
    expect(isSeen(state, viaSimplify)).toBe(true);
  });

  it("prunes old entries", () => {
    const state = emptyState();
    markSeen(state, job(), new Date("2026-09-01T00:00:00Z"));
    markSeen(state, job({ id: "t:2", title: "Junior Developer" }), NOW);
    const before = Object.keys(state.seen).length;
    expect(prune(state, NOW)).toBe(2);
    expect(Object.keys(state.seen)).toHaveLength(before - 2);
  });
});

describe("formatting", () => {
  it("splits long digests under the byte limit", () => {
    const jobs = Array.from({ length: 40 }, (_, i) =>
      job({
        id: `t:${i}`,
        title: `Software Engineer, New Grad ${i}`,
        url: `https://example.com/jobs/${i}`,
      }),
    );
    const ctx = {
      now: NOW,
      timezone: "America/Los_Angeles",
      warnings: [],
      checked: 40,
      sourcesChecked: 3,
    };
    const messages = buildJobNotifications(jobs, ctx, {
      measure: (s) => Buffer.byteLength(s, "utf8"),
      max: 1500,
      format: "text",
    });
    expect(messages.length).toBeGreaterThan(1);
    for (const message of messages) {
      expect(Buffer.byteLength(message.text, "utf8")).toBeLessThanOrEqual(1500);
    }
    expect(messages.map((m) => m.text).join("\n")).toContain("https://example.com/jobs/39");
    expect(messages[0]?.title).toContain("(1/");
  });

  it("escapes HTML for Telegram", () => {
    const ctx = { now: NOW, timezone: "UTC", warnings: [], checked: 1, sourcesChecked: 1 };
    const [message] = buildJobNotifications([job({ title: "Dev <b>& co" })], ctx, {
      measure: (s) => s.length,
      max: 3800,
      format: "html",
    });
    expect(message?.html).toContain("Dev &lt;b&gt;&amp; co");
  });

  it("formats ages", () => {
    expect(formatAge(new Date(NOW.getTime() - 5 * 60_000), NOW)).toBe("5m ago");
    expect(formatAge(new Date(NOW.getTime() - 3 * 3_600_000), NOW)).toBe("3h ago");
  });
});

function fakeChannel(fail = false): Channel & { jobs: Job[][]; heartbeats: number } {
  const channel = {
    name: "fake",
    jobs: [] as Job[][],
    heartbeats: 0,
    async sendJobs(jobs: Job[]) {
      if (fail) throw new Error("down");
      channel.jobs.push(jobs);
      return 1;
    },
    async sendHeartbeat() {
      if (fail) throw new Error("down");
      channel.heartbeats++;
    },
    async sendRaw() {},
  };
  return channel;
}

const sourceOf = (jobs: Job[], extra: Partial<JobSource> = {}): JobSource => ({
  key: "fake",
  fetch: async () => ({ jobs, warnings: [] }),
  ...extra,
});

describe("runOnce", () => {
  const log = () => {};

  it("notifies once per job, never twice", async () => {
    const state = emptyState();
    const channel = fakeChannel();
    const sources = [
      sourceOf([job({ id: "a" }), job({ id: "b", title: "Junior Developer", company: "Beta" })]),
    ];
    const first = await runOnce({
      config: config(),
      state,
      channels: [channel],
      now: NOW,
      sources,
      log,
    });
    expect(first.newJobs).toHaveLength(2);
    expect(first.stateChanged).toBe(true);

    const second = await runOnce({
      config: config(),
      state,
      channels: [channel],
      now: NOW,
      sources,
      log,
    });
    expect(second.newJobs).toHaveLength(0);
    expect(channel.jobs).toHaveLength(1);
    expect(channel.heartbeats).toBe(1);
  });

  it("does not notify about jobs published before startDate", async () => {
    const channel = fakeChannel();
    const old = job({ postedAt: new Date("2026-11-02T20:00:00Z") });
    const result = await runOnce({
      config: config({ notifyWhenEmpty: false }),
      state: emptyState(),
      channels: [channel],
      now: NOW,
      sources: [sourceOf([old])],
      log,
    });
    expect(result.newJobs).toHaveLength(0);
    expect(channel.jobs).toHaveLength(0);
    expect(channel.heartbeats).toBe(0);
  });

  it("keeps jobs unseen when every channel fails so they retry next run", async () => {
    const state = emptyState();
    const result = await runOnce({
      config: config(),
      state,
      channels: [fakeChannel(true)],
      now: NOW,
      sources: [sourceOf([job()])],
      log,
    });
    expect(result.error).toMatch(/all notification channels failed/);
    expect(Object.keys(state.seen)).toHaveLength(0);
  });

  it("reports a missing channel instead of silently swallowing jobs", async () => {
    const state = emptyState();
    const result = await runOnce({
      config: config(),
      state,
      channels: [],
      now: NOW,
      sources: [sourceOf([job()])],
      log,
    });
    expect(result.error).toMatch(/no notification channel/);
    expect(Object.keys(state.seen)).toHaveLength(0);
  });

  it("dry-run sends nothing and saves nothing", async () => {
    const state = emptyState();
    const channel = fakeChannel();
    const result = await runOnce({
      config: config(),
      state,
      channels: [channel],
      now: NOW,
      dryRun: true,
      sources: [sourceOf([job()])],
      log,
    });
    expect(result.newJobs).toHaveLength(1);
    expect(channel.jobs).toHaveLength(0);
    expect(result.stateChanged).toBe(false);
  });

  it("fails when every source fails, but tolerates a partial failure", async () => {
    const broken: JobSource = {
      key: "broken",
      fetch: async () => {
        throw new Error("HTTP 500");
      },
    };
    const channel = fakeChannel();
    const allBroken = await runOnce({
      config: config(),
      state: emptyState(),
      channels: [channel],
      now: NOW,
      sources: [broken],
      log,
    });
    expect(allBroken.error).toBe("every job source failed");

    const partial = await runOnce({
      config: config(),
      state: emptyState(),
      channels: [channel],
      now: NOW,
      sources: [broken, sourceOf([job()])],
      log,
    });
    expect(partial.error).toBeUndefined();
    expect(partial.newJobs).toHaveLength(1);
    expect(partial.warnings[0]).toContain("broken");
  });

  it("throttles rate-limited sources", async () => {
    const state = emptyState();
    const fetch = vi.fn(async () => ({ jobs: [] as Job[], warnings: [] }));
    const limited: JobSource = { key: "limited", minIntervalMinutes: 360, fetch };
    const channel = fakeChannel();
    const base = {
      config: config({ notifyWhenEmpty: false }),
      state,
      channels: [channel],
      sources: [limited, sourceOf([])],
      log,
    };
    await runOnce({ ...base, now: NOW });
    await runOnce({ ...base, now: new Date(NOW.getTime() + 2 * 3_600_000) });
    expect(fetch).toHaveBeenCalledTimes(1);
    await runOnce({ ...base, now: new Date(NOW.getTime() + 7 * 3_600_000) });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("caps notifications per run and carries the rest over", async () => {
    const state = emptyState();
    const channel = fakeChannel();
    const jobs = Array.from({ length: 5 }, (_, i) => job({ id: `j${i}`, company: `Co${i}` }));
    const base = {
      config: config({ maxJobsPerRun: 2 }),
      state,
      channels: [channel],
      now: NOW,
      sources: [sourceOf(jobs)],
      log,
    };
    expect((await runOnce(base)).newJobs).toHaveLength(2);
    expect((await runOnce(base)).newJobs).toHaveLength(2);
    expect((await runOnce(base)).newJobs).toHaveLength(1);
  });
});

describe("parseConfig", () => {
  it("validates input", () => {
    expect(() => parseConfig({}, {})).toThrow(/startDate/);
    expect(() => parseConfig({ startDate: "nope" }, {})).toThrow(/valid date/);
    expect(() =>
      parseConfig({ startDate: "2026-11-03T00:00:00Z", timezone: "Mars/Base" }, {}),
    ).toThrow(/time zone/);
    expect(() => parseConfig({ startDate: "2026-11-03T00:00:00Z", locations: "x" }, {})).toThrow(
      /locations/,
    );
  });

  it("lets an env var override startDate", () => {
    const c = parseConfig(
      { startDate: "2026-11-03T00:00:00Z" },
      { JOB_RADAR_START_DATE: "2026-12-01T00:00:00Z" },
    );
    expect(c.startDate.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
});
