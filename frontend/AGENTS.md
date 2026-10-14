# AGENTS.md — Frontend Web Application Guide (`frontend/`)

Welcome to **`frontend/`**: the Next.js 15+ App Router client application for **SOURCE OF TRUTH**.

This file serves as the **README for AI Agents** operating within the frontend client workspace.

---

## 1. Subsystem Overview & Port Registry

- **Framework & Runtime:** Next.js 15+ (App Router), React 19, TypeScript
- **Styling & Design System:** Tailwind CSS, Radix Primitives / shadcn/ui tokens
- **Dev Port:** `3000` (Command: `pnpm run dev`)
- **API Proxy Prefix:** `/api/backend/*` (Forwards to `http://localhost:4000/api/v1/*`)
- **Master Living Specs:** Single Source of Truth maintained at [`../specs/`](file:///specs/). Strictly adhere to `SPEC-01` through `SPEC-09`.

---

## 2. Essential Development Commands

Run from `frontend/`:

```powershell
# Dependencies & Execution
pnpm install
pnpm run dev                      # Starts Next.js dev server on port 3000
pnpm run build                    # Compiles Next.js bundle & validates TypeScript types

# Code Quality & Testing
pnpm run test                     # Executes unit & component tests
pnpm run lint                     # ESLint checks
```

---

## 3. Code Style & Architectural Invariants

All coding agents operating in `frontend/` must adhere to these rules:

1. **Reverse Proxy Enclosure (CRITICAL):**
   - Browser client components MUST NEVER call backend microservice ports directly (`http://localhost:4000`).
   - All network calls must pass through internal API Route Handlers (`/api/backend/*`).
2. **Visual Distinction Invariant:**
   - Clearly badge external Telegram-owned data (`[Telegram Data]`) vs user-curated personal CRM metadata (`[Personal Metadata]`).
   - Explicitly badge manual phone numbers with `[Unverified Entry]`.
3. **Ephemeral Message Non-Persistence:**
   - Message items exist only in React component state while viewing a conversation.
   - Never cache or persist message text in `localStorage`, `sessionStorage`, or IndexedDB.
4. **TypeScript Strictness & Zero `any`:**
   - `"strict": true` is enforced throughout.
   - Use strict interfaces matching backend DTO envelopes.

---

## 4. Source Directory Map

```text
frontend/
├── src/
│   ├── app/
│   │   ├── api/backend/         # Reverse proxy Route Handlers forwarding to port 4000
│   │   ├── (auth)/              # Telegram login, phone code, 2FA pages
│   │   ├── (dashboard)/         # Main three-panel CRM workspace
│   │   ├── globals.css          # Design system tokens and baseline styling
│   │   └── layout.tsx           # Root application shell
│   ├── components/
│   │   ├── ui/                  # Primitives (buttons, inputs, dialogs, badges)
│   │   ├── shared/              # Shared multi-use components
│   │   ├── layout/              # Sidebar (220-260px), Dialogs panel (300-380px)
│   │   ├── chat/                # Header, ephemeral message stream, media indicators
│   │   ├── profile/             # Profile drawer (340-440px), 6 sections, forms
│   │   └── backup/              # Google Drive backup preview & restore modal
│   ├── hooks/                   # Custom React hooks (unsaved changes guard, etc.)
│   ├── lib/                     # Fetcher utilities, date formatting, cn() helper
│   ├── types/                   # TypeScript DTOs & view models matching specs
│   └── messages/                # Localization & UI string catalogs
└── tests/                       # Component and integration test suites
```

---

## 5. Multi-Agent Triad Roster

Governed by agent personas located under [`.agents/agents/`](file:///frontend/.agents/agents/):

| Agent Name | Definition File | Role & Scope | Primary Deliverable |
|---|---|---|---|
| **`frontend-architect`** | [`.agents/agents/frontend-architect.md`](file:///frontend/.agents/agents/frontend-architect.md) | Designs view models, component topology, and proxy routes. **READ-ONLY**. | `[FRONTEND SPEC]` Blueprint & Checklist |
| **`frontend-engineer`** | [`.agents/agents/frontend-engineer.md`](file:///frontend/.agents/agents/frontend-engineer.md) | Implements UI views, state hooks, proxy handlers, and unit tests. | Clean Code Diff & UI Deliverable |
| **`frontend-qa-tester`** | [`.agents/agents/frontend-qa-tester.md`](file:///frontend/.agents/agents/frontend-qa-tester.md) | Runs builds, audits contract drift, and validates responsiveness. | Quality Verdict (`APPROVED` / `REJECTED`) |

---

## 6. Governing Rules & Active Skills Reference

### Active Rules ([`.agents/rules/`](file:///frontend/.agents/rules/)):
- **[architecture.md](file:///frontend/.agents/rules/architecture.md)** — App Router boundaries, proxy design.
- **[engineering.md](file:///frontend/.agents/rules/engineering.md)** — Strict typing, unsaved changes dirty checking.
- **[frontend-ui-standards.md](file:///frontend/.agents/rules/frontend-ui-standards.md)** — Three-panel layout, visual badges, WCAG 2.2 AA.
- **[api.md](file:///frontend/.agents/rules/api.md)** — Envelope unwrapping and client error handling.

### Active Skills ([`.agents/skills/`](file:///frontend/.agents/skills/)):
- **`component-utility-reuse-standard`** — DRY component & utility scanner.
- **`crud-operations-guard`** — Form validation and optimistic safety.
- **`delivery-guard`** — Pre-flight audit verifying clean build and tests.
