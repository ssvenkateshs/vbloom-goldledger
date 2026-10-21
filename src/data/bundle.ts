import type { SQLiteDatabase } from 'expo-sqlite';

import { createBundle, type Bundle } from '@/domain';

import { itemRepo, partyRepo, rateRepo, settingsRepo, transactionRepo } from './repositories';

export const APP_GENERATOR = { name: 'GoldLedger', version: '1.0.0' };

/** Everything in the database, including soft-deleted rows so merges converge. */
export async function exportBundle(db: SQLiteDatabase): Promise<Bundle> {
  const [settings, parties, items, rates, transactions] = await Promise.all([
    settingsRepo.get(db),
    partyRepo.list(db, { includeDeleted: true }),
    itemRepo.list(db, { includeDeleted: true }),
    rateRepo.listAll(db),
    transactionRepo.list(db, { includeDeleted: true }),
  ]);
  return createBundle({ settings, parties, items, rates, transactions }, APP_GENERATOR);
}

export interface ImportSummary {
  parties: number;
  items: number;
  rates: number;
  transactions: number;
  settingsApplied: boolean;
}

/** Merge a bundle into the database (last-writer-wins per record). */
export async function importBundle(db: SQLiteDatabase, bundle: Bundle, options: { applySettings?: boolean } = {}): Promise<ImportSummary> {
  const parties = await partyRepo.merge(db, bundle.parties);
  const items = await itemRepo.merge(db, bundle.items);
  const rates = await rateRepo.merge(db, bundle.rates);
  const transactions = await transactionRepo.merge(db, bundle.transactions);
  let settingsApplied = false;
  if (options.applySettings && bundle.settings) {
    await settingsRepo.save(db, bundle.settings);
    settingsApplied = true;
  }
  return { parties, items, rates, transactions, settingsApplied };
}
