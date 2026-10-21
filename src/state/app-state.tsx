import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { deviceStateRepo } from '@/data';
import { hasPin } from '@/services/pin';

interface AppStateValue {
  ready: boolean;
  onboarded: boolean;
  pinEnabled: boolean;
  locked: boolean;
  completeOnboarding: () => Promise<void>;
  refreshPin: () => Promise<void>;
  unlock: () => void;
  lock: () => void;
}

const Ctx = createContext<AppStateValue>({
  ready: false,
  onboarded: false,
  pinEnabled: false,
  locked: false,
  completeOnboarding: async () => {},
  refreshPin: async () => {},
  unlock: () => {},
  lock: () => {},
});

/** Re-lock after this long in the background. */
const RELOCK_AFTER_MS = 60_000;

export function AppStateProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [flag, pin] = await Promise.all([deviceStateRepo.get(db, 'onboarded'), hasPin()]);
      if (cancelled) return;
      setOnboarded(flag === '1');
      setPinEnabled(pin);
      setLocked(pin);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAt.current ??= Date.now();
      } else if (state === 'active') {
        const away = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
        backgroundedAt.current = null;
        if (pinEnabled && away > RELOCK_AFTER_MS) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [pinEnabled]);

  const completeOnboarding = useCallback(async () => {
    await deviceStateRepo.set(db, 'onboarded', '1');
    setOnboarded(true);
  }, [db]);

  const refreshPin = useCallback(async () => {
    setPinEnabled(await hasPin());
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      ready,
      onboarded,
      pinEnabled,
      locked,
      completeOnboarding,
      refreshPin,
      unlock: () => setLocked(false),
      lock: () => setLocked(true),
    }),
    [ready, onboarded, pinEnabled, locked, completeOnboarding, refreshPin],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  return useContext(Ctx);
}
