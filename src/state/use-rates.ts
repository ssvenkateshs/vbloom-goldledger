import { rateRepo } from '@/data';
import { METALS, type Metal, type Rate } from '@/domain';

import { useSettings } from './settings';
import { useQuery } from './use-query';

/** Latest rate per metal in the shop currency. */
export function useLatestRates() {
  const { settings } = useSettings();
  return useQuery(
    async (db) => {
      const entries = await Promise.all(METALS.map(async (m) => [m, await rateRepo.latest(db, m, settings.currency)] as const));
      return Object.fromEntries(entries) as Record<Metal, Rate | null>;
    },
    [settings.currency],
  );
}
