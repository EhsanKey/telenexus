# SPEC-08: Desktop Three-Panel Layout & Responsive UX

## 1. Domain Overview & Purpose
SOURCE OF TRUTH merges the fluid communication experience of a Telegram client with the structured precision of a personal intelligence CRM. The interface balances high information density with aesthetic elegance, subtle micro-animations, clear loading feedback, and distinct visual badges separating external Telegram data from private personal metadata.

## 2. Requirements Traceability
- **SRS Requirements:**
  - `SRS §6.1`: Design Philosophy (lightweight Telegram + personal CRM).
  - `SRS §6.2`: Desktop Three-Panel Layout (Sidebar 220-260px, Dialogs 300-380px, Main Content).
  - `SRS §6.3`: Conversation Header with quick-access profile trigger.
  - `SRS §6.4`: Ephemeral message viewer UX (date dividers, media badges).
  - `SRS §6.5`: Custom profile right-side drawer/panel (340-440px) with 6 sections.
  - `SRS §6.6`: Section-based profile editing with dirty checking & unsaved guards.
  - `SRS §6.7`: Visual badges: `[Telegram Data]` vs `[Personal Metadata]`.
  - `SRS §6.8`: Search & multi-field filtering.
  - `SRS §6.9`: Thoughtfully crafted empty and error states.
  - `SRS §6.10`: Responsive behavior (mobile collapsible drawer and stack views).
  - `SRS §6.11`: WCAG 2.2 AA accessibility standards.

## 3. Desktop Topology Layout

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  SOURCE OF TRUTH WORKSPACE                                      │
├──────────────┬────────────────────────┬──────────────────────────────────────────┬──────────────┤
│ PANEL A      │ PANEL B                │ PANEL C: MAIN CONTENT                    │ DRAWER       │
│ Sidebar      │ Conversation List      │ Conversation Header & Message Viewer     │ Profile CRM  │
│ (220-260px)  │ (300-380px)            │ (Flexible Fill)                          │ (340-440px)  │
├──────────────┼────────────────────────┼──────────────────────────────────────────┼──────────────┤
│ • Logo       │ • Filter Tabs (PV/Grp) │ • Header: Entity Name + Type Badge       │ • Identity   │
│ • Categories │ • Search Input         │   + Custom Name Override + Sync Button   │ • Personal   │
│ • All (42)   │ • Chat Row Item        ├──────────────────────────────────────────┤ • Notes      │
│ • PV (18)    │   - Avatar             │ • Date Separator (Today)                 │ • Links      │
│ • Groups (12)│   - Name + Custom Tag  │ • Incoming Message [Photo] Caption       │ • Tags       │
│ • Channels   │   - Transient Preview  │ • Outgoing Message "Salam..."            │ • Timestamps │
│ • Tags       │   - Profile Dot        │ • Older Messages Scroll Trigger          │              │
│ • Settings   │                        │                                          │ [Edit/Save]  │
│ • MTProto OK │                        │ (No Input Bar - View & Organize Only)    │              │
└──────────────┴────────────────────────┴──────────────────────────────────────────┴──────────────┘
```

## 4. Design System Tokens & Visual Differentiation

### 4.1 Distinction Badging
To ensure the user is never confused about where a data point originated:
- **`Telegram Data` (Neutral/Gray badge):** Applied to MTProto username, Telegram ID, original display name, message text.
- **`Personal Metadata` (Emerald/Blue badge):** Applied to custom display name, personal notes, manually recorded phone number, tags, social links.
- **`Unverified Entry` (Amber badge):** Explicitly appended next to manually entered phone numbers.

### 4.2 Color Palette (Dark Mode First & Clean Light Mode)
- **Background Deep:** `#0B0E14` / `#0F172A`
- **Surface Elevation 1 (Sidebar):** `#111827`
- **Surface Elevation 2 (List):** `#161F30`
- **Surface Elevation 3 (Cards/Panels):** `#1E293B`
- **Brand Telegram Blue:** `#0088CC` / `#38BDF8`
- **Accent Emerald (CRM/Data):** `#10B981`
- **Warning Amber:** `#F59E0B`
- **Typography:** Inter, Outfit, Vazirmatn (for Persian scripts)

## 5. Component Hierarchy & UX Flow
1. **Conversation Header:**
   - Displays resolved display name (falling back to Telegram name).
   - Displays Telegram username with `@` prefix and entity type pill.
   - Profile toggle button (`Alt+P` or click) slides open the CRM drawer.
2. **Profile Drawer:**
   - **Identity Section:** Displays entity peer ID, verified vs custom display names.
   - **Personal Section:** Manually entered phone with copy button, company, role, relationship.
   - **Notes Section:** Auto-resizing textarea with markdown preview.
   - **Social Links Section:** URL input with auto-detected platform icons (GitHub, LinkedIn, Twitter/X, etc.).
   - **Tags Section:** Interactive multi-select badge selector with color badges.
3. **Unsaved Changes Interceptor:**
   - Custom React hook (`useUnsavedChangesGuard`) tracks form dirty state.
   - Warns user if attempting to switch conversation before saving modified notes.

## 6. Mobile & Responsive Layout
- `< 768px` (Mobile):
  - Sidebar collapses into sliding hamburger navigation.
  - Conversation list and conversation view operate as separate stacked screens.
  - Custom profile opens as a full-screen bottom sheet with swipe-to-dismiss gesture.
- `768px - 1199px` (Tablet / Small Laptop):
  - Two-panel mode with profile sliding over the main message panel as an overlay drawer.

## 7. Verification Checklist
- [x] Panel widths strictly adhere to the 220-260px / 300-380px / 340-440px guidelines.
- [x] Visual indicators make Telegram fields immediately distinguishable from custom CRM fields.
- [x] Form navigation triggers a confirmation prompt when unsaved edits are present.
