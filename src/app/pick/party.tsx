import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, EmptyState, Field, ListRow, Screen } from '@/components';
import { partyRepo } from '@/data';
import { setPicked, useQuery } from '@/state';

export default function PickPartyScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const [search, setSearch] = useState('');
  const { data, loading } = useQuery((db) => partyRepo.list(db, { search }), [search]);

  return (
    <Screen
      insideStack
      toolbar={<Field label="Search" value={search} onChangeText={setSearch} autoFocus placeholder="Name or phone" />}
      action={<Button title="New" size="sm" variant="secondary" onPress={() => router.push('/party/edit')} />}
      title="Choose party">
      {data?.length ? (
        data.map((p) => (
          <ListRow
            key={p.id}
            title={p.name}
            subtitle={[p.roles.join(', '), p.phone].filter(Boolean).join(' · ')}
            onPress={() => {
              setPicked(key ?? 'party', p.id);
              router.back();
            }}
          />
        ))
      ) : loading ? null : (
        <EmptyState title="No matches" hint="Tap New to add a party." />
      )}
    </Screen>
  );
}
