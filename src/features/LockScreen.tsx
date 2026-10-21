import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoMark } from '@/components';
import { verifyPin } from '@/services/pin';
import { useAppState } from '@/state';
import { Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

import { PinPad } from './PinPad';

export function LockScreen() {
  const theme = useTheme();
  const { unlock } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const onComplete = useCallback(
    async (pin: string) => {
      if (await verifyPin(pin)) {
        setError(null);
        unlock();
      } else {
        setError('Wrong PIN. Try again.');
        setAttempt((a) => a + 1);
      }
    },
    [unlock],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.logo}>
        <LogoMark size={72} />
      </View>
      <PinPad key={attempt} title="Enter your PIN" subtitle="GoldLedger is locked" error={error} onComplete={onComplete} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.xl },
  logo: { marginBottom: Spacing.lg },
});
