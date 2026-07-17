# Demo Mode Architecture

SitePilot is designed to be easily demonstrable to clients without requiring a running backend database.

## Provider Abstraction

We use a custom API hooks layer (e.g., `usePurchaseOrders()`, `useNotifications()`) that seamlessly switches between Mock Data and Live Data.

### How it works:
1. `IS_DEMO` is read from `process.env.NEXT_PUBLIC_DEMO_MODE`.
2. If `true`, the React Query hooks return data instantly from the local `zustand` store (`demo-store.ts`).
3. If `false`, the hooks execute network requests via `apiClient`.

## Modifying Demo Data
All demo data is hardcoded inside `apps/frontend/src/data/demo.ts`.
Stateful demo interactions (like approving a PO) are handled via `apps/frontend/src/store/demo-store.ts`.
