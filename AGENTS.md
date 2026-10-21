# GoldLedger — notes for AI agents

This is an Expo SDK 58 / React Native 0.88 app with Expo Router. Expo and React Native
change quickly: before touching an Expo, EAS or React Native API, read the matching
versioned docs (`https://docs.expo.dev/versions/v58.0.0/`) or `https://docs.expo.dev/llms.txt`
rather than relying on memory.

## Commands

```bash
npx expo install <package>   # always, never npm add: resolves SDK-compatible versions
npm run lint                 # ESLint with React Compiler rules (set-state-in-effect, refs, etc.)
npm run typecheck            # tsc --noEmit
npm test                     # Jest over src/domain
npm run schemas              # regenerate docs/schemas from zod; CI fails on drift
npm run format               # Prettier
```

Run lint, typecheck and tests before declaring a task done.

## Conventions

- Layers depend downward: `app → components/features → state → data → domain`. `domain`
  must stay free of React and Expo imports (it runs in Node for tests and schema
  generation, which is why it uses relative imports internally).
- Weights are integer milligrams, purity is fineness ‰, money is integer minor units,
  rates are minor units per gram of fine metal. Never store floats for these.
- Every record has `id` (UUID v4), `createdAt`, `updatedAt`, `deletedAt`. Soft-delete
  only. `updatedAt` must be bumped on every write (merges rely on it).
- Validate with the zod schemas in `src/domain/entities.ts` at every boundary
  (forms, DB rows, imports). Add fields with `.default()`/`.nullable()` so older bundles
  keep validating, then add a migration in `src/data/database.ts` (append; never edit a
  released one) and run `npm run schemas`.
- Screens read through `useQuery` (refreshes on focus) and format through `useFormat`.
  Do not format money/weights by hand.
- Routes live in `src/app/`; only the default export may be a component. Shared UI goes
  in `src/components`, labels in `src/labels.ts`.
- Tabs are headless `expo-router/ui` with a custom pill bar; detail/form screens are in
  the root stack; pickers are modals that hand back a selection via `state/picker.ts`.
- Visual tone: dark surfaces, ivory text, one gold gradient. Keep it restrained.
- `ios/` and `android/` are generated (CNG); configure native behaviour in `app.json`.
- Expo Go covers every module used here; adding a module with custom native code means a
  development build.
