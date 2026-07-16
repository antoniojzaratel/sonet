import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { VictoryPie, VictoryBar, VictoryChart, VictoryTheme, VictoryAxis } from 'victory-native';
import { useAuthStore } from '@/stores/authStore';
import { fetchTopArtists, extractGenresFromArtists } from '@/lib/spotify';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { genreToColor } from '@/lib/utils';
import type { Rating } from '@/types';

interface Props {
  userId: string;
  ratings: Rating[];
}

export function MusicDashboard({ userId, ratings }: Props) {
  const { spotifyToken } = useAuthStore();
  const [genres, setGenres] = useState<{ x: string; y: number; fill: string }[]>([]);
  const [loadingSpotify, setLoadingSpotify] = useState(false);

  useEffect(() => {
    if (spotifyToken) loadSpotifyData();
    else buildGenresFromRatings();
  }, [spotifyToken, ratings]);

  const loadSpotifyData = async () => {
    if (!spotifyToken) return;
    setLoadingSpotify(true);
    try {
      const result = await fetchTopArtists(spotifyToken, 'medium_term', 30);
      const items = result?.items ?? [];
      const genreCount = extractGenresFromArtists(items);
      const sorted = Object.entries(genreCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6);
      const total = sorted.reduce((s, [, v]) => s + v, 0);
      setGenres(
        sorted.map(([genre, count], i) => ({
          x: genre,
          y: Math.round((count / total) * 100),
          fill: genreToColor(i),
        })),
      );
    } catch {}
    setLoadingSpotify(false);
  };

  const buildGenresFromRatings = () => {
    if (ratings.length === 0) return;
    const artistCount: Record<string, number> = {};
    ratings.forEach((r) => {
      artistCount[r.artist_name] = (artistCount[r.artist_name] || 0) + 1;
    });
    const sorted = Object.entries(artistCount).sort(([, a], [, b]) => b - a).slice(0, 6);
    const total = sorted.reduce((s, [, v]) => s + v, 0);
    setGenres(
      sorted.map(([name, count], i) => ({
        x: name,
        y: Math.round((count / total) * 100),
        fill: genreToColor(i),
      })),
    );
  };

  const ratingsByType = Object.entries(
    ratings.reduce((acc, r) => {
      acc[r.content_type] = (acc[r.content_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  ).map(([type, count]) => ({ x: type, y: count }));

  if (loadingSpotify) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.loadingText}>Sincronizando con Spotify...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {genres.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎸 Géneros Favoritos</Text>
          <View style={styles.pieContainer}>
            <VictoryPie
              data={genres}
              width={280}
              height={220}
              innerRadius={60}
              padding={20}
              colorScale={genres.map((g) => g.fill)}
              labels={({ datum }) => `${datum.x}\n${datum.y}%`}
              style={{
                labels: { fill: Colors.textSecondary, fontSize: 9, fontWeight: '600' },
              }}
            />
          </View>
          <View style={styles.legend}>
            {genres.map((g) => (
              <View key={g.x} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: g.fill }]} />
                <Text style={styles.legendText} numberOfLines={1}>{g.x}</Text>
                <Text style={[styles.legendPct, { color: g.fill }]}>{g.y}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {ratings.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Rating Promedio</Text>
          <View style={styles.avgContainer}>
            <Text style={styles.avgScore}>
              {(ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1)}
            </Text>
            <Text style={styles.avgLabel}>de 10.0</Text>
          </View>
          <View style={styles.scoreBar}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
              const count = ratings.filter((r) => Math.floor(r.score) === score).length;
              const max = Math.max(...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                (s) => ratings.filter((r) => Math.floor(r.score) === s).length,
              ), 1);
              return (
                <View key={score} style={styles.barGroup}>
                  <View style={[styles.bar, { height: Math.max(4, (count / max) * 60), backgroundColor: genreToColor(score) }]} />
                  <Text style={styles.barLabel}>{score}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {ratingsByType.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📀 Por Tipo</Text>
          {ratingsByType.map((item) => (
            <View key={item.x} style={styles.typeRow}>
              <Text style={styles.typeLabel}>{TYPE_EMOJI[item.x] || '🎵'} {item.x}</Text>
              <View style={styles.typeBarContainer}>
                <View style={[styles.typeBar, { width: `${(item.y / ratings.length) * 100}%` as any }]} />
              </View>
              <Text style={styles.typeCount}>{item.y}</Text>
            </View>
          ))}
        </View>
      )}

      {ratings.length === 0 && genres.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>Sin datos aún</Text>
          <Text style={styles.emptyText}>
            Conecta Spotify o califica música para ver tus estadísticas
          </Text>
        </View>
      )}
    </View>
  );
}

const TYPE_EMOJI: Record<string, string> = {
  song: '🎵',
  album: '💿',
  podcast: '🎙️',
  single: '🎶',
  concert: '🎤',
  music_video: '🎬',
};

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  pieContainer: { alignItems: 'center' },
  legend: { gap: 6, marginTop: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legendText: { flex: 1, color: Colors.textSecondary, fontSize: 13 },
  legendPct: { fontSize: 13, fontWeight: '700' },

  avgContainer: { alignItems: 'center', marginBottom: Spacing.md },
  avgScore: { fontSize: 56, fontWeight: '900', color: Colors.primary },
  avgLabel: { color: Colors.textMuted, fontSize: 13, marginTop: -4 },

  scoreBar: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 80 },
  barGroup: { alignItems: 'center', gap: 4, flex: 1 },
  bar: { width: '80%', borderRadius: 3, minHeight: 4 },
  barLabel: { color: Colors.textMuted, fontSize: 9 },

  typeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 8 },
  typeLabel: { color: Colors.textSecondary, fontSize: 13, width: 100 },
  typeBarContainer: { flex: 1, height: 6, backgroundColor: Colors.background, borderRadius: 3, overflow: 'hidden' },
  typeBar: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  typeCount: { color: Colors.textMuted, fontSize: 12, width: 24, textAlign: 'right' },

  loading: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  loadingText: { color: Colors.textSecondary, fontSize: 13 },
  empty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptyText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
});
