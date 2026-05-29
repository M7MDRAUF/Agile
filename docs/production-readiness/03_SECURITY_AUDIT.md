# 03 — Security Audit

> Severity rubric: **Critical** = production blocker / auth bypass / fake control · **High** = exploitable or missing defense-in-depth · **Medium** = hardening gap · **Low** = polish.

## CRITICAL

### SEC-001 [Critical] — MFA is fake; any 6-digit code succeeds
- **File:** `src/lib/actions/security.ts:109-135` (`confirmMfa`).
- **Evidence:**
  ```ts
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code from your authenticator app" };
  if (secret.length < 16) return { error: "Setup session expired, please restart" };
  // ...sets mfaEnabled=true with no actual TOTP verification
  ```
- **Impact:** A user enabling MFA gets no real second factor. The Settings UI tells them MFA is active. This is a **fake security control** and a Critical finding by the brief's §8 rules.
- **Fix:** Implement RFC 6238 TOTP verification (`otplib` or hand-rolled HMAC-SHA1 over 30-second window) against the stored `mfaSecret`. Also require MFA challenge at **login**, not only at setup (currently no MFA challenge appears in `signInAction`, see SEC-002).

### SEC-002 [Critical] — Login never challenges MFA even when enabled
- **File:** `src/lib/auth/actions.ts:38-101`.
- **Evidence:** `signInAction` validates password then immediately calls `setSessionCookie`. No branch reads `user.mfaEnabled` or asks for a TOTP code.
- **Impact:** Even after SEC-001 is fixed, MFA provides zero login protection. This is what makes the "fake control" critical instead of high.

## HIGH

### SEC-003 [High] — Missing Content-Security-Policy header
- **File:** `next.config.ts:14-23`.
- **Evidence:** Headers list contains `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, deprecated `X-XSS-Protection`, and `Permissions-Policy`. **No `Content-Security-Policy`.**
- **Impact:** No defense against injected scripts; XSS in any rendered user content (comments, names) executes freely.
- **Fix:** Add a strict CSP with `default-src 'self'`, `script-src 'self' 'nonce-…'`, etc. For Next 16 use the `headers()` config plus nonce middleware.

### SEC-004 [High] — Missing Strict-Transport-Security header
- **File:** `next.config.ts:14-23`.
- **Impact:** First-visit downgrade attacks possible on HTTPS deployments.
- **Fix:** `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (only after HTTPS is the only path).

### SEC-005 [High] — `Math.random()` for security tokens
- **File:** `src/lib/actions/security.ts:84-93`.
- **Evidence:**
  ```ts
  function randomBase32(length: number): string {
    let out = "";
    for (let i = 0; i < length; i++) out += BASE32[Math.floor(Math.random() * BASE32.length)];
    return out;
  }
  function randomRecoveryCodes(count = 8) { return Array.from({ length: count }, () => `${randomBase32(5)}-${randomBase32(5)}`); }
  ```
- **Impact:** MFA secrets and recovery codes are predictable. Even after SEC-001/002 are fixed, the secret material is weak.
- **Fix:** Replace with `crypto.randomBytes` + base32 encoding. `api-tokens.ts:39` already uses `randomBytes(24)` — apply the same pattern.

### SEC-006 [High] — In-process login rate-limit is bypassable
- **File:** `src/lib/auth/actions.ts:15-27`.
- **Evidence:** `Map<ip, {count,resetAt}>`. Process restart wipes counters; second instance starts at zero; clients on the same NAT egress share a bucket (false positives) while distributed attackers each get a fresh bucket.
- **Impact:** Realistic credential-stuffing only mildly inconvenienced.
- **Fix:** Move to durable shared store (Redis); also rate-limit by **email** in addition to IP.

### SEC-007 [High] — No CSRF protection on server actions
- **Evidence:** Server actions accept `FormData` posted from same-origin pages. Next.js 16 server actions do enforce origin via the framework when invoked through the action protocol, but no explicit `Origin`/`Referer` validation is implemented for the export `route.ts` GETs or for any of the JSON `route.ts` endpoints. Risky if any action is ever called from a public form or via an XSS sink.
- **Fix:** Confirm Next 16's built-in same-origin verification is enabled in production headers; explicitly verify `Origin` in `/api/export/*` if it ever accepts mutating verbs.

### SEC-008 [High] — Middleware excludes `/api/*` entirely
- **File:** `src/middleware.ts:30-33`.
- **Evidence:** `matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"]`.
- **Impact:** Today the only `/api/*` routes (`/api/export/profile`, `/api/export/workspace`) protect themselves with `requireUser()`. Any new API route that forgets the guard will be **publicly accessible**. The middleware should be the floor, not an opt-in.
- **Fix:** Either include `/api` in the matcher and have middleware reject unauthenticated requests there too, or document the "every API route MUST call `requireUser`" rule and add a lint/test that enforces it.

## MEDIUM

### SEC-009 [Medium] — Deprecated `X-XSS-Protection` header still set
- **File:** `next.config.ts:18`. Modern browsers ignore it; some advisories say it can introduce vulnerabilities. Remove or set `0`.

### SEC-010 [Medium] — Weak `AUTH_SECRET` default in `.env.example`
- **File:** `.env.example` (`AUTH_SECRET="change-me-to-a-long-random-string"`). The runtime fails fast if missing, but operators may copy the placeholder. Add deployment-doc step + bootstrap script that generates one.

### SEC-011 [Medium] — Demo reset action invokes a child shell
- **File:** `src/lib/actions/danger.ts:73-78`. Uses `execFile("npx", ["tsx", "prisma/seed.ts"], ...)` with constant args — currently safe (no user input templating). However, the action lives behind `admin.access` only; document that this **must never accept user-controlled args** and add a comment in the file.

### SEC-012 [Medium] — `bcrypt` rounds = 10 (see PERF-009)

### SEC-013 [Medium] — JWT session has no rotation on privilege change
- Changing role via `admin.ts:90-113` updates the DB row but does not invalidate the user's existing JWT. The JWT carries `role` directly (`session.ts:14-18`), so until token expiry the user keeps the old role.
- **Fix:** Either drop `role` from JWT and re-read from DB on every request (`getCurrentUser` already does so via `getSession()` flow — confirm), or bump session `sid` and force re-login on role change.

### SEC-014 [Medium] — No CSP, but inline styles likely
- Tailwind + RSC streams emit some inline style; CSP design needs to allow this or use nonce. Track as part of SEC-003.

### SEC-015 [Medium] — API token plaintext shown only once — good. But scope check missing
- `src/lib/actions/api-tokens.ts` stores `scopes` as comma-separated. There is no token-auth middleware that actually **honors** those scopes anywhere. The tokens currently grant nothing; UI suggests otherwise. Either implement an `Authorization: Bearer` flow on `/api/*` or remove the API-token UI.

## Audit trail observations

- `AuditLog` model is populated for: password change, MFA enable/disable, sessions revoke-others, API token create/revoke, integration connect/disconnect, user create/role/status change, workspace activate/deactivate, demo reset. **Good coverage of admin actions.**
- `ActivityLog` covers per-work-item events. **Good.**
- Gaps: failed login attempts are **not** persisted (only in-memory). Suspicious access attempts (403 from `/api/export/workspace`) are not logged.

## Headers in production

Current set (`next.config.ts:11-26`) is missing CSP and HSTS, and includes a deprecated header. Net effect: app is currently below baseline security-header expectations.

## Final security verdict

**NOT production-ready.** Two Critical (fake MFA + no MFA challenge at login) plus missing CSP/HSTS plus weak crypto plus bypassable rate-limit means the security category fails the §13 release gate.
