import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, KeyValue, ListRow, Screen, Stat } from '@/components';
import { partyRepo, transactionRepo } from '@/data';
import { computeOutstanding } from '@/domain';
import { KIND_LABEL, ROLE_LABEL } from '@/labels';
import { useFormat, useQuery } from '@/state';
import { Spacing } from '@/theme';

export default function PartyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const fmt = useFormat();
  const { data, loading, refresh } = useQuery(
    async (db) => {
      const [party, txns] = await Promise.all([partyRepo.get(db, id), transactionRepo.list(db, { partyId: id })]);
      const balance = txns.reduce((s, t) => s + computeOutstanding(t), 0);
      return { party, txns, balance };
    },
    [id],
  );
  const party = data?.party;

  if (!party) {
    return <Screen insideStack>{loading ? null : <EmptyState title="Party not found" />}</Screen>;
  }

  function remove() {
    Alert.alert('Delete this party?', 'Their transactions stay in the ledger.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await partyRepo.softDelete(db, party!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen insideStack title={party.name} subtitle={party.roles.map((r) => ROLE_LABEL[r]).join(' · ')} refreshing={loading} onRefresh={refresh}>
      <View style={styles.row}>
        <Stat
          label={data!.balance >= 0 ? 'They owe you' : 'You owe them'}
          value={fmt.money(Math.abs(data!.balance))}
          tone={data!.balance > 0 ? 'positive' : data!.balance < 0 ? 'negative' : 'default'}
        />
      </View>
      <View style={styles.actions}>
        <Button title="New sale" onPress={() => router.push({ pathname: '/transaction/new', params: { kind: 'sale', partyId: party.id } })} />
        <Button
          title="Record payment"
          variant="secondary"
          onPress={() => router.push({ pathname: '/transaction/new', params: { kind: 'payment', partyId: party.id } })}
        />
        <Button title="Edit" variant="secondary" onPress={() => router.push({ pathname: '/party/edit', params: { id: party.id } })} />
        <Button title="Delete" variant="danger" onPress={remove} />
      </View>
      <Card title="Contact">
        {party.phone ? <KeyValue label="Phone" value={party.phone} /> : null}
        {party.email ? <KeyValue label="Email" value={party.email} /> : null}
        {party.address ? <KeyValue label="Address" value={party.address} /> : null}
        {party.taxId ? <KeyValue label="Tax ID" value={party.taxId} /> : null}
        {party.idDocument ? <KeyValue label="ID document" value={party.idDocument} /> : null}
        {party.tags.length ? <KeyValue label="Tags" value={party.tags.join(', ')} /> : null}
        {party.notes ? <AppText variant="small">{party.notes}</AppText> : null}
      </Card>
      <View style={{ gap: Spacing.sm }}>
        <AppText variant="label">Transactions</AppText>
        {data!.txns.length ? (
          data!.txns.map((t) => {
            const due = computeOutstanding(t);
            return (
              <ListRow
                key={t.id}
                title={`${KIND_LABEL[t.kind]} ${t.number}`}
                subtitle={`${fmt.date(t.issuedAt)}${t.status !== 'final' ? ` · ${t.status.toUpperCase()}` : ''}${due ? ` · ${due > 0 ? 'due' : 'refund'} ${fmt.money(Math.abs(due))}` : ''}`}
                rightText={fmt.money(Math.abs(t.totalMinor))}
                rightTone={t.status === 'void' ? 'secondary' : t.totalMinor >= 0 ? 'positive' : 'negative'}
                onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })}
              />
            );
          })
        ) : (
          <EmptyState title="No transactions yet" />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.md },
  actions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
});
