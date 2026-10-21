import { useSyncExternalStore } from 'react';

/**
 * Hand-off between a picker screen and the form that opened it. The picker
 * stores a selection under a key; the form reads and clears it on focus.
 */
type Selection = { key: string; id: string; nonce: number };

let current: Selection | null = null;
let nonce = 0;
const listeners = new Set<() => void>();

export function setPicked(key: string, id: string) {
  current = { key, id, nonce: ++nonce };
  listeners.forEach((l) => l());
}

export function takePicked(key: string): string | null {
  if (current?.key !== key) return null;
  const id = current.id;
  current = null;
  listeners.forEach((l) => l());
  return id;
}

export function usePicked(key: string): Selection | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (current?.key === key ? current : null),
    () => null,
  );
}
