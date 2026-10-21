import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, EmptyState, ListRow, Screen } from '@/components';
import { partyRepo, transactionRepo } from '@/data';
import { computeOutstanding } from '@/domain';
import { KIND_LABEL } from '@/labels';
import { useFormat, useQuery } from '@/state';
import { Spacing } from '@/theme';

export default function RemindersScreen() {
  const fmt = useFormat();
  const { data, loading, refresh } = useQuery(async (db) => {
    const [txns, parties] = await Promise.all([transactionRepo.list(db), partyRepo.list(db, { includeDeleted: true })]);
    const names = new Map(parties.map((p) => [p.id, p.name]));
    const now = Date.now();
    const week = now + 7 * 86_400_000;
    const final = txns.filter((t) => t.status === 'final');
    const orders = final
      .filter((t) => t.kind === 'order' && t.dueAt)
      .sort((a, b) => a.dueAt!.localeCompare(b.dueAt!))
      .map((t) => ({
        t,
        name: names.get(t.partyId ?? '') ?? 'Walk-in',
        overdue: new Date(t.dueAt!).getTime() < now,
        soon: new Date(t.dueAt!).getTime() <= week,
      }));
    const credit = final
      .filter((t) => t.kind !== 'order' && t.dueAt && computeOutstanding(t) > 0)
      .map((t) => ({ t, name: names.get(t.partyId ?? '') ?? 'Walk-in', overdue: new Date(t.dueAt!).getTime() < now, due: computeOutstanding(t) }));
    const balances = await transactionRepo.balances(db);
    const owing = [...balances.entries()]
      .filter(([, b]) => b > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, b]) => ({ id, name: names.get(id) ?? 'Unknown', balance: b }));
    return { orders, credit, owing };
  }, []);

  const nothing = data && data.orders.length === 0 && data.credit.length === 0 && data.owing.length === 0;

  return (
    <Screen insideStack title="Reminders" subtitle="Orders to deliver and money to collect" refreshing={loading} onRefresh={refresh}>
      {nothing ? <EmptyState title="All clear" hint="Orders with delivery dates and unpaid credit sales will appear here." /> : null}
      {data?.orders.length ? (
        <View style={{ gap: Spacing.sm }}>
          <AppText variant="label">Orders</AppText>
          {data.orders.map(({ t, name, overdue, soon }) => (
            <ListRow
              key={t.id}
              title={name}
              badge={t.number}
              subtitle={`Deliver by ${fmt.date(t.dueAt!)}${overdue ? ' · OVERDUE' : soon ? ' · this week' : ''}`}
              rightText={fmt.money(Math.abs(computeOutstanding(t)))}
              rightTone={overdue ? 'negative' : 'default'}
              onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })}
            />
          ))}
        </View>
      ) : null}
      {data?.credit.length ? (
        <View style={{ gap: Spacing.sm }}>
          <AppText variant="label">Credit due</AppText>
          {data.credit.map(({ t, name, overdue, due }) => (
            <ListRow
              key={t.id}
              title={name}
              badge={`${KIND_LABEL[t.kind]} ${t.number}`}
              subtitle={`Due ${fmt.date(t.dueAt!)}${overdue ? ' · OVERDUE' : ''}`}
              rightText={fmt.money(due)}
              rightTone={overdue ? 'negative' : 'positive'}
              onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })}
            />
          ))}
        </View>
      ) : null}
      {data?.owing.length ? (
        <View style={{ gap: Spacing.sm }}>
          <AppText variant="label">Largest balances</AppText>
          {data.owing.map((o) => (
            <ListRow
              key={o.id}
              title={o.name}
              rightText={fmt.money(o.balance)}
              rightTone="positive"
              onPress={() => router.push({ pathname: '/party/[id]', params: { id: o.id } })}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
