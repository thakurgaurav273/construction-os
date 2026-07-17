# SitePilot Architecture

SitePilot is structured as a modern full-stack monorepo managed by Turborepo.

## Monorepo Layout

- `apps/frontend/` - Next.js App Router frontend
- `apps/backend/` - NestJS backend (API Layer)
- `packages/ui/` - Custom shared React component library
- `packages/config/` - Shared ESLint/TS configs
- `packages/types/` - Shared TypeScript interfaces and DTOs

## Core Technologies

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Framer Motion, React Query
- **Backend**: NestJS, PostgreSQL (Planned)
- **State Management**: Zustand (Demo Store), TanStack React Query (Production Data)
- **UI System**: Custom built, inspired by Vercel/Linear aesthetics

## Deployment
- Optimized for serverless deployments (Vercel) for the frontend, and containerized deployments for the backend.