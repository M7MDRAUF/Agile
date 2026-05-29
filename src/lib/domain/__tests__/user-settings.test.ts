import { describe, it, expect } from "vitest";
import {
  parsePreferences,
  formatDateSample,
  formatTimeSample,
  APPEARANCE_DEFAULTS,
  NOTIFICATION_DEFAULTS,
  LOCALIZATION_DEFAULTS,
  type LocalizationPreferences,
} from "@/lib/domain/user-settings";

describe("parsePreferences", () => {
  it("returns defaults when raw is null", () => {
    expect(parsePreferences("appearance", null)).toEqual(APPEARANCE_DEFAULTS);
    expect(parsePreferences("notifications", undefined)).toEqual(NOTIFICATION_DEFAULTS);
  });

  it("returns defaults on invalid JSON", () => {
    expect(parsePreferences("appearance", "{not json")).toEqual(APPEARANCE_DEFAULTS);
  });

  it("merges partial valid data over defaults", () => {
    const parsed = parsePreferences("appearance", JSON.stringify({ theme: "dark" }));
    expect(parsed.theme).toBe("dark");
    expect(parsed.density).toBe(APPEARANCE_DEFAULTS.density);
  });

  it("falls back to defaults when a value is invalid", () => {
    const parsed = parsePreferences("appearance", JSON.stringify({ theme: "rainbow" }));
    expect(parsed).toEqual(APPEARANCE_DEFAULTS);
  });

  it("validates localization shape", () => {
    expect(parsePreferences("localization", null)).toEqual(LOCALIZATION_DEFAULTS);
  });
});

describe("formatDateSample", () => {
  const sample = new Date(Date.UTC(2026, 2, 9, 15, 30)); // 2026-03-09 15:30 UTC

  function withDate(format: LocalizationPreferences["dateFormat"]): LocalizationPreferences {
    return { ...LOCALIZATION_DEFAULTS, dateFormat: format };
  }

  it("formats each supported date pattern", () => {
    expect(formatDateSample(withDate("YYYY-MM-DD"), sample)).toBe("2026-03-09");
    expect(formatDateSample(withDate("MM/DD/YYYY"), sample)).toBe("03/09/2026");
    expect(formatDateSample(withDate("DD/MM/YYYY"), sample)).toBe("09/03/2026");
    expect(formatDateSample(withDate("DD MMM YYYY"), sample)).toBe("09 Mar 2026");
  });
});

describe("formatTimeSample", () => {
  const sample = new Date(Date.UTC(2026, 2, 9, 15, 30));

  it("formats 24-hour time", () => {
    expect(formatTimeSample({ ...LOCALIZATION_DEFAULTS, timeFormat: "24h" }, sample)).toBe("15:30");
  });

  it("formats 12-hour time", () => {
    expect(formatTimeSample({ ...LOCALIZATION_DEFAULTS, timeFormat: "12h" }, sample)).toBe(
      "3:30 PM",
    );
  });
});
