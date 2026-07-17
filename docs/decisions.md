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

# ADR-001 — Modular Monolith Architecture

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

# ADR-002 — Next.js App Router

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

# ADR-003 — NestJS Backend

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

# ADR-004 — PostgreSQL

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

# ADR-005 — Prisma ORM

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

# ADR-006 — Multi-Tenant Database

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

# ADR-007 — RBAC

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

# ADR-008 — REST API

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

# ADR-009 — TanStack Query

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

# ADR-010 — Zustand

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

# ADR-011 — S3-Compatible Object Storage

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

# ADR-012 — Event-Driven Side Effects

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

# ADR-013 — AI Provider Abstraction

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

# ADR-014 — Design System

**Status**

Accepted

---

## Decision

Every interface must use the shared design system.

Avoid page-specific styling wherever possible.

Reusable components take precedence over one-off implementations.

---

# ADR-015 — Authentication Strategy

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

# ADR-016 — Background Processing

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