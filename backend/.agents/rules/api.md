# Backend API Rules & Route Guidelines

## 1. Route Definitions & Prefixes
- All internal backend routes are prefixed with `/api/v1/`.
- Use standard REST verbs:
  - `GET /api/v1/resource` (List / Paginated)
  - `GET /api/v1/resource/:id` (Single item)
  - `POST /api/v1/resource` (Create)
  - `PATCH /api/v1/resource/:id` (Partial update)
  - `DELETE /api/v1/resource/:id` (Delete)

## 2. Response Envelopes
Every endpoint must return the universal response envelope:
- Single item: `{ "success": true, "data": ... }`
- Collection: `{ "success": true, "data": [...], "meta": { ... } }`
- Error: `{ "success": false, "error": { "code": "...", "message": "...", "fields": { ... } } }`

## 3. Input Validation
- Validate all incoming request payloads using Zod schemas before passing data to services.
- Never accept unvalidated query parameters.
