import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chips, EmptyState, Field, ListRow, Screen } from '@/components';
import { partyRepo, transactionRepo } from '@/data';
import { TRANSACTION_KINDS, computeOutstanding, type TransactionKind } from '@/domain';
import { useFormat, useQuery } from '@/state';
import { Spacing } from '@/theme';

import { KIND_LABEL } from '@/labels';

export default function LedgerScreen() {
  const [kind, setKind] = useState<TransactionKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const fmt = useFormat();
  const { data, loading, refresh } = useQuery(
    async (db) => {
      const [txns, parties] = await Promise.all([
        transactionRepo.list(db, { kind, search, limit: 200 }),
        partyRepo.list(db, { includeDeleted: true }),
      ]);
      const names = new Map(parties.map((p) => [p.id, p.name]));
      return txns.map((t) => ({ ...t, partyName: t.partyId ? (names.get(t.partyId) ?? 'Unknown') : 'Walk-in' }));
    },
    [kind, search],
  );

  return (
    <Screen
      title="Ledger"
      action={<Button title="New" size="sm" onPress={() => router.push('/transaction/new')} />}
      refreshing={loading}
      onRefresh={refresh}
      toolbar={
        <View style={styles.toolbar}>
          <Field label="Search" placeholder="Document number or notes" value={search} onChangeText={setSearch} autoCapitalize="characters" />
          <Chips
            options={[{ value: 'all', label: 'All' }, ...TRANSACTION_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))]}
            value={kind}
            onChange={setKind}
          />
        </View>
      }>
      {data?.length ? (
        data.map((t) => {
          const due = computeOutstanding(t);
          return (
            <ListRow
              key={t.id}
              title={`${t.partyName}`}
              badge={`${KIND_LABEL[t.kind]} ${t.number}`}
              subtitle={`${fmt.date(t.issuedAt)}${t.status !== 'final' ? ` · ${t.status.toUpperCase()}` : ''}${due !== 0 ? ` · ${due > 0 ? 'due' : 'refund'} ${fmt.money(Math.abs(due))}` : ''}`}
              rightText={fmt.money(Math.abs(t.totalMinor))}
              rightTone={t.status === 'void' ? 'secondary' : t.totalMinor >= 0 ? 'positive' : 'negative'}
              onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })}
            />
          );
        })
      ) : loading ? null : (
        <EmptyState title="No transactions" hint="Record a sale, purchase, exchange, repair, order or payment." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ toolbar: { gap: Spacing.md } });
