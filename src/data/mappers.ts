import {
  ItemSchema,
  PartySchema,
  PaymentSchema,
  RateSchema,
  TransactionLineSchema,
  TransactionSchema,
  type Item,
  type Party,
  type Payment,
  type Rate,
  type Transaction,
  type TransactionLine,
} from '@/domain';

/** Row shapes as SQLite returns them (snake_case, JSON columns as text). */
export type SqlRow = Record<string, string | number | null>;

function json<T>(value: string | number | null, fallback: T): T {
  if (typeof value !== 'string' || value === '') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function rowToParty(r: SqlRow): Party {
  return PartySchema.parse({
    id: r.id,
    roles: json(r.roles, ['customer']),
    name: r.name,
    phone: r.phone,
    email: r.email,
    address: r.address,
    taxId: r.tax_id,
    idDocument: r.id_document,
    notes: r.notes,
    tags: json(r.tags, []),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  });
}

export function partyToRow(p: Party) {
  return {
    $id: p.id,
    $roles: JSON.stringify(p.roles),
    $name: p.name,
    $phone: p.phone,
    $email: p.email,
    $address: p.address,
    $tax_id: p.taxId,
    $id_document: p.idDocument,
    $notes: p.notes,
    $tags: JSON.stringify(p.tags),
    $created_at: p.createdAt,
    $updated_at: p.updatedAt,
    $deleted_at: p.deletedAt,
  };
}

export function rowToItem(r: SqlRow): Item {
  return ItemSchema.parse({
    id: r.id,
    sku: r.sku,
    name: r.name,
    category: r.category,
    metal: r.metal,
    fineness: r.fineness,
    grossWeightMg: r.gross_weight_mg,
    netWeightMg: r.net_weight_mg,
    stoneWeightMg: r.stone_weight_mg,
    hallmark: json(r.hallmark, null),
    wastagePercent: r.wastage_percent,
    makingChargeType: r.making_charge_type,
    makingChargeValue: r.making_charge_value,
    stoneChargeMinor: r.stone_charge_minor,
    costMinor: r.cost_minor,
    currency: r.currency,
    status: r.status,
    supplierId: r.supplier_id,
    location: r.location,
    description: r.description,
    tags: json(r.tags, []),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  });
}

export function itemToRow(i: Item) {
  return {
    $id: i.id,
    $sku: i.sku,
    $name: i.name,
    $category: i.category,
    $metal: i.metal,
    $fineness: i.fineness,
    $gross_weight_mg: i.grossWeightMg,
    $net_weight_mg: i.netWeightMg,
    $stone_weight_mg: i.stoneWeightMg,
    $hallmark: i.hallmark ? JSON.stringify(i.hallmark) : null,
    $wastage_percent: i.wastagePercent,
    $making_charge_type: i.makingChargeType,
    $making_charge_value: i.makingChargeValue,
    $stone_charge_minor: i.stoneChargeMinor,
    $cost_minor: i.costMinor,
    $currency: i.currency,
    $status: i.status,
    $supplier_id: i.supplierId,
    $location: i.location,
    $description: i.description,
    $tags: JSON.stringify(i.tags),
    $created_at: i.createdAt,
    $updated_at: i.updatedAt,
    $deleted_at: i.deletedAt,
  };
}

export function rowToRate(r: SqlRow): Rate {
  return RateSchema.parse({
    id: r.id,
    metal: r.metal,
    ratePerGramFineMinor: r.rate_per_gram_fine_minor,
    currency: r.currency,
    source: r.source,
    effectiveAt: r.effective_at,
    createdAt: r.created_at,
  });
}

export function rateToRow(x: Rate) {
  return {
    $id: x.id,
    $metal: x.metal,
    $rate_per_gram_fine_minor: x.ratePerGramFineMinor,
    $currency: x.currency,
    $source: x.source,
    $effective_at: x.effectiveAt,
    $created_at: x.createdAt,
  };
}

export function rowToLine(r: SqlRow): TransactionLine {
  return TransactionLineSchema.parse({
    id: r.id,
    direction: r.direction,
    itemId: r.item_id,
    description: r.description,
    metal: r.metal,
    fineness: r.fineness,
    grossWeightMg: r.gross_weight_mg,
    netWeightMg: r.net_weight_mg,
    ratePerGramFineMinor: r.rate_per_gram_fine_minor,
    wastagePercent: r.wastage_percent,
    makingChargeType: r.making_charge_type,
    makingChargeValue: r.making_charge_value,
    stoneChargeMinor: r.stone_charge_minor,
    otherChargeMinor: r.other_charge_minor,
    discountMinor: r.discount_minor,
    taxPercent: r.tax_percent,
    amountMinor: r.amount_minor,
    sortOrder: r.sort_order,
  });
}

export function lineToRow(transactionId: string, l: TransactionLine) {
  return {
    $id: l.id,
    $transaction_id: transactionId,
    $direction: l.direction,
    $item_id: l.itemId,
    $description: l.description,
    $metal: l.metal,
    $fineness: l.fineness,
    $gross_weight_mg: l.grossWeightMg,
    $net_weight_mg: l.netWeightMg,
    $rate_per_gram_fine_minor: l.ratePerGramFineMinor,
    $wastage_percent: l.wastagePercent,
    $making_charge_type: l.makingChargeType,
    $making_charge_value: l.makingChargeValue,
    $stone_charge_minor: l.stoneChargeMinor,
    $other_charge_minor: l.otherChargeMinor,
    $discount_minor: l.discountMinor,
    $tax_percent: l.taxPercent,
    $amount_minor: l.amountMinor,
    $sort_order: l.sortOrder,
  };
}

export function rowToPayment(r: SqlRow): Payment {
  return PaymentSchema.parse({
    id: r.id,
    direction: r.direction,
    method: r.method,
    amountMinor: r.amount_minor,
    reference: r.reference,
    paidAt: r.paid_at,
    notes: r.notes,
  });
}

export function paymentToRow(transactionId: string, p: Payment) {
  return {
    $id: p.id,
    $transaction_id: transactionId,
    $direction: p.direction,
    $method: p.method,
    $amount_minor: p.amountMinor,
    $reference: p.reference,
    $paid_at: p.paidAt,
    $notes: p.notes,
  };
}

export function rowToTransaction(r: SqlRow, lines: TransactionLine[], payments: Payment[]): Transaction {
  return TransactionSchema.parse({
    id: r.id,
    kind: r.kind,
    number: r.number,
    status: r.status,
    partyId: r.party_id,
    currency: r.currency,
    issuedAt: r.issued_at,
    dueAt: r.due_at,
    lines,
    payments,
    totalMinor: r.total_minor,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  });
}

export function transactionToRow(t: Transaction) {
  return {
    $id: t.id,
    $kind: t.kind,
    $number: t.number,
    $status: t.status,
    $party_id: t.partyId,
    $currency: t.currency,
    $issued_at: t.issuedAt,
    $due_at: t.dueAt,
    $total_minor: t.totalMinor,
    $notes: t.notes,
    $created_at: t.createdAt,
    $updated_at: t.updatedAt,
    $deleted_at: t.deletedAt,
  };
}
