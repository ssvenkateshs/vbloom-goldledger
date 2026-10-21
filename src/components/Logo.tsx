import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { Gold, Spacing } from '@/theme';

import { AppText } from './AppText';

/**
 * Brand mark: three concentric arcs opening to the top-right (a ledger's open
 * page meets a ring), with a single point of fine gold at the centre.
 */
export function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="GoldLedger">
      <Defs>
        <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={Gold.bright} />
          <Stop offset="0.55" stopColor={Gold.base} />
          <Stop offset="1" stopColor={Gold.deep} />
        </LinearGradient>
      </Defs>
      <Path d="M 78 22 A 40 40 0 1 0 78 78" stroke="url(#g)" strokeWidth="5" fill="none" strokeLinecap="round" />
      <Path d="M 72 32 A 28 28 0 1 0 72 68" stroke="url(#g)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <Path d="M 66 42 A 16 16 0 1 0 66 58" stroke="url(#g)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Circle cx="50" cy="50" r="4.5" fill="url(#g)" />
    </Svg>
  );
}

export function Wordmark({ size = 20, subtitle }: { size?: number; subtitle?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <LogoMark size={size * 2} />
      <View>
        <AppText style={{ fontSize: size, lineHeight: size * 1.2, fontWeight: '700', letterSpacing: 0.5, color: Gold.bright }}>
          Gold<AppText style={{ fontSize: size, fontWeight: '300', color: Gold.bright }}>Ledger</AppText>
        </AppText>
        {subtitle ? (
          <AppText variant="caption" style={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
