import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// OPS-005: Next 16 renamed the `middleware` file convention to `proxy`. Same
// runtime semantics, new name. Gate every application route behind a valid
// session and keep authenticated users away from the login page. Uses jose
// (edge-safe); never touches Prisma here.

const PUBLIC_PATHS = ["/login"];
// SEC-008: /api/* routes that may be reached unauthenticated (e.g. health probes).
// Everything else under /api/* is gated by this proxy in addition to its own
// `requireUser` guard, so a broken/missing in-route check still cannot leak data.
const PUBLIC_API_PATHS = ["/api/health", "/api/ready"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    PUBLIC_API_PATHS.some((p) => pathname === p);

  if (!session && !isPublic) {
    // For /api/* return 401 JSON instead of HTML redirect.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // SEC-008: include /api/* under the proxy so unauthenticated callers cannot
  // reach mutation/export endpoints. Static assets and Next internals excluded.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
