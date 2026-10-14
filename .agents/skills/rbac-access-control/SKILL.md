---
name: rbac-access-control
description: Procedure for synchronizing and auditing Role-Based Access Control and account ownership guards across backend API guards and frontend UI elements. Use when adding administrative features, restricting actions by account, or auditing authorization vulnerabilities.
metadata:
  author: Agentic Architecture Team
  version: 1.0.0
compatibility:
  tools:
    - grep_search
    - view_file
---

# RBAC & Account Boundary Access Control

## 1. Overview & Objective
Ensures zero privilege escalation and cross-account data leakage by enforcing strict account ownership checks on the backend (as the security boundary) and synchronized conditional rendering on the frontend.

## 2. Trigger Conditions
Invoke this skill whenever:
- Creating or modifying endpoints intended to access custom profiles, tags, social links, or backups.
- Implementing role-restricted UI views, action buttons, or navigation links.
- Adding resource ownership queries (`telegram_account_id` filtering).

## 3. Execution Protocol
1. **Backend Route Protection**: Apply authenticated session guards on controller methods.
2. **Resource Ownership Guard**: In services, verify that the active account ID matches the entity's owner account ID.
3. **Frontend Guarding**: Protect views with session context, but never rely solely on frontend hiding for security.

## 4. Verification Checklist
- [ ] Every protected backend route explicitly declares its authentication guard.
- [ ] Unauthorized requests return `401 Unauthorized` or `403 Forbidden` in standard error envelopes.
- [ ] UUID tampering across accounts is rejected with 403/404.
