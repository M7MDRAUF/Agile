# 05 — Maintainability & Modularity Audit

## Summary

The codebase is well-organized at the directory level (`src/app`, `src/components`, `src/lib/{actions,auth,domain}`) and uses TypeScript strictly with passing `lint` + `typecheck`. The main concerns are (a) two oversized action files, (b) duplicated activity-log/notification side-effect blocks across actions, (c) doc drift between `docs/FINAL_IMPLEMENTATION_REPORT.md` claims and reality, and (d) the dual master-brief filenames.

## Module map

| Layer | Path | Notes |
|---|---|---|
| Routes | `src/app/(app)/*` | 33 pages, App Router conventions followed |
| Auth boundary | `src/middleware.ts`, `src/lib/auth/*` | Guards centralized — good |
| Domain rules | `src/lib/domain/{permissions,constants,policies,metrics}.ts` | Pure functions; testable; **good separation** |
| Server actions | `src/lib/actions/*.ts` | 12 files; 2 are oversized (see MNT-001) |
| UI primitives | `src/components/ui/*` | Reused; consistent |
| Feature components | `src/components/{work-items,projects,sprints,…}` | Per-feature folders — clean |
| Persistence | `src/lib/db.ts`, `prisma/*` | Singleton client, driver-adapter pattern |

## Findings

### MNT-001 [Medium] — `work-items.ts` and `settings.ts` exceed 200 LOC
- `src/lib/actions/work-items.ts` is **321 LOC** and mixes WI CRUD, comment creation, blocker management, status transition side-effects, and key-generation logic.
- `src/lib/actions/settings.ts` is **224 LOC** and mixes profile, preferences, notifications, theme.
- **Fix:** split by sub-domain — `work-items.crud.ts`, `work-items.comments.ts`, `work-items.blockers.ts`; `settings.profile.ts`, `settings.preferences.ts`.

### MNT-002 [Medium] — Duplicated "write side-effects" pattern
- The trio (`update entity` → `create ActivityLog` → `create Notification` → `revalidatePath × N`) is repeated in `work-items.ts`, `sprints.ts`, `projects.ts`, `qa.ts` with no shared helper.
- **Fix:** introduce `src/lib/actions/_helpers/withActivity.ts` that wraps a mutation, accepts `{ entityType, entityId, action, actor }`, and emits ActivityLog + Notification atomically (cross-refs REL-003).

### MNT-003 [Medium] — `domain/constants.ts` carries enum substitutes; type drift risk
- SQLite lacks enums, so unions are duplicated in TS. There is no runtime guard between Zod schemas (in `domain/schemas.ts`) and the constants. A new status added to constants but not to schemas → silent drift.
- **Fix:** derive Zod schemas from the const tuples (`z.enum([...WORK_ITEM_STATUSES] as [string, ...string[]])`).

### MNT-004 [Medium] — Doc drift vs reality
- `docs/FINAL_IMPLEMENTATION_REPORT.md` (read in earlier turn) and `docs/REQUIREMENTS_TRACEABILITY_MATRIX.md` describe MFA as functional. Reality: SEC-001/SEC-002 (fake control). The reports must not stand.
- `docs/SECURITY.md` mentions CSP/HSTS — actual `next.config.ts` ships neither.
- See `RTM_UPDATE_PLAN.md` (separate file).

### MNT-005 [Medium] — Two master brief files
- Root: `AgileForge_Claude_Opus_4_8_Dynamic_Workflows_Master_Brief.md` (the user-facing brief).
- In-tree: `docs/MASTER_BRIEF.md` (used by audit).
- **Risk:** edits to one are invisible to consumers of the other. **Fix:** delete one, leave a stub `README → ../<canonical>`.

### MNT-006 [Low] — `lucide-react` is imported per-icon across many files
- Each import line lists 5–10 icons. Tree-shaking handles bundle weight (PERF-008 is the bundle concern); maintainability concern is the noise. Acceptable; no action.

### MNT-007 [Low] — `any` use is minimal
- Grep across `src/**` shows essentially no `any` usage (verified via `tsc --noEmit` passing under `strict`). **Strength**, recorded for the positive ledger.

### MNT-008 [Low] — Comments are sparse
- Action files have no JSDoc at function level. For exported server actions this is acceptable (the API is the schema), but a one-line `@audit-side-effects: writes ActivityLog + Notification` comment on multi-write actions would help future maintainers and reviewers.

## Complexity heat-map

| File | LOC | Functions | Complexity flag |
|---|---|---|---|
| `src/lib/actions/work-items.ts` | 321 | 9 | **Split candidate** |
| `src/lib/actions/settings.ts` | 224 | 8 | **Split candidate** |
| `src/lib/actions/security.ts` | 196 | 7 | OK after MFA rewrite |
| `src/lib/actions/projects.ts` | 166 | 6 | OK |
| `src/lib/actions/sprints.ts` | 161 | 5 | OK |
| `src/lib/actions/qa.ts` | 155 | 6 | OK |
| `src/lib/actions/admin.ts` | 138 | 5 | OK |
| `src/middleware.ts` | 34 | 1 | OK |

## Strengths

- All server actions begin with `"use server"` — no client-server boundary leaks observed.
- Permission logic lives in `domain/permissions.ts` — single source of truth.
- `lint` and `typecheck` pass cleanly (see `12_COMMAND_RESULTS.md`).
- No circular imports detected by `tsc`.
- `_app`/`_document` legacy patterns absent — pure App Router.

## Recommendation

Refactor MNT-001 and MNT-002 during the **post-stabilization** batch (after Critical/High security/reliability fixes). Doc drift (MNT-004) should be addressed *immediately* alongside the relevant code fixes so RTM does not lie.
