import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkIsAdmin } from '@/lib/admin';
import { useRatingStore } from '@/stores/ratingStore';
import { useAuthStore } from '@/stores/authStore';
import { scoreToColor as scoreColor, formatScore } from '@/lib/utils';
import { MusicDashboard } from '@/components/dashboard/MusicDashboard';
import { ListeningStats } from '@/components/dashboard/ListeningStats';
import { Colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/hooks/useAuth';
import { useSpotifyAuth, fetchSpotifyProfile } from '@/lib/spotify';
import { CoverImage } from '@/components/CoverImage';
import { DEMO_USER_ID, DEMO_CONCERT_HISTORY } from '@/lib/demoContent';
import type { RatingEntry } from '@/stores/ratingStore';

type Tab = 'ratings' | 'top10' | 'stats';

const TABS: { key: Tab; label: string }[] = [
  { key: 'ratings', label: 'Calificaciones' },
  { key: 'top10', label: 'Top 10' },
  { key: 'stats', label: 'Estadisticas' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || 'YO';
}

const CONTENT_TYPE_LABEL: Record<string, string> = {
  song: 'Cancion',
  single: 'Single',
  album: 'Album',
  podcast: 'Podcast',
  concert: 'Concierto',
  music_video: 'Video',
};

function TypeBadge({ type }: { type: string }) {
  return (
    <View style={styles.typeBadge}>
      <Text style={styles.typeBadgeText}>{CONTENT_TYPE_LABEL[type] ?? type}</Text>
    </View>
  );
}

function RatingRow({ entry, showRank, rank }: { entry: RatingEntry; showRank?: boolean; rank?: number }) {
  const color = scoreColor(entry.score);
  return (
    <View style={styles.ratingRow}>
      {showRank && (
        <Text style={styles.rankNumber}>{rank}.</Text>
      )}
      <CoverImage uri={entry.imageUrl} seed={entry.contentName} size={44} radius={8} style={styles.coverBox} />
      <View style={styles.ratingInfo}>
        <Text style={styles.ratingTitle} numberOfLines={1}>{entry.contentName}</Text>
        <Text style={styles.ratingArtist} numberOfLines={1}>{entry.artistName}</Text>
        <TypeBadge type={entry.contentType} />
      </View>
      <View style={[styles.scoreBadge, { backgroundColor: color + '22', borderColor: color }]}>
        <Text style={[styles.scoreText, { color }]}>{formatScore(entry.score)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color="#444" />
    </View>
  );
}

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('ratings');
  const [bio, setBio] = useState<string>('Sin bio aun');
  const [connectingSpotify, setConnectingSpotify] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const router = useRouter();
  const { user, spotifyToken, setSpotifyToken, setSpotifyRefreshToken, fetchProfile, signOut } = useAuthStore();
  const { ratings, loading, loadRatings, getTopRated, getStats } = useRatingStore();
  const { request, response, promptAsync, exchangeCode } = useSpotifyAuth();

  useEffect(() => {
    if (user?.id) checkIsAdmin(user.id).then(setIsAdmin);
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) loadRatings(user.id);
    AsyncStorage.getItem('sonet_onboarding_genres').then((raw) => {
      if (raw) {
        try {
          const genres: string[] = JSON.parse(raw);
          if (genres.length > 0) setBio(genres.join(', '));
        } catch {
          // ignore
        }
      }
    });
  }, [user?.id]);

  useEffect(() => {
    if (response?.type !== 'success' || !request?.codeVerifier || !user?.id) return;
    (async () => {
      setConnectingSpotify(true);
      const tokens = await exchangeCode(response.params.code, request.codeVerifier!);
      if (tokens) {
        setSpotifyToken(tokens.accessToken);
        setSpotifyRefreshToken(tokens.refreshToken);
        if (!isDemoMode) {
          await supabase.from('user_secrets').upsert({
            user_id: user.id,
            spotify_token: tokens.accessToken,
            spotify_refresh: tokens.refreshToken,
            spotify_token_expires_at: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
          });
          const profile = await fetchSpotifyProfile(tokens.accessToken);
          if (profile) {
            await supabase.from('users').update({ spotify_id: profile.id }).eq('id', user.id);
            await fetchProfile(user.id);
          }
        }
      }
      setConnectingSpotify(false);
    })();
  }, [response]);

  const stats = getStats();
  const topRated = getTopRated(10);
  const hasSpotify = !!spotifyToken;

  const displayName = user?.display_name ?? 'Tu Perfil';
  const username = `@${user?.username ?? 'yo'}`;
  const initials = getInitials(displayName);

  // Stats for dashboard tab
  const dashboardRatings = ratings.map((r) => ({
    score: r.score,
    artist_name: r.artistName,
    content_type: r.contentType,
  }));

  const uniqueArtists = new Set(ratings.map((r) => r.artistName)).size;

  const handleSpotifyConnect = useCallback(() => {
    if (!request) {
      Alert.alert('Spotify no configurado', 'Falta EXPO_PUBLIC_SPOTIFY_CLIENT_ID en las variables de entorno.');
      return;
    }
    promptAsync();
  }, [request, promptAsync]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Eliminar cuenta',
      'Esto borra tu perfil, calificaciones, mensajes, historias y toda tu actividad de forma permanente. No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            Alert.alert('¿Estás seguro?', 'Última confirmación — tu cuenta se eliminará ahora mismo.', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Eliminar cuenta',
                style: 'destructive',
                onPress: async () => {
                  setDeleting(true);
                  const { error } = await supabase.rpc('delete_own_account');
                  setDeleting(false);
                  if (error) {
                    Alert.alert('Error', 'No se pudo eliminar tu cuenta. Intenta de nuevo.');
                    return;
                  }
                  await signOut();
                },
              },
            ]);
          },
        },
      ],
    );
  }, [signOut]);

  const sortedRatings = [...ratings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const renderRatingItem = useCallback(
    ({ item }: { item: RatingEntry }) => <RatingRow entry={item} />,
    [],
  );

  const renderTopItem = useCallback(
    ({ item, index }: { item: RatingEntry; index: number }) => (
      <RatingRow entry={item} showRank rank={index + 1} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: RatingEntry) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>

        {/* Profile header */}
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.username}>{username}</Text>
          <Text style={styles.bio}>{bio}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Calificaciones</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{user?.followers_count ?? 0}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{user?.following_count ?? 0}</Text>
              <Text style={styles.statLabel}>Siguiendo</Text>
            </View>
          </View>

          {/* Spotify connect — only if not connected */}
          {!hasSpotify && (
            <TouchableOpacity
              style={styles.spotifyButton}
              onPress={handleSpotifyConnect}
              disabled={connectingSpotify}
            >
              <Text style={styles.spotifyButtonText}>
                {connectingSpotify ? 'Conectando...' : 'Conectar Spotify'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab selector */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'ratings' && (
          <View style={styles.tabContent}>
            {sortedRatings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Aun no has calificado nada</Text>
                <Text style={styles.emptySubtext}>Toca + en el feed para empezar</Text>
              </View>
            ) : (
              <FlatList
                data={sortedRatings}
                keyExtractor={keyExtractor}
                renderItem={renderRatingItem}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>
        )}

        {activeTab === 'top10' && (
          <View style={styles.tabContent}>
            {topRated.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Aun no has calificado nada</Text>
                <Text style={styles.emptySubtext}>Toca + en el feed para empezar</Text>
              </View>
            ) : (
              <FlatList
                data={topRated}
                keyExtractor={keyExtractor}
                renderItem={renderTopItem}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>
        )}

        {activeTab === 'stats' && (
          <View style={styles.tabContent}>
            {/* Summary card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{stats.avgScore.toFixed(1)}</Text>
                <Text style={styles.summaryLabel}>Puntuacion promedio</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{stats.total}</Text>
                <Text style={styles.summaryLabel}>Total calificaciones</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{uniqueArtists}</Text>
                <Text style={styles.summaryLabel}>Artistas distintos</Text>
              </View>
            </View>

            {/* Real Spotify listening stats — top artists/tracks/genres per
                time range, audio DNA, real in-app activity */}
            {user?.id && (
              <>
                <Text style={styles.sectionHeading}>Tu Spotify</Text>
                <ListeningStats userId={user.id} spotifyToken={spotifyToken} />
              </>
            )}

            {/* Concert history — demo account only for now; a real user's
                history lives in concert_attendance (map.tsx), out of scope
                here to avoid duplicating that fork's in-flight work. */}
            {user?.id === DEMO_USER_ID && (
              <>
                <Text style={styles.sectionHeading}>Tus conciertos ({DEMO_CONCERT_HISTORY.length})</Text>
                <View style={styles.concertList}>
                  {DEMO_CONCERT_HISTORY.map((c) => (
                    <View key={c.id} style={styles.concertRow}>
                      <View style={styles.concertIconWrap}>
                        <Ionicons name="location" size={16} color={Colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.concertName} numberOfLines={1}>{c.name}</Text>
                        <Text style={styles.concertMeta} numberOfLines={1}>
                          {c.city}, {c.country} · {new Date(c.date).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Rating-habit charts (distinct from listening stats above —
                this is about what you've rated, not what you've played) */}
            <Text style={styles.sectionHeading}>Tus calificaciones</Text>
            <MusicDashboard ratings={dashboardRatings} />
          </View>
        )}

        {isAdmin && (
          <TouchableOpacity
            style={styles.adminLink}
            // `as any`: expo-router's typed-routes union regenerates from disk on
            // the next `expo start`/build — it just hasn't seen this brand-new
            // route yet in this no-dev-server session.
            onPress={() => router.push('/admin/reports' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
            <Text style={styles.adminLinkText}>Moderación</Text>
          </TouchableOpacity>
        )}

        {/* Danger zone */}
        <View style={styles.dangerZone}>
          <TouchableOpacity onPress={handleDeleteAccount} disabled={deleting} activeOpacity={0.7}>
            <Text style={styles.deleteAccountText}>
              {deleting ? 'Eliminando cuenta...' : 'Eliminar cuenta'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },

  // Profile header
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: '#A0A0A0',
    marginBottom: 8,
  },
  bio: {
    fontSize: 13,
    color: '#A0A0A0',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 19,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 14,
    paddingHorizontal: 8,
    width: '100%',
    marginBottom: 14,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#2A2A2A',
  },

  // Spotify button
  spotifyButton: {
    borderWidth: 1,
    borderColor: '#1DB954',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  spotifyButtonText: {
    color: '#1DB954',
    fontSize: 13,
    fontWeight: '600',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#A855F7',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  tabLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Tab content
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },

  // Concert history
  concertList: { gap: 8, marginBottom: 20 },
  concertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 10,
  },
  concertIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  concertName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  concertMeta: { color: '#888', fontSize: 11, marginTop: 1 },

  // Rating row
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    width: 24,
    textAlign: 'right',
  },
  coverBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  coverInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  ratingInfo: {
    flex: 1,
    gap: 2,
  },
  ratingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  ratingArtist: {
    fontSize: 13,
    color: '#A0A0A0',
  },
  typeBadge: {
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  typeBadgeText: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
  },
  scoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
  },
  separator: {
    height: 1,
    backgroundColor: '#1E1E1E',
    marginHorizontal: 4,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#666',
  },

  // Summary card (stats tab)
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#A855F7',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    lineHeight: 14,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#2A2A2A',
    alignSelf: 'center',
  },

  // Danger zone
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  adminLinkText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  dangerZone: {
    marginTop: 32,
    paddingTop: 20,
    marginHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    alignItems: 'center',
  },
  deleteAccountText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
});
