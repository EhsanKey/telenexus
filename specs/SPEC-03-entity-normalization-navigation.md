# SPEC-03: Entity Normalization & Conversation Navigation

## 1. Domain Overview & Purpose
Telegram's MTProto model represents conversations using distinct peer entities: Users (`PeerUser`), Basic Groups (`PeerChat`), Supergroups (`PeerChannel`), and Broadcast Channels (`PeerChannel`). 

This specification establishes the canonical peer normalization model, conversation list categorization (All, Private Chats, Groups, Channels, Archived), and safe metadata synchronization without risk of identity mismatch or data corruption.

## 2. Requirements Traceability
- **SRS Requirements:**
  - `FR-CHAT-001`: Conversation Categories (All, Private Chats, Groups, Channels, Archived).
  - `FR-CHAT-002`: Conversation List preview (name, type, username, transient preview, profile indicator).
  - `FR-CHAT-003`: Conversation Selection linked to stable Telegram identifiers.
  - `FR-CHAT-004`: Dialog pagination & incremental loading.
  - `FR-CHAT-005`: Search by name/username in loaded dialogs.
  - `FR-CHAT-006`: Relevant sorting without message archive.
  - `FR-CHAT-007`: Custom profile status indicator.
  - `FR-SYNC-001`: Metadata refresh triggers.
  - `FR-SYNC-002`: Username changes do not overwrite custom profile data.
  - `FR-SYNC-003`: Display name changes do not overwrite custom profile data.
  - `FR-SYNC-004`: Identifier integrity via canonical `telegram_peer_id`.
  - `FR-SYNC-005`: Missing metadata stored as explicit `null`.
  - `FR-SYNC-007`: Duplicate prevention via unique constraint.
  - `FR-SYNC-008`: Synchronization never persists messages.

## 3. Data Model & Entity Normalization

### Table: `telegram_entities`
```sql
CREATE TABLE telegram_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_account_id UUID NOT NULL REFERENCES telegram_accounts(id) ON DELETE CASCADE,
    entity_type VARCHAR(16) NOT NULL CHECK (entity_type IN ('user', 'group', 'channel')),
    telegram_peer_id BIGINT NOT NULL,
    telegram_user_id BIGINT,
    telegram_chat_id BIGINT,
    telegram_access_hash BIGINT,
    telegram_username TEXT,
    telegram_display_name TEXT,
    telegram_public_url TEXT,
    last_synced_at TIMESTAMPTZ,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_account_entity UNIQUE (telegram_account_id, entity_type, telegram_peer_id)
);

CREATE INDEX idx_telegram_entities_account_type ON telegram_entities(telegram_account_id, entity_type);
CREATE INDEX idx_telegram_entities_username ON telegram_entities(telegram_username);
```

### Peer Normalization Algorithm:
1. **User (`PeerUser`):** `entity_type = 'user'`, `telegram_peer_id = userId`, `telegram_user_id = userId`.
2. **Basic Group (`PeerChat`):** `entity_type = 'group'`, `telegram_peer_id = chatId`, `telegram_chat_id = chatId`.
3. **Supergroup (`PeerChannel` where `megagroup = true`):** `entity_type = 'supergroup'`, `telegram_peer_id = channelId`, `telegram_chat_id = channelId`.
4. **Broadcast Channel (`PeerChannel` where `megagroup = false`):** `entity_type = 'channel'`, `telegram_peer_id = channelId`, `telegram_chat_id = channelId`.

## 4. API Contracts

### 4.1 Fetch Categorized Dialogs
- **Route:** `GET /api/backend/telegram/dialogs`
- **Query Parameters:**
  - `category`: `all` | `pv` | `groups` | `supergroups` | `channels` | `archived` (default: `all`)
  - `limit`: number (1..100, default: 30)
  - `page`: number (default: 1)
  - `cursor`: optional pagination token
  - `q`: optional query string for searching name, username, peerId, or tags
  - `tagId`: optional tag ID for filtering conversations by assigned tag
- **Categorization & Zero Data Loss Guarantee:**
  - `all`: All conversations (Direct messages, Groups, Supergroups, Channels, including archived).
  - `pv`: All private user dialogs (including archived users).
  - `groups`: Unified tab combining basic groups and supergroups (including archived groups).
  - `channels`: Broadcast channels (including archived channels).
  - `archived`: Backward-compatible filter for archived-only dialogs.
  - **Invariant:** Archived conversations are **NEVER** hidden or dropped from their respective entity categories.
- **Private Channels & Groups without Username:**
  - Entities without public `@username` are fully supported via numeric `telegram_peer_id`.
  - Full support for attaching custom CRM profiles, notes, tags, company, and phone number.
- **Zero-Flood In-Memory Local Search:**
  - Searching operates strictly over the user's cached dialogs in memory.
  - **Account Safety:** Zero external MTProto API calls are made during search keystrokes, completely eliminating `FLOOD_WAIT` or account blocking risks.
  - **Bilingual Normalization:** Automatically normalizes Persian/Arabic character variants (ی/ي, ک/ك, zero-width joiners) and handle prefixes (`@`).
- **Infinite Scrolling Mechanics:**
  - Front-end registers an `onScroll` listener checking remaining scroll height (< 120px).
  - Fetches page `N + 1` incrementally while `hasMore = true`.
  - Appends deduplicated dialog items seamlessly.
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "7b093284-5f72-46aa-a398-e4b9f2bca530",
        "entityType": "supergroup",
        "telegramPeerId": "987654321",
        "displayName": "TeleNexus Community",
        "username": "telenexus_hub",
        "publicUrl": "https://t.me/telenexus_hub",
        "isArchived": false,
        "customProfile": {
          "id": "e98e2170-07bf-4467-bc5f-149fa861d848",
          "customDisplayName": "Official Supergroup",
          "hasNotes": true,
          "tagsCount": 2,
          "tags": [
            { "id": "tag-1", "name": "VIP", "color": "#10B981" }
          ]
        },
        "transientPreview": {
          "text": "Salam coach, tamrin saat chandeh?",
          "date": 1776102340,
          "unreadCount": 0
        }
      }
    ],
    "meta": {
      "total": 45,
      "page": 1,
      "limit": 30,
      "totalPages": 2,
      "nextCursor": null,
      "hasMore": true
    }
  }
  ```

### 4.2 Refresh Entity Metadata
- **Route:** `POST /api/backend/telegram/refresh/:entityId`
- **Description:** Pulls fresh peer metadata (display name, username, photo/hash) directly from MTProto.
- **Contract Guarantee:** Updates `telegram_entities` cache. NEVER modifies `custom_profiles.custom_display_name` or `custom_profiles.notes`.

## 5. Fallback & Formatting Invariants
- Display Name Resolution:
  ```typescript
  export function resolveDisplayName(entity: {
    telegramDisplayName: string | null;
    customProfile?: { customDisplayName: string | null } | null;
  }): string {
    if (entity.customProfile?.customDisplayName?.trim()) {
      return entity.customProfile.customDisplayName.trim();
    }
    return entity.telegramDisplayName?.trim() || "Telegram User";
  }
  ```

## 6. Verification Checklist
- [x] Dialog list items contain transient previews without touching the database.
- [x] Changing a contact's Telegram username preserves their custom notes and tags.
- [x] Composite unique constraint prevents duplicate entities for the same Telegram peer.
- [x] Archived dialogs are retained under their corresponding entity category (PV, Groups, Channels).
- [x] Private groups and channels without public usernames are fully listed, searchable, and support CRM profiles.
- [x] Local dialog search operates in-memory with zero risk of Telegram MTProto rate-limiting or account penalties.
