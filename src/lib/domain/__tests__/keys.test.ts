import { describe, it, expect } from "vitest";
import {
  parseKeySuffix,
  nextKeyNumber,
  workItemKey,
  testCaseKey,
  isUniqueConstraintError,
  isNotFoundError,
  isForeignKeyError,
  createWithSequentialKey,
} from "../keys";

describe("parseKeySuffix", () => {
  it("extracts the trailing number", () => {
    expect(parseKeySuffix("PLAT-12")).toBe(12);
    expect(parseKeySuffix("PLAT-TC3")).toBe(3);
    expect(parseKeySuffix("WEB-1")).toBe(1);
  });

  it("returns 0 when there is no trailing number", () => {
    expect(parseKeySuffix("PLAT")).toBe(0);
    expect(parseKeySuffix("")).toBe(0);
  });
});

describe("nextKeyNumber", () => {
  it("returns 1 for an empty list", () => {
    expect(nextKeyNumber([])).toBe(1);
  });

  it("returns max suffix + 1 (not count) so deletes never collide", () => {
    // Simulates PLAT-1, PLAT-2, PLAT-3 created then PLAT-2 deleted.
    expect(nextKeyNumber(["PLAT-1", "PLAT-3"])).toBe(4);
  });

  it("ignores lexical ordering and uses numeric max", () => {
    expect(nextKeyNumber(["PLAT-9", "PLAT-10", "PLAT-2"])).toBe(11);
  });
});

describe("key formatters", () => {
  it("builds canonical work-item keys", () => {
    expect(workItemKey("PLAT", 42)).toBe("PLAT-42");
  });

  it("builds canonical test-case keys", () => {
    expect(testCaseKey("PLAT", 7)).toBe("PLAT-TC7");
  });
});

describe("prisma error detectors", () => {
  it("detects unique-constraint errors", () => {
    expect(isUniqueConstraintError({ code: "P2002" })).toBe(true);
    expect(isUniqueConstraintError({ code: "P2025" })).toBe(false);
    expect(isUniqueConstraintError(new Error("x"))).toBe(false);
    expect(isUniqueConstraintError(null)).toBe(false);
  });

  it("detects not-found errors", () => {
    expect(isNotFoundError({ code: "P2025" })).toBe(true);
    expect(isNotFoundError({ code: "P2002" })).toBe(false);
  });

  it("detects foreign-key errors", () => {
    expect(isForeignKeyError({ code: "P2003" })).toBe(true);
    expect(isForeignKeyError({ code: "P2002" })).toBe(false);
  });
});

describe("createWithSequentialKey", () => {
  it("returns the created entity on first success", async () => {
    const result = await createWithSequentialKey(
      async () => "PLAT-1",
      async (key) => ({ key }),
    );
    expect(result).toEqual({ key: "PLAT-1" });
  });

  it("retries on P2002 then succeeds with a recomputed key", async () => {
    let attempts = 0;
    const result = await createWithSequentialKey(
      async () => `PLAT-${attempts + 1}`,
      async (key) => {
        attempts++;
        if (attempts < 2) throw { code: "P2002" };
        return { key };
      },
    );
    expect(attempts).toBe(2);
    expect(result).toEqual({ key: "PLAT-2" });
  });

  it("rethrows non-unique errors immediately", async () => {
    await expect(
      createWithSequentialKey(
        async () => "PLAT-1",
        async () => {
          throw new Error("boom");
        },
      ),
    ).rejects.toThrow("boom");
  });

  it("gives up after maxAttempts unique collisions", async () => {
    let attempts = 0;
    await expect(
      createWithSequentialKey(
        async () => "PLAT-1",
        async () => {
          attempts++;
          throw { code: "P2002" };
        },
        3,
      ),
    ).rejects.toBeDefined();
    expect(attempts).toBe(3);
  });
});
