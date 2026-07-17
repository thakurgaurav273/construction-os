# Production Integration Guide

To connect SitePilot to the real backend, follow these steps:

1. **Disable Demo Mode**
   In your `.env.local` file, set:
   ```env
   NEXT_PUBLIC_DEMO_MODE=false
   NEXT_PUBLIC_API_URL=https://api.sitepilot.io/v1
   ```

2. **Implement API Repositories**
   Navigate to `apps/frontend/src/lib/api/repositories/` and complete the Axios implementation for:
   - Projects
   - Purchase Orders
   - Daily Reports
   - Workforce

3. **Authentication**
   Implement the JWT bearer token interceptor inside `apps/frontend/src/lib/api/client.ts`.
   
4. **Data Transfer Objects**
   Ensure that the backend JSON responses exactly map to the interfaces defined in `apps/frontend/src/lib/api/dto/`.
