---
name: fullstack-delivery-guard
description: Pre-flight quality verification skill that audits cross-stack type-checking, builds, and test suites across both backend and frontend services. Use before declaring ANY cross-stack task complete.
metadata:
  author: Agentic Architecture Team
  version: 1.0.0
compatibility:
  tools:
    - run_command
    - view_file
---

# Fullstack Delivery Guard

## 1. Overview & Objective
Guarantees that no task is delivered partially or in a broken state across the monorepo. Enforces a clean build, green test suites, zero lint errors, and zero message persistence violations.

## 2. Trigger Conditions
Invoke this skill:
- Immediately after completing cross-stack code changes.
- Prior to declaring any multi-project feature or milestone complete.

## 3. Execution Sequence
1. **Type-Checking & Build:**
   ```powershell
   pnpm run build
   ```
2. **Unit & Invariant Tests:**
   ```powershell
   pnpm run test
   ```
3. **Linter:**
   ```powershell
   pnpm run lint
   ```
4. **Message Non-Persistence Invariant Audit:**
   Verify no database queries write to message entities.

## 4. Verification Checklist
- [ ] Backend build exits with code 0.
- [ ] Frontend build exits with code 0.
- [ ] Unit and invariant tests pass with 0 failures.
- [ ] Zero TypeScript compile errors (`tsc` passes).
