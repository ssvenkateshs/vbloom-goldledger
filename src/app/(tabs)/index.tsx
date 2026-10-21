import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, Icon, ListRow, RateChart, Screen, Stat, Tile, Wordmark } from '@/components';
import { itemRepo, rateRepo, transactionRepo } from '@/data';
import { METAL_LABEL, canonicalToQuote, computeOutstanding, type Metal } from '@/domain';
import { KIND_LABEL } from '@/labels';
import { useFormat, useQuery, useSettings } from '@/state';
import { Gold, Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

export default function TodayScreen() {
  const theme = useTheme();
  const { settings } = useSettings();
  const fmt = useFormat();
  const { data, loading, refresh } = useQuery(
    async (db) => {
      const [gold, silver, goldHistory, stock, balances, recent, orders] = await Promise.all([
        rateRepo.latest(db, 'gold', settings.currency),
        rateRepo.latest(db, 'silver', settings.currency),
        rateRepo.history(db, 'gold', settings.currency, 400),
        itemRepo.stockSummary(db),
        transactionRepo.balances(db),
        transactionRepo.list(db, { limit: 6 }),
        transactionRepo.list(db, { kind: 'order', limit: 50 }),
      ]);
      let receivable = 0;
      let payable = 0;
      for (const b of balances.values()) {
        if (b > 0) receivable += b;
        else payable += -b;
      }
      const soon = Date.now() + 7 * 86_400_000;
      const dueOrders = orders.filter((o) => o.status === 'final' && o.dueAt && new Date(o.dueAt).getTime() <= soon).length;
      const overdue = recent.filter(
        (t) => t.status === 'final' && t.dueAt && new Date(t.dueAt).getTime() < Date.now() && computeOutstanding(t) > 0,
      ).length;
      return { gold, silver, goldHistory, stock, receivable, payable, recent, reminders: dueOrders + overdue };
    },
    [settings.currency],
  );

  const goldBasis = fmt.rateBasisFor('gold');
  const chartPoints = (data?.goldHistory ?? []).map((r) => ({ at: r.effectiveAt, value: canonicalToQuote(r.ratePerGramFineMinor, goldBasis) }));

  return (
    <Screen refreshing={loading} onRefresh={refresh}>
      <View style={styles.header}>
        <Wordmark size={16} subtitle={settings.shopName} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reminders"
          onPress={() => router.push('/reminders')}
          style={[styles.bell, { borderColor: theme.borderStrong }]}>
          <Icon name="bell-outline" size={22} color={Gold.bright} />
          {data?.reminders ? <View style={[styles.bellDot, { backgroundColor: theme.negative }]} /> : null}
        </Pressable>
      </View>

      <Card tone="gold">
        <View style={styles.goldRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label" style={{ color: '#5A4610' }}>
              Gold today · {goldBasis.label}
            </AppText>
            <AppText variant="display" style={{ color: Gold.onGold }} numberOfLines={1} adjustsFontSizeToFit>
              {data?.gold ? fmt.money(canonicalToQuote(data.gold.ratePerGramFineMinor, goldBasis)) : 'Not set'}
            </AppText>
            <AppText variant="small" style={{ color: '#4A3A0E' }}>
              {data?.gold ? `${fmt.date(data.gold.effectiveAt, 'long')} · ${data.gold.source}` : 'Tap to enter the day’s rate'}
            </AppText>
            {data?.silver ? (
              <AppText variant="small" style={{ color: '#4A3A0E', marginTop: Spacing.xs }}>
                Silver {fmt.rate('silver', data.silver.ratePerGramFineMinor)}
              </AppText>
            ) : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Update rates" onPress={() => router.push('/rates')} style={styles.goldAction}>
            <Icon name="pencil" size={20} color={Gold.bright} />
          </Pressable>
        </View>
      </Card>

      <Card>
        <RateChart points={chartPoints} formatValue={(v) => fmt.money(v)} formatDate={(iso) => fmt.date(iso)} />
      </Card>

      <Button
        title="New sale"
        icon="plus"
        size="lg"
        fullWidth
        onPress={() => router.push({ pathname: '/transaction/new', params: { kind: 'sale' } })}
      />

      <View style={styles.tiles}>
        <Tile icon="diamond-stone" title="Add stock" subtitle="New piece with hallmark" onPress={() => router.push('/item/edit')} />
        <Tile
          icon="cash-multiple"
          title="Record payment"
          subtitle="Settle a balance"
          onPress={() => router.push({ pathname: '/transaction/new', params: { kind: 'payment' } })}
        />
        <Tile
          icon="recycle-variant"
          title="Old gold"
          subtitle="Buy or exchange"
          onPress={() => router.push({ pathname: '/transaction/new', params: { kind: 'exchange' } })}
        />
        <Tile icon="clipboard-text-clock" title="Orders" subtitle="Custom pieces due" onPress={() => router.push('/reminders')} />
      </View>

      <View style={styles.statRow}>
        <Stat label="Receivable" value={fmt.money(data?.receivable ?? 0)} detail="Owed to you" tone={data?.receivable ? 'positive' : 'default'} />
        <Stat label="Payable" value={fmt.money(data?.payable ?? 0)} detail="You owe" tone={data?.payable ? 'negative' : 'default'} />
      </View>

      <Card title="Stock on hand">
        {data?.stock.length ? (
          data.stock.map((s) => (
            <View key={s.metal} style={styles.stockRow}>
              <View>
                <AppText variant="bodyStrong">{METAL_LABEL[s.metal as Metal]}</AppText>
                <AppText variant="caption">
                  {s.pieces} piece{s.pieces === 1 ? '' : 's'}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="bodyStrong">{fmt.weight(s.netWeightMg)} net</AppText>
                <AppText variant="caption">{fmt.fineWeight(Math.round(s.fineWeightMg))} fine</AppText>
              </View>
            </View>
          ))
        ) : (
          <AppText variant="small" color="textSecondary">
            No stock yet. Add pieces from the Stock tab or import a CSV from Backup & data.
          </AppText>
        )}
      </Card>

      <View style={{ gap: Spacing.sm }}>
        <AppText variant="label">Recent activity</AppText>
        {data?.recent.length ? (
          data.recent.map((t) => (
            <ListRow
              key={t.id}
              title={`${KIND_LABEL[t.kind]} ${t.number}`}
              subtitle={`${fmt.date(t.issuedAt)} · ${t.lines.length} line${t.lines.length === 1 ? '' : 's'}${t.status !== 'final' ? ` · ${t.status}` : ''}`}
              rightText={fmt.money(Math.abs(t.totalMinor))}
              rightTone={t.status === 'void' ? 'secondary' : t.totalMinor >= 0 ? 'positive' : 'negative'}
              onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })}
            />
          ))
        ) : (
          <EmptyState title="Nothing recorded yet" hint="Sales, purchases and payments will show up here." />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bell: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4 },
  goldRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  goldAction: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A1507', alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  statRow: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xs },
});
