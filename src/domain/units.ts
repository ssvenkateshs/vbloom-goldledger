/**
 * Weight handling.
 *
 * Canonical unit: integer milligrams (`WeightMg`). Every weight stored, exported
 * or exchanged by GoldLedger is in milligrams so that no rounding drift can creep
 * in between devices, spreadsheets or a future sync server. Display units are a
 * presentation concern only.
 *
 * Conversion factors follow international definitions:
 *  - gram, kilogram: SI
 *  - troy ounce: 31.103 476 8 g exactly (international avoirdupois/troy agreement, 1959)
 *  - tola: 11.663 8038 g (the Indian standard tola, 3/8 troy ounce)
 *  - carat (gemstones): 200 mg exactly (metric carat, 1907)
 *  - ratti: 121.5 mg (traditional Indian unit; regional variation exists)
 */

export type WeightMg = number;

export type WeightUnit = 'mg' | 'g' | 'kg' | 'tola' | 'ozt' | 'ct' | 'ratti';

export const WEIGHT_UNITS: readonly WeightUnit[] = ['mg', 'g', 'kg', 'tola', 'ozt', 'ct', 'ratti'];

/** Milligrams per unit. */
export const MG_PER_UNIT: Record<WeightUnit, number> = {
  mg: 1,
  g: 1_000,
  kg: 1_000_000,
  tola: 11_663.8038,
  ozt: 31_103.4768,
  ct: 200,
  ratti: 121.5,
};

export const WEIGHT_UNIT_LABEL: Record<WeightUnit, string> = {
  mg: 'mg',
  g: 'g',
  kg: 'kg',
  tola: 'tola',
  ozt: 'oz t',
  ct: 'ct',
  ratti: 'ratti',
};

export function isWeightUnit(value: unknown): value is WeightUnit {
  return typeof value === 'string' && (WEIGHT_UNITS as readonly string[]).includes(value);
}

/** Convert a quantity in `unit` to canonical integer milligrams (rounded half up). */
export function toMg(quantity: number, unit: WeightUnit): WeightMg {
  if (!Number.isFinite(quantity)) throw new RangeError('Weight must be a finite number');
  return Math.round(quantity * MG_PER_UNIT[unit]);
}

/** Convert canonical milligrams to a quantity in `unit` (not rounded). */
export function fromMg(mg: WeightMg, unit: WeightUnit): number {
  return mg / MG_PER_UNIT[unit];
}

/** Sensible number of decimals to show for each unit. */
export const WEIGHT_UNIT_DECIMALS: Record<WeightUnit, number> = {
  mg: 0,
  g: 3,
  kg: 6,
  tola: 3,
  ozt: 4,
  ct: 2,
  ratti: 2,
};

/** Parse user-entered text like "12.345" into milligrams, or return null if invalid. */
export function parseWeight(text: string, unit: WeightUnit): WeightMg | null {
  const cleaned = text.replace(/[,\s]/g, '');
  if (cleaned === '' || cleaned === '.') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return toMg(n, unit);
}

export function formatWeight(mg: WeightMg, unit: WeightUnit, locale?: string, options?: { withUnit?: boolean; decimals?: number }): string {
  const decimals = options?.decimals ?? WEIGHT_UNIT_DECIMALS[unit];
  const value = fromMg(mg, unit);
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return options?.withUnit === false ? number : `${number} ${WEIGHT_UNIT_LABEL[unit]}`;
}
