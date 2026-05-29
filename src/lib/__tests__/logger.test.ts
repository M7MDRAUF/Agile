import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { logger } from "../logger";

describe("logger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("emits structured JSON on info", () => {
    logger.info("hello", { user: "u1" });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("hello");
    expect(parsed.user).toBe("u1");
    expect(typeof parsed.time).toBe("string");
  });

  it("routes warn/error to stderr", () => {
    logger.warn("careful");
    logger.error("boom");
    expect(errSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("serialises Error instances with stack", () => {
    logger.error("failure", { err: new Error("nope") });
    const parsed = JSON.parse(errSpy.mock.calls[0][0] as string);
    expect(parsed.err.name).toBe("Error");
    expect(parsed.err.message).toBe("nope");
    expect(typeof parsed.err.stack).toBe("string");
  });
});
