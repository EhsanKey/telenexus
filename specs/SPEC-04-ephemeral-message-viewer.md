# SPEC-04: Ephemeral Message Viewer & Media Indicator Engine

## 1. Domain Overview & Purpose
SOURCE OF TRUTH functions as a privacy-centric conversation browser. Messages are streamed directly from Telegram MTProto into transient application memory and rendered in the browser. 

**This specification enforces the non-negotiable architectural invariant: Zero Message Persistence.** Under no circumstances may Telegram messages or media ever be saved to Neon PostgreSQL, disk storage, application log files, or local browser storage.

## 2. Requirements Traceability
- **SRS Requirements:**
  - `FR-MSG-001`: Live Message Retrieval on demand via MTProto.
  - `FR-MSG-002`: Strict prohibition of message persistence in PostgreSQL.
  - `FR-MSG-003`: Text & caption rendering with sender and date separators.
  - `FR-MSG-004`: Media type classification indicators (`[Photo]`, `[Video]`, etc.).
  - `FR-MSG-005`: Empty caption fallback.
  - `FR-MSG-006`: History pagination & cursor-based incremental loading.
  - `FR-MSG-007`: Loading, empty, and rate-limited UI states.
  - `FR-MSG-008`: Zero hidden persistence in browser storage, logs, or analytics.
  - `SRS §12.3`: Mandatory automated test suite proving non-persistence.

## 3. Ephemeral Architecture & Data Flow

```text
┌─────────────────┐           ┌───────────────────┐           ┌─────────────────┐
│ Next.js Client  │           │  Node.js Backend  │           │ Telegram Cloud  │
│  (React State)  │           │ (GramJS in-memory)│           │    (MTProto)    │
└────────┬────────┘           └─────────┬─────────┘           └────────┬────────┘
         │                              │                              │
         │ GET /api/backend/messages    │                              │
         │─────────────────────────────>│                              │
         │                              │ client.getMessages(peer, ...)│
         │                              │─────────────────────────────>│
         │                              │                              │
         │                              │ Returns MTProto Message[]    │
         │                              │<─────────────────────────────│
         │                              │                              │
         │ Sanitizes & normalizes DTO   │                              │
         │ (No DB Write Occurs)         │                              │
         │                              │                              │
         │ Universal Envelope Response  │                              │
         │<─────────────────────────────│                              │
         │                              │                              │
Renders in UI DOM                       │                              │
(Discarded on unmount)                  │                              │
```

## 4. Media Classification Taxonomy

Every incoming message is categorized into a lightweight indicator enum without downloading binary payloads:

| Telegram MTProto Media Type | App `mediaType` Enum | UI Visual Placeholder |
|---|---|---|
| `MessageMediaPhoto` | `photo` | `[Photo]` |
| `MessageMediaDocument` (Video mime) | `video` | `[Video]` |
| `MessageMediaDocument` (Voice attribute) | `voice` | `[Voice Message]` |
| `MessageMediaDocument` (Audio mime) | `audio` | `[Audio / Music]` |
| `MessageMediaDocument` (Animated attribute) | `animation` | `[Animation / GIF]` |
| `MessageMediaDocument` (Sticker attribute) | `sticker` | `[Sticker]` |
| `MessageMediaDocument` (Round video) | `video_note` | `[Video Message]` |
| `MessageMediaDocument` (General file) | `document` | `[Document]` |
| `MessageMediaGeo` | `location` | `[Location]` |
| `MessageMediaContact` | `contact` | `[Contact Card]` |
| Unsupported / Other | `unknown` | `[Unsupported Media]` |

### Caption Handling Rules:
1. If `message.text` is present on a media item: Display indicator followed by the sanitized caption text.
2. If `message.text` is absent or empty: Display indicator only without fabricating placeholder text.

## 5. API Contracts

### 5.1 Retrieve Transient Message History
- **Route:** `GET /api/backend/telegram/dialogs/:peerId/messages`
- **Query Parameters:**
  - `limit`: number (1..100, default: 50)
  - `offsetId`: optional message ID for pagination cursor
  - `offsetDate`: optional epoch timestamp
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": [
      {
        "messageId": 140293,
        "sender": {
          "id": "987654321",
          "name": "Farhad Majidi",
          "isOutgoing": false
        },
        "date": "2026-10-13T19:30:00.000Z",
        "text": "Salam, meeting ro move konim?",
        "mediaType": null,
        "replyToMessageId": null
      },
      {
        "messageId": 140294,
        "sender": {
          "id": "123456789",
          "name": "Ehsan",
          "isOutgoing": true
        },
        "date": "2026-10-13T19:32:15.000Z",
        "text": "Check in contract file lotfan",
        "mediaType": "document",
        "replyToMessageId": 140293
      }
    ],
    "meta": {
      "hasMore": true,
      "nextCursor": "140293"
    }
  }
  ```

## 6. Verification & Invariant Safety Checklist (SRS §12.3)
- [x] Database query interceptor test confirms 0 SQL writes during `/api/backend/telegram/dialogs/:peerId/messages`.
- [x] Message text is stripped from all Winston/Pino logger metadata.
- [x] Browser `localStorage` and `sessionStorage` inspections confirm 0 message entities stored.
- [x] Memory leaks: Chat component clears message state upon route unmount.
