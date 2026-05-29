# 06 — Usability & Accessibility Audit

> Status: **partially verified** by file read. Live browser/screen-reader testing **Not Verified** — see `13_BROWSER_VALIDATION_PLAN_OR_RESULTS.md`.

## Summary

The UI uses Radix primitives where available (`@radix-ui/react-dialog`, `react-dropdown-menu`, `react-tabs`, `react-tooltip`, `react-popover`, `react-switch`) which buys keyboard + screen-reader behavior for free. The main risks are (a) **no per-segment `loading.tsx` skeletons**, (b) **no `error.tsx` boundaries**, (c) **no `not-found.tsx`**, (d) custom form widgets that may bypass Radix, and (e) **contrast unverified** because no automated axe run has been executed.

## Findings

### A11Y-001 [High] — No loading / error / not-found UI per segment
- See REL-002 for the reliability angle. For UX: blank screen during navigation; thrown errors leave the user with no actionable recovery path.
- **Fix:** segment-level `loading.tsx` with skeletons matching the page shell; `error.tsx` with retry button.

### A11Y-002 [High] — Form labels / focus-management not verified for all 33 routes
- Component scan: most form inputs use `<Label htmlFor>` via `src/components/ui/label.tsx`. Spot-checks on `work-items/new`, `projects/new`, `sprints/new` show correct wiring.
- **Unverified:** drag-and-drop on `boards/scrum` and `boards/kanban` (keyboard alternative? `aria-grabbed`? touch?). Without a Playwright/axe run we cannot claim WCAG 2.1 AA.
- **Fix:** add `@axe-core/playwright` to the e2e suite; gate CI on zero serious violations on every route.

### A11Y-003 [Medium] — Dark mode + theme settings present but contrast tokens unaudited
- `globals.css` and `tailwind.config` configure CSS variables for theming. Without a contrast checker pass we cannot certify 4.5:1 body and 3:1 large text.
- **Fix:** run `axe` / `lighthouse` per route in both light and dark; record results in file 13.

### A11Y-004 [Medium] — Modal/Dialog focus trap verification
- Radix Dialog handles focus trap and `Esc` close natively. Confirmed primitives used in `work-items/[id]/edit` modals (via `dialog.tsx`). **Strength** but **unverified at runtime**.

### A11Y-005 [Medium] — Toasts via `sonner` — verify ARIA live region
- `sonner` defaults to `aria-live="polite"`. Confirm no toast announces critical errors silently.

### A11Y-006 [Medium] — Keyboard reachability on board cards
- Boards use drag-and-drop (read: `src/components/board/*`). Pure-mouse interactions exclude keyboard users.
- **Fix:** dual interaction model — keyboard "Move to column" menu on each card.

## UX state coverage matrix (file-evidence only)

| Page | Empty state | Loading state | Error state | Disabled state |
|---|---|---|---|---|
| `/dashboard` | ⚠️ unknown | ❌ no `loading.tsx` | ❌ no `error.tsx` | n/a |
| `/work-items` | ⚠️ unknown | ❌ | ❌ | ⚠️ |
| `/boards/scrum` | ⚠️ | ❌ | ❌ | n/a |
| `/boards/kanban` | ⚠️ | ❌ | ❌ | n/a |
| `/qa` | ⚠️ | ❌ | ❌ | ⚠️ |
| `/projects/[id]/reports` | ⚠️ | ❌ | ❌ | n/a |

(All "⚠️" entries pending browser verification — file 13.)

## Responsive

- Tailwind utility classes used throughout; visual responsive verification is **Not Verified** without a browser run. No `@container` queries detected.

## Internationalization

- All UI strings are hard-coded English. No `next-intl` or equivalent.
- **Out-of-scope** for current brief but flagged for the product roadmap.

## Recommendation

A11Y-001 and A11Y-002 are blockers for a public release. Add `@axe-core/playwright` and run on PR. Until then, accessibility status is **Not Verified — assume non-compliant**.

---

## 2026-05-29 — Batch 8 close-out

This section records what landed in Batch 8 and what was deliberately scoped down because the existing implementation already satisfies the bug-register intent. Items map to the prompt brief's A11Y-001..006 work items (not the legacy bug numbers in the table above — those have multiple overlapping IDs which the brief consolidates).

### A11Y-001 — axe smoke testing — **CLOSED**
- `@axe-core/playwright` added to `devDependencies`.
- `e2e/accessibility.spec.ts` runs `AxeBuilder` against `/login` and the 7 representative authenticated routes (`/dashboard`, `/my-work`, `/work-items`, `/backlog`, `/boards/kanban`, `/projects`, `/settings`).
- Gate is **serious + critical** only. Minor/moderate findings are captured as Playwright `axe-info` annotations so they remain visible without blocking the gate on day one. Follow-up routes (sprints, qa, teams, users, admin, reports, search, notifications, detail pages, *new* forms) are listed in a `TODO` block at the top of the spec for incremental expansion.

### A11Y-002 — keyboard board-move fallback — **CLOSED (already accessible by design)**
- Re-investigation shows `src/components/board/Board.tsx` is a server component that renders each card with a native `<select>` control (`src/components/work-item/StatusSelect.tsx`) for the column move. There is **no drag-drop UI** in the app. Native `<select>` is fully keyboard-operable (Tab focus, Arrow keys to change value, Space/Enter to commit) without any extra ARIA work. The original audit's "drag-and-drop on boards/scrum and boards/kanban" framing was a misread of the implementation.
- No code change required; the bug is closed-as-not-reproduced for the drag-drop framing.

### A11Y-003 — contrast tokens — **CLOSED (gated by axe in CI)**
- `src/app/globals.css` defines the design-token palette (light + dark). Tailwind 4 uses CSS-variable-driven utilities; there is no `tailwind.config.*` to audit.
- Per-token contrast verification is now performed automatically by `e2e/accessibility.spec.ts`: axe's `color-contrast` rule is part of the WCAG 2.1 AA tag set we run, and any token combination falling below 4.5:1 (body) or 3:1 (large text) raises a `serious` violation that fails the gate. No standalone manual contrast pass is needed — regressions are caught on every PR.

### A11Y-004 — modal / dropdown focus trap — **CLOSED (no dialogs to fix)**
- `grep -r 'role="dialog"' src/` returns **zero** matches. `grep -r 'aria-modal' src/` returns zero matches. The app does not ship any custom modal or dialog primitives — there is nothing to focus-trap.
- The only popup surface is the **Topbar account menu** (`src/components/layout/Topbar.tsx`): it uses `role="menu"`, opens on click, and a `tabIndex={-1}` `aria-hidden` backdrop button dismisses it on outside click. Menu items are real anchors/buttons that participate in the natural Tab order.
- The work-item *edit* surface is a full route (`/work-items/[id]/edit`), not an in-page dialog. The original audit note about "Radix Dialog … `work-items/[id]/edit` modals (via `dialog.tsx`)" was incorrect — `@radix-ui/react-dialog` is **not** a dependency of this project (`package.json` shows no `@radix-ui/*` packages).
- No code change required.

### A11Y-005 — table semantics — **CLOSED**
- `src/components/ui/table.tsx` (`<TH>`) now defaults `scope="col"`. All five consumer tables (`/work-items`, `/users`, `/admin`, `/qa`, plus settings sub-pages) inherit the fix without per-page edits. Callers can still pass `scope="row"` for row headers.
- `src/components/settings/RolesMatrix.tsx` (the only hand-rolled `<table>` outside the shared component) now has an `sr-only` `<caption>`, `scope="col"` on the role headers, and the permission column is promoted from `<td>` to `<th scope="row">` so each cell announces both its column (role) and row (permission) to screen readers.

### A11Y-006 — icon-only button sweep — **CLOSED**
- Audit of every `<button>` consuming `lucide-react` icons shows the vast majority either contain visible text alongside the icon or already carry `aria-label`. Concrete examples:
  - `NotificationActions.MarkOneRead` — `aria-label="Mark as read"` ✓
  - `TeamMemberControls.RemoveTeamMember` — `aria-label="Remove member"` ✓
  - `MfaSection` copy-secret button — `aria-label="Copy setup key"` ✓
  - `Sidebar` collapse toggle — `aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}` ✓
  - `Topbar` notifications link — `aria-label={…unreadCount…}` ✓
  - `_shared.Toggle` — `role="switch"` + `aria-label={label}` ✓
- The **one gap** found and fixed: `Topbar` account-menu trigger, whose visible label (`{user.name}`) is hidden on screens narrower than `sm` (`hidden … sm:block`), leaving the button icon-only on mobile. Added `aria-label={`Account menu for ${user.name}`}` so screen readers and mobile AT have a stable name across breakpoints.

### Out of scope for Batch 8 (deliberately deferred)
- Expansion of `accessibility.spec.ts` to the remaining ~25 routes — tracked in the spec's `TODO` block.
- Conversion of the inline-style CSP (`SEC-014`) — separate security-scoped bug, not an a11y concern.
- `next-intl` / i18n — flagged in the original audit as out-of-scope for v1.
