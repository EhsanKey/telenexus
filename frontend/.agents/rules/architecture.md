# Frontend Architecture & Next.js App Router Rules

## 1. Directory Structure
- `src/app/api/backend/*`: Server-side Route Handlers acting as a secure reverse proxy to the backend service.
- `src/app/(auth)/*`: Authentication routes (phone login, SMS/app verification code, 2FA password).
- `src/app/(dashboard)/*`: Primary authenticated 3-panel workspace.
- `src/components/`: Modular component tree partitioned into `ui/` primitives, `layout/`, `chat/`, `profile/`, and `backup/`.

## 2. Server vs Client Component Boundaries
- Use React Server Components (RSC) for initial data fetching and page shells where applicable.
- Mark interactive components with `'use client'` (e.g. chat stream, profile drawer form, modals).
- Keep `'use client'` leaves as small as possible to optimize client bundle size.

## 3. Reverse Proxy Enforcement
- All browser client components MUST invoke `/api/backend/*`. Direct access to internal microservice ports is strictly prohibited.
