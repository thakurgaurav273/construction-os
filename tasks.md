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
- [x] Compliance: certifications moved from a JSON list with a typed-in status to a `worker_certifications` table (ADR-039; migration copies existing entries). Valid / expiring (≤ 30 days) / expired is derived from the expiry date in the organization's time zone, so it changes as days pass. Add, edit/renew and remove from the worker drawer (`workforce.manage`, audited against the worker); stats count workers with expiring and with expired certificates; Compliance tab, Workforce alerts and KPI, and the Safety and Workforce reports list each certificate by name and date; seed dates are relative to today. Fixed on the way: "Fully compliant" ignored certificates, compliance % divided by zero with no workers, and the worker drawer was wider than the screen (Radix scroll content laid out as a table)
  > Verified 2026-10-24: migration tested on old-format rows (trimmed names, empty/malformed entries skipped, bad dates → no expiry, non-array and null JSON ignored, column dropped), 7 unit tests for the status rules (expiry day itself, 30-day boundary, no expiry, calendar moving on), 5 integration tests (order, stats, renew, expiry-before-issue, cross-worker and cross-organization refusals), 16 HTTP checks (seed mix, status agrees with days, stats, validation, derived status not accepted from clients, site engineer 403 but can read, audit entries on the worker, Safety and Workforce reports name each certificate with its date) and a 15-step headless-browser run (KPI and alerts, compliance order, add with validation, renew, remove with confirmation, site engineer read-only on a phone; drawer fits at 1440px and 390px)
- [x] Certificate renewal reminders: an hourly queue job (plus one pass at startup) sends a digest per project to members with `workforce.manage` (the project team where it has any), after 08:00 in the organization's time zone, when a certificate is 30 days from expiry, in its final week, and once expired. Each stage goes out at most once per certificate (claimed with a conditional update; a renewal starts over); deactivated workers are skipped. New "Reminders" notification category (in-app and email on by default, changeable in Settings → Notifications); `NotificationsService.send` now accepts system sources as well as user actions
  > Verified 2026-10-24: 3 unit tests (stages, skipping stages already passed, wording), 7 integration tests (waits for the local morning, per-project digests to the team vs everyone, urgency order and grouping by worker with "and N more", ERROR vs WARNING, site engineers excluded, no repeats including two concurrent runs, next stages days later, renewal resets, deactivated workers, organizations kept apart), and an end-to-end run on seeded data (27 certificates → one digest per project for the owner and PM, a restart sends nothing new, bell shows the digest and opens Workforce, Reminders listed in notification settings)
- [ ] Night-shift check-ins after midnight are recorded on the next calendar day — revisit if night crews need shift-based days

> Verified 2026-10-19: migration on a fresh DB, seed generates 21 days of history, 31 HTTP checks (derived stats, roster, bulk mark validation, check-in lateness by shift + org timezone, worker CRUD/assign/deactivate, timeline, dashboard, org isolation) and a 19-step headless-browser run as owner and site engineer.

---

## Phase 2 — Security & foundations

### T3. Organization isolation  `[x]`
- [x] Verify `projectId` belongs to org in documents upload, purchase-order create, materials category/supplier, report aggregation (report project filter had no org scope; document upload wrote to storage before checking; upload names are now sanitised)
- [x] Remove raw-body passthrough in `ReportsService.updateSchedule` (DTOs for generate / schedule create + update / history)
- [x] Verify `locationId` on inventory item update (done in T11)

### T4. RBAC (permission-based)  `[x]`
- [x] Permission constants per module + role → permission map (`packages/types` permissions, `permission-catalogue.ts`; Settings → Roles shows it)
- [x] `@RequirePermission()` decorator + `PermissionsGuard`; a route-coverage test fails if a write route has no permission (or isn't listed as open)
- [x] Applied to every mutating endpoint (PO approve, documents delete, transfers, adjustments, settings, org update…)
- [x] Daily report approve / reject → `dailyReport.approve`
- [x] Attendance marking → `attendance.mark`; worker create/edit/deactivate → `workforce.manage`
- [x] OWNER escalation fixed: only owners can invite, promote to or remove owners
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
- [x] Organization switcher for people who belong to several organizations (ADR-040): `GET /auth/organizations`, `POST /auth/switch-organization` (membership and account status checked, refresh cookie must belong to the caller, tokens re-issued on the same session so Settings → Security still shows one device and the old refresh token is used up, recorded as `auth.switched_organization` in the organization switched into). Sign-in reopens the organization used last (`users.lastOrganizationId`), falling back to the earliest-joined one after leaving it; registering and accepting an invitation set it too. Switcher on the sidebar's organization name and in the account menu (phones), hidden for people in one organization; switching reloads into the new organization's dashboard (query cache, live notifications and brand colour start fresh) and cached permissions are now kept per organization
  > Verified 2026-10-24: 8 integration tests (listing, same session id, old refresh token refused, last-used reopened, fallback after leaving, foreign and unknown organizations refused without touching the session, another person's refresh token refused and left intact, audit in the target organization, inactive accounts), unit coverage tests for the new route, and an 18-step headless-browser run (site engineer in one organization and project manager in another: permissions and data follow the switch, one session before and after, sign-in reopens the last one, account-menu switcher on a phone, no switcher for single-organization owners)

> Verified 2026-10-23: 25 HTTP checks (preview, new and existing accounts, wrong password keeps the link usable, concurrent accept, reuse, expiry, case-insensitive member check) and a headless-browser run (open link → set password → dashboard; reused link shows the expiry message).

### T7. Validation everywhere  `[x]`
- [x] DTOs for settings (role change, invite), notifications (device register), reports (generate, schedule create/update); every `@Body()` is a validated DTO (refresh/logout take no body)
- [x] No `any` left in backend source

### T8. Audit log  `[x]`
- [x] `AuditLog` model (actor snapshot, action, entity, project, redacted input, IP, user agent, timestamp) + migration; a Postgres trigger rejects UPDATE / DELETE / TRUNCATE
- [x] Every write endpoint declares `@Audit('<action>')` from a typed catalogue (87 endpoints); a global interceptor records successful calls; a test fails if a new write endpoint isn't audited. Exempt: token refresh, logout, forgot-password, personal notification actions. Password resets are recorded by the service in each of the person's organizations
- [x] `GET /audit-logs` (new `audit.view` permission, owners/admins) with search, record type, action prefix, project, actor and date filters
- [x] Settings → Audit Logs tab reads real data (filters, pagination, detail sheet, loading / empty / error / restricted states)
- [x] Per-record history panels: a collapsible History section (who did what, when; expand an entry for the details sent, with readable labels; "Show older" up to 100, then a link to the full log) on purchase orders, vendors, RFQs, materials, stores, transfers, vendor bills, workers (including their certificate changes), contracts and RA bills. Shown only to members with `audit.view` and fetched only when opened; reads `GET /audit-logs?entityType=&entityId=`. Checked that nested routes (bins, quotes, measurements, receipts) are recorded against their parent record
  > Verified 2026-10-24: a vendor edited, deactivated and reactivated shows exactly those three changes newest first, another vendor's edit stays out, expanded details read "Contact person · Meera Iyer" and "Payment terms · Net 45", nothing is requested until opened, a seeded order with no entries shows the empty state, the worker drawer has it, and a site engineer on a phone sees no History section (11-step headless-browser run)

> Verified 2026-10-23: 21 HTTP checks (sign-in with IP/agent, password redaction, PO approval with entity id, failed actions not recorded, project-scoped ids, nested id params, filters, 403 for non-admins, org isolation, password reset, trigger blocks update/delete/truncate) and a headless-browser run (owner filters and opens an entry; project manager sees the restricted state on mobile).

---

## Phase 3 — Module write flows

### T9. Procurement  `[x]`
- [x] New Purchase Order dialog wired to `POST /purchase-orders` (procurement page and project tab)
- [x] Vendor create / edit / deactivate / reactivate
- [x] RFQ create, invite vendors, record quotes, compare, award (creates the PO)
- [x] Delivery receive / GRN linked to the PO by foreign key, receiving into a store's stock
- [x] PO state machine guards, edit / cancel, GET by id, maker-checker approval
- [x] Project → Purchase Orders tab filtered by project
- [x] Analytics/KPIs from API data with error states and skeletons

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

### T12. Finance  `[x]`
- [x] Create / submit / approve / reject / cancel vendor bills (maker-checker, PO matching)
- [x] Request / approve / release / cancel payments (maker-checker)
- [x] Budget heads per project (ADR-037): add / rename / re-allocate / remove from the project Budget tab (`budget.manage`: owners, admins, project managers, finance). Committed (approved POs not yet billed) and spent (approved, part-paid and paid vendor bills), both incl. GST, are derived from the matching category, never typed in; anything outside the heads shows as Unbudgeted. PO and vendor-bill category pickers list the project's heads first. Finance, the finance summary and the Cost report use the same figures
  > Verified 2026-10-24: 4 unit tests, 38 HTTP checks (figures match orders and bills in the DB, case-insensitive matching, unbudgeted moves when heads are added or removed, a new PO counts only once approved, permissions per role, validation, cross-project isolation, finance summary and Cost report agree, audit) and a headless-browser run (add/remove a head, PO category picker, phone layout, site engineer restricted state).
- [ ] `Project.spent` (dashboard and project header) is still a stored figure; derive it from vendor bills like the budget heads
- [x] KPI formatting (₹, utilisation %), error states

### T13. Projects & Settings  `[x]`
- [x] Archive / restore (back to the previous status), delete only for projects with no history (new `project.delete` permission, code freed for reuse), remove member (never the last project manager), change project role
- [x] Server-side pagination, search, status and priority filters, sorting; archived projects hidden by default; `GET /projects/options` for pickers (archived excluded)
- [x] Archived projects are read-only for project details and team, with a banner and Restore in the project menu
- [x] Remove "Coming Soon" `[tab]` route; Timeline's dead Export button removed
- [x] Settings → Organization tab wired to `GET/PATCH /settings/organization` (validated GSTIN, currency, IANA time zone) + logo upload/remove (PNG/JPG/WebP ≤ 2 MB, signed URLs); onboarding uses the same endpoint; `PATCH /auth/organization` removed; header shows the real organization name
- [x] Error states on projects list, project layout (covers budget, team, timeline), team, organization settings
- [x] Block new work on archived projects in the other modules (ADR-036): new or edited daily reports, attendance and check-ins, assigning workers, purchase orders (create, edit, submit, approve), RFQs and awards, material issues and plans, site stores, document uploads and RA bills are refused with a 409 explaining how to restore. Still allowed: reading, approving or rejecting reports already submitted, rejecting or cancelling orders, returning leftover stock, editing workers already there, and all money flows (vendor bills, payments, receipts). Project tabs hide the blocked actions and the banner says what's paused
  > Verified 2026-10-24: 3 unit tests for the shared guard, 30 HTTP checks (every blocked action, every action that stays open, other projects unaffected, restore reopens drafts and orders) and a headless-browser run of each project tab on an archived project.
- [ ] Verify logo upload against running MinIO/R2 (validation paths tested; storage write not exercised locally)
- [x] Settings completed: grouped navigation (Account / Workspace) with tabs kept in the URL hash; no placeholder tabs left
- [x] Profile: edit your name (`PATCH /auth/profile`), shown at once in the sidebar and menus; "Your profile" in the account menu
- [x] Security: change password with the current one (`POST /auth/password`, rate-limited, signs out other devices); active sessions with device, IP and last activity; sign out one device or all others. Ended sessions lose access immediately (ADR-030)
- [x] Members & Roles: moved out of the page into feature components; invite form uses React Hook Form + Zod with a role description; real member status and last active; error states; read-only Roles & Permissions view from `GET /settings/roles`
- [x] Integrations: email and file storage status from `GET /settings/integrations` (owners/admins) plus the organization's AI status
- [ ] Profile photo upload (the `avatar` column exists; initials are shown today)

> Verified 2026-10-26 (Settings): 65 HTTP checks (sessions listed with device, session id kept through refresh, ending one device or all others cuts off its access token at once without signing out the current one, own session protected, cross-user session ids refused, profile validation, password change rules and sign-out of other devices, role catalogue, integrations restricted to admins, member last active, audit entries with redacted passwords) and a headless-browser run (profile save updates the sidebar, password form validation and wrong-password message without sign-out, invite form validation, role view, integrations, viewer restrictions on a phone viewport with no horizontal scroll, ending a session sends that browser to sign-in).

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

### T21. Billing (RA bills) — phase 1  `[x]`
- [x] One module for both directions (ADR-031): client contracts (we bill a client) and subcontracts (a vendor bills us); new `Client` records; contracts per project with the party's WO/PO number
- [x] BOQ per contract (item no, DSR/NS code, unit, quantity, rate, extra items), saved as a whole list; lines already billed can be edited but not removed; paste rows straight from Excel/Numbers
- [x] Taxes and deductions per contract (percent of gross or fixed: GST, TDS, BOCW, security deposit, retention, safety hold, advance recovery), copied onto each bill and editable per bill
- [x] RA bills in sequence (one open bill per contract); measurement book per BOQ line: Nos × L × B × H, steel (nos × cut length × kg/m), direct quantity, deduction rows; claimed quantity = measurement total
- [x] Abstract: previous (certified on earlier bills) / this bill / up to date, quantities and amounts, over-BOQ flag; gross → taxes/deductions → net payable
- [x] Workflow: Draft → Submitted → Certified, or sent back with a note; cancel open bills. Certifying records certified quantity per line (less than claimed = held, with reason) and freezes the rate. Subcontract bills are maker-checker; client bills record the client's certificate
- [x] Permissions `billing.view`, `contract.manage`, `billing.prepare`, `billing.certify`; audit log, project activity, bill timeline, notifications (subcontract bill awaiting certification, bill certified / sent back)
- [x] `/dashboard/billing` (RA bills, contracts, clients), contract page, bill page; loading, empty, error and restricted states; phone layout
- [x] Phase 2 (ADR-032): certifying a subcontract bill raises an approved vendor bill in Finance for the exact net (work lines + one line per tax/deduction), paid through the usual payment request → approval → release; bill page shows its payment status with a link into Finance; billing-raised vendor bills can't be cancelled in Finance
- [x] Client bills become receivables: due date from the contract's payment terms (default 30 days), our tax invoice number captured at certification, receipts recorded by finance (`billing.receipts`, part payments, no future dates, never more than outstanding) and voided with a reason; Billing → Receivables tab with ageing (not yet due, 1–30, 31–60, 61–90, 90+)
- [x] Retention ledger: deduction lines can be marked as retention; each contract shows held / released / balance by bill; releasing subcontract retention raises an approved vendor bill, client retention is recorded as received
- [x] Finance notified when a certified subcontract bill is ready for payment; audit entries for receipts, voids and retention releases
- [ ] Correcting a certified bill (today: no reversal of a certification or its vendor bill)
- [ ] Receivables and retention on the Finance dashboard and cash-flow forecast
- [x] Phase 3 (ADR-033): BOQ import on the contract page and measurement book import on a draft RA bill, using the same saved layouts as Data Import (AI-proposed once, name-matched without AI, applied by code after that); layouts also listed in Settings → Data Import
- [x] BOQ import: lines matched by item number (add / update / skip), NS codes marked extra; an optional "certified before SitePilot" column becomes one certified opening-balance bill numbered after the organization's last bill (e.g. up to RA-03, so the next bill is RA-04); opening bills move no money and aren't receivables
- [x] Measurement book import: nested MB sheets parsed by fixed rules (item rows, "RA Bill 1st/2nd" sections, measurement rows, Deduction/Desuction rows, notes, total/hold/paid rows); dimensions kept only when they reproduce the sheet's quantity exactly, otherwise the sheet's quantity is kept (with full dimensions in the description); preview checks each item against the sheet's own totals and flags holds; pick sections; each item's rows replace that item's measurements
- [x] Workbook picks the right tab (Abstract / MB) automatically; .numbers uploads explain how to export to Excel
- [x] Print view (landscape A4: header, abstract, amounts, signature block, measurement book) and Excel export (Abstract + Measurement Book, MB in the organization's own saved columns); print hides the app chrome everywhere
- [ ] Editable row-classification words (today: built-in list of section, total, hold, paid and deduction words)
- [x] Phase 4 (ADR-034): material issues and returns can name the subcontract they went to, with a recovery rate (defaults to stock cost; returns credit the issue rate); returns can't exceed what the subcontractor was issued
- [x] Subcontract bills list material still to recover by material (issued less returned); recovering adds a fixed deduction linked to those issue notes, so nothing is recovered twice; removing it or cancelling the bill frees them; manual tax/deduction edits never touch recovery lines; recovery flows into the vendor bill, print and Excel like any deduction; the contract shows issued / recovered / still to recover
- [x] Subcontract BOQ lines link to the client BOQ line they deliver, with suggestions (same rate code, then description, then item number and unit) only where the match is unique; links survive BOQ edits
- [x] Billing → Margin (needs finance view): per client item, certified value billed vs certified subcontract cost at frozen rates, margin %, margin per unit when units match; unlinked subcontract work listed separately; project totals including material recovered

> Verified 2026-10-24 (phase 4): 46 HTTP checks (link suggestions by rate code and description, none when ambiguous or absent, permissions, cross-direction and cross-project refusals, links kept through BOQ edits, issues to client contracts / other projects / rates without a subcontract refused, over-returns refused, returns at the issue rate, pending recovery 8 × ₹400, recover / no double recovery / manual edits keep recovery / remove / cancelled bill frees issues, vendor bill carries the recovery line, recovered vs pending on the contract, recovery refused on client bills, margin per item incl. rate margin and unlinked cost, margin restricted to finance view, audit), phases 1–3 re-run on the same database (71 + 63 + 73), and a headless-browser run (issue material to a subcontractor from the project's materials tab, recover it on their bill, link with a suggestion, margin tab with expandable rows, site engineer without Margin, phone layout).

> Verified 2026-10-24 (phase 3): 73 HTTP checks against MIPL's real RA Bill 04 workbook (converted from .numbers) and a BOQ in its abstract layout (header row under a title block, name-matched columns, layout saved and recognised, generic importer refusing billing layouts, add/skip/update, opening balance up to RA-03 so the next bill is RA-04 with previous quantities, MB tab chosen, sections, 50.4's deduction mismatch flagged, holds explained, steel and over-precise rows kept as the sheet's quantity, preview equals claim, re-import replaces, submitted bills refused, permissions, Excel with MIPL's own MB headings, audit), 9 parser unit tests on MIPL rows, phases 1 and 2 re-run (71 + 63), and a headless-browser run (BOQ upload → column matching → opening balance → import; RA-04 → MB recognised → sections → import; print view without app chrome; Excel download; site engineer imports measurements on a phone but can't import a BOQ).

> Verified 2026-10-24 (phase 2): 63 HTTP checks (payment terms and due dates, client invoice number, receivables and ageing totals, receipt permissions, part/over/future receipts, void and history, client and subcontract retention held/released/over-release, vendor bill = RA net with negative deduction lines, their bill number with fallback when already used, billing-raised bills not cancellable, full payment request → approval (maker-checker) → release marks the RA bill paid, retention release raises a vendor bill, finance notification, audit), 2 more unit tests (vendor bill total equals RA net to the paisa; ageing buckets), phase 1's 71 checks re-run, and a headless-browser run (certify → payment card → open in Finance with its source and no Cancel; release retention; record and void a client receipt; receivables on a phone).

> Verified 2026-10-24: 71 HTTP checks (permissions per role, client validation, contract party rules, BOQ duplicates and in-use protection, measurement maths incl. deductions and steel, totals with five tax/deduction lines, one open bill, locked submitted bills, certified ≤ claimed, held quantities, frozen rates after a rate revision, previous quantities on the next bill, over-BOQ flag, send back / cancel / close rules, subcontract maker-checker, list filters, notifications, audit, timeline), 5 unit tests for the billing maths, and a headless-browser run (finance creates a contract, pastes a BOQ, starts and measures a bill with a deduction, submits; the PM records certification with a hold; site engineer read-only on a phone with no horizontal scroll; procurement sees the restricted state).

### T22. Help center & product tour  `[x]`
- [x] Help button (`?`) in the header next to notifications, "Help & guides" in the account menu and the ⌘K palette (the palette also searches guide titles and keywords; its navigation now uses the real `/dashboard/...` routes)
- [x] Help center side drawer opening on the current page's module: searchable guides for Getting started, Projects, Daily Reports, Workforce & attendance, Materials & inventory, Procurement, Finance, Billing (contracts, BOQ import, RA bills, measurement book, MB import, abstract, certification, receivables, retention, material recovery, margin), Reports, AI and Settings
- [x] Guides written as short task-based steps, kept as typed files per module in `features/help/content/` (ADR-038)
- [ ] Screenshots or short clips in guides
- [x] Guides respect roles: modules and guides carry permissions (e.g. no "Certify or send back a bill" for site engineers, no Finance guides without `finance.view`)
- [x] Contextual "?" links on the bill abstract, BOQ and measurement book import reviews, column matching (data import and billing imports) and margin
- [x] Welcome tour on the first dashboard visit: spotlight with Next / Back / Skip covering modules (sidebar, or the menu on phones), ⌘K, notifications, help, New Project (if allowed) and the member's main module, chosen by permission
- [x] Mini tours the first time a member opens Projects, Daily Reports, Procurement, Materials, Inventory, Workforce, Finance, Billing and Reports; replayable from each guide ("Take the … tour")
- [x] Tour progress stored per member on the server (`help_progress`: completed / skipped per tour, follows them across devices); "Restart tours" in the help center
- [x] Getting-started checklist on the dashboard (invite your team, create a project, submit a daily report, record attendance, add a store, raise a PO, add a BOQ) ticked from real data, only the steps the member's role can do; dismissable and restorable from the help center
- [x] Accessible: Escape exits, arrow keys move, focus kept inside the tour card, reduced motion respected, full-width card on phones, steps for elements hidden at the current screen size skipped
- [x] Empty states link to the relevant guide (contracts, RA bills, purchase orders, vendor bills, workers)
- [ ] Later: AI "Ask SitePilot how to…" answering from the same guide content

> Verified 2026-10-24: migration on a fresh DB, 98 backend unit tests (route-permission and audit coverage include the new endpoints), 30 HTTP checks (validation of tour keys/statuses/extra fields, string "false" refused for the checklist, upsert without duplicates, restart one / all tours keeps the checklist dismissal, per-member isolation in the same org, checklist derived from seeded data and from a brand-new org as a project and invitation are added) and a 42-step headless-browser run (fresh owner: welcome tour with focus and every step, no replay after reload, checklist 0 of 7, help center on this page, search and no-results, guide → Billing tour on its page, arrow keys / Tab trap / Escape, skipped tour stays skipped, empty-state link, procurement tour spotlight, ⌘K guide search and navigation, dismiss / restore checklist from the account menu; site engineer on a 390px phone: menu step instead of sidebar, card clear of toasts, no horizontal scroll, header fits, role-filtered checklist and guides).

### T14. Background jobs  `[x]`
- [x] BullMQ + Redis queue module (`common/jobs`): `register` / `enqueue` / `every`, three attempts with exponential backoff, shared job scheduler for recurring jobs; runs in-process when `REDIS_URL` isn't set (ADR-035)
- [ ] Move other slow work onto the queue (notification emails, AI insight refresh, imports)

### T15. Notifications  `[x]`
- [x] Emit notifications from domain events: every audited action is published on an in-process event bus; rules turn them into notifications — PO submitted/approved/rejected/sent back, daily report submitted/approved/sent back, bill submitted/approved/rejected, payment requested/approved (+ "ready to release")/rejected/released, transfer requested/approved/rejected/received, role changed, added to a project. Approvers are found by permission (preferring the project team), and nobody is told about their own action
- [x] Fix WebSocket gateway secret (done in T5); rooms per organization + member; socket CORS uses the API's allowed origins; frontend socket client (`socket.io-client`) with toast + Open, 60 s polling fallback
- [x] Header bell: type icons by severity, relative timestamps, real unread count, click opens the linked page and marks it read, working "Mark all as read" (opening the bell no longer marks everything read)
- [x] Notification preferences: `GET/PUT /notifications/preferences`, per category (waiting for you / your requests / team / general) × in-app / email; Settings → Notifications tab; approvals are emailed by default. Replaced the unused legacy `notification_preferences` table
- [x] DTOs for list query, device registration and preferences (removed `any`)
- [ ] Email delivery depends on `RESEND_API_KEY` (stubbed to the log without it); push needs a real Firebase provider
- [ ] Notification centre page with history beyond the latest 20

> Verified 2026-10-24: migration on a fresh DB (matches the schema exactly), 34 unit tests, 21 HTTP/socket checks (live delivery, permission-based recipients, no self-notifications, preferences mute in-app, email routing, read state, isolation, transfer flow) and a headless-browser run (live toast while the app is open, bell → open link → marked read, preferences tab).

### T16. Reports  `[x]`
- [x] Real PDF / Excel generation (queued), stored in object storage, download button: branded PDF (logo, brand colour, ₹) and Excel workbook (one sheet per table), short-lived signed download links, in-app preview of the same content; polling while reports generate
- [x] Per-type report data for a chosen period and projects: Executive, Cost, Workforce, Schedule, Procurement, Inventory, Financial (finance access only), Safety
- [x] Scheduled reports executed by the queue, emailed to recipients: once-a-minute tick with claim-before-run, next run in the schedule's own time zone (DST-safe, missed runs skipped), recipients by role plus extra emails with files attached, delivery outcome on each schedule, Run now, edit, pause/resume
- [x] Optional AI summary at the top of a report (skipped when AI isn't available)
- [x] Local-disk storage driver with signed links for development (`STORAGE_DRIVER=local`)
- [ ] Real email delivery needs `RESEND_API_KEY` (stubbed to the log without it)

> Verified 2026-10-24: 11 new unit tests (time-zone/DST scheduling, missed runs, period rules, schedule health, issue parsing, renderers don't change stored content), 138 HTTP checks run against both Redis-queue and in-process modes (all 8 types produce valid PDF + Excel files with stored content, downloads save as attachments, project scope, period validation, finance-only visibility for reports, templates and downloads, schedule validation, run now → role-based emails with attachments, minute tick runs due schedules, one-off switches off, missed daily runs produce one report, pause/resume, edit re-times in the new zone, delete removes files, audit; no job fell back to in-process with Redis on), and a headless-browser run (generate with validation → ready without reload → download → preview and email deep link, edit and run a schedule, schedule from a template, phone layout with no horizontal scroll, site engineer read-only without financial reports).

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

### T18. Dashboard & demo cleanup  `[x]`
- [x] Real budget trend, pending approvals, workforce today: "Planned vs paid out" spreads each project's budget over its planned months against released payments (finance access only; others see the attendance trend); "Waiting for you" counts approvals by the member's permissions with maker-checker (own requests excluded) and links to each module; workforce today and the 7-day attendance trend come from marked attendance
- [x] Remove demo AI insights / weather / hardcoded org names: insights card shows the latest AI Command Center snapshot (members with `ai.use`), weather removed, header shows the organization's name, "+1 from last month" replaced by real counts, fake "Download Report" replaced by a link to Reports, New Project only for `project.create`
- [x] Delete unused `demo-store.ts` and `data/demo.ts` (`procurement-store.ts` was already gone); `docs/DEMO_MODE.md` now explains seeded demo data
- [x] Dashboard page split into `features/dashboard` components; charts lazy-loaded; loading, error and empty states
- [ ] `docs/PRODUCTION_INTEGRATION.md` is still out of date beyond the demo-mode step (repositories, bearer tokens)

> Verified 2026-10-24: 2 new unit tests (planned monthly burn, payments bucketed by paid month), 20 HTTP checks across owner / project manager / site engineer / finance (spend trend gated by finance access and matching released payments, queues per permission, own requests excluded, unattributed requests still counted, totals), and a headless-browser run (owner with queues and spend chart, queue link opens the module, site engineer sees attendance and nothing waiting without New Project, phone layout without horizontal scroll).

### T19. Tests  `[x]`
- [x] Backend service tests for daily reports, attendance, transfers and PO approvals. Kept on the existing `node:test` runner rather than adding Jest (one runner for unit and integration tests)
- [x] `npm run test:integration` runs the real services against Postgres (`TEST_DATABASE_URL`, migrated on start, refuses any database whose name lacks "test"); every file builds its own organization, so runs need no cleanup and can repeat on the same database
- [x] Covered: state machines, maker-checker, locked records, timelines/history, archived-project rules, organization isolation, and concurrent actions (two reviewers, two sites, double receive, two transfers competing for the same stock), each race repeated to catch timing
- [x] Bug found: two reviewers acting on the same daily report at once could both succeed (approve and reject both written, both on the timeline). Report transitions and draft edits now update only if the report is still in the expected status, like purchase orders
- [x] Bug found: two sites marking the same worker at the same moment both reported success while the worker stayed at only one site. Marking now verifies every record landed on this site inside the transaction and otherwise rolls back with a 409; a clash on the first record of the day returns a 409 instead of a 500
- [ ] Run the integration suite in CI (needs a Postgres service; there is no CI workflow yet)
- [ ] Extend service tests to finance (bills, payments) and billing (RA bills, certification)

> Verified 2026-10-24: 36 integration tests pass twice in a row on the same database (daily reports 9, attendance 10, transfers 8, purchase orders 9); both races failed before their fixes (daily-report review on attempt 1 of 30, attendance on attempt 2 of 15); 98 unit tests unchanged; the guard refuses the dev database `sitepilot` before connecting.
