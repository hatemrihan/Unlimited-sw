import { useState, useEffect } from 'react';

/**
 * Enterprise Performance Hook
 * Pre-empts main-thread UI locking by buffering keyboard input states
 * actively delaying DOM mutations (like table filtering) until inputs pause.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes (also clears on unmount)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
