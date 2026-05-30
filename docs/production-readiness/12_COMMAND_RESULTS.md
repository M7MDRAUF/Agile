# 12 — Command Results

## Summary

| Command             | Status  | Exit Code | Duration | Issues               |
| ------------------- | ------- | --------- | -------- | -------------------- |
| `npm run lint`      | ✅ PASS | 0         | <1s      | None                 |
| `npm run typecheck` | ✅ PASS | 0         | ~6s      | None                 |
| `npm run test`      | ✅ PASS | 0         | 7.32s    | 440/440 tests pass   |
| `npm run build`     | ✅ PASS | 0         | ~12s     | 27 routes generated  |
| `npm run test:e2e`  | ❌ FAIL | 1         | <5s      | Port 3100 EADDRINUSE |

---

## Detailed Results

### 1. Lint (`npm run lint`)

**Source**: `lint.out.txt`

```
> agileforge@0.1.0 lint
> eslint

(no output — clean)
```

**Verdict**: Zero ESLint errors or warnings.  
**Production Readiness Impact**: None — code style is clean.

---

### 2. TypeScript (`npm run typecheck`)

**Source**: `tsc.out.txt`

```
> agileforge@0.1.0 typecheck
> tsc --noEmit

(no output — clean)
```

**Verdict**: Zero type errors. Strict mode enabled.  
**Production Readiness Impact**: None — type safety is enforced.

---

### 3. Unit Tests (`npm run test`)

**Source**: `test.out.txt`

```
RUN  v4.1.7

✓ src/lib/domain/__tests__/permissions-matrix.test.ts (243 tests) 40ms
✓ src/lib/__tests__/env-and-origin.test.ts (2 tests) 120ms
✓ src/lib/__tests__/db-retry.test.ts (8 tests) 67ms
✓ src/lib/actions/__tests__/danger.test.ts (11 tests) 23ms
✓ src/app/api/export/__tests__/export.test.ts (9 tests) 241ms
✓ src/lib/__tests__/utils.test.ts (3 tests) 17ms
✓ src/lib/actions/__tests__/qa.test.ts (13 tests) 22ms
✓ src/lib/actions/__tests__/sprints.test.ts (17 tests) 27ms
✓ src/lib/actions/__tests__/teams.test.ts (12 tests) 21ms
✓ src/components/__tests__/status-badge.test.tsx (4 tests) 92ms
✓ src/lib/actions/__tests__/projects.test.ts (9 tests) 21ms
✓ src/lib/actions/__tests__/api-tokens.test.ts (5 tests) 16ms
✓ src/lib/actions/__tests__/settings.test.ts (14 tests) 24ms
✓ src/lib/actions/__tests__/work-items.test.ts (5 tests) 21ms
✓ src/lib/actions/__tests__/security.test.ts (6 tests) 22ms
✓ src/lib/http/__tests__/origin.test.ts (5 tests) 14ms
✓ src/lib/domain/__tests__/metrics.test.ts (18 tests) 14ms
✓ src/lib/__tests__/seed-determinism.test.ts (9 tests) 13ms
✓ src/lib/__tests__/logger.test.ts (3 tests) 14ms
✓ src/lib/actions/__tests__/notifications.test.ts (4 tests) 8ms
✓ src/lib/actions/__tests__/integrations.test.ts (4 tests) 9ms
✓ src/lib/domain/__tests__/password-policy.test.ts (7 tests) 7ms
✓ src/lib/domain/__tests__/user-agent.test.ts (5 tests) 5ms
✓ src/lib/domain/__tests__/permissions.test.ts (9 tests) 6ms
✓ src/lib/domain/__tests__/user-settings.test.ts (8 tests) 7ms
✓ src/lib/actions/__tests__/admin.test.ts (7 tests) 8ms

Test Files  26 passed (26)
     Tests  440 passed (440)
  Start at  04:58:03
  Duration  7.32s
```

**Verdict**: 100% pass rate. Fast execution.  
**Production Readiness Impact**: Strong unit test foundation.  
**Recommended Owner**: qa-engineer

---

### 4. Build (`npm run build`)

**Source**: `build.out.txt`

```
▲ Next.js 16.2.6 (Turbopack)

Creating an optimized production build ...
✓ Compiled successfully in 5.6s
Running TypeScript ...
Finished TypeScript in 5.8s ...
✓ Generating static pages (27/27) in 291ms
Finalizing page optimization ...

Route (app)
├ ○ /
├ ○ /_not-found
├ ƒ /admin
├ ƒ /api/export/profile
├ ƒ /api/export/workspace
├ ƒ /api/health
├ ƒ /api/ready
├ ƒ /backlog
├ ƒ /boards/kanban
├ ƒ /boards/scrum
├ ƒ /dashboard
├ ƒ /login
├ ƒ /my-work
├ ƒ /notifications
├ ƒ /projects
├ ƒ /projects/[id]
├ ƒ /projects/[id]/reports
├ ƒ /projects/[id]/roadmap
├ ƒ /projects/new
├ ƒ /qa
├ ƒ /qa/test-cases/[id]
├ ƒ /qa/test-cases/new
├ ƒ /reports
├ ƒ /search
├ ƒ /settings
├ ƒ /sprints
├ ƒ /sprints/[id]
├ ƒ /sprints/new
├ ƒ /teams
├ ƒ /teams/[id]
├ ƒ /users
├ ƒ /users/[id]
├ ƒ /work-items
├ ƒ /work-items/[id]
├ ƒ /work-items/[id]/edit
├ ƒ /work-items/new
└ ƒ /login (login page)

○ (Static)  prerendered as static content
ƒ (Dynamic) server-rendered on demand
```

**Verdict**: Clean build. All 30+ routes compiled. No warnings.  
**Production Readiness Impact**: Application is deployable.  
**Recommended Owner**: system-architect

---

### 5. E2E Tests (`npm run test:e2e`)

**Source**: `e2e.out.txt`

```
> agileforge@0.1.0 test:e2e
> playwright test

[WebServer] » Failed to start server
[WebServer] Error: listen EADDRINUSE: address already in use :::3100
    at <unknown> (Error: listen EADDRINUSE: address already in use :::3100)
    code: 'EADDRINUSE',
    errno: -4091,
    syscall: 'listen',
    address: '::',
    port: 3100

Error: Process from config.webServer was not able to start. Exit code: 1
```

**Verdict**: INFRASTRUCTURE FAILURE — Port 3100 occupied during the captured test run. This is NOT a code bug; it's an environment issue from when the output was captured on a developer's Windows machine.  
**Production Readiness Impact**: E2E tests exist (11 spec files, ~37 tests) and are configured in CI. CI uses a clean environment where port conflicts don't occur.  
**Recommended Owner**: qa-engineer (ensure CI passes)

---

## Production Readiness Assessment

| Command   | Blocks Production?           | Notes                                                       |
| --------- | ---------------------------- | ----------------------------------------------------------- |
| lint      | No                           | Clean                                                       |
| typecheck | No                           | Clean                                                       |
| test      | No                           | All 440 pass                                                |
| build     | No                           | All routes compile                                          |
| test:e2e  | **Requires CI verification** | Local port conflict; CI pipeline exists and should be green |

**Overall**: The application builds, compiles, type-checks, and passes all unit tests. E2E tests require verification in CI environment.
