import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '@/stores/musicStore';
import { useAuthStore } from '@/stores/authStore';
import { FeedRatingCard } from '@/components/rating/FeedRatingCard';
import { RateModal } from '@/components/rating/RateModal';
import { SongOfTheDay } from '@/components/recommendations/SongOfTheDay';
import { Colors, Spacing } from '@/constants/colors';
import type { FeedItem } from '@/types';

export default function FeedScreen() {
  const { feed, loadingFeed, fetchFeed } = useMusicStore();
  const { user } = useAuthStore();
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchFeed();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: FeedItem }) => {
    if (item.type === 'rating' && item.rating) {
      return <FeedRatingCard rating={item.rating} user={item.user} />;
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>🎵 Sonet</Text>
        <TouchableOpacity
          style={styles.rateButton}
          onPress={() => setRateModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.rateButtonText}>Calificar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={<SongOfTheDay />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loadingFeed}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          !loadingFeed ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎶</Text>
              <Text style={styles.emptyTitle}>El feed está vacío</Text>
              <Text style={styles.emptySubtitle}>
                Sigue a gente con tu mismo gusto musical para ver sus calificaciones
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={feed.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <RateModal visible={rateModalVisible} onClose={() => setRateModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: { fontSize: 22, fontWeight: '800', color: Colors.text },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
  },
  rateButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  listContent: { paddingVertical: Spacing.sm },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
