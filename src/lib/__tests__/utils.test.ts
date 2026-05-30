import { describe, it, expect } from "vitest";
import { cn, initials, humanize, accessibleBadgeBackground } from "@/lib/utils";

describe("cn", () => {
  it("merges and dedupes tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });
});

describe("initials", () => {
  it("returns up to two uppercased initials", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("madonna")).toBe("M");
    expect(initials("Jean Luc Picard")).toBe("JL");
  });
});

describe("humanize", () => {
  it("title-cases enum tokens", () => {
    expect(humanize("in_progress")).toBe("In Progress");
    expect(humanize("done")).toBe("Done");
  });
});

describe("accessibleBadgeBackground", () => {
  // White-on-color contrast ratio, mirroring the WCAG formula.
  function whiteContrast(hex: string): number {
    const n = hex.replace(/^#/, "");
    const rgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
    const lin = rgb.map((s) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4));
    const lum = 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
    return 1.05 / (lum + 0.05);
  }

  it("darkens light brand colors until white text meets AA contrast (4.5:1)", () => {
    for (const color of ["#6366f1", "#14b8a6", "#8b5cf6", "#ec4899"]) {
      const result = accessibleBadgeBackground(color);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
      expect(whiteContrast(result)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("falls back to a safe indigo for missing or invalid input", () => {
    for (const bad of [undefined, null, "", "not-a-color", "#xyz"]) {
      const result = accessibleBadgeBackground(bad);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
      expect(whiteContrast(result)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("accepts shorthand hex", () => {
    const result = accessibleBadgeBackground("#09c");
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    expect(whiteContrast(result)).toBeGreaterThanOrEqual(4.5);
  });
});
