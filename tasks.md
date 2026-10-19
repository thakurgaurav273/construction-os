# SitePilot — Completion Tasks

Source: completeness audit of 2026-10-19. Work top to bottom; each task is shippable on its own.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

Verification for every task: `pnpm typecheck`, `pnpm lint`, `pnpm build` (fix only what the task introduced).

---

## Phase 1 — Core site workflows

### T1. Daily Reports — make submission actually work  `[x]`
- [x] Backend: add class-validator decorators to `CreateDailyReportDto` (today every POST is rejected with 400 by `forbidNonWhitelisted`)
- [x] Backend: typed nested DTOs for labour, materials, equipment, issues; remove `any` in service
- [x] Backend: verify `projectId` belongs to the caller's organization before create/read
- [x] Backend: `PATCH /projects/:projectId/daily-reports/:reportId` — edit a draft (submitted reports are locked)
- [x] Backend: `POST .../:reportId/submit` — submit an existing draft
- [x] Backend: `POST .../:reportId/approve` and `.../reject` with review note (new `APPROVED` / `REJECTED` statuses + reviewer fields, migration)
- [x] Backend: write project Activity entries for submitted / approved / rejected
- [x] Frontend: rebuild the new-report form with React Hook Form + Zod (no refs, no fake defaults, no `Math.random` labour counts)
- [x] Frontend: send labour, materials, equipment and issues to the API
- [x] Frontend: edit-draft page reusing the same form
- [x] Frontend: report detail — Submit / Approve / Reject actions, status badges for all four states
- [x] Frontend: real photo/attachment upload linked to the report
- [x] Frontend: remove the hardcoded "AI summary" stream (real AI lands in T17)
- [x] Frontend: global Daily Reports page lists actual reports across projects (not just projects)
- [ ] Verify attachment upload against running MinIO/R2 (validation paths tested; storage write not exercised locally)

> Verified 2026-10-19: migrations applied on a fresh DB, seed ran, and 23 HTTP checks passed — create → edit → submit → lock → send back with note → resubmit → approve, maker-checker, validation errors, org isolation, activity timeline, paginated org list + summary.

### T2. Attendance & Workforce  `[x]`
- [x] Schema: `Attendance` model (worker, project, date, status, checkIn, checkOut, hours, markedBy, notes) with one row per worker per day + migration
- [x] Backend: mark single attendance, bulk-mark a crew for a date, check-in / check-out
- [x] Backend: attendance list for a project + date, worker attendance history
- [x] Backend: worker create / update / deactivate, assign worker to project (validated DTOs)
- [x] Backend: compute `presentToday`, `absentToday`, attendance % and weekly trend from Attendance rows (not seeded strings)
- [x] Frontend: "Mark Attendance" sheet for a project + date (bulk present/absent/late/half-day)
- [x] Frontend: Add Worker and Assign to Project wired to the API
- [x] Frontend: Attendance and Trades tabs driven by API data; remove `workforce-demo` fallbacks
- [x] Frontend: project Workforce tab shows today's attendance
- [x] Dashboard: "Workforce Today" from attendance (remove "coming soon")
- [ ] Compliance: derive certification status from expiry date (today it's a stored string) + certification CRUD
- [ ] Night-shift check-ins after midnight are recorded on the next calendar day — revisit if night crews need shift-based days

> Verified 2026-10-19: migration on a fresh DB, seed generates 21 days of history, 31 HTTP checks (derived stats, roster, bulk mark validation, check-in lateness by shift + org timezone, worker CRUD/assign/deactivate, timeline, dashboard, org isolation) and a 19-step headless-browser run as owner and site engineer.

---

## Phase 2 — Security & foundations

### T3. Organization isolation
- [ ] Verify `projectId` belongs to org in documents upload, purchase-order create, materials category/supplier, report aggregation
- [ ] Remove raw-body passthrough in `ReportsService.updateSchedule`
- [ ] Verify `locationId` on inventory item update

### T4. RBAC (permission-based)
- [ ] Permission constants per module + role → permission map
- [ ] `@RequirePermissions()` decorator + `PermissionsGuard`
- [ ] Apply to every mutating endpoint (PO approve, budgets, documents delete, transfers, adjustments, settings, org update)
- [ ] Daily report approve / reject → `dailyReports.approve` permission (today any non-author member can review)
- [ ] Attendance marking + worker create/deactivate → `workforce.manage` permission (today any member can)
- [ ] Fix OWNER escalation in settings (ADMIN can't invite/promote to OWNER)
- [ ] Register `ThrottlerGuard` globally

### T5. Auth hardening
- [ ] Bug: two logins in the same second → 500 (refresh JWTs are identical → unique constraint on `refresh_tokens.token`); add a random `jti`
- [ ] Separate refresh secret + `type` claim; access strategy rejects refresh tokens
- [ ] Remove hardcoded fallback JWT secrets
- [ ] Re-check organization membership on refresh and in the JWT strategy
- [ ] Move tokens to HttpOnly cookies; stop writing tokens to localStorage
- [ ] Logout button wired to `POST /auth/logout`
- [ ] Forgot / reset password flow

### T6. Invitations
- [ ] `POST /invitations/:token/accept` endpoint (set name + password)
- [ ] `/accept-invitation/[token]` page; make it public in middleware
- [ ] Align frontend role list with `OrgRole` enum (remove `ENGINEER`, add `SITE_ENGINEER`, `STORE_MANAGER`)

### T7. Validation everywhere
- [ ] DTOs for settings (role change, invite), notifications (device register), reports (generate, schedule create/update), auth refresh/logout
- [ ] Remove remaining `any` in backend

### T8. Audit log
- [ ] `AuditLog` model (actor, action, entity, metadata, timestamp — immutable) + migration
- [ ] `AuditService` used by every mutating service
- [ ] Settings → Audit Logs tab reads real data

---

## Phase 3 — Module write flows

### T9. Procurement
- [ ] New Purchase Order page/dialog wired to `POST /purchase-orders`
- [ ] Vendor create / edit / deactivate
- [ ] RFQ create, invite vendors, record quotes, compare, award
- [ ] Delivery receive / GRN linked to PO (FK, not strings)
- [ ] PO state machine guards (no approving a rejected PO), PO edit/cancel, GET by id
- [ ] Project → Purchase Orders tab: correct field names + filter by project
- [ ] Replace hardcoded analytics/KPI trend text with API data; error state + skeletons

### T10. Materials
- [ ] Fix create with empty category/supplier (FK error → 500)
- [ ] Edit material UI, delete/archive
- [ ] Issue material to project / record consumption (MaterialMovement + MaterialProjectUsage)
- [ ] Warehouse select from real warehouses; single source of truth for stock
- [ ] Project → Materials tab

### T11. Inventory
- [ ] Warehouse + location create / edit
- [ ] Enforce approval before transfer completion
- [ ] Record actor from auth context (requestedBy / approvedBy / adjustedBy)
- [ ] Stock check inside transaction; race-safe codes
- [ ] Export, toast typos

### T12. Finance
- [ ] Create / approve / cancel invoice
- [ ] Record / approve payment
- [ ] Budget line items CRUD linked to project budget
- [ ] Fix KPI formatting (currency, variance %), error state

### T13. Projects & Settings
- [ ] Project archive/delete, remove member, change member role, list pagination
- [ ] Remove "Coming Soon" `[tab]` route
- [ ] Settings → Organization tab wired to `PATCH /auth/organization` + real logo upload
- [ ] Error states on projects list, budget, team, timeline

---

## Phase 4 — Platform

### T14. Background jobs
- [ ] BullMQ + Redis queue module

### T15. Notifications
- [ ] Emit notifications from domain events (PO approved, report submitted, transfer approved…)
- [ ] Fix WebSocket gateway secret; frontend socket client
- [ ] Header: correct type icons, timestamps, mark-all-read
- [ ] Notification preferences endpoint + UI

### T16. Reports
- [ ] Real PDF / Excel generation (queued), stored in object storage, download button
- [ ] Per-type report data (safety, workforce, procurement…)
- [ ] Scheduled reports executed by the queue, emailed to recipients

### T17. AI
- [ ] `AiService` + provider adapter abstraction (Anthropic first)
- [ ] Daily report summary generation
- [ ] Project assistant backed by the AI service
- [ ] Fix XSS: remove `dangerouslySetInnerHTML` in project AI page

### T18. Dashboard & demo cleanup
- [ ] Real budget trend, pending approvals, workforce today
- [ ] Remove demo AI insights / weather / hardcoded org names
- [ ] Delete unused `demo-store.ts`, `procurement-store.ts`; update `docs/DEMO_MODE.md`

### T19. Tests
- [ ] Jest setup for backend; service tests for daily reports, attendance, transfers, PO approvals
