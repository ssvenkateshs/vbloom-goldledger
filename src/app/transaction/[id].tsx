import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chips, EmptyState, Field, KeyValue, NumberField, Screen, numberOrZero } from '@/components';
import { partyRepo, transactionRepo } from '@/data';
import { PAYMENT_METHODS, computeOutstanding, formatPurity, fromMajor, newId, nowIso, type PaymentMethod } from '@/domain';
import { KIND_LABEL, MAKING_TYPE_LABEL, PAYMENT_METHOD_LABEL } from '@/labels';
import { shareInvoice } from '@/services/invoice';
import { useFormat, useQuery, useSettings } from '@/state';
import { Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const { settings } = useSettings();
  const fmt = useFormat();
  const [busy, setBusy] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payAmount, setPayAmount] = useState('');
  const [payRef, setPayRef] = useState('');
  const { data, loading, refresh } = useQuery(
    async (db) => {
      const txn = await transactionRepo.get(db, id);
      const party = txn?.partyId ? await partyRepo.get(db, txn.partyId) : null;
      return { txn, party };
    },
    [id],
  );
  const txn = data?.txn;
  if (!txn) return <Screen insideStack>{loading ? null : <EmptyState title="Transaction not found" />}</Screen>;

  const outstanding = computeOutstanding(txn);
  const paid = txn.payments.reduce((s, p) => s + (p.direction === 'in' ? p.amountMinor : -p.amountMinor), 0);

  async function share() {
    setBusy(true);
    try {
      await shareInvoice(txn!, data?.party ?? null, settings);
    } catch (e) {
      Alert.alert('Could not share', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function addPayment() {
    const amount = fromMajor(numberOrZero(payAmount), settings.currency).amountMinor;
    if (amount <= 0) return;
    const now = nowIso();
    await transactionRepo.save(db, {
      ...txn!,
      payments: [
        ...txn!.payments,
        {
          id: newId(),
          direction: outstanding >= 0 ? 'in' : 'out',
          method: payMethod,
          amountMinor: amount,
          reference: payRef.trim() || null,
          paidAt: now,
          notes: null,
        },
      ],
      updatedAt: now,
    });
    setPayAmount('');
    setPayRef('');
    refresh();
  }

  function voidIt() {
    Alert.alert('Void this document?', 'It stays in the ledger marked VOID and no longer counts towards balances.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Void',
        style: 'destructive',
        onPress: async () => {
          await transactionRepo.save(db, { ...txn!, status: 'void', updatedAt: nowIso() });
          refresh();
        },
      },
    ]);
  }

  function remove() {
    Alert.alert('Delete this document?', 'It is hidden from the ledger but kept in backups.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await transactionRepo.softDelete(db, txn!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen
      insideStack
      title={`${KIND_LABEL[txn.kind]} ${txn.number}`}
      subtitle={`${fmt.date(txn.issuedAt)}${txn.status !== 'final' ? ` · ${txn.status.toUpperCase()}` : ''}`}
      refreshing={loading}
      onRefresh={refresh}>
      <Card tone="accent">
        <KeyValue label="Party" value={data?.party?.name ?? 'Walk-in'} />
        <KeyValue label="Total" value={`${txn.totalMinor < 0 ? '−' : ''}${fmt.money(Math.abs(txn.totalMinor))}`} strong />
        <KeyValue label="Paid" value={fmt.money(paid)} />
        <KeyValue
          label={outstanding >= 0 ? 'Balance due' : 'Refund due'}
          value={fmt.money(Math.abs(outstanding))}
          strong
          tone={outstanding > 0 ? 'positive' : outstanding < 0 ? 'negative' : 'default'}
        />
        {txn.dueAt ? <KeyValue label={txn.kind === 'order' ? 'Deliver by' : 'Due'} value={fmt.date(txn.dueAt)} /> : null}
      </Card>

      <View style={styles.actions}>
        <Button title="Share PDF" onPress={share} loading={busy} />
        {txn.status === 'final' ? <Button title="Void" variant="secondary" onPress={voidIt} /> : null}
        <Button title="Delete" variant="danger" onPress={remove} />
      </View>

      {txn.lines.length ? (
        <Card title="Lines">
          {txn.lines.map((l) => (
            <View key={l.id} style={[styles.line, { borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{l.description}</AppText>
                <AppText variant="caption">
                  {l.direction === 'in' ? 'Received · ' : ''}
                  {formatPurity(l.metal, l.fineness)} · {fmt.weight(l.netWeightMg)} net · {fmt.money(Math.round(l.ratePerGramFineMinor))}/g fine
                  {l.wastagePercent ? ` · wastage ${l.wastagePercent}%` : ''}
                  {l.makingChargeValue ? ` · making ${MAKING_TYPE_LABEL[l.makingChargeType].toLowerCase()}` : ''}
                  {l.taxPercent ? ` · ${settings.taxLabel} ${l.taxPercent}%` : ''}
                </AppText>
              </View>
              <AppText variant="bodyStrong" color={l.direction === 'out' ? 'text' : 'negative'}>
                {l.direction === 'in' ? '−' : ''}
                {fmt.money(l.amountMinor)}
              </AppText>
            </View>
          ))}
        </Card>
      ) : null}

      <Card title="Payments">
        {txn.payments.map((p) => (
          <KeyValue
            key={p.id}
            label={`${fmt.date(p.paidAt)} · ${PAYMENT_METHOD_LABEL[p.method]}${p.reference ? ` · ${p.reference}` : ''}`}
            value={`${p.direction === 'out' ? '−' : ''}${fmt.money(p.amountMinor)}`}
          />
        ))}
        {txn.status === 'final' && outstanding !== 0 ? (
          <>
            <Chips options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))} value={payMethod} onChange={setPayMethod} />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <NumberField
                  label={`${outstanding > 0 ? 'Receive' : 'Pay out'} (${settings.currency})`}
                  value={payAmount}
                  onChangeText={setPayAmount}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Reference" value={payRef} onChangeText={setPayRef} />
              </View>
            </View>
            <View style={styles.actions}>
              <Button title="Add payment" size="sm" variant="secondary" onPress={addPayment} />
              <Button title="Settle in full" size="sm" variant="ghost" onPress={() => setPayAmount(String(Math.abs(outstanding) / 100))} />
            </View>
          </>
        ) : null}
      </Card>

      {txn.notes ? (
        <Card title="Notes">
          <AppText>{txn.notes}</AppText>
        </Card>
      ) : null}
      <AppText variant="caption" selectable>
        ID {txn.id}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  row: { flexDirection: 'row', gap: Spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
