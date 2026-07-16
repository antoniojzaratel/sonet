import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VictoryPie } from 'victory-native';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useMusicStore } from '@/stores/musicStore';
import {
  fetchTopArtists,
  extractGenresFromArtists,
  mapGenresToCategories,
  type GenreCategoryItem,
} from '@/lib/spotify';
import type { Rating } from '@/types';

const ARTIST_COLORS = [Colors.primary, Colors.accent, Colors.secondary, Colors.warning, '#3B82F6'];

const PLACEHOLDER_GENRES: GenreCategoryItem[] = [
  { label: 'Género A', value: 35, color: '#333333' },
  { label: 'Género B', value: 28, color: '#2A2A2A' },
  { label: 'Género C', value: 22, color: '#222222' },
  { label: 'Otros',    value: 15, color: '#1A1A1A' },
];

function getMonthYearLabel(): string {
  const now = new Date();
  return now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase();
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function getHandle(name: string): string {
  const first = name.split(' ')[0].toLowerCase();
  return `${first}_mty`;
}

function getRatingStats(ratings: Rating[]) {
  const total = ratings.length;
  const avgScore = total > 0 ? ratings.reduce((s, r) => s + r.score, 0) / total : 0;
  const loveCount = ratings.filter((r) => r.score >= 8).length;
  return { total, avgScore, loveCount };
}

function getTopRated(ratings: Rating[], n: number): Rating[] {
  return [...ratings].sort((a, b) => b.score - a.score).slice(0, n);
}

export default function ProfileScreen() {
  const [humourSeed, setHumourSeed] = useState(0);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [genreData, setGenreData] = useState<GenreCategoryItem[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const { user, spotifyToken } = useAuthStore();
  const { myRatings, fetchMyRatings } = useMusicStore();

  useEffect(() => {
    if (user?.id) {
      fetchMyRatings(user.id);
    }

    if (spotifyToken) {
      fetchTopArtists(spotifyToken, 'medium_term', 20).then((data) => {
        if (data?.items) {
          setTopArtists(data.items.slice(0, 3));
          const genreMap = extractGenresFromArtists(data.items);
          const mapped = mapGenresToCategories(genreMap);
          if (mapped.length > 0) setGenreData(mapped);
        }
      });
    }

    setDataLoaded(true);
  }, [spotifyToken, user?.id]);

  const displayName = user?.display_name ?? 'Tu perfil';
  const initials = getInitials(displayName);
  const handle = user?.display_name ? getHandle(user.display_name) : 'usuario';
  const stats = getRatingStats(myRatings);
  const topRated = getTopRated(myRatings, 5);
  const hasSpotify = !!spotifyToken;
  const activeGenreData = genreData.length > 0 ? genreData : PLACEHOLDER_GENRES;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.headerLogo}>Sonet</Text>
          <Text style={styles.headerMeta}>
            {getMonthYearLabel()}  /{'  '}
            <Text style={styles.headerShare}>compartir</Text>
          </Text>
        </View>

        {/* User card */}
        <View style={styles.card}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userHandle}>@{handle}</Text>
          <Text style={styles.userStats}>
            {stats.total} ratings · {stats.avgScore.toFixed(1)} promedio
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>calificaciones</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMid]}>
            <Text style={styles.statNumber}>{stats.loveCount}</Text>
            <Text style={styles.statLabel}>me encantó</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.avgScore.toFixed(1)}</Text>
            <Text style={styles.statLabel}>promedio</Text>
          </View>
        </View>

        {/* Genre distribution card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tu distribución de géneros</Text>
          {!hasSpotify && genreData.length === 0 && (
            <Text style={styles.connectHint}>Conecta Spotify para ver tus géneros reales</Text>
          )}
          <View style={styles.genreRow}>
            <VictoryPie
              data={activeGenreData}
              x="label"
              y="value"
              colorScale={activeGenreData.map((d) => d.color)}
              innerRadius={45}
              width={140}
              height={140}
              padding={0}
              labels={() => ''}
            />
            <View style={styles.legendCol}>
              {activeGenreData.map((item) => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>
                    {item.value}% {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Top artists card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top artistas del mes</Text>
          {!hasSpotify ? (
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Conecta Spotify para ver tus artistas más escuchados</Text>
            </View>
          ) : topArtists.length === 0 && dataLoaded ? (
            <Text style={styles.emptyText}>No encontramos artistas. Escucha más música 🎵</Text>
          ) : (
            topArtists.map((artist, idx) => {
              const rank = String(idx + 1).padStart(2, '0');
              const color = ARTIST_COLORS[idx % ARTIST_COLORS.length];
              const imageUrl = artist.images?.[0]?.url;
              return (
                <View key={artist.id} style={styles.artistRow}>
                  <Text style={styles.artistRank}>{rank}</Text>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.artistAvatar} />
                  ) : (
                    <View style={[styles.artistAvatarFallback, { backgroundColor: color }]}>
                      <Text style={styles.artistInitials}>{artist.name[0]}</Text>
                    </View>
                  )}
                  <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
                  <View style={[styles.changeBadge, { borderColor: color }]}>
                    <Text style={[styles.changeBadgeText, { color }]}>↑</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Top ratings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tus mejores calificaciones</Text>
          {topRated.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={28} color={Colors.textMuted} />
              <Text style={styles.emptyText}>
                Aún no has calificado nada · ve al Diario para empezar
              </Text>
            </View>
          ) : (
            topRated.map((rating, idx) => {
              const color = ARTIST_COLORS[idx % ARTIST_COLORS.length];
              return (
                <View key={rating.id} style={styles.ratingRow}>
                  <View style={[styles.ratingInitial, { backgroundColor: color }]}>
                    <Text style={styles.ratingInitialText}>
                      {rating.content_name[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={styles.ratingInfo}>
                    <Text style={styles.ratingTitle} numberOfLines={1}>{rating.content_name}</Text>
                    <Text style={styles.ratingArtist} numberOfLines={1}>{rating.artist_name}</Text>
                  </View>
                  <View style={[styles.scoreBadge, { backgroundColor: color + '22', borderColor: color }]}>
                    <Text style={[styles.scoreText, { color }]}>{rating.score.toFixed(1)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* AI humor reading card */}
        <View style={styles.aiCard}>
          <Text style={styles.cardTitle}>Tu sentido del humor 🤖</Text>
          <Text style={styles.aiLabel}>Humor norteño-existencial</Text>
          <Text style={styles.aiBody}>
            Te ríes con memes de corridos a mediodía y lloras con Zoé a las 2 am. Tu chiste favorito
            es negar que existe tu playlist "para llorar"... que tiene 84 canciones.
          </Text>
          <View style={styles.aiButtons}>
            <TouchableOpacity style={styles.aiButtonOutlined}>
              <Text style={styles.aiButtonOutlinedText}>Compartir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.aiButtonFilled}
              onPress={() => setHumourSeed((s) => s + 1)}
            >
              <Text style={styles.aiButtonFilledText}>Otra lectura</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.aiFootnote}>Generado por IA · se renueva cada mes</Text>
        </View>

        {/* Premium card */}
        <View style={styles.premiumCard}>
          <Text style={styles.premiumTitle}>✦ Sonet Premium</Text>
          <Text style={styles.premiumDesc}>
            Accede a estadísticas avanzadas, modo sin publicidad y descuentos exclusivos en conciertos.
          </Text>
          <View style={styles.premiumRow}>
            <Text style={styles.premiumPrice}>$99 MXN / mes</Text>
            <TouchableOpacity style={styles.premiumButton}>
              <Text style={styles.premiumButtonText}>Probar 7 días</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy section */}
        <View style={styles.privacySection}>
          <TouchableOpacity style={styles.privacyRow}>
            <Ionicons name="musical-note-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.privacyText}>Perfil musical visible: solo amigos</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.privacyRow}>
            <Ionicons name="notifications-outline" size={18} color={Colors.textSecondary} />
            <Text style={[styles.privacyText, { flex: 1 }]} numberOfLines={1}>
              Notificaciones de actividad social
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLogo: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  headerMeta: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  headerShare: {
    color: Colors.warning,
  },

  /* Cards */
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },

  /* User card */
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  userStats: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  /* Stats row */
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statBoxMid: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  /* Genre distribution */
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  legendCol: {
    flex: 1,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  connectHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
    fontStyle: 'italic',
  },

  /* Top artists */
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  artistRank: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    width: 24,
  },
  artistAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  artistAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  artistName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  changeBadge: {
    borderWidth: 1,
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  changeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Ratings list */
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  ratingInitial: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingInitialText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  ratingInfo: {
    flex: 1,
  },
  ratingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  ratingArtist: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  scoreBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
  },

  /* Empty state */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },

  /* AI card */
  aiCard: {
    backgroundColor: '#1A0A2E',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  aiLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  aiBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  aiButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  aiButtonOutlined: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 99,
    paddingVertical: 10,
    alignItems: 'center',
  },
  aiButtonOutlinedText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  aiButtonFilled: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 99,
    paddingVertical: 10,
    alignItems: 'center',
  },
  aiButtonFilledText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  aiFootnote: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  /* Premium card */
  premiumCard: {
    backgroundColor: '#1C1200',
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  premiumTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.warning,
    marginBottom: 8,
  },
  premiumDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 14,
    lineHeight: 19,
  },
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  premiumButton: {
    backgroundColor: Colors.primary,
    borderRadius: 99,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  premiumButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  /* Privacy section */
  privacySection: {
    marginHorizontal: 16,
    gap: 8,
    marginBottom: 4,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
});
