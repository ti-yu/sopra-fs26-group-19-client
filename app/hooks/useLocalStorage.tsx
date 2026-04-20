import { useState } from "react";

interface LocalStorage<T> {
  value: T;
  set: (newVal: T) => void;
  clear: () => void;
}

/**
 * This custom hook safely handles SSR by checking for the window before
 * accessing browser sessionStorage. Using sessionStorage (not localStorage)
 * ensures each browser tab has its own independent session, so multiple
 * accounts can be tested simultaneously without interfering with each other.
 *
 * @param key - The storage key, generic type T.
 * @param defaultValue - The default value if nothing is stored yet.
 * @returns An object containing:
 *  - value: The current value (synced with sessionStorage).
 *  - set: Updates both react state & sessionStorage.
 *  - clear: Resets state to defaultValue and deletes the sessionStorage key.
 */
export default function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): LocalStorage<T> {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = globalThis.sessionStorage.getItem(key);
      if (stored) return JSON.parse(stored) as T;
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
    }
    return defaultValue;
  });

  // Simple setter that updates both state and sessionStorage
  const set = (newVal: T) => {
    setValue(newVal);
    if (typeof window !== "undefined") {
      globalThis.sessionStorage.setItem(key, JSON.stringify(newVal));
    }
  };

  // Removes the key from sessionStorage and resets the state
  const clear = () => {
    setValue(defaultValue);
    if (typeof window !== "undefined") {
      globalThis.sessionStorage.removeItem(key);
    }
  };

  return { value, set, clear };
}
