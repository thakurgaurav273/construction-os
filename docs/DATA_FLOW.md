# Data Flow Architecture

The data flow within SitePilot guarantees strict separation of concerns.

## Data Journey
1. **Component Layer:** Calls a custom React Query hook (e.g., `usePurchaseOrders()`).
2. **Hook Layer:** 
   - Checks `IS_DEMO`.
   - If true, requests data from Zustand (`useDemoStore`).
   - If false, utilizes React Query to fetch from the API Client.
3. **API Client Layer:** Axios intercepts requests, adds authorization tokens, and resolves backend JSON into DTOs.

This guarantees that a UI component like `<PurchaseOrdersPage>` never knows whether it is running against local demo data or a live production database.
