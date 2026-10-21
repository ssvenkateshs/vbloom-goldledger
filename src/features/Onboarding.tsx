import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, ArrowButton, Button, Field, GoldGradient, Icon, LogoMark, Wordmark, type IconName } from '@/components';
import { settingsRepo } from '@/data';
import { SettingsSchema, WEIGHT_UNITS, WEIGHT_UNIT_LABEL, type WeightUnit } from '@/domain';
import { setPin } from '@/services/pin';
import { useAppState, useSettings } from '@/state';
import { Gold, MaxContentWidth, Radius, Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

import { PinPad } from './PinPad';

const SLIDES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'diamond-stone',
    title: 'Every piece,\nevery hallmark',
    body: 'Stock with gross, net and fine weight, purity, HUID and making charges. Priced live at today’s rate.',
  },
  {
    icon: 'chart-line',
    title: 'Rates you control',
    body: 'Enter the day’s rate in the basis you quote in, or pull it from a feed you publish. Every invoice records the rate it used.',
  },
  {
    icon: 'book-open-page-variant',
    title: 'A ledger that\ntravels with you',
    body: 'Sales, purchases, old-gold exchange, orders and payments. Backups in an open format, CSV for spreadsheets, PDF invoices.',
  },
];

const CURRENCIES = ['INR', 'AED', 'USD', 'GBP', 'SAR', 'SGD', 'EUR'];

type Step = 'slides' | 'setup' | 'pin' | 'pin-confirm';

export function Onboarding() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { settings, update } = useSettings();
  const { completeOnboarding, refreshPin } = useAppState();
  const [step, setStep] = useState<Step>('slides');
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const width = Math.min(Dimensions.get('window').width, MaxContentWidth);

  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState(settings.currency);
  const [unit, setUnit] = useState<WeightUnit>(settings.weightUnit);
  const [firstPin, setFirstPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinAttempt, setPinAttempt] = useState(0);

  const onViewable = useCallback(({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
    const first = viewableItems[0];
    if (first?.index !== null && first?.index !== undefined) setIndex(first.index);
  }, []);

  function next() {
    if (index < SLIDES.length - 1) listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    else setStep('setup');
  }

  async function saveSetup() {
    const parsed = SettingsSchema.safeParse({
      ...settings,
      shopName: shopName.trim() || settings.shopName,
      phone: phone.trim(),
      currency,
      weightUnit: unit,
    });
    if (!parsed.success) return;
    await settingsRepo.save(db, parsed.data);
    await update(parsed.data);
    setStep('pin');
  }

  const finish = useCallback(async () => {
    await refreshPin();
    await completeOnboarding();
  }, [refreshPin, completeOnboarding]);

  const onPin = useCallback(
    async (pin: string) => {
      if (step === 'pin') {
        setFirstPin(pin);
        setPinError(null);
        setStep('pin-confirm');
        return;
      }
      if (pin === firstPin) {
        await setPin(pin);
        await finish();
      } else {
        setPinError('PINs did not match. Start again.');
        setFirstPin('');
        setPinAttempt((a) => a + 1);
        setStep('pin');
      }
    },
    [step, firstPin, finish],
  );

  if (step === 'pin' || step === 'pin-confirm') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.column, { justifyContent: 'center' }]}>
          <PinPad
            key={`${step}-${pinAttempt}`}
            title={step === 'pin' ? 'Set an app PIN' : 'Confirm your PIN'}
            subtitle="Protects the ledger if the phone is shared. You can change it later in Settings."
            error={pinError}
            onComplete={onPin}
          />
          <Button title="Skip for now" variant="ghost" onPress={finish} />
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'setup') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={styles.column}>
          <View style={{ paddingVertical: Spacing.lg }}>
            <Wordmark size={18} subtitle="Shop setup" />
          </View>
          <AppText variant="display" style={{ color: Gold.bright }}>
            Your shop
          </AppText>
          <View style={[styles.underline, { backgroundColor: Gold.base }]} />
          <GoldGradient style={styles.formCard}>
            <AppText variant="small" style={{ color: '#4A3A0E' }}>
              Printed on invoices. Everything can be changed later.
            </AppText>
            <GoldField label="Shop name" value={shopName} onChangeText={setShopName} placeholder="e.g. Lakshmi Jewellers" />
            <GoldField label="Phone" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
            <AppText variant="label" style={{ color: '#4A3A0E' }}>
              Currency
            </AppText>
            <View style={styles.chipRow}>
              {CURRENCIES.map((c) => (
                <Pressable key={c} onPress={() => setCurrency(c)} style={[styles.goldChip, currency === c && styles.goldChipOn]}>
                  <AppText variant="small" style={{ color: currency === c ? Gold.bright : '#3A2D0C', fontWeight: '700' }}>
                    {c}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <AppText variant="label" style={{ color: '#4A3A0E' }}>
              Weight unit
            </AppText>
            <View style={styles.chipRow}>
              {WEIGHT_UNITS.filter((u) => u !== 'mg' && u !== 'ct' && u !== 'ratti').map((u) => (
                <Pressable key={u} onPress={() => setUnit(u)} style={[styles.goldChip, unit === u && styles.goldChipOn]}>
                  <AppText variant="small" style={{ color: unit === u ? Gold.bright : '#3A2D0C', fontWeight: '700' }}>
                    {WEIGHT_UNIT_LABEL[u]}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </GoldGradient>
          <View style={{ flex: 1 }} />
          <ArrowButton label="Continue" onPress={saveSetup} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={styles.topRow}>
          <LogoMark size={40} />
          <Pressable onPress={() => setStep('setup')} accessibilityRole="button">
            <AppText variant="small" color="textSecondary">
              Skip
            </AppText>
          </Pressable>
        </View>
        <FlatList
          ref={listRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(s) => s.title}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <View style={[styles.emblem, { borderColor: theme.borderStrong, backgroundColor: theme.surface }]}>
                <Icon name={item.icon} size={56} color={Gold.bright} />
              </View>
              <AppText variant="display" style={{ textAlign: 'center', color: Gold.bright }}>
                {item.title}
              </AppText>
              <AppText variant="body" color="textSecondary" style={{ textAlign: 'center', maxWidth: 340 }}>
                {item.body}
              </AppText>
            </View>
          )}
        />
        <View style={styles.bottomRow}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: i === index ? Gold.base : theme.border }]} />
            ))}
          </View>
          <ArrowButton label={index === SLIDES.length - 1 ? 'Get started' : 'Next'} onPress={next} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function GoldField(props: React.ComponentProps<typeof Field>) {
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="label" style={{ color: '#4A3A0E' }}>
        {props.label}
      </AppText>
      <Field {...props} label="" placeholderTextColor="#7A6420" style={{ color: '#1A1507', fontSize: 18, fontWeight: '600' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.xl, gap: Spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slide: { alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, paddingHorizontal: Spacing.xl },
  emblem: { width: 128, height: 128, borderRadius: 64, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dots: { flexDirection: 'row', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  underline: { width: 48, height: 2, marginBottom: Spacing.md },
  formCard: { padding: Spacing.xl, gap: Spacing.md, borderRadius: Radius.xl },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  goldChip: { paddingVertical: 6, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, borderWidth: 1, borderColor: '#7A6420' },
  goldChipOn: { backgroundColor: '#1A1507', borderColor: '#1A1507' },
});
