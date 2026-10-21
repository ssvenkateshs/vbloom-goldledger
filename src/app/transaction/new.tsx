import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Chips,
  Field,
  KeyValue,
  LineEditor,
  NumberField,
  Screen,
  draftFromItem,
  draftFromLine,
  draftToLine,
  emptyDraft,
  numberOrZero,
  type LineDraft,
} from '@/components';
import { itemRepo, partyRepo, rateRepo, transactionRepo } from '@/data';
import {
  PAYMENT_METHODS,
  TRANSACTION_KINDS,
  TransactionSchema,
  computeTransactionTotal,
  formatPurity,
  fromMajor,
  newId,
  nowIso,
  type Metal,
  type Party,
  type Payment,
  type PaymentMethod,
  type Rate,
  type TransactionKind,
  type TransactionLine,
} from '@/domain';
import { KIND_LABEL, KIND_PREFIX, PAYMENT_METHOD_LABEL } from '@/labels';
import { takePicked, useFormat, useLatestRates, useSettings } from '@/state';
import { Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

const PARTY_KEY = 'txn-party';
const ITEM_KEY = 'txn-item';

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localDateToIso(text: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const d = new Date(`${text}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ kind?: TransactionKind; partyId?: string; itemId?: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const { settings } = useSettings();
  const fmt = useFormat();
  const { data: rates } = useLatestRates();
  const ratesOrEmpty = useMemo(() => rates ?? ({} as Partial<Record<Metal, Rate | null>>), [rates]);

  const [kind, setKind] = useState<TransactionKind>(params.kind ?? 'sale');
  const [party, setParty] = useState<Party | null>(null);
  const [issued, setIssued] = useState(todayLocal());
  const [due, setDue] = useState('');
  const [lines, setLines] = useState<TransactionLine[]>([]);
  const [draft, setDraft] = useState<LineDraft | null>(null);
  const [draftIsNew, setDraftIsNew] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payAmount, setPayAmount] = useState('');
  const [payRef, setPayRef] = useState('');
  const [payDirection, setPayDirection] = useState<'in' | 'out'>('in');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const seededItem = useRef(false);

  const total = computeTransactionTotal(lines);
  const paid = payments.reduce((s, p) => s + (p.direction === 'in' ? p.amountMinor : -p.amountMinor), 0);

  useEffect(() => {
    if (params.partyId) partyRepo.get(db, params.partyId).then(setParty);
  }, [db, params.partyId]);

  const addItemLine = useCallback(
    async (itemId: string) => {
      const item = await itemRepo.get(db, itemId);
      if (!item) return;
      const rate = await rateRepo.latest(db, item.metal, settings.currency);
      const d = draftFromItem(item, rate, settings);
      setLines((prev) => [...prev, draftToLine(d, settings, prev.length)]);
    },
    [db, settings],
  );

  useEffect(() => {
    if (params.itemId && !seededItem.current) {
      seededItem.current = true;
      addItemLine(params.itemId);
    }
  }, [params.itemId, addItemLine]);

  // The pickers are modals; when one closes this screen regains focus and collects the selection.
  useFocusEffect(
    useCallback(() => {
      const p = takePicked(PARTY_KEY);
      if (p) partyRepo.get(db, p).then(setParty);
      const i = takePicked(ITEM_KEY);
      if (i) addItemLine(i);
    }, [db, addItemLine]),
  );

  function startManualLine(direction: 'out' | 'in') {
    setDraft(emptyDraft(settings, ratesOrEmpty, direction));
    setDraftIsNew(true);
  }

  function commitDraft() {
    if (!draft) return;
    const line = draftToLine(draft, settings, lines.length);
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.id === line.id);
      if (idx === -1) return [...prev, line];
      const next = [...prev];
      next[idx] = { ...line, sortOrder: prev[idx].sortOrder };
      return next;
    });
    setDraft(null);
  }

  function editLine(line: TransactionLine) {
    setDraft(draftFromLine(line, settings));
    setDraftIsNew(false);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id).map((l, i) => ({ ...l, sortOrder: i })));
    if (draft?.id === id) setDraft(null);
  }

  function addPayment() {
    const amount = fromMajor(numberOrZero(payAmount), settings.currency).amountMinor;
    if (amount <= 0) return;
    setPayments((prev) => [
      ...prev,
      {
        id: newId(),
        direction: payDirection,
        method: payMethod,
        amountMinor: amount,
        reference: payRef.trim() || null,
        paidAt: nowIso(),
        notes: null,
      },
    ]);
    setPayAmount('');
    setPayRef('');
  }

  async function save() {
    const issuedAt = localDateToIso(issued);
    if (!issuedAt) return Alert.alert('Check the date', 'Use the format YYYY-MM-DD.');
    const dueAt = due.trim() ? localDateToIso(due) : null;
    if (due.trim() && !dueAt) return Alert.alert('Check the due date', 'Use the format YYYY-MM-DD.');
    if (kind === 'payment' && payments.length === 0) return Alert.alert('Add a payment', 'A payment document needs at least one payment.');
    if (kind !== 'payment' && lines.length === 0) return Alert.alert('Add a line', 'Add at least one item or metal line.');
    if ((kind === 'payment' || kind === 'purchase') && !party)
      return Alert.alert('Choose a party', `${KIND_LABEL[kind]}s must be linked to a party.`);

    setSaving(true);
    try {
      const now = nowIso();
      const number = await transactionRepo.nextNumber(
        db,
        kind === 'sale' || kind === 'exchange' ? settings.invoicePrefix : KIND_PREFIX[kind],
        new Date(issuedAt).getFullYear(),
      );
      const parsed = TransactionSchema.safeParse({
        id: newId(),
        kind,
        number,
        status: 'final',
        partyId: party?.id ?? null,
        currency: settings.currency,
        issuedAt,
        dueAt,
        lines,
        payments,
        totalMinor: total,
        notes: notes.trim() || null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        Alert.alert('Cannot save', `${issue.path.join('.')}: ${issue.message}`);
        return;
      }
      await transactionRepo.save(db, parsed.data);
      for (const line of parsed.data.lines) {
        if (line.itemId && line.direction === 'out') await itemRepo.setStatus(db, line.itemId, kind === 'order' ? 'reserved' : 'sold');
      }
      router.replace({ pathname: '/transaction/[id]', params: { id: parsed.data.id } });
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      insideStack
      title={`New ${KIND_LABEL[kind].toLowerCase()}`}
      footer={
        <View style={styles.footerRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption">{total >= 0 ? 'Party owes' : 'You owe'}</AppText>
            <AppText variant="title">{fmt.money(Math.abs(total - paid))}</AppText>
          </View>
          <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
          <Button title="Save" onPress={save} loading={saving} />
        </View>
      }>
      <Chips options={TRANSACTION_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} value={kind} onChange={setKind} />

      <Card title="Party">
        <View style={styles.row}>
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            {party ? party.name : 'Walk-in'}
          </AppText>
          <Button
            title={party ? 'Change' : 'Choose'}
            size="sm"
            variant="secondary"
            onPress={() => router.push({ pathname: '/pick/party', params: { key: PARTY_KEY } })}
          />
          {party ? <Button title="Clear" size="sm" variant="ghost" onPress={() => setParty(null)} /> : null}
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Date" value={issued} onChangeText={setIssued} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label={kind === 'order' ? 'Deliver by' : 'Due date'}
              value={due}
              onChangeText={setDue}
              placeholder="optional"
              autoCapitalize="none"
            />
          </View>
        </View>
      </Card>

      {kind !== 'payment' ? (
        <Card title="Lines">
          {lines.map((l) => (
            <Pressable key={l.id} onPress={() => editLine(l)} style={[styles.line, { borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{l.description}</AppText>
                <AppText variant="caption">
                  {l.direction === 'in' ? 'Received · ' : ''}
                  {formatPurity(l.metal, l.fineness)} · {fmt.weight(l.netWeightMg)} net · tax {l.taxPercent}%
                </AppText>
              </View>
              <AppText variant="bodyStrong" color={l.direction === 'out' ? 'text' : 'negative'}>
                {l.direction === 'in' ? '−' : ''}
                {fmt.money(l.amountMinor)}
              </AppText>
              <Button title="×" size="sm" variant="ghost" onPress={() => removeLine(l.id)} accessibilityLabel="Remove line" />
            </Pressable>
          ))}
          {draft ? (
            <LineEditor
              draft={draft}
              settings={settings}
              rates={ratesOrEmpty}
              formatMoney={fmt.money}
              onChange={setDraft}
              onCommit={commitDraft}
              onCancel={() => setDraft(null)}
              isNew={draftIsNew}
            />
          ) : (
            <View style={styles.actions}>
              <Button title="From stock" size="sm" onPress={() => router.push({ pathname: '/pick/item', params: { key: ITEM_KEY } })} />
              <Button title="Manual line" size="sm" variant="secondary" onPress={() => startManualLine(kind === 'purchase' ? 'in' : 'out')} />
              {kind !== 'purchase' ? <Button title="Old gold in" size="sm" variant="secondary" onPress={() => startManualLine('in')} /> : null}
            </View>
          )}
          <KeyValue label="Total" value={`${total < 0 ? '−' : ''}${fmt.money(Math.abs(total))}`} strong />
        </Card>
      ) : null}

      <Card title="Payments">
        {payments.map((p) => (
          <View key={p.id} style={[styles.line, { borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">
                {p.direction === 'in' ? 'Received' : 'Paid out'} · {PAYMENT_METHOD_LABEL[p.method]}
              </AppText>
              {p.reference ? <AppText variant="caption">{p.reference}</AppText> : null}
            </View>
            <AppText variant="bodyStrong">{fmt.money(p.amountMinor)}</AppText>
            <Button
              title="×"
              size="sm"
              variant="ghost"
              onPress={() => setPayments((prev) => prev.filter((x) => x.id !== p.id))}
              accessibilityLabel="Remove payment"
            />
          </View>
        ))}
        <Chips
          options={[
            { value: 'in', label: 'Received' },
            { value: 'out', label: 'Paid out' },
          ]}
          value={payDirection}
          onChange={setPayDirection}
        />
        <Chips options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))} value={payMethod} onChange={setPayMethod} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <NumberField label={`Amount (${settings.currency})`} value={payAmount} onChangeText={setPayAmount} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Reference" value={payRef} onChangeText={setPayRef} placeholder="UPI ref, cheque no." />
          </View>
        </View>
        <View style={styles.actions}>
          <Button title="Add payment" size="sm" variant="secondary" onPress={addPayment} />
          {kind !== 'payment' && Math.abs(total - paid) > 0 ? (
            <Button
              title="Settle in full"
              size="sm"
              variant="ghost"
              onPress={() => {
                setPayDirection(total - paid >= 0 ? 'in' : 'out');
                setPayAmount(String(Math.abs(total - paid) / 100));
              }}
            />
          ) : null}
        </View>
      </Card>

      <Card title="Notes">
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Printed on the invoice" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  actions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
