# Contributing

Thanks for helping. A few conventions keep the codebase coherent:

- **Domain first.** Business rules (pricing, units, merge semantics) live in
  `src/domain` with tests, never in screens.
- **Integers for weight, purity and money.** See `docs/INTEROPERABILITY.md`.
- **Schemas are code.** Change the zod schema, add a migration, run `npm run schemas`,
  commit the generated files.
- **Copy stays in `src/labels.ts`** (enum labels) or in the screen that owns it.
- **Before pushing:** `npm run check` (lint + typecheck + tests) and `npm run format`.
- Keep motion and colour restrained; gold is for the rate card, the primary action and
  the tab bar.

Open a pull request against `main`; CI runs lint, typecheck, tests, schema drift and a
web export.
