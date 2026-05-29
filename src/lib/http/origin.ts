/**
 * Defence-in-depth origin check for state-affecting or session-scoped GET
 * endpoints (SEC-007). If the request carries an `Origin` header (i.e. it was
 * issued by a browser via fetch/XHR), it must match the request `Host`.
 * Requests without an `Origin` header (curl, direct navigation, server-side
 * fetch) are allowed through — the session cookie remains the primary gate.
 *
 * Returns null on success, or a Response (403) on failure that callers should
 * return directly.
 */
export function assertSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const host = request.headers.get("host");
  if (!host) {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return new Response(JSON.stringify({ error: "Cross-origin request denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
