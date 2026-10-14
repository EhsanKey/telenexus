# SPEC-05: Custom Profile & Personal Metadata Management

## 1. Domain Overview & Purpose
The core value proposition of SOURCE OF TRUTH is turning Telegram into a structured personal CRM. While Telegram frequently overwrites display names or lacks private contextual data, custom profiles provide a permanent, editable metadata repository attached to any Telegram entity.

## 2. Requirements Traceability
- **SRS Requirements:**
  - `FR-PROFILE-001`: One custom profile per Telegram entity.
  - `FR-PROFILE-002`: Profile creation without sending a message.
  - `FR-PROFILE-003`: Full CRUD capabilities for user-managed metadata.
  - `FR-PROFILE-004`: Supported user-managed fields (name, phone, company, role, relationship, notes, reason).
  - `FR-PROFILE-005`: Separate custom and original names with fallback logic.
  - `FR-PROFILE-006`: Manual phone numbers clearly marked as unverified by Telegram.
  - `FR-PROFILE-008`: Multiline notes preservation.
  - `FR-PROFILE-010`: Profile deletion without deleting Telegram conversations or messages.
  - `FR-PROFILE-011`: Unsaved changes warning.
  - `FR-PROFILE-012`: Immediate save feedback and optimistic/transactional safety.
  - `FR-PROFILE-013`: Availability during Telegram outages.
  - `FR-PROFILE-014`: Retention even if entity is removed from Telegram dialog list.

## 3. Data Model & Schema Definition

### Table: `custom_profiles`
```sql
CREATE TABLE custom_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_account_id UUID NOT NULL REFERENCES telegram_accounts(id) ON DELETE CASCADE,
    telegram_entity_id UUID NOT NULL REFERENCES telegram_entities(id) ON DELETE CASCADE,
    telegram_display_name VARCHAR(255),
    custom_display_name VARCHAR(255),
    phone_number VARCHAR(32),
    company VARCHAR(255),
    job_title VARCHAR(255),
    relationship_type VARCHAR(100),
    reason_for_joining TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_account_entity_profile UNIQUE (telegram_account_id, telegram_entity_id)
);

CREATE INDEX idx_custom_profiles_account ON custom_profiles(telegram_account_id);
CREATE INDEX idx_custom_profiles_entity ON custom_profiles(telegram_entity_id);
```

## 4. API Endpoints & Contracts

### 4.1 Fetch Profile by Entity ID
- **Route:** `GET /api/backend/profiles/:entityId`
- **Response DTO (Found):**
  ```json
  {
    "success": true,
    "data": {
      "id": "e98e2170-07bf-4467-bc5f-149fa861d848",
      "telegramEntityId": "7b093284-5f72-46aa-a398-e4b9f2bca530",
      "telegramDisplayName": "Farhad Majidi",
      "customDisplayName": "Coach Farhad",
      "phoneNumber": "+989121112233",
      "company": "Esteghlal FC",
      "jobTitle": "Head Coach",
      "relationshipType": "Professional / Mentor",
      "reasonForJoining": "Coordinating weekly tactical review",
      "notes": "Best time to call is mornings before 10 AM.",
      "socialLinks": [],
      "tags": [],
      "createdAt": "2026-10-10T12:00:00.000Z",
      "updatedAt": "2026-10-13T18:40:00.000Z"
    }
  }
  ```
- **Response DTO (Not Found):**
  ```json
  {
    "success": true,
    "data": null
  }
  ```

### 4.2 Create Custom Profile
- **Route:** `POST /api/backend/profiles`
- **Request DTO:**
  ```json
  {
    "telegramEntityId": "7b093284-5f72-46aa-a398-e4b9f2bca530",
    "telegramPeerId": "987654321",
    "telegramDisplayName": "Farhad Majidi",
    "username": "farhad7",
    "entityType": "user",
    "customDisplayName": "Coach Farhad",
    "phoneNumber": "+989121112233",
    "company": "Esteghlal FC",
    "jobTitle": "Head Coach",
    "relationshipType": "Professional",
    "reasonForJoining": null,
    "notes": "First contact established."
  }
  ```
- **Response DTO:** `{ "success": true, "data": { ...createdProfile } }`
- **Side Effect:** Automatically triggers unidirectional background Google Drive Excel update (`TeleNexus-CRM-Contacts.xlsx`).

### 4.3 Update Custom Profile
- **Route:** `PATCH /api/backend/profiles/:profileId`
- **Request DTO:** Partial fields matching editable profile properties (including optional `telegramDisplayName`, `telegramPeerId`, `username`, `entityType`).
- **Response DTO:** `{ "success": true, "data": { ...updatedProfile } }`
- **Side Effect:** Automatically triggers background Google Drive Excel update.

### 4.4 Delete Custom Profile
- **Route:** `DELETE /api/backend/profiles/:profileId`
- **Behavior:** Transactionally deletes `custom_profiles`, associated `profile_social_links`, and `profile_tags` junction rows. **INVARIANT:** `telegram_entities` and MTProto dialogs are NEVER deleted. Automatically triggers background Google Drive Excel update.

### 4.5 Multiple & Fragment Usernames Resolution
- Supports Telegram MTProto fragment and collectible usernames (`rawEntity.usernames`). The system selects active non-editable or active username first as the canonical default username.

### 4.6 Dynamic Metadata Sync
- When messages are viewed (`/telegram/messages/:peerId`) or an entity is refreshed (`/telegram/refresh/:entityId`), if the peer's username or entity type has updated, it is dynamically reflected in the custom profile without overwriting custom CRM notes or tags.

## 5. Business Logic & Constraints
1. **Ownership Enforcement:** Queries must verify `telegram_account_id = currentAccountId`.
2. **Phone Number Integrity:** Phone numbers entered manually are labeled `Personal CRM Entry (Unverified by Telegram)`.
3. **Multiline Text Support:** Notes preserve newline characters (`\n`) and markdown styling without script injection (`XSS` sanitized).
4. **Original vs Custom Name Segregation:** Original Telegram names are stored in `telegram_display_name` and custom names in `custom_display_name`, ensuring full provenance.

## 6. Verification Checklist
- [x] Database enforces unique constraint preventing 2 profiles for same entity in an account.
- [x] Deleting a profile leaves the Telegram conversation intact in the UI.
- [x] Editing notes retains formatting and updates `updated_at`.
- [x] Original Telegram display title (user, channel, or group name) is preserved alongside custom name.
- [x] Collectible / fragment usernames resolve to active default username.
