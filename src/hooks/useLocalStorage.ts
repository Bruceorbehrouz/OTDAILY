import { useState, useCallback, useEffect } from 'react';

const EVENT = 'otrd-local-storage';

function read<T>(key: string, fallback: T): T {
  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * localStorage-backed state that stays in sync between every hook instance
 * using the same key (and across browser tabs), so views that read the same
 * key — the sidebar and the game board, for example — never drift apart.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [stored, setStored] = useState<T>(() => read(key, initialValue));

  // Re-read during render when the key changes, rather than in an effect, so
  // the first render with a new key already has that key's value.
  const [prevKey, setPrevKey] = useState(key);
  if (prevKey !== key) {
    setPrevKey(key);
    setStored(read(key, initialValue));
  }

  useEffect(() => {
    const sync = (e: Event) => {
      if (e instanceof CustomEvent && e.detail !== key) return;
      if (e instanceof StorageEvent && e.key !== null && e.key !== key) return;
      setStored(read(key, initialValue));
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStored(prev => {
      const next = value instanceof Function ? value(prev) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
      } catch {
        // storage full or unavailable — keep the in-memory value
      }
      return next;
    });
  }, [key]);

  return [stored, setValue] as const;
}
