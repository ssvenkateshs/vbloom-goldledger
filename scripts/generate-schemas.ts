/**
 * Emits JSON Schema (draft 2020-12) for the interchange formats from the zod
 * definitions, so the published schema can never drift from the code.
 *
 *   npm run schemas
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { z } from 'zod';

import { BUNDLE_SCHEMA_VERSION, BundleSchema, RateFeedSchema } from '../src/domain/interchange';
import { ItemSchema, PartySchema, RateSchema, SettingsSchema, TransactionSchema } from '../src/domain/entities';

const out = join(__dirname, '..', 'docs', 'schemas');
mkdirSync(out, { recursive: true });

const base = 'https://raw.githubusercontent.com/ssvenkateshs/vbloom-goldledger/main/docs/schemas/';

function emit(name: string, schema: z.ZodType, title: string, description: string) {
  const json = z.toJSONSchema(schema, { target: 'draft-2020-12', unrepresentable: 'any' }) as Record<string, unknown>;
  const doc = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `${base}${name}.schema.json`,
    title,
    description,
    'x-goldledger-version': BUNDLE_SCHEMA_VERSION,
    ...json,
  };
  writeFileSync(join(out, `${name}.schema.json`), JSON.stringify(doc, null, 2) + '\n');
  console.log(`wrote docs/schemas/${name}.schema.json`);
}

emit(
  'goldledger-bundle',
  BundleSchema,
  'GoldLedger bundle',
  'Complete or partial snapshot of one shop: settings, parties, items, rates and transactions.',
);
emit('goldledger-rates', RateFeedSchema, 'GoldLedger rate feed', 'A published list of metal rates that devices poll.');
emit('party', PartySchema, 'Party', 'A customer, supplier or artisan.');
emit('item', ItemSchema, 'Item', 'A single piece of stock.');
emit('rate', RateSchema, 'Rate', 'A metal rate observation.');
emit('transaction', TransactionSchema, 'Transaction', 'A sale, purchase, exchange, repair, order or payment with its lines and payments.');
emit('settings', SettingsSchema, 'Settings', 'Shop-level configuration.');
