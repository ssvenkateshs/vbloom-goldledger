import { z } from 'zod';

import { MAKING_CHARGE_TYPES } from './pricing';
import { METALS } from './purity';
import { WEIGHT_UNITS } from './units';

/**
 * Entity schemas. These are the single source of truth for what a record looks
 * like in the database, in the JSON interchange bundle and in the sync API.
 * `docs/schemas/*.json` are generated from them (`npm run schemas`).
 *
 * Conventions shared by every entity:
 *  - `id`         RFC 4122 v4 UUID, assigned by the creating device
 *  - `createdAt`, `updatedAt`, `deletedAt`   ISO 8601 UTC timestamps
 *  - soft delete via `deletedAt`; records are never physically removed so that
 *    merges between devices stay convergent
 *  - weights in milligrams, purity in fineness (‰), money in integer minor units
 */

export const IsoDateTime = z.iso.datetime({ offset: true }).describe('ISO 8601 timestamp');
export const Uuid = z.uuid().describe('RFC 4122 UUID');
export const Currency = z
  .string()
  .regex(/^[A-Z]{3}$/)
  .describe('ISO 4217 alphabetic currency code');
export const WeightMgSchema = z.int().min(0).describe('Weight in milligrams');
export const FinenessSchema = z.int().min(0).max(1000).describe('Fineness in parts per thousand');
export const MinorUnits = z.int().describe('Amount in minor currency units (e.g. paise, cents)');
export const Percent = z.number().min(0).max(100);
export const MetalSchema = z.enum(METALS);
export const WeightUnitSchema = z.enum(WEIGHT_UNITS);
export const MakingChargeTypeSchema = z.enum(MAKING_CHARGE_TYPES);

const Timestamps = {
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  deletedAt: IsoDateTime.nullable().default(null),
};

// ---------------------------------------------------------------- Party

export const PARTY_ROLES = ['customer', 'supplier', 'artisan'] as const;
export const PartyRoleSchema = z.enum(PARTY_ROLES);
export type PartyRole = z.infer<typeof PartyRoleSchema>;

export const PartySchema = z
  .object({
    id: Uuid,
    roles: z.array(PartyRoleSchema).min(1),
    name: z.string().trim().min(1).max(200),
    phone: z.string().trim().max(32).nullable().default(null).describe('Preferably E.164, e.g. +919876543210'),
    email: z.string().trim().max(254).nullable().default(null),
    address: z.string().trim().max(1000).nullable().default(null),
    taxId: z.string().trim().max(64).nullable().default(null).describe('GSTIN, VAT number or similar'),
    idDocument: z.string().trim().max(128).nullable().default(null).describe('KYC reference, e.g. PAN or passport number'),
    notes: z.string().max(4000).nullable().default(null),
    tags: z.array(z.string().trim().min(1).max(40)).default([]),
    ...Timestamps,
  })
  .describe('A customer, supplier or artisan (karigar)');
export type Party = z.infer<typeof PartySchema>;

// ---------------------------------------------------------------- Item

export const ITEM_CATEGORIES = [
  'ring',
  'chain',
  'necklace',
  'bangle',
  'bracelet',
  'earring',
  'pendant',
  'anklet',
  'nose_pin',
  'mangalsutra',
  'coin',
  'bar',
  'loose_stone',
  'other',
] as const;
export const ItemCategorySchema = z.enum(ITEM_CATEGORIES);
export type ItemCategory = z.infer<typeof ItemCategorySchema>;

export const ITEM_STATUSES = ['in_stock', 'reserved', 'sold', 'consigned', 'returned', 'scrapped'] as const;
export const ItemStatusSchema = z.enum(ITEM_STATUSES);
export type ItemStatus = z.infer<typeof ItemStatusSchema>;

export const HallmarkSchema = z
  .object({
    scheme: z.string().trim().min(1).max(32).describe('e.g. BIS, LBMA, Assay Office'),
    huid: z.string().trim().max(32).nullable().default(null).describe('Hallmark Unique ID (BIS: 6 alphanumeric)'),
    centre: z.string().trim().max(120).nullable().default(null).describe('Assaying & hallmarking centre'),
    date: z.iso.date().nullable().default(null),
  })
  .describe('Hallmarking details');
export type Hallmark = z.infer<typeof HallmarkSchema>;

export const ItemSchema = z
  .object({
    id: Uuid,
    sku: z.string().trim().min(1).max(64).describe('Shop-assigned stock code; printed on the tag'),
    name: z.string().trim().min(1).max(200),
    category: ItemCategorySchema,
    metal: MetalSchema,
    fineness: FinenessSchema,
    grossWeightMg: WeightMgSchema,
    netWeightMg: WeightMgSchema.describe('Metal weight excluding stones'),
    stoneWeightMg: WeightMgSchema.default(0),
    hallmark: HallmarkSchema.nullable().default(null),
    wastagePercent: Percent.default(0),
    makingChargeType: MakingChargeTypeSchema.default('per_gram'),
    makingChargeValue: z.number().min(0).default(0),
    stoneChargeMinor: MinorUnits.default(0),
    costMinor: MinorUnits.nullable().default(null).describe('Landed cost, for margin reporting'),
    currency: Currency,
    status: ItemStatusSchema.default('in_stock'),
    supplierId: Uuid.nullable().default(null),
    location: z.string().trim().max(120).nullable().default(null).describe('Tray, safe, branch ...'),
    description: z.string().max(4000).nullable().default(null),
    tags: z.array(z.string().trim().min(1).max(40)).default([]),
    ...Timestamps,
  })
  .refine((v) => v.netWeightMg <= v.grossWeightMg, {
    message: 'netWeightMg cannot exceed grossWeightMg',
    path: ['netWeightMg'],
  })
  .describe('A single piece of stock');
export type Item = z.infer<typeof ItemSchema>;

// ---------------------------------------------------------------- Rate

export const RateSchema = z
  .object({
    id: Uuid,
    metal: MetalSchema,
    ratePerGramFineMinor: z.number().min(0).describe('Price of 1 g of 1000-fine metal, minor units'),
    currency: Currency,
    source: z.string().trim().min(1).max(120).default('manual').describe('"manual" or a provider identifier/URL'),
    effectiveAt: IsoDateTime,
    createdAt: IsoDateTime,
  })
  .describe('A metal rate observation');
export type Rate = z.infer<typeof RateSchema>;

// ---------------------------------------------------------------- Transaction

export const TRANSACTION_KINDS = ['sale', 'purchase', 'exchange', 'repair', 'order', 'payment'] as const;
export const TransactionKindSchema = z.enum(TRANSACTION_KINDS);
export type TransactionKind = z.infer<typeof TransactionKindSchema>;

export const TRANSACTION_STATUSES = ['draft', 'final', 'void'] as const;
export const TransactionStatusSchema = z.enum(TRANSACTION_STATUSES);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

/** `out`: metal leaves the shop (sold to party). `in`: metal enters (bought from party). */
export const LineDirectionSchema = z.enum(['out', 'in']);
export type LineDirection = z.infer<typeof LineDirectionSchema>;

export const TransactionLineSchema = z
  .object({
    id: Uuid,
    direction: LineDirectionSchema,
    itemId: Uuid.nullable().default(null).describe('Stock item, when the line is a catalogued piece'),
    description: z.string().trim().min(1).max(300),
    metal: MetalSchema,
    fineness: FinenessSchema,
    grossWeightMg: WeightMgSchema,
    netWeightMg: WeightMgSchema,
    ratePerGramFineMinor: z.number().min(0),
    wastagePercent: Percent.default(0),
    makingChargeType: MakingChargeTypeSchema.default('flat'),
    makingChargeValue: z.number().min(0).default(0),
    stoneChargeMinor: MinorUnits.default(0),
    otherChargeMinor: MinorUnits.default(0),
    discountMinor: MinorUnits.default(0),
    taxPercent: Percent.default(0),
    /** Line total after discount and tax, always positive; `direction` gives the sign. */
    amountMinor: MinorUnits.min(0),
    sortOrder: z.int().default(0),
  })
  .describe('One line of a transaction');
export type TransactionLine = z.infer<typeof TransactionLineSchema>;

export const PAYMENT_METHODS = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'wallet', 'other'] as const;
export const PaymentMethodSchema = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

/** `in`: shop received money. `out`: shop paid money. */
export const PaymentSchema = z
  .object({
    id: Uuid,
    direction: z.enum(['in', 'out']),
    method: PaymentMethodSchema,
    amountMinor: MinorUnits.min(0),
    reference: z.string().trim().max(120).nullable().default(null).describe('UPI ref, cheque number ...'),
    paidAt: IsoDateTime,
    notes: z.string().max(1000).nullable().default(null),
  })
  .describe('A payment attached to a transaction');
export type Payment = z.infer<typeof PaymentSchema>;

export const TransactionSchema = z
  .object({
    id: Uuid,
    kind: TransactionKindSchema,
    number: z.string().trim().min(1).max(40).describe('Human-readable document number, unique per shop'),
    status: TransactionStatusSchema.default('final'),
    partyId: Uuid.nullable().default(null),
    currency: Currency,
    issuedAt: IsoDateTime,
    dueAt: IsoDateTime.nullable().default(null).describe('Delivery date for orders, due date for credit'),
    lines: z.array(TransactionLineSchema).default([]),
    payments: z.array(PaymentSchema).default([]),
    /** Σ(out lines) − Σ(in lines): positive means the party owes the shop. */
    totalMinor: MinorUnits,
    notes: z.string().max(4000).nullable().default(null),
    ...Timestamps,
  })
  .describe('A sale, purchase, exchange, repair, order or standalone payment');
export type Transaction = z.infer<typeof TransactionSchema>;

// ---------------------------------------------------------------- Settings

export const SettingsSchema = z
  .object({
    shopName: z.string().trim().max(120).default('My Jewellers'),
    addressLines: z.array(z.string().max(200)).default([]),
    phone: z.string().trim().max(32).default(''),
    taxId: z.string().trim().max(64).default('').describe('GSTIN / VAT / TIN printed on invoices'),
    currency: Currency.default('INR'),
    locale: z.string().trim().min(2).max(35).default('en-IN').describe('BCP 47 language tag'),
    weightUnit: WeightUnitSchema.default('g'),
    taxPercent: Percent.default(3),
    taxLabel: z.string().trim().max(40).default('GST'),
    goldRateBasis: z.string().default('per_10g_22k'),
    silverRateBasis: z.string().default('per_kg_999'),
    defaultWastagePercent: Percent.default(0),
    invoicePrefix: z.string().trim().max(10).default('INV'),
    rateFeedUrl: z.string().trim().max(500).default('').describe('Optional URL of a GoldLedger rate document'),
  })
  .describe('Shop-level configuration');
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});

// ---------------------------------------------------------------- helpers

/** Signed transaction total: +ve means the party owes the shop. */
export function computeTransactionTotal(lines: readonly Pick<TransactionLine, 'direction' | 'amountMinor'>[]): number {
  return lines.reduce((sum, l) => sum + (l.direction === 'out' ? l.amountMinor : -l.amountMinor), 0);
}

/** Net cash movement of a transaction's payments: +ve means the shop received money. */
export function computePaymentsNet(payments: readonly Pick<Payment, 'direction' | 'amountMinor'>[]): number {
  return payments.reduce((sum, p) => sum + (p.direction === 'in' ? p.amountMinor : -p.amountMinor), 0);
}

/** Outstanding on a transaction: total minus what has been settled. +ve = party still owes. */
export function computeOutstanding(txn: Pick<Transaction, 'totalMinor' | 'payments' | 'status'>): number {
  if (txn.status === 'void') return 0;
  return txn.totalMinor - computePaymentsNet(txn.payments);
}
