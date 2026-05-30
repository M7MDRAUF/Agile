import { describe, it, expect } from "vitest";
import { assertSameOrigin } from "@/lib/http/origin";

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/export/profile", { headers });
}

describe("assertSameOrigin (SEC-007)", () => {
  it("allows requests with no Origin header (curl, server-side fetch)", () => {
    expect(assertSameOrigin(req({ host: "localhost" }))).toBeNull();
  });

  it("allows same-origin browser requests", () => {
    expect(assertSameOrigin(req({ host: "localhost", origin: "http://localhost" }))).toBeNull();
  });

  it("rejects cross-origin browser requests with 403", async () => {
    const res = assertSameOrigin(req({ host: "localhost", origin: "https://evil.example.com" }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.error).toBe("Cross-origin request denied");
  });

  it("rejects requests with a malformed Origin", () => {
    const res = assertSameOrigin(req({ host: "localhost", origin: "::: not a url" }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
  });

  it("rejects requests missing Host when Origin is present", () => {
    const res = assertSameOrigin(req({ origin: "http://localhost" }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
  });
});
