---
name: db-migration-workflow
description: Step-by-step workflow for safely applying database migrations, schema evolution, and seed data. Use whenever modifying database tables, column types, foreign keys, or running ORM migration tools.
metadata:
  author: Agentic Architecture Team
  version: 1.0.0
compatibility:
  tools:
    - run_command
    - view_file
    - replace_file_content
---

# Database Migration Workflow

## 1. Overview & Objective
Prevents data loss, lock contention, and schema corruption when adding or updating database entities and migrations.

## 2. Trigger Conditions
Invoke this skill whenever:
- Modifying entity definitions or database schemas (`schema.ts` / Drizzle schema / migrations).
- Adding new database columns, relations, enums, or foreign key constraints.
- Seeding development or test environments.

## 3. Execution Protocol
1. **Schema Update**: Make changes to the ORM schema file with explicit types, constraints, and indexes.
2. **Generate Migration**: Run `<package-manager> run db:generate` to produce the SQL migration file.
3. **Inspect SQL**: Inspect the generated SQL file to ensure no unintended destructive actions (e.g. `DROP TABLE` or `DROP COLUMN`).
4. **Apply Migration**: Run `<package-manager> run db:migrate` against the local/development database.
5. **Verify Persistence**: Run unit or integration tests to confirm queries succeed against the new schema.

## 4. Verification Checklist
- [ ] Generated SQL contains explicit constraints and non-conflicting column names.
- [ ] Migration applied cleanly with exit code 0.
- [ ] DTOs and repositories are updated to match new schema columns.
