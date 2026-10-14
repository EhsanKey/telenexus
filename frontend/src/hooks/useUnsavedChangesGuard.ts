'use client';

import { useEffect, useCallback } from 'react';

interface UseUnsavedChangesGuardOptions {
  isDirty: boolean;
  message?: string;
}

/**
 * useUnsavedChangesGuard (SPEC-08 §5.3)
 * Tracks form dirty state and intercepts navigation if unsaved modifications exist.
 */
export function useUnsavedChangesGuard({
  isDirty,
  message = 'You have unsaved changes in this profile. Discard changes and continue?',
}: UseUnsavedChangesGuardOptions) {
  // 1. Browser tab unload / refresh interceptor
  useEffect(() => {
    if (!isDirty || typeof window === 'undefined') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);

  // 2. Programmatic navigation confirmation guard
  const confirmNavigation = useCallback((): boolean => {
    if (!isDirty) return true;
    if (typeof window === 'undefined') return true;
    return window.confirm(message);
  }, [isDirty, message]);

  return {
    isDirty,
    confirmNavigation,
  };
}
