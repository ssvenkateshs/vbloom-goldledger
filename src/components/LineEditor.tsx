import { StyleSheet, View } from 'react-native';

import {
  MAKING_CHARGE_TYPES,
  METALS,
  METAL_LABEL,
  STANDARD_FINENESS,
  WEIGHT_UNIT_LABEL,
  formatPurity,
  fromMajor,
  fromMg,
  newId,
  priceItem,
  toMajor,
  toMg,
  type Item,
  type LineDirection,
  type MakingChargeType,
  type Metal,
  type Rate,
  type Settings,
  type TransactionLine,
} from '@/domain';
import { MAKING_TYPE_LABEL } from '@/labels';
import { Spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { Chips } from './Chips';
import { Field } from './Field';
import { KeyValue } from './KeyValue';
import { NumberField, numberOrZero } from './NumberField';

/** Text-state mirror of a TransactionLine while it is being edited. */
export interface LineDraft {
  id: string;
  itemId: string | null;
  direction: LineDirection;
  description: string;
  metal: Metal;
  fineness: string;
  gross: string;
  net: string;
  rateQuote: string; // per gram fine, major units
  wastage: string;
  makingType: MakingChargeType;
  makingValue: string;
  stoneCharge: string;
  otherCharge: string;
  discount: string;
  taxPercent: string;
}

export function emptyDraft(settings: Settings, rates: Partial<Record<Metal, Rate | null>>, direction: LineDirection): LineDraft {
  const rate = rates.gold ?? null;
  return {
    id: newId(),
    itemId: null,
    direction,
    description: '',
    metal: 'gold',
    fineness: '916',
    gross: '',
    net: '',
    rateQuote: rate ? String(toMajor({ amountMinor: rate.ratePerGramFineMinor, currency: settings.currency })) : '',
    wastage: direction === 'out' ? String(settings.defaultWastagePercent) : '0',
    makingType: 'flat',
    makingValue: '',
    stoneCharge: '',
    otherCharge: '',
    discount: '',
    taxPercent: direction === 'out' ? String(settings.taxPercent) : '0',
  };
}

export function draftFromItem(item: Item, rate: Rate | null, settings: Settings): LineDraft {
  const currency = settings.currency;
  return {
    id: newId(),
    itemId: item.id,
    direction: 'out',
    description: `${item.name} (${item.sku})`,
    metal: item.metal,
    fineness: String(item.fineness),
    gross: String(fromMg(item.grossWeightMg, settings.weightUnit)),
    net: String(fromMg(item.netWeightMg, settings.weightUnit)),
    rateQuote: rate ? String(toMajor({ amountMinor: rate.ratePerGramFineMinor, currency })) : '',
    wastage: String(item.wastagePercent),
    makingType: item.makingChargeType,
    makingValue:
      item.makingChargeType === 'percent' ? String(item.makingChargeValue) : String(toMajor({ amountMinor: item.makingChargeValue, currency })),
    stoneCharge: item.stoneChargeMinor ? String(toMajor({ amountMinor: item.stoneChargeMinor, currency })) : '',
    otherCharge: '',
    discount: '',
    taxPercent: String(settings.taxPercent),
  };
}

export function draftFromLine(line: TransactionLine, settings: Settings): LineDraft {
  const currency = settings.currency;
  return {
    id: line.id,
    itemId: line.itemId,
    direction: line.direction,
    description: line.description,
    metal: line.metal,
    fineness: String(line.fineness),
    gross: String(fromMg(line.grossWeightMg, settings.weightUnit)),
    net: String(fromMg(line.netWeightMg, settings.weightUnit)),
    rateQuote: String(toMajor({ amountMinor: line.ratePerGramFineMinor, currency })),
    wastage: String(line.wastagePercent),
    makingType: line.makingChargeType,
    makingValue:
      line.makingChargeType === 'percent' ? String(line.makingChargeValue) : String(toMajor({ amountMinor: line.makingChargeValue, currency })),
    stoneCharge: line.stoneChargeMinor ? String(toMajor({ amountMinor: line.stoneChargeMinor, currency })) : '',
    otherCharge: line.otherChargeMinor ? String(toMajor({ amountMinor: line.otherChargeMinor, currency })) : '',
    discount: line.discountMinor ? String(toMajor({ amountMinor: line.discountMinor, currency })) : '',
    taxPercent: String(line.taxPercent),
  };
}

export function priceDraft(d: LineDraft, settings: Settings) {
  const currency = settings.currency;
  const unit = settings.weightUnit;
  const net = toMg(numberOrZero(d.net), unit);
  const gross = toMg(numberOrZero(d.gross || d.net), unit);
  const makingValue = d.makingType === 'percent' ? numberOrZero(d.makingValue) : fromMajor(numberOrZero(d.makingValue), currency).amountMinor;
  const input = {
    netWeightMg: net,
    fineness: Math.min(1000, Math.max(0, Math.round(numberOrZero(d.fineness)))),
    rate: { ratePerGramFineMinor: fromMajor(numberOrZero(d.rateQuote), currency).amountMinor, currency },
    wastagePercent: numberOrZero(d.wastage),
    makingChargeType: d.makingType,
    makingChargeValue: makingValue,
    stoneChargeMinor: fromMajor(numberOrZero(d.stoneCharge), currency).amountMinor,
    otherChargeMinor: fromMajor(numberOrZero(d.otherCharge), currency).amountMinor,
    discountMinor: fromMajor(numberOrZero(d.discount), currency).amountMinor,
    taxPercent: numberOrZero(d.taxPercent),
  };
  return { breakdown: priceItem(input), input, gross };
}

export function draftToLine(d: LineDraft, settings: Settings, sortOrder: number): TransactionLine {
  const { breakdown, input, gross } = priceDraft(d, settings);
  return {
    id: d.id,
    direction: d.direction,
    itemId: d.itemId,
    description: d.description.trim() || `${METAL_LABEL[d.metal]} ${formatPurity(d.metal, input.fineness)}`,
    metal: d.metal,
    fineness: input.fineness,
    grossWeightMg: gross,
    netWeightMg: input.netWeightMg,
    ratePerGramFineMinor: input.rate.ratePerGramFineMinor,
    wastagePercent: input.wastagePercent,
    makingChargeType: input.makingChargeType,
    makingChargeValue: input.makingChargeValue,
    stoneChargeMinor: input.stoneChargeMinor,
    otherChargeMinor: input.otherChargeMinor,
    discountMinor: breakdown.discount.amountMinor,
    taxPercent: input.taxPercent,
    amountMinor: breakdown.total.amountMinor,
    sortOrder,
  };
}

interface LineEditorProps {
  draft: LineDraft;
  settings: Settings;
  rates: Partial<Record<Metal, Rate | null>>;
  formatMoney: (minor: number) => string;
  onChange: (draft: LineDraft) => void;
  onCommit: () => void;
  onCancel: () => void;
  isNew: boolean;
}

export function LineEditor({ draft, settings, rates, formatMoney, onChange, onCommit, onCancel, isNew }: LineEditorProps) {
  const set = (patch: Partial<LineDraft>) => onChange({ ...draft, ...patch });
  const unit = WEIGHT_UNIT_LABEL[settings.weightUnit];
  const { breakdown } = priceDraft(draft, settings);
  const finenessOptions = STANDARD_FINENESS[draft.metal].map((f) => ({ value: String(f), label: formatPurity(draft.metal, f) }));
  const isStandard = finenessOptions.some((o) => o.value === draft.fineness);

  return (
    <Card title={isNew ? 'New line' : 'Edit line'} tone="accent">
      <Chips
        label="Direction"
        options={[
          { value: 'out', label: 'Sold to party' },
          { value: 'in', label: 'Received from party (old gold)' },
        ]}
        value={draft.direction}
        onChange={(direction) => set({ direction, taxPercent: direction === 'out' ? String(settings.taxPercent) : '0' })}
      />
      <Field
        label="Description"
        value={draft.description}
        onChangeText={(description) => set({ description })}
        placeholder="e.g. 22K chain, 18 inch"
      />
      <Chips
        label="Metal"
        options={METALS.map((m) => ({ value: m, label: METAL_LABEL[m] }))}
        value={draft.metal}
        onChange={(metal) => {
          const rate = rates[metal];
          set({
            metal,
            fineness: String(STANDARD_FINENESS[metal][0]),
            rateQuote: rate ? String(toMajor({ amountMinor: rate.ratePerGramFineMinor, currency: settings.currency })) : draft.rateQuote,
          });
        }}
      />
      <Chips
        label="Purity"
        options={[...finenessOptions, ...(isStandard ? [] : [{ value: draft.fineness, label: `Custom ${draft.fineness}` }])]}
        value={draft.fineness}
        onChange={(fineness) => set({ fineness })}
      />
      <View style={styles.pair}>
        <View style={styles.half}>
          <NumberField label="Gross" value={draft.gross} onChangeText={(gross) => set({ gross })} suffix={unit} />
        </View>
        <View style={styles.half}>
          <NumberField label="Net metal" value={draft.net} onChangeText={(net) => set({ net })} suffix={unit} />
        </View>
      </View>
      <NumberField
        label={`Rate (${settings.currency} per gram of fine metal)`}
        value={draft.rateQuote}
        onChangeText={(rateQuote) => set({ rateQuote })}
        hint="Pre-filled from today's rate; override for negotiated prices"
      />
      <View style={styles.pair}>
        <View style={styles.half}>
          <NumberField label="Wastage" value={draft.wastage} onChangeText={(wastage) => set({ wastage })} suffix="%" />
        </View>
        <View style={styles.half}>
          <NumberField label={settings.taxLabel} value={draft.taxPercent} onChangeText={(taxPercent) => set({ taxPercent })} suffix="%" />
        </View>
      </View>
      <Chips
        label="Making charge"
        options={MAKING_CHARGE_TYPES.map((t) => ({ value: t, label: MAKING_TYPE_LABEL[t] }))}
        value={draft.makingType}
        onChange={(makingType) => set({ makingType })}
      />
      <NumberField
        label={
          draft.makingType === 'percent'
            ? 'Making (% of metal value)'
            : draft.makingType === 'per_gram'
              ? `Making (${settings.currency} per gram)`
              : `Making (${settings.currency})`
        }
        value={draft.makingValue}
        onChangeText={(makingValue) => set({ makingValue })}
      />
      <View style={styles.pair}>
        <View style={styles.half}>
          <NumberField label="Stones" value={draft.stoneCharge} onChangeText={(stoneCharge) => set({ stoneCharge })} />
        </View>
        <View style={styles.half}>
          <NumberField label="Other" value={draft.otherCharge} onChangeText={(otherCharge) => set({ otherCharge })} />
        </View>
      </View>
      <NumberField label={`Discount (${settings.currency})`} value={draft.discount} onChangeText={(discount) => set({ discount })} />

      <KeyValue label="Metal value" value={formatMoney(breakdown.metalValue.amountMinor)} />
      <KeyValue label="Making" value={formatMoney(breakdown.makingCharge.amountMinor)} />
      <KeyValue label={settings.taxLabel} value={formatMoney(breakdown.tax.amountMinor)} />
      <KeyValue label="Line total" value={formatMoney(breakdown.total.amountMinor)} strong />
      <View style={styles.actions}>
        <Button title="Cancel" variant="ghost" onPress={onCancel} />
        <Button title={isNew ? 'Add line' : 'Update line'} onPress={onCommit} />
      </View>
      <AppText variant="caption">Weights in {unit}; purity in fineness.</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.sm },
});
