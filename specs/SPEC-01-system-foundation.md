# SPEC-01: System Foundation & Cross-Cutting Invariants

## 1. Domain Overview & Purpose
SOURCE OF TRUTH is a personal Telegram intelligence and contact management platform. It combines Telegram MTProto account connectivity with a rich personal CRM layer. 

The foundation enforces strict separation of concerns, zero-any TypeScript hygiene, universal API envelopes, and reverse-proxy network boundaries.

## 2. Requirements Traceability
- **SRS References:** §1 (Executive Summary), §1.2 (Core Principle), §3 (Technology Stack), §4 (System Architecture), §16 (Development Rules), §17 (Final Architectural Decisions).
- **Core Invariant:** Telegram owns Telegram data. SOURCE OF TRUTH owns user-created metadata.
- **Message Non-Persistence:** No Telegram message history (text, captions, media, timestamps, sender IDs) may ever be persisted in PostgreSQL, persistent browser storage, log files, or backups.

## 3. Technology Topology & System Boundaries

```text
┌────────────────────────────────────────────────────────┐
│                   CLIENT BROWSER                       │
│    Next.js Frontend (React 19, TypeScript, CSS)        │
└───────────────────────────┬────────────────────────────┘
                            │ /api/backend/* (Secure Proxy)
┌───────────────────────────▼────────────────────────────┐
│                  BACKEND SERVICE                       │
│      Node.js + TypeScript (Express / Fastify)          │
│   ┌────────────────────┐      ┌─────────────────────┐  │
│   │   MTProto Client   │      │ Database Controller │  │
│   │      (GramJS)      │      │ (Drizzle ORM Engine)│  │
│   └─────────┬──────────┘      └──────────┬──────────┘  │
└─────────────┼────────────────────────────┼─────────────┘
              ▼                            ▼
   Telegram MTProto Cloud           Neon PostgreSQL
```

### Invariants:
1. **Zero Direct Microservice Exposure:** Client browser code NEVER directly contacts backend port (e.g. `localhost:4000`) or database ports. All traffic proxies through Next.js API route handlers `/api/backend/*`.
2. **Universal Response Envelope:**
   - **Success (Single):**
     ```json
     {
       "success": true,
       "data": { ... }
     }
     ```
   - **Success (Paginated):**
     ```json
     {
       "success": true,
       "data": [ ... ],
       "meta": {
         "total": 120,
         "page": 1,
         "limit": 30,
         "totalPages": 4,
         "nextCursor": "..."
       }
     }
     ```
   - **Failure Envelope:**
     ```json
     {
       "success": false,
       "error": {
         "code": "ENTITY_NOT_FOUND",
         "message": "Human-readable Persian/English error message",
         "fields": { "optionalField": "Specific validation failure" }
       }
     }
     ```
3. **Strict TypeScript & Zero `any`:**
   - `tsconfig.json` enforces `"strict": true`, `"noImplicitAny": true`.
   - Never cast to `any`. Use `unknown` with Zod validation or discriminated unions.
4. **Source of Truth Matrix:**

| Data Element | Authoritative Source | Stored in PostgreSQL? | Stored in Backup? |
|---|---|---|---|
| Telegram Messages / Captions | Telegram MTProto | **NO (STRICT)** | **NO (STRICT)** |
| Telegram Media | Telegram MTProto | **NO (STRICT)** | **NO (STRICT)** |
| Telegram Account Session | Telegram MTProto | Encrypted token storage only | **NO (STRICT)** |
| Telegram Peer Identity / Access Hash | Telegram MTProto | Yes (Cached identity) | Optional reference |
| Custom Display Name | User | **YES** | **YES** |
| Personal Notes | User | **YES** | **YES** |
| Custom Phone Number | User | **YES** | **YES** |
| Professional Context (Org/Role) | User | **YES** | **YES** |
| Social Media Links | User | **YES** | **YES** |
| User Tags & Color Taxonomy | User | **YES** | **YES** |
| Reason for Joining (Group/Channel) | User | **YES** | **YES** |
| Backup Manifest Metadata | SOT App | **YES** | **YES** |

## 4. Verification & Testing Checklist
- [x] Automated invariant test verifies that no database queries perform `INSERT` or `UPDATE` on message structures.
- [x] API responses always match the universal envelope format.
- [x] Linting fails if `any` is found in new TypeScript files.
