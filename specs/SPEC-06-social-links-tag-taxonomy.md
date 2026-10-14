# SPEC-06: Social Links & Tag Taxonomy System

## 1. Domain Overview & Purpose
This specification defines the relational extensions for custom profiles:
1. **Social Media Links:** An arbitrary number of external web links (e.g., LinkedIn, GitHub, X, Instagram, Personal Portfolio) associated with an entity.
2. **Tag Taxonomy:** A reusable, account-scoped tag system with color tokens and filtering capabilities across conversations.

## 2. Requirements Traceability
- **SRS Requirements:**
  - `FR-PROFILE-007`: Multi-link external social accounts with label and description.
  - `FR-PROFILE-009`: Reusable personal tags (Client, Friend, Lead, VIP, etc.).
  - `SRS §7.5`: Table `profile_social_links`.
  - `SRS §7.6`: Table `tags`.
  - `SRS §7.7`: Table `profile_tags` junction table.
  - `SRS §8.4`: Social link REST endpoints.
  - `SRS §8.5`: Tag taxonomy REST endpoints.

## 3. Data Model & Schemas

### 3.1 Table: `profile_social_links`
```sql
CREATE TABLE profile_social_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_profile_id UUID NOT NULL REFERENCES custom_profiles(id) ON DELETE CASCADE,
    label VARCHAR(64) NOT NULL,
    url TEXT NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_social_links_profile ON profile_social_links(custom_profile_id);
```

### 3.2 Table: `tags`
```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_account_id UUID NOT NULL REFERENCES telegram_accounts(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    color VARCHAR(32) DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_account_tag_name UNIQUE (telegram_account_id, name)
);

CREATE INDEX idx_tags_account ON tags(telegram_account_id);
```

### 3.3 Table: `profile_tags` (Junction)
```sql
CREATE TABLE profile_tags (
    custom_profile_id UUID NOT NULL REFERENCES custom_profiles(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (custom_profile_id, tag_id)
);

CREATE INDEX idx_profile_tags_tag ON profile_tags(tag_id);
```

## 4. API Endpoints & Contracts

### 4.1 Social Links API
- `POST /api/backend/profiles/:profileId/social-links`
  - Request: `{ "label": "GitHub", "url": "https://github.com/ehsan", "description": "Open source work" }`
  - Response: `{ "success": true, "data": { ...socialLink } }`
- `PATCH /api/backend/profiles/:profileId/social-links/:linkId`
  - Request: Partial link fields.
- `DELETE /api/backend/profiles/:profileId/social-links/:linkId`
  - Response: `{ "success": true, "data": { "id": "..." } }`

### 4.2 Tag Taxonomy API
- `GET /api/backend/tags`
  - Response: List of all reusable tags for current account with profile counts.
- `POST /api/backend/tags`
  - Request: `{ "name": "VIP Client", "color": "#10B981" }`
  - Response: `{ "success": true, "data": { ...tag } }`
- `PUT /api/backend/profiles/:profileId/tags`
  - Request: `{ "tagIds": ["uuid-1", "uuid-2"] }`
  - Behavior: Replaces tag associations for the given profile inside a single database transaction.

## 5. Security & Validation Invariants
1. **URL Scheme Whitelist:** Only `http://` and `https://` protocols are valid. Reject `javascript:`, `data:`, or `file:`.
2. **Tag Name Normalization:** Tag names are trimmed and compared case-insensitively during creation to prevent duplicates like `"Client"` and `"client"`.
3. **Cascading Safety:** Deleting a tag removes all its associations from `profile_tags` but leaves all `custom_profiles` unharmed.

## 6. Verification Checklist
- [x] Attempting to insert an invalid URL (e.g. `javascript:alert(1)`) fails backend validation with 400.
- [x] Deleting a profile automatically cascades to its `profile_social_links` without orphaned rows.
- [x] Attaching tags across accounts is rejected by authorization verification.
