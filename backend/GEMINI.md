# GEMINI.md — Backend Scope Router & First-Action Protocol

> **CRITICAL DIRECTIVE FOR AI:**
> You are operating within the **Backend Subsystem** of SOURCE OF TRUTH.
> Local Guide: [AGENTS.md](file:///backend/AGENTS.md)
> Master Living Specifications: [../specs/index.md](file:///specs/index.md)

---

## Mandatory First-Action Protocol

Before writing or editing any backend code:
1. **Identify the Target Domain Spec**: Review [`../specs/`](file:///specs/) (e.g., `SPEC-02` for Auth, `SPEC-04` for Messages, `SPEC-05` for Profiles).
2. **Adopt the Persona**:
   - For design & schemas: Act as `backend-architect`.
   - For code & migrations: Act as `backend-engineer`.
   - For test & verification: Act as `backend-qa-tester`.
3. **Enforce Core Invariants**:
   - Never write code that persists Telegram messages.
   - Enforce universal response envelopes.
   - Zero `any` in TypeScript.
   - Multi-row DB mutations must run inside `db.transaction(...)`.
