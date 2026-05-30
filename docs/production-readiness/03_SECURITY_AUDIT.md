# 03 — Security Audit

## Auditing Agents
- **security-reviewer** (primary)
- **backend-engineer** (supporting)
- **database-engineer** (supporting)

---

## Executive Summary

The AgileForge application demonstrates **excellent security engineering** with comprehensive authentication, authorization, session management, and input validation. Critical security architecture decisions (JWT with DB-backed sessions, bcrypt cost 12, TOTP MFA, AES-256-GCM secret encryption) are all industry-standard. However, several issues require remediation before production deployment.

---

## 1. Authentication

### 1.1 Password Security
| Aspect | Implementation | Status |
|--------|---------------|--------|
| Hashing algorithm | bcryptjs | ✅ |
| Cost factor | 12 rounds (~250ms) | ✅ OWASP 2023 compliant |
| Password policy | Min 8 chars, uppercase, lowercase, number, special | ✅ |
| Plaintext logging | None found | ✅ |
| Timing-safe comparison | bcrypt.compare (constant-time) | ✅ |

**Evidence**: `src/lib/auth/password.ts`, `src/lib/domain/password-policy.ts`

### 1.2 Multi-Factor Authentication (MFA)
| Aspect | Implementation | Status |
|--------|---------------|--------|
| Algorithm | TOTP (RFC 6238) | ✅ |
| Library | otplib/authenticator | ✅ |
| Step tolerance | ±1 (30-second window) | ✅ |
| Secret storage | AES-256-GCM encrypted | ✅ |
| Key derivation | scrypt with 16-byte salt | ✅ |
| Recovery codes | Bcrypt-hashed, one-time use | ✅ |
| Setup flow | Generate → Verify → Persist | ✅ |

**Evidence**: `src/lib/auth/mfa-crypto.ts`, `src/lib/actions/security.ts`

### 1.3 Session Management
| Aspect | Implementation | Status |
|--------|---------------|--------|
| Token type | JWT (HS256) via jose | ✅ |
| TTL | 8 hours, non-sliding | ✅ |
| Storage | httpOnly cookie | ✅ |
| Secure flag | Yes (production) | ✅ |
| SameSite | Lax | ⚠️ Acceptable |
| Session backing | DB row (UserSession) | ✅ |
| Revocation | DB-backed, fail-closed | ✅ |
| Session version | `sv` claim → prevents replay after role change | ✅ |
| Device tracking | User agent + IP label | ✅ |

**Evidence**: `src/lib/auth/session.ts`, `src/lib/auth/current-user.ts`

---

## 2. Authorization (RBAC)

### 2.1 Role Hierarchy
| Role | Level | Description |
|------|-------|-------------|
| admin | Highest | Full system access |
| workspace_manager | High | Workspace settings + user management |
| project_manager | High | Project CRUD + sprint management |
| tech_lead | Medium | Technical oversight |
| senior_developer | Medium | Full work item CRUD |
| developer | Standard | Own work item management |
| qa_engineer | Standard | QA module access |
| stakeholder | Low | Read-only access |

### 2.2 Permission Enforcement
| Layer | Mechanism | Status |
|-------|-----------|--------|
| Server actions | `requireUser()` + `can(role, permission)` | ✅ All 61 functions |
| Page level | `requireUser()` in page.tsx | ✅ All protected pages |
| Navigation | Permission-filtered menu items | ✅ |
| Data access | Ownership checks on mutations | ✅ |
| API endpoints | Dual auth (session OR API token) | ✅ |

**Evidence**: `src/lib/domain/permissions.ts`, 243 permission matrix tests

### 2.3 RBAC Findings

| ID | Finding | Severity | Evidence |
|----|---------|----------|----------|
| SEC-RBAC-01 | No centralized middleware — auth is page-level only | Medium | Missing `src/middleware.ts` |
| SEC-RBAC-02 | API export endpoint uses only `read` scope for full workspace data | Medium | `src/app/api/export/workspace/route.ts:34` |

---

## 3. Secret Management

| ID | Finding | Severity | Evidence | Status |
|----|---------|----------|----------|--------|
| SEC-SECRET-01 | AUTH_SECRET placeholder in .env.example | Low | `.env.example:9` — detected and rejected at runtime in production | ✅ Mitigated |
| SEC-SECRET-02 | Weak secret detection regex incomplete | Medium | `src/lib/auth/session.ts:43` — no entropy check | ⚠️ Enhancement needed |
| SEC-SECRET-03 | CI workflow uses predictable AUTH_SECRET | Low | `.github/workflows/ci.yml:18` — acceptable for CI only | ✅ Acceptable |
| SEC-SECRET-04 | Demo SEED_PASSWORD hardcoded | Low | `.env.example:12`, `prisma/seed.ts` — dev-only | ✅ Acceptable |

---

## 4. Input Validation

| Aspect | Implementation | Status |
|--------|---------------|--------|
| Schema validation | Zod on all server action inputs | ✅ |
| SQL injection | Prisma parameterized queries only | ✅ (one raw `SELECT 1` in health check) |
| XSS | React auto-escaping + CSP | ✅ |
| Path traversal | No file system operations from user input | ✅ |
| Command injection | Hardcoded commands in danger.ts, no user input | ✅ |
| Type coercion | TypeScript strict + Zod | ✅ |

---

## 5. Security Headers

| Header | Value | Status |
|--------|-------|--------|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-ancestors 'none'` | ⚠️ `unsafe-inline` required by Next.js |
| X-Content-Type-Options | `nosniff` | ✅ |
| X-Frame-Options | `DENY` | ✅ |
| Referrer-Policy | `strict-origin-when-cross-origin` | ✅ |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` | ✅ |
| X-XSS-Protection | `0` (correctly disabled) | ✅ |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | ✅ |

**Evidence**: `next.config.ts:10-57`

---

## 6. Rate Limiting

| ID | Finding | Severity | Evidence |
|----|---------|----------|----------|
| SEC-RATE-01 | Rate limiting is in-memory (Map), not distributed | **Critical** | `src/lib/auth/rate-limit.ts:25-38` — bypassed in multi-instance |
| SEC-RATE-02 | X-Forwarded-For header trusted without validation | Medium | `src/lib/auth/actions.ts:70-72` — spoofable |
| SEC-RATE-03 | Export endpoints have no rate limiting | Medium | `src/app/api/export/` — resource exhaustion risk |
| SEC-RATE-04 | Login: 10 attempts/15min; MFA: 5 attempts/15min | ✅ Good | `src/lib/auth/rate-limit.ts` |

---

## 7. Data Protection

| Aspect | Implementation | Status |
|--------|---------------|--------|
| Passwords at rest | bcrypt hash (cost 12) | ✅ |
| MFA secrets at rest | AES-256-GCM encrypted | ✅ |
| API tokens at rest | bcrypt hash (shown once) | ✅ |
| Recovery codes at rest | bcrypt hash (individual) | ✅ |
| PII in logs | Correlation IDs mask errors | ✅ |
| Cookie security | httpOnly, secure, sameSite | ✅ |

---

## 8. Audit Logging

| Aspect | Implementation | Status |
|--------|---------------|--------|
| Actions logged | User CRUD, role changes, project ops | ✅ |
| Actor tracking | `actorId` on all logs | ✅ |
| Immutability | No update methods on AuditLog | ✅ |
| Indexes | `entityType+createdAt`, `actorId+createdAt` | ✅ |
| Missing context | No request ID, IP, user agent | ⚠️ Medium gap |

---

## 9. Critical Security Findings

| ID | Title | Severity | Description | Recommendation |
|----|-------|----------|-------------|----------------|
| SEC-01 | In-memory rate limiting | **Critical** | Rate limits are per-process; multi-instance deployments bypass all limits | Implement Redis-backed rate limiting |
| SEC-02 | CSP allows `unsafe-inline` | **High** | Required by Next.js hydration; XSS through injected inline scripts possible | Migrate to nonce-based CSP (proxy.ts in Next 16) |
| SEC-03 | No centralized auth middleware | **High** | All auth is page/action level; no defense-in-depth at routing layer | Add `src/middleware.ts` with JWT verification |
| SEC-04 | Trusted proxy headers | Medium | X-Forwarded-For accepted without proxy validation | Configure trusted proxy allowlist |
| SEC-05 | Export API scope too permissive | Medium | `read` scope alone grants full workspace export | Require `admin` scope for workspace export |
| SEC-06 | No request correlation in audit logs | Medium | Cannot trace requests across multiple log entries | Add requestId, IP, userAgent to AuditLog |
| SEC-07 | MFA secret in response body | Medium | Setup response contains plaintext TOTP secret (before confirmation) | Add `Cache-Control: no-store` header |
| SEC-08 | Weak AUTH_SECRET detection incomplete | Low | Only regex pattern matching, no entropy validation | Add Shannon entropy check |

---

## 10. Security Verdict

**Overall Security Score: 82/100**

| Category | Score | Notes |
|----------|-------|-------|
| Authentication | 95/100 | Enterprise-grade (JWT + MFA + bcrypt) |
| Authorization | 90/100 | Comprehensive RBAC, 243 tests |
| Session Management | 90/100 | DB-backed, revocable, version-tracked |
| Input Validation | 95/100 | Zod on all inputs, Prisma parameterized |
| Security Headers | 80/100 | Good but `unsafe-inline` weakens CSP |
| Rate Limiting | 40/100 | In-memory only — critical gap |
| Audit Logging | 70/100 | Good but missing request context |
| Secret Management | 85/100 | Good with runtime validation |

**Blocks Production**: SEC-01 (rate limiting) must be addressed for any multi-instance deployment.
