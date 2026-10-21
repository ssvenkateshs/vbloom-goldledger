import { computeOutstanding, computeTransactionTotal, ItemSchema, SettingsSchema } from '../entities';
import { newId, nowIso } from '../ids';
import {
  createBundle,
  incomingWins,
  itemsFromCsv,
  itemsToCsv,
  mergeRecords,
  parseBundle,
  parseRateFeed,
  partiesFromCsv,
  partiesToCsv,
  serializeBundle,
} from '../interchange';
import { parseCsv, toCsv } from '../csv';

const now = nowIso();

function sampleItem() {
  return ItemSchema.parse({
    id: newId(),
    sku: 'R-001',
    name: 'Plain band, "classic"',
    category: 'ring',
    metal: 'gold',
    fineness: 916,
    grossWeightMg: 5200,
    netWeightMg: 5000,
    currency: 'INR',
    hallmark: { scheme: 'BIS', huid: 'AB12CD' },
    tags: ['bridal', 'new'],
    createdAt: now,
    updatedAt: now,
  });
}

describe('csv codec', () => {
  test('escapes quotes, commas and newlines per RFC 4180', () => {
    const csv = toCsv(['a', 'b'], [{ a: 'x,y', b: 'say "hi"\nthere' }]);
    expect(csv).toBe('a,b\r\n"x,y","say ""hi""\nthere"\r\n');
    expect(parseCsv(csv)).toEqual([
      ['a', 'b'],
      ['x,y', 'say "hi"\nthere'],
    ]);
  });
});

describe('bundle', () => {
  test('round-trips through JSON and validates', () => {
    const item = sampleItem();
    const bundle = createBundle(
      { settings: SettingsSchema.parse({}), parties: [], items: [item], rates: [], transactions: [] },
      { name: 'test', version: '0.0.0' },
    );
    const parsed = parseBundle(serializeBundle(bundle));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.items[0]).toEqual(item);
  });

  test('rejects foreign documents with a readable message', () => {
    expect(parseBundle('{"format":"other"}')).toMatchObject({ ok: false });
    expect(parseBundle('not json').ok).toBe(false);
  });

  test('rejects an incompatible major version', () => {
    const bundle = createBundle({ parties: [], items: [], rates: [], transactions: [] }, { name: 't', version: '0' });
    const text = serializeBundle({ ...bundle, schemaVersion: '2.0.0' });
    expect(parseBundle(text)).toMatchObject({ ok: false, error: expect.stringMatching(/not compatible/) });
  });
});

describe('merge', () => {
  test('last writer wins; deletion wins ties', () => {
    const a = { id: '1', updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: null };
    const b = { ...a, updatedAt: '2026-01-02T00:00:00.000Z' };
    expect(incomingWins(a, b)).toBe(true);
    expect(incomingWins(b, a)).toBe(false);
    expect(incomingWins(a, { ...a, deletedAt: a.updatedAt })).toBe(true);
    expect(incomingWins(undefined, a)).toBe(true);
  });

  test('mergeRecords reports counts', () => {
    const local = [{ id: '1', updatedAt: '2026-01-02T00:00:00.000Z' }];
    const incoming = [
      { id: '1', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: '2', updatedAt: '2026-01-01T00:00:00.000Z' },
    ];
    const { result, summary } = mergeRecords(local, incoming);
    expect(summary).toEqual({ inserted: 1, updated: 0, skipped: 1 });
    expect(result).toHaveLength(2);
  });
});

describe('csv import/export', () => {
  test('items survive a CSV round trip', () => {
    const item = sampleItem();
    const csv = itemsToCsv([item], 'g');
    const { items, errors } = itemsFromCsv(csv, { currency: 'INR', unit: 'g' });
    expect(errors).toEqual([]);
    expect(items[0]).toEqual(item);
  });

  test('spreadsheet-style import with purity in karat', () => {
    const csv = 'sku,name,metal,purity,net_weight\r\nC-1,Chain,gold,22K,12.5\r\n';
    const { items, errors } = itemsFromCsv(csv, { currency: 'INR', unit: 'g' });
    expect(errors).toEqual([]);
    expect(items[0]).toMatchObject({ sku: 'C-1', fineness: 916, netWeightMg: 12500, grossWeightMg: 12500 });
  });

  test('bad rows are reported, not silently dropped', () => {
    const csv = 'sku,name,metal,fineness,net_weight\r\n,Nameless,gold,916,1\r\n';
    const { items, errors } = itemsFromCsv(csv, { currency: 'INR', unit: 'g' });
    expect(items).toHaveLength(0);
    expect(errors[0]).toMatch(/Row 2/);
  });

  test('parties round trip', () => {
    const csv = partiesToCsv([
      {
        id: newId(),
        name: 'Asha',
        roles: ['customer', 'supplier'],
        phone: '+919876543210',
        email: null,
        address: null,
        taxId: null,
        idDocument: null,
        notes: null,
        tags: [],
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ]);
    const { parties, errors } = partiesFromCsv(csv);
    expect(errors).toEqual([]);
    expect(parties[0].roles).toEqual(['customer', 'supplier']);
  });
});

describe('transaction maths', () => {
  test('out lines add, in lines subtract; outstanding nets payments', () => {
    const total = computeTransactionTotal([
      { direction: 'out', amountMinor: 100000 },
      { direction: 'in', amountMinor: 30000 },
    ]);
    expect(total).toBe(70000);
    expect(
      computeOutstanding({
        totalMinor: total,
        status: 'final',
        payments: [{ id: newId(), direction: 'in', method: 'cash', amountMinor: 50000, reference: null, paidAt: now, notes: null }],
      }),
    ).toBe(20000);
  });
});

describe('rate feed', () => {
  test('parses a published rate document', () => {
    const feed = parseRateFeed(
      JSON.stringify({
        format: 'goldledger.rates',
        schemaVersion: '1.0.0',
        rates: [{ metal: 'gold', currency: 'INR', ratePerGramFineMinor: 700000, effectiveAt: now }],
      }),
    );
    expect(feed.ok).toBe(true);
  });
});
