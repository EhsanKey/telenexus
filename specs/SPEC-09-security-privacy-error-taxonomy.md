# SPEC-09: Security, Privacy, Threat Model & Error Taxonomy

## 1. Domain Overview & Purpose
SOURCE OF TRUTH bridges highly confidential Telegram account access with personal CRM metadata and cloud backups. This specification formalizes the system's threat model, privacy safeguards, credential boundaries, logging rules, and universal error taxonomy.

## 2. Requirements Traceability
- **SRS Requirements:**
  - `SRS §9.1`: Authentication Boundaries & Secret Protection.
  - `SRS §9.2`: Telegram Session Security (encryption at rest, zero logs).
  - `SRS §9.3`: Strict Account Authorization boundaries.
  - `SRS §9.4`: Personal Data Protection.
  - `SRS §9.5`: Zero Sensitive Data in Logs.
  - `SRS §9.6`: Browser Storage Restrictions (no credentials, no messages).
  - `SRS §9.7`: Backend Input Validation (Zod schemas).
  - `SRS §9.8`: Threat Model.
  - `SRS §11.1`: Normalized Telegram Errors.
  - `SRS §11.2`: Database Error Handling.
  - `SRS §11.3`: Backup & Restoration Errors.

## 3. Threat Model & Mitigations

| Threat Vector | Potential Impact | Architectural Mitigation |
|---|---|---|
| **Stolen Telegram Session** | Full compromise of user's Telegram communications. | Session strings are encrypted via **AES-256-GCM** using environment master key. Never stored in plaintext, never written to logs, never backed up to Google Drive. |
| **Message History Leaks** | Privacy violation; non-compliance with SRS invariant. | Zero database tables exist for messages. Winston logger filters out message text. Transient memory is purged upon request completion. |
| **Cross-Account UUID Tampering** | Malicious access to another user's private CRM notes. | All database queries strictly scope rows with `WHERE telegram_account_id = :sessionAccountId`. Composite unique keys enforce separation. |
| **Malicious URL Schemes in Social Links** | Stored XSS attack via `javascript:` or `data:` URLs. | Backend input validation strictly allows only `https://` and `http://` URLs. |
| **Backup Corruption / Ransom** | Loss of user's personal CRM knowledge base. | Backups are encrypted at rest with AES-256-GCM, schema-validated before import, and restored inside single atomic transactions. |
| **MTProto Flood Ban** | Temporary or permanent account restriction by Telegram. | Throttling queues, bounded concurrency, explicit backoff on `FLOOD_WAIT`, and UI countdown timer. |

## 4. Logging & Privacy Rules
The Winston/Pino logger enforces strict redaction middleware. The following keys are **strictly forbidden** from log output:
- `text`, `caption`, `message`
- `sessionString`, `authKey`, `apiHash`
- `password`, `code`, `phoneCodeHash`
- `refreshToken`, `accessToken`, `encryptionKey`
- `notes` (unless explicitly enabled under scoped debug mode)

## 5. Universal Error Taxonomy & Error Codes

Every failed request MUST return HTTP status with the universal failure envelope:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable English / Persian description",
    "fields": {
      "fieldKey": "Specific field validation message"
    }
  }
}
```

### Standardized Error Codes:

| Error Code | HTTP Status | Trigger Condition |
|---|---|---|
| `AUTH_REQUIRED` | 401 | Telegram session is missing or unauthenticated. |
| `SESSION_INVALID` | 401 | Telegram revoked session remotely; re-login required. |
| `FORBIDDEN` | 403 | Attempt to access resource owned by another account. |
| `ENTITY_NOT_FOUND` | 404 | Telegram entity or custom profile does not exist. |
| `VALIDATION_FAILED` | 400 | Zod / DTO schema validation failed on request body. |
| `FLOOD_WAIT` | 429 | Telegram MTProto rate limit triggered. Fields include `seconds`. |
| `TELEGRAM_UNAVAILABLE` | 503 | Telegram DC is unreachable or experiencing outage. |
| `DRIVE_AUTH_EXPIRED` | 401 | Google OAuth token expired or revoked. |
| `BACKUP_CORRUPTED` | 422 | Downloaded backup file failed schema validation. |
| `BACKUP_DECRYPT_FAILED`| 400 | Invalid decryption password provided by user. |
| `INTERNAL_ERROR` | 500 | Unhandled exception (stack trace redacted from client). |

## 6. Verification Checklist
- [x] Automated security scan verifies all endpoints require authenticated session guard.
- [x] Logger output test confirms no sensitive tokens or message texts are printed.
- [x] Rate limit handler correctly transforms `FLOOD_WAIT_300` into a 429 response envelope.
