import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chips, Field, NumberField, Screen, numberOrZero } from '@/components';
import { RATE_BASES, SettingsSchema, WEIGHT_UNITS, WEIGHT_UNIT_LABEL, type RateBasisKey, type WeightUnit } from '@/domain';
import { PinPad } from '@/features/PinPad';
import { clearPin, setPin } from '@/services/pin';
import { useAppState, useSettings } from '@/state';
import { Spacing } from '@/theme';

const RATE_KEYS = Object.keys(RATE_BASES) as RateBasisKey[];

export default function SettingsScreen() {
  const { settings, update } = useSettings();
  const { pinEnabled, refreshPin, lock } = useAppState();
  const [shopName, setShopName] = useState(settings.shopName);
  const [address, setAddress] = useState(settings.addressLines.join('\n'));
  const [phone, setPhone] = useState(settings.phone);
  const [taxId, setTaxId] = useState(settings.taxId);
  const [taxLabel, setTaxLabel] = useState(settings.taxLabel);
  const [taxPercent, setTaxPercent] = useState(String(settings.taxPercent));
  const [currency, setCurrency] = useState(settings.currency);
  const [locale, setLocale] = useState(settings.locale);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(settings.weightUnit);
  const [goldBasis, setGoldBasis] = useState(settings.goldRateBasis as RateBasisKey);
  const [silverBasis, setSilverBasis] = useState(settings.silverRateBasis as RateBasisKey);
  const [wastage, setWastage] = useState(String(settings.defaultWastagePercent));
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);
  const [rateFeedUrl, setRateFeedUrl] = useState(settings.rateFeedUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinStep, setPinStep] = useState<'idle' | 'enter' | 'confirm'>('idle');
  const [firstPin, setFirstPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const parsed = SettingsSchema.safeParse({
      ...settings,
      shopName,
      addressLines: address
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
      phone,
      taxId,
      taxLabel,
      taxPercent: numberOrZero(taxPercent),
      currency: currency.trim().toUpperCase(),
      locale: locale.trim(),
      weightUnit,
      goldRateBasis: goldBasis,
      silverRateBasis: silverBasis,
      defaultWastagePercent: numberOrZero(wastage),
      invoicePrefix: invoicePrefix.trim().toUpperCase() || 'INV',
      rateFeedUrl: rateFeedUrl.trim(),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(`${issue.path.join('.')}: ${issue.message}`);
      return;
    }
    setSaving(true);
    try {
      await update(parsed.data);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const onPin = useCallback(
    async (pin: string) => {
      if (pinStep === 'enter') {
        setFirstPin(pin);
        setPinStep('confirm');
        return;
      }
      if (pin === firstPin) {
        await setPin(pin);
        await refreshPin();
        setPinStep('idle');
        setPinError(null);
        Alert.alert('PIN set', 'GoldLedger will ask for it after a minute in the background.');
      } else {
        setPinError('PINs did not match. Start again.');
        setPinStep('enter');
      }
    },
    [pinStep, firstPin, refreshPin],
  );

  function removePin() {
    Alert.alert('Remove app PIN?', 'Anyone with the phone will be able to open the ledger.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await clearPin();
          await refreshPin();
        },
      },
    ]);
  }

  return (
    <Screen
      insideStack
      title="Shop settings"
      footer={
        <View style={styles.footer}>
          <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
          <Button title="Save" onPress={save} loading={saving} />
        </View>
      }>
      {error ? (
        <AppText variant="small" color="negative">
          {error}
        </AppText>
      ) : null}
      <Card title="Shop">
        <Field label="Shop name" value={shopName} onChangeText={setShopName} />
        <Field label="Address" value={address} onChangeText={setAddress} multiline hint="One line per row; printed on invoices" />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </Card>
      <Card title="Tax">
        <Field label="Tax label" value={taxLabel} onChangeText={setTaxLabel} placeholder="GST, VAT ..." />
        <NumberField label="Default tax rate" value={taxPercent} onChangeText={setTaxPercent} suffix="%" />
        <Field label="Tax registration number" value={taxId} onChangeText={setTaxId} autoCapitalize="characters" placeholder="GSTIN / VAT" />
      </Card>
      <Card title="Units & formats">
        <Field
          label="Currency (ISO 4217)"
          value={currency}
          onChangeText={setCurrency}
          autoCapitalize="characters"
          hint="INR, AED, USD ... Changing this does not convert existing amounts."
        />
        <Field
          label="Locale (BCP 47)"
          value={locale}
          onChangeText={setLocale}
          autoCapitalize="none"
          hint="en-IN, en-AE, en-US ... controls number and date formats"
        />
        <Chips
          label="Weight unit"
          options={WEIGHT_UNITS.map((u) => ({ value: u, label: WEIGHT_UNIT_LABEL[u] }))}
          value={weightUnit}
          onChange={setWeightUnit}
        />
        <Chips
          label="Gold quoted"
          options={RATE_KEYS.map((k) => ({ value: k, label: RATE_BASES[k].label }))}
          value={goldBasis}
          onChange={setGoldBasis}
        />
        <Chips
          label="Silver quoted"
          options={RATE_KEYS.map((k) => ({ value: k, label: RATE_BASES[k].label }))}
          value={silverBasis}
          onChange={setSilverBasis}
        />
      </Card>
      <Card title="Defaults">
        <NumberField label="Default wastage" value={wastage} onChangeText={setWastage} suffix="%" />
        <Field
          label="Invoice prefix"
          value={invoicePrefix}
          onChangeText={setInvoicePrefix}
          autoCapitalize="characters"
          hint="Numbers run INV-2026-0001, INV-2026-0002 ..."
        />
      </Card>
      <Card title="Rate feed">
        <Field
          label="Rate feed URL"
          value={rateFeedUrl}
          onChangeText={setRateFeedUrl}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://example.com/rates.json"
          hint="A goldledger.rates JSON document; see docs/INTEROPERABILITY.md"
        />
      </Card>
      <Card title="Security">
        {pinStep === 'idle' ? (
          <View style={styles.row}>
            <Button title={pinEnabled ? 'Change PIN' : 'Set app PIN'} variant="outline" icon="lock-outline" onPress={() => setPinStep('enter')} />
            {pinEnabled ? <Button title="Lock now" variant="secondary" onPress={lock} /> : null}
            {pinEnabled ? <Button title="Remove PIN" variant="danger" onPress={removePin} /> : null}
          </View>
        ) : (
          <>
            <PinPad key={pinStep} title={pinStep === 'enter' ? 'New PIN' : 'Confirm PIN'} error={pinError} onComplete={onPin} />
            <Button title="Cancel" variant="ghost" onPress={() => setPinStep('idle')} />
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
});
