# AGENTS.md — TeleNexus Monorepo Guide

Welcome to **TeleNexus** (formerly SOURCE OF TRUTH): The Telegram Personal Intelligence & Contact Management Platform.

This repository is governed by the **Spec-Driven Agentic Engineering Framework**. This document serves as the **Authoritative Guide for AI Agents** operating across the workspace.

---

## 1. Subsystem Overview & Port Registry

| Subsystem | Directory | Framework & Tech Stack | Dev Port | Route Prefix / Upstream Target |
|---|---|---|---|---|
| **Backend Core** | [`backend/`](file:///backend/) | Node.js, GramJS MTProto, Drizzle ORM, Neon PostgreSQL | `4000` | Direct API: `http://localhost:4000/api/v1` |
| **Frontend Web** | [`frontend/`](file:///frontend/) | Next.js 15+ (App Router), React 19, Tailwind CSS | `3000` | Proxy: `/api/backend/*` ➔ `localhost:4000` |
| **Living Specs** | [`specs/`](file:///specs/) | Markdown SSOT Catalog (`SPEC-01` .. `SPEC-09`) | N/A | Single Source of Truth for all behaviors |

---

## 2. Universal Repository Invariants

Every agent operating anywhere in this monorepo must strictly adhere to these 5 non-negotiable laws:

1. **Telegram Owns Telegram Data — SOURCE OF TRUTH Owns User Metadata:**
   - **Zero Message Persistence:** Under NO circumstances may Telegram messages, captions, media, or sender timestamps be saved into Neon PostgreSQL, persistent browser storage, disk, or application logs.
   - Live messages are retrieved transiently and discarded on view unmount.
2. **Reverse Proxy Network Enclosure:**
   - Browser client code **NEVER** calls backend ports directly (`localhost:4000`).
   - All network traffic is routed via Next.js Route Handlers (`/api/backend/*`) to safeguard session tokens and isolate internal network topology.
3. **Universal Response Envelope:**
   - **Success (Single):** `{ "success": true, "data": ... }`
   - **Success (Paginated):** `{ "success": true, "data": [...], "meta": { "total": N, "page": P, "limit": L, "totalPages": T } }`
   - **Error:** `{ "success": false, "error": { "code": "...", "message": "...", "fields": { ... } } }`
4. **TypeScript Strictness & Zero `any`:**
   - `"strict": true` is enforced across all sub-projects.
   - The use of `any` is strictly prohibited. Use `unknown` with Zod validation, runtime type guards, or discriminated unions.
5. **Living Specs as SSOT:**
   - The specifications in [`specs/`](file:///specs/) take precedence over code. If code contradicts specs, the spec wins. Update the spec first, then the code.

---

## 3. Essential Monorepo Commands

Run from workspace root:

```powershell
# Dependencies Installation
pnpm install

# Development Servers
pnpm --filter backend run dev      # Starts Backend on port 4000
pnpm --filter frontend run dev     # Starts Frontend on port 3000

# Verification & Quality Gate
pnpm run build                     # Type-check and compile all projects
pnpm run test                      # Execute all unit and invariant test suites
pnpm run lint                      # Run linter across all projects
```

---

## 4. Multi-Agent Triad Roster

Governed by agent personas located under [`.agents/agents/`](file:///.agents/agents/):

| Agent Name | Definition File | Role & Scope | Deliverable |
|---|---|---|---|
| **`fullstack-architect`** | [`.agents/agents/fullstack-architect.md`](file:///.agents/agents/fullstack-architect.md) | Cross-stack architecture, schema evolution, and API design. **READ-ONLY**. | `[FULL-STACK SPEC]` Blueprint & Checklist |
| **`fullstack-qa-coordinator`** | [`.agents/agents/fullstack-qa-coordinator.md`](file:///.agents/agents/fullstack-qa-coordinator.md) | Audits cross-stack contract drift, builds, and test suites. **READ-ONLY + TOOLS**. | Cross-Stack Quality Gate Verdict (`APPROVED` / `REJECTED`) |

For subproject local implementations:
- Backend: [`backend/.agents/agents/`](file:///backend/.agents/agents/) (`backend-architect`, `backend-engineer`, `backend-qa-tester`)
- Frontend: [`frontend/.agents/agents/`](file:///frontend/.agents/agents/) (`frontend-architect`, `frontend-engineer`, `frontend-qa-tester`)

---

## 5. Governing Rules & Active Skills Reference

### Root Rules ([`.agents/rules/`](file:///.agents/rules/)):
- **[monorepo-topology.md](file:///.agents/rules/monorepo-topology.md)** — Decoupled service boundaries, dev ports, and proxy routes.
- **[api-contract-standards.md](file:///.agents/rules/api-contract-standards.md)** — Response envelopes, DTO validation, and error taxonomy.
- **[cross-stack-sdlc.md](file:///.agents/rules/cross-stack-sdlc.md)** — 4-stage cross-stack delivery protocol.

### Root Skills ([`.agents/skills/`](file:///.agents/skills/)):
- **`cross-stack-feature-plan`** — End-to-end multi-app initiative planner.
- **`contract-drift-audit`** — Scans for schema drift between backend DTOs and frontend proxy routes.
- **`fullstack-delivery-guard`** — Cross-stack build & integration gatekeeper.
- **`crud-operations-guard`** — Transaction & validation integrity.
- **`delivery-guard`** — Zero lint warnings, zero build errors.
- **`db-migration-workflow`** — Safe database migration protocol.
- **`component-utility-reuse-standard`** — DRY component & utility scanner.
- **`rbac-access-control`** — Multi-tenant / account access boundaries.

---

## 6. Critical Gotchas & Constraints

1. **Never Persist Telegram Messages:** Test suites strictly enforce 0 database insertions during message viewing operations.
2. **GramJS Client Concurrency:** Telegram MTProto enforces strict session boundaries; handle `FLOOD_WAIT` gracefully without spamming retries.
3. **AES-256 Session Encryption:** Never write plaintext Telegram session strings to PostgreSQL or Google Drive backups.
