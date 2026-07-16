import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Colors, Spacing } from '@/constants/colors';
import type { MatchResult } from '@/lib/ai/matchEngine';

interface Props {
  match: MatchResult;
  size?: number;
}

const AXES = [
  { label: 'Vibe', key: 'audio_score' },
  { label: 'Géneros', key: 'genre_score' },
  { label: 'Mood', key: 'behavior_score' },
  { label: 'BPM', key: 'audio_score' },    // reuse as approximation
  { label: 'Overall', key: 'score' },
];

export function CompatibilityRadar({ match, size = 200 }: Props) {
  const center = size / 2;
  const maxRadius = center * 0.8;
  const n = AXES.length;

  const getPoint = (value: number, index: number): { x: number; y: number } => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const r = (value / 100) * maxRadius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const getLabelPoint = (index: number): { x: number; y: number } => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const r = maxRadius + 22;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const getAxisEnd = (index: number): { x: number; y: number } => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    return { x: center + maxRadius * Math.cos(angle), y: center + maxRadius * Math.sin(angle) };
  };

  const values = AXES.map((a) => (match as any)[a.key] as number);
  const points = values.map((v, i) => getPoint(v, i));
  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Web / guide circles at 25%, 50%, 75%, 100%
  const circles = [0.25, 0.5, 0.75, 1.0].map((pct) => ({
    r: maxRadius * pct,
    dashed: pct < 1,
  }));

  return (
    <View style={styles.container}>
      <Svg width={size + 60} height={size + 60} viewBox={`-30 -30 ${size + 60} ${size + 60}`}>
        {/* Guide circles */}
        {circles.map(({ r, dashed }, i) => (
          <Circle
            key={i}
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={Colors.border}
            strokeWidth={1}
            strokeDasharray={dashed ? '4,4' : undefined}
          />
        ))}

        {/* Axis lines */}
        {AXES.map((_, i) => {
          const end = getAxisEnd(i);
          return (
            <Line
              key={i}
              x1={center} y1={center}
              x2={end.x} y2={end.y}
              stroke={Colors.borderLight}
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon */}
        <Polygon
          points={polyPoints}
          fill={`${Colors.primary}30`}
          stroke={Colors.primary}
          strokeWidth={2}
        />

        {/* Data points */}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={Colors.primary} />
        ))}

        {/* Labels */}
        {AXES.map((a, i) => {
          const lp = getLabelPoint(i);
          return (
            <SvgText
              key={i}
              x={lp.x}
              y={lp.y}
              fontSize={10}
              fill={Colors.textSecondary}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {a.label}
            </SvgText>
          );
        })}
      </Svg>

      <View style={styles.scores}>
        <ScorePill label="Vibe" value={match.audio_score} color={Colors.primary} />
        <ScorePill label="Géneros" value={match.genre_score} color={Colors.secondary} />
        <ScorePill label="Mood" value={match.behavior_score} color={Colors.accent} />
      </View>
    </View>
  );
}

function ScorePill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillValue, { color }]}>{value}%</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.md },
  scores: { flexDirection: 'row', gap: Spacing.sm },
  pill: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  pillValue: { fontSize: 16, fontWeight: '900' },
  pillLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
});
