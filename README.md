<p align="center">
  <img src="assets/images/icon.png" width="96" alt="GoldLedger" />
</p>

<h1 align="center">GoldLedger</h1>

<p align="center">
  Stock, rates, people and ledger for private gold jewellers.<br/>
  Offline-first. Open formats. One codebase for iOS, Android and the web.
</p>

<p align="center">
  <a href="https://github.com/ssvenkateshs/goldledger/actions/workflows/ci.yml"><img src="https://github.com/ssvenkateshs/goldledger/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/Expo-SDK%2058-000?logo=expo" alt="Expo SDK 58">
  <img src="https://img.shields.io/badge/license-MIT-gold" alt="MIT">
</p>

---

## What it does

- **Stock** — every piece with gross, net and fine weight, purity (karat or fineness), BIS HUID / hallmark details, wastage, making charges, stone charges, cost, location and tags. Priced live at today's rate, with margin over cost.
- **Rates** — enter the day's gold, silver, platinum or palladium rate in the basis you actually quote (₹ per 10 g 22K, $ per troy ounce, AED per gram 24K …). Stored canonically as _per gram of fine metal_, charted over time, optionally pulled from a feed you publish.
- **People** — customers, suppliers and artisans with KYC references and running balances.
- **Ledger** — sales, purchases, old-gold exchange, repairs, custom orders with delivery dates, and standalone payments. Lines carry the rate they used; payments by cash, UPI, card, bank transfer, cheque or wallet. PDF invoices from the share sheet.
- **Reminders** — orders due this week, overdue credit, largest balances.
- **Backup & data** — one-file JSON backup that merges cleanly between devices, CSV in and out for spreadsheets, and an app PIN that re-locks after a minute in the background.

The visual language is deliberately quiet: near-black surfaces, ivory text and a single gold gradient reserved for the rate card, the primary action and the tab bar.

## Interoperable by design

GoldLedger does not want to be the only program that can read your data.

| Concern      | Choice                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| Identifiers  | RFC 4122 v4 UUIDs, generated on the device that creates the record                                              |
| Time         | ISO 8601 UTC timestamps                                                                                         |
| Weight       | integer **milligrams** (display in g, kg, tola, troy oz, carat or ratti)                                        |
| Purity       | **fineness** in parts per thousand (916 = 22K); karat is derived for display                                    |
| Money        | integer **minor units** + ISO 4217 code (paise, cents, fils; 3-decimal currencies handled)                      |
| Rates        | price of **one gram of 1000-fine metal**, converted to/from any quote basis                                     |
| Backups      | `goldledger.bundle` JSON with a published [JSON Schema](docs/schemas/goldledger-bundle.schema.json)             |
| Spreadsheets | RFC 4180 CSV with a header row; round-trips through Excel, Numbers and Google Sheets                            |
| Invoices     | self-contained HTML → PDF via the system share sheet                                                            |
| Rate feeds   | a tiny `goldledger.rates` JSON file hosted anywhere ([schema](docs/schemas/goldledger-rates.schema.json))       |
| Sync         | [OpenAPI 3.1 specification](docs/openapi/goldledger-sync.yaml) for an optional server, reusing the same schemas |
| Merging      | last-writer-wins per record on `updatedAt`; soft deletes; no duplicates                                         |

Full details in [docs/INTEROPERABILITY.md](docs/INTEROPERABILITY.md); the record shapes are in [docs/DATA-MODEL.md](docs/DATA-MODEL.md).

## Run it

```bash
npm install
npx expo start          # then press i / a / w, or scan the QR code with Expo Go
```

Everything in the app runs inside [Expo Go](https://expo.dev/go); no native build is needed to try it. For store builds use EAS (`npx eas-cli@latest build`).

```bash
npm run lint            # ESLint (expo config, React Compiler rules)
npm run typecheck       # tsc --noEmit
npm test                # Jest: domain logic, pricing, formats, merge rules
npm run schemas         # regenerate docs/schemas from the zod definitions
npm run format          # Prettier
npm run export:web      # static web build in dist/
```

## Layout

```
src/
  domain/      pure TypeScript: units, purity, money, pricing, rates, entity schemas (zod), CSV and bundle codecs, merge rules
  data/        expo-sqlite: migrations, row mappers, repositories, bundle import/export
  state/       settings & app-state providers, focus-aware query hook, formatters, picker hand-off
  services/    files (share / pick), invoice PDF, rate feed, PIN
  components/  design system: text, cards, gold gradient, buttons, fields, chips, chart, tiles, tab bar pieces
  features/    onboarding, lock screen, gate
  app/         expo-router routes (tabs, item, party, transaction, pick, rates, settings, data, reminders, about)
docs/          architecture, data model, interoperability, JSON Schemas, OpenAPI
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the reasoning.

## Pricing formula

```
chargeable weight = net metal weight × (1 + wastage %)
metal value       = chargeable weight × (fineness / 1000) × rate per gram fine
making charge     = per gram × net weight | % of metal value | flat
subtotal          = metal value + making + stones + other
taxable           = subtotal − discount
tax               = taxable × tax %
total             = taxable + tax
```

Every intermediate is rounded to integer minor units, so any other implementation of this formula produces the same invoice to the paisa. `valueOldMetal` prices old gold the shop buys: fine weight × rate, less an optional deduction.

## Status

Version 1.0.0. The domain and data layers are unit-tested; the UI has been exercised against the type checker and lint rules but not yet on physical devices. Things that would come next: a QR tag printer for SKUs, photo attachments, a sync server implementing the OpenAPI spec, and additional languages.

## Licence

MIT.
