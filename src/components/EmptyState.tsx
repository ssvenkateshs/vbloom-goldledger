import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/theme';

import { AppText } from './AppText';

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.wrap}>
      <AppText variant="title" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {hint ? (
        <AppText variant="small" color="textSecondary" style={{ textAlign: 'center' }}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: Spacing.xxl, alignItems: 'center', gap: Spacing.sm },
});
