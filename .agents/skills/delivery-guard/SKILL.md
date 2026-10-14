---
name: delivery-guard
description: Pre-flight quality verification skill auditing type-checking, builds, and test suites. Use before declaring ANY task complete to guarantee that no broken imports, lint errors, or failing tests are delivered.
metadata:
  author: Agentic Architecture Team
  version: 1.0.0
compatibility:
  tools:
    - run_command
    - view_file
---

# Delivery Guard

## 1. Overview & Objective
Guarantees that no task is delivered partially or in a broken state. Enforces a clean build and green test suite.

## 2. Trigger Conditions
Invoke this skill:
- Immediately after completing code changes and before notifying the user.
- Prior to merging any branch or marking an issue resolved.

## 3. Execution Sequence
1. **Type-Checking & Build:** Run `<package-manager> run build`.
2. **Unit Tests:** Run `<package-manager> run test`.
3. **Linter:** Run `<package-manager> run lint`.
4. **Edge-case Inspection:** Search for lingering `TODO`s, commented-out debugging code, or unhandled null checks.

## 4. Verification Checklist
- [ ] Production build exits with code 0.
- [ ] Unit test suite passes with 0 failures.
- [ ] Zero TypeScript compile errors (`tsc` passes).
- [ ] No uncommitted scratch files left behind.
