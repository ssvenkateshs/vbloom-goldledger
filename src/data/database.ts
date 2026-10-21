import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'goldledger.db';

/**
 * Schema migrations. Each entry upgrades the database from `version - 1` to
 * `version`; the current version is kept in SQLite's `PRAGMA user_version`.
 * Never edit a released migration; append a new one.
 *
 * Column conventions mirror the domain schemas: snake_case names, milligrams for
 * weights, minor units for money, ISO 8601 text for timestamps, JSON text for
 * arrays/objects (`roles`, `tags`, `hallmark`).
 */
const MIGRATIONS: readonly string[] = [
  // 1: initial schema
  `
  CREATE TABLE parties (
    id TEXT PRIMARY KEY NOT NULL,
    roles TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    tax_id TEXT,
    id_document TEXT,
    notes TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE INDEX parties_name ON parties(name);

  CREATE TABLE items (
    id TEXT PRIMARY KEY NOT NULL,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    metal TEXT NOT NULL,
    fineness INTEGER NOT NULL,
    gross_weight_mg INTEGER NOT NULL,
    net_weight_mg INTEGER NOT NULL,
    stone_weight_mg INTEGER NOT NULL DEFAULT 0,
    hallmark TEXT,
    wastage_percent REAL NOT NULL DEFAULT 0,
    making_charge_type TEXT NOT NULL DEFAULT 'per_gram',
    making_charge_value REAL NOT NULL DEFAULT 0,
    stone_charge_minor INTEGER NOT NULL DEFAULT 0,
    cost_minor INTEGER,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_stock',
    supplier_id TEXT,
    location TEXT,
    description TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE INDEX items_sku ON items(sku);
  CREATE INDEX items_status ON items(status);

  CREATE TABLE rates (
    id TEXT PRIMARY KEY NOT NULL,
    metal TEXT NOT NULL,
    rate_per_gram_fine_minor REAL NOT NULL,
    currency TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    effective_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX rates_metal_effective ON rates(metal, effective_at DESC);

  CREATE TABLE transactions (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'final',
    party_id TEXT,
    currency TEXT NOT NULL,
    issued_at TEXT NOT NULL,
    due_at TEXT,
    total_minor INTEGER NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE INDEX transactions_issued ON transactions(issued_at DESC);
  CREATE INDEX transactions_party ON transactions(party_id);

  CREATE TABLE transaction_lines (
    id TEXT PRIMARY KEY NOT NULL,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    direction TEXT NOT NULL,
    item_id TEXT,
    description TEXT NOT NULL,
    metal TEXT NOT NULL,
    fineness INTEGER NOT NULL,
    gross_weight_mg INTEGER NOT NULL,
    net_weight_mg INTEGER NOT NULL,
    rate_per_gram_fine_minor REAL NOT NULL,
    wastage_percent REAL NOT NULL DEFAULT 0,
    making_charge_type TEXT NOT NULL DEFAULT 'flat',
    making_charge_value REAL NOT NULL DEFAULT 0,
    stone_charge_minor INTEGER NOT NULL DEFAULT 0,
    other_charge_minor INTEGER NOT NULL DEFAULT 0,
    discount_minor INTEGER NOT NULL DEFAULT 0,
    tax_percent REAL NOT NULL DEFAULT 0,
    amount_minor INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX transaction_lines_txn ON transaction_lines(transaction_id);
  CREATE INDEX transaction_lines_item ON transaction_lines(item_id);

  CREATE TABLE payments (
    id TEXT PRIMARY KEY NOT NULL,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    direction TEXT NOT NULL,
    method TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    reference TEXT,
    paid_at TEXT NOT NULL,
    notes TEXT
  );
  CREATE INDEX payments_txn ON payments(transaction_id);

  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE counters (
    key TEXT PRIMARY KEY NOT NULL,
    value INTEGER NOT NULL
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= SCHEMA_VERSION) return;
  while (version < SCHEMA_VERSION) {
    const sql = MIGRATIONS[version];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
    });
    version += 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}
