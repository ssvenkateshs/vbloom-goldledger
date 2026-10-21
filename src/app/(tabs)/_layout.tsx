import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Icon, type IconName } from '@/components';
import { Gold, MaxContentWidth, Radius, Spacing, TabBarHeight } from '@/theme';
import { useTheme } from '@/theme/use-theme';

const TABS: { name: string; href: '/' | '/stock' | '/ledger' | '/people' | '/more'; label: string; icon: IconName }[] = [
  { name: 'index', href: '/', label: 'Today', icon: 'white-balance-sunny' },
  { name: 'stock', href: '/stock', label: 'Stock', icon: 'diamond-stone' },
  { name: 'ledger', href: '/ledger', label: 'Ledger', icon: 'book-open-page-variant' },
  { name: 'people', href: '/people', label: 'People', icon: 'account-group' },
  { name: 'more', href: '/more', label: 'More', icon: 'dots-horizontal-circle' },
];

/** Headless tabs with the gold-rimmed pill bar from the reference design, identical on every platform. */
export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs>
      <TabSlot />
      <TabList asChild>
        <View style={[styles.barWrap, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <View style={[styles.bar, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
            {TABS.map((t) => (
              <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
                <TabButton label={t.label} icon={t.icon} />
              </TabTrigger>
            ))}
          </View>
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({ label, icon, isFocused, ref: _ref, ...props }: TabTriggerSlotProps & { label: string; icon: IconName; ref?: unknown }) {
  const theme = useTheme();
  const color = isFocused ? Gold.bright : theme.textTertiary;
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}>
      <Icon name={icon} size={22} color={color} />
      <AppText variant="caption" style={{ color, fontWeight: isFocused ? '700' : '500' }}>
        {label}
      </AppText>
      <View style={[styles.dot, { backgroundColor: isFocused ? Gold.base : 'transparent' }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: Spacing.lg, pointerEvents: 'box-none' },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MaxContentWidth,
    height: TabBarHeight,
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: Spacing.sm },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
