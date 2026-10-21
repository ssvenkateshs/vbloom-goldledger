# Interoperability

GoldLedger's promise: nothing you record is trapped. This document is the contract other
software can rely on.

## 1. Canonical units

| Quantity | Stored as                               | Why                                                                                                                |
| -------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Weight   | integer milligrams                      | exact; converts losslessly to g, kg, tola (11.6638038 g), troy oz (31.1034768 g), carat (200 mg), ratti (121.5 mg) |
| Purity   | fineness ‰ (0–1000)                     | the hallmarking standard worldwide; 22K ⇒ 916, 18K ⇒ 750                                                           |
| Money    | integer minor units + ISO 4217          | no floating point; 0-, 2- and 3-decimal currencies                                                                 |
| Rate     | minor units per gram of 1000-fine metal | one number that any quote basis converts to                                                                        |
| Time     | ISO 8601 UTC                            |                                                                                                                    |
| Identity | UUID v4                                 | globally unique without a server                                                                                   |

### Rate bases

`quoteToCanonical(quote, basis)` and `canonicalToQuote(rate, basis)` in
`src/domain/rates.ts` convert between the canonical rate and any basis
`{ quantity, unit, fineness }`. Built-in bases include ₹ per 10 g 22K/24K, per gram
24K/22K/18K, per tola 24K, per troy ounce fine, per kg fine, per gram 925 and per kg 999.

## 2. Bundle (`goldledger.bundle`)

A JSON document, MIME type `application/vnd.goldledger.bundle+json`, file extension
`.goldledger.json`.

```json
{
  "$schema": "https://raw.githubusercontent.com/ssvenkateshs/vbloom-goldledger/main/docs/schemas/goldledger-bundle.schema.json",
  "format": "goldledger.bundle",
  "schemaVersion": "1.0.0",
  "exportedAt": "2026-10-21T09:30:00.000Z",
  "generator": { "name": "GoldLedger", "version": "1.0.0" },
  "settings": { "...": "..." },
  "parties": [],
  "items": [],
  "rates": [],
  "transactions": []
}
```

- Validated by [`goldledger-bundle.schema.json`](schemas/goldledger-bundle.schema.json)
  (JSON Schema 2020-12), generated from the zod definitions by `npm run schemas`.
- `schemaVersion` follows semver. Readers accept any document whose **major** matches
  theirs; minor versions only add optional fields.
- Exports include soft-deleted records so that deletions propagate.
- A bundle may be partial (any array may be empty or omitted).

### Merge rule

For each record, matched by `id`:

1. If the receiver has no copy, insert.
2. Otherwise compare `updatedAt`; the later one wins.
3. On an exact tie, a record with `deletedAt` set wins over one without.
4. Transactions are replaced whole (lines and payments included).
5. Rates are immutable; an unknown `id` is inserted, a known one ignored.

Settings are not merged automatically; the importer chooses whether to apply them.

## 3. CSV

RFC 4180: comma separated, CRLF line endings, fields quoted when they contain `,` `"` or
line breaks, quotes doubled. UTF-8 without BOM (a BOM on input is tolerated).

### Stock (`itemsToCsv` / `itemsFromCsv`)

Columns: `id, sku, name, category, metal, fineness, purity, gross_weight, net_weight,
stone_weight, weight_unit, huid, wastage_percent, making_charge_type,
making_charge_value, stone_charge, cost, currency, status, location, description, tags,
created_at, updated_at`.

- Weights are in `weight_unit` (the shop's display unit on export). Money columns are in
  major units (e.g. rupees), unlike the bundle.
- On import only `sku, name, metal, net_weight` and one of `fineness` / `purity` are
  required. `purity` accepts `22K`, `18 K`, `916`. Missing `gross_weight` defaults to
  `net_weight`. Rows with an `id` update the matching item (same merge rule as bundles);
  rows without get a fresh UUID.
- `tags` are `;`-separated.

### People (`partiesToCsv` / `partiesFromCsv`)

Columns: `id, name, roles, phone, email, address, tax_id, notes, tags, created_at,
updated_at`. `roles` is `;`-separated (`customer;supplier`).

### Ledger (`transactionsToCsv`)

Export only: `id, number, kind, status, issued_at, party_id, currency, total, paid,
outstanding, line_count, notes`. For line-level detail use the bundle.

## 4. Invoices

`renderInvoiceHtml()` produces a self-contained HTML document (no external assets) that
prints on A4 and Letter; the app converts it to PDF with the OS print engine and offers it
through the share sheet (WhatsApp, mail, AirDrop, Drive …). The footer carries the
transaction UUID so a PDF can always be traced back to its record.

## 5. Rate feed (`goldledger.rates`)

A shop, head office or bullion dealer can publish rates as a static JSON file; every
device with the URL in **Settings → Rate feed** pulls it from the Rates screen.

```json
{
  "format": "goldledger.rates",
  "schemaVersion": "1.0.0",
  "source": "Head office",
  "rates": [
    { "metal": "gold", "currency": "INR", "ratePerGramFineMinor": 712500, "effectiveAt": "2026-10-21T04:00:00Z" },
    { "metal": "silver", "currency": "INR", "ratePerGramFineMinor": 9500, "effectiveAt": "2026-10-21T04:00:00Z" }
  ]
}
```

Schema: [`goldledger-rates.schema.json`](schemas/goldledger-rates.schema.json). Only
observations newer than the device's latest for that metal and currency are stored, so
polling is idempotent. To convert a market quote, use the rate bases above, e.g.
₹ 64,120 per 10 g of 22K ⇒ `64120 × 100 / (10 × 0.916)` = 700 000 minor units per gram
fine.

## 6. Sync API

[`docs/openapi/goldledger-sync.yaml`](openapi/goldledger-sync.yaml) (OpenAPI 3.1)
specifies an optional server: `GET/POST /bundle`, `GET/POST /changes?since=`, and
`GET /rates`. It references the same JSON Schemas, so a server built from the spec and
the app always agree on shapes and merge semantics. The app does not yet ship a sync
client; the backup/restore flow is the manual equivalent.

## 7. Extending

- New fields: add them to the zod schema with a `.default()` or `.nullable()`, add a
  migration, run `npm run schemas`. Older bundles keep validating.
- New entity: schema in `entities.ts`, table in a new migration, mapper, repository,
  array in the bundle, and a schema emit line in `scripts/generate-schemas.ts`.
- Breaking changes bump the bundle major version and need a converter in `parseBundle`.
