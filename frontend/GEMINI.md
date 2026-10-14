# GEMINI.md — Frontend Scope Router & First-Action Protocol

> **CRITICAL DIRECTIVE FOR AI:**
> You are operating within the **Frontend Web Subsystem** of SOURCE OF TRUTH.
> Local Guide: [AGENTS.md](file:///frontend/AGENTS.md)
> Master Living Specifications: [../specs/index.md](file:///specs/index.md)

---

## Mandatory First-Action Protocol

Before authoring or editing any frontend component or view:
1. **Identify the Target Domain Spec**: Review [`../specs/`](file:///specs/) (e.g., `SPEC-08` for Layout & UX, `SPEC-04` for Ephemeral Messages, `SPEC-05` for Profile drawer).
2. **Adopt the Persona**:
   - For UI architecture & view models: Act as `frontend-architect`.
   - For React components & hooks: Act as `frontend-engineer`.
   - For QA & responsive audits: Act as `frontend-qa-tester`.
3. **Enforce Core Invariants**:
   - Never call backend ports directly; route all fetches through `/api/backend/*`.
   - Never store message texts in `localStorage` or persistent storage.
   - Distinctly badge `[Telegram Data]` vs `[Personal Metadata]`.
   - Enforce zero `any` and unwrap universal envelopes safely.
