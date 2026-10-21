import type { SQLiteDatabase } from 'expo-sqlite';

import { rateRepo } from '@/data';
import { newId, nowIso, parseRateFeed, type Rate } from '@/domain';

/**
 * Pull rates from a published GoldLedger rate document (see
 * docs/INTEROPERABILITY.md). Only observations newer than what the device
 * already holds are stored, so polling is idempotent.
 */
export async function pullRateFeed(db: SQLiteDatabase, url: string): Promise<{ added: number; source: string }> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Rate feed returned HTTP ${response.status}`);
  const parsed = parseRateFeed(await response.text());
  if (!parsed.ok) throw new Error(parsed.error);
  const source = parsed.value.source ?? url;
  let added = 0;
  for (const r of parsed.value.rates) {
    const latest = await rateRepo.latest(db, r.metal, r.currency);
    if (latest && latest.effectiveAt >= r.effectiveAt) continue;
    const rate: Rate = {
      id: newId(),
      metal: r.metal,
      currency: r.currency,
      ratePerGramFineMinor: r.ratePerGramFineMinor,
      source,
      effectiveAt: r.effectiveAt,
      createdAt: nowIso(),
    };
    await rateRepo.add(db, rate);
    added++;
  }
  return { added, source };
}
