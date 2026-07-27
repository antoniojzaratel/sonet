import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/colors';

interface Props {
  ratings: { score: number; artist_name: string; content_type: string }[];
}

const BAR_COLORS = [
  Colors.primary,
  '#3B82F6',
  Colors.secondary,
  Colors.accent,
  '#F59E0B',
];

function scoreColor(score: number): string {
  if (score >= 8) return Colors.success;
  if (score >= 6) return Colors.warning;
  return Colors.error;
}

export function MusicDashboard({ ratings }: Props) {
  if (ratings.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Sin datos aun</Text>
        <Text style={styles.emptyText}>
          Califica musica para ver tus estadisticas aqui
        </Text>
      </View>
    );
  }

  // Average score
  const avgScore = ratings.reduce((s, r) => s + r.score, 0) / ratings.length;

  // Score distribution (buckets 1-10)
  const buckets = Array.from({ length: 10 }, (_, i) => i + 1).map((score) => ({
    score,
    count: ratings.filter((r) => Math.floor(r.score) === score || (score === 10 && r.score === 10)).length,
  }));
  const maxBucket = Math.max(...buckets.map((b) => b.count), 1);

  // Top 5 artists by rating count
  const artistCount: Record<string, number> = {};
  ratings.forEach((r) => {
    if (r.artist_name) {
      artistCount[r.artist_name] = (artistCount[r.artist_name] || 0) + 1;
    }
  });
  const topArtists = Object.entries(artistCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const maxArtistCount = topArtists.length > 0 ? topArtists[0][1] : 1;

  // Content type breakdown
  const typeCount: Record<string, number> = {};
  ratings.forEach((r) => {
    const t = r.content_type || 'track';
    typeCount[t] = (typeCount[t] || 0) + 1;
  });
  const typeEntries = Object.entries(typeCount).sort(([, a], [, b]) => b - a);

  return (
    <View style={styles.container}>
      {/* Average score */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Puntuacion promedio</Text>
        <View style={styles.avgRow}>
          <Text style={[styles.avgScore, { color: scoreColor(avgScore) }]}>
            {avgScore.toFixed(1)}
          </Text>
          <Text style={styles.avgSub}>de 10.0</Text>
        </View>
      </View>

      {/* Score distribution */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Distribucion de scores</Text>
        <View style={styles.barChart}>
          {buckets.map((b) => {
            const barHeight = Math.max(4, (b.count / maxBucket) * 72);
            return (
              <View key={b.score} style={styles.barGroup}>
                <Text style={styles.barCount}>{b.count > 0 ? b.count : ''}</Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: b.count > 0 ? scoreColor(b.score) : '#2A2A2A',
                    },
                  ]}
                />
                <Text style={styles.barLabel}>{b.score}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Top artists */}
      {topArtists.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Artistas mas calificados</Text>
          {topArtists.map(([name, count], idx) => {
            const barWidth = (count / maxArtistCount) * 100;
            const color = BAR_COLORS[idx % BAR_COLORS.length];
            return (
              <View key={name} style={styles.artistRow}>
                <Text style={styles.artistName} numberOfLines={1}>
                  {name}
                </Text>
                <View style={styles.artistBarContainer}>
                  <View
                    style={[
                      styles.artistBar,
                      { width: `${barWidth}%` as any, backgroundColor: color },
                    ]}
                  />
                </View>
                <Text style={[styles.artistCount, { color }]}>{count}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Content type breakdown */}
      {typeEntries.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Por tipo de contenido</Text>
          {typeEntries.map(([type, count], idx) => {
            const color = BAR_COLORS[idx % BAR_COLORS.length];
            const pct = Math.round((count / ratings.length) * 100);
            return (
              <View key={type} style={styles.typeRow}>
                <Text style={styles.typeLabel}>{type}</Text>
                <View style={styles.typeBarContainer}>
                  <View
                    style={[
                      styles.typeBar,
                      { width: `${pct}%` as any, backgroundColor: color },
                    ]}
                  />
                </View>
                <Text style={styles.typeCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Average score
  avgRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  avgScore: {
    fontSize: 56,
    fontWeight: '900',
    lineHeight: 60,
  },
  avgSub: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
  },

  // Bar chart (score distribution)
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    gap: 3,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
  },
  barCount: {
    fontSize: 9,
    color: Colors.textMuted,
    height: 12,
    textAlign: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: 3,
  },
  barLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Artist bars
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 10,
  },
  artistName: {
    width: 90,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  artistBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#2A2A2A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  artistBar: {
    height: '100%',
    borderRadius: 3,
  },
  artistCount: {
    fontSize: 12,
    fontWeight: '700',
    width: 20,
    textAlign: 'right',
  },

  // Type breakdown
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 10,
  },
  typeLabel: {
    width: 80,
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  typeBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#2A2A2A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  typeBar: {
    height: '100%',
    borderRadius: 3,
  },
  typeCount: {
    fontSize: 12,
    color: Colors.textMuted,
    width: 20,
    textAlign: 'right',
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
});
