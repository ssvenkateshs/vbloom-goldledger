# Architecture

GoldLedger is a local-first mobile app: all state lives in SQLite on the device and the
app is fully usable with no network. Interoperability is achieved not by a central server
but by **canonical units, stable identifiers and published formats**, so that any two
copies of the data, or any third-party tool, can be reconciled.

## Layers

```
app (expo-router screens)
  └── components / features        presentation, no business rules
        └── state                  providers + hooks that bridge screens and data
              └── data             SQLite migrations, mappers, repositories
                    └── domain     pure TypeScript, zero React/Expo imports
```

Dependencies point downward only. `domain` is runnable in Node, which is why it carries
the whole test suite and generates the JSON Schemas.

### domain

- `units.ts` — weights in integer milligrams with conversions for g, kg, tola, troy ounce,
  carat and ratti. Conversion constants are the international definitions.
- `purity.ts` — fineness (‰) as canonical purity; karat conversion; hallmark grades per metal.
- `money.ts` — integer minor units with ISO 4217 exponents; rounding half away from zero.
- `pricing.ts` — the jewellery pricing formula and old-metal valuation.
- `rates.ts` — canonical rate (per gram fine) and conversions to/from quote bases.
- `entities.ts` — zod schemas for Party, Item, Rate, Transaction (+ lines, payments) and
  Settings. These are the single source of truth for the DB, the bundle and the API.
- `interchange.ts` — the bundle document, merge rules (last-writer-wins), CSV
  import/export and the rate-feed document.
- `csv.ts` — small RFC 4180 codec.
- `ids.ts` — UUID v4 with an injectable generator (expo-crypto in the app).

### data

- `database.ts` — append-only list of migrations; `PRAGMA user_version` tracks the schema.
- `mappers.ts` — snake_case rows ⇄ domain objects, always via `Schema.parse`, so nothing
  invalid can be read from or written to the database.
- `repositories.ts` — typed CRUD plus the few aggregate queries the UI needs (stock
  summary, party balances, next document number). `merge()` implements the same
  last-writer-wins rule as the bundle codec.
- `bundle.ts` — export everything (including soft-deleted rows) and import with merge.

### state

- `SettingsProvider` loads shop settings once and exposes `update()`.
- `AppStateProvider` tracks onboarding, PIN and lock state, re-locking after a minute in
  the background.
- `useQuery(fn, deps)` runs a read on focus and whenever `deps` change; screens never
  display stale data after an edit elsewhere.
- `useFormat()` gives locale-aware money, weight, date and rate formatters bound to the
  settings.
- `picker.ts` hands a selection back from a modal picker to the form that opened it.

### services

Platform adapters that the domain does not know about: share sheet / downloads, document
picking and reading, PDF rendering (expo-print), rate-feed fetch, PIN hashing in the
keychain.

### components and features

A small design system (text, cards, gradient, buttons, fields, chips, chart, tiles) and
three composite features (onboarding, lock screen, the gate that chooses between them
and the app).

### app

Expo Router file routes. Tabs are headless (`expo-router/ui`) so the gold-rimmed pill bar
is identical on every platform. Detail and form screens sit in the root stack above the
tabs; pickers are modals.

## Key decisions

- **Integers everywhere.** Milligrams, fineness and minor units are integers in storage
  and interchange; floating point only appears transiently in a calculation and is
  rounded at every line. Two devices, or the app and a server, compute identical totals.
- **Soft deletes.** Records are never removed; `deletedAt` is set. Merges therefore
  converge and backups can be replayed in any order.
- **UUIDs assigned on the device.** No coordination is needed to create records offline.
- **Transactions are documents.** Each line snapshots the rate, purity and charges used,
  so an invoice is reproducible years later regardless of later rate changes.
- **Schemas generate the schemas.** `npm run schemas` emits JSON Schema from zod; CI fails
  if the committed files drift from the code.
- **Dark-first UI.** The app ships with a fixed dark scheme (see `app.json`); the light
  palette is kept in `theme/index.ts` for a future toggle.

## Testing

`npm test` runs Jest (jest-expo preset) over the domain: units, purity, money, pricing,
rate bases, CSV, bundle round-trip and version checks, merge rules, transaction maths.
Repositories are thin enough that the mappers' schema validation gives most of the
safety; integration tests against expo-sqlite would run on-device or with a Node SQLite
shim and are a reasonable next step.
