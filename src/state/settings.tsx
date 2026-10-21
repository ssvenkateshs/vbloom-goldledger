import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { settingsRepo } from '@/data';
import { DEFAULT_SETTINGS, type Settings } from '@/domain';

interface SettingsContextValue {
  settings: Settings;
  loaded: boolean;
  update: (patch: Partial<Settings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  update: async () => {},
});

export function SettingsProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    settingsRepo.get(db).then((s) => {
      if (!cancelled) {
        setSettings(s);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const update = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      await settingsRepo.save(db, next);
      setSettings(next);
    },
    [db, settings],
  );

  const value = useMemo(() => ({ settings, loaded, update }), [settings, loaded, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
