---
name: contract-drift-audit
description: Audits and detects contract drift between backend REST API endpoints and frontend proxy route handlers, DTOs, and view models. Use when modifying API schemas, renaming fields, updating query parameters, or debugging 4xx/5xx proxy errors.
metadata:
  author: Agentic Architecture Team
  version: 1.0.0
compatibility:
  tools:
    - view_file
    - grep_search
---

# Contract Drift Audit

## 1. Overview & Objective
Detects when the backend changes a response property (e.g. `userId` to `creatorId`), but the frontend still expects the old field name, preventing runtime UI crashes and silent `undefined` rendering.

## 2. Trigger Conditions
Invoke this skill:
- After modifying any backend DTO or database schema.
- When frontend queries return `undefined` or UI displays empty tables.
- Before approving a cross-stack delivery gate.

## 3. Audit Protocol
1. Locate the backend endpoint definition and note the output DTO.
2. Inspect the frontend proxy handler (`/api/backend/*`) forwarding the request.
3. Compare the frontend TypeScript interface (`src/types/` or `src/models/`) with the backend response DTO.
4. Verify nullable relations (e.g., if a foreign key is optional, ensure the frontend handles `data.user ? ... : null` safely).

## 4. Verification Checklist
- [ ] Field names match 1-to-1 between backend DTO and frontend interface.
- [ ] Nullable backend relations are checked before accessing child properties in JSX.
- [ ] Enums are identical across both codebases.
