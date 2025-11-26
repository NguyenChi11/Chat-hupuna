// utils/cookieHelper.ts

type CookieOptions = {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
};

function setCookie(key: string, value: string, options: CookieOptions = {}) {
  if (typeof document === 'undefined') return;
  const parts: string[] = [`${encodeURIComponent(key)}=${encodeURIComponent(value)}`];
  const path = options.path ?? '/';
  if (path) parts.push(`Path=${path}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${Math.max(0, options.maxAge)}`);
  else if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  document.cookie = parts.join('; ');
}

function getCookie(key: string): string | null {
  if (typeof document === 'undefined') return null;
  const name = `${encodeURIComponent(key)}=`;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const c of cookies) {
    if (c.startsWith(name)) return decodeURIComponent(c.slice(name.length));
  }
  return null;
}

function deleteCookie(key: string, options: CookieOptions = {}) {
  setCookie(key, '', { ...options, maxAge: 0 });
}

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
