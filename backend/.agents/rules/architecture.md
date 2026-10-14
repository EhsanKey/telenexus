# Backend Architecture & System Boundaries

## 1. Modular Organization
Code is structured strictly into feature slices under `src/features/`:
- `src/features/auth/` (MTProto connection, code verification, 2FA, session encryption)
- `src/features/telegram/` (Dialog retrieval, ephemeral message stream, metadata sync)
- `src/features/profiles/` (Custom profile CRUD, fallback name resolution)
- `src/features/social-links/` (External social accounts CRUD)
- `src/features/tags/` (Tag taxonomy and profile association)
- `src/features/backups/` (Google Drive OAuth, AES-256 backup archive, transactional restore)
- `src/features/settings/` (User preferences)

## 2. Separation of Concerns
- **Controllers / Routes:** Handle HTTP parsing, parameter extraction, and DTO validation.
- **Services:** Contain pure business logic, calculations, state transitions, and MTProto invocations.
- **Repositories / Database Access:** Encapsulate Drizzle ORM queries and transactional boundaries.

## 3. The Non-Persistence Invariant
The backend service must NEVER expose or implement any repository or database model that stores Telegram message content, message captions, message sender details, or message timestamps in PostgreSQL.
