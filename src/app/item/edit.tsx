import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chips, Field, NumberField, Screen, numberOrZero } from '@/components';
import { itemRepo } from '@/data';
import {
  ITEM_CATEGORIES,
  ITEM_STATUSES,
  ItemSchema,
  MAKING_CHARGE_TYPES,
  METALS,
  METAL_LABEL,
  STANDARD_FINENESS,
  WEIGHT_UNIT_LABEL,
  formatPurity,
  fromMg,
  fromMajor,
  newId,
  nowIso,
  toMajor,
  toMg,
  type Item,
  type ItemCategory,
  type ItemStatus,
  type MakingChargeType,
  type Metal,
} from '@/domain';
import { CATEGORY_LABEL, MAKING_TYPE_LABEL, STATUS_LABEL } from '@/labels';
import { useSettings } from '@/state';
import { Spacing } from '@/theme';

export default function ItemEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const db = useSQLiteContext();
  const { settings } = useSettings();
  const unit = settings.weightUnit;
  const [existing, setExisting] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('ring');
  const [metal, setMetal] = useState<Metal>('gold');
  const [fineness, setFineness] = useState('916');
  const [gross, setGross] = useState('');
  const [net, setNet] = useState('');
  const [stone, setStone] = useState('');
  const [huid, setHuid] = useState('');
  const [centre, setCentre] = useState('');
  const [wastage, setWastage] = useState(String(settings.defaultWastagePercent));
  const [makingType, setMakingType] = useState<MakingChargeType>('per_gram');
  const [makingValue, setMakingValue] = useState('');
  const [stoneCharge, setStoneCharge] = useState('');
  const [cost, setCost] = useState('');
  const [status, setStatus] = useState<ItemStatus>('in_stock');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (!id) return;
    itemRepo.get(db, id).then((item) => {
      if (!item) return;
      setExisting(item);
      setSku(item.sku);
      setName(item.name);
      setCategory(item.category);
      setMetal(item.metal);
      setFineness(String(item.fineness));
      setGross(String(fromMg(item.grossWeightMg, unit)));
      setNet(String(fromMg(item.netWeightMg, unit)));
      setStone(item.stoneWeightMg ? String(fromMg(item.stoneWeightMg, unit)) : '');
      setHuid(item.hallmark?.huid ?? '');
      setCentre(item.hallmark?.centre ?? '');
      setWastage(String(item.wastagePercent));
      setMakingType(item.makingChargeType);
      setMakingValue(
        item.makingChargeType === 'percent'
          ? String(item.makingChargeValue)
          : String(toMajor({ amountMinor: item.makingChargeValue, currency: item.currency })),
      );
      setStoneCharge(item.stoneChargeMinor ? String(toMajor({ amountMinor: item.stoneChargeMinor, currency: item.currency })) : '');
      setCost(item.costMinor !== null ? String(toMajor({ amountMinor: item.costMinor, currency: item.currency })) : '');
      setStatus(item.status);
      setLocation(item.location ?? '');
      setDescription(item.description ?? '');
      setTags(item.tags.join(', '));
    });
  }, [db, id, unit]);

  const finenessOptions = STANDARD_FINENESS[metal].map((f) => ({ value: String(f), label: formatPurity(metal, f) }));
  const isStandard = finenessOptions.some((o) => o.value === fineness);

  async function save() {
    setError(null);
    const now = nowIso();
    const currency = settings.currency;
    const makingMinor = makingType === 'percent' ? numberOrZero(makingValue) : fromMajor(numberOrZero(makingValue), currency).amountMinor;
    const candidate = {
      id: existing?.id ?? newId(),
      sku: sku.trim(),
      name: name.trim(),
      category,
      metal,
      fineness: Number(fineness),
      grossWeightMg: toMg(numberOrZero(gross || net), unit),
      netWeightMg: toMg(numberOrZero(net), unit),
      stoneWeightMg: toMg(numberOrZero(stone), unit),
      hallmark: huid.trim() || centre.trim() ? { scheme: 'BIS', huid: huid.trim() || null, centre: centre.trim() || null, date: null } : null,
      wastagePercent: numberOrZero(wastage),
      makingChargeType: makingType,
      makingChargeValue: makingMinor,
      stoneChargeMinor: fromMajor(numberOrZero(stoneCharge), currency).amountMinor,
      costMinor: cost.trim() ? fromMajor(numberOrZero(cost), currency).amountMinor : null,
      currency,
      status,
      supplierId: existing?.supplierId ?? null,
      location: location.trim() || null,
      description: description.trim() || null,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    };
    const parsed = ItemSchema.safeParse(candidate);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(`${issue.path.join('.')}: ${issue.message}`);
      return;
    }
    setSaving(true);
    try {
      await itemRepo.upsert(db, parsed.data);
      if (existing) router.back();
      else router.replace({ pathname: '/item/[id]', params: { id: parsed.data.id } });
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      insideStack
      title={existing ? 'Edit item' : 'New item'}
      footer={
        <View style={styles.footer}>
          <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
          <Button title={existing ? 'Save changes' : 'Add to stock'} onPress={save} loading={saving} />
        </View>
      }>
      {error ? (
        <AppText variant="small" color="negative">
          {error}
        </AppText>
      ) : null}
      <Card title="Identity">
        <Field label="SKU / tag code" value={sku} onChangeText={setSku} autoCapitalize="characters" placeholder="e.g. R-0001" />
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Plain band" />
        <Chips
          label="Category"
          options={ITEM_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
          value={category}
          onChange={setCategory}
        />
        <Chips label="Status" options={ITEM_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} value={status} onChange={setStatus} />
      </Card>

      <Card title="Metal & purity">
        <Chips
          label="Metal"
          options={METALS.map((m) => ({ value: m, label: METAL_LABEL[m] }))}
          value={metal}
          onChange={(m) => {
            setMetal(m);
            setFineness(String(STANDARD_FINENESS[m][0]));
          }}
        />
        <Chips
          label="Purity"
          options={[...finenessOptions, ...(isStandard ? [] : [{ value: fineness, label: `Custom ${fineness}` }])]}
          value={fineness}
          onChange={setFineness}
        />
        <NumberField label="Custom fineness (‰)" value={fineness} onChangeText={setFineness} hint="0–1000; 916 = 22K, 750 = 18K" />
        <Field label="HUID / hallmark number" value={huid} onChangeText={setHuid} autoCapitalize="characters" placeholder="6-character BIS HUID" />
        <Field label="Hallmarking centre" value={centre} onChangeText={setCentre} />
      </Card>

      <Card title={`Weights (${WEIGHT_UNIT_LABEL[unit]})`}>
        <NumberField label="Gross weight" value={gross} onChangeText={setGross} suffix={WEIGHT_UNIT_LABEL[unit]} />
        <NumberField
          label="Net metal weight"
          value={net}
          onChangeText={setNet}
          suffix={WEIGHT_UNIT_LABEL[unit]}
          hint="Excluding stones; used for pricing"
        />
        <NumberField label="Stone weight" value={stone} onChangeText={setStone} suffix={WEIGHT_UNIT_LABEL[unit]} />
      </Card>

      <Card title="Charges">
        <NumberField label="Wastage" value={wastage} onChangeText={setWastage} suffix="%" />
        <Chips
          label="Making charge"
          options={MAKING_CHARGE_TYPES.map((t) => ({ value: t, label: MAKING_TYPE_LABEL[t] }))}
          value={makingType}
          onChange={setMakingType}
        />
        <NumberField
          label={
            makingType === 'percent'
              ? 'Making charge (% of metal value)'
              : makingType === 'per_gram'
                ? `Making charge (${settings.currency} per gram)`
                : `Making charge (${settings.currency})`
          }
          value={makingValue}
          onChangeText={setMakingValue}
        />
        <NumberField label={`Stone charges (${settings.currency})`} value={stoneCharge} onChangeText={setStoneCharge} />
        <NumberField label={`Cost price (${settings.currency})`} value={cost} onChangeText={setCost} hint="Optional; used for margin only" />
      </Card>

      <Card title="Notes">
        <Field label="Location" value={location} onChangeText={setLocation} placeholder="Tray 3, safe, branch ..." />
        <Field label="Description" value={description} onChangeText={setDescription} multiline />
        <Field label="Tags" value={tags} onChangeText={setTags} placeholder="bridal, new, antique" hint="Comma separated" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({ footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm } });
