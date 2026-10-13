import Ionicons from '@expo/vector-icons/Ionicons';
import type { StatsPoint } from '@sionmarket/contracts';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';

// Dashboard pieces shared by the restaurant and admin panels.

/** One number with its change against the previous period. */
export function StatCard({
  label,
  value,
  current,
  previous,
  hint,
  style,
}: {
  label: string;
  value: string;
  /** Raw values to compute the change; omit both to hide it. */
  current?: number;
  previous?: number;
  hint?: string;
  style?: object;
}) {
  let delta: { text: string; up: boolean } | null = null;
  if (current !== undefined && previous !== undefined) {
    if (previous === 0) delta = current > 0 ? { text: 'Nuevo', up: true } : null;
    else {
      const pct = Math.round(((current - previous) / previous) * 100);
      delta = { text: `${pct > 0 ? '+' : ''}${pct}%`, up: pct >= 0 };
    }
  }
  return (
    <View style={[statStyles.tile, style]}>
      <Text variant="caption">{label}</Text>
      <Text variant="title" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {delta ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name={delta.up ? 'trending-up' : 'trending-down'} size={14} color={delta.up ? Colors.success : Colors.danger} />
          <Text variant="caption" style={{ color: delta.up ? Colors.success : Colors.danger }}>
            {delta.text}
          </Text>
        </View>
      ) : null}
      {hint ? <Text variant="caption">{hint}</Text> : null}
    </View>
  );
}

/** Grid of StatCards, two per row on a phone and four on a wide screen; cards in a row share one height. */
export function StatGrid({ children, wide }: { children: React.ReactNode[]; wide: boolean }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {children.map((child, i) => (
        <View key={i} style={{ flexBasis: wide ? '23%' : '47%', flexGrow: 1 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

const CHART_HEIGHT = 140;

/**
 * Bars for one measure over time. Tapping (or hovering on the web) a bar shows its value in
 * the readout above; without a selection it shows the busiest bar.
 */
export function BarChart({ points, format, title }: { points: StatsPoint[]; format: (p: StatsPoint) => string; title: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.salesCents));
  const peak = points.reduce((best, p, i) => (p.salesCents > (points[best]?.salesCents ?? 0) ? i : best), 0);
  const shown = selected ?? peak;
  const empty = points.every((p) => p.orders === 0);
  // Label every bar when there are few, otherwise about six evenly spaced.
  const every = points.length <= 8 ? 1 : Math.ceil(points.length / 6);

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text variant="heading" style={{ flex: 1 }}>
          {title}
        </Text>
        {!empty && points[shown] ? (
          <Text variant="caption">
            <Text variant="bodyStrong">{points[shown]!.label}</Text> · {format(points[shown]!)}
          </Text>
        ) : null}
      </View>
      {empty ? (
        <View style={[styles.plot, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text variant="caption">Todavía no hay pedidos en este periodo.</Text>
        </View>
      ) : (
        <View style={styles.plot} accessibilityRole="image" accessibilityLabel={`${title}: ${points.map((p) => `${p.label} ${format(p)}`).join(', ')}`}>
          {points.map((p, i) => (
            <Pressable
              key={p.label + i}
              style={styles.slot}
              onPress={() => setSelected(i === selected ? null : i)}
              onHoverIn={() => setSelected(i)}
              onHoverOut={() => setSelected(null)}>
              <View
                style={[
                  styles.bar,
                  {
                    height: p.salesCents ? Math.max(4, (p.salesCents / max) * CHART_HEIGHT) : 0,
                    backgroundColor: i === shown ? Colors.orangeDeep : Colors.orange,
                    opacity: selected === null || i === selected ? 1 : 0.55,
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.axis} />
      <View style={{ flexDirection: 'row' }}>
        {points.map((p, i) => (
          // Labels are wider than a bar's slot; they overflow it, centred under their bar.
          <View key={p.label + i} style={{ flex: 1, alignItems: 'center', overflow: 'visible' }}>
            {i % every === 0 ? (
              <Text variant="caption" style={styles.tick} numberOfLines={1}>
                {p.label}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Ranked list with a proportional bar behind each value (top dishes, top restaurants). */
export function RankList({ rows, empty }: { rows: { key: string; label: string; detail: string; value: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <Text variant="caption">{empty}</Text>;
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, i) => (
        <View key={r.key} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Text variant="bodyStrong" style={{ width: 18, color: Colors.textMuted }}>
              {i + 1}
            </Text>
            <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
              {r.label}
            </Text>
            <Text variant="caption">{r.detail}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(r.value / max) * 100}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export const statStyles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.line, padding: 16, gap: 12 },
  /** A card inside StatGrid: fills its cell so every card in a row is as tall as the tallest. */
  tile: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.line, padding: 16, gap: 6, flex: 1 },
});

const styles = StyleSheet.create({
  card: statStyles.card,
  plot: { height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end' },
  slot: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 1 },
  bar: { width: '80%', maxWidth: 44, minWidth: 2, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: { height: 1, backgroundColor: Colors.line, marginTop: -12 },
  tick: { width: 44, minWidth: 44, flexShrink: 0, fontSize: 11, textAlign: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: Colors.background, marginLeft: 26 },
  fill: { height: 6, borderRadius: 3, backgroundColor: Colors.orange },
});
