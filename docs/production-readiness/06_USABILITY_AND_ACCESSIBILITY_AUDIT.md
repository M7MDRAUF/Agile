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
