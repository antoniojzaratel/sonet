import { useEffect, useState } from 'react';

/**
 * Delays reflecting `value` until it's stopped changing for `delayMs`.
 * Used to keep search inputs feeling instant while not firing a live API
 * call (Spotify search, in this app's case) on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
