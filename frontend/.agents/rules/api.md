# Frontend API Consumption & Envelope Handling

## 1. Network Boundary
- All client-side fetchers and mutation hooks call internal Route Handlers:
  `/api/backend/:path*`

## 2. Envelope Unwrapping & Type Narrowing
- Every API call returns a universal envelope:
  - Success: `{ "success": true, "data": T }`
  - Failure: `{ "success": false, "error": { "code": string, "message": string, "fields"?: Record<string, string> } }`
- Always verify `response.success` before reading `response.data`.
- In case of `error`, display human-friendly toast/inline messages and retain user input in dirty forms.
