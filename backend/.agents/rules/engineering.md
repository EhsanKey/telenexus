# Backend Engineering Standards

## 1. Strict Typing & Zero `any`
- Always enable TypeScript `"strict": true`.
- Zero tolerance for `any`. Use explicit interfaces, generic parameters, or `unknown` with Zod validation.

## 2. Transaction Boundaries
- Any mutation affecting multiple tables or records (e.g. creating profile + social links, or restoring backups) MUST be executed inside `db.transaction(...)`.

## 3. Logging & Data Redaction
- Never log Telegram session strings, passwords, auth hashes, or message texts in application logs.
- Use structured JSON logging with built-in redaction masks.

## 4. Error Handling
- Wrap external third-party calls (Telegram MTProto, Google Drive) in try/catch blocks that normalize exceptions into domain errors defined in `SPEC-09`.
