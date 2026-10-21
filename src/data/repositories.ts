import type { SQLiteDatabase } from 'expo-sqlite';

import {
  DEFAULT_SETTINGS,
  SettingsSchema,
  incomingWins,
  nowIso,
  type Item,
  type ItemStatus,
  type Metal,
  type Party,
  type Rate,
  type Settings,
  type Transaction,
  type TransactionKind,
} from '@/domain';

import {
  itemToRow,
  lineToRow,
  partyToRow,
  paymentToRow,
  rateToRow,
  rowToItem,
  rowToLine,
  rowToParty,
  rowToPayment,
  rowToRate,
  rowToTransaction,
  transactionToRow,
  type SqlRow,
} from './mappers';

/**
 * Repositories: thin, typed data access over expo-sqlite. Every write goes
 * through zod-validated domain objects (see mappers.ts), so the database can
 * never hold a record the interchange schema would reject.
 */

const PARTY_UPSERT = `
INSERT INTO parties (id, roles, name, phone, email, address, tax_id, id_document, notes, tags, created_at, updated_at, deleted_at)
VALUES ($id, $roles, $name, $phone, $email, $address, $tax_id, $id_document, $notes, $tags, $created_at, $updated_at, $deleted_at)
ON CONFLICT(id) DO UPDATE SET
  roles=excluded.roles, name=excluded.name, phone=excluded.phone, email=excluded.email, address=excluded.address,
  tax_id=excluded.tax_id, id_document=excluded.id_document, notes=excluded.notes, tags=excluded.tags,
  created_at=excluded.created_at, updated_at=excluded.updated_at, deleted_at=excluded.deleted_at`;

const ITEM_UPSERT = `
INSERT INTO items (id, sku, name, category, metal, fineness, gross_weight_mg, net_weight_mg, stone_weight_mg, hallmark,
  wastage_percent, making_charge_type, making_charge_value, stone_charge_minor, cost_minor, currency, status, supplier_id,
  location, description, tags, created_at, updated_at, deleted_at)
VALUES ($id, $sku, $name, $category, $metal, $fineness, $gross_weight_mg, $net_weight_mg, $stone_weight_mg, $hallmark,
  $wastage_percent, $making_charge_type, $making_charge_value, $stone_charge_minor, $cost_minor, $currency, $status, $supplier_id,
  $location, $description, $tags, $created_at, $updated_at, $deleted_at)
ON CONFLICT(id) DO UPDATE SET
  sku=excluded.sku, name=excluded.name, category=excluded.category, metal=excluded.metal, fineness=excluded.fineness,
  gross_weight_mg=excluded.gross_weight_mg, net_weight_mg=excluded.net_weight_mg, stone_weight_mg=excluded.stone_weight_mg,
  hallmark=excluded.hallmark, wastage_percent=excluded.wastage_percent, making_charge_type=excluded.making_charge_type,
  making_charge_value=excluded.making_charge_value, stone_charge_minor=excluded.stone_charge_minor, cost_minor=excluded.cost_minor,
  currency=excluded.currency, status=excluded.status, supplier_id=excluded.supplier_id, location=excluded.location,
  description=excluded.description, tags=excluded.tags, created_at=excluded.created_at, updated_at=excluded.updated_at,
  deleted_at=excluded.deleted_at`;

const RATE_UPSERT = `
INSERT INTO rates (id, metal, rate_per_gram_fine_minor, currency, source, effective_at, created_at)
VALUES ($id, $metal, $rate_per_gram_fine_minor, $currency, $source, $effective_at, $created_at)
ON CONFLICT(id) DO NOTHING`;

const TXN_UPSERT = `
INSERT INTO transactions (id, kind, number, status, party_id, currency, issued_at, due_at, total_minor, notes, created_at, updated_at, deleted_at)
VALUES ($id, $kind, $number, $status, $party_id, $currency, $issued_at, $due_at, $total_minor, $notes, $created_at, $updated_at, $deleted_at)
ON CONFLICT(id) DO UPDATE SET
  kind=excluded.kind, number=excluded.number, status=excluded.status, party_id=excluded.party_id, currency=excluded.currency,
  issued_at=excluded.issued_at, due_at=excluded.due_at, total_minor=excluded.total_minor, notes=excluded.notes,
  created_at=excluded.created_at, updated_at=excluded.updated_at, deleted_at=excluded.deleted_at`;

const LINE_INSERT = `
INSERT INTO transaction_lines (id, transaction_id, direction, item_id, description, metal, fineness, gross_weight_mg, net_weight_mg,
  rate_per_gram_fine_minor, wastage_percent, making_charge_type, making_charge_value, stone_charge_minor, other_charge_minor,
  discount_minor, tax_percent, amount_minor, sort_order)
VALUES ($id, $transaction_id, $direction, $item_id, $description, $metal, $fineness, $gross_weight_mg, $net_weight_mg,
  $rate_per_gram_fine_minor, $wastage_percent, $making_charge_type, $making_charge_value, $stone_charge_minor, $other_charge_minor,
  $discount_minor, $tax_percent, $amount_minor, $sort_order)`;

const PAYMENT_INSERT = `
INSERT INTO payments (id, transaction_id, direction, method, amount_minor, reference, paid_at, notes)
VALUES ($id, $transaction_id, $direction, $method, $amount_minor, $reference, $paid_at, $notes)`;

// ---------------------------------------------------------------- parties

export const partyRepo = {
  async list(db: SQLiteDatabase, opts: { search?: string; includeDeleted?: boolean } = {}): Promise<Party[]> {
    const where: string[] = [];
    const params: Record<string, string> = {};
    if (!opts.includeDeleted) where.push('deleted_at IS NULL');
    if (opts.search) {
      where.push('(name LIKE $q OR phone LIKE $q OR email LIKE $q)');
      params.$q = `%${opts.search}%`;
    }
    const rows = await db.getAllAsync<SqlRow>(
      `SELECT * FROM parties ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY name COLLATE NOCASE`,
      params,
    );
    return rows.map(rowToParty);
  },

  async get(db: SQLiteDatabase, id: string): Promise<Party | null> {
    const row = await db.getFirstAsync<SqlRow>('SELECT * FROM parties WHERE id = $id', { $id: id });
    return row ? rowToParty(row) : null;
  },

  async upsert(db: SQLiteDatabase, party: Party): Promise<void> {
    await db.runAsync(PARTY_UPSERT, partyToRow(party));
  },

  async softDelete(db: SQLiteDatabase, id: string): Promise<void> {
    const now = nowIso();
    await db.runAsync('UPDATE parties SET deleted_at = $now, updated_at = $now WHERE id = $id', { $now: now, $id: id });
  },

  /** Merge incoming records with last-writer-wins. Returns how many were applied. */
  async merge(db: SQLiteDatabase, incoming: readonly Party[]): Promise<number> {
    let applied = 0;
    await db.withTransactionAsync(async () => {
      for (const p of incoming) {
        const local = await partyRepo.get(db, p.id);
        if (incomingWins(local ?? undefined, p)) {
          await db.runAsync(PARTY_UPSERT, partyToRow(p));
          applied++;
        }
      }
    });
    return applied;
  },
};

// ---------------------------------------------------------------- items

export interface ItemFilter {
  search?: string;
  status?: ItemStatus | 'all';
  metal?: Metal;
  includeDeleted?: boolean;
}

export const itemRepo = {
  async list(db: SQLiteDatabase, f: ItemFilter = {}): Promise<Item[]> {
    const where: string[] = [];
    const params: Record<string, string> = {};
    if (!f.includeDeleted) where.push('deleted_at IS NULL');
    if (f.status && f.status !== 'all') {
      where.push('status = $status');
      params.$status = f.status;
    }
    if (f.metal) {
      where.push('metal = $metal');
      params.$metal = f.metal;
    }
    if (f.search) {
      where.push('(sku LIKE $q OR name LIKE $q OR hallmark LIKE $q OR tags LIKE $q)');
      params.$q = `%${f.search}%`;
    }
    const rows = await db.getAllAsync<SqlRow>(
      `SELECT * FROM items ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY updated_at DESC`,
      params,
    );
    return rows.map(rowToItem);
  },

  async get(db: SQLiteDatabase, id: string): Promise<Item | null> {
    const row = await db.getFirstAsync<SqlRow>('SELECT * FROM items WHERE id = $id', { $id: id });
    return row ? rowToItem(row) : null;
  },

  async upsert(db: SQLiteDatabase, item: Item): Promise<void> {
    await db.runAsync(ITEM_UPSERT, itemToRow(item));
  },

  async setStatus(db: SQLiteDatabase, id: string, status: ItemStatus): Promise<void> {
    await db.runAsync('UPDATE items SET status = $status, updated_at = $now WHERE id = $id', {
      $status: status,
      $now: nowIso(),
      $id: id,
    });
  },

  async softDelete(db: SQLiteDatabase, id: string): Promise<void> {
    const now = nowIso();
    await db.runAsync('UPDATE items SET deleted_at = $now, updated_at = $now WHERE id = $id', { $now: now, $id: id });
  },

  async merge(db: SQLiteDatabase, incoming: readonly Item[]): Promise<number> {
    let applied = 0;
    await db.withTransactionAsync(async () => {
      for (const i of incoming) {
        const local = await itemRepo.get(db, i.id);
        if (incomingWins(local ?? undefined, i)) {
          await db.runAsync(ITEM_UPSERT, itemToRow(i));
          applied++;
        }
      }
    });
    return applied;
  },

  async stockSummary(db: SQLiteDatabase): Promise<{ metal: Metal; pieces: number; netWeightMg: number; fineWeightMg: number }[]> {
    const rows = await db.getAllAsync<{ metal: Metal; pieces: number; net: number; fine: number }>(
      `SELECT metal, COUNT(*) AS pieces, SUM(net_weight_mg) AS net, SUM(net_weight_mg * fineness / 1000.0) AS fine
       FROM items WHERE deleted_at IS NULL AND status IN ('in_stock', 'reserved') GROUP BY metal ORDER BY metal`,
    );
    return rows.map((r) => ({ metal: r.metal, pieces: r.pieces, netWeightMg: r.net ?? 0, fineWeightMg: r.fine ?? 0 }));
  },
};

// ---------------------------------------------------------------- rates

export const rateRepo = {
  async latest(db: SQLiteDatabase, metal: Metal, currency: string): Promise<Rate | null> {
    const row = await db.getFirstAsync<SqlRow>(
      'SELECT * FROM rates WHERE metal = $metal AND currency = $currency ORDER BY effective_at DESC LIMIT 1',
      { $metal: metal, $currency: currency },
    );
    return row ? rowToRate(row) : null;
  },

  async history(db: SQLiteDatabase, metal: Metal, currency: string, limit = 60): Promise<Rate[]> {
    const rows = await db.getAllAsync<SqlRow>(
      'SELECT * FROM rates WHERE metal = $metal AND currency = $currency ORDER BY effective_at DESC LIMIT $limit',
      { $metal: metal, $currency: currency, $limit: limit },
    );
    return rows.map(rowToRate);
  },

  async listAll(db: SQLiteDatabase): Promise<Rate[]> {
    const rows = await db.getAllAsync<SqlRow>('SELECT * FROM rates ORDER BY effective_at DESC');
    return rows.map(rowToRate);
  },

  async add(db: SQLiteDatabase, rate: Rate): Promise<void> {
    await db.runAsync(RATE_UPSERT, rateToRow(rate));
  },

  async merge(db: SQLiteDatabase, incoming: readonly Rate[]): Promise<number> {
    let applied = 0;
    await db.withTransactionAsync(async () => {
      for (const r of incoming) {
        const res = await db.runAsync(RATE_UPSERT, rateToRow(r));
        applied += res.changes;
      }
    });
    return applied;
  },
};

// ---------------------------------------------------------------- transactions

export interface TransactionFilter {
  partyId?: string;
  kind?: TransactionKind | 'all';
  search?: string;
  from?: string;
  to?: string;
  includeDeleted?: boolean;
  limit?: number;
}

async function loadChildren(db: SQLiteDatabase, ids: string[]) {
  if (ids.length === 0) return { lines: new Map<string, SqlRow[]>(), payments: new Map<string, SqlRow[]>() };
  const placeholders = ids.map(() => '?').join(',');
  const lineRows = await db.getAllAsync<SqlRow>(`SELECT * FROM transaction_lines WHERE transaction_id IN (${placeholders}) ORDER BY sort_order`, ids);
  const paymentRows = await db.getAllAsync<SqlRow>(`SELECT * FROM payments WHERE transaction_id IN (${placeholders}) ORDER BY paid_at`, ids);
  const group = (rows: SqlRow[]) => {
    const m = new Map<string, SqlRow[]>();
    for (const r of rows) {
      const key = String(r.transaction_id);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return m;
  };
  return { lines: group(lineRows), payments: group(paymentRows) };
}

async function hydrate(db: SQLiteDatabase, rows: SqlRow[]): Promise<Transaction[]> {
  const { lines, payments } = await loadChildren(
    db,
    rows.map((r) => String(r.id)),
  );
  return rows.map((r) => rowToTransaction(r, (lines.get(String(r.id)) ?? []).map(rowToLine), (payments.get(String(r.id)) ?? []).map(rowToPayment)));
}

export const transactionRepo = {
  async list(db: SQLiteDatabase, f: TransactionFilter = {}): Promise<Transaction[]> {
    const where: string[] = [];
    const params: Record<string, string | number> = {};
    if (!f.includeDeleted) where.push('deleted_at IS NULL');
    if (f.partyId) {
      where.push('party_id = $party');
      params.$party = f.partyId;
    }
    if (f.kind && f.kind !== 'all') {
      where.push('kind = $kind');
      params.$kind = f.kind;
    }
    if (f.from) {
      where.push('issued_at >= $from');
      params.$from = f.from;
    }
    if (f.to) {
      where.push('issued_at < $to');
      params.$to = f.to;
    }
    if (f.search) {
      where.push('(number LIKE $q OR notes LIKE $q)');
      params.$q = `%${f.search}%`;
    }
    const limit = f.limit ? `LIMIT ${Math.max(1, Math.floor(f.limit))}` : '';
    const rows = await db.getAllAsync<SqlRow>(
      `SELECT * FROM transactions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY issued_at DESC ${limit}`,
      params,
    );
    return hydrate(db, rows);
  },

  async get(db: SQLiteDatabase, id: string): Promise<Transaction | null> {
    const row = await db.getFirstAsync<SqlRow>('SELECT * FROM transactions WHERE id = $id', { $id: id });
    if (!row) return null;
    const [txn] = await hydrate(db, [row]);
    return txn ?? null;
  },

  /** Writes the transaction and replaces its lines and payments atomically. */
  async save(db: SQLiteDatabase, txn: Transaction): Promise<void> {
    await db.withTransactionAsync(async () => {
      await writeTransaction(db, txn);
    });
  },

  async softDelete(db: SQLiteDatabase, id: string): Promise<void> {
    const now = nowIso();
    await db.runAsync('UPDATE transactions SET deleted_at = $now, updated_at = $now WHERE id = $id', {
      $now: now,
      $id: id,
    });
  },

  async merge(db: SQLiteDatabase, incoming: readonly Transaction[]): Promise<number> {
    let applied = 0;
    await db.withTransactionAsync(async () => {
      for (const t of incoming) {
        const local = await db.getFirstAsync<SqlRow>('SELECT id, updated_at, deleted_at FROM transactions WHERE id = $id', {
          $id: t.id,
        });
        const localVersioned = local
          ? { id: String(local.id), updatedAt: String(local.updated_at), deletedAt: local.deleted_at as string | null }
          : undefined;
        if (incomingWins(localVersioned, t)) {
          await writeTransaction(db, t);
          applied++;
        }
      }
    });
    return applied;
  },

  /** Signed balance per party: +ve means the party owes the shop. */
  async balances(db: SQLiteDatabase): Promise<Map<string, number>> {
    const rows = await db.getAllAsync<{ party_id: string; balance: number }>(
      `SELECT t.party_id AS party_id,
              SUM(t.total_minor) - COALESCE(SUM(p.net), 0) AS balance
       FROM transactions t
       LEFT JOIN (
         SELECT transaction_id, SUM(CASE WHEN direction = 'in' THEN amount_minor ELSE -amount_minor END) AS net
         FROM payments GROUP BY transaction_id
       ) p ON p.transaction_id = t.id
       WHERE t.deleted_at IS NULL AND t.status = 'final' AND t.party_id IS NOT NULL
       GROUP BY t.party_id`,
    );
    return new Map(rows.map((r) => [r.party_id, r.balance]));
  },

  async nextNumber(db: SQLiteDatabase, prefix: string, year: number): Promise<string> {
    const key = `${prefix}-${year}`;
    let next = 1;
    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<{ value: number }>('SELECT value FROM counters WHERE key = $key', { $key: key });
      next = (row?.value ?? 0) + 1;
      await db.runAsync('INSERT INTO counters (key, value) VALUES ($key, $value) ON CONFLICT(key) DO UPDATE SET value = excluded.value', {
        $key: key,
        $value: next,
      });
    });
    return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
  },
};

async function writeTransaction(db: SQLiteDatabase, txn: Transaction) {
  await db.runAsync(TXN_UPSERT, transactionToRow(txn));
  await db.runAsync('DELETE FROM transaction_lines WHERE transaction_id = $id', { $id: txn.id });
  await db.runAsync('DELETE FROM payments WHERE transaction_id = $id', { $id: txn.id });
  for (const line of txn.lines) await db.runAsync(LINE_INSERT, lineToRow(txn.id, line));
  for (const payment of txn.payments) await db.runAsync(PAYMENT_INSERT, paymentToRow(txn.id, payment));
}

// ---------------------------------------------------------------- settings

const SETTINGS_KEY = 'settings';

export const settingsRepo = {
  async get(db: SQLiteDatabase): Promise<Settings> {
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = $key', {
      $key: SETTINGS_KEY,
    });
    if (!row) return DEFAULT_SETTINGS;
    try {
      return SettingsSchema.parse(JSON.parse(row.value));
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async save(db: SQLiteDatabase, settings: Settings): Promise<void> {
    await db.runAsync('INSERT INTO settings (key, value) VALUES ($key, $value) ON CONFLICT(key) DO UPDATE SET value = excluded.value', {
      $key: SETTINGS_KEY,
      $value: JSON.stringify(SettingsSchema.parse(settings)),
    });
  },
};

// ---------------------------------------------------------------- device state

/** Per-device flags that are not part of the shop's data (never exported). */
export const deviceStateRepo = {
  async get(db: SQLiteDatabase, key: string): Promise<string | null> {
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = $key', { $key: `device:${key}` });
    return row?.value ?? null;
  },
  async set(db: SQLiteDatabase, key: string, value: string): Promise<void> {
    await db.runAsync('INSERT INTO settings (key, value) VALUES ($key, $value) ON CONFLICT(key) DO UPDATE SET value = excluded.value', {
      $key: `device:${key}`,
      $value: value,
    });
  },
};
