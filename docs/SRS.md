# TeleNexus (formerly SOURCE OF TRUTH)

## Software Requirements Specification (SRS)

**Product:** TeleNexus — Telegram Personal Intelligence & Contact Management Platform  
**Document Type:** Software Requirements Specification  
**Document Version:** 1.1.0  
**Status:** Approved Baseline  
**Language:** English  
**Frontend:** Next.js + TypeScript  
**Backend:** Node.js + TypeScript  
**Primary Database:** Neon PostgreSQL  
**External Integrations:** Telegram MTProto API, Google Drive API  
**Optional Integration:** Google Sheets API

---

# 1. Executive Summary

## 1.1 Product Overview

**TeleNexus** is a personal Telegram companion and CRM platform designed to help users organize, identify, and manage contextual information about their Telegram contacts, private conversations, groups, supergroups, and channels.

The application connects to a user's existing Telegram account via native MTProto and provides a custom interface for browsing Telegram conversations. Users can view their accessible private chats, groups, supergroups, and channels, open individual conversations, and inspect message history transiently.

Unlike the official Telegram client, TeleNexus introduces a dedicated, editable custom profile for every relevant Telegram user, private conversation, group, supergroup, and channel.

These custom profiles allow users to maintain information that Telegram does not provide as a complete personal knowledge-management system, including:

- Personal notes and contextual information.
- Custom names and labels.
- Manually recorded phone numbers.
- Reasons for joining a group or channel.
- Professional and personal relationship details.
- External social media and website links.
- Tags and categorization.
- Other user-defined metadata.

The application's primary purpose is not to reproduce Telegram's entire functionality. Its purpose is to transform Telegram into a structured personal contact and conversation-management environment.

## 1.2 Core Architectural Principle

**Telegram owns Telegram data. SOURCE OF TRUTH owns user-created metadata.**

The application must never persist Telegram message history in its own database.

Telegram messages are retrieved through Telegram's APIs and displayed in the user interface. They are not stored as application records.

The application's database stores only the information required to create, maintain, associate, and retrieve custom profiles and related user-managed metadata.

Telegram-derived identifiers and descriptive metadata may be cached only when necessary for reliable profile association, synchronization, and user experience. Such caching must be explicitly controlled and must not become a mechanism for storing message history.

## 1.3 Product Goals

1. Display accessible Telegram private chats, groups, and channels in separate categories.
2. Allow users to open conversations and browse their available Telegram message history.
3. Provide an editable custom profile for each relevant Telegram entity.
4. Keep custom profiles associated with the correct Telegram entity even when usernames or display names change.
5. Keep user-created metadata independent of Telegram message storage.
6. Support secure persistence through Neon PostgreSQL.
7. Support backup and restoration of custom metadata through Google Drive.
8. Provide a clean, responsive, and efficient user interface.
9. Minimize unnecessary API calls and database storage.
10. Establish a maintainable architecture for future extensions.

## 1.4 Non-Goals

The initial release will not implement:

- A complete replacement for every Telegram feature.
- Persistent storage of Telegram messages.
- Persistent storage of message attachments or media files.
- Downloading or archiving photos, videos, audio files, or documents.
- A Telegram message search index maintained in the application database.
- A bot-based substitute for a personal Telegram account.
- Automated scraping of Telegram users' private information.
- A multi-user CRM or team collaboration system.
- Automated synchronization of arbitrary social media profiles.
- Sending, editing, deleting, or forwarding Telegram messages unless explicitly introduced in a future approved release.

---

# 2. Scope and Functional Boundaries

## 2.1 Supported Telegram Entity Types

The application must support three primary categories.

### A. Private Conversations (PV)

A private conversation is a one-to-one Telegram conversation associated with another Telegram user.

The application must display available information such as:

- Telegram user ID.
- Telegram username, if available.
- Current display name.
- Conversation identifier where applicable.
- Conversation message history retrieved from Telegram.
- Custom profile associated with the user or conversation.

### B. Groups

The application must display basic groups accessible to the connected Telegram account.

The interface should support:

- Group title.
- Telegram chat identifier.
- Username or public link, if available.
- Available conversation history.
- Custom group profile.
- Personal notes and group-specific metadata.

### C. Supergroups

Supergroups (`Channel` entity with `megagroup = true` in MTProto) are recognized as distinct large-scale community hubs.

The interface provides:
- Dedicated category filter for Supergroups (`category: 'supergroups'`).
- Supergroup avatar icon (`SG`) and badge indicator in dialog listings.
- Custom profiles and metadata retention.
- Numeric peer ID and username extraction.

### D. Channels

The application must display channels accessible to the connected account.

The interface should support:

- Channel title.
- Telegram channel identifier.
- Username or public link, if available.
- Available channel message history.
- Custom channel profile.
- Personal notes, ownership context, and classification.

The application must not assume that every channel is public or that every channel has a username.

## 2.2 Entity Visibility

The application must respect the Telegram account's actual access permissions.

It must not promise access to:

- Private conversations that are not accessible to the account.
- Historical messages that Telegram does not make available.
- Deleted messages that are no longer accessible.
- Hidden phone numbers.
- Restricted content that the account is not permitted to access.
- Data that Telegram does not expose through the relevant API methods.

## 2.3 Single-Account Baseline

Version 1.0 is designed for one authenticated Telegram account per application workspace.

The data model should nevertheless be designed so that a future multi-account implementation can be added without fundamentally restructuring the database.

---

# 3. Technology Stack

## 3.1 Frontend

**Next.js + TypeScript**

Recommended responsibilities:

- Application layout and navigation.
- Conversation lists.
- Message history presentation.
- Custom profile forms.
- Search and filtering.
- Profile editing and validation.
- Google Drive backup controls.
- Authentication and session-related user interfaces.
- Responsive desktop and mobile layouts.

Recommended supporting technologies:

- React.
- Tailwind CSS.
- A consistent component library such as shadcn/ui.
- React Hook Form for complex forms.
- Zod for shared input validation.
- TanStack Query or an equivalent data-fetching strategy where appropriate.

These supporting libraries are recommendations, not mandatory requirements.

## 3.2 Backend

**Node.js + TypeScript**

The backend is responsible for:

- Telegram MTProto connectivity.
- Telegram account authorization.
- Telegram conversation retrieval.
- Telegram message history retrieval.
- Processing Telegram updates.
- Custom profile CRUD operations.
- Database access.
- Google Drive integration.
- Input validation and authorization.
- Rate-limit handling and error normalization.
- Backup creation and restoration.
- Secure management of Telegram session credentials.

The Telegram integration should use a maintained MTProto client library compatible with Node.js, such as GramJS, after verifying its current compatibility and maintenance status.

Telegram Bot API alone is insufficient for the intended personal-account conversation access.

## 3.3 Database

**Neon PostgreSQL**

The database must store custom profiles and related application metadata.

It must not store Telegram message history.

Recommended database access technology:

- Drizzle ORM or Prisma.
- SQL migrations maintained in version control.
- PostgreSQL constraints and indexes.
- Transactional updates for profile changes and backup restoration.

The selected ORM must support Neon PostgreSQL and the deployment environment.

## 3.4 External Integrations

### Telegram MTProto API

Used for:

- User authentication.
- Retrieving accessible dialogs.
- Retrieving conversation history.
- Obtaining Telegram entity metadata.
- Receiving updates when supported and practical.
- Refreshing identifiers and display metadata.

### Google Drive API

Used for:

- Creating metadata backups.
- Listing application-managed backups.
- Downloading a selected backup.
- Restoring custom profile data.
- Managing application backup files.

### Google Sheets API

Optional and not required for the core application.

Potential future uses include:

- Exporting custom profile records.
- Reviewing contacts in a spreadsheet.
- Generating reports.
- Importing structured metadata under controlled validation.

Google Sheets must not be treated as the primary transactional database.

---

# 4. System Architecture

## 4.1 Logical Architecture

The system consists of five primary components.

### Component 1: Next.js Application

Responsible for the user experience.

It displays Telegram entities, message history, custom profiles, and application settings.

### Component 2: Node.js Application Backend

Acts as the secure boundary between the frontend, Telegram, PostgreSQL, and Google Drive.

The frontend must never directly access Telegram session secrets, database credentials, or Google OAuth refresh tokens.

### Component 3: Telegram Integration Service

Maintains the authorized Telegram session and retrieves Telegram-owned data.

The service must distinguish between Telegram data and application-owned metadata.

### Component 4: Custom Metadata Database

Stores custom profiles, tags, social links, application settings, and backup bookkeeping.

### Component 5: Google Drive Backup Service

Creates and restores encrypted or otherwise appropriately protected application backups.

## 4.2 Data Flow

The intended interaction is:

1. The user opens SOURCE OF TRUTH.
2. The frontend requests the list of accessible Telegram conversations.
3. The backend retrieves the relevant information from Telegram.
4. The frontend displays the conversation list.
5. The user opens a conversation.
6. The backend retrieves the available message history directly from Telegram.
7. The frontend renders messages without persisting them in PostgreSQL.
8. The frontend separately requests the custom profile from PostgreSQL.
9. The user edits the profile.
10. The backend validates and persists the custom profile in PostgreSQL.
11. When requested, the backup service exports eligible application metadata to Google Drive.

Telegram retrieval and custom profile retrieval must be independent operations.

A temporary Telegram API failure must not prevent a previously saved custom profile from being displayed.

## 4.3 Source-of-Truth Matrix

| Data                  | Authoritative source         | Persistent in PostgreSQL?                   |
| --------------------- | ---------------------------- | ------------------------------------------- |
| Telegram messages     | Telegram                     | No                                          |
| Message captions      | Telegram                     | No                                          |
| Message media type    | Telegram                     | No, except transient in-memory display data |
| Telegram user ID      | Telegram                     | May be cached as identity metadata          |
| Telegram chat ID      | Telegram                     | May be cached as identity metadata          |
| Telegram username     | Telegram                     | Optional refreshable cache                  |
| Telegram display name | Telegram                     | Optional refreshable cache                  |
| Custom display name   | User                         | Yes                                         |
| Personal notes        | User                         | Yes                                         |
| Custom phone number   | User                         | Yes                                         |
| Social media links    | User                         | Yes                                         |
| Personal tags         | User                         | Yes                                         |
| Reason for joining    | User                         | Yes                                         |
| Backup metadata       | Application                  | Yes, when needed                            |
| Telegram session      | Telegram authorization state | Only if securely persisted and required     |

---

# 5. Functional Requirements

Requirements use the following identifiers:

- FR: Functional Requirement.
- NFR: Non-Functional Requirement.
- DR: Data Requirement.
- SEC: Security Requirement.

## 5.1 Authentication and Telegram Connection

### FR-AUTH-001: Connect Telegram Account

The user must be able to connect an existing Telegram account.

The connection flow must support the authentication requirements imposed by Telegram, including verification codes and two-step verification when required.

### FR-AUTH-002: Session Persistence

The backend should maintain an authorized Telegram session so the user does not have to authenticate on every page load.

Session persistence must use encrypted or otherwise appropriately protected storage.

### FR-AUTH-003: Session Status

The interface must show one of the following states:

- Connected.
- Connecting.
- Authentication required.
- Connection interrupted.
- Session expired or invalid.
- Telegram service temporarily unavailable.

### FR-AUTH-004: Reauthorization

When a Telegram session becomes invalid, the application must provide a clear reauthorization flow.

### FR-AUTH-005: Account Disconnect

The user must be able to disconnect the Telegram account.

The application must explain the consequences for locally stored session credentials and existing custom metadata.

Disconnecting Telegram must not automatically delete custom profiles.

### FR-AUTH-006: API Credentials

Telegram API ID and API Hash must be stored in backend environment configuration or an appropriate secrets-management service.

They must never be exposed in frontend bundles or browser-accessible responses.

### FR-AUTH-007: Login Using Any Supported Phone Number

The application must allow the user to authenticate a Telegram account using any phone number supported by Telegram's authentication system.

The application must not hardcode or restrict authentication to a single predefined phone number or country code.

The phone number must be entered using an international format, with country-code selection and appropriate validation.

The application must rely on Telegram to determine whether the phone number is eligible for authentication.

### FR-AUTH-008: Verification Code Entry

After the user submits a phone number, the application must initiate Telegram's authentication flow and display an input field for the verification code when requested.

The interface must handle the possibility that Telegram delivers the code through another authorized Telegram session, SMS, or another method supported by the current authentication flow.

The application must display appropriate error messages for invalid, expired, or rejected codes.

The verification code must be submitted securely to the backend and must not be stored in the application database or logs.

### FR-AUTH-009: Two-Step Verification Password

If Telegram requests a Two-Step Verification password, the application must display a dedicated password input field.

The user must be able to submit the password to complete authentication.

The password field must be masked, and the password must not be persisted in the application database, browser storage, application logs, or backups.

If authentication fails, the application must display an appropriate error and allow the user to retry.

### FR-AUTH-010: Dynamic Authentication Steps

The authentication interface must follow the authentication steps requested by Telegram rather than assuming a fixed sequence.

Depending on the account and Telegram's response, the flow may require a phone number, verification code, Two-Step Verification password, or another supported authentication step.

### FR-AUTH-011: Authentication Cancellation

The user must be able to cancel an incomplete authentication attempt.

Cancellation must not delete existing custom profiles or metadata.

### FR-AUTH-012: Authentication Rate Limits

The application must handle Telegram authentication rate limits and temporary restrictions without repeatedly submitting codes or passwords.

The user must receive clear feedback when they need to wait before retrying.

### FR-AUTH-013: Account Identity Confirmation

After successful authentication, the application should display the authenticated Telegram account's available identity information so the user can confirm that the correct account was connected.

### FR-AUTH-014: Session Reuse & Stateless Container Resilience

After successful authentication, the backend must securely persist the authorized Telegram session encrypted at rest using AES-256-GCM.
To guarantee session survival across serverless and ephemeral container environments (such as Render.com free tier sleep/wake cycles), the encrypted session string must be persisted to the Neon PostgreSQL database (`telegram_sessions` table) rather than relying exclusively on ephemeral container filesystems (`fs`).
On backend initialization or container wake-up, the system must automatically restore and verify the active session without requiring user re-authentication.
Additionally, the backend must support optional SOCKS5/HTTP proxy configuration (`TELEGRAM_PROXY_HOST`, `TELEGRAM_PROXY_PORT`) to ensure continuous MTProto connectivity in restricted or filtered network environments.

---

## 5.2 Conversation Navigation

### FR-CHAT-001: Unified Conversation Categories & Zero Data Loss

The application must provide clean navigation categories for the user's conversations:

- All conversations (`all`).
- Private chats (`pv`).
- Groups (`groups`) — unified category combining basic groups and supergroups.
- Channels (`channels`).

**Zero Data Loss Invariant:** Archived conversations must never be dropped or hidden from their entity categories. Archived user chats remain listed under Private Chats, archived groups under Groups, and archived channels under Channels, with an explicit archived status indicator.

### FR-CHAT-002: Conversation List & Private Entities

Each conversation item should display the available:

- Name / Title (with fallback to entity type and ID for uncaptioned entities).
- Entity type (`user`, `group`, `supergroup`, `channel`).
- Username, when available (or explicit Private Group/Channel/Contact badge when absent).
- Stable numeric `telegram_peer_id`.
- Latest message preview, if retrieved transiently from Telegram.
- Last message time, if available.
- Custom CRM profile indicator and assigned tag chips.

Private groups, private channels, and contacts without public `@username` handles must be fully supported, selectable, and support attaching custom CRM metadata.

Latest message previews must exist only in transient application state and must not be persisted in PostgreSQL.

### FR-CHAT-003: Conversation Selection

Selecting an entity must open its conversation view.

The selected conversation must be linked to the correct custom profile using stable Telegram identifiers.

### FR-CHAT-004: Pagination

Conversation lists must support pagination, incremental loading, or another approach appropriate to Telegram's available API methods.

The implementation must not assume all dialogs can be retrieved in a single request.

### FR-CHAT-005: Zero-Flood In-Memory Local Search

The application must support searching conversation metadata by display name, custom name, username, peer ID, and tags:

- **Strictly Local to User's Dialogs:** The search must operate exclusively over the user's own loaded channels, groups, and direct messages. Under no circumstances should the system initiate unconstrained global Telegram search queries, ensuring zero risk of Telegram MTProto rate-limiting (`FLOOD_WAIT`) or account penalties.
- **Bilingual & Handle Normalization:** Normalizes `@` username prefixes and Persian/Arabic character variants (such as `ی`/`ي` and `ک`/`ك`).
- **No Message Persistence:** This search must operate strictly in-memory without persisting chat messages to Neon PostgreSQL.

### FR-CHAT-006: Sorting

The interface should support sorting by the most relevant available Telegram ordering, with optional local presentation preferences.

Sorting preferences must not require persistent message storage.

### FR-CHAT-007: Custom Profile Indicator

The conversation list should distinguish between:

- No custom profile created.
- Custom profile exists.
- Custom profile contains notes or additional metadata.

The indicator must not reveal private notes in the conversation list unless explicitly configured.

---

## 5.3 Message History Viewer

### FR-MSG-001: Live Message Retrieval

When a conversation is opened, the backend must retrieve the available history directly from Telegram.

### FR-MSG-002: No Message Persistence

The application must not insert, update, or delete Telegram message records in PostgreSQL.

This prohibition includes:

- Message text.
- Captions.
- Message IDs stored as a message archive.
- Sender information associated with individual messages.
- Message timestamps associated with individual messages.
- Media references associated with individual messages.
- Cached message history tables.

Message data may exist temporarily in application memory or browser state to render the current interface.

### FR-MSG-003: Message Rendering

The viewer must render supported textual message information, including:

- Message text.
- Caption.
- Sender name where available.
- Message date and time.
- Basic reply context when practical.
- Media type indicators.

### FR-MSG-004: Media Indicators

Media files do not need to be downloaded or rendered.

The interface should identify common media types, including:

- Photo.
- Video.
- Audio.
- Voice message.
- Music track.
- Document.
- Animation.
- Sticker.
- Video message.
- Other supported media.
- Unknown or unsupported media.

When a caption exists, it must be displayed as text.

### FR-MSG-005: Empty Captions

If a media message has no caption, the interface must display the media type without inventing a description.

### FR-MSG-006: History Pagination

The viewer must retrieve older messages incrementally.

A failed request must not corrupt the currently displayed conversation.

### FR-MSG-007: Loading and Error States

The interface must support:

- Loading history.
- Empty conversation.
- No accessible history.
- Rate limiting.
- Temporary connection failure.
- Permission or access errors.
- Retry actions where appropriate.

### FR-MSG-008: No Hidden Persistence

Message content must not be stored in persistent browser storage, application analytics, debugging logs, server logs, or backups.

Transient in-memory display state is permitted.

---

## 5.4 Custom Profile Management

### FR-PROFILE-001: One Profile per Entity

The application must support a custom profile for each relevant Telegram entity.

The profile must be associated with a stable entity identifier.

### FR-PROFILE-002: Profile Creation

When a user opens an entity without an existing profile, the application must offer the option to create one.

Profile creation must not require a message to be sent.

### FR-PROFILE-003: Editable Profile

Every custom profile must support creating, reading, updating, and deleting user-managed fields.

### FR-PROFILE-004: Profile Fields

The initial profile should support:

**Telegram-derived identity fields**

- Entity type.
- Telegram entity ID.
- Telegram username, if available.
- Telegram display name.
- Available public URL.
- Last successful metadata refresh time, when tracked.

**User-managed fields**

- Custom display name.
- Personal notes.
- Custom phone number.
- Organization or company.
- Job title.
- Relationship description.
- Reason for joining a group or channel.
- Source or context of the relationship.
- Personal tags.
- Social media links.
- Additional user-defined fields, if introduced through an approved extension.

### FR-PROFILE-005: Original and Custom Names

The original Telegram name and custom display name must be stored separately.

Changing a custom display name must not modify the actual Telegram name.

If the custom display name is empty, the interface must fall back to the latest available Telegram name.

### FR-PROFILE-006: Manual Phone Numbers

The user must be able to record a phone number manually.

The application must not imply that the number has been verified by Telegram unless a genuine verification mechanism exists.

A phone number recorded by the user must remain distinguishable from a phone number retrieved through an authorized Telegram response.

### FR-PROFILE-007: Social Links

Users must be able to add multiple external links.

Supported examples include:

- LinkedIn.
- Instagram.
- Personal website.
- Personal Telegram channel.
- YouTube.
- X.
- GitHub.
- Other URLs.

Each link should support a label, URL, and optional description.

### FR-PROFILE-008: Notes

The notes field must support multiline text.

The interface should preserve line breaks and provide a reasonable text-length limit.

### FR-PROFILE-009: Tags

Users should be able to add, remove, and reuse personal tags.

Examples include:

- Client.
- Developer.
- Friend.
- Lead.
- Important.
- Research.
- News.
- Project Alpha.

Tags are application metadata, not Telegram labels.

### FR-PROFILE-010: Profile Deletion

Users must be able to delete a custom profile.

Deleting a custom profile must not delete the Telegram entity, conversation, or any Telegram message.

The application must clarify whether profile-associated tags and links will also be deleted.

### FR-PROFILE-011: Unsaved Changes

If the user modifies a profile and attempts to navigate away before saving, the application should warn about unsaved changes.

### FR-PROFILE-012: Save Feedback

After a successful save, the interface must confirm the update.

On failure, the application must preserve the user's unsaved form values and display an actionable error.

### FR-PROFILE-013: Profile Availability

Custom profiles must remain accessible when Telegram is temporarily unavailable.

### FR-PROFILE-014: Entity Removal from Telegram

If a previously accessible Telegram entity disappears from the account's dialog list, the application must not automatically delete its custom profile.

The profile should remain available as an archived or disconnected metadata record until the user chooses to remove it.

---

## 5.5 Telegram Metadata Synchronization

### FR-SYNC-001: Metadata Refresh

The application must refresh Telegram-derived metadata when appropriate.

Examples include:

- Opening a conversation.
- Refreshing the conversation list.
- Receiving a relevant Telegram update.
- Performing a scheduled or manually requested refresh.

### FR-SYNC-002: Username Changes

A username change must update the Telegram-derived username without overwriting the user's custom display name, notes, phone number, or social links.

### FR-SYNC-003: Display Name Changes

A change to the Telegram display name must update the original-name field without overwriting the custom name.

### FR-SYNC-004: Identifier Integrity

Profiles must not be linked solely through usernames or display names.

For private users, the Telegram user ID must be the primary external identity.

For groups and channels, the corresponding Telegram chat identity must be used.

### FR-SYNC-005: Missing Metadata

If Telegram does not provide a username or another field, the application must represent that field as unavailable or null.

It must not fabricate a value.

### FR-SYNC-006: API Rate Limits

The backend must detect and handle Telegram rate-limit responses, including `FLOOD_WAIT`.

It must delay requests as required and avoid uncontrolled retries.

### FR-SYNC-007: Duplicate Prevention

Repeated synchronization must not create duplicate custom profiles for the same Telegram entity within the same account scope.

### FR-SYNC-008: Message Non-Persistence

Metadata synchronization must never become a background message-archiving process.

Only explicitly permitted entity metadata may be persisted.

---

## 5.6 Google Drive Backup and Restoration

### FR-DRIVE-001: Google Account Connection

The user must be able to connect a Google account using an appropriate OAuth 2.0 flow.

### FR-DRIVE-002: Least-Privilege Access

The application should request the narrowest practical Google Drive permission, preferably an application-specific file scope such as `drive.file` when it meets the requirements.

### FR-DRIVE-003: Backup Contents

A backup may include:

- Custom profiles.
- Personal notes.
- Custom names.
- Manually recorded phone numbers.
- Social links.
- Tags.
- Application preferences.
- Other approved application-owned metadata.

### FR-DRIVE-004: Excluded Backup Contents

Backups must never include:

- Telegram message history.
- Message text or captions.
- Downloaded Telegram media.
- Telegram API Hash.
- Plaintext Telegram session credentials.
- Google access tokens or refresh tokens.
- Database passwords.

### FR-DRIVE-005: Backup Creation

The user must be able to create a backup manually.

Automatic backups may be introduced if they can be executed reliably within the selected hosting environment.

### FR-DRIVE-006: Backup Format

The initial backup format should be versioned JSON.

The backup must include:

- Schema version.
- Export timestamp.
- Application version.
- Relevant metadata records.
- A format identifier.

### FR-DRIVE-007: Backup Protection & Spreadsheet Formats

The system supports two backup delivery modes:
1. **Encrypted Archive Mode:** Encrypted using AES-256-GCM before upload with an optional user passphrase for disaster recovery.
2. **Transparent Excel Spreadsheet Mode:** Exported as standard unencrypted Excel workbooks (`.xlsx`) to allow the user to inspect, view, and edit their CRM contacts directly inside Google Sheets or Microsoft Excel without requiring third-party decryption utilities.

### FR-DRIVE-008: Restoration Preview

Before restoring a backup, the application should display:

- Backup date.
- Backup format version.
- Number of profiles.
- Number of tags and links.
- Potential conflicts.
- Restoration strategy.

### FR-DRIVE-009: Restore Safety

Restoration must use a transaction where practical and must validate the backup before modifying the database.

The application must not delete current records merely because they are absent from a backup unless the user explicitly selects a documented replacement strategy.

### FR-DRIVE-010: Backup Status

The interface must display the last successful backup time, if available, and any recent backup error.

### FR-DRIVE-011: Unidirectional Google Drive Excel CRM Sheet Export & Live Update

The system must support an automatic, transparent Excel workbook export and update workflow:
- **Designated File:** Stored in Google Drive under `TeleNexus-Backups/TeleNexus-CRM-Contacts.xlsx`.
- **Database as Single Source of Truth (SSOT):** TeleNexus is the sole authoritative source of user metadata. The Google Drive Excel workbook is strictly an export and reporting target for external inspection in Google Sheets or Microsoft Excel. Under NO circumstances does the application download, import, or merge changes from Google Sheets back into Neon PostgreSQL, guaranteeing zero external mutation of user data.
- **Automated Lifecycle Update Triggers:**
  1. **Application Startup / Site Access:** Whenever the user opens, reloads, or initializes the application, if Google Drive is authorized, TeleNexus automatically exports and updates the current CRM contacts table to the Drive Excel workbook.
  2. **Profile Lifecycle Events:** Creating, modifying, or deleting custom profiles, social links, or tags immediately triggers a background update of the Google Drive Excel file.
  3. **Manual Trigger:** The user can manually click 'Update Drive Excel Now' at any time to push the latest database state to Google Drive.
- **Direct Download:** The user must be able to download the unencrypted `.xlsx` workbook directly from the UI at any time for local inspection.

---

# 6. UI/UX Requirements

## 6.1 Design Philosophy

The interface should prioritize information density, clarity, speed, and contextual organization.

It should feel like a lightweight Telegram client combined with a personal CRM.

The design must not overwhelm the user with unnecessary features.

Primary principles:

1. Familiar conversation navigation.
2. Fast access to custom profiles.
3. Clear distinction between Telegram-owned and user-owned information.
4. Minimal visual clutter.
5. Consistent editing interactions.
6. Responsive layouts.
7. Accessible keyboard navigation.
8. Clear loading, saving, and error states.

## 6.2 Desktop Application Layout

The default desktop interface should use a three-panel layout.

### Panel A: Navigation Sidebar

Recommended width: approximately 220–260 pixels.

Components:

- Application logo and name.
- Global search.
- All conversations.
- Private chats.
- Groups.
- Channels.
- Archived entities.
- Tags.
- Favorites.
- Settings.
- Telegram connection status.

The sidebar should remain stable while the user browses conversations.

### Panel B: Conversation List

Recommended width: approximately 300–380 pixels, adjustable when practical.

Each row should include:

- Avatar or entity placeholder.
- Display name.
- Entity type indicator.
- Optional username.
- Optional latest-message preview.
- Optional message time.
- Custom profile indicator.

The user should be able to filter the list without losing the selected category.

### Panel C: Main Content

The main content area should display either:

- A conversation view.
- A custom profile view.
- An empty-state screen.
- A connection or error state.

The conversation view should have a clear header with the entity name, username when available, and an action to open the custom profile.

## 6.3 Conversation Header

The header must include:

- Telegram display name.
- Entity type.
- Username or public link, if available.
- A custom-profile action.
- Optional metadata refresh action.

The application must clearly distinguish a Telegram username from a user-created custom name.

## 6.4 Message Viewer UX

Messages should be displayed in chronological order using the ordering returned by Telegram, with clear date separators where practical.

Text messages should render as readable text.

Media messages should use concise descriptive placeholders.

Examples:

- `[Photo]`
- `[Video]`
- `[Voice Message]`
- `[Audio / Music]`
- `[Document]`
- `[Sticker]`

If a caption exists, it should be displayed next to the media indicator.

The interface must not attempt to render inaccessible media or suggest that a file has been downloaded when it has not.

The viewer should support:

- Loading older messages.
- Loading indicators.
- Retry actions.
- Empty-history messaging.
- Clear separation between consecutive messages.
- Accessible sender and timestamp information.

## 6.5 Custom Profile Panel

The custom profile should be accessible from the conversation header.

On desktop, it may appear as a right-side drawer or dedicated panel.

Recommended width: approximately 340–440 pixels.

The panel should contain the following sections.

### Section A: Identity

- Telegram entity type.
- Telegram ID.
- Telegram username.
- Original Telegram display name.
- Custom display name.
- Link to the relevant Telegram entity, if available.

Telegram-derived fields should be visually marked as externally sourced.

### Section B: Personal Information

- Custom phone number.
- Company or organization.
- Job title.
- Relationship type.

### Section C: Notes and Context

- Personal notes.
- Reason for joining the channel or group.
- Why the contact is relevant.
- How the user knows the person.
- Follow-up context.

### Section D: Social Links

A list of labeled external links.

Each item should support opening the link, editing it, or removing it.

External URLs must be validated and handled safely.

### Section E: Tags

A searchable tag selector should allow users to add existing tags or create new ones.

### Section F: Metadata

- Profile creation date.
- Last profile update.
- Last Telegram metadata refresh, when tracked.

## 6.6 Profile Editing Experience

The user should not have to edit every field in a single large form.

Recommended interaction:

1. Open the profile.
2. Select Edit.
3. Modify the desired fields.
4. Save changes.
5. Receive confirmation.

The form should support inline validation.

The Save button should be disabled when there are no changes or while a save is in progress.

The application should prevent accidental loss of unsaved changes.

For complex fields such as social links, each item should be independently editable.

## 6.7 Visual Differentiation

Telegram-owned information and user-owned information must be distinguishable.

Recommended labels:

- `Telegram Data`
- `Personal Metadata`
- `Custom Name`
- `Personal Note`
- `Manually Added`
- `Last Synced`

The application must not make a manually recorded phone number appear as though Telegram verified it.

## 6.8 Search and Filtering UX

The application should support searching by:

- Telegram display name.
- Custom display name.
- Username.
- Telegram ID.
- Tags.
- Selected user-managed metadata fields.

Searching across custom notes may be supported through PostgreSQL queries.

Searching message history must remain limited to the data currently available through Telegram, unless a future feature explicitly adds a non-persistent search mechanism.

## 6.9 Empty States

The application must provide useful empty states.

Examples:

- No Telegram conversations found.
- No custom profile created.
- No notes added.
- No social links added.
- No tags available.
- No backups found.
- Telegram account disconnected.
- Google Drive not connected.

Each empty state should explain what the user can do next.

## 6.10 Responsive Behavior

On smaller screens:

- The sidebar should become a collapsible navigation drawer.
- The conversation list and conversation view should become separate navigable screens.
- The custom profile should open as a full-screen panel or bottom sheet.
- Profile forms should remain usable on touch devices.
- Buttons and interactive targets should have appropriate touch sizes.

## 6.11 Accessibility

The application should target WCAG 2.2 Level AA where practical.

Requirements include:

- Keyboard navigation.
- Visible focus indicators.
- Semantic headings.
- Accessible form labels.
- Sufficient color contrast.
- Screen-reader-friendly status messages.
- No reliance on color alone to communicate state.

---

# 7. Database Design

## 7.1 Database Principles

The PostgreSQL schema must be designed around application-owned metadata, not message storage.

The database should:

- Store custom profiles independently of Telegram messages.
- Use stable Telegram identifiers.
- Support profile editing.
- Support multiple social links per profile.
- Support reusable tags.
- Support future multi-account expansion.
- Avoid storing unnecessary personal information.
- Preserve custom metadata when Telegram metadata changes.

## 7.2 Table: `telegram_accounts`

Represents a connected Telegram account.

Suggested columns:

| Column             | Type                  | Purpose                            |
| ------------------ | --------------------- | ---------------------------------- |
| `id`               | UUID                  | Internal primary key               |
| `telegram_user_id` | BIGINT                | Telegram account's numeric user ID |
| `display_name`     | TEXT, nullable        | Current account display name       |
| `created_at`       | TIMESTAMPTZ           | Record creation time               |
| `updated_at`       | TIMESTAMPTZ           | Last update                        |
| `disconnected_at`  | TIMESTAMPTZ, nullable | Disconnection timestamp            |

Constraints:

- `id` is the primary key.
- A unique constraint should prevent duplicate account records for the same authorized account within the application's ownership model.

Telegram session credentials must not be stored in this table as plaintext.

## 7.3 Table: `telegram_entities`

Represents Telegram users, private chats, groups, and channels that have a custom profile or have been explicitly registered for metadata management.

| Column                  | Type                  | Purpose                                           |
| ----------------------- | --------------------- | ------------------------------------------------- |
| `id`                    | UUID                  | Internal primary key                              |
| `telegram_account_id`   | UUID                  | Owning connected account                          |
| `entity_type`           | TEXT                  | `user`, `group`, or `channel`                     |
| `telegram_peer_id`      | BIGINT                | Canonical peer identifier used by the application |
| `telegram_user_id`      | BIGINT, nullable      | Numeric Telegram user ID where applicable         |
| `telegram_chat_id`      | BIGINT, nullable      | Telegram chat identifier where applicable         |
| `telegram_access_hash`  | BIGINT, nullable      | Optional access hash when needed                  |
| `telegram_username`     | TEXT, nullable        | Last known Telegram username                      |
| `telegram_display_name` | TEXT, nullable        | Last known Telegram name                          |
| `telegram_public_url`   | TEXT, nullable        | Available public URL                              |
| `last_synced_at`        | TIMESTAMPTZ, nullable | Last successful metadata refresh                  |
| `is_archived`           | BOOLEAN               | Whether the entity is locally archived            |
| `created_at`            | TIMESTAMPTZ           | Creation time                                     |
| `updated_at`            | TIMESTAMPTZ           | Last update                                       |

Constraints and implementation notes:

1. `telegram_peer_id` must be stored in a canonical representation that distinguishes the relevant Telegram peer types.
2. A uniqueness constraint should apply to `(telegram_account_id, entity_type, telegram_peer_id)`.
3. The implementation must not assume that all Telegram entity types use interchangeable identifiers.
4. Telegram's native peer representation should be normalized carefully before storage.
5. Access hashes must be treated as sensitive Telegram metadata and stored only when necessary.
6. Access hashes are not substitutes for entity IDs.
7. Missing usernames must be represented as `NULL`.

The implementation should use the official Telegram peer model or a correctly normalized equivalent rather than inventing a universal identifier scheme.

## 7.4 Table: `custom_profiles`

Contains user-managed profile data.

| Column                | Type           | Purpose                                |
| --------------------- | -------------- | -------------------------------------- |
| `id`                  | UUID           | Primary key                            |
| `telegram_account_id` | UUID           | Owner account                          |
| `telegram_entity_id`  | UUID           | Associated Telegram entity             |
| `custom_display_name` | TEXT, nullable | User-defined name                      |
| `phone_number`        | TEXT, nullable | Manually recorded phone number         |
| `company`             | TEXT, nullable | Company or organization                |
| `job_title`           | TEXT, nullable | Professional role                      |
| `relationship_type`   | TEXT, nullable | Relationship classification            |
| `reason_for_joining`  | TEXT, nullable | Context for joining a group or channel |
| `notes`               | TEXT, nullable | Personal notes                         |
| `created_at`          | TIMESTAMPTZ    | Creation time                          |
| `updated_at`          | TIMESTAMPTZ    | Last modification                      |

Constraints:

- `id` is the primary key.
- `telegram_entity_id` references `telegram_entities.id`.
- Each entity must have at most one active custom profile within its account scope.
- The database must enforce uniqueness rather than relying solely on frontend logic.

The actual Telegram display name and username remain in the Telegram metadata table.

They must not be duplicated as authoritative fields in `custom_profiles`.

## 7.5 Table: `profile_social_links`

Supports multiple social media links per profile.

| Column              | Type           | Purpose                   |
| ------------------- | -------------- | ------------------------- |
| `id`                | UUID           | Primary key               |
| `custom_profile_id` | UUID           | Associated profile        |
| `label`             | TEXT           | Human-readable link label |
| `url`               | TEXT           | External URL              |
| `description`       | TEXT, nullable | Optional description      |
| `created_at`        | TIMESTAMPTZ    | Creation time             |
| `updated_at`        | TIMESTAMPTZ    | Last update               |

Requirements:

- A profile may contain zero or more links.
- Each link must belong to a valid profile.
- URL validation must reject unsupported or unsafe schemes.
- HTTPS should be preferred when supported by the destination.
- Link removal must not delete the associated profile.

## 7.6 Table: `tags`

Stores reusable user-defined tags.

| Column                | Type           | Purpose                |
| --------------------- | -------------- | ---------------------- |
| `id`                  | UUID           | Primary key            |
| `telegram_account_id` | UUID           | Owner account          |
| `name`                | TEXT           | Tag name               |
| `color`               | TEXT, nullable | Optional display color |
| `created_at`          | TIMESTAMPTZ    | Creation time          |

A uniqueness constraint should prevent duplicate tag names within the same account, using a documented case-normalization policy.

## 7.7 Table: `profile_tags`

Connects profiles and tags.

| Column              | Type        | Purpose           |
| ------------------- | ----------- | ----------------- |
| `custom_profile_id` | UUID        | Profile reference |
| `tag_id`            | UUID        | Tag reference     |
| `created_at`        | TIMESTAMPTZ | Association time  |

Constraints:

- Composite primary key on `(custom_profile_id, tag_id)`.
- Foreign keys to the corresponding tables.
- Appropriate account-level validation to prevent cross-account associations.

## 7.8 Table: `application_settings`

Stores user preferences.

Suggested fields:

- `id`.
- `telegram_account_id`.
- `setting_key`.
- `setting_value`.
- `created_at`.
- `updated_at`.

Settings must be validated and must not become an unrestricted mechanism for storing credentials.

## 7.9 Table: `backup_records`

Tracks application-created backups.

Suggested fields:

- `id`.
- `telegram_account_id`.
- `provider`.
- `drive_file_id`.
- `backup_format_version`.
- `created_at`.
- `status`.
- `metadata`.

This table must not contain backup encryption keys, OAuth tokens, or Telegram session credentials.

## 7.10 Table: `telegram_sessions`

Persists encrypted MTProto session strings (`AES-256-GCM`) in Neon PostgreSQL to ensure session resilience across stateless/ephemeral cloud hosting (such as Render.com free tier sleep/wake cycles):

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | UUID | Primary Key |
| `session_key` | TEXT | Unique session key (`active_session`) |
| `encrypted_payload` | TEXT | Encrypted session string (`iv:authTag:ciphertext`) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

## 7.11 Explicitly Forbidden Tables

The initial schema must not include persistent tables for:

- Telegram messages.
- Telegram message captions.
- Message attachments.
- Media downloads.
- Message sender history.
- Message reaction history.
- Message search indexes.
- Locally archived message threads.

Any future proposal to introduce persistent message storage requires a formal scope change and a new approved version of this document.

## 7.11 Indexing Strategy

Recommended indexes include:

- Unique index on the canonical Telegram entity identity within account scope.
- Unique index on the entity-to-profile relationship.
- Index on `telegram_username`.
- Index on normalized custom display name where needed.
- Index on profile update timestamps.
- Index on tag names.
- Index on profile-to-tag associations.
- Index on backup creation time.

Indexes should be introduced based on expected query patterns and measured performance.

## 7.12 Deletion Rules

The database must distinguish between deleting a custom profile and deleting an underlying Telegram entity metadata record.

Deleting a custom profile should remove its associated social links and tag associations through explicit transactional logic or carefully designed foreign-key behavior.

Deleting a tag should remove its associations without deleting profiles.

Archiving an entity should preserve the custom profile.

The application must not automatically erase user-managed metadata merely because Telegram no longer exposes an entity.

---

# 8. API Design

## 8.1 Backend API Principles

The frontend must communicate with the application backend.

It must not connect directly to Neon or access Telegram credentials.

All endpoints must enforce authentication and authorization.

The examples below describe logical API contracts. Final route names may be adjusted during implementation without changing the underlying requirements.

## 8.2 Telegram Endpoints

### `GET /api/telegram/dialogs`

Returns a paginated list of accessible conversations.

Possible response fields:

- `entityType`
- `telegramPeerId`
- `telegramUserId`
- `telegramChatId`
- `username`
- `displayName`
- `publicUrl`
- `lastSyncedAt`
- `hasCustomProfile`

No message history is persisted as a result of this operation.

### `GET /api/telegram/dialogs/:peerId/messages`

Returns a page of messages retrieved directly from Telegram.

Possible response fields:

- `messageId`
- `text`
- `caption`
- `sender`
- `date`
- `mediaType`
- `nextCursor`

The response is transient.

The endpoint must not write message data to the database.

The peer identifier must be resolved and validated server-side rather than blindly trusted as a client-supplied Telegram object.

### `POST /api/telegram/refresh`

Requests a controlled refresh of Telegram entity metadata.

The backend must enforce request throttling and avoid unnecessary refresh operations.

## 8.3 Custom Profile Endpoints

### `GET /api/profiles/:entityId`

Returns the custom profile and its associated user-managed metadata.

If no profile exists, the endpoint should return a documented not-found response or an explicit empty-profile state.

### `POST /api/profiles`

Creates a custom profile for an existing, valid entity association.

The backend must verify the entity and account relationship.

### `PATCH /api/profiles/:profileId`

Updates editable profile fields.

The request must contain only fields that the user is permitted to modify.

Telegram-owned fields must not be modified through this endpoint.

### `DELETE /api/profiles/:profileId`

Deletes the custom profile and its explicitly associated metadata according to the documented deletion policy.

The endpoint must not delete Telegram conversations or messages.

## 8.4 Social Link Endpoints

Recommended routes:

- `POST /api/profiles/:profileId/social-links`
- `PATCH /api/profiles/:profileId/social-links/:linkId`
- `DELETE /api/profiles/:profileId/social-links/:linkId`

All operations must verify profile ownership.

## 8.5 Tag Endpoints

Recommended routes:

- `GET /api/tags`
- `POST /api/tags`
- `PATCH /api/tags/:tagId`
- `DELETE /api/tags/:tagId`
- `PUT /api/profiles/:profileId/tags`

The API should support attaching and detaching tags without creating duplicates.

## 8.6 Backup Endpoints

Recommended routes:

- `POST /api/backups`
- `GET /api/backups`
- `GET /api/backups/:backupId`
- `POST /api/backups/:backupId/restore`
- `DELETE /api/backups/:backupId`

All backup operations must be authorized and validated.

---

# 9. Security and Privacy Requirements

## 9.1 Authentication Boundaries

The application must protect:

- Telegram sessions.
- Telegram API credentials.
- Neon database credentials.
- Google OAuth access tokens.
- Google OAuth refresh tokens.
- Backup encryption keys.

Secrets must not be exposed in browser-accessible environment variables, frontend source maps, or API responses.

## 9.2 Telegram Session Security

Persistent Telegram sessions can grant significant access to the associated account.

Therefore:

1. Session credentials must be encrypted at rest where persisted.
2. Access to session data must be restricted to the Telegram integration service.
3. Session secrets must never be included in application backups.
4. Session secrets must not be logged.
5. Reauthorization and disconnection must be handled explicitly.
6. Deployment environments must provide appropriate secret management.
7. Session rotation or revocation procedures must be documented.

## 9.3 Authorization

The application must verify the authenticated owner for every profile, social link, tag, and backup operation.

A user must never be able to access another account's private metadata by changing a UUID or entity identifier in an API request.

Database constraints should reinforce application-level authorization.

## 9.4 Personal Data Protection

Custom profiles may contain sensitive personal information.

The application should collect only the information necessary for its intended purpose.

It should provide:

- Secure transport over HTTPS.
- Appropriate database access controls.
- Backup protection.
- A documented deletion policy.
- A way to remove custom metadata.
- Safe error messages that do not reveal secrets.
- Appropriate protection against unauthorized access.

The application owner is responsible for ensuring that personal-data processing complies with applicable laws and regulations.

## 9.5 Logging

Application logs must not contain:

- Message text or captions.
- Full Telegram session strings.
- API hashes.
- OAuth tokens.
- Database passwords.
- Backup encryption keys.
- Sensitive profile notes unless specifically required for an explicitly authorized and protected diagnostic process.

Operational logs should use request identifiers and error classifications rather than sensitive payloads.

## 9.6 Browser Storage

Persistent browser storage must not contain Telegram message history or credentials.

The application should avoid placing sensitive profile notes in local storage.

Transient in-memory caching is allowed when necessary for the interface.

## 9.7 Input Validation

All inputs must be validated on the backend.

Validation must include:

- Field lengths.
- Data types.
- URL schemes.
- Tag names.
- Profile ownership.
- Entity identity.
- Backup format and schema.
- Request size limits.

Database access must use parameterized queries or an appropriate ORM.

## 9.8 Threat Model

The initial threat model must consider:

- Unauthorized access to the application.
- Stolen Telegram session credentials.
- Compromised Google OAuth tokens.
- Cross-account metadata access.
- Malicious URLs in social links.
- Malformed backup files.
- Accidental deletion of metadata.
- Database exposure.
- Excessive Telegram API requests.
- Sensitive information leaking through logs.

---

# 10. Performance and Reliability

## 10.1 Performance Targets

The following are initial engineering targets rather than guarantees.

- Initial application shell should become interactive within approximately 2.5 seconds under a reasonable broadband connection and a warm deployment.
- Custom profile retrieval should normally complete within 500 ms at the application API boundary under normal conditions.
- Profile saves should normally complete within 1 second under normal conditions.
- Message history loading should begin promptly after a request, subject to Telegram response time and rate limits.
- Conversation lists should use pagination or incremental loading when appropriate.

Targets must be measured in a real deployment and adjusted using observed performance.

## 10.2 Reliability

The application must:

- Handle temporary Telegram outages gracefully.
- Preserve custom profiles during Telegram failures.
- Avoid duplicate profile creation.
- Prevent concurrent edits from silently overwriting newer data where practical.
- Provide actionable recovery options for failed operations.
- Use database transactions for related metadata changes.

## 10.3 Rate Limiting

The backend should use:

- Request throttling.
- Bounded concurrency.
- Exponential backoff where appropriate.
- Respect for Telegram-provided wait durations.
- Protection against retry storms.

Rate limits must be applied independently to Telegram integration and application-owned endpoints.

## 10.4 Observability

Operational monitoring should include:

- Telegram connection status.
- Telegram API failure rates.
- Rate-limit events.
- Profile save failures.
- Database latency.
- Backup success and failure.
- Authentication errors.

Observability must not require collecting persistent message content.

---

# 11. Error Handling

## 11.1 Telegram Errors

The backend should normalize Telegram errors into application-level categories:

- Authentication required.
- Session invalid.
- Entity unavailable.
- Permission denied.
- Rate limited.
- Network failure.
- Temporary Telegram error.
- Unsupported operation.

The frontend must present clear explanations without exposing sensitive implementation details.

## 11.2 Database Errors

The application must distinguish between:

- Validation errors.
- Duplicate profile errors.
- Authorization errors.
- Connection failures.
- Transaction failures.
- Unexpected internal errors.

The frontend should retain unsaved data when an update fails.

## 11.3 Backup Errors

The application must handle:

- Google account disconnected.
- OAuth authorization expired.
- Insufficient Drive permissions.
- Upload failure.
- Invalid backup format.
- Unsupported schema version.
- Decryption failure.
- Restore conflict.
- Database transaction failure.

A failed restore must not leave the database in a partially restored state where transactional restoration is possible.

---

# 12. Testing Requirements

## 12.1 Unit Testing

Unit tests should cover:

- Telegram entity identity normalization.
- Profile validation.
- Social URL validation.
- Tag normalization.
- Backup serialization.
- Backup validation.
- Message media-type classification.
- API error normalization.
- Profile fallback-name behavior.

## 12.2 Integration Testing

Integration tests should cover:

- Neon database migrations.
- Profile CRUD operations.
- Social link CRUD operations.
- Tag associations.
- Entity uniqueness constraints.
- Telegram metadata synchronization.
- Google Drive backup creation.
- Backup restoration.
- Authorization checks.

## 12.3 Message Non-Persistence Tests

These tests are mandatory.

The test suite must verify that:

1. Opening a conversation does not insert message records into PostgreSQL.
2. Loading older messages does not insert message records.
3. Refreshing a conversation does not create a local message archive.
4. Media captions are not persisted.
5. Message text does not appear in application backups.
6. Message text does not appear in persistent logs.
7. Browser reloads do not restore message history from application-managed persistent storage.

## 12.4 End-to-End Testing

The application should test these core flows:

- Connect Telegram.
- Display conversation categories.
- Open a private chat.
- Open a group.
- Open a channel.
- Display textual messages and media placeholders.
- Create a custom profile.
- Edit and save notes.
- Add a phone number.
- Add social links.
- Add and remove tags.
- Change a Telegram username and preserve the custom profile.
- Disconnect Telegram and preserve custom metadata.
- Connect Google Drive.
- Create a backup.
- Restore a backup.
- Handle an expired session.
- Handle Telegram rate limiting.

## 12.5 Security Testing

Security tests must include:

- Unauthorized profile access.
- Cross-account UUID manipulation.
- Invalid social URLs.
- Malformed backup uploads.
- Secrets leaking through logs.
- Exposed frontend environment variables.
- Unauthorized profile deletion.
- Access to another account's backup.

---

# 13. Acceptance Criteria

Version 1.0 is acceptable when the following conditions are met.

### AC-001: Telegram Connection

The user can authorize the application and retrieve accessible conversations.

### AC-002: Conversation Categories

Private chats, groups, and channels appear in the appropriate categories.

### AC-003: Message Viewing

The user can open a conversation and view available text messages, captions, and media type indicators.

### AC-004: No Message Storage

No Telegram message history is persisted in PostgreSQL or application-managed backups.

### AC-005: Profile Creation

The user can create a custom profile for a Telegram entity.

### AC-006: Profile Editing

The user can edit custom names, notes, phone numbers, relationship information, and other supported fields.

### AC-007: Social Links

The user can add, update, open, and remove social links.

### AC-008: Tags

The user can create reusable tags and associate them with profiles.

### AC-009: Identity Integrity

Changes to a Telegram username or display name do not disconnect or overwrite the associated custom profile.

### AC-010: Independent Metadata

Custom profiles remain available during Telegram outages and after the user disconnects the Telegram account.

### AC-011: Google Drive Backup

The user can create a protected backup of application-owned metadata.

### AC-012: Google Drive Restoration

The user can restore a valid backup without unintentionally deleting unrelated metadata.

### AC-013: Security

Unauthorized users cannot access or modify private profiles or backups.

### AC-014: Responsive UX

The core conversation and profile workflows are usable on desktop and mobile screens.

### AC-015: Error Recovery

The application handles authentication failures, database failures, and Telegram rate limits without silently losing saved metadata.

---

# 14. Implementation Roadmap

## Phase 1: Project Foundation

- Initialize the Next.js TypeScript application.
- Establish the Node.js backend architecture.
- Configure environment variables and secrets management.
- Create the Neon PostgreSQL database.
- Add database migrations.
- Implement basic application navigation.

**Deliverable:** A running application with the initial architecture.

## Phase 2: Telegram Integration

- Obtain Telegram API credentials.
- Implement the authentication flow.
- Securely manage the Telegram session.
- Retrieve dialog lists.
- Separate private chats, groups, and channels.
- Implement message-history retrieval.
- Implement media type classification.
- Add rate-limit handling.

**Deliverable:** A working Telegram conversation browser without message persistence.

## Phase 3: Custom Profiles

- Implement entity identity normalization.
- Create the custom profile schema.
- Build profile retrieval and editing APIs.
- Implement social links.
- Implement tags.
- Add form validation and save feedback.
- Preserve profiles when Telegram metadata changes.

**Deliverable:** Fully editable custom profiles associated with Telegram entities.

## Phase 4: User Experience Refinement

- Complete the three-panel desktop interface.
- Implement responsive mobile navigation.
- Add search and filters.
- Add empty states and error handling.
- Add loading indicators.
- Improve keyboard accessibility.

**Deliverable:** A usable, consistent interface.

## Phase 5: Google Drive Backup

- Implement Google OAuth.
- Add backup serialization and schema versioning.
- Add backup encryption.
- Implement Drive upload and listing.
- Implement safe restoration.
- Test backup exclusions.

**Deliverable:** A working backup and recovery system.

## Phase 6: Testing and Release

- Complete unit and integration tests.
- Verify message non-persistence.
- Perform authorization testing.
- Verify rate-limit handling.
- Test account disconnection.
- Test backup recovery.
- Prepare deployment configuration and operational documentation.

**Deliverable:** A release candidate that satisfies the acceptance criteria.

---

# 15. Risks and Technical Constraints

## 15.1 Telegram API Constraints

Telegram controls access to its data and may impose rate limits, authorization requirements, or restrictions on particular entities.

The application must use the appropriate MTProto methods and respect the official API requirements.

No design should assume unrestricted access to every conversation or every historical message.

## 15.2 Telegram Identity Complexity

Telegram users, basic groups, supergroups, channels, and private conversations do not all share identical identifier semantics.

The implementation must use a well-defined identity normalization layer.

A username must never be treated as a permanent primary key.

## 15.3 Telegram Session Security

A persistent user session may provide substantial access to a personal Telegram account.

Session security is a high-priority requirement, not an optional enhancement.

## 15.4 Database Free-Tier Constraints

Neon is the recommended primary database, but its free-tier storage, compute, connection, and usage limits may change.

The application should minimize unnecessary writes and avoid storing message history.

The current plan limits must be verified before deployment.

## 15.5 Google Drive Is Not a Live Database

Drive backup operations are separate from normal database writes.

The application must not assume that uploading a backup automatically synchronizes every change or provides conflict-free multi-device editing.

Neon remains the authoritative source for application metadata.

## 15.6 Backup and Restore Conflicts

Restoring an older backup may overwrite newer information if the process is not carefully designed.

The initial implementation should favor preview, explicit confirmation, and safe merge behavior.

## 15.7 Single-Account Assumptions

Although the schema should support future extension, the initial user interface and authorization model target one connected Telegram account.

Multi-account behavior must be explicitly designed before it is enabled.

---

# 16. Development Rules and Change Control

SOURCE OF TRUTH is the canonical reference for implementation decisions.

All implementation work should follow these rules.

1. Requirements in this document take precedence over informal assumptions.
2. New functionality must not silently change the application's data-retention policy.
3. Message persistence is prohibited in version 1.0.
4. Telegram-owned and user-owned fields must remain separate.
5. Telegram identifiers must be handled consistently.
6. Database changes must use version-controlled migrations.
7. Security-sensitive changes must be reviewed before deployment.
8. Changes to the backup format must include schema-version handling.
9. Acceptance criteria must be updated when approved requirements change.
10. Any change that introduces message storage requires an explicit scope revision.

Each significant change should record:

- Requirement identifier.
- Description of the change.
- Reason for the change.
- Affected components.
- Database migration requirements.
- Security implications.
- Test requirements.
- Approval status.

---

# 17. Final Architectural Decisions

The following decisions define the approved baseline for version 1.0.

| Decision               | Approved approach                                        |
| ---------------------- | -------------------------------------------------------- |
| Application purpose    | Personal Telegram contact and metadata management        |
| Frontend               | Next.js + TypeScript                                     |
| Backend                | Node.js + TypeScript                                     |
| Telegram integration   | MTProto API                                              |
| Primary database       | Neon PostgreSQL                                          |
| Message persistence    | Prohibited                                               |
| Message viewing        | Retrieve from Telegram and display transiently           |
| Custom profiles        | Editable and independent of message storage              |
| Entity identity        | Stable Telegram identifiers and normalized peer identity |
| Telegram metadata      | Refreshable, optionally cached                           |
| Custom names           | Stored separately from Telegram names                    |
| Social links           | Multiple links per profile                               |
| Tags                   | Reusable, user-managed tags                              |
| Google Drive           | Metadata backup and restoration                          |
| Google Sheets          | Optional export/reporting integration                    |
| Initial account model  | One connected Telegram account                           |
| Message search archive | Out of scope                                             |
| Backup secrets         | Never included in application backups                    |

---

# 18. Definition of Done

A feature is considered complete only when:

- Its functional requirements are implemented.
- Its user interface states are implemented.
- Input validation is enforced on the backend.
- Authorization is verified.
- Database migrations are included when needed.
- Automated tests cover the relevant behavior.
- Error handling is implemented.
- Logging does not expose sensitive data.
- Documentation is updated.
- No requirement concerning message non-persistence is violated.

The initial release is complete when the user can connect Telegram, browse accessible conversations, view messages without persisting them, create and edit custom profiles, maintain social links and tags, and securely back up and restore application-owned metadata through Google Drive.

---

**End of Specification**

**Document ID:** SOT-SRS-001  
**Version:** 1.0.0  
**Status:** Approved Baseline  
**Governing Principle:** Telegram remains the source of truth for Telegram-owned data; SOURCE OF TRUTH remains the source of truth for user-created metadata.
