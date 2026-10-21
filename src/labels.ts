import type { ItemCategory, ItemStatus, PartyRole, PaymentMethod, TransactionKind } from '@/domain';

/** Display strings. Kept in one place so a future locale can swap them. */

export const STATUS_LABEL: Record<ItemStatus, string> = {
  in_stock: 'In stock',
  reserved: 'Reserved',
  sold: 'Sold',
  consigned: 'Consigned',
  returned: 'Returned',
  scrapped: 'Scrapped',
};

export const KIND_LABEL: Record<TransactionKind, string> = {
  sale: 'Sale',
  purchase: 'Purchase',
  exchange: 'Exchange',
  repair: 'Repair',
  order: 'Order',
  payment: 'Payment',
};

export const KIND_PREFIX: Record<TransactionKind, string> = {
  sale: 'INV',
  purchase: 'PUR',
  exchange: 'INV',
  repair: 'REP',
  order: 'ORD',
  payment: 'RCT',
};

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  ring: 'Ring',
  chain: 'Chain',
  necklace: 'Necklace',
  bangle: 'Bangle',
  bracelet: 'Bracelet',
  earring: 'Earring',
  pendant: 'Pendant',
  anklet: 'Anklet',
  nose_pin: 'Nose pin',
  mangalsutra: 'Mangalsutra',
  coin: 'Coin',
  bar: 'Bar',
  loose_stone: 'Loose stone',
  other: 'Other',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank transfer',
  cheque: 'Cheque',
  wallet: 'Wallet',
  other: 'Other',
};

export const ROLE_LABEL: Record<PartyRole, string> = {
  customer: 'Customer',
  supplier: 'Supplier',
  artisan: 'Artisan',
};

export const MAKING_TYPE_LABEL = {
  per_gram: 'Per gram',
  percent: '% of metal',
  flat: 'Flat',
} as const;
