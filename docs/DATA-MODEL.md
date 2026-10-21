# Data model

All shapes are defined once in `src/domain/entities.ts` (zod) and published as JSON
Schema in `docs/schemas/`. Shared conventions:

| Field                    | Meaning                                     |
| ------------------------ | ------------------------------------------- |
| `id`                     | RFC 4122 v4 UUID                            |
| `createdAt`, `updatedAt` | ISO 8601 UTC; `updatedAt` decides merges    |
| `deletedAt`              | ISO 8601 or `null`; set instead of deleting |
| `…Mg`                    | integer milligrams                          |
| `fineness`               | integer 0–1000 (parts per thousand)         |
| `…Minor`                 | integer minor currency units                |
| `currency`               | ISO 4217 alphabetic code                    |

## Party

A person or business the shop deals with. `roles` is a non-empty subset of
`customer`, `supplier`, `artisan`.

| Field        | Type     | Notes           |
| ------------ | -------- | --------------- |
| `name`       | string   |                 |
| `phone`      | string?  | E.164 preferred |
| `email`      | string?  |                 |
| `address`    | string?  |                 |
| `taxId`      | string?  | GSTIN / VAT     |
| `idDocument` | string?  | KYC reference   |
| `notes`      | string?  |                 |
| `tags`       | string[] |                 |

## Item

One piece of stock.

| Field                                           | Type                                                         | Notes                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `sku`                                           | string                                                       | shop code on the tag                                                                                                                |
| `name`, `category`                              |                                                              | categories: ring, chain, necklace, bangle, bracelet, earring, pendant, anklet, nose_pin, mangalsutra, coin, bar, loose_stone, other |
| `metal`                                         | gold / silver / platinum / palladium                         |                                                                                                                                     |
| `fineness`                                      | 0–1000                                                       |                                                                                                                                     |
| `grossWeightMg`, `netWeightMg`, `stoneWeightMg` | int                                                          | net ≤ gross                                                                                                                         |
| `hallmark`                                      | `{ scheme, huid?, centre?, date? }?`                         | BIS HUID is 6 alphanumerics                                                                                                         |
| `wastagePercent`                                | number                                                       | added to chargeable weight                                                                                                          |
| `makingChargeType`                              | per_gram / percent / flat                                    |                                                                                                                                     |
| `makingChargeValue`                             | number                                                       | minor units per gram, percent, or minor units                                                                                       |
| `stoneChargeMinor`                              | int                                                          |                                                                                                                                     |
| `costMinor`                                     | int?                                                         | landed cost for margin                                                                                                              |
| `currency`                                      |                                                              |                                                                                                                                     |
| `status`                                        | in_stock / reserved / sold / consigned / returned / scrapped |                                                                                                                                     |
| `supplierId`                                    | UUID?                                                        |                                                                                                                                     |
| `location`, `description`, `tags`               |                                                              |                                                                                                                                     |

## Rate

An observation, never edited.

| Field                  | Notes                              |
| ---------------------- | ---------------------------------- |
| `metal`                |                                    |
| `ratePerGramFineMinor` | price of 1 g of 1000-fine metal    |
| `currency`             |                                    |
| `source`               | `manual` or feed URL / provider id |
| `effectiveAt`          | when the rate applies              |

## Transaction

| Field               | Notes                                                            |
| ------------------- | ---------------------------------------------------------------- |
| `kind`              | sale, purchase, exchange, repair, order, payment                 |
| `number`            | human document number, e.g. `INV-2026-0042`                      |
| `status`            | draft, final, void                                               |
| `partyId`           | UUID or `null` for walk-in                                       |
| `issuedAt`, `dueAt` | due = delivery date for orders, credit due date otherwise        |
| `lines[]`           | see below                                                        |
| `payments[]`        | see below                                                        |
| `totalMinor`        | Σ out lines − Σ in lines; positive means the party owes the shop |

### Line

`direction` is `out` (metal leaves the shop) or `in` (old gold received). Each line
snapshots `metal`, `fineness`, weights, `ratePerGramFineMinor`, wastage, making, stone,
other, discount and tax, and stores the resulting `amountMinor` (always positive).

### Payment

`direction` `in` (shop received) or `out` (shop paid), `method` (cash, upi, card,
bank_transfer, cheque, wallet, other), `amountMinor`, `reference`, `paidAt`.

### Balances

```
outstanding(txn) = totalMinor − Σ(in payments) + Σ(out payments)       (0 if void)
balance(party)   = Σ outstanding over final transactions
```

## Settings

Shop name and address lines, phone, tax label/percent/ID, currency, locale (BCP 47),
weight unit, quote bases for gold and silver, default wastage, invoice prefix, rate feed
URL. Device-only flags (onboarding) are stored separately and never exported.

## SQLite schema

Tables `parties`, `items`, `rates`, `transactions`, `transaction_lines`, `payments`,
`settings`, `counters`. Column names are the snake_case of the fields above; arrays and
objects (`roles`, `tags`, `hallmark`) are JSON text. See `src/data/database.ts`.
