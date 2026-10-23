# Architecture Decision Records (ADR)

> Product: SitePilot
>
> Version: 1.0
>
> Last Updated: July 2026

---

# Purpose

This document records important architectural decisions made throughout the development of SitePilot.

Every significant technical decision should answer:

- What decision was made?
- Why was it made?
- What alternatives were considered?
- What are the consequences?

The goal is to preserve engineering context for future developers and AI coding assistants.

---

# ADR-001 - Modular Monolith Architecture

**Status**

Accepted

**Date**

2026-07

---

## Context

SitePilot is a new SaaS product.

The MVP requires rapid iteration while maintaining clean architectural boundaries.

Microservices introduce deployment complexity, distributed debugging, and operational overhead that is not justified at the current scale.

---

## Decision

Adopt a **Modular Monolith Architecture**.

Each domain is implemented as an isolated NestJS module with clear boundaries.

Modules communicate through services rather than direct database access or controller-to-controller calls.

---

## Alternatives Considered

### Microservices

Pros

- Independent deployment
- Independent scaling

Cons

- Increased infrastructure complexity
- Distributed transactions
- Higher operational cost

Rejected for MVP.

---

### Traditional Monolith

Pros

- Simple deployment

Cons

- Risk of tightly coupled code
- Difficult long-term maintenance

Rejected.

---

## Consequences

Positive

- Faster development
- Easier onboarding
- Single deployment
- Clear module ownership

Negative

- Entire application deploys together
- Future extraction may require additional work

---

# ADR-002 - Next.js App Router

**Status**

Accepted

---

## Context

The frontend requires:

- Server rendering
- Fast navigation
- SEO readiness
- Modern React architecture

---

## Decision

Use **Next.js App Router**.

---

## Alternatives

React SPA

Rejected because:

- Less suitable for future marketing pages
- Limited server capabilities
- Less flexibility

---

## Consequences

Benefits

- Server Components
- Streaming
- Better routing
- Better performance

---

# ADR-003 - NestJS Backend

**Status**

Accepted

---

## Context

The backend requires:

- Strong architecture
- Dependency Injection
- Validation
- Guards
- Scalable module system

---

## Decision

Adopt NestJS.

---

## Alternatives

Express

Rejected because:

- Minimal structure
- Architecture enforced manually

FastAPI

Rejected because:

- Team expertise is primarily TypeScript
- Shared types become harder

---

## Consequences

Benefits

- Type safety
- Modular architecture
- Strong ecosystem

---

# ADR-004 - PostgreSQL

**Status**

Accepted

---

## Decision

Use PostgreSQL as the primary database.

---

## Alternatives

MongoDB

Rejected.

Construction ERP data is highly relational.

Relationships include:

Projects

↓

Purchase Orders

↓

Materials

↓

Invoices

↓

Payments

↓

Reports

PostgreSQL is a better fit.

---

# ADR-005 - Prisma ORM

**Status**

Accepted

---

## Decision

Prisma is the only ORM.

---

## Reasons

- Type-safe queries
- Excellent developer experience
- Strong migrations
- Great TypeScript support

Raw SQL should only be introduced for proven performance bottlenecks.

---

# ADR-006 - Multi-Tenant Database

**Status**

Accepted

---

## Decision

Use a **shared database with row-level tenant isolation**.

Every business entity references:

```
organizationId
```

All application queries must enforce organization filtering.

---

## Alternatives

Separate database per tenant.

Rejected.

Too much operational complexity for the target customer size.

---

## Consequences

Benefits

- Lower infrastructure cost
- Simpler backups
- Easier maintenance

Trade-off

Application code must rigorously enforce tenant isolation.

---

# ADR-007 - RBAC

**Status**

Accepted

---

## Decision

Permissions drive authorization.

Roles are collections of permissions.

Never hardcode authorization logic based solely on role names.

---

## Example

```
Role

↓

Permissions

↓

Endpoint Access
```

This allows organizations to define flexible role structures in future releases.

---

# ADR-008 - REST API

**Status**

Accepted

---

## Decision

Expose functionality through REST APIs.

---

## Alternatives

GraphQL

Rejected for MVP.

REST provides:

- Simpler debugging
- Better caching
- Easier onboarding
- Lower complexity

GraphQL may be reconsidered for public APIs in the future.

---

# ADR-009 - TanStack Query

**Status**

Accepted

---

## Decision

All server state is managed with TanStack Query.

Do not duplicate server state in Zustand.

---

## Rationale

Benefits

- Automatic caching
- Request deduplication
- Background refetching
- Optimistic updates
- Loading and error management

---

# ADR-010 - Zustand

**Status**

Accepted

---

## Decision

Use Zustand only for lightweight client-side state.

Examples

- Theme
- Sidebar
- Current Organization
- User Preferences

Do not store API data in Zustand.

---

# ADR-011 - S3-Compatible Object Storage

**Status**

Accepted

---

## Decision

Store uploaded files in S3-compatible object storage.

Supported providers include:

- AWS S3
- Cloudflare R2
- MinIO

The database stores metadata only.

---

# ADR-012 - Event-Driven Side Effects

**Status**

Accepted

---

## Decision

Business operations emit domain events.

Example

```
Purchase Approved

↓

PurchaseApprovedEvent

↓

Notification

↓

Audit Log

↓

Email

↓

Activity Timeline
```

Business logic should not directly trigger secondary effects.

---

# ADR-013 - AI Provider Abstraction

**Status**

Accepted

---

## Decision

Never call AI providers directly from feature modules.

Architecture

```
Feature

↓

Prompt Builder

↓

AI Service

↓

Provider Adapter

↓

LLM
```

This enables switching between:

- OpenAI
- Anthropic
- Gemini
- Ollama

without changing business logic.

---

# ADR-014 - Design System

**Status**

Accepted

---

## Decision

Every interface must use the shared design system.

Avoid page-specific styling wherever possible.

Reusable components take precedence over one-off implementations.

---

# ADR-015 - Authentication Strategy

**Status**

Accepted

---

## Decision

Use JWT Access Tokens with Refresh Tokens.

Recommendations

- Short-lived access tokens
- Rotating refresh tokens
- Secure HttpOnly cookies for web clients

---

# ADR-016 - Background Processing

**Status**

Accepted

---

## Decision

Long-running tasks should execute asynchronously.

Examples

- AI generation
- Report exports
- PDF generation
- Bulk emails
- Image processing

HTTP requests should return quickly and delegate heavy work to background workers.

---

# ADR-017 - Procurement Workflow

**Status**

Accepted

**Date**

2026-10-19

---

## Context

Procurement moved from demo data to real write flows: vendors, RFQs, purchase orders, deliveries and goods receipts.
Approvals and receipts carry financial weight, so the rules must hold regardless of which client calls the API.

---

## Decision

- Purchase orders follow `DRAFT → PENDING → APPROVED | REJECTED | CHANGES_REQUESTED`. Only drafts and orders sent back for changes are editable. Open orders can be cancelled until goods are received.
- The requester can't review their own order (segregation of duties). Rejections and change requests require a note.
- Awarding an RFQ creates a **draft** purchase order at the quoted rates. It still goes through normal approval.
- Goods are received against approved orders only, never beyond the outstanding quantity. Each receipt gets a GRN number.
- Totals, delivery status, overdue flags and vendor stats are derived on read, never stored.
- The backend is authoritative. The frontend mirrors these rules (`features/procurement/utils/order-rules.ts`) only to decide which actions to offer.

---

## Alternatives

- Letting the awarded RFQ auto-approve its purchase order: rejected, because it bypasses approval for the largest orders.
- Storing computed totals and statuses: rejected, because they drift whenever line items or receipts change.

---

## Consequences

- A single-user organization can't approve its own orders. A second member is needed to review.
- Receiving goods doesn't update inventory yet. Linking receipts to inventory stock is follow-up work.

---

# ADR-018 - Payables and Three-Way Match

**Status**

Accepted

**Date**

2026-10-20

---

## Context

Finance was read-only seeded data. Vendor bills weren't linked to vendors, purchase orders or receipts. "Overdue" was a stored status, and the vendor outstanding balance was a stored number that never changed.

---

## Decision

- Invoices are vendor bills (accounts payable): `DRAFT → PENDING_APPROVAL → APPROVED → PARTIALLY_PAID → PAID`, or `REJECTED` / `CANCELLED`. The bill number is unique per vendor.
- A bill may be raised against an approved purchase order. Its vendor and project come from the PO, and its lines may reference PO lines.
- **Three-way match** per line, computed on read: billed qty must not exceed received-but-unbilled qty, the rate must not exceed the PO's effective (post-discount) rate by more than 1%, and GST must match. A bill with a variance can still be approved, but only with a note explaining the override.
- Payments are requested against approved bills: `PENDING → APPROVED → PAID`. A payment can't exceed the bill's balance not already covered by pending, approved or paid payments; the invoice row is locked while checking. Marking a payment paid updates the bill's status in the same transaction.
- Maker-checker applies twice: whoever enters a bill can't approve it, and whoever requests a payment can't approve it.
- Overdue, balance due and vendor outstanding balance are derived, never stored (`vendors.outstandingBalance` was dropped).
- Invoice and payment history is written to the shared `Activity` feed against the invoice. No separate audit table.
- User-entered "can't be in the future" dates allow one day of slack. Dates are compared in UTC, but users ahead of UTC (India) enter them in local time.

---

## Alternatives

- Header-level matching (invoice total vs PO total): rejected, because it hides over-billing on one line behind under-billing on another.
- Blocking approval of mismatched bills: rejected. Price escalations and approved substitutions are normal in construction, so an explained override is more realistic than a hard stop.

---

## Consequences

- New payments always belong to an invoice. Older payments without one can still be approved and paid, but have no linked bill or history entry.
- Budgets (`spent`, `committed`) and the cash flow ledger are still entered data, not derived from POs and payments. Mapping PO categories to budget categories is follow-up work.

---

# ADR-019 - Permission-Based Access Control

**Status**

Accepted

**Date**

2026-10-20

---

## Context

Every endpoint checked only that the caller was signed in. Any member, including a viewer, could approve purchase orders, approve and release payments, or change organization settings. The role was read from the JWT, so role changes and removals took effect only when the token expired. Admins could also grant themselves or others the Owner role.

---

## Decision

- **Permissions, not roles, guard actions.** The catalogue (`Permission` in `@sitepilot/types`; labels and the role → permission map in `backend/src/common/permissions`) has one entry per business action: `po.approve`, `invoice.approve`, `payment.release`, `finance.view`, and so on. Code checks permissions; role names appear only in the map.
- **Reads are open, writes and money are not.** Any member can read operational data (projects, procurement, workforce, materials). Every write needs its own permission, and financial data (invoices, payments, budgets, cash flow, financial reports) needs `finance.view`.
- `@RequirePermission()` with `PermissionsGuard`. Class-level and route-level lists are combined, so the finance controllers carry `finance.view` and each write adds its own permission.
- **Role is looked up per request.** The JWT strategy reads the membership on every request, so a role change or removal applies immediately. `/auth/me` returns the current role and permissions, and the frontend hides actions with `useCan()` / `<Can>`.
- Status-dependent rules stay in services: only approvers can cancel an approved PO or invoice, or someone else's open one. Maker-checker still applies on top of permissions.
- Only owners can grant, change or remove the Owner role.
- A test (`npm test` in the backend) fails if any write endpoint lacks a route-level permission, or references a permission outside the catalogue.

---

## Alternatives

- Hardcoded role checks per endpoint: rejected, because they scatter business policy and make custom roles impossible later.
- Per-organization editable roles stored in the database: deferred. The map is a single data structure, so it can move to a table without touching guards or controllers.

---

## Consequences

- One extra membership lookup per authenticated request.
- Approval limits (e.g. a project manager approves POs up to ₹5L) aren't implemented yet. They'd sit beside the permission check in the approve services.
- Read access isn't scoped to project membership yet; any member reads all projects in the organization.

---

# ADR-020 - Receipts Post to Stock

**Status**

Accepted (resolves the inventory gap noted in ADR-017)

**Date**

2026-10-20

---

## Context

Goods receipts didn't touch inventory, so stock drifted from reality after every delivery. Stock is tracked at two levels: per store (`InventoryItem` + `InventoryTransaction`) and per material across the organization (`Material.quantity` + `MaterialMovement`, read by the Materials module). Stock adjustments updated only the store level. "Reorder" buttons only showed a toast.

---

## Decision

- **PO lines can link to a catalogue material** (`PoLineItem.materialId`), set when the PO is raised or on first receipt (the link is then saved on the line). Unlinked lines are services, hire or one-off items and never touch stock.
- **Units must match** (with common aliases: bag/Bags, cum/Cu.m, MT/tonnes). Mismatched units (MT vs kg) are refused instead of converted.
- **One stock ledger** (`StockLedgerService`) changes quantities. A receipt updates the store item, the material total, both movement logs and the material's moving-average cost (agreed rate after discount, excluding GST) in the GRN's transaction. Adjustments now also keep the material total in step. Invariant: `Material.quantity` = Σ store quantities.
- **Receiving store:** the chosen store, or the project's site store when it has exactly one; otherwise the user must choose. The GRN records the store (`Delivery.warehouseId`).
- **Reorder suggestion:** quantity = target level − available − open PO quantity (approved or awaiting approval), never negative. The target is the material maximum or twice the reorder level. Vendor and rate come from the last approved purchase. Reordering opens a prefilled draft PO; nothing is ordered without the normal approval.
- Procurement depends on Inventory, not the reverse. The reorder service reads PO tables but doesn't import the procurement module.

---

## Alternatives

- Converting between units (MT ↔ kg) automatically: rejected for now. Conversions need per-material factors (bag weight, density), and a wrong guess corrupts stock silently.
- Auto-linking existing PO lines to materials by name: rejected. Descriptions rarely match catalogue names exactly, so a wrong link would post stock to the wrong item.

---

## Consequences

- Existing PO lines are unlinked until their first receipt asks for the material.
- Direct edits to `Material.quantity` through the Materials form can still break the invariant. Stock changes should go through receipts, transfers and adjustments.
- The material and receipt pickers list up to 100 materials; larger catalogues will need a searchable picker.

---

# ADR-021 - Material Issues to Project Sites

**Status**

Accepted (closes the Material.quantity consequence of ADR-020)

**Date**

2026-10-23

---

## Context

Stock arrived through GRNs but never left a store except through transfers and adjustments, so project consumption (`MaterialProjectUsage.consumed`) was seed data only. The Materials form could still edit `quantity`, `reserved` and `incoming` directly, and stored a free-text warehouse name that didn't match the real stores.

---

## Decision

- **Issue and return notes.** Stock leaves a store for a site on a numbered Material Issue Note (`MIN-0001`) and comes back on a Material Return Note (`MRN-0001`), both stored as `MaterialIssue` with the store, project, quantity, carrying cost at the time, and who recorded it. Numbers are unique per organization and retried on a clash, like PO numbers.
- **Through the ledger.** `StockLedgerService.issueToProject` / `returnFromProject` update the store item, the material total, both movement logs and the project's consumed quantity in one transaction. The availability check (`quantity − reserved ≥ issue`) and the decrement are one SQL statement, so concurrent issues can't overdraw a store. A project can't return more than it has been issued.
- **Consumption means issued to site.** `MaterialProjectUsage.consumed` is the net quantity issued minus returned. `allocated` is the planned quantity (e.g. from the BOQ), set per project and material.
- **Catalogue edits don't touch stock.** The Materials form no longer accepts quantity fields or a warehouse name. Per-store stock is read from inventory items, and opening stock is recorded as a count adjustment at a store.
- **Archive, not delete.** Only materials with no stock on hand and nothing incoming can be archived. The SKU stays reserved so history remains traceable.
- New permission `material.issue` (project managers and store managers). Setting the plan needs `project.update`.

---

## Alternatives

- Issuing without a document, as a plain movement: rejected. Sites and auditors reconcile against numbered issue slips, and the note records who handed the material out.
- Valuing project consumption from issue notes rather than current cost: deferred. Seeded and historical consumption has no notes, so the project tab values consumption at the current moving-average cost. Each note still stores its own cost for later reporting.

---

## Consequences

- Material requests (site asks, store approves, then issues) aren't modelled. Issues are recorded directly by someone with `material.issue`.
- `Material.warehouse` is unused and can be dropped in a later migration.

---

# ADR-022 - Store Transfers and Adjustments Through the Ledger

**Status**

Accepted (extends ADR-020 and ADR-021)

**Date**

2026-10-23

---

## Context

Stock transfers could be completed straight from PENDING, the availability check ran before the transaction, and requester, approver and adjuster names were free text sent by the client. Stores and bin locations could only be created by seeding. Damaged stock was subtracted from availability twice: the adjustment already removed it from `quantity`.

---

## Decision

- **Transfer lifecycle:** PENDING → APPROVED → COMPLETED, with REJECTED (note required) or CANCELLED (requester only) before stock moves. The requester can never approve or reject their own transfer. Each step is a conditional update, so two people acting at once can't both win.
- **Stock moves on receipt** through `StockLedgerService.transferBetweenStores`, sharing the single-statement availability check with material issues. If the origin store no longer has the stock, receiving fails and the transfer stays approved.
- **Adjustments lock the store row** (`SELECT … FOR UPDATE`) so the before/after quantities match what was counted. Damage and loss can only reduce stock.
- **Actors are users, not text:** `requestedById`, `approvedById`, `completedById` and `adjustedById` come from the signed-in user. The migration attributes existing rows to the organization's owner, because the old free-text names can't be matched to users reliably.
- **Available = quantity − reserved.** `damaged` only records how much was written off.
- **Store setup** (stores and bins) needs the new `warehouse.manage` permission. Store codes are unique per organization (archived stores keep theirs) and bin codes are unique per store. Only empty stores with no open transfers or deliveries can be archived. Removing a bin unassigns its items without touching their stock.
- Transfer and adjustment numbers use the shared `nextDocumentNumber` + retry-on-clash pattern.

---

## Alternatives

- A separate "dispatch" step (IN_TRANSIT) between approval and receipt: deferred. Most site transfers move the same day; the status remains in the enum for when vehicle tracking is needed.
- Keeping the free-text actor columns next to the new foreign keys: rejected. They were unverified client input and would drift from the real actor.

---

## Consequences

- Transfers aren't linked to a project timeline yet. They will be covered by the audit log (T8).
- Stock reservations (`reserved`) are still only written by seed data.

---

# ADR-023 - Cookie Sessions and Token Hardening

**Status**

Accepted

**Date**

2026-10-23

---

## Context

Access and refresh tokens were returned in response bodies and kept in localStorage, where any injected script could read them. Both were signed with one secret read from `JWT_SECRET`, which has a hard-coded fallback. Docker-compose sets only `JWT_ACCESS_SECRET`, so deployments were signing with the fallback. Tokens had no unique id: two logins in the same second produced identical refresh tokens and failed on the unique index. Refresh tokens were stored in plain text, logout wasn't reachable from the UI, and there was no password reset.

---

## Decision

- **HttpOnly cookies.** `access_token` (15 min, path `/`), `refresh_token` (7 days, path `/api/auth` only) and `sp_session`, a flag with no secret. It lets the Next.js middleware gate pages while the access cookie is being refreshed. Cookies are `SameSite=Lax`, `Secure` when `COOKIE_SECURE=true`, and shared across subdomains through `COOKIE_DOMAIN`. Tokens never appear in response bodies. A Bearer header is still accepted for API clients and Swagger.
- **Two secrets, no fallback.** `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must both be set, differ, and be at least 32 characters, or the API won't start. Tokens carry `type` and a random `jti`.
- **Refresh tokens** are stored as SHA-256 hashes and rotated on every refresh. Presenting an already-rotated token revokes every session of that user, since it means the token was copied. Refresh also re-checks membership and account status.
- **Password reset** uses single-use random links (stored hashed) that expire after an hour. The request endpoint answers identically whether or not the email exists and returns before sending. A successful reset ends all sessions.
- **Rate limiting:** login, register, forgot and reset are limited to 10 per minute per IP. A global limit is deferred until production sets `TRUST_PROXY`; otherwise every user behind the proxy would share one counter.
- The notifications WebSocket verifies the access cookie with the same service. It previously had no secret configured and rejected every connection.

---

## Alternatives

- Keeping tokens in memory and using a refresh cookie only: rejected for now. Every page load would need a refresh round trip, and the Next.js middleware still needs a cookie to gate routes.
- CSRF tokens: not added. `SameSite=Lax` cookies aren't sent on cross-site POST/PATCH/DELETE, the API only accepts JSON bodies, and CORS is limited to configured origins. Revisit if a cross-site embed or form post is ever needed.

---

## Consequences

- Existing refresh tokens were deleted by the migration (they were stored in plain text), so everyone signs in once after deploying.
- Frontend and API must share a registrable domain (e.g. `app.grovyn.in` and `api.grovyn.in` with `COOKIE_DOMAIN=.grovyn.in`) for the middleware to see the session cookie.

---

# ADR-024 - Declarative, Append-Only Audit Log

**Status**

Accepted

**Date**

2026-10-23

---

## Context

The handbook requires an immutable audit log (actor, action, timestamp, metadata) for every important action. There are close to a hundred write endpoints across modules, and adding hand-written audit calls to each service would be easy to forget and hard to keep consistent.

---

## Decision

- **Declared at the endpoint.** Every write route carries `@Audit('<action>')`, where the action comes from a typed catalogue (`common/audit/audit-actions.ts`) that also holds its readable label and entity type. A global `AuditInterceptor` writes the entry after the handler succeeds. Failed or rejected requests changed nothing, so they aren't recorded.
- **Enforced by a test.** Like route permissions, a unit test fails when a write endpoint has neither an `@Audit` action nor an entry on the short exemption list (token refresh, logout, forgot-password, personal notification actions).
- **What is stored:** actor id and a name snapshot (no foreign key, so entries outlive users), organization, entity type and id (route param or the response's id), project id, the request input with passwords, tokens and secrets redacted and size-capped, IP and user agent.
- **Append-only in the database.** A trigger rejects UPDATE, DELETE and TRUNCATE on `audit_logs`, and the API has only a read endpoint. Corrections are new entries.
- Events with no signed-in request, like a password reset, are recorded from their service through `AuditService`.
- Reading requires the new `audit.view` permission (owners and admins).

---

## Alternatives

- Calling `AuditService` inside each service's transaction: rejected as the default. It would be atomic with the change, but it means ~90 hand-written calls and no reliable way to notice a missing one. Services can still call it directly when an event has no endpoint.
- Prisma middleware on every write: rejected. It sees table rows, not business actions, so "approved a purchase order" would appear as several updates with no actor.

---

## Consequences

- The entry is written just after the change commits. If that write fails, the error is logged and the request still succeeds, so a crash in that gap can lose an entry.
- Entries record what was requested (the redacted input), not a before/after diff. Diffs can be added per action later if auditors need them.
- `ON UPDATE CASCADE` on the organization foreign key would be blocked by the trigger. Organization ids never change, so this is acceptable.

---

# Future ADRs

Future architectural decisions should be recorded here.

Examples:

- WebSocket introduction
- Event bus adoption
- Elasticsearch integration
- Public API strategy
- Mobile synchronization
- Offline support
- Multi-region deployment
- Plugin system
- Workflow engine
- AI agent framework

---

# ADR Guidelines

Every new ADR should include:

- Title
- Status
- Date
- Context
- Decision
- Alternatives
- Consequences

Never overwrite historical decisions.

If a decision changes:

- Mark the previous ADR as **Superseded**
- Create a new ADR referencing the old one
- Explain why the change was made

This preserves the architectural history of the project and helps future contributors understand the evolution of SitePilot.