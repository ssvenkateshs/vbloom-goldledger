import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chips, EmptyState, KeyValue, Screen } from '@/components';
import { itemRepo, rateRepo } from '@/data';
import { ITEM_STATUSES, METAL_LABEL, formatPurity, priceItem, type ItemStatus } from '@/domain';
import { CATEGORY_LABEL, MAKING_TYPE_LABEL, STATUS_LABEL } from '@/labels';
import { useFormat, useQuery, useSettings } from '@/state';
import { Spacing } from '@/theme';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { settings } = useSettings();
  const fmt = useFormat();
  const { data, loading, refresh } = useQuery(
    async (db) => {
      const item = await itemRepo.get(db, id);
      const rate = item ? await rateRepo.latest(db, item.metal, settings.currency) : null;
      return { item, rate };
    },
    [id, settings.currency],
  );
  const item = data?.item;

  if (!item) {
    return <Screen insideStack>{loading ? null : <EmptyState title="Item not found" />}</Screen>;
  }

  const price = data?.rate
    ? priceItem({
        netWeightMg: item.netWeightMg,
        fineness: item.fineness,
        rate: { ratePerGramFineMinor: data.rate.ratePerGramFineMinor, currency: settings.currency },
        wastagePercent: item.wastagePercent,
        makingChargeType: item.makingChargeType,
        makingChargeValue: item.makingChargeValue,
        stoneChargeMinor: item.stoneChargeMinor,
        taxPercent: settings.taxPercent,
      })
    : null;

  async function setStatus(status: ItemStatus) {
    await itemRepo.setStatus(db, item!.id, status);
    refresh();
  }

  function remove() {
    Alert.alert('Delete this item?', 'It will be hidden everywhere but kept for history and backups.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await itemRepo.softDelete(db, item!.id);
          router.back();
        },
      },
    ]);
  }

  const making =
    item.makingChargeType === 'percent'
      ? `${item.makingChargeValue}% of metal`
      : item.makingChargeType === 'per_gram'
        ? `${fmt.money(item.makingChargeValue)} / g`
        : fmt.money(item.makingChargeValue);

  return (
    <Screen insideStack title={item.name} subtitle={`${item.sku} · ${CATEGORY_LABEL[item.category]}`} refreshing={loading} onRefresh={refresh}>
      <Card title="Price today" tone="accent">
        {price ? (
          <>
            <AppText variant="display">{fmt.moneyOf(price.total)}</AppText>
            <AppText variant="caption">
              At {fmt.rate(item.metal, data!.rate!.ratePerGramFineMinor)} · includes {settings.taxLabel} {settings.taxPercent}%
            </AppText>
            <KeyValue label="Metal value" value={fmt.moneyOf(price.metalValue)} />
            <KeyValue label={`Making (${MAKING_TYPE_LABEL[item.makingChargeType]})`} value={fmt.moneyOf(price.makingCharge)} />
            {price.stoneCharge.amountMinor ? <KeyValue label="Stones" value={fmt.moneyOf(price.stoneCharge)} /> : null}
            <KeyValue label={settings.taxLabel} value={fmt.moneyOf(price.tax)} />
            {item.costMinor !== null ? (
              <KeyValue
                label="Margin over cost"
                value={fmt.money(price.taxable.amountMinor - item.costMinor)}
                tone={price.taxable.amountMinor - item.costMinor >= 0 ? 'positive' : 'negative'}
              />
            ) : null}
          </>
        ) : (
          <AppText variant="small" color="textSecondary">
            Set a {METAL_LABEL[item.metal].toLowerCase()} rate to see today&apos;s price.
          </AppText>
        )}
      </Card>

      <View style={styles.actions}>
        {item.status === 'in_stock' || item.status === 'reserved' ? (
          <Button title="Sell" onPress={() => router.push({ pathname: '/transaction/new', params: { kind: 'sale', itemId: item.id } })} />
        ) : null}
        <Button title="Edit" variant="secondary" onPress={() => router.push({ pathname: '/item/edit', params: { id: item.id } })} />
        <Button title="Delete" variant="danger" onPress={remove} />
      </View>

      <Card title="Status">
        <Chips options={ITEM_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} value={item.status} onChange={setStatus} />
      </Card>

      <Card title="Details">
        <KeyValue label="Metal" value={`${METAL_LABEL[item.metal]} ${formatPurity(item.metal, item.fineness)}`} />
        <KeyValue label="Gross weight" value={fmt.weight(item.grossWeightMg)} />
        <KeyValue label="Net metal weight" value={fmt.weight(item.netWeightMg)} />
        {item.stoneWeightMg ? <KeyValue label="Stone weight" value={fmt.weight(item.stoneWeightMg)} /> : null}
        <KeyValue label="Fine content" value={fmt.fineWeight(Math.round((item.netWeightMg * item.fineness) / 1000))} />
        {item.hallmark?.huid ? <KeyValue label="HUID" value={item.hallmark.huid} /> : null}
        {item.hallmark?.centre ? <KeyValue label="Hallmark centre" value={item.hallmark.centre} /> : null}
        <KeyValue label="Wastage" value={`${item.wastagePercent}%`} />
        <KeyValue label="Making" value={making} />
        {item.costMinor !== null ? <KeyValue label="Cost" value={fmt.money(item.costMinor)} /> : null}
        {item.location ? <KeyValue label="Location" value={item.location} /> : null}
        {item.tags.length ? <KeyValue label="Tags" value={item.tags.join(', ')} /> : null}
        <KeyValue label="Added" value={fmt.date(item.createdAt)} />
        <KeyValue label="Updated" value={fmt.date(item.updatedAt, 'long')} />
      </Card>
      {item.description ? (
        <Card title="Description">
          <AppText>{item.description}</AppText>
        </Card>
      ) : null}
      <AppText variant="caption" selectable>
        ID {item.id}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' } });
