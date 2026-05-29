# Security

_Last Updated: 2026-05-29_

AgileForge is a self-hosted application intended to run on infrastructure you control. This
document summarises the security model and the hardening steps required before any
non-local deployment.

## Authentication

- Credentials are verified against a `bcryptjs` hash (cost factor 10). Plaintext passwords are
  never stored or logged.
- Sessions are stateless **JWTs** signed with HS256 via [`jose`](https://github.com/panva/jose).
  The signing key comes from the `AUTH_SECRET` environment variable.
- The token is stored in an **httpOnly**, `sameSite=lax` cookie named `agileforge_session`,
  so it is not readable from JavaScript and is not sent on cross-site navigations.
- `secure` is enabled automatically in production builds so the cookie is only sent over HTTPS.
- Tokens carry a 7-day expiry; expired or tampered tokens are rejected and the user is sent to `/login`.

## Authorization (RBAC)

- Eight roles are modelled in `src/lib/domain/permissions.ts`: `admin`, `engineering_manager`,
  `product_owner`, `scrum_master`, `engineer`, `qa`, `designer`, `stakeholder`.
- Every protected page calls `requireUser()`; permission-gated pages call
  `requirePermission(perm)`, which redirects to `/dashboard` when the role lacks the permission.
- `canEditWorkItem()` enforces row-level rules (assignee/reporter ownership) on top of the
  coarse permission matrix.
- Navigation is filtered server-side by permission, so users never receive links to areas they
  cannot open — but the server-side guard, not the hidden link, is the real boundary.

## Route protection

- `src/middleware.ts` runs on every request, allowing only `/login` (and static assets) for
  anonymous users and redirecting everything else to `/login`.
- This is defense-in-depth alongside the per-page `requireUser()` checks.

## Input handling

- All mutations run through React Server Actions; inputs are validated with **Zod** schemas
  before any database write.
- Prisma uses parameterised queries throughout, eliminating SQL injection for the supported
  query surface.
- React escapes rendered content by default; no `dangerouslySetInnerHTML` is used with
  user-supplied data.

## Secrets & configuration

- Secrets are read from environment variables (`.env` locally). `.env*` files are git-ignored;
  only `.env.example` is committed.
- `AUTH_SECRET` **must** be set via environment variable; the application throws a startup error
  if the variable is absent. There is no hardcoded fallback. (Fixed in Phase 2 — the previous
  insecure dev fallback in `src/lib/auth/session.ts` was removed.)

## Security headers

The following HTTP response headers are now set on all routes via `next.config.ts` (added in Phase 2):

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

Note: a `Content-Security-Policy` header is not yet configured. This remains a recommended
hardening step before any non-local deployment.

## Login rate limiting

An in-memory rate limiter is applied to the login action (`src/lib/auth/actions.ts`): a maximum
of 10 failed attempts per IP within a 15-minute sliding window. Subsequent attempts within the
window receive a `"Too many login attempts"` error. Successful login resets the counter for that
IP. (Added in Phase 2.)

**Limitation:** the counter lives in the Node.js process heap; it is not shared across multiple
instances or serverless cold starts. For multi-instance production deployments, replace with a
distributed store (e.g. Redis).

## Known open items

- **MFA simulation:** `confirmMfa` (in `src/lib/actions/security.ts`) accepts any valid 6-digit
  numeric code — it does not verify the code against the stored TOTP secret. The code comment
  documents this explicitly as a local-dev simulation. Production use would require a real TOTP
  library (e.g. `otpauth`).
- **SQLite foreign-key enforcement:** SQLite does not enforce foreign-key constraints by default.
  The Prisma schema declares relations, but without `PRAGMA foreign_keys = ON` being issued on
  connection, referential integrity is enforced only at the application layer.

## Hardening checklist before deploying beyond localhost

- [x] Set a long, random `AUTH_SECRET` via environment variable — startup now throws if absent.
- [ ] Change every seeded demo password, or reseed with production data and remove demo accounts.
- [ ] Serve exclusively over HTTPS (the session cookie already requires it in production).
- [ ] Move from SQLite to a networked database (e.g. PostgreSQL) for multi-instance deployments.
- [x] Add rate limiting / lockout on the login endpoint (in-memory; see note above).
- [x] Configure security headers (X-Content-Type-Options, X-Frame-Options, etc.) in `next.config.ts`.
- [ ] Configure a Content-Security-Policy header (not yet added).
- [ ] Set up dependency scanning (`npm audit`, Dependabot) in CI.
- [x] `isWorkspaceActive()` server action is guarded by `requireUser()` so unauthenticated callers cannot read workspace state.

## Reporting a vulnerability

This is a sample/portfolio project. If you adopt it, route security reports through your own
private disclosure channel and patch before any public discussion.
