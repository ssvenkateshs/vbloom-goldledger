import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';

interface ScreenProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  /** Rendered at the right of the title row (e.g. an action button). */
  action?: ReactNode;
  /** Sticky content below the title row (search, filters). */
  toolbar?: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Inside a Stack with a native header the safe-area top is already handled. */
  insideStack?: boolean;
  footer?: ReactNode;
}

export function Screen({ title, subtitle, action, toolbar, scroll = true, refreshing, onRefresh, insideStack, footer, children }: ScreenProps) {
  const theme = useTheme();
  const header = title ? (
    <View style={styles.titleRow}>
      <View style={{ flex: 1 }}>
        <AppText variant="heading">{title}</AppText>
        {subtitle ? (
          <AppText variant="small" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action}
    </View>
  ) : null;

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={theme.accent} /> : undefined}>
      {header}
      {toolbar}
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { flex: 1 }]}>
      {header}
      {toolbar}
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={insideStack ? ['left', 'right'] : ['top', 'left', 'right']} style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.column}>
        {body}
        {footer ? <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl * 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  footer: { padding: Spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
