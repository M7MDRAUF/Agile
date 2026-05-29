import { describe, it, expect } from "vitest";
import { describeUserAgent } from "@/lib/domain/user-agent";

describe("describeUserAgent", () => {
  it("returns unknowns for empty input", () => {
    const info = describeUserAgent("");
    expect(info.browser).toBe("Unknown browser");
    expect(info.os).toBe("Unknown OS");
  });

  it("detects Chrome on Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
    const info = describeUserAgent(ua);
    expect(info.browser).toBe("Chrome");
    expect(info.os).toBe("Windows");
    expect(info.deviceLabel).toBe("Chrome on Windows");
  });

  it("detects Safari on macOS", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
    const info = describeUserAgent(ua);
    expect(info.browser).toBe("Safari");
    expect(info.os).toBe("macOS");
  });

  it("prefers Edge over Chrome when both tokens present", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0";
    expect(describeUserAgent(ua).browser).toBe("Edge");
  });

  it("detects Firefox on Linux", () => {
    const ua = "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0";
    const info = describeUserAgent(ua);
    expect(info.browser).toBe("Firefox");
    expect(info.os).toBe("Linux");
  });
});
