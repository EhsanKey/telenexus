# SPEC-08: CRM-First Desktop Topology & Responsive UI/UX Design System

## 1. Domain Overview & Purpose
**TeleNexus** merges the fluid real-time communication capability of a Telegram MTProto client with the structured precision of a personal intelligence CRM. Rather than prioritizing endless chat streams, TeleNexus places **Contact Intelligence and Personal CRM Metadata** at the center of the user experience. The interface balances high information density with aesthetic elegance, subtle micro-animations, clear loading feedback, and distinct visual badges separating external Telegram data from private personal metadata.

The chat stream is modular and on-demand: accessible as an ephemeral, floating modal or compact viewer without dominating the workspace.

## 2. Requirements Traceability
- **SRS Requirements:**
  - `SRS §6.1`: Design Philosophy (lightweight Telegram + personal CRM).
  - `SRS §6.2`: Desktop Three-Panel Layout (Sidebar 220-260px, Dialogs 300-380px, Central CRM Stage).
  - `SRS §6.3`: Contact Header with quick-access ephemeral chat trigger (`Alt+M`) and profile sync.
  - `SRS §6.4`: Ephemeral message viewer UX (date dividers, media badges, modal/compact presentation).
  - `SRS §6.5`: Custom profile intelligence hub with identity, notes, tags, and social footprint.
  - `SRS §6.6`: Section-based profile editing with dirty checking & unsaved changes guards.
  - `SRS §6.7`: Visual badges: `[Telegram Data]` vs `[Personal Metadata]` vs `[Unverified Entry]`.
  - `SRS §6.8`: Search & multi-field filtering.
  - `SRS §6.9`: Thoughtfully crafted empty and error states (Executive CRM Dashboard).
  - `SRS §6.10`: Responsive behavior (mobile collapsible drawer and stack views).
  - `SRS §6.11`: WCAG 2.2 AA accessibility standards.

## 3. Desktop Topology Layout (CRM-First Architecture)

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TELENEXUS WORKSPACE                                           │
├──────────────┬────────────────────────┬─────────────────────────────────────────────────────────┤
│ PANEL A      │ PANEL B                │ PANEL C: CONTACT INTELLIGENCE & CRM STAGE               │
│ Navigation   │ Directory / Contacts   │ Primary Focal Workspace (Flexible Fill)                 │
│ (220-260px)  │ (300-380px)            │                                                         │
├──────────────┼────────────────────────┼─────────────────────────────────────────────────────────┤
│ • Logo & TN  │ • View Filter Tabs     │ • Contact Hero Header: Name + Badges + [💬 Chat (Alt+M)] │
│ • Categories │ • Search Input         │ • Tab 1: Identity (Peer ID, Company, Role, Relationship)│
│   - All (42) │ • Tag Filter Chips     │ • Tab 2: Private Notes (Markdown Editor + Word Count)   │
│   - PV (18)  │ • Contact Cards        │ • Tab 3: Taxonomy & Custom Tags (Color Swatches)        │
│   - Groups   │   - Gradient Avatar    │ • Tab 4: Digital Footprint (Social Links & Icons)       │
│   - Channels │   - Resolved Name      ├─────────────────────────────────────────────────────────┤
│ • MTProto OK │   - CRM Badge          │ ON-DEMAND MODAL: EPHEMERAL CHAT VIEWER                  │
│ • Lock DB    │   - Peer ID / Handle   │ • Streaming from MTProto (Zero Persistence)             │
│ • AES-256    │   - Transient Preview  │ • Date Dividers, Media Indicators [Photo], Bubbles      │
│   Drive Sync │   - Tag Badges         │ • Compact, floating, or maximized overlay               │
└──────────────┴────────────────────────┴─────────────────────────────────────────────────────────┘
```

## 4. Design System Tokens & Visual Differentiation

### 4.1 Distinction Badging (SPEC-08 §4.1)
To ensure the user is never confused about where a data point originated:
- **`[Telegram Data]` (Slate / Neutral badge):** Applied to MTProto username, Telegram ID, original display name, transient message text.
- **`[Personal Metadata]` (Emerald / Blue badge):** Applied to custom display name, personal notes, company, role, tags, social links.
- **`[Unverified Entry]` (Amber badge):** Explicitly appended next to manually entered phone numbers.

### 4.2 Color Palette (Dark Mode First & Glassmorphism)
- **Background Deep:** `#080B10` / `#0B0F19`
- **Surface Elevation 1 (Sidebar):** `#0B0F19` / `#111827`
- **Surface Elevation 2 (Directory List):** `#0F172A` / `#131D33`
- **Surface Elevation 3 (Cards/Panels):** `#1B2744` / `#1E293B`
- **Brand Telegram Blue:** `#0088CC` / `#38BDF8`
- **Accent Emerald (CRM/Data):** `#10B981`
- **Accent Indigo:** `#6366F1`
- **Warning Amber:** `#F59E0B`
- **Typography:** Inter, Outfit, system-ui, Vazirmatn (for Persian scripts)

### 4.3 Glassmorphism & Elevation Classes
- `.glass-panel`: Translucent slate backdrop with `backdrop-filter: blur(16px)` and subtle border.
- `.glass-card`: Interactive card surface with hover glow elevation and border highlights.
- `.no-scrollbar`: Clean scroll container hiding scrollbars for horizontal filter chips.

## 5. Component Hierarchy & UX Flow

1. **Panel A (Navigation Sidebar - 240px):**
   - Brand header with animated active indicator.
   - Directory view tabs (All, Private Chats, Groups, Supergroups, Channels, Archived) with real-time counters.
   - Subsystem status indicator (Core API port 4000, Proxy `/api/backend/*`).
   - Telegram MTProto Session card (Account identity, status badge, Connect / Manage modal trigger).
   - Master Passcode Lock Button.
   - Google Drive AES-256 Backups trigger with sync status.

2. **Panel B (Directory / Conversation List - 340px):**
   - Category filter pills with count indicators.
   - Search input with clear button (`✕`) and debounced querying.
   - Horizontal tag filter chip rail with custom hex colors.
   - Contact row items with gradient avatars, entity icons (User, Group, Channel), resolved name, origin badges, transient snippet, and unread badge.
   - Infinite scroll trigger and end-of-list verification.

3. **Panel C (Contact Intelligence Hub - Center Stage):**
   - **Empty State (Executive Dashboard):** Displays platform overview, key metrics (contacts, tags, cloud sync status, zero persistence shield), quick action shortcuts, and privacy guarantee.
   - **Active State (Contact CRM Hub):**
     - Hero header with large avatar, Resolved Name, `[Personal Metadata]` or `[Telegram Data]` badge, handle, Peer ID, and quick actions (`[View Ephemeral Chat]`, `[Sync MTProto]`, `[Edit Details]`).
     - Tabbed workspace:
       - **Identity & Overview:** Verified Telegram MTProto technical details vs Personal CRM metadata (Company, Role, Relationship stage, unverified phone with copy button).
       - **Intelligence Notes:** Full-featured Markdown notes editor with live word count and dirty state tracking.
       - **Tags Taxonomy:** Colored tag assignment chips and tag creator with preset color swatches.
       - **Digital Footprint:** Platform-detected social link cards (GitHub, LinkedIn, X, Website, etc.) with URL protocol whitelist verification (`http://` or `https://`).

4. **Ephemeral Chat Modal / Drawer (`EphemeralChatModal.tsx`):**
   - Accessible on-demand via `[View Ephemeral Chat]` header button or `Alt+M` / `Alt+C`.
   - Displays transient messages from Telegram MTProto with date dividers, canonical media badges (`[Photo]`, `[Video]`, `[Voice Message]`, etc.), and cursor pagination.
   - Enforces the Universal Zero-Persistence Invariant (messages are kept strictly in React state and never saved to localStorage, sessionStorage, or databases).
   - Dismissible via `Esc` or backdrop click, or can be maximized for deep viewing.

5. **Unsaved Changes Interceptor (`useUnsavedChangesGuard`):**
   - Tracks form dirty state when modifying CRM notes, tags, or fields.
   - Prompts user confirmation if switching contacts before saving.

6. **Accessibility & Passcode Security:**
   - All password and passcode fields include interactive Show/Hide visibility toggles (`Eye` / `EyeOff` icons).
   - High contrast text conforming to WCAG 2.2 AA.

## 6. Mobile & Responsive Layout
- `< 768px` (Mobile):
  - Sidebar collapses into sliding hamburger navigation.
  - Directory list and Contact Intelligence Hub operate as stacked views.
  - Ephemeral chat opens as a full-screen bottom sheet.
- `768px - 1199px` (Tablet / Small Laptop):
  - Two-panel mode with collapsible sidebar.
- `≥ 1200px` (Desktop):
  - Full 3-panel layout with dedicated directory and expanded CRM center stage.

## 7. Verification Checklist
- [x] Panel widths strictly adhere to the 220-260px / 300-380px / 340-440px guidelines.
- [x] Visual indicators make Telegram fields immediately distinguishable from custom CRM fields (`[Telegram Data]`, `[Personal Metadata]`, `[Unverified Entry]`).
- [x] Chat interface is modular and on-demand via modal/compact viewer, prioritizing the CRM workspace.
- [x] Form navigation triggers confirmation prompt when unsaved edits are present.
- [x] All password and passcode inputs provide interactive Show/Hide visibility toggles.
- [x] Zero-persistence invariant strictly preserved across all message streams.
