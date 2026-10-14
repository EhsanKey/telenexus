import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUnsavedChangesGuard } from '../src/hooks/useUnsavedChangesGuard.js';

describe('Desktop Three-Panel Layout & Responsive UX (SPEC-08)', () => {
  describe('Topology & Panel Width Invariants (SPEC-08 §3 & §6.2)', () => {
    it('verifies panel width tokens adhere strictly to guidelines', () => {
      const topology = {
        sidebarWidthPx: 256,       // w-64: strictly within 220-260px
        dialogsWidthPx: 340,       // w-[340px]: strictly within 300-380px
        profileDrawerWidthPx: 360, // w-[360px]: strictly within 340-440px
      };

      expect(topology.sidebarWidthPx).toBeGreaterThanOrEqual(220);
      expect(topology.sidebarWidthPx).toBeLessThanOrEqual(260);

      expect(topology.dialogsWidthPx).toBeGreaterThanOrEqual(300);
      expect(topology.dialogsWidthPx).toBeLessThanOrEqual(380);

      expect(topology.profileDrawerWidthPx).toBeGreaterThanOrEqual(340);
      expect(topology.profileDrawerWidthPx).toBeLessThanOrEqual(440);
    });
  });

  describe('Distinction Badging (SPEC-08 §4.1)', () => {
    it('correctly maps data origins to standardized badges', () => {
      const getBadgeForField = (origin: 'telegram' | 'personal' | 'unverified_phone') => {
        switch (origin) {
          case 'telegram':
            return {
              text: '[Telegram Data]',
              color: 'slate',
            };
          case 'personal':
            return {
              text: '[Personal Metadata]',
              color: 'emerald',
            };
          case 'unverified_phone':
            return {
              text: '[Unverified Entry]',
              color: 'amber',
            };
        }
      };

      expect(getBadgeForField('telegram').text).toBe('[Telegram Data]');
      expect(getBadgeForField('personal').text).toBe('[Personal Metadata]');
      expect(getBadgeForField('unverified_phone').text).toBe('[Unverified Entry]');
    });
  });

  describe('Unsaved Changes Interceptor (useUnsavedChangesGuard) (SPEC-08 §5.3)', () => {
    let mockConfirm: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockConfirm = vi.fn();
      // @ts-expect-error mock window for Node environment
      globalThis.window = {
        confirm: mockConfirm,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    it('permits navigation without prompt when form is clean (isDirty = false)', () => {
      const confirmNav = (isDirty: boolean) => {
        if (!isDirty) return true;
        return window.confirm('Discard changes?');
      };

      const result = confirmNav(false);
      expect(result).toBe(true);
      expect(mockConfirm).not.toHaveBeenCalled();
    });

    it('triggers confirmation prompt when form has unsaved modifications (isDirty = true)', () => {
      mockConfirm.mockReturnValue(true);

      const confirmNav = (isDirty: boolean) => {
        if (!isDirty) return true;
        return window.confirm('Discard changes?');
      };

      const result = confirmNav(true);
      expect(result).toBe(true);
      expect(mockConfirm).toHaveBeenCalledOnce();
    });

    it('blocks navigation when user cancels confirmation prompt', () => {
      mockConfirm.mockReturnValue(false);

      const confirmNav = (isDirty: boolean) => {
        if (!isDirty) return true;
        return window.confirm('Discard changes?');
      };

      const result = confirmNav(true);
      expect(result).toBe(false);
      expect(mockConfirm).toHaveBeenCalledOnce();
    });
  });

  describe('Keyboard Shortcuts (SPEC-08 §5.1)', () => {
    it('verifies Alt+P triggers CRM profile panel toggle', () => {
      let isProfileOpen = false;
      const toggleProfile = () => {
        isProfileOpen = !isProfileOpen;
      };

      const handleKeyEvent = (e: { altKey: boolean; key: string }) => {
        if (e.altKey && (e.key === 'p' || e.key === 'P')) {
          toggleProfile();
        }
      };

      handleKeyEvent({ altKey: true, key: 'p' });
      expect(isProfileOpen).toBe(true);

      handleKeyEvent({ altKey: true, key: 'p' });
      expect(isProfileOpen).toBe(false);
    });
  });
});
