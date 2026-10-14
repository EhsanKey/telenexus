# Cross-Stack Software Development Lifecycle (SDLC) Protocol

## 1. The 4-Stage Delivery Pipeline
For any feature that spans both Backend and Frontend, agents must strictly follow these sequential stages:

### Stage 1: Specification & Contract Formulation
- Architect drafts `[FULL-STACK SPEC]` citing `specs/` (e.g. `SPEC-05`).
- Define exact request/response envelopes and SQL migrations before writing code.

### Stage 2: Backend Architecture & Implementation
- Generate and run Drizzle migrations against the database.
- Implement transactional repository methods and controllers.
- Run backend unit tests (`pnpm --filter backend run test`).

### Stage 3: Frontend Integration & Views
- Implement reverse proxy route handler in Next.js (`/api/backend/*`).
- Implement TypeScript models and data fetching hooks.
- Build UI components adhering to design system, badging, and responsive layouts.

### Stage 4: Cross-Stack Quality Gate
- Run `contract-drift-audit` to ensure zero drift.
- Run `pnpm run build` across all packages.
- Execute invariant tests verifying message non-persistence.
