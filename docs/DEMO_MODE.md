# Demo Data

SitePilot has no front-end demo mode. Every screen reads live data from the API, so a demo is a normal
organization with seeded records.

## Setting up a demo organization

1. Create a database and run the migrations: `pnpm --filter @sitepilot/backend exec prisma migrate deploy`.
2. Register the demo owner through the app (or `POST /api/auth/register`). The seed only fills
   organizations that already have an owner.
3. Run the seed: `pnpm --filter @sitepilot/backend prisma:seed`.

The seed adds projects, team members for each role (project manager, site engineer, procurement, finance,
all with the password `SitePilot@2026!`), workers and attendance, materials, warehouses and stock, vendors,
purchase orders and deliveries, vendor bills, payments, budgets, cash flow, daily reports and one weekly
report schedule.

## What isn't seeded

- **Generated reports**: they need real PDF and Excel files, so generate one from the Reports page.
- **Billing** (clients, contracts, RA bills): create a contract from the Billing page, or import a BOQ.
- **AI insights**: connect an AI key in Settings → AI (or request a trial), then refresh insights on the
  AI Insights page. The dashboard shows the latest snapshot.

The dashboard only shows what exists: budget vs paid out comes from project budgets and released
payments, approvals from real pending requests, and attendance from marked attendance.
