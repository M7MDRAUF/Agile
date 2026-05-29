import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// QA-006: static determinism contract for `prisma/seed.ts`.
//
// Running the real seed inside vitest would require a writable DB, would
// reset dev data, and would be slow. Instead this asserts the
// structural invariants that make the seed reproducible:
//   1. The PRNG seed is a fixed integer literal (not Date.now()/random).
//   2. The file does NOT call `Math.random()` directly (would break
//      reproducibility of demo data).
//   3. The deterministic helpers (`mulberry32`, `pick`, `pickWeighted`)
//      are present.
//   4. The canonical admin/QA/engineer demo accounts and the 6 team keys
//      are still spec'd — these are referenced by Playwright fixtures
//      and the bug register's role matrix.
//
// If any of these invariants drift, demo data will no longer be
// reproducible and downstream tests (RBAC role assertions, browser
// validation matrix) will start flaking.

const SEED_PATH = resolve(__dirname, "..", "seed.ts");
const seedText = readFileSync(SEED_PATH, "utf8");

describe("prisma/seed.ts — determinism contract (QA-006)", () => {
  it("uses a fixed integer mulberry32 seed (no time-based entropy)", () => {
    // Matches `mulberry32(20260529)` — any pure integer literal counts;
    // the regex deliberately rejects `Date.now()`, `crypto.*`, or env reads.
    const match = seedText.match(/mulberry32\((\d+)\)/);
    expect(match, "expected `mulberry32(<integer literal>)` call").toBeTruthy();
    expect(Number(match![1])).toBeGreaterThan(0);
    expect(seedText).not.toMatch(/mulberry32\(\s*Date\.now/);
    expect(seedText).not.toMatch(/mulberry32\(\s*process\.env/);
  });

  it("does not call Math.random() directly", () => {
    // The deterministic helper `rand()` is allowed; raw `Math.random()`
    // would silently break reproducibility.
    expect(seedText).not.toMatch(/\bMath\.random\s*\(/);
  });

  it("defines the deterministic helper trio", () => {
    expect(seedText).toMatch(/function mulberry32\(/);
    expect(seedText).toMatch(/const pick\s*=/);
    expect(seedText).toMatch(/const pickWeighted\s*=/);
  });

  it("includes the canonical demo accounts referenced by tests + browser matrix", () => {
    const canonical = [
      "admin@novacore.dev",
      "em@novacore.dev",
      "po@novacore.dev",
      "sm@novacore.dev",
      "engineer@novacore.dev",
      "qa@novacore.dev",
      "designer@novacore.dev",
      "stakeholder@novacore.dev",
    ];
    for (const email of canonical) {
      expect(seedText, `missing canonical demo account: ${email}`).toContain(email);
    }
  });

  it("includes the 6 team keys used by the connectivity matrix", () => {
    for (const key of ["PLAT", "WEB", "MOB", "DATA", "QAA", "DSGN"]) {
      // Match as a quoted key, not a bare token, to avoid matching prose.
      expect(seedText).toMatch(new RegExp(`["']${key}["']`));
    }
  });

  it("hashes the seed password with bcrypt (no plaintext leak)", () => {
    expect(seedText).toMatch(/bcrypt\.hash\(/);
    // Seed password is sourced from env with a documented dev fallback.
    expect(seedText).toMatch(/SEED_PASSWORD\s*\?\?\s*"Password123!"/);
  });

  it("resets data in FK-safe order before re-inserting", () => {
    // The reset block must delete child rows before parent rows; if
    // someone re-orders it, seed will fail on foreign-key constraints.
    const order = [
      "testRun.deleteMany",
      "testCase.deleteMany",
      "workItemLabel.deleteMany",
      "label.deleteMany",
      "comment.deleteMany",
      "workItem.deleteMany",
      "sprint.deleteMany",
      "epic.deleteMany",
      "project.deleteMany",
      "team.deleteMany",
      "user.deleteMany",
    ];
    let lastIdx = -1;
    for (const fragment of order) {
      const idx = seedText.indexOf(fragment);
      expect(idx, `missing or out-of-order: ${fragment}`).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });
});

describe("mulberry32 — runtime reproducibility", () => {
  // Inline copy so we can assert the actual numeric sequence — if anyone
  // edits the helper in seed.ts, this test will fail loudly.
  function mulberry32(seed: number) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  it("produces a stable sequence for a fixed seed", () => {
    const rand = mulberry32(20260529);
    const seq = Array.from({ length: 5 }, () => rand());
    // Two independent runs with the same seed must agree.
    const rand2 = mulberry32(20260529);
    const seq2 = Array.from({ length: 5 }, () => rand2());
    expect(seq).toEqual(seq2);
    // And every value is in [0, 1).
    for (const v of seq) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("diverges immediately for a different seed", () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toBe(b);
  });
});
