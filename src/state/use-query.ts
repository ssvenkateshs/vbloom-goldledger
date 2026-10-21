import { useFocusEffect } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs a database read whenever the screen gains focus or `deps` change, so a
 * screen never shows stale data after an edit elsewhere. `deps` must be
 * JSON-serialisable (strings, numbers, booleans).
 */
export function useQuery<T>(fn: (db: SQLiteDatabase) => Promise<T>, deps: readonly (string | number | boolean | null | undefined)[]) {
  const db = useSQLiteContext();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  const key = JSON.stringify(deps);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fnRef.current(db));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Re-run when the query inputs change while the screen stays focused (search text, filters).
  const lastKey = useRef(key);
  useEffect(() => {
    if (lastKey.current !== key) {
      lastKey.current = key;
      refresh();
    }
  }, [key, refresh]);

  return { data, error, loading, refresh };
}
