---
name: crud-operations-guard
description: Safeguards CRUD operations by enforcing database transaction boundaries, validation constraints, explicit return types, and universal response envelope formatting. Use whenever adding or modifying database queries, services, or API endpoints.
metadata:
  author: Agentic Architecture Team
  version: 1.0.0
compatibility:
  tools:
    - view_file
    - replace_file_content
---

# CRUD Operations Guard

## 1. Overview & Objective
Prevents incomplete database mutations, untyped returns, unvalidated user input, and non-standard API response envelopes.

## 2. Trigger Conditions
Invoke this skill whenever:
- Adding a new database table, repository query, or service method.
- Authoring create, update, or delete operations affecting multiple entities.
- Designing HTTP controllers or route handlers.

## 3. Step-by-Step Protocol
1. **Input Validation**: Ensure incoming parameters have strict Zod/DTO schemas with runtime validation.
2. **Transaction Wrapping**: Wrap all multi-entity mutations in a database transaction (`db.transaction`).
3. **Explicit Return Types**: Annotate methods with concrete TypeScript return types; never return inferred `any`.
4. **Envelope Conformance**: Output responses matching `{ success: true, data: ... }` or `{ success: false, error: ... }`.

## 4. Verification Checklist
- [ ] DTO uses schema validation on every property.
- [ ] Multi-table mutations are wrapped in a transaction.
- [ ] No raw database exceptions bubble to the client; all errors use standard exceptions.
