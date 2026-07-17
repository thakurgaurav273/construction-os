# Frontend Structure

The SitePilot frontend follows standard Next.js App Router conventions:

- `src/app/` - Route definitions (`layout.tsx`, `page.tsx`)
- `src/components/` - Application-specific components (Header, Sidebar)
- `src/hooks/` - API hooks and custom logic
- `src/lib/` - Utilities and API client
- `src/providers/` - React Context providers (QueryClient, Theme)
- `src/store/` - Zustand stores (Demo Mode only)
- `src/data/` - Static mock data
