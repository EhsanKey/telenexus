# Frontend Engineering Standards

## 1. Strict Typing & Zero `any`
- Enable TypeScript `"strict": true`.
- Zero tolerance for `any`. Type all props, API envelopes, and event handlers explicitly.

## 2. Ephemeral State Management
- Ephemeral message data is held exclusively in React state or TanStack Query cache while the conversation is active.
- When unmounting the conversation view, clear message cache to prevent memory leaks and adhere to the non-persistence invariant.
- Never write messages to `localStorage` or `sessionStorage`.

## 3. Unsaved Changes Guard
- Profile forms must maintain dirty-state tracking.
- If user navigates away or switches conversations with unsaved edits, trigger a confirmation dialog to prevent accidental data loss.
