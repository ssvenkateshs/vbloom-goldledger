import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, KeyValue, Screen } from '@/components';
import { exportBundle, importBundle, itemRepo, partyRepo, transactionRepo } from '@/data';
import {
  BUNDLE_FILE_EXTENSION,
  BUNDLE_MIME_TYPE,
  BUNDLE_SCHEMA_VERSION,
  itemsFromCsv,
  itemsToCsv,
  parseBundle,
  partiesFromCsv,
  partiesToCsv,
  serializeBundle,
  transactionsToCsv,
} from '@/domain';
import { pickTextFile, shareTextFile, timestampForFileName } from '@/services/files';
import { useQuery, useSettings } from '@/state';
import { Spacing } from '@/theme';

export default function DataScreen() {
  const db = useSQLiteContext();
  const { settings } = useSettings();
  const [busy, setBusy] = useState<string | null>(null);
  const { data: counts, refresh } = useQuery(async (db) => {
    const [parties, items, txns] = await Promise.all([partyRepo.list(db), itemRepo.list(db, { status: 'all' }), transactionRepo.list(db)]);
    return { parties: parties.length, items: items.length, txns: txns.length };
  }, []);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      refresh();
    }
  }

  const stamp = () => timestampForFileName();
  const slug = settings.shopName.replace(/[^\w]+/g, '-').toLowerCase() || 'shop';

  return (
    <Screen insideStack title="Backup & data" subtitle="Open formats, no lock-in">
      <Card tone="accent" title="On this device">
        <KeyValue label="People" value={String(counts?.parties ?? '…')} />
        <KeyValue label="Stock items (all statuses)" value={String(counts?.items ?? '…')} />
        <KeyValue label="Transactions" value={String(counts?.txns ?? '…')} />
      </Card>

      <Card title="Full backup">
        <AppText variant="small" color="textSecondary">
          A single JSON file with everything: settings, people, stock, rates and the ledger. Restore it on another phone to merge; newer edits win,
          nothing is duplicated.
        </AppText>
        <View style={styles.row}>
          <Button
            title="Export backup"
            icon="cloud-upload-outline"
            loading={busy === 'export'}
            onPress={() =>
              run('export', async () => {
                const bundle = await exportBundle(db);
                await shareTextFile(`${slug}-${stamp()}${BUNDLE_FILE_EXTENSION}`, serializeBundle(bundle), BUNDLE_MIME_TYPE);
              })
            }
          />
          <Button
            title="Restore / merge"
            variant="outline"
            icon="cloud-download-outline"
            loading={busy === 'import'}
            onPress={() =>
              run('import', async () => {
                const picked = await pickTextFile(['application/json', BUNDLE_MIME_TYPE, 'text/plain', '*/*']);
                if (!picked) return;
                const parsed = parseBundle(picked.text);
                if (!parsed.ok) {
                  Alert.alert('Cannot import', parsed.error);
                  return;
                }
                const b = parsed.value;
                Alert.alert(
                  'Merge this backup?',
                  `${picked.name}\nExported ${new Date(b.exportedAt).toLocaleString()} by ${b.generator.name} ${b.generator.version}\n${b.parties.length} people · ${b.items.length} items · ${b.rates.length} rates · ${b.transactions.length} transactions`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Merge',
                      onPress: () =>
                        run('import', async () => {
                          const s = await importBundle(db, b, { applySettings: false });
                          Alert.alert(
                            'Merged',
                            `${s.parties} people, ${s.items} items, ${s.rates} rates and ${s.transactions} transactions applied.`,
                          );
                        }),
                    },
                  ],
                );
              })
            }
          />
        </View>
        <AppText variant="caption">Format goldledger.bundle v{BUNDLE_SCHEMA_VERSION}. The JSON Schema is published in the repository.</AppText>
      </Card>

      <Card title="Spreadsheets (CSV)">
        <AppText variant="small" color="textSecondary">
          RFC 4180 CSV with a header row; opens in Excel, Numbers, Google Sheets and Tally imports. Weights in {settings.weightUnit}, money in{' '}
          {settings.currency}.
        </AppText>
        <View style={styles.row}>
          <Button
            title="Stock"
            variant="secondary"
            size="sm"
            icon="file-delimited-outline"
            loading={busy === 'csv-items'}
            onPress={() =>
              run('csv-items', async () =>
                shareTextFile(
                  `${slug}-stock-${stamp()}.csv`,
                  itemsToCsv(await itemRepo.list(db, { status: 'all' }), settings.weightUnit),
                  'text/csv',
                ),
              )
            }
          />
          <Button
            title="People"
            variant="secondary"
            size="sm"
            icon="file-delimited-outline"
            loading={busy === 'csv-parties'}
            onPress={() =>
              run('csv-parties', async () => shareTextFile(`${slug}-people-${stamp()}.csv`, partiesToCsv(await partyRepo.list(db)), 'text/csv'))
            }
          />
          <Button
            title="Ledger"
            variant="secondary"
            size="sm"
            icon="file-delimited-outline"
            loading={busy === 'csv-txns'}
            onPress={() =>
              run('csv-txns', async () =>
                shareTextFile(`${slug}-ledger-${stamp()}.csv`, transactionsToCsv(await transactionRepo.list(db)), 'text/csv'),
              )
            }
          />
        </View>
        <View style={styles.row}>
          <Button
            title="Import stock CSV"
            variant="outline"
            size="sm"
            loading={busy === 'imp-items'}
            onPress={() =>
              run('imp-items', async () => {
                const picked = await pickTextFile(['text/csv', 'text/comma-separated-values', 'text/plain', '*/*']);
                if (!picked) return;
                const { items, errors } = itemsFromCsv(picked.text, { currency: settings.currency, unit: settings.weightUnit });
                const applied = await itemRepo.merge(db, items);
                Alert.alert(
                  'Stock imported',
                  `${applied} of ${items.length} rows applied.${errors.length ? `\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n… ${errors.length - 5} more` : ''}` : ''}`,
                );
              })
            }
          />
          <Button
            title="Import people CSV"
            variant="outline"
            size="sm"
            loading={busy === 'imp-parties'}
            onPress={() =>
              run('imp-parties', async () => {
                const picked = await pickTextFile(['text/csv', 'text/comma-separated-values', 'text/plain', '*/*']);
                if (!picked) return;
                const { parties, errors } = partiesFromCsv(picked.text);
                const applied = await partyRepo.merge(db, parties);
                Alert.alert(
                  'People imported',
                  `${applied} of ${parties.length} rows applied.${errors.length ? `\n\n${errors.slice(0, 5).join('\n')}` : ''}`,
                );
              })
            }
          />
        </View>
        <AppText variant="caption">
          Minimum columns for stock: sku, name, metal, fineness (or purity like 22K), net_weight. Rows with an id update the matching item.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' } });
