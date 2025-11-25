// utils/cookieHelper.ts

import { setCookie, getCookie, deleteCookie } from 'cookies-next';

const COOKIE_OPTIONS = {
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 ngày
};

// Generic base
export const cookieBase = {
  set<T>(key: string, value: T): void {
    setCookie(key, JSON.stringify(value), COOKIE_OPTIONS);
  },

  get<T>(key: string): T | null {
    const cookie = getCookie(key);
    if (!cookie) return null;
    try {
      return JSON.parse(cookie as string) as T;
    } catch {
      return null;
    }
  },

  remove(key: string): void {
    deleteCookie(key, { path: '/' });
  },
};
