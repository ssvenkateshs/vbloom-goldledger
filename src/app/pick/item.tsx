import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { EmptyState, Field, ListRow, Screen } from '@/components';
import { itemRepo } from '@/data';
import { formatPurity } from '@/domain';
import { setPicked, useFormat, useQuery } from '@/state';

export default function PickItemScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const [search, setSearch] = useState('');
  const fmt = useFormat();
  const { data, loading } = useQuery(
    async (db) => {
      const [inStock, reserved] = await Promise.all([
        itemRepo.list(db, { search, status: 'in_stock' }),
        itemRepo.list(db, { search, status: 'reserved' }),
      ]);
      return [...inStock, ...reserved];
    },
    [search],
  );

  return (
    <Screen
      insideStack
      title="Choose stock item"
      toolbar={<Field label="Search" value={search} onChangeText={setSearch} autoFocus placeholder="SKU, name or HUID" autoCapitalize="none" />}>
      {data?.length ? (
        data.map((i) => (
          <ListRow
            key={i.id}
            title={i.name}
            badge={i.sku}
            subtitle={`${formatPurity(i.metal, i.fineness)} · ${fmt.weight(i.netWeightMg)} net${i.status === 'reserved' ? ' · reserved' : ''}`}
            onPress={() => {
              setPicked(key ?? 'item', i.id);
              router.back();
            }}
          />
        ))
      ) : loading ? null : (
        <EmptyState title="Nothing in stock matches" />
      )}
    </Screen>
  );
}
