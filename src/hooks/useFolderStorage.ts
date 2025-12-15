import { useEffect } from 'react';

export function useFolderStorage<T>(key: string, setter: (v: T) => void, fallback: T) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setter(raw ? (JSON.parse(raw) as T) : fallback);
    } catch {
      setter(fallback);
    }
  }, [fallback, key, setter]);
}
