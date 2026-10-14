---
name: cross-stack-feature-plan
description: Orchestration skill for triaging, planning, and executing cross-stack initiatives spanning backend services and frontend web applications. Use when a feature touches database schemas, shared DTOs, API routes, or multi-project user journeys.
metadata:
  author: Agentic Architecture Team
  version: 1.0.0
compatibility:
  tools:
    - view_file
    - run_command
    - replace_file_content
---

# Cross-Stack Feature Plan

## 1. Overview & Objective
Orchestrates complex features across decoupled backend and frontend services, ensuring database changes, API routes, proxy handlers, client state, and UI components are executed in strict dependency order without contract drift.

## 2. Trigger Conditions
Invoke this skill whenever:
- A user request requires both backend database/API changes AND frontend UI views.
- Designing a new cross-cutting feature or business workflow across services.
- Updating authentication or authorization contracts across client and server.

## 3. Four-Stage Execution Protocol

### Stage 1: Specification & Contract Formulation
1. Author or update the authoritative specification in [`specs/`](file:///specs/).
2. Draft a `[FULL-STACK SPEC]` document containing:
   - Schema and migration blueprint.
   - Endpoint signature and request/response DTO contracts.
   - Frontend proxy route and state invalidation keys.

### Stage 2: Backend Architecture & Implementation
1. Generate and apply database migrations.
2. Implement backend repositories, services with transactional integrity, and controllers.
3. Verify Swagger / API documentation and run backend unit tests (`pnpm --filter backend run test`).

### Stage 3: Frontend Integration & Views
1. Implement the reverse proxy route handler (`/api/backend/*`).
2. Implement data-fetching hooks (e.g. TanStack Query / SWR) and view models.
3. Build or extend UI components adhering to design system tokens and accessibility.

### Stage 4: Cross-Stack Quality Gate
1. Execute `contract-drift-audit` to ensure zero schema drift.
2. Run production builds across all services (`pnpm run build`).
3. Verify null safety for optional relational joins.

## 4. Verification Checklist
- [ ] Spec document in `specs/` is updated and committed as SSOT.
- [ ] Backend tests and builds pass with code 0.
- [ ] Frontend builds pass with code 0.
- [ ] Reverse proxy securely handles authentication cookies without exposing backend ports.
