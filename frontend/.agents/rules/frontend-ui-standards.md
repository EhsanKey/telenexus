# Frontend UI Standards & Design System

## 1. Desktop Three-Panel Topology (SPEC-08)
- **Panel A (Navigation Sidebar):** 220–260px fixed width.
- **Panel B (Conversation List):** 300–380px width.
- **Panel C (Main Content):** Flexible fill with Ephemeral Message Viewer.
- **CRM Profile Drawer:** 340–440px right-side panel (or overlay on smaller desktop screens).

## 2. Visual Badging & Source Clarity
Every entity item and profile view MUST visually distinguish external vs internal data:
- `[Telegram Data]` (Muted/Neutral badge) for MTProto usernames, IDs, and Telegram display names.
- `[Personal Metadata]` (Brand Blue/Emerald badge) for custom names, notes, tags, and CRM details.
- `[Unverified Entry]` (Amber badge) for manual phone numbers.

## 3. Responsive Breakpoints
- `< 768px`: Mobile stack navigation (sidebar collapsed, full-screen conversation view, bottom sheet profile).
- `768px - 1199px`: Tablet layout (overlay drawer).
- `≥ 1200px`: Full 3-panel + drawer layout.

## 4. Accessibility
- WCAG 2.2 Level AA compliance.
- Keyboard navigability (`Tab`, `Esc` to close drawer, `Enter` to open dialog).
- Explicit `aria-label`s on icon-only buttons.
