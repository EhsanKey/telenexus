# Monorepo Topology & Boundaries

## 1. Directory Structure & Service Isolation
- `backend/`: Core Node.js API, GramJS MTProto service, and Neon PostgreSQL database access. Exposes internal API on port `4000`.
- `frontend/`: Next.js 15+ App Router web client. Listens on port `3000`.
- `specs/`: Universal Single Source of Truth for all domain requirements and contracts.

## 2. Reverse Proxy Boundary
- Browser client components MUST NEVER issue fetch calls to `http://localhost:4000/*`.
- All requests MUST route through `frontend/src/app/api/backend/*`.
- The Next.js API proxy attaches session headers securely and forwards to `http://localhost:4000/api/v1/*`.
- This ensures sensitive cookies/tokens are HTTP-only and internal ports remain protected.

## 3. Dependency Isolation
- No circular dependencies between `backend` and `frontend`.
- Code cannot be cross-imported via relative paths (e.g. `../../backend/src/...`). Shared types or contracts must be synchronized through specifications.
