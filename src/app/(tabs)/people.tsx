import { router } from 'expo-router';
import { useState } from 'react';

import { Button, EmptyState, Field, ListRow, Screen } from '@/components';
import { partyRepo, transactionRepo } from '@/data';
import { useFormat, useQuery } from '@/state';

export default function PeopleScreen() {
  const [search, setSearch] = useState('');
  const fmt = useFormat();
  const { data, loading, refresh } = useQuery(
    async (db) => {
      const [parties, balances] = await Promise.all([partyRepo.list(db, { search }), transactionRepo.balances(db)]);
      return parties.map((p) => ({ ...p, balance: balances.get(p.id) ?? 0 }));
    },
    [search],
  );

  return (
    <Screen
      title="People"
      subtitle="Customers, suppliers and artisans"
      action={<Button title="Add" size="sm" onPress={() => router.push('/party/edit')} />}
      refreshing={loading}
      onRefresh={refresh}
      toolbar={<Field label="Search" placeholder="Name, phone or email" value={search} onChangeText={setSearch} />}>
      {data?.length ? (
        data.map((p) => (
          <ListRow
            key={p.id}
            title={p.name}
            subtitle={[p.roles.join(', '), p.phone].filter(Boolean).join(' · ')}
            rightText={p.balance !== 0 ? fmt.money(Math.abs(p.balance)) : undefined}
            rightTone={p.balance > 0 ? 'positive' : 'negative'}
            onPress={() => router.push({ pathname: '/party/[id]', params: { id: p.id } })}
          />
        ))
      ) : loading ? null : (
        <EmptyState title="No people yet" hint="Add customers you sell to, suppliers you buy from and artisans who make for you." />
      )}
    </Screen>
  );
}
