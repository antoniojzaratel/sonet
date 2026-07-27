import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  MOCK_RATINGS,
  getUserById,
  scoreColor,
  formatScore,
  timeAgo,
  POPULAR_CATALOG,
  searchCatalog,
  type MockRating,
  type CatalogItem,
} from '@/lib/mockData';
import { useRatingStore } from '@/stores/ratingStore';
import type { RatingEntry } from '@/stores/ratingStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedRating extends MockRating {
  user: {
    displayName: string;
    username: string;
    initials: string;
    avatarColor: string;
  };
}

// ─── FeedCard ─────────────────────────────────────────────────────────────────

interface FeedCardProps {
  item: FeedRating;
  liked: boolean;
  onToggleLike: (id: string) => void;
}

function FeedCard({ item, liked, onToggleLike }: FeedCardProps) {
  const displayLikeCount = liked
    ? item.likedByMe
      ? item.likeCount
      : item.likeCount + 1
    : item.likedByMe
    ? item.likeCount - 1
    : item.likeCount;

  return (
    <View style={styles.card}>
      {/* Row 1: user info + time */}
      <View style={styles.cardRow}>
        <View style={[styles.avatar, { backgroundColor: item.user.avatarColor }]}>
          <Text style={styles.avatarText}>{item.user.initials}</Text>
        </View>
        <View style={styles.userCol}>
          <Text style={styles.displayName}>{item.user.displayName}</Text>
          <Text style={styles.userMeta}>
            @{item.user.username} · {timeAgo(item.createdAt)}
          </Text>
        </View>
      </View>

      {/* Row 2: content */}
      <View style={[styles.cardRow, styles.contentRow]}>
        <View style={[styles.cover, { backgroundColor: item.coverColor }]}>
          <Text style={styles.coverInitial}>{item.coverInitial}</Text>
        </View>
        <View style={styles.contentCol}>
          <Text style={styles.contentName} numberOfLines={1}>
            {item.contentName}
          </Text>
          <Text style={styles.artistName}>{item.artistName}</Text>
          <Text style={styles.contentType}>
            {item.contentType === 'album' ? 'ALBUM' : 'CANCION'}
          </Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor(item.score) }]}>
          <Text style={styles.scoreText}>{formatScore(item.score)}</Text>
        </View>
      </View>

      {/* Review */}
      {!!item.review && (
        <Text style={styles.review}>{item.review}</Text>
      )}

      {/* Row 3: actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.likeBtn}
          onPress={() => onToggleLike(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={18}
            color={liked ? '#F43F5E' : '#666666'}
          />
          <Text style={[styles.likeCount, liked && styles.likeCountActive]}>
            {displayLikeCount > 0 ? String(displayLikeCount) : 'Me gusta'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── RateModal ────────────────────────────────────────────────────────────────

const SCORE_OPTIONS = Array.from({ length: 19 }, (_, i) =>
  parseFloat((1.0 + i * 0.5).toFixed(1)),
);

interface RateModalProps {
  visible: boolean;
  onClose: () => void;
}

function RateModal({ visible, onClose }: RateModalProps) {
  const { addRating } = useRatingStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogItem[]>(POPULAR_CATALOG.slice(0, 8));
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [score, setScore] = useState(5.0);
  const [review, setReview] = useState('');

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setSearchResults(searchCatalog(q).slice(0, 10));
  }, []);

  const handleSelectItem = (item: CatalogItem) => {
    setSelectedItem(item);
    setScore(5.0);
    setReview('');
  };

  const handlePublish = async () => {
    if (!selectedItem) return;
    await addRating({
      contentId: selectedItem.id,
      contentName: selectedItem.name,
      artistName: selectedItem.artist,
      imageUrl: '',
      contentType: selectedItem.type,
      score,
      emoji: score >= 8 ? 'love' : score >= 5 ? 'like' : 'meh',
      review: review.trim() || undefined,
    });
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults(POPULAR_CATALOG.slice(0, 8));
    setSelectedItem(null);
    setScore(5.0);
    setReview('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Modal header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Calificar</Text>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7} hitSlop={12}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!selectedItem ? (
            <>
              {/* Search input */}
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={18} color="#666666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Busca canciones o albums..."
                  placeholderTextColor="#666666"
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoFocus
                />
              </View>

              {/* Results list */}
              <Text style={styles.sectionLabel}>
                {searchQuery.trim() ? 'Resultados' : 'Populares'}
              </Text>
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.catalogRow}
                  onPress={() => handleSelectItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catalogCover, { backgroundColor: item.coverColor }]}>
                    <Text style={styles.catalogInitial}>{item.coverInitial}</Text>
                  </View>
                  <View style={styles.catalogInfo}>
                    <Text style={styles.catalogName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.catalogArtist} numberOfLines={1}>
                      {item.artist} · {item.type === 'album' ? 'Album' : 'Cancion'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#444444" />
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              {/* Selected item header */}
              <View style={styles.selectedHeader}>
                <View style={[styles.selectedCover, { backgroundColor: selectedItem.coverColor }]}>
                  <Text style={styles.selectedInitial}>{selectedItem.coverInitial}</Text>
                </View>
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName} numberOfLines={1}>
                    {selectedItem.name}
                  </Text>
                  <Text style={styles.selectedArtist}>{selectedItem.artist}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedItem(null)}
                  activeOpacity={0.7}
                  hitSlop={12}
                >
                  <Ionicons name="close-circle" size={22} color="#555555" />
                </TouchableOpacity>
              </View>

              {/* Score display */}
              <View style={styles.scoreDisplay}>
                <Text style={[styles.scoreNumber, { color: scoreColor(score) }]}>
                  {formatScore(score)}
                </Text>
                <Text style={styles.scoreLabel}>/ 10</Text>
              </View>

              {/* Score picker */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.scorePicker}
                contentContainerStyle={styles.scorePickerContent}
              >
                {SCORE_OPTIONS.map((s) => {
                  const active = s === score;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.scoreChip, active && styles.scoreChipActive]}
                      onPress={() => setScore(s)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.scoreChipText, active && styles.scoreChipTextActive]}>
                        {formatScore(s)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Review input */}
              <Text style={styles.sectionLabel}>Resena (opcional)</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Que te parecio?"
                placeholderTextColor="#555555"
                value={review}
                onChangeText={setReview}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Publish button */}
              <TouchableOpacity
                style={styles.publishBtn}
                onPress={handlePublish}
                activeOpacity={0.8}
              >
                <Text style={styles.publishBtnText}>Publicar</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

function ratingEntryToFeedRating(entry: RatingEntry): FeedRating {
  return {
    id: `local-${entry.id}`,
    userId: 'me',
    contentId: entry.contentId,
    contentType: entry.contentType === 'podcast' ? 'track' : entry.contentType,
    contentName: entry.contentName,
    artistName: entry.artistName,
    coverColor: '#A855F7',
    coverInitial: entry.contentName.charAt(0).toUpperCase(),
    score: entry.score,
    review: entry.review,
    likeCount: 0,
    likedByMe: false,
    createdAt: entry.createdAt,
    user: {
      displayName: 'Tu',
      username: 'yo',
      initials: 'YO',
      avatarColor: '#A855F7',
    },
  };
}

function buildFeed(localRatings: RatingEntry[]): FeedRating[] {
  const communityFeed: FeedRating[] = MOCK_RATINGS.map((r) => {
    const u = getUserById(r.userId);
    return {
      ...r,
      user: u
        ? {
            displayName: u.displayName,
            username: u.username,
            initials: u.initials,
            avatarColor: u.avatarColor,
          }
        : { displayName: 'Usuario', username: 'user', initials: 'U', avatarColor: '#555555' },
    };
  });

  const myFeed: FeedRating[] = localRatings.map(ratingEntryToFeedRating);

  const all = [...myFeed, ...communityFeed];
  all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return all;
}

export default function FeedScreen() {
  const { ratings, loadRatings } = useRatingStore();
  const [feed, setFeed] = useState<FeedRating[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [localLiked, setLocalLiked] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRatings();
  }, []);

  useEffect(() => {
    setFeed(buildFeed(ratings));
  }, [ratings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRatings();
    setRefreshing(false);
  };

  const toggleLike = (id: string) => {
    setLocalLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderItem = ({ item }: { item: FeedRating }) => (
    <FeedCard
      item={item}
      liked={localLiked.has(item.id) ? !item.likedByMe : item.likedByMe}
      onToggleLike={toggleLike}
    />
  );

  const ListEmpty = () => (
    <View style={styles.empty}>
      <Ionicons name="musical-notes-outline" size={56} color="#2A2A2A" />
      <Text style={styles.emptyTitle}>El feed esta vacio</Text>
      <Text style={styles.emptySubtitle}>
        Sigue a gente con tu mismo gusto musical para ver sus calificaciones
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Fixed header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Sonet</Text>
        <TouchableOpacity activeOpacity={0.7} hitSlop={12}>
          <Ionicons name="bell-outline" size={22} color="#666666" />
        </TouchableOpacity>
      </View>

      {/* Feed */}
      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<ListEmpty />}
        contentContainerStyle={feed.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#A855F7"
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setRateModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Rate modal */}
      <RateModal
        visible={rateModalVisible}
        onClose={() => setRateModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#A855F7',
  },

  // List
  listContent: {
    paddingVertical: 8,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Card
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentRow: {
    marginTop: 12,
    alignItems: 'flex-start',
  },

  // Avatar
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // User meta
  userCol: {
    flex: 1,
  },
  displayName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  userMeta: {
    color: '#666666',
    fontSize: 13,
    marginTop: 1,
  },

  // Cover
  cover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coverInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },

  // Content info
  contentCol: {
    flex: 1,
  },
  contentName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  artistName: {
    color: '#888888',
    fontSize: 13,
    marginTop: 2,
  },
  contentType: {
    color: '#555555',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Score badge
  scoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  scoreText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Review
  review: {
    color: '#888888',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 20,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#242424',
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likeCount: {
    color: '#666666',
    fontSize: 13,
    fontWeight: '500',
  },
  likeCountActive: {
    color: '#F43F5E',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
  modalScroll: {
    flex: 1,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  sectionLabel: {
    color: '#555555',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },

  // Catalog rows
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  catalogCover: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  catalogInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  catalogInfo: {
    flex: 1,
  },
  catalogName: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  catalogArtist: {
    color: '#666666',
    fontSize: 12,
    marginTop: 2,
  },

  // Selected item
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
  },
  selectedCover: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 20,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  selectedArtist: {
    color: '#888888',
    fontSize: 13,
    marginTop: 2,
  },

  // Score display
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 22,
    color: '#444444',
    fontWeight: '600',
  },

  // Score picker
  scorePicker: {
    marginTop: 16,
  },
  scorePickerContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  scoreChip: {
    width: 52,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreChipActive: {
    backgroundColor: '#A855F7',
  },
  scoreChipText: {
    color: '#888888',
    fontWeight: '600',
    fontSize: 13,
  },
  scoreChipTextActive: {
    color: '#FFFFFF',
  },

  // Review input
  reviewInput: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 14,
    marginHorizontal: 20,
    minHeight: 90,
    lineHeight: 20,
  },

  // Publish button
  publishBtn: {
    backgroundColor: '#A855F7',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
