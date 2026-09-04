import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { CoverImage } from '@/components/CoverImage';
import { syncListeningStats, fetchInAppActivity, RANGE_LABEL, type StatsRange, type RangeStats, type InAppActivity } from '@/lib/spotifyStats';
import { formatNumber } from '@/lib/utils';
import { computeArchetype, type Archetype } from '@/lib/archetype';
import { DEMO_USER_ID, DEMO_USER_VECTOR } from '@/lib/demoContent';
import type { MusicVector } from '@/lib/ai/tasteVector';

interface Props {
  userId: string;
  spotifyToken: string | null;
}

const GENRE_CATEGORY_TO_VECTOR_KEY: Record<string, keyof MusicVector> = {
  Corridos: 'genre_latin',
  Rock: 'genre_rock',
  'Hip-Hop/Rap': 'genre_hip_hop',
  Pop: 'genre_pop',
};

/**
 * computeArchetype() reads a full 22-dim MusicVector, but RangeStats only
 * carries the 0-100 audioDna scale plus category-labeled genres (a
 * different taxonomy — "Corridos"/"Rock"/"Hip-Hop/Rap"/"Pop"/"Otros" from
 * mapGenresToCategories, not the vector's genre_* fields). This adapts what
 * a real Spotify sync actually gives us into enough of a vector for a
 * reasonable archetype read — an approximation, not the full vector,
 * consistent with archetype.ts being an explanatory layer, not the core
 * matching math.
 */
function rangeStatsToVector(stats: RangeStats): MusicVector {
  const genreOf = (key: keyof MusicVector) => {
    const cat = Object.entries(GENRE_CATEGORY_TO_VECTOR_KEY).find(([, v]) => v === key)?.[0];
    const found = cat && stats.genres.find((g) => g.label === cat);
    return found ? found.value / 100 : 0;
  };
  return {
    energy: stats.audioDna.energy / 100,
    danceability: stats.audioDna.danceability / 100,
    valence: stats.audioDna.valence / 100,
    acousticness: 0.3,
    instrumentalness: 0.1,
    speechiness: 0.1,
    tempo_norm: 0.5,
    loudness_norm: 0.5,
    liveness: 0.2,
    genre_pop: genreOf('genre_pop'),
    genre_rock: genreOf('genre_rock'),
    genre_hip_hop: genreOf('genre_hip_hop'),
    genre_electronic: 0,
    genre_latin: genreOf('genre_latin'),
    genre_rnb: 0,
    genre_jazz: 0,
    genre_classical: 0,
    genre_other: 0,
    avg_rating_norm: 0.6,
    bpm_preference: 0.5,
    vocal_preference: 0.8,
    mood_index: (stats.audioDna.energy + stats.audioDna.valence) / 200,
    diversity: 0.3,
  };
}

function ArchetypeHero({ archetype }: { archetype: Archetype }) {
  return (
    <View style={styles.archetypeHero}>
      <View style={styles.archetypeIconWrap}>
        <Ionicons name="sparkles" size={26} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.archetypeLabel}>Tu arquetipo musical</Text>
        <Text style={styles.archetypeName}>{archetype.name}</Text>
        <Text style={styles.archetypeDescription}>{archetype.description}</Text>
      </View>
    </View>
  );
}

const RANGES: StatsRange[] = ['short_term', 'medium_term', 'long_term'];

const DNA_LABELS: { key: keyof RangeStats['audioDna']; label: string; max: number }[] = [
  { key: 'energy', label: 'Energía', max: 100 },
  { key: 'danceability', label: 'Bailabilidad', max: 100 },
  { key: 'valence', label: 'Positividad', max: 100 },
];

export function ListeningStats({ userId, spotifyToken }: Props) {
  const [range, setRange] = useState<StatsRange>('medium_term');
  const [statsByRange, setStatsByRange] = useState<Record<StatsRange, RangeStats> | null>(null);
  const [activity, setActivity] = useState<InAppActivity | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(() => {
    fetchInAppActivity(userId).then(setActivity);
  }, [userId]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const handleSync = async () => {
    if (!spotifyToken) return;
    setSyncing(true);
    setError(null);
    try {
      const stats = await syncListeningStats(userId, spotifyToken);
      setStatsByRange(stats);
      loadActivity();
    } catch {
      setError('No se pudo sincronizar. Intenta de nuevo.');
    }
    setSyncing(false);
  };

  // Demo account: show real, derived stats immediately — no live Spotify
  // connection required for the demo to look complete. Audio DNA + genre
  // breakdown come straight from DEMO_USER_VECTOR (a real, hand-built
  // vector matching the demo bio, not random numbers); top artists/tracks
  // are intentionally left out here since the Top 10 tab already covers
  // "top content" from DEMO_RATINGS — this section's job is taste shape,
  // not a duplicate list.
  if (userId === DEMO_USER_ID) {
    const archetype = computeArchetype(DEMO_USER_VECTOR);
    const genres = [
      { label: 'Regional/Corridos', value: Math.round(DEMO_USER_VECTOR.genre_latin * 100), color: Colors.secondary },
      { label: 'Rock', value: Math.round(DEMO_USER_VECTOR.genre_rock * 100), color: Colors.primary },
      { label: 'Pop', value: Math.round(DEMO_USER_VECTOR.genre_pop * 100), color: Colors.accent },
    ].filter((g) => g.value > 0);

    return (
      <View style={{ gap: Spacing.sm }}>
        <ArchetypeHero archetype={archetype} />
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Géneros</Text>
          {genres.map((g) => (
            <View key={g.label} style={styles.genreRow}>
              <Text style={styles.genreLabel}>{g.label}</Text>
              <View style={styles.genreBarTrack}>
                <View style={[styles.genreBarFill, { width: `${g.value}%` as any, backgroundColor: g.color }]} />
              </View>
              <Text style={styles.genrePct}>{g.value}%</Text>
            </View>
          ))}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tu ADN musical</Text>
          {DNA_LABELS.map(({ key, label }) => {
            const raw = key === 'energy' ? DEMO_USER_VECTOR.energy : key === 'danceability' ? DEMO_USER_VECTOR.danceability : DEMO_USER_VECTOR.valence;
            const value = Math.round(raw * 100);
            return (
              <View key={key} style={styles.dnaRow}>
                <Text style={styles.dnaLabel}>{label}</Text>
                <View style={styles.dnaTrack}>
                  <View style={[styles.dnaFill, { width: `${value}%` as any }]} />
                </View>
                <Text style={styles.dnaValue}>{value}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  if (!spotifyToken) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tu Spotify</Text>
        <Text style={styles.emptyText}>Conecta Spotify arriba para ver tus artistas, canciones y géneros top.</Text>
      </View>
    );
  }

  if (!statsByRange) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tu Spotify</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={syncing} activeOpacity={0.85}>
          {syncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.syncBtnText}>Sincronizar mi Wrapped</Text>
          )}
        </TouchableOpacity>
        {activity && activity.totalPlays > 0 && (
          <Text style={styles.hint}>
            Mientras tanto: {activity.totalPlays} reproducciones registradas en Sonet.
          </Text>
        )}
      </View>
    );
  }

  const stats = statsByRange[range];
  const topArtist = stats.topArtists[0];

  return (
    <View style={{ gap: Spacing.sm }}>
      {/* Range tabs */}
      <View style={styles.rangeTabs}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.rangeTab, range === r && styles.rangeTabActive]}
            onPress={() => setRange(r)}
            activeOpacity={0.8}
          >
            <Text style={[styles.rangeTabText, range === r && styles.rangeTabTextActive]}>
              {RANGE_LABEL[r]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ArchetypeHero archetype={computeArchetype(rangeStatsToVector(stats))} />

      {/* Hero top artist */}
      {topArtist && (
        <View style={styles.hero}>
          <CoverImage uri={topArtist.image} seed={topArtist.name} size={72} radius={36} />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>Tu artista #1</Text>
            <Text style={styles.heroName} numberOfLines={1}>{topArtist.name}</Text>
            {!!topArtist.genres.length && (
              <Text style={styles.heroSub} numberOfLines={1}>{topArtist.genres.slice(0, 2).join(' · ')}</Text>
            )}
          </View>
        </View>
      )}

      {/* Top artists */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top artistas</Text>
        {stats.topArtists.slice(0, 5).map((a, i) => (
          <View key={a.id} style={styles.rankRow}>
            <Text style={styles.rankNum}>{i + 1}</Text>
            <CoverImage uri={a.image} seed={a.name} size={36} radius={18} />
            <Text style={styles.rankName} numberOfLines={1}>{a.name}</Text>
          </View>
        ))}
      </View>

      {/* Top tracks */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top canciones</Text>
        {stats.topTracks.slice(0, 5).map((t, i) => (
          <View key={t.id} style={styles.rankRow}>
            <Text style={styles.rankNum}>{i + 1}</Text>
            <CoverImage uri={t.image} seed={t.name} size={36} radius={6} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rankName} numberOfLines={1}>{t.name}</Text>
              <Text style={styles.rankSub} numberOfLines={1}>{t.artist}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Genre breakdown */}
      {stats.genres.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Géneros</Text>
          {stats.genres.map((g) => (
            <View key={g.label} style={styles.genreRow}>
              <Text style={styles.genreLabel}>{g.label}</Text>
              <View style={styles.genreBarTrack}>
                <View style={[styles.genreBarFill, { width: `${g.value}%` as any, backgroundColor: g.color }]} />
              </View>
              <Text style={styles.genrePct}>{g.value}%</Text>
            </View>
          ))}
        </View>
      )}

      {/* Audio DNA */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tu ADN musical</Text>
        {DNA_LABELS.map(({ key, label, max }) => (
          <View key={key} style={styles.dnaRow}>
            <Text style={styles.dnaLabel}>{label}</Text>
            <View style={styles.dnaTrack}>
              <View style={[styles.dnaFill, { width: `${(stats.audioDna[key] / max) * 100}%` as any }]} />
            </View>
            <Text style={styles.dnaValue}>{stats.audioDna[key]}</Text>
          </View>
        ))}
        {stats.audioDna.avgBpm > 0 && (
          <Text style={styles.bpmText}>{stats.audioDna.avgBpm} BPM promedio</Text>
        )}
      </View>

      {/* Real in-app activity */}
      {activity && activity.totalPlays > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Escuchado en Sonet</Text>
          <View style={styles.activityRow}>
            <View style={styles.activityStat}>
              <Text style={styles.activityValue}>{formatNumber(activity.totalPlays)}</Text>
              <Text style={styles.activityLabel}>reproducciones</Text>
            </View>
            <View style={styles.activityStat}>
              <Text style={styles.activityValue}>{formatNumber(activity.distinctTracks)}</Text>
              <Text style={styles.activityLabel}>canciones distintas</Text>
            </View>
            <View style={styles.activityStat}>
              <Text style={styles.activityValue}>{formatNumber(activity.minutesListened)}</Text>
              <Text style={styles.activityLabel}>minutos</Text>
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity onPress={handleSync} disabled={syncing} activeOpacity={0.7}>
        <Text style={styles.resyncText}>{syncing ? 'Sincronizando...' : 'Volver a sincronizar'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: { fontSize: 13, color: Colors.textMuted, lineHeight: 19 },
  errorText: { fontSize: 13, color: Colors.error, marginBottom: Spacing.sm },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: Spacing.sm, textAlign: 'center' },

  syncBtn: {
    backgroundColor: Colors.spotify,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  syncBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  rangeTabs: { flexDirection: 'row', gap: 8 },
  rangeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  rangeTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  rangeTabText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  rangeTabTextActive: { color: '#fff' },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  heroLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroName: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: 2 },
  heroSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },

  rankRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6 },
  rankNum: { width: 18, fontSize: 13, fontWeight: '700', color: Colors.textMuted, textAlign: 'center' },
  rankName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  rankSub: { fontSize: 12, color: Colors.textMuted },

  genreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 8 },
  genreLabel: { width: 90, fontSize: 12, color: Colors.textSecondary },
  genreBarTrack: { flex: 1, height: 8, backgroundColor: '#2A2A2A', borderRadius: 4, overflow: 'hidden' },
  genreBarFill: { height: '100%', borderRadius: 4 },
  genrePct: { width: 34, fontSize: 12, color: Colors.textMuted, textAlign: 'right' },

  dnaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 8 },
  dnaLabel: { width: 90, fontSize: 12, color: Colors.textSecondary },
  dnaTrack: { flex: 1, height: 8, backgroundColor: '#2A2A2A', borderRadius: 4, overflow: 'hidden' },
  dnaFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.primary },
  dnaValue: { width: 30, fontSize: 12, color: Colors.textMuted, textAlign: 'right' },
  bpmText: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },

  activityRow: { flexDirection: 'row', justifyContent: 'space-around' },
  activityStat: { alignItems: 'center', gap: 2 },
  activityValue: { fontSize: 20, fontWeight: '800', color: Colors.secondary },
  activityLabel: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },

  resyncText: { fontSize: 12, color: Colors.primary, textAlign: 'center', paddingVertical: 8 },

  archetypeHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: `${Colors.primary}20`,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: Spacing.md,
  },
  archetypeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archetypeLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  archetypeName: { fontSize: 18, fontWeight: '800', color: Colors.text, marginTop: 2 },
  archetypeDescription: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
});
