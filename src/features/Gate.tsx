import type { PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components';
import { useAppState, useSettings } from '@/state';
import { Gold, Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

import { LockScreen } from './LockScreen';
import { Onboarding } from './Onboarding';

/** Decides what the person sees first: a loading mark, onboarding, the PIN lock, or the app. */
export function Gate({ children }: PropsWithChildren) {
  const theme = useTheme();
  const { ready, onboarded, locked } = useAppState();
  const { loaded } = useSettings();
  if (!ready || !loaded) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <LogoMark size={80} />
        <ActivityIndicator color={Gold.base} />
      </View>
    );
  }
  if (!onboarded) return <Onboarding />;
  if (locked) return <LockScreen />;
  return <>{children}</>;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl } });
