'use client';

import { useMemo } from 'react';

export function useCurrentUser() {
  const currentUser = useMemo(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('info_user') : null;
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }, []);

  const currentId = useMemo(() => {
    return String(currentUser?.['_id'] || (currentUser?.['username'] as string) || '');
  }, [currentUser]);

  return { currentUser, currentId };
}
