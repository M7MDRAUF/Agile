# Roadmap

AgileForge currently delivers a complete, self-hosted Agile delivery workspace. The items
below are potential future enhancements, grouped by theme. They are not commitments — they
describe a credible direction for the product.

## Near-term

- **Real-time collaboration** — live board/backlog updates via WebSockets or Server-Sent Events so multiple users see drag-and-drop changes instantly.
- **Comments & mentions** — threaded discussion on work items with `@mention` notifications.
- **Attachments** — file uploads on work items and test cases backed by object storage.
- **Saved filters & views** — persist custom work-item queries per user.
- **Bulk editing** — multi-select on the work-items table for batch status/assignee changes.

## Mid-term

- **Sprint planning aids** — capacity planning, drag-to-sprint from the backlog, and commitment vs. completed tracking.
- **Custom workflows** — per-project configurable statuses and transition rules instead of the fixed status set.
- **Reporting upgrades** — cumulative flow diagram, control charts, and exportable (CSV/PDF) reports.
- **Notification preferences** — per-event opt-in/opt-out and a digest mode.
- **Audit log** — immutable history of permission-sensitive actions for compliance.

## Longer-term

- **Integrations** — GitHub/GitLab pull-request linking, CI status on work items, and Slack/Teams notifications.
- **Multi-organization tenancy** — workspace isolation for hosting multiple companies on one deployment.
- **API & webhooks** — a documented REST/GraphQL surface plus outbound webhooks for automation.
- **Mobile-optimized PWA** — installable progressive web app with offline-friendly read views.
- **AI assist** — backlog grooming suggestions, duplicate detection, and sprint-risk forecasting.

## Platform & quality

- **Database portability** — first-class PostgreSQL support alongside SQLite (Prisma adapter swap).
- **Test coverage** — expand component and E2E coverage; add visual regression snapshots.
- **CI/CD** — GitHub Actions pipeline running lint, typecheck, unit, and E2E on every PR.
- **Observability** — structured logging, error tracking, and basic performance metrics.
- **Internationalization** — extract UI strings and add locale support.

## 2026-05-29 Reconciliation Note (post-remediation)

Several roadmap items above have been delivered on branch `implement-production-readiness-fixes`:

- **CI/CD** — GitHub Actions now runs lint, typecheck, unit (Vitest, 440/440), build, and Playwright
  e2e on every PR with enforced coverage thresholds (35/35/40/60).
- **Observability** — `/api/health` and `/api/ready` probes plus graceful shutdown (REL-007),
  retry/backoff helper (REL-010), and `X-Export-Truncated` header on capped exports (PERF-002).
- **Database portability** — Prisma schema hardened with 11 hot-path indexes, transactional
  multi-writes, and an atomic `WorkItemCounter` for key generation; the PostgreSQL adapter swap
  remains the only outstanding step.

Authoritative current state:
[`production-readiness/REMEDIATION_PROGRESS_2026-05-29.md`](production-readiness/REMEDIATION_PROGRESS_2026-05-29.md)
and [`production-readiness/POST_REMEDIATION_FINAL_VERDICT_2026-05-29.md`](production-readiness/POST_REMEDIATION_FINAL_VERDICT_2026-05-29.md).
**Verdict: CONDITIONAL APPROVAL.** Remaining roadmap-blocking gaps: full 19×7 browser matrix walk
and WCAG 2.1 AA pass (A11Y batch 8, items A11Y-001..006).
