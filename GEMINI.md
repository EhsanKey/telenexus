# GEMINI.md — Master Context & Scope Router

> **CRITICAL ORCHESTRATION DIRECTIVE FOR AI:**
> This repository is governed by the Spec-Driven Agentic Engineering Framework.
> Authoritative Master Guide: [AGENTS.md](file:///AGENTS.md)
> Master Living Specifications: [specs/index.md](file:///specs/index.md)

---

## Mandatory First-Action Scope Protocol

Before taking ANY action, modifying any file, or answering any implementation prompt, determine the scope of the request:

### 1. Backend Scope (`backend/`)
- **MANDATORY FIRST ACTION:** Read and adopt [`backend/AGENTS.md`](file:///backend/AGENTS.md).
- **GOVERNING SUB-AGENTS:** `backend-architect` ➔ `backend-engineer` ➔ `backend-qa-tester`.
- **GOVERNING SKILLS:** Loaded from [`backend/.agents/skills/`](file:///backend/.agents/skills/).
- **GOVERNING RULES:** Loaded from [`backend/.agents/rules/`](file:///backend/.agents/rules/).

### 2. Frontend Scope (`frontend/`)
- **MANDATORY FIRST ACTION:** Read and adopt [`frontend/AGENTS.md`](file:///frontend/AGENTS.md).
- **GOVERNING SUB-AGENTS:** `frontend-architect` ➔ `frontend-engineer` ➔ `frontend-qa-tester`.
- **GOVERNING SKILLS:** Loaded from [`frontend/.agents/skills/`](file:///frontend/.agents/skills/).
- **GOVERNING RULES:** Loaded from [`frontend/.agents/rules/`](file:///frontend/.agents/rules/).

### 3. Cross-Stack (Full-Stack) Scope
*(New features, DB schema additions, or contracts spanning Backend and Frontend)*
- **MANDATORY FIRST ACTION:** Follow root [AGENTS.md](file:///AGENTS.md).
- **ORCHESTRATION PIPELINE:**
  1. `fullstack-architect` drafts `[FULL-STACK SPEC]` matching [`specs/`](file:///specs/).
  2. Activate backend pipeline ➔ Backend implementation & QA.
  3. Activate frontend pipeline ➔ Frontend implementation & QA.
  4. `fullstack-qa-coordinator` executes cross-stack quality gate.
- **ROOT SKILLS:** Loaded from [`.agents/skills/`](file:///.agents/skills/).

---

## Universal Repository Invariants

1. **Telegram Owns Telegram Data — SOURCE OF TRUTH Owns User Metadata:** Zero message persistence in database, logs, browser storage, or backups.
2. **Reverse Proxy Enclosure:** Frontend code in Next.js / Browser MUST NEVER call backend ports directly. All requests proxy through `/api/backend/*`.
3. **Zero `any`:** Strict typing is non-negotiable throughout.
4. **Universal Response Envelope:** Enforce `{ success: true, data: ... }` / `{ success: false, error: ... }`.
5. **Specs as SSOT:** Specifications in [`specs/`](file:///specs/) govern all features and contracts.
