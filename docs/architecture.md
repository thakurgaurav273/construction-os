# Architecture

> Product: SitePilot
>
> Version: MVP
>
> Last Updated: July 2026

---

# Overview

SitePilot is built as a modern modular SaaS platform.

The architecture prioritizes

- Simplicity
- Maintainability
- Scalability
- Type Safety
- AI Assisted Development

Instead of adopting microservices from day one, SitePilot follows a **Modular Monolith Architecture**.

This provides the development speed of a monolith while keeping clear module boundaries that can evolve into services in the future if required.

---

# Architecture Goals

The architecture should satisfy the following principles.

✓ Easy for new developers to understand

✓ Easy for AI to navigate

✓ Strong module isolation

✓ Clear separation of responsibilities

✓ Multi-tenant by default

✓ Type-safe end-to-end

✓ Replaceable infrastructure

✓ Cloud-native

---

# High Level Architecture

```

┌──────────────────────────────────────────┐
│ Browser │
└──────────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────┐
│ Next.js Frontend │
│ React │
│ Tailwind │
│ TanStack Query │
└──────────────────────────────────────────┘
│
REST API
│
▼
┌──────────────────────────────────────────┐
│ NestJS Backend │
│ │
│ Authentication │
│ Projects │
│ Workforce │
│ Procurement │
│ Inventory │
│ Finance │
│ Reports │
│ AI │
└──────────────────────────────────────────┘
│
├──────────────┬───────────────┬─────────────┐
│ │ │
▼ ▼ ▼

PostgreSQL Redis S3 Storage

```

---

# Why Modular Monolith?

Microservices introduce

- network complexity
- deployment complexity
- debugging complexity
- duplicated code

The MVP does not need those tradeoffs.

Instead,

each module behaves like its own service while sharing a deployment.

If a module needs to become a microservice later,

it should require minimal refactoring.

---

# Core Modules

Authentication

Organization

Projects

Workforce

Inventory

Materials

Vendors

Procurement

Finance

Reports

Notifications

Files

AI

Settings

Every module owns

- APIs
- Business Logic
- Validation
- Events
- Database Access

---

# Request Flow

Every request follows exactly the same lifecycle.

```

Client

↓

Middleware

↓

Authentication

↓

Authorization

↓

Validation

↓

Controller

↓

Service

↓

Repository

↓

Prisma

↓

Database

↓

Response

```

Controllers never perform business logic.

Repositories never make business decisions.

---

# Layer Responsibilities

## Controller

Responsible for

- HTTP
- DTO Validation
- Authorization
- Response

Never

- Query Prisma
- Calculate Business Rules
- Send Emails

---

## Service

Responsible for

Business Logic.

Examples

Create Project

Assign Employee

Generate Daily Report

Approve Purchase Order

Budget Calculations

Everything important belongs here.

---

## Repository

Responsible for

Database Access.

Examples

findById()

create()

update()

delete()

exists()

No business logic.

---

# Folder Structure

```

apps/

frontend/

backend/

docs/

packages/

ui/

shared/

config/

types/

utils/

```

---

Frontend

```

src/

app/

features/

components/

hooks/

providers/

services/

lib/

styles/

types/

```

---

Backend

```

src/

modules/

common/

config/

database/

ai/

storage/

auth/

```

Every feature should remain self-contained.

---

# Module Structure

```

projects/

controllers/

services/

repositories/

dto/

validators/

events/

entities/

types/

constants/

```

No giant shared folders.

Each module owns itself.

---

# Frontend Architecture

The frontend uses

Next.js App Router

Feature-based organization.

```

features/

projects/

dashboard/

inventory/

vendors/

```

Each feature owns

components

hooks

api

types

validation

utils

Avoid shared feature logic.

---

# State Management

Three categories exist.

## Local UI State

React

Examples

Dialog

Tabs

Search Input

---

## Server State

TanStack Query

Everything coming from the backend belongs here.

Never duplicate server data in Zustand.

---

## Global State

Only for

Current User

Organization

Theme

Sidebar

Preferences

Nothing else.

---

# Routing

App Router

```

dashboard/

projects/

projects/[id]/

inventory/

vendors/

reports/

settings/

```

Keep routing shallow.

---

# Backend Architecture

NestJS Modules.

Every feature becomes one module.

```

ProjectsModule

InventoryModule

ProcurementModule

FinanceModule

```

Modules communicate through services.

Never through controllers.

---

# Multi-Tenancy

Every business record belongs to exactly one Organization.

```

Organization

↓

Projects

↓

Materials

↓

Purchase Orders

↓

Invoices

↓

Reports

```

Organization isolation is mandatory.

No query should ever return another organization's data.

---

# Authentication

JWT

↓

Access Token

↓

Refresh Token

↓

Current User

↓

Organization

↓

Permissions

Authentication should be centralized.

---

# Authorization

Every request validates

Authentication

↓

Organization

↓

Permission

↓

Ownership (if required)

Roles should never contain business logic.

Permissions drive authorization.

---

# Database Architecture

Single PostgreSQL database.

Every entity references

Organization

User

Timestamps

Soft Delete (where required)

Prisma is the only ORM.

Never write raw SQL unless performance requires it.

---

# Storage

Object Storage.

Compatible with

- AWS S3
- Cloudflare R2
- MinIO

Only metadata is stored inside PostgreSQL.

Files are never stored inside the database.

---

# Caching

Redis handles

Dashboard Cache

Sessions

Queues

Rate Limiting

Configuration Cache

Never use Redis as the primary database.

---

# Event Driven Architecture

Important business actions emit events.

Example

```

Purchase Approved

↓

PurchaseApprovedEvent

↓

Notification

↓

Email

↓

Activity Log

↓

Audit Log

```

Business logic should not directly send notifications.

---

# AI Architecture

Every AI capability follows one pipeline.

```

Feature

↓

Prompt Builder

↓

AI Service

↓

Provider Adapter

↓

OpenAI

Claude

Gemini

Ollama

↓

Structured Response

```

Features never call providers directly.

Changing providers should require changing only one adapter.

---

# Background Jobs

Long-running operations should use queues.

Examples

PDF Generation

Report Export

Image Processing

AI Analysis

Bulk Emails

Document Parsing

Never block HTTP requests.

---

# Security

Always

Validate

Authorize

Log

Audit

Rate Limit

Encrypt

Sanitize

Never trust client input.

---

# Scalability

The architecture should scale horizontally.

Future additions

Worker Services

Realtime Gateway

Search Service

Analytics Service

Mobile API

Client Portal

These additions should not require rewriting existing modules.

---

# Non Functional Requirements

Availability

99.9%

API Response

<300ms average

Dashboard Load

<2 seconds

Authentication

<500ms

File Upload

Background Processing

The system should remain responsive under load.

---

# Architectural Principles

Every architectural decision should satisfy

Simple

Predictable

Maintainable

Reusable

Observable

Secure

Scalable

If two approaches are equally powerful,

always choose the simpler one.