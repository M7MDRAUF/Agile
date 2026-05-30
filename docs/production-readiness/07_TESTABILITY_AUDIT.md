# 07 — Testability Audit

## Auditing Agents
- **qa-engineer** (primary)
- **backend-engineer** (supporting)
- **browser-tester** (supporting)

---

## 1. Unit Testing

### 1.1 Test Framework
| Aspect | Configuration | Status |
|--------|--------------|--------|
| Framework | Vitest 4.1.7 | ✅ |
| Environment | jsdom | ✅ |
| Setup | `vitest.setup.ts` (AUTH_SECRET, cleanup) | ✅ |
| Coverage tool | @vitest/coverage-v8 | ✅ |
| Coverage thresholds | Lines: 75%, Statements: 75%, Functions: 78%, Branches: 65% | ✅ Enforced |

### 1.2 Test Inventory

| Category | Files | Tests | Status |
|----------|-------|-------|--------|
| Server Actions | 13 | 137 | ✅ Comprehensive |
| Domain Logic | 8 | 311 | ✅ Excellent |
| Auth Module | 4 | ~23 | ✅ Good |
| Components | 1 | 4 | ⚠️ Minimal |
| API/HTTP | 2 | 14 | ✅ Good |
| **Total** | **26** | **440** | **ALL PASSING** |

### 1.3 Coverage Gaps

| Server Action | Tested Functions | Untested Functions | Severity |
|---------------|-----------------|-------------------|----------|
| `projects.ts` | createProject, updateProject, deleteProject, archiveProject | **createRisk, updateRiskStatus** | **Critical** |
| `work-items.ts` | 8 of 10 functions | **addWorkItemLink, removeWorkItemLink** | High |
| All others | Complete | — | ✅ |

---

## 2. Integration Testing

| Aspect | Status | Evidence |
|--------|--------|----------|
| Database integration | ✅ Mocked via Vitest | Actions mock Prisma client |
| Auth integration | ✅ | Guards tested with mock users |
| Permission integration | ✅ Excellent | 243 matrix tests |
| API endpoint integration | ✅ | Export API tested (9 tests) |

---

## 3. E2E Testing

### 3.1 Framework
| Aspect | Configuration | Status |
|--------|--------------|--------|
| Framework | Playwright 1.60.0 | ✅ |
| Browser | Chromium (Desktop) | ✅ |
| Workers | 1 (sequential) | ✅ |
| Timeout | 60 seconds | ✅ |
| Retries | 1 (CI), 0 (local) | ✅ |
| Screenshots | On failure | ✅ |
| Trace | On first retry | ✅ |
| Accessibility | @axe-core/playwright | ✅ |

### 3.2 E2E Coverage Map

| Spec File | Tests | Features Covered | Critical Flow? |
|-----------|-------|-----------------|----------------|
| `auth.spec.ts` | 3 | Login, invalid credentials, dashboard access | ✅ Yes |
| `accessibility.spec.ts` | 3 | Axe checks (8 routes, light+dark) | ✅ Yes |
| `board-persistence.spec.ts` | 1 | Status change persists on reload | ✅ Yes |
| `management.spec.ts` | 4 | Sprint create, work item edit, user create, team create | ✅ Yes |
| `mfa.spec.ts` | 2 | TOTP challenge, valid code acceptance | ✅ Yes |
| `navigation.spec.ts` | 5 | Route rendering, hamburger menu, drawer | ✅ Yes |
| `projects.spec.ts` | 6 | RBAC (stakeholder/admin), project CRUD | ✅ Yes |
| `rbac-matrix.spec.ts` | 1 | 22 role/path combinations | ✅ Yes |
| `settings.spec.ts` | 5 | Profile, password, workspace, role-based tabs | ✅ Yes |
| `work-items.spec.ts` | 2 | Work item lifecycle (minimal) | ⚠️ Sparse |
| `workflows.spec.ts` | 5 | Complex multi-step workflows | ✅ Yes |

### 3.3 E2E Coverage Gaps

| Missing Coverage | Severity | Notes |
|-----------------|----------|-------|
| Risk management flow | **Critical** | No E2E for createRisk/updateRiskStatus |
| Work item linking | High | No E2E for link creation/removal |
| Notifications page | High | No E2E validation |
| QA module workflow | High | No E2E for test case lifecycle |
| Reports page | Medium | No E2E for chart rendering |
| Search functionality | Medium | No E2E for search |
| Bulk operations | Medium | No concurrent/bulk tests |
| Error recovery | Medium | No E2E for error scenarios |
| Export endpoints | Medium | No E2E for data export |

---

## 4. Test Determinism

| Aspect | Status | Evidence |
|--------|--------|----------|
| Seed data deterministic | ✅ | Fixed pseudo-random seed in `prisma/seed.ts` |
| Test isolation | ✅ | Each test uses mocked dependencies |
| No shared state between tests | ✅ | Vitest beforeEach/afterEach cleanup |
| E2E test data | ⚠️ | Relies on seeded database state |
| Flaky test detection | ✅ | Playwright retries on first failure |
| Seed determinism tested | ✅ | `seed-determinism.test.ts` (9 tests) |

---

## 5. CI/CD Test Integration

| Gate | Command | Status |
|------|---------|--------|
| Lint | `npm run lint` | ✅ In CI |
| TypeScript | `npm run typecheck` | ✅ In CI |
| Unit tests + coverage | `npm run test:coverage` | ✅ In CI |
| Doc consistency | `npm run check:docs` | ✅ In CI |
| Dependency audit | `npm run check:audit` | ✅ In CI |
| Build | `npm run build` | ✅ In CI |
| E2E | `npm run test:e2e` | ✅ In CI (separate job) |
| Performance tests | — | ❌ Not in CI |
| Security scanning | — | ❌ Not in CI |

---

## 6. Testability Findings

| ID | Finding | Severity | Category |
|----|---------|----------|----------|
| TEST-01 | `createRisk()` and `updateRiskStatus()` have zero test coverage | **Critical** | Unit Test Gap |
| TEST-02 | `addWorkItemLink()` and `removeWorkItemLink()` untested | High | Unit Test Gap |
| TEST-03 | Only 37 E2E tests for 30+ routes (~1.2 per route) | High | E2E Coverage |
| TEST-04 | No E2E for risk management, QA, notifications, search | High | E2E Coverage |
| TEST-05 | Only 1 component test file (status-badge) | Medium | Component Testing |
| TEST-06 | No performance/load testing in CI | Medium | Performance |
| TEST-07 | No security scanning (SAST/DAST) in CI | Medium | Security |
| TEST-08 | E2E port conflict in local development | Low | Infrastructure |
| TEST-09 | Accessibility tests cover only 8/23 routes | High | Accessibility |

---

## 7. Testability Score

**Overall: 75/100**

| Category | Score |
|----------|-------|
| Unit Test Coverage | 85/100 |
| Unit Test Quality | 90/100 |
| E2E Coverage | 55/100 |
| E2E Quality | 80/100 |
| Test Determinism | 90/100 |
| CI Integration | 80/100 |
| Component Testing | 30/100 |
| Permission Testing | 95/100 |
| Critical Gap Impact | -15 points |
