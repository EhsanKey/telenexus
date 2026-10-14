---
name: component-utility-reuse-standard
description: Scans the existing frontend component and utility library before authoring new UI elements or helper functions. Use whenever instructed to build a new UI view, modal, button, form input, date formatter, or helper function.
metadata:
  author: Agentic Architecture Team
  version: 1.0.0
compatibility:
  tools:
    - grep_search
    - view_file
---

# Component & Utility Reuse Standard

## 1. Overview & Objective
Enforces DRY principles across the frontend by requiring agents to discover, audit, and reuse existing components and utility functions before creating new files.

## 2. Trigger Conditions
Invoke this skill whenever:
- Adding a new UI view, modal, drawer, form, button, or badge.
- Formatting dates, currencies, strings, or status badges.
- Creating state management hooks or API fetchers.

## 3. Execution Sequence
1. **Catalog Search**:
   - Search shared UI components in `src/components/shared/` or `src/components/ui/`.
   - Search helper functions in `src/lib/` or `src/utils/` and custom hooks in `src/hooks/`.
2. **Reuse Assessment**:
   - If a component exists that satisfies 80% of requirements, extend its props (e.g. adding a variant or optional slot) rather than duplicating code.
3. **Design System Tokens**:
   - Reuse standard design tokens (colors, spacing, typography) from Tailwind/CSS tokens rather than writing hardcoded inline styles.

## 4. Verification Checklist
- [ ] No duplicate UI primitive was created.
- [ ] Helper utilities were reused where applicable.
- [ ] Visual distinction tokens (`Telegram Data` vs `Personal Metadata`) are preserved.
