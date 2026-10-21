import { z } from 'zod';

import { toCsv, parseCsvObjects } from './csv';
import {
  ItemSchema,
  PartySchema,
  RateSchema,
  SettingsSchema,
  TransactionSchema,
  type Item,
  type Party,
  type Rate,
  type Transaction,
} from './entities';
import { newId, nowIso } from './ids';
import { formatPurity } from './purity';
import { fromMg, toMg, type WeightUnit } from './units';

/**
 * GoldLedger interchange bundle.
 *
 * A self-describing JSON document that carries a complete (or partial) copy of a
 * shop's data. It is what Backup, Restore, device-to-device transfer and the
 * sync API all speak. The JSON Schema is published at
 * `docs/schemas/goldledger-bundle.schema.json` and generated from this file.
 *
 * Merge rule: records are matched by `id`; the copy with the later `updatedAt`
 * wins ("last writer wins"); a soft-deleted record (`deletedAt` set) wins over a
 * live one with an older `updatedAt`. Transactions are replaced whole, including
 * lines and payments.
 */

export const BUNDLE_FORMAT = 'goldledger.bundle';
export const BUNDLE_SCHEMA_VERSION = '1.0.0';
export const BUNDLE_SCHEMA_URL = 'https://raw.githubusercontent.com/ssvenkateshs/vbloom-goldledger/main/docs/schemas/goldledger-bundle.schema.json';
export const BUNDLE_MIME_TYPE = 'application/vnd.goldledger.bundle+json';
export const BUNDLE_FILE_EXTENSION = '.goldledger.json';

export const BundleSchema = z
  .object({
    $schema: z.string().optional(),
    format: z.literal(BUNDLE_FORMAT),
    schemaVersion: z
      .string()
      .regex(/^\d+\.\d+\.\d+$/)
      .describe('Semantic version of this document format'),
    exportedAt: z.iso.datetime({ offset: true }),
    generator: z.object({
      name: z.string(),
      version: z.string(),
      deviceId: z.string().optional(),
    }),
    settings: SettingsSchema.optional(),
    parties: z.array(PartySchema).default([]),
    items: z.array(ItemSchema).default([]),
    rates: z.array(RateSchema).default([]),
    transactions: z.array(TransactionSchema).default([]),
  })
  .describe('A GoldLedger data bundle: a complete or partial snapshot of one shop');
export type Bundle = z.infer<typeof BundleSchema>;

export interface BundleParts {
  settings?: z.infer<typeof SettingsSchema>;
  parties: Party[];
  items: Item[];
  rates: Rate[];
  transactions: Transaction[];
}

export function createBundle(parts: BundleParts, generator: Bundle['generator']): Bundle {
  return {
    $schema: BUNDLE_SCHEMA_URL,
    format: BUNDLE_FORMAT,
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    exportedAt: nowIso(),
    generator,
    settings: parts.settings,
    parties: parts.parties,
    items: parts.items,
    rates: parts.rates,
    transactions: parts.transactions,
  };
}

export function serializeBundle(bundle: Bundle): string {
  return JSON.stringify(bundle, null, 2);
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseBundle(text: string): ParseResult<Bundle> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  const result = BundleSchema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.length ? ` at ${issue.path.join('.')}` : '';
    return { ok: false, error: `Not a GoldLedger bundle${path}: ${issue?.message ?? 'invalid'}` };
  }
  const [major] = result.data.schemaVersion.split('.').map(Number);
  const [supportedMajor] = BUNDLE_SCHEMA_VERSION.split('.').map(Number);
  if (major !== supportedMajor) {
    return {
      ok: false,
      error: `Bundle schema ${result.data.schemaVersion} is not compatible with ${BUNDLE_SCHEMA_VERSION}.`,
    };
  }
  return { ok: true, value: result.data };
}

// ---------------------------------------------------------------- merge

export interface Versioned {
  id: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/** Decide whether `incoming` should replace `local` under last-writer-wins. */
export function incomingWins(local: Versioned | undefined, incoming: Versioned): boolean {
  if (!local) return true;
  if (incoming.updatedAt > local.updatedAt) return true;
  if (incoming.updatedAt < local.updatedAt) return false;
  // Same instant: a deletion is the more conservative outcome.
  return Boolean(incoming.deletedAt) && !local.deletedAt;
}

export interface MergeSummary {
  inserted: number;
  updated: number;
  skipped: number;
}

export function mergeRecords<T extends Versioned>(
  local: readonly T[],
  incoming: readonly T[],
): {
  result: T[];
  summary: MergeSummary;
} {
  const byId = new Map(local.map((r) => [r.id, r]));
  const summary: MergeSummary = { inserted: 0, updated: 0, skipped: 0 };
  for (const rec of incoming) {
    const existing = byId.get(rec.id);
    if (incomingWins(existing, rec)) {
      byId.set(rec.id, rec);
      if (existing) summary.updated++;
      else summary.inserted++;
    } else {
      summary.skipped++;
    }
  }
  return { result: [...byId.values()], summary };
}

// ---------------------------------------------------------------- CSV

export const ITEM_CSV_COLUMNS = [
  'id',
  'sku',
  'name',
  'category',
  'metal',
  'fineness',
  'purity',
  'gross_weight',
  'net_weight',
  'stone_weight',
  'weight_unit',
  'huid',
  'wastage_percent',
  'making_charge_type',
  'making_charge_value',
  'stone_charge',
  'cost',
  'currency',
  'status',
  'location',
  'description',
  'tags',
  'created_at',
  'updated_at',
] as const;

export function itemsToCsv(items: readonly Item[], unit: WeightUnit): string {
  return toCsv(
    ITEM_CSV_COLUMNS,
    items.map((i) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      category: i.category,
      metal: i.metal,
      fineness: i.fineness,
      purity: formatPurity(i.metal, i.fineness),
      gross_weight: fromMg(i.grossWeightMg, unit),
      net_weight: fromMg(i.netWeightMg, unit),
      stone_weight: fromMg(i.stoneWeightMg, unit),
      weight_unit: unit,
      huid: i.hallmark?.huid ?? '',
      wastage_percent: i.wastagePercent,
      making_charge_type: i.makingChargeType,
      making_charge_value: i.makingChargeValue,
      stone_charge: i.stoneChargeMinor / 100,
      cost: i.costMinor === null ? '' : i.costMinor / 100,
      currency: i.currency,
      status: i.status,
      location: i.location ?? '',
      description: i.description ?? '',
      tags: i.tags.join(';'),
      created_at: i.createdAt,
      updated_at: i.updatedAt,
    })),
  );
}

export const PARTY_CSV_COLUMNS = ['id', 'name', 'roles', 'phone', 'email', 'address', 'tax_id', 'notes', 'tags', 'created_at', 'updated_at'] as const;

export function partiesToCsv(parties: readonly Party[]): string {
  return toCsv(
    PARTY_CSV_COLUMNS,
    parties.map((p) => ({
      id: p.id,
      name: p.name,
      roles: p.roles.join(';'),
      phone: p.phone ?? '',
      email: p.email ?? '',
      address: p.address ?? '',
      tax_id: p.taxId ?? '',
      notes: p.notes ?? '',
      tags: p.tags.join(';'),
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    })),
  );
}

export const TRANSACTION_CSV_COLUMNS = [
  'id',
  'number',
  'kind',
  'status',
  'issued_at',
  'party_id',
  'currency',
  'total',
  'paid',
  'outstanding',
  'line_count',
  'notes',
] as const;

export function transactionsToCsv(transactions: readonly Transaction[]): string {
  return toCsv(
    TRANSACTION_CSV_COLUMNS,
    transactions.map((t) => {
      const paid = t.payments.reduce((s, p) => s + (p.direction === 'in' ? p.amountMinor : -p.amountMinor), 0);
      return {
        id: t.id,
        number: t.number,
        kind: t.kind,
        status: t.status,
        issued_at: t.issuedAt,
        party_id: t.partyId ?? '',
        currency: t.currency,
        total: t.totalMinor / 100,
        paid: paid / 100,
        outstanding: t.status === 'void' ? 0 : (t.totalMinor - paid) / 100,
        line_count: t.lines.length,
        notes: t.notes ?? '',
      };
    }),
  );
}

/**
 * Import items from a CSV exported by GoldLedger or prepared in a spreadsheet.
 * Required columns: sku, name, metal, fineness (or purity like "22K"), net_weight.
 * Optional: everything else in ITEM_CSV_COLUMNS. Unknown columns are ignored.
 */
export function itemsFromCsv(text: string, defaults: { currency: string; unit: WeightUnit }): { items: Item[]; errors: string[] } {
  const rows = parseCsvObjects(text);
  const items: Item[] = [];
  const errors: string[] = [];
  rows.forEach((row, index) => {
    const line = index + 2;
    const unit = (row.weight_unit as WeightUnit) || defaults.unit;
    const fineness = parseFineness(row.fineness, row.purity);
    const now = nowIso();
    const candidate = {
      id: row.id || newId(),
      sku: row.sku,
      name: row.name,
      category: row.category || 'other',
      metal: row.metal || 'gold',
      fineness,
      grossWeightMg: toMg(Number(row.gross_weight || row.net_weight || 0), unit),
      netWeightMg: toMg(Number(row.net_weight || 0), unit),
      stoneWeightMg: toMg(Number(row.stone_weight || 0), unit),
      hallmark: row.huid ? { scheme: 'BIS', huid: row.huid } : null,
      wastagePercent: Number(row.wastage_percent || 0),
      makingChargeType: row.making_charge_type || 'per_gram',
      makingChargeValue: Number(row.making_charge_value || 0),
      stoneChargeMinor: Math.round(Number(row.stone_charge || 0) * 100),
      costMinor: row.cost ? Math.round(Number(row.cost) * 100) : null,
      currency: row.currency || defaults.currency,
      status: row.status || 'in_stock',
      location: row.location || null,
      description: row.description || null,
      tags: row.tags ? row.tags.split(';').filter(Boolean) : [],
      createdAt: row.created_at || now,
      updatedAt: row.updated_at || now,
      deletedAt: null,
    };
    const parsed = ItemSchema.safeParse(candidate);
    if (parsed.success) items.push(parsed.data);
    else errors.push(`Row ${line}: ${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message}`);
  });
  return { items, errors };
}

function parseFineness(fineness: string | undefined, purity: string | undefined): number {
  if (fineness && fineness.trim() !== '') return Number(fineness);
  if (purity) {
    const m = purity.match(/(\d+(?:\.\d+)?)\s*K/i);
    if (m) return Math.floor((Number(m[1]) / 24) * 1000 + 1e-9);
    const n = Number(purity.replace(/[^\d.]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

export function partiesFromCsv(text: string): { parties: Party[]; errors: string[] } {
  const rows = parseCsvObjects(text);
  const parties: Party[] = [];
  const errors: string[] = [];
  rows.forEach((row, index) => {
    const now = nowIso();
    const parsed = PartySchema.safeParse({
      id: row.id || newId(),
      name: row.name,
      roles: row.roles ? row.roles.split(';').filter(Boolean) : ['customer'],
      phone: row.phone || null,
      email: row.email || null,
      address: row.address || null,
      taxId: row.tax_id || null,
      notes: row.notes || null,
      tags: row.tags ? row.tags.split(';').filter(Boolean) : [],
      createdAt: row.created_at || now,
      updatedAt: row.updated_at || now,
      deletedAt: null,
    });
    if (parsed.success) parties.push(parsed.data);
    else errors.push(`Row ${index + 2}: ${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message}`);
  });
  return { parties, errors };
}

// ---------------------------------------------------------------- rate feed

/**
 * A rate document is a tiny JSON file a shop can host anywhere (a static page,
 * Google Drive, an S3 bucket) so that every device pulls the same daily rates.
 */
export const RateFeedSchema = z
  .object({
    format: z.literal('goldledger.rates'),
    schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    source: z.string().optional(),
    rates: z.array(
      z.object({
        metal: RateSchema.shape.metal,
        currency: RateSchema.shape.currency,
        ratePerGramFineMinor: RateSchema.shape.ratePerGramFineMinor,
        effectiveAt: z.iso.datetime({ offset: true }),
      }),
    ),
  })
  .describe('A published list of metal rates that devices can poll');
export type RateFeed = z.infer<typeof RateFeedSchema>;

export function parseRateFeed(text: string): ParseResult<RateFeed> {
  try {
    const result = RateFeedSchema.safeParse(JSON.parse(text));
    if (!result.success) return { ok: false, error: result.error.issues[0]?.message ?? 'Invalid rate feed' };
    return { ok: true, value: result.data };
  } catch {
    return { ok: false, error: 'The rate feed is not valid JSON.' };
  }
}
