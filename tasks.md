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

### T3. Organization isolation  `[x]`
- [x] Verify `projectId` belongs to org in documents upload, purchase-order create, materials category/supplier, report aggregation (report project filter had no org scope; document upload wrote to storage before checking; upload names are now sanitised)
- [x] Remove raw-body passthrough in `ReportsService.updateSchedule` (DTOs for generate / schedule create + update / history)
- [x] Verify `locationId` on inventory item update (done in T11)

### T4. RBAC (permission-based)
- [ ] Permission constants per module + role → permission map
- [ ] `@RequirePermissions()` decorator + `PermissionsGuard`
- [ ] Apply to every mutating endpoint (PO approve, budgets, documents delete, transfers, adjustments, settings, org update)
- [ ] Daily report approve / reject → `dailyReports.approve` permission (today any non-author member can review)
- [ ] Attendance marking + worker create/deactivate → `workforce.manage` permission (today any member can)
- [ ] Fix OWNER escalation in settings (ADMIN can't invite/promote to OWNER)
- [~] Rate limiting: auth endpoints limited to 10/min per IP; a global limit waits for `TRUST_PROXY` to be set in production (behind a proxy every user shares one IP)

### T5. Auth hardening  `[x]`
- [x] Bug: two logins in the same second → 500; every token now has a random `jti`
- [x] Separate access / refresh secrets + `type` claim; each rejects the other
- [x] Remove hardcoded fallback JWT secrets (API refuses to start without two distinct secrets of 32+ chars). Note: docker-compose only passed `JWT_ACCESS_SECRET`, so production was signing with the hardcoded fallback until now
- [x] Re-check organization membership on refresh and in the JWT strategy; deactivated users lose access immediately
- [x] HttpOnly cookies (`access_token`, `refresh_token` on `/api/auth`, `sp_session` flag); nothing in localStorage or response bodies; legacy tokens cleaned up
- [x] Refresh tokens hashed at rest, rotated, and replay of a rotated token ends all of the user's sessions
- [x] Sign out from the account menu (sidebar + mobile header)
- [x] Forgot / reset password: single-use hashed links, 1 hour, no account enumeration, resets end all sessions
- [x] Login honours `?redirect=` (same-site paths only); unknown email and wrong password give the same answer

> Verified 2026-10-23: 40 HTTP checks (cookies, rotation, reuse detection, logout, deactivation, reset flow, enumeration, report/document isolation, rate limit), 6 token unit tests, startup refuses missing/short secrets, and a headless-browser run (redirect, HttpOnly, silent refresh after access expiry, sign out, forgot/reset pages).

### T6. Invitations  `[x]`
- [x] `GET /invitations/:token` preview + `POST /invitations/:token/accept`: new people set name + password; existing accounts confirm with their current password; accepting signs in to the inviting organization (cookies). Single-use (claimed atomically), expired links refused, rate-limited
- [x] `/accept-invitation/[token]` page; public in middleware (the old `/invite` prefix didn't match the emailed link)
- [x] Align frontend role list with `OrgRole` enum (already done with RBAC)
- [x] Removed the unused settings `acceptInvitation`, which would have created users with an empty password; invite emails normalised; invitation responses no longer include the token hash
- [ ] Organization switcher for people who belong to several organizations (login opens the earliest-joined one)

> Verified 2026-10-23: 25 HTTP checks (preview, new and existing accounts, wrong password keeps the link usable, concurrent accept, reuse, expiry, case-insensitive member check) and a headless-browser run (open link → set password → dashboard; reused link shows the expiry message).

### T7. Validation everywhere
- [ ] DTOs for settings (role change, invite), notifications (device register), reports (generate, schedule create/update), auth refresh/logout
- [ ] Remove remaining `any` in backend

### T8. Audit log  `[x]`
- [x] `AuditLog` model (actor snapshot, action, entity, project, redacted input, IP, user agent, timestamp) + migration; a Postgres trigger rejects UPDATE / DELETE / TRUNCATE
- [x] Every write endpoint declares `@Audit('<action>')` from a typed catalogue (87 endpoints); a global interceptor records successful calls; a test fails if a new write endpoint isn't audited. Exempt: token refresh, logout, forgot-password, personal notification actions. Password resets are recorded by the service in each of the person's organizations
- [x] `GET /audit-logs` (new `audit.view` permission, owners/admins) with search, record type, action prefix, project, actor and date filters
- [x] Settings → Audit Logs tab reads real data (filters, pagination, detail sheet, loading / empty / error / restricted states)
- [ ] Per-record history panels (e.g. "History" on a PO drawer) reading `?entityType=&entityId=`

> Verified 2026-10-23: 21 HTTP checks (sign-in with IP/agent, password redaction, PO approval with entity id, failed actions not recorded, project-scoped ids, nested id params, filters, 403 for non-admins, org isolation, password reset, trigger blocks update/delete/truncate) and a headless-browser run (owner filters and opens an entry; project manager sees the restricted state on mobile).

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

### T10. Materials  `[x]`
- [x] Fix create with empty category/supplier (FK error → 500); category/supplier verified to belong to the org; duplicate SKU → 409
- [x] Edit material UI, archive (only when no stock on hand or incoming)
- [x] Issue material to project / record returns — numbered MIN/MRN notes through the stock ledger, race-safe availability check, project activity
- [x] Single source of truth for stock: catalogue form no longer edits quantities or a free-text warehouse; drawer and Inventory tab read real per-store stock; opening stock via count adjustment
- [x] Project → Materials tab: consumption vs planned quantity, issue/return, recent notes
- [ ] Material requests (site requests → store approves → issue) — not modelled yet

> Verified 2026-10-23: migration on a fresh DB, seed, 36 HTTP checks (create/edit/archive validation, issue/return/plan, permissions, over-issue, concurrent issues, org isolation, material total = Σ store stock) and a headless-browser run as a project manager (desktop + 390px mobile).

### T11. Inventory  `[x]`
- [x] Store create / edit / archive (empty stores only) and bin locations add / edit / remove; new `warehouse.manage` permission
- [x] Transfers: PENDING → APPROVED → COMPLETED enforced; requester can't approve or reject their own request; reject needs a note; only the requester cancels
- [x] Actors from the auth context (requestedById / approvedById / completedById / adjustedById, FK to users; migration backfills existing rows with the org owner)
- [x] Stock moves through the ledger with an atomic availability check; adjustments lock the row; TRF / ADJ codes retry on clash; double completion can't double-move stock
- [x] Damaged stock no longer subtracted twice from availability; item PATCH limited to reorder level + bin (bin must be in the same store)
- [x] Real CSV export of all store lines; transfer toasts fixed; server error messages shown
- [x] Verify `locationId` on inventory item update (from T3)

> Verified 2026-10-23: migration backfill tested on legacy rows, fresh DB + seed, 46 HTTP checks (store/bin setup, transfer state machine + maker-checker, concurrent receive, concurrent adjustments, damaged availability, material total = Σ store stock, permissions, org isolation) and a headless-browser run (owner requests, project manager approves and receives).

### T12. Finance
- [ ] Create / approve / cancel invoice
- [ ] Record / approve payment
- [ ] Budget line items CRUD linked to project budget
- [ ] Fix KPI formatting (currency, variance %), error state

### T13. Projects & Settings  `[x]`
- [x] Archive / restore (back to the previous status), delete only for projects with no history (new `project.delete` permission, code freed for reuse), remove member (never the last project manager), change project role
- [x] Server-side pagination, search, status and priority filters, sorting; archived projects hidden by default; `GET /projects/options` for pickers (archived excluded)
- [x] Archived projects are read-only for project details and team, with a banner and Restore in the project menu
- [x] Remove "Coming Soon" `[tab]` route; Timeline's dead Export button removed
- [x] Settings → Organization tab wired to `GET/PATCH /settings/organization` (validated GSTIN, currency, IANA time zone) + logo upload/remove (PNG/JPG/WebP ≤ 2 MB, signed URLs); onboarding uses the same endpoint; `PATCH /auth/organization` removed; header shows the real organization name
- [x] Error states on projects list, project layout (covers budget, team, timeline), team, organization settings
- [ ] Block new work (POs, reports, issues, attendance…) on archived projects in the other modules; today they're only hidden from pickers
- [ ] Verify logo upload against running MinIO/R2 (validation paths tested; storage write not exercised locally)

> Verified 2026-10-23: 41 HTTP checks (pagination, search, sort, options, archive/restore/delete rules, permissions, team changes, organization validation, logo validation, audit entries) and a headless-browser run (search, archive banner, restore, team role change, organization save updating the sidebar).

---

## Phase 4 — Platform

### T20. Branding  `[x]`
- [x] Settings → Branding: logo (moved here from Organization), brand colour from presets or any hex, live light/dark preview, restore default
- [x] Brand colour applied app-wide for every member (buttons, links, focus rings, active navigation) via theme tokens; button text colour and a dark-mode shade derived automatically
- [x] Contrast rule (≥ 3:1 on white) enforced in the API and shown live in the UI; `organization.branding_updated` audited; owners/admins only
- [x] Sidebar shows the organization logo and current name
- [x] Personal appearance (light / dark / match device) for every member
- [ ] Use logo and colour on generated PDFs and emails once report/PO PDFs exist (T16)

> Verified 2026-10-24: 45 backend unit tests (incl. contrast), 6 API checks (hex/contrast validation, permissions, audit, members read it) and a headless-browser run (preset → save re-themes the app instantly, other member in dark mode gets the lighter shade, read-only for non-admins, too-light colour blocked, default restored).

### T14. Background jobs
- [ ] BullMQ + Redis queue module

### T15. Notifications  `[x]`
- [x] Emit notifications from domain events: every audited action is published on an in-process event bus; rules turn them into notifications — PO submitted/approved/rejected/sent back, daily report submitted/approved/sent back, bill submitted/approved/rejected, payment requested/approved (+ "ready to release")/rejected/released, transfer requested/approved/rejected/received, role changed, added to a project. Approvers are found by permission (preferring the project team), and nobody is told about their own action
- [x] Fix WebSocket gateway secret (done in T5); rooms per organization + member; socket CORS uses the API's allowed origins; frontend socket client (`socket.io-client`) with toast + Open, 60 s polling fallback
- [x] Header bell: type icons by severity, relative timestamps, real unread count, click opens the linked page and marks it read, working "Mark all as read" (opening the bell no longer marks everything read)
- [x] Notification preferences: `GET/PUT /notifications/preferences`, per category (waiting for you / your requests / team / general) × in-app / email; Settings → Notifications tab; approvals are emailed by default. Replaced the unused legacy `notification_preferences` table
- [x] DTOs for list query, device registration and preferences (removed `any`)
- [ ] Email delivery depends on `RESEND_API_KEY` (stubbed to the log without it); push needs a real Firebase provider
- [ ] Notification centre page with history beyond the latest 20

> Verified 2026-10-24: migration on a fresh DB (matches the schema exactly), 34 unit tests, 21 HTTP/socket checks (live delivery, permission-based recipients, no self-notifications, preferences mute in-app, email routing, read state, isolation, transfer flow) and a headless-browser run (live toast while the app is open, bell → open link → marked read, preferences tab).

### T16. Reports
- [ ] Real PDF / Excel generation (queued), stored in object storage, download button
- [ ] Per-type report data (safety, workforce, procurement…)
- [ ] Scheduled reports executed by the queue, emailed to recipients

### T17. AI  `[x]`
- [x] `AiService` + provider adapters: Google Gemini, Groq and Hugging Face (Groq/HF share an OpenAI-compatible adapter, so OpenAI is one more class); base URLs and default models overridable by env
- [x] Bring-your-own-key: Settings → AI, keys tested live before saving, AES-256-GCM encrypted with `AI_KEYS_ENCRYPTION_KEY`, never returned (last 4 only), never written to the audit log
- [x] Free trial (14 days / 100 requests) and top-ups requested by tenant admins, approved/declined by platform super admins on the platform key; allowance counted from successful platform-funded calls; requester notified
- [x] Platform console at `/platform` (allow-list `PLATFORM_ADMIN_EMAILS`): AI requests, tenants, platform keys (default key funds trials), usage
- [x] Project assistant chat, organization-wide AI Assistant, daily report summary (saved on the report), AI Command Center insights (cached, 10-minute refresh cooldown); all grounded in live data with prompt-injection guarding
- [x] Fix XSS: removed `dangerouslySetInnerHTML`; model output rendered by a safe Markdown renderer
- [x] New permissions `ai.use` (all roles except Viewer) and `ai.manage` (owners/admins); AI calls rate-limited (20/min) and logged in `ai_usage`
- [ ] Verify against real Gemini/Groq/Hugging Face keys (tested with a protocol-accurate mock; model ids change often and are editable in Settings)
- [ ] Streaming responses; per-tenant monthly caps for own-key usage

> Verified 2026-10-23: 44 backend unit tests (encryption, adapters, error mapping, insight parsing, redaction), 45 end-to-end HTTP checks against a mock Groq/Gemini server (key validation and encryption, grounding, trial → used up → top-up → decline, platform-admin gating, tenant isolation, notifications, audit) and a headless-browser run (connect a key in Settings, chat, report summary, insights, approve a trial in /platform, tenant owner blocked from /platform).

### T18. Dashboard & demo cleanup
- [ ] Real budget trend, pending approvals, workforce today
- [ ] Remove demo AI insights / weather / hardcoded org names
- [ ] Delete unused `demo-store.ts`, `procurement-store.ts`; update `docs/DEMO_MODE.md`

### T19. Tests
- [ ] Jest setup for backend; service tests for daily reports, attendance, transfers, PO approvals
