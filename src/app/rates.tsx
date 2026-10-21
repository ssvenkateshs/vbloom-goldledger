import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chips, KeyValue, NumberField, RateChart, Screen, numberOrZero } from '@/components';
import { rateRepo } from '@/data';
import {
  METALS,
  METAL_LABEL,
  RATE_BASES,
  canonicalToQuote,
  fromMajor,
  newId,
  nowIso,
  quoteToCanonical,
  type Metal,
  type RateBasisKey,
} from '@/domain';
import { pullRateFeed } from '@/services/rate-feed';
import { useFormat, useQuery, useSettings } from '@/state';
import { Spacing } from '@/theme';

export default function RatesScreen() {
  const db = useSQLiteContext();
  const { settings } = useSettings();
  const fmt = useFormat();
  const [metal, setMetal] = useState<Metal>('gold');
  const [basisKey, setBasisKey] = useState<RateBasisKey>(
    metal === 'gold' ? (settings.goldRateBasis as RateBasisKey) : (settings.silverRateBasis as RateBasisKey),
  );
  const [quote, setQuote] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, refresh } = useQuery(
    async (db) => ({
      latest: await rateRepo.latest(db, metal, settings.currency),
      history: await rateRepo.history(db, metal, settings.currency, 400),
    }),
    [metal, settings.currency],
  );
  const basis = RATE_BASES[basisKey] ?? fmt.rateBasisFor(metal);
  const chartPoints = (data?.history ?? []).map((r) => ({ at: r.effectiveAt, value: canonicalToQuote(r.ratePerGramFineMinor, basis) }));

  function switchMetal(m: Metal) {
    setMetal(m);
    setBasisKey(m === 'gold' ? (settings.goldRateBasis as RateBasisKey) : m === 'silver' ? (settings.silverRateBasis as RateBasisKey) : 'per_g_24k');
    setQuote('');
  }

  async function save() {
    const minor = fromMajor(numberOrZero(quote), settings.currency).amountMinor;
    if (minor <= 0) return Alert.alert('Enter a rate', `Type today's ${METAL_LABEL[metal].toLowerCase()} rate ${basis.label}.`);
    setBusy(true);
    try {
      const now = nowIso();
      await rateRepo.add(db, {
        id: newId(),
        metal,
        currency: settings.currency,
        ratePerGramFineMinor: quoteToCanonical(minor, basis),
        source: 'manual',
        effectiveAt: now,
        createdAt: now,
      });
      setQuote('');
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function pull() {
    setBusy(true);
    try {
      const { added, source } = await pullRateFeed(db, settings.rateFeedUrl);
      Alert.alert(added ? 'Rates updated' : 'Already up to date', `${added} new rate${added === 1 ? '' : 's'} from ${source}.`);
      refresh();
    } catch (e) {
      Alert.alert('Could not fetch rates', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen insideStack title="Rates" subtitle="Per gram of fine metal, shown in the basis you quote" refreshing={loading} onRefresh={refresh}>
      <Chips options={METALS.map((m) => ({ value: m, label: METAL_LABEL[m] }))} value={metal} onChange={switchMetal} />
      <Card tone="gold">
        <AppText variant="label" style={{ color: '#5A4610' }}>
          Current {METAL_LABEL[metal].toLowerCase()} · {basis.label}
        </AppText>
        <AppText variant="display" style={{ color: '#1A1507' }} numberOfLines={1} adjustsFontSizeToFit>
          {data?.latest ? fmt.money(canonicalToQuote(data.latest.ratePerGramFineMinor, basis)) : 'Not set'}
        </AppText>
        {data?.latest ? (
          <AppText variant="small" style={{ color: '#4A3A0E' }}>
            {fmt.date(data.latest.effectiveAt, 'long')} · {data.latest.source} · {fmt.money(Math.round(data.latest.ratePerGramFineMinor))}/g fine
          </AppText>
        ) : null}
      </Card>
      <Card>
        <RateChart points={chartPoints} formatValue={(v) => fmt.money(v)} formatDate={(iso) => fmt.date(iso, 'long')} />
      </Card>
      <Card title="Enter today's rate">
        <Chips
          label="Quote basis"
          options={(Object.keys(RATE_BASES) as RateBasisKey[]).map((k) => ({ value: k, label: RATE_BASES[k].label }))}
          value={basisKey}
          onChange={setBasisKey}
        />
        <NumberField label={`Rate (${settings.currency}) ${basis.label}`} value={quote} onChangeText={setQuote} />
        {quote ? (
          <KeyValue
            label="Stored as"
            value={`${fmt.money(Math.round(quoteToCanonical(fromMajor(numberOrZero(quote), settings.currency).amountMinor, basis)))} per gram fine`}
          />
        ) : null}
        <View style={styles.actions}>
          <Button title="Save rate" onPress={save} loading={busy} />
          {settings.rateFeedUrl ? (
            <Button title="Pull from feed" variant="outline" icon="cloud-download-outline" onPress={pull} loading={busy} />
          ) : null}
        </View>
        {!settings.rateFeedUrl ? (
          <AppText variant="caption">Set a rate feed URL in Shop settings to pull rates published by your head office or bullion dealer.</AppText>
        ) : null}
      </Card>
      <Card title="History">
        {data?.history.length ? (
          data.history
            .slice(0, 30)
            .map((r) => (
              <KeyValue
                key={r.id}
                label={`${fmt.date(r.effectiveAt, 'long')} · ${r.source}`}
                value={fmt.money(canonicalToQuote(r.ratePerGramFineMinor, basis))}
              />
            ))
        ) : (
          <AppText variant="small" color="textSecondary">
            No rates recorded yet.
          </AppText>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' } });
