import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Gold, Radius, Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';
import { Chips } from './Chips';

export interface ChartPoint {
  at: string; // ISO timestamp
  value: number; // minor units in the display basis
}

export const RANGES = [
  { value: '1W', label: '1W', days: 7 },
  { value: '1M', label: '1M', days: 30 },
  { value: '3M', label: '3M', days: 91 },
  { value: '6M', label: '6M', days: 182 },
  { value: '1Y', label: '1Y', days: 365 },
] as const;
export type RangeKey = (typeof RANGES)[number]['value'];

interface RateChartProps {
  points: ChartPoint[];
  formatValue: (minor: number) => string;
  formatDate: (iso: string) => string;
  height?: number;
}

/**
 * A gold line chart with a tappable scrubber. Pure SVG, no chart library:
 * the data is small (one observation per rate entry) and the look needs to
 * match the rest of the app exactly.
 */
export function RateChart({ points, formatValue, formatDate, height = 180 }: RateChartProps) {
  const theme = useTheme();
  const [range, setRange] = useState<RangeKey>('3M');
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const visible = useMemo(() => {
    const days = RANGES.find((r) => r.value === range)?.days ?? 91;
    const sorted = [...points].sort((a, b) => a.at.localeCompare(b.at));
    // Window relative to the latest observation, so the chart stays useful when rates are entered irregularly.
    const latest = sorted.length ? new Date(sorted[sorted.length - 1].at).getTime() : 0;
    const cutoff = latest - days * 86_400_000;
    const inRange = sorted.filter((p) => new Date(p.at).getTime() >= cutoff);
    // Keep the last point before the window so the line enters from the left edge.
    const before = sorted.filter((p) => new Date(p.at).getTime() < cutoff).slice(-1);
    return [...before, ...inRange];
  }, [points, range]);

  const pad = { top: 28, bottom: 12, left: 8, right: 8 };
  const geometry = useMemo(() => {
    if (visible.length === 0 || width === 0) return null;
    const xs = visible.map((p) => new Date(p.at).getTime());
    const ys = visible.map((p) => p.value);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || Math.max(1, maxY * 0.02);
    const w = width - pad.left - pad.right;
    const h = height - pad.top - pad.bottom;
    const coords = visible.map((p, i) => ({
      x: pad.left + ((xs[i] - minX) / spanX) * w,
      y: pad.top + h - ((ys[i] - minY) / spanY) * h,
    }));
    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${(height - pad.bottom).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(height - pad.bottom).toFixed(1)} Z`;
    return { coords, line, area, minY, maxY };
  }, [visible, width, height, pad.left, pad.right, pad.top, pad.bottom]);

  const activeIndex = selected !== null && selected < visible.length ? selected : visible.length - 1;
  const active = visible[activeIndex];
  const activeCoord = geometry?.coords[activeIndex];

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  function scrubTo(x: number) {
    if (!geometry) return;
    let best = 0;
    let bestDist = Infinity;
    geometry.coords.forEach((c, i) => {
      const d = Math.abs(c.x - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setSelected(best);
  }

  const change = visible.length >= 2 ? visible[visible.length - 1].value - visible[0].value : 0;
  const changePct = visible.length >= 2 && visible[0].value ? (change / visible[0].value) * 100 : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View>
          <AppText variant="caption">{active ? formatDate(active.at) : 'No data in range'}</AppText>
          <AppText variant="title" style={{ color: Gold.bright }}>
            {active ? formatValue(active.value) : '—'}
          </AppText>
        </View>
        {visible.length >= 2 ? (
          <View style={[styles.delta, { backgroundColor: change >= 0 ? theme.positiveSoft : theme.negativeSoft }]}>
            <AppText variant="small" color={change >= 0 ? 'positive' : 'negative'} style={{ fontWeight: '600' }}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
            </AppText>
          </View>
        ) : null}
      </View>
      <Pressable
        onLayout={onLayout}
        onPress={(e) => scrubTo(e.nativeEvent.locationX)}
        onPressOut={() => setSelected(null)}
        accessibilityLabel="Rate history chart"
        style={{ height }}>
        {geometry && width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="line" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={Gold.deep} />
                <Stop offset="0.5" stopColor={Gold.bright} />
                <Stop offset="1" stopColor={Gold.base} />
              </LinearGradient>
              <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={Gold.base} stopOpacity="0.28" />
                <Stop offset="1" stopColor={Gold.base} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Path d={geometry.area} fill="url(#fill)" />
            <Path d={geometry.line} stroke="url(#line)" strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {activeCoord ? (
              <>
                <Line
                  x1={activeCoord.x}
                  x2={activeCoord.x}
                  y1={pad.top - 8}
                  y2={height - pad.bottom}
                  stroke={theme.borderStrong}
                  strokeDasharray="3 4"
                />
                <Circle cx={activeCoord.x} cy={activeCoord.y} r={7} fill={Gold.base} opacity={0.25} />
                <Circle cx={activeCoord.x} cy={activeCoord.y} r={4} fill={Gold.bright} stroke={theme.background} strokeWidth={1.5} />
              </>
            ) : null}
          </Svg>
        ) : (
          <View style={[styles.empty, { borderColor: theme.border }]}>
            <AppText variant="small" color="textSecondary">
              Enter a few rates to see the trend.
            </AppText>
          </View>
        )}
      </Pressable>
      <Chips options={RANGES.map((r) => ({ value: r.value, label: r.label }))} value={range} onChange={setRange} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  delta: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.pill },
  empty: { flex: 1, borderWidth: 1, borderStyle: 'dashed', borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
