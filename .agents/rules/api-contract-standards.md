# API Contract Standards & Universal Envelope

## 1. Universal Envelopes
All REST endpoints across the system must return responses in one of these standard envelopes:

### Single Entity Success:
```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated Collection Success:
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 30,
    "totalPages": 4,
    "nextCursor": "optional_cursor"
  }
}
```

### Error Envelope:
```json
{
  "success": false,
  "error": {
    "code": "SPEC_DEFINED_CODE",
    "message": "Human-readable description",
    "fields": {
      "fieldName": "Validation error details"
    }
  }
}
```

## 2. Strict DTO Validation
- All incoming requests must be parsed and validated on the backend using runtime schemas (Zod or class-validator).
- Reject extraneous or unrecognized payload fields.
- Nullable fields must be explicitly typed as `string | null`, never omitted or treated as untyped `any`.
