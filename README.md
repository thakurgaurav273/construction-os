# SitePilot

AI-native Construction ERP built for contractors, developers and infrastructure companies.

---

## Vision

SitePilot simplifies construction management by bringing projects, workforce,
procurement, inventory, finance and AI assistants into a single platform.

Unlike traditional ERPs, SitePilot focuses on speed, modern UX and AI-assisted
workflows.

---

## MVP Scope

- Authentication
- Organizations
- Dashboard
- Projects
- Workforce
- Vendors
- Materials
- Purchase Orders
- BOQ
- Daily Reports
- Billing
- Reports

---

## Tech Stack

Frontend
- Next.js
- React
- TypeScript
- Tailwind
- shadcn/ui

Backend
- NestJS
- Prisma
- PostgreSQL
- Redis

Infrastructure
- Docker
- S3 Compatible Storage

AI
- Provider abstraction
- OpenAI
- Anthropic
- Gemini

---

## Repository Structure

/apps
/packages
/docs

---

## Tests

Backend tests use Node's built-in test runner.

```bash
cd apps/backend
npm test                      # unit tests, no database needed

# Service tests against a real Postgres database (migrated automatically).
# The database name must contain "test"; each run creates its own organizations, so no cleanup is needed.
createdb sitepilot_integration_test
TEST_DATABASE_URL=postgresql://localhost:5432/sitepilot_integration_test npm run test:integration
```

---

## Documentation

docs/product.md
docs/architecture.md
docs/design.md

---

## Current Status

Phase 1 Development