import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chips, EmptyState, Field, ListRow, Screen } from '@/components';
import { itemRepo } from '@/data';
import { ITEM_STATUSES, formatPurity, type ItemStatus } from '@/domain';
import { useFormat, useQuery } from '@/state';
import { Spacing } from '@/theme';

import { STATUS_LABEL } from '@/labels';

export default function StockScreen() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ItemStatus | 'all'>('in_stock');
  const fmt = useFormat();
  const { data, loading, refresh } = useQuery((db) => itemRepo.list(db, { search, status }), [search, status]);

  const totalNet = data?.reduce((s, i) => s + i.netWeightMg, 0) ?? 0;

  return (
    <Screen
      title="Stock"
      subtitle={data ? `${data.length} piece${data.length === 1 ? '' : 's'} · ${fmt.weight(totalNet)} net` : undefined}
      action={<Button title="Add" size="sm" onPress={() => router.push('/item/edit')} />}
      refreshing={loading}
      onRefresh={refresh}
      toolbar={
        <View style={styles.toolbar}>
          <Field
            label="Search"
            placeholder="SKU, name, HUID or tag"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />
          <Chips
            options={[{ value: 'all', label: 'All' }, ...ITEM_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
            value={status}
            onChange={setStatus}
          />
        </View>
      }>
      {data?.length ? (
        data.map((item) => (
          <ListRow
            key={item.id}
            title={item.name}
            badge={item.sku}
            subtitle={`${formatPurity(item.metal, item.fineness)} · ${fmt.weight(item.netWeightMg)} net${item.hallmark?.huid ? ` · HUID ${item.hallmark.huid}` : ''}${item.location ? ` · ${item.location}` : ''}`}
            rightText={status === 'all' ? STATUS_LABEL[item.status] : undefined}
            rightTone="secondary"
            onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
          />
        ))
      ) : loading ? null : (
        <EmptyState title="No pieces here" hint={search ? 'Try a different search.' : 'Tap Add to record your first piece, or import a CSV.'} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ toolbar: { gap: Spacing.md } });
