import { describe, it, expect } from "vitest";
import {
  isDone,
  sprintProgress,
  burndown,
  velocity,
  cycleTimeDays,
  leadTimeDays,
  projectHealth,
  countBy,
  blockerAgeDays,
} from "@/lib/domain/metrics";

describe("isDone", () => {
  it("recognises done statuses", () => {
    expect(isDone("done")).toBe(true);
    expect(isDone("in_progress")).toBe(false);
  });
});

describe("sprintProgress", () => {
  it("computes completion by story points", () => {
    const result = sprintProgress([
      { status: "done", storyPoints: 3 },
      { status: "done", storyPoints: 2 },
      { status: "in_progress", storyPoints: 5 },
    ]);
    expect(result.totalPoints).toBe(10);
    expect(result.completedPoints).toBe(5);
    expect(result.completedItems).toBe(2);
    expect(result.percentComplete).toBe(50);
  });

  it("falls back to item count when no points exist", () => {
    const result = sprintProgress([{ status: "done" }, { status: "todo" }]);
    expect(result.percentComplete).toBe(50);
  });

  it("returns zero for an empty sprint", () => {
    expect(sprintProgress([]).percentComplete).toBe(0);
  });
});

describe("burndown", () => {
  it("produces an ideal line from total to zero", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2024-01-11");
    const series = burndown(20, start, end, [{ date: new Date("2024-01-05"), points: 8 }]);
    expect(series[0].ideal).toBe(20);
    expect(series[series.length - 1].ideal).toBe(0);
    // remaining drops after the completion date
    expect(series[series.length - 1].remaining).toBe(12);
  });
});

describe("velocity", () => {
  it("averages completed points", () => {
    expect(velocity([10, 20, 30])).toBe(20);
  });
  it("returns zero with no history", () => {
    expect(velocity([])).toBe(0);
  });
});

describe("cycleTimeDays", () => {
  it("averages days between created and completed", () => {
    const items = [
      { status: "done", createdAt: new Date("2024-01-01"), completedAt: new Date("2024-01-03") },
      { status: "done", createdAt: new Date("2024-01-01"), completedAt: new Date("2024-01-05") },
    ];
    expect(cycleTimeDays(items)).toBe(3);
  });
  it("ignores unfinished items", () => {
    expect(cycleTimeDays([{ status: "todo" }])).toBe(0);
  });
});

describe("leadTimeDays", () => {
  it("averages days between created and completed", () => {
    const items = [
      { status: "done", createdAt: new Date("2024-01-01"), completedAt: new Date("2024-01-05") },
      { status: "done", createdAt: new Date("2024-01-01"), completedAt: new Date("2024-01-07") },
    ];
    expect(leadTimeDays(items)).toBe(5);
  });
  it("prefers startedAt over createdAt for cycle time", () => {
    const items = [
      {
        status: "done",
        createdAt: new Date("2024-01-01"),
        startedAt: new Date("2024-01-03"),
        completedAt: new Date("2024-01-05"),
      },
    ];
    expect(cycleTimeDays(items)).toBe(2);
    expect(leadTimeDays(items)).toBe(4);
  });
  it("ignores unfinished items", () => {
    expect(leadTimeDays([{ status: "todo" }])).toBe(0);
  });
});

describe("projectHealth", () => {
  const now = new Date("2024-06-01");

  it("reports on_track with no risks", () => {
    const r = projectHealth({ items: [{ status: "done" }], openBlockers: 0, now });
    expect(r.health).toBe("on_track");
    expect(r.score).toBe(100);
  });

  it("degrades health with overdue items and blockers", () => {
    const r = projectHealth({
      items: [
        { status: "in_progress", dueDate: new Date("2024-05-01") },
        { status: "in_progress", dueDate: new Date("2024-05-02") },
      ],
      openBlockers: 4,
      now,
    });
    expect(r.score).toBeLessThan(75);
    expect(r.reasons.some((x) => x.includes("overdue"))).toBe(true);
    expect(r.reasons.some((x) => x.includes("blocker"))).toBe(true);
  });

  it("penalises open critical bugs", () => {
    const r = projectHealth({
      items: [{ status: "in_progress", type: "bug", priority: "critical" }],
      openBlockers: 0,
      now,
    });
    expect(r.reasons.some((x) => x.includes("critical bug"))).toBe(true);
  });
});

describe("countBy", () => {
  it("groups by key", () => {
    const result = countBy([{ t: "bug" }, { t: "bug" }, { t: "task" }], (i) => i.t);
    expect(result).toEqual({ bug: 2, task: 1 });
  });
});

describe("blockerAgeDays", () => {
  it("computes whole days open", () => {
    const created = new Date("2024-01-01");
    const now = new Date("2024-01-04T12:00:00");
    expect(blockerAgeDays(created, now)).toBe(3);
  });
  it("never returns negative", () => {
    expect(blockerAgeDays(new Date("2024-01-10"), new Date("2024-01-01"))).toBe(0);
  });
});
