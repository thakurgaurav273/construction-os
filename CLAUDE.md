## Current Project Status

Phase: MVP

Current Sprint:
- Authentication
- Organizations
- Dashboard
- Projects

Completed:
- None

Next Module:
- Workforce

Last Updated:
2026-07-17

# CLAUDE.md

> Engineering handbook for SitePilot.
>
> This document defines how AI agents Claude Code, Gemini CLI, Codex, Cursor,
> developers and contributors should think while building this project.
>
> Every implementation must follow these standards.
>
> This document is the source of truth.

---


# SitePilot Development Rules

## Never do

- Re-read documentation unless explicitly asked.
- Audit the entire repository.
- Refactor unrelated modules.
- Rename working components.
- Move folders.
- Change the design system.
- Replace working implementations.

## Always do

- Reuse existing components.
- Match existing UI exactly.
- Match Workforce architecture.
- Match Procurement architecture.
- Use existing hooks.
- Use existing Zustand stores.
- Use existing Tailwind tokens.
- Use existing loading skeleton pattern.
- Keep changes localized.

## Verification

Always run:

pnpm typecheck
pnpm lint
pnpm build

Only fix errors introduced by your changes.

# Project

SitePilot

AI Native Construction ERP

---

# Vision

SitePilot is a modern Construction ERP built for contractors, developers,
builders, EPC companies and infrastructure firms.

The objective is not to recreate legacy ERP software.

The objective is to build a system that people actually enjoy using.

The product should feel as polished as Linear, Notion, Stripe Dashboard and
Vercel while solving construction-specific workflows.

---

# Mission

Every feature must satisfy three goals.

1. Easy to understand
2. Easy to maintain
3. Easy to extend

Never sacrifice maintainability for short-term speed.

Prefer simplicity over cleverness.

The codebase should remain understandable after years of development.

---

# Product Philosophy

SitePilot is designed around these principles.

• Modern UI

Avoid ERP-style clutter.

Every screen should feel spacious.

Use progressive disclosure instead of showing every option.

---

• Fast

Pages should feel instant.

Optimistic updates where appropriate.

Skeleton loaders instead of spinners.

Avoid unnecessary refreshes.

---

• AI First

AI is not a separate module.

AI assists every workflow.

Examples

- Generate Daily Reports
- Summarize Meetings
- Suggest Purchase Orders
- Detect Project Delays
- Explain Cost Variance
- Answer Project Questions

---

• Enterprise Ready

The MVP should already support

- Multi Tenancy
- RBAC
- Audit Logs
- Attachments
- Activity Timeline
- Notifications

Never design features assuming only one company.

---

# Technology Stack

## Frontend

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod

---

## Backend

- NestJS

Architecture

- Modules
- Services
- Controllers
- DTOs
- Guards
- Interceptors

---

## Database

- PostgreSQL

ORM

- Prisma

---

## Storage

S3 Compatible Storage

Examples

- MinIO
- AWS S3
- Cloudflare R2

Storage should always be abstracted.

Never directly couple business logic to a storage provider.

---

## Cache

Redis

Use Redis only for

- caching
- sessions
- queues
- temporary data

Never use Redis as the source of truth.

---

## Authentication

JWT

Refresh Tokens

Role Based Access Control

Organization Based Access

---

## AI

Always use an abstraction layer.

Never call OpenAI directly from feature code.

Preferred architecture

Feature

↓

AI Service

↓

Provider Adapter

↓

OpenAI
Claude
Gemini
Ollama

Changing providers should require changing only one place.

---

# Engineering Philosophy

Every line of code should make the project easier to evolve.

Avoid code that only solves today's problem.

Design for future requirements without overengineering.

---

Good abstraction

Bad abstraction

Good abstraction

Bad abstraction

The simplest solution that remains scalable wins.

---

# Repository Structure

The repository should remain feature based.

Example

apps/

frontend/

backend/

packages/

ui/

shared/

config/

types/

utils/

docs/

Never organize code by file type alone.

Avoid

components/

pages/

hooks/

utils/

containing unrelated features.

Instead

features/

projects/

dashboard/

materials/

vendors/

billing/

Each feature owns

- components
- hooks
- api
- validation
- types
- utilities

---

# Coding Standards

Always prioritize readability.

Write code that another engineer understands in seconds.

Avoid clever tricks.

---

Prefer

```ts
const activeProjects = projects.filter(...)
```

instead of

```ts
const x = p.filter(...)
```

Variable names must explain intent.

---

Function names

Good

createProject()

archiveProject()

calculateProjectCost()

generateDailyReport()

Bad

run()

execute()

handle()

doStuff()

process()

---

Maximum file sizes

Components

250 lines preferred

400 absolute maximum

---

Hooks

150 lines preferred

---

Services

300 lines preferred

---

Controllers

Should remain thin.

Controllers only

- validate
- authorize
- delegate

Business logic belongs in services.

---

Never duplicate business logic.

If logic appears twice

extract it.

---

# TypeScript Rules

Never use

```ts
any
```

Never.

Use

- interfaces
- types
- generics
- discriminated unions

Prefer explicit types over inference in public APIs.

Every exported function should have explicit return types.

Example

```ts
export async function createProject(): Promise<Project>
```

not

```ts
export async function createProject() {
```

Avoid type assertions.

Avoid

```ts
as any

as unknown

as Something
```

unless absolutely necessary.

---

# Comments

Code should explain itself.

Do not comment obvious things.

Avoid

```ts
// increment counter
counter++;
```

Write comments only when explaining

- architecture
- reasoning
- tradeoffs
- business rules

# Frontend Architecture

The frontend should feel like a premium SaaS product.

Reference products

- Linear
- Vercel
- Notion
- Stripe Dashboard
- GitHub

Avoid traditional ERP interfaces.

---

# Design Principles

Every screen should satisfy the following.

Simple

Minimal

Consistent

Fast

Accessible

Responsive

Professional

Do not design pages with dozens of buttons and actions.

Primary actions should always be obvious.

Secondary actions should be visually lighter.

---

# Layout

Application Layout

```
┌───────────────────────────────────────────┐
│ Header                                    │
├──────────────┬────────────────────────────┤
│ Sidebar      │                            │
│              │ Content                    │
│              │                            │
│              │                            │
└──────────────┴────────────────────────────┘
```

Rules

Sidebar width should remain consistent.

Content width should not exceed readability limits.

Avoid edge-to-edge content.

Maintain generous spacing.

---

# Page Structure

Every page follows the same hierarchy.

Title

↓

Description

↓

Primary Actions

↓

Filters

↓

Content

↓

Pagination

Example

Projects

Project List

New Project

Search

Status Filter

Projects Table

Pagination

Consistency matters more than creativity.

---

# Components

Always reuse components.

Never create duplicate implementations.

Preferred structure

```
packages/ui

Button

Input

Select

Badge

Dialog

Drawer

Table

Card

Avatar

Empty State

Loading

Toast

Tabs

Date Picker
```

Never implement these separately inside features.

---

# Feature Components

Feature-specific components belong inside the feature.

Example

```
features/projects/components

ProjectCard

ProjectStatusBadge

ProjectTimeline

ProjectMembers

ProjectStatistics
```

Shared UI belongs in packages/ui.

Business UI belongs inside features.

---

# Component Rules

Components should have a single responsibility.

Bad

```
ProjectDashboardComponent
```

containing

- table
- charts
- filters
- dialogs
- sidebar
- cards

Good

```
ProjectTable

ProjectFilters

ProjectChart

ProjectMembers

ProjectOverviewCard
```

Small components are easier to test and reuse.

---

# Props

Keep props small.

Bad

```tsx
<Component
    project={project}
    company={company}
    organization={organization}
    permissions={permissions}
    user={user}
    notifications={notifications}
/>
```

Good

```tsx
<ProjectCard
    project={project}
/>
```

Avoid prop drilling.

Prefer composition.

---

# State Management

Local UI State

Use React state.

Examples

- Dialog open
- Current tab
- Search input

---

Server State

Always use TanStack Query.

Never manually fetch data inside components.

Bad

```tsx
useEffect(() => {
 fetch(...)
}, [])
```

Good

```tsx
const { data } = useProjects()
```

---

Global State

Use Zustand only when necessary.

Examples

- Current Organization
- Theme
- Sidebar
- User Preferences

Do not store server data in Zustand.

---

# Forms

Every form must use

React Hook Form

+

Zod

Never use uncontrolled forms.

Validation belongs inside schemas.

Good

```
ProjectSchema

CreateProjectSchema

UpdateProjectSchema
```

Avoid validation directly inside components.

---

Form Layout

Title

↓

Description

↓

Fields

↓

Primary Button

↓

Secondary Button

↓

Validation Errors

Forms should always support keyboard navigation.

---

# Tables

Use a shared table component.

Every table should support

- Sorting
- Search
- Pagination
- Loading
- Empty State
- Error State
- Row Selection (when required)

Avoid custom implementations.

---

Example

Projects

Search

Status Filter

Date Filter

↓

Table

↓

Pagination

↓

Bulk Actions

---

# Cards

Cards should remain lightweight.

Maximum

Title

Subtitle

Key Metrics

Actions

Avoid putting entire workflows inside cards.

---

# Dialogs

Dialogs should only perform focused actions.

Examples

Create Project

Invite Member

Delete Material

Assign Engineer

Avoid multi-step workflows inside dialogs.

Use dedicated pages instead.

---

# Drawers

Use drawers for

Quick editing

Quick viewing

Notes

Comments

Small forms

Use full pages for complex workflows.

---

# Empty States

Every empty state should answer

Why is this empty?

What can the user do next?

Example

No Projects Found

Create your first project to begin managing construction work.

[ Create Project ]

Avoid blank screens.

---

# Loading States

Never show blank pages while loading.

Preferred

Skeletons

Placeholder cards

Placeholder tables

Avoid spinners unless unavoidable.

---

# Error States

Every failed request must provide

What happened

Why

Recovery action

Example

Unable to load projects.

Retry

Instead of

Something went wrong.

---

# Navigation

Sidebar should contain only primary navigation.

Dashboard

Projects

Materials

Workforce

Procurement

Inventory

Finance

Reports

Settings

Avoid nested menus deeper than two levels.

---

# Search

Search should be available globally.

Users should be able to quickly locate

Projects

Materials

Purchase Orders

Employees

Vendors

Reports

Future AI search should reuse this architecture.

---

# Icons

Use a single icon library.

Recommended

Lucide

Do not mix icon libraries.

Maintain consistent sizing.

---

# Responsive Design

Desktop first

Tablet supported

Mobile usable

Tables should become cards on smaller screens where appropriate.

Avoid horizontal scrolling whenever possible.

---

# Accessibility

Every interactive element must support

Keyboard navigation

Focus states

ARIA labels where required

Visible hover states

Proper color contrast

Accessibility is not optional.

---

# Animations

Animations should be subtle.

Use animations only to improve usability.

Examples

Fade

Slide

Scale

Avoid flashy animations.

Prefer motion under 200ms.

---

# Performance

Lazy load heavy routes.

Lazy load charts.

Lazy load editors.

Virtualize large tables.

Avoid unnecessary re-renders.

Profile expensive components before optimizing.

Performance should be measured, not guessed.
# Backend Architecture

The backend follows a modular monolith architecture.

The goal is to maximize maintainability while keeping deployment simple.

Do not introduce microservices unless a clear scaling requirement exists.

---

# Core Principles

Every module should be:

- Independent
- Testable
- Reusable
- Easy to understand

Business logic should never depend on controllers.

Controllers should only expose APIs.

Services should implement business rules.

Repositories should only access data.

---

# Standard Module Structure

Every feature should follow this structure.

```
modules/

projects/
│
├── controllers/
├── services/
├── repositories/
├── dto/
├── entities/
├── guards/
├── validators/
├── events/
├── types/
├── constants/
├── project.module.ts
```

Every module should own everything related to itself.

Avoid giant shared folders.

---

# Dependency Rules

Allowed

```
Controller

↓

Service

↓

Repository

↓

Prisma
```

Not Allowed

```
Controller

↓

Prisma
```

or

```
Controller

↓

Another Controller
```

Controllers should never communicate.

Modules communicate through services.

---

# Controller Standards

Controllers are responsible for

- Validation
- Authentication
- Authorization
- Calling services
- Returning responses

Nothing else.

Bad

```ts
@Post()
async create() {
    // business logic
    // prisma
    // validation
    // notifications
}
```

Good

```ts
@Post()
async create(
    dto: CreateProjectDto
) {
    return this.projectService.create(dto);
}
```

---

# Service Standards

Services contain

Business Logic

Everything important belongs here.

Examples

Project Creation

Permission Validation

Calculations

Notifications

AI Calls

File Processing

Activity Logs

Never duplicate service logic.

---

# Repository Layer

Repositories only communicate with Prisma.

Never place business logic inside repositories.

Good

```
findById()

findMany()

create()

update()

delete()

exists()
```

Bad

```
createProjectAndNotify()

calculateCost()

assignEngineer()
```

Repositories fetch data.

Services make decisions.

---

# DTO Standards

Every endpoint must have DTOs.

Example

```
CreateProjectDto

UpdateProjectDto

ArchiveProjectDto

AssignEngineerDto
```

Never use raw request bodies.

All DTOs must use validation decorators.

Example

```ts
@IsString()

@IsUUID()

@IsOptional()

@IsBoolean()
```

Validation belongs here.

---

# API Design

REST First

Examples

```
GET

/projects

POST

/projects

PATCH

/projects/:id

DELETE

/projects/:id
```

Avoid verbs.

Bad

```
/createProject

/updateProject

/deleteProject
```

---

# API Responses

Every successful response should follow one structure.

```json
{
  "success": true,
  "message": "Project created successfully.",
  "data": {}
}
```

Errors

```json
{
  "success": false,
  "message": "Project not found.",
  "errors": []
}
```

Keep responses predictable.

---

# Pagination

Every list endpoint supports

```
page

limit

search

sort

order
```

Return

```json
{
    "items": [],
    "total": 250,
    "page": 2,
    "limit": 20
}
```

---

# Filtering

Filtering should be extensible.

Example

Projects

Status

Engineer

Client

Date

Priority

Organization

Filters should be composable.

---

# Authentication

JWT Access Token

JWT Refresh Token

Access tokens remain short lived.

Refresh tokens should be revocable.

Never store JWTs inside localStorage.

Prefer secure HttpOnly cookies where applicable.

---

# Authorization

Every endpoint must check

Authentication

↓

Organization

↓

Role

↓

Permission

↓

Ownership (if applicable)

Example

```
Organization

↓

Project

↓

Daily Report

↓

Attachment
```

Users should never access resources outside their organization.

---

# Multi-Tenancy

Every record belongs to an Organization.

Examples

Project

Material

Vendor

Employee

Purchase Order

Invoice

Every database query must include organization filtering.

Never trust client-provided organization IDs.

Always derive organization from the authenticated context.

---

# Permissions

RBAC should be permission-based.

Avoid hardcoding roles.

Example

```
Projects

Create

Read

Update

Delete

Archive

Approve

Export
```

Roles become collections of permissions.

---

# Audit Logs

Every important action should create an audit log.

Examples

Project Created

Project Updated

Vendor Deleted

Purchase Approved

Material Issued

Daily Report Submitted

Store

Actor

Action

Timestamp

Metadata

Audit logs should be immutable.

---

# Activity Timeline

Every module should expose activity history.

Example

Project

↓

Created

↓

Engineer Assigned

↓

Material Issued

↓

Daily Report Submitted

↓

Completed

Activity should be chronological.

---

# File Uploads

Never store files in PostgreSQL.

Store only

Name

Type

Size

URL

Storage Key

Uploader

Organization

Files live in object storage.

---

# Notifications

Notifications should be event-driven.

Example

Purchase Order Approved

↓

Notification Event

↓

Email

↓

In-App Notification

↓

Push Notification

Business logic should never directly send emails.

---

# Background Jobs

Heavy operations belong in queues.

Examples

PDF Generation

Excel Export

Email

AI Analysis

Image Processing

Report Generation

Never block API requests with long-running tasks.

---

# AI Architecture

Every AI feature uses the same abstraction.

```
Feature

↓

AI Service

↓

Prompt Builder

↓

Provider Adapter

↓

LLM
```

Feature modules should never know which provider is being used.

Supported providers should be interchangeable.

OpenAI

Anthropic

Gemini

Ollama

Future providers should require minimal code changes.

---

# Logging

Use structured logging.

Every request should include

Request ID

Organization ID

User ID

Timestamp

Avoid console.log in production code.

Log errors with sufficient context but never include secrets.

---

# Error Handling

Never expose internal errors.

Good

```
Unable to create project.

Please try again.
```

Bad

```
PrismaClientKnownRequestError...
```

Unexpected exceptions should be logged internally and mapped to user-friendly responses.

---

# Caching

Use Redis only where it provides measurable value.

Examples

Dashboard metrics

Frequently accessed lookups

Configuration

Rate limiting

Do not cache mutable transactional data without a clear invalidation strategy.

---

# Security

Always validate input.

Always sanitize output where appropriate.

Use parameterized database queries (Prisma already does this).

Never trust client data.

Apply rate limiting to public endpoints.

Hash passwords with bcrypt or Argon2.

Store secrets only in environment variables.

Rotate secrets when compromised.

---

# Definition of Done (Backend)

A backend feature is complete only when:

✓ DTOs are created

✓ Validation is implemented

✓ Authorization is enforced

✓ Organization isolation is verified

✓ Audit logs are written

✓ Activity timeline is updated (if applicable)

✓ API responses follow the standard format

✓ Errors are handled gracefully

✓ Tests (where applicable) pass

✓ Documentation is updated

# Database Standards

The database is the source of truth.

Every schema decision should prioritize:

- Data integrity
- Consistency
- Simplicity
- Performance

Never optimize prematurely.

---

# Primary Keys

Every table uses UUIDs.

```prisma
id String @id @default(uuid())
```

Never use auto-increment integers.

---

# Common Columns

Every entity should include:

```prisma
id

createdAt

updatedAt

createdBy

updatedBy

organizationId
```

Soft-deletable entities additionally include:

```prisma
deletedAt

deletedBy
```

---

# Naming Convention

Tables

Singular

```
Project

Vendor

Material

PurchaseOrder
```

Avoid

```
Projects

Vendors

PurchaseOrders
```

Fields

camelCase

```
projectName

projectCode

expectedCompletionDate
```

Database

snake_case

Handled automatically by Prisma mapping if required.

---

# Relationships

Always model explicit relationships.

Example

Organization

↓

Project

↓

BOQ

↓

Task

↓

Daily Report

↓

Attachment

Avoid polymorphic relationships unless absolutely necessary.

---

# Enums

Use enums for controlled values.

Example

```prisma
enum ProjectStatus {

ACTIVE

ON_HOLD

COMPLETED

ARCHIVED

}
```

Avoid storing status as arbitrary strings.

---

# Migrations

Every schema change requires a migration.

Never modify production data manually.

Migration names should explain intent.

Good

```
add_project_budget

create_vendor_table

add_purchase_order_status
```

Bad

```
update

fix

new
```

---

# Seed Data

Seed only:

Permissions

Roles

Admin

Demo Data

Countries

Currencies

Do not seed production business data.

---

# Naming Standards

Directories

lowercase

```
projects

vendors

dashboard
```

Components

PascalCase

```
ProjectCard

ProjectTable

VendorSelector
```

Hooks

```
useProjects

useProject

useOrganization
```

Functions

camelCase

```
createProject()

calculateBudget()

archiveVendor()
```

Constants

UPPER_SNAKE_CASE

```
MAX_UPLOAD_SIZE

DEFAULT_PAGE_SIZE
```

Interfaces

```
Project

Vendor

Material
```

Avoid prefixes like

```
IProject

IVendor
```

---

# Git Workflow

Branch naming

```
feature/projects

feature/vendors

feature/auth

bugfix/login

refactor/dashboard

docs/product
```

Commit Messages

Follow Conventional Commits.

Examples

```
feat(projects): add project creation

fix(auth): refresh token issue

refactor(materials): simplify inventory service

docs: update architecture

style: improve dashboard spacing
```

Never commit:

- Secrets
- Environment files
- Build output
- Generated cache

Never add AI attribution to commits or pull requests.

- No `Co-Authored-By: Claude ...` (or any AI agent) trailer in commit messages.
- No "Generated with Claude Code" line in PR descriptions.

---

# Code Review Checklist

Before merging, verify:

✓ No duplicated logic

✓ Components remain small

✓ Proper naming

✓ Types are explicit

✓ Validation exists

✓ Authorization exists

✓ Organization isolation verified

✓ Loading state implemented

✓ Error state implemented

✓ Empty state implemented

✓ Mobile layout checked

✓ No console.log

✓ No TODO left behind

✓ No unused imports

✓ No dead code

---

# Testing Philosophy

Prioritize testing business logic.

Highest priority

- Services
- Utilities
- Validation
- Calculations

Lower priority

Simple UI components.

Test critical workflows instead of chasing coverage numbers.

---

# Performance Checklist

Every feature should consider:

✓ Lazy loading

✓ Pagination

✓ Query optimization

✓ Memoization where necessary

✓ Virtualized tables for large datasets

✓ Database indexes

✓ Image optimization

✓ Bundle size

Optimize after measuring.

Never optimize based on assumptions.

---

# Feature Development Workflow

Every feature follows the same lifecycle.

1.

Understand the business requirement.

↓

2.

Read existing implementation.

↓

3.

Design before coding.

↓

4.

Implement backend.

↓

5.

Implement frontend.

↓

6.

Connect APIs.

↓

7.

Handle loading states.

↓

8.

Handle empty states.

↓

9.

Handle error states.

↓

10.

Review and refactor.

Never skip directly to implementation.

---

# AI Development Rules

Claude should behave like a senior software engineer.

Before writing code:

Understand the existing architecture.

Search for reusable components.

Search for existing services.

Search for similar features.

Avoid introducing new patterns if an existing one already exists.

When implementing a feature:

Prefer extending existing abstractions.

Keep files small.

Keep commits focused.

Generate production-quality code.

Never generate placeholder implementations unless explicitly requested.

Never leave TODOs for core functionality.

---

# Anti-Patterns

Never do the following.

❌ Duplicate components.

❌ Duplicate API clients.

❌ Business logic inside React components.

❌ Prisma queries inside controllers.

❌ Hardcoded permissions.

❌ Hardcoded organization IDs.

❌ Magic numbers.

❌ Nested ternaries.

❌ Massive switch statements.

❌ Massive utility files.

❌ God components.

❌ God services.

❌ Copy-paste implementations.

❌ Global mutable state.

❌ Premature optimization.

---

# Construction Domain Principles

Always model the real business.

Projects own:

- BOQs
- Drawings
- Daily Reports
- Materials
- Workforce
- Vendors
- Purchase Orders
- Safety Reports
- Quality Reports
- Documents

Organization owns:

- Users
- Projects
- Warehouses
- Vendors
- Roles
- Permissions

Business rules should reflect real construction workflows, not generic CRUD applications.

---

# Documentation

Whenever a major architectural or product decision changes:

Update:

- architecture.md
- product.md
- decisions.md

Documentation evolves with the codebase.

Never allow documentation to drift significantly from implementation.

---

# Definition of Done

A feature is complete only if:

✓ Business requirements are satisfied.

✓ Backend implemented.

✓ Frontend implemented.

✓ Validation added.

✓ Authorization enforced.

✓ Multi-tenancy respected.

✓ Responsive UI verified.

✓ Loading state implemented.

✓ Empty state implemented.

✓ Error state implemented.

✓ Activity logging added (where applicable).

✓ Audit logging added (where applicable).

✓ Reusable components extracted.

✓ No duplicated logic.

✓ Code reviewed.

✓ Documentation updated.

If any item is incomplete, the feature is not done.

---

# Final Instruction

SitePilot should feel like a product built by a small team of exceptional engineers.

Every pull request should improve the overall quality of the codebase.

When multiple implementation options exist:

Choose the solution that is:

- Simpler
- More maintainable
- More reusable
- Easier to understand
- Easier to extend

Code should be written for the next engineer-not just for today's task.

Think in systems, not files.

Optimize for long-term clarity over short-term speed.