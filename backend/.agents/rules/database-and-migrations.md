# Database & Migrations Rules (Neon PostgreSQL & Drizzle ORM)

## 1. Schema Conventions
- Table and column names use `snake_case` in SQL and `camelCase` in TypeScript.
- Primary keys must be UUIDs generated via `gen_random_uuid()` or ULIDs.
- Foreign keys must declare explicit `ON DELETE CASCADE` or `ON DELETE RESTRICT` constraints.
- Every persistent table must have `created_at` and `updated_at` timestamps with time zone (`TIMESTAMPTZ`).

## 2. Migrations Workflow
- Never edit database tables directly in production.
- All schema changes must be declared in `src/database/schema/` and generated via `pnpm run db:generate`.
- Inspect generated SQL for accidental `DROP COLUMN` or destructive operations before applying via `pnpm run db:migrate`.

## 3. Indexing Strategy
- Explicit indexes must be created on foreign keys and frequently queried fields (`telegram_account_id`, `telegram_entity_id`, `telegram_peer_id`, `telegram_username`).
- Composite unique constraints must protect account boundaries.
