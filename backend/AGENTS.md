# AGENTS.md — Backend Service Guide (`backend/`)

Welcome to **`backend/`**: the core API, GramJS MTProto engine, and Neon PostgreSQL persistence layer for **SOURCE OF TRUTH**.

This file serves as the **README for AI Agents** operating within the backend workspace.

---

## 1. Subsystem Overview & Port Registry

- **Framework & Runtime:** Node.js + TypeScript (Express / Fastify)
- **Telegram MTProto Client:** GramJS (Node.js MTProto library)
- **Persistence Layer:** Neon PostgreSQL via Drizzle ORM
- **Dev Port:** `4000` (Command: `pnpm run dev`)
- **Route Prefix:** `/api/v1` (Upstream for Next.js proxy)
- **Master Living Specs:** Single Source of Truth maintained at [`../specs/`](file:///specs/). All code must strictly implement `SPEC-01` through `SPEC-09`.

---

## 2. Essential Development Commands

Run from `backend/`:

```powershell
# Dependencies & Execution
pnpm install
pnpm run dev                      # Starts backend API on port 4000
pnpm run build                    # Compiles TypeScript (validates types)

# Quality & Testing
pnpm run test                     # Executes unit and invariant tests
pnpm run lint                     # ESLint validation

# Database & Migrations
pnpm run db:generate              # Generates SQL migrations from schema
pnpm run db:migrate               # Applies migrations to Neon database
```

---

## 3. Code Style & Architectural Invariants

All coding agents operating in `backend/` must adhere to these rules:

1. **Message Non-Persistence Invariant (CRITICAL):**
   - NEVER create tables or write queries that insert/update Telegram messages, captions, sender logs, or media.
   - Message streams must remain transient in memory and discarded upon completion.
2. **TypeScript Strictness & Zero `any`:**
   - `"strict": true` is enforced throughout.
   - Use `unknown` with runtime type narrowing (`zod` schemas).
3. **Universal Response Envelope:**
   - Success: `{ "success": true, "data": ... }`
   - Paginated: `{ "success": true, "data": [...], "meta": { "total": N, "page": P, "limit": L, "totalPages": T } }`
   - Error: `{ "success": false, "error": { "code": "...", "message": "...", "fields": { ... } } }`
4. **Session Token Isolation:**
   - GramJS session strings must be encrypted at rest using AES-256-GCM.
   - Never log session tokens or expose them in API responses.

---

## 4. Source Directory Map

```text
backend/
├── src/
│   ├── common/                  # Guards, interceptors, error filters, envelopes
│   ├── config/                  # Environment secrets validation (Zod)
│   ├── database/                # Drizzle schemas, migrations, Neon connection
│   └── features/
│       ├── auth/                # MTProto login, verification code, 2FA, session
│       ├── telegram/            # Dialogs retrieval, ephemeral message stream, sync
│       ├── profiles/            # Custom profiles CRUD, name fallback logic
│       ├── social-links/        # Multi-link CRUD and URL validation
│       ├── tags/                # Tag taxonomy and profile_tags junction
│       ├── backups/             # Google Drive OAuth, encryption, backup/restore
│       └── settings/            # Application preferences
└── tests/
    ├── unit/
    ├── integration/
    └── invariants/              # Tests enforcing zero message persistence
```

---

## 5. Multi-Agent Triad Roster

Governed by agent personas under [`.agents/agents/`](file:///backend/.agents/agents/):

| Agent Name | Definition File | Role & Scope | Primary Deliverable |
|---|---|---|---|
| **`backend-architect`** | [`.agents/agents/backend-architect.md`](file:///backend/.agents/agents/backend-architect.md) | Designs schemas, migrations, and endpoint contracts. **READ-ONLY**. | `[BACKEND SPEC]` RFC & Checklist |
| **`backend-engineer`** | [`.agents/agents/backend-engineer.md`](file:///backend/.agents/agents/backend-engineer.md) | Implements Drizzle schemas, MTProto services, controllers, and tests. | Clean Code Diff & Implementation Report |
| **`backend-qa-tester`** | [`.agents/agents/backend-qa-tester.md`](file:///backend/.agents/agents/backend-qa-tester.md) | Runs builds, migrations, unit tests, and non-persistence audits. | Quality Verdict (`APPROVED` / `REJECTED`) |

---

## 6. Governing Rules & Active Skills Reference

### Active Rules ([`.agents/rules/`](file:///backend/.agents/rules/)):
- **[architecture.md](file:///backend/.agents/rules/architecture.md)** — Feature modularity, service separation.
- **[engineering.md](file:///backend/.agents/rules/engineering.md)** — Strict typing, transactional queries, Winston logger sanitization.
- **[database-and-migrations.md](file:///backend/.agents/rules/database-and-migrations.md)** — Neon PostgreSQL, Drizzle migrations, indexing.
- **[api.md](file:///backend/.agents/rules/api.md)** — Universal envelopes, Zod validation, error taxonomy.

### Active Skills ([`.agents/skills/`](file:///backend/.agents/skills/)):
- **`db-migration-workflow`** — Safe database migration protocol.
- **`crud-operations-guard`** — Transaction & validation integrity.
- **`delivery-guard`** — Pre-flight audit verifying clean build and tests.
