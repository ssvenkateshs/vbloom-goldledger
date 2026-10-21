import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, KeyValue, LogoMark, Screen } from '@/components';
import { BUNDLE_SCHEMA_VERSION } from '@/domain';
import { Gold, Spacing } from '@/theme';

const REPO = 'https://github.com/ssvenkateshs/vbloom-goldledger';

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return (
    <Screen insideStack>
      <View style={styles.hero}>
        <LogoMark size={96} />
        <AppText variant="display" style={{ color: Gold.bright }}>
          GoldLedger
        </AppText>
        <AppText variant="small" color="textSecondary" style={{ textAlign: 'center' }}>
          Stock, rates, people and ledger for private gold jewellers. Works offline; your data stays on your phone and in files you own.
        </AppText>
      </View>
      <Card title="Versions">
        <KeyValue label="App" value={version} />
        <KeyValue label="Bundle format" value={`goldledger.bundle ${BUNDLE_SCHEMA_VERSION}`} />
        <KeyValue label="Rate feed format" value="goldledger.rates 1.0.0" />
      </Card>
      <Card title="Interoperability">
        <AppText variant="small" color="textSecondary">
          Identifiers are UUIDs, timestamps ISO 8601, currencies ISO 4217, weights milligrams, purity hallmark fineness and money integer minor units.
          Backups validate against a published JSON Schema; the same shapes are described by an OpenAPI 3.1 specification for sync servers.
        </AppText>
        <View style={styles.row}>
          <Button title="Source & docs" variant="outline" icon="github" onPress={() => Linking.openURL(REPO)} />
          <Button title="Report a problem" variant="ghost" onPress={() => Linking.openURL(`${REPO}/issues`)} />
        </View>
      </Card>
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        MIT licensed. Not affiliated with any hallmarking authority or bullion exchange.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  row: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
});
