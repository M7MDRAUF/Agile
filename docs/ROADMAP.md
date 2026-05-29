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
