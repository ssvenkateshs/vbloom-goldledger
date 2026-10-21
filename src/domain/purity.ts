/**
 * Purity handling.
 *
 * Canonical unit: fineness in parts per thousand (`FinenessPpt`, 0..1000), the
 * basis used by hallmarking schemes worldwide (BIS in India, the UK Assay Offices,
 * the Vienna Convention). Karat is derived for display: 24 karat == 1000 fine.
 */

export type FinenessPpt = number;

export type Metal = 'gold' | 'silver' | 'platinum' | 'palladium';

export const METALS: readonly Metal[] = ['gold', 'silver', 'platinum', 'palladium'];

export const METAL_LABEL: Record<Metal, string> = {
  gold: 'Gold',
  silver: 'Silver',
  platinum: 'Platinum',
  palladium: 'Palladium',
};

export function isMetal(value: unknown): value is Metal {
  return typeof value === 'string' && (METALS as readonly string[]).includes(value);
}

/** Standard hallmark fineness grades per metal, most common first. */
export const STANDARD_FINENESS: Record<Metal, readonly FinenessPpt[]> = {
  gold: [999, 995, 916, 750, 585, 375],
  silver: [999, 958, 925, 800],
  platinum: [999, 950, 900, 850],
  palladium: [999, 950, 500],
};

export function isValidFineness(value: unknown): value is FinenessPpt {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1000;
}

export function karatToFineness(karat: number): FinenessPpt {
  if (!Number.isFinite(karat) || karat < 0 || karat > 24) {
    throw new RangeError('Karat must be between 0 and 24');
  }
  // 22 karat is marked 916 (not 917) under BIS and most hallmarking schemes.
  return Math.floor((karat / 24) * 1000 + 1e-9);
}

export function finenessToKarat(fineness: FinenessPpt): number {
  return (fineness / 1000) * 24;
}

/**
 * Human-readable purity label, e.g. "22K (916)" for gold, "925" for silver.
 * Gold is conventionally spoken of in karat; other metals in fineness.
 */
export function formatPurity(metal: Metal, fineness: FinenessPpt): string {
  if (metal === 'gold') {
    const karat = finenessToKarat(fineness);
    const rounded = Math.round(karat * 10) / 10;
    const k = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `${k}K (${fineness})`;
  }
  return String(fineness);
}

/** Fine (pure) metal content of a given net weight, in milligrams. */
export function fineWeightMg(netWeightMg: number, fineness: FinenessPpt): number {
  return (netWeightMg * fineness) / 1000;
}
