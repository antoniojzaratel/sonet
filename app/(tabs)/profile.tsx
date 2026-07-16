import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useMusicStore } from '@/stores/musicStore';
import { MusicDashboard } from '@/components/dashboard/MusicDashboard';
import { RatingCard } from '@/components/rating/RatingCard';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { formatNumber, getInitials } from '@/lib/utils';

type Tab = 'stats' | 'ratings' | 'lists';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const { myRatings, fetchMyRatings } = useMusicStore();
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) fetchMyRatings(user.id);
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.id) await fetchMyRatings(user.id);
    setRefreshing(false);
  };

  if (!user) return null;

  const topRatings = myRatings.sort((a, b) => b.score - a.score).slice(0, 10);
  const avgScore =
    myRatings.length > 0
      ? (myRatings.reduce((sum, r) => sum + r.score, 0) / myRatings.length).toFixed(1)
      : '—';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <LinearGradient
          colors={['#2D0A5C', Colors.background]}
          style={styles.headerGradient}
        >
          <View style={styles.headerActions}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={signOut} style={styles.settingsButton}>
              <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.avatar}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.avatarImage}
              >
                <Text style={styles.avatarInitials}>{getInitials(user.display_name)}</Text>
              </LinearGradient>
            )}
          </View>

          <Text style={styles.displayName}>{user.display_name}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}

          <View style={styles.statsRow}>
            <StatBubble label="Ratings" value={formatNumber(myRatings.length)} />
            <StatBubble label="Seguidores" value={formatNumber(user.followers_count)} />
            <StatBubble label="Siguiendo" value={formatNumber(user.following_count)} />
            <StatBubble label="Promedio" value={avgScore} highlight />
          </View>
        </LinearGradient>

        <View style={styles.tabs}>
          {(['stats', 'ratings', 'lists'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'stats' ? '📊 Stats' : tab === 'ratings' ? '⭐ Ratings' : '📋 Listas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>
          {activeTab === 'stats' && <MusicDashboard userId={user.id} ratings={myRatings} />}

          {activeTab === 'ratings' && (
            <View style={styles.ratingsList}>
              {myRatings.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>⭐</Text>
                  <Text style={styles.emptyTitle}>Sin ratings aún</Text>
                  <Text style={styles.emptyText}>Empieza a calificar música desde el feed</Text>
                </View>
              ) : (
                myRatings.map((rating) => <RatingCard key={rating.id} rating={rating} />)
              )}
            </View>
          )}

          {activeTab === 'lists' && (
            <View style={styles.listsContainer}>
              {topRatings.length > 0 && (
                <View style={styles.listCard}>
                  <Text style={styles.listTitle}>🏆 Mi Top 10</Text>
                  {topRatings.map((r, i) => (
                    <View key={r.id} style={styles.listItem}>
                      <Text style={styles.listRank}>#{i + 1}</Text>
                      <View style={styles.listItemInfo}>
                        <Text style={styles.listItemName} numberOfLines={1}>{r.content_name}</Text>
                        <Text style={styles.listItemArtist}>{r.artist_name}</Text>
                      </View>
                      <Text style={[styles.listItemScore, { color: Colors.primary }]}>
                        {r.score.toFixed(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBubble({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statBubble}>
      <Text style={[styles.statValue, highlight && { color: Colors.primary }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerGradient: { paddingBottom: Spacing.xl, alignItems: 'center' },
  headerActions: {
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  settingsButton: { padding: 8 },

  avatar: { marginBottom: Spacing.md },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarInitials: { fontSize: 32, fontWeight: '800', color: '#fff' },
  displayName: { fontSize: 22, fontWeight: '800', color: Colors.text },
  username: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  bio: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: Spacing.xl },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  statBubble: { alignItems: 'center', minWidth: 72 },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: Radius.full,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: { backgroundColor: `${Colors.primary}20`, borderColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: Colors.primaryLight },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  ratingsList: { gap: Spacing.sm },
  listsContainer: { gap: Spacing.md },
  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  listTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listRank: { color: Colors.textMuted, fontSize: 13, fontWeight: '700', width: 24 },
  listItemInfo: { flex: 1 },
  listItemName: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  listItemArtist: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  listItemScore: { fontSize: 16, fontWeight: '800' },

  empty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptyText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
});
