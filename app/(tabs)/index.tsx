import { useEffect, useState, useCallback, useRef } from 'react';
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRatingStore, type FeedEntry } from '@/stores/ratingStore';
import { useAuthStore } from '@/stores/authStore';
import { searchMusic, type MusicItem } from '@/lib/musicDB';
import { CompareDuel, type DuelItem } from '@/components/rating/CompareDuel';
import { BUCKET_LABELS, type Bucket, type Comparator } from '@/lib/ranking';
import { scoreToColor, formatScore, formatRelativeTime } from '@/lib/utils';
import type { RatingEntry } from '@/stores/ratingStore';
import type { ContentType } from '@/types';

// ─── FeedCard ─────────────────────────────────────────────────────────────────

interface FeedCardProps {
  entry: FeedEntry;
  liked: boolean;
  onToggleLike: (id: string) => void;
}

function initialsOf(name: string): string {
  return (
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  );
}

function FeedCard({ entry, liked, onToggleLike }: FeedCardProps) {
  const { rating, user } = entry;
  const color = scoreToColor(rating.score);

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{initialsOf(user.displayName)}</Text>
        </View>
        <View style={styles.userCol}>
          <Text style={styles.displayName}>{user.displayName}</Text>
          <Text style={styles.userMeta}>
            @{user.username} · {formatRelativeTime(rating.createdAt)}
          </Text>
        </View>
      </View>

      <View style={[styles.cardRow, styles.contentRow]}>
        <View style={[styles.cover, { backgroundColor: Colors_fallback(rating.contentId) }]}>
          <Text style={styles.coverInitial}>{rating.contentName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.contentCol}>
          <Text style={styles.contentName} numberOfLines={1}>{rating.contentName}</Text>
          <Text style={styles.artistName}>{rating.artistName}</Text>
          <Text style={styles.contentType}>{rating.contentType.replace('_', ' ').toUpperCase()}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: color }]}>
          <Text style={styles.scoreText}>{formatScore(rating.score)}</Text>
        </View>
      </View>

      {!!rating.review && <Text style={styles.review}>{rating.review}</Text>}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.likeBtn} onPress={() => onToggleLike(rating.id)} activeOpacity={0.7}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#F43F5E' : '#666666'} />
          <Text style={[styles.likeCount, liked && styles.likeCountActive]}>Me gusta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Deterministic fallback color per content id, so covers without art still look distinct.
function Colors_fallback(seed: string): string {
  const palette = ['#A855F7', '#F43F5E', '#84CC16', '#F59E0B', '#06B6D4', '#8B5CF6', '#EC4899', '#10B981'];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

// ─── RateModal ────────────────────────────────────────────────────────────────

const BUCKETS: Bucket[] = ['liked', 'fine', 'disliked'];

type ModalStep = 'search' | 'bucket' | 'saving';

interface RateModalProps {
  visible: boolean;
  onClose: () => void;
}

function RateModal({ visible, onClose }: RateModalProps) {
  const { addRating } = useRatingStore();
  const { user, spotifyToken } = useAuthStore();

  const [step, setStep] = useState<ModalStep>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<MusicItem | null>(null);
  const [review, setReview] = useState('');
  const [duelPair, setDuelPair] = useState<{ a: DuelItem; b: DuelItem } | null>(null);
  const duelResolveRef = useRef<((winner: 'a' | 'b') => void) | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      setQuery(q);
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const items = await searchMusic({
          query: q,
          types: ['song', 'album'] as ContentType[],
          accessToken: spotifyToken ?? undefined,
          limit: 10,
        });
        setResults(items);
      } catch {
        setResults([]);
      }
      setSearching(false);
    },
    [spotifyToken]
  );

  const handleSelectItem = (item: MusicItem) => {
    setSelected(item);
    setStep('bucket');
  };

  const handleManualEntry = () => {
    if (!query.trim()) return;
    handleSelectItem({
      id: `manual-${Date.now()}`,
      type: 'song',
      name: query,
      artist_name: 'Artista manual',
      artist_names: ['Artista manual'],
    });
  };

  const compare: Comparator<RatingEntry> = (a, b) => {
    return new Promise((resolve) => {
      setDuelPair({
        a: { contentId: a.contentId, contentName: a.contentName, artistName: a.artistName, imageUrl: a.imageUrl },
        b: { contentId: b.contentId, contentName: b.contentName, artistName: b.artistName, imageUrl: b.imageUrl },
      });
      duelResolveRef.current = (winner) => {
        setDuelPair(null);
        resolve(winner);
      };
    });
  };

  const handlePickBucket = async (bucket: Bucket) => {
    if (!selected || !user) {
      Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para calificar.');
      return;
    }
    setStep('saving');
    const saved = await addRating({
      userId: user.id,
      contentType: selected.type,
      contentId: selected.id,
      contentName: selected.name,
      artistName: selected.artist_name,
      imageUrl: selected.cover_image ?? '',
      bucket,
      review: review.trim() || undefined,
      compare,
    });

    if (saved) {
      Alert.alert('¡Calificado!', `"${selected.name}" quedó en ${saved.score.toFixed(1)}`);
      handleClose();
    } else {
      Alert.alert('Error', 'No se pudo guardar la calificación');
      setStep('bucket');
    }
  };

  const handleClose = () => {
    setStep('search');
    setQuery('');
    setResults([]);
    setSelected(null);
    setReview('');
    setDuelPair(null);
    duelResolveRef.current = null;
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {duelPair ? '¿Cuál prefieres?' : step === 'search' ? 'Calificar' : step === 'bucket' ? 'Tu opinión' : 'Guardando...'}
          </Text>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7} hitSlop={12}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {duelPair ? (
          <CompareDuel
            itemA={duelPair.a}
            itemB={duelPair.b}
            onPick={(winner) => duelResolveRef.current?.(winner)}
          />
        ) : (
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {step === 'search' && (
              <>
                <View style={styles.searchBar}>
                  <Ionicons name="search-outline" size={18} color="#666666" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Busca canciones o álbumes..."
                    placeholderTextColor="#666666"
                    value={query}
                    onChangeText={runSearch}
                    autoFocus
                  />
                  {searching && <ActivityIndicator size="small" color="#A855F7" />}
                </View>

                <Text style={styles.sectionLabel}>Resultados</Text>
                {results.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.catalogRow} onPress={() => handleSelectItem(item)} activeOpacity={0.7}>
                    <View style={[styles.catalogCover, { backgroundColor: Colors_fallback(item.id) }]}>
                      <Text style={styles.catalogInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.catalogInfo}>
                      <Text style={styles.catalogName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.catalogArtist} numberOfLines={1}>
                        {item.artist_name} · {item.type === 'album' ? 'Álbum' : 'Canción'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#444444" />
                  </TouchableOpacity>
                ))}

                {query.trim().length > 0 && (
                  <TouchableOpacity style={styles.manualEntry} onPress={handleManualEntry} activeOpacity={0.7}>
                    <Ionicons name="add-circle-outline" size={18} color="#A855F7" />
                    <Text style={styles.manualText}>Agregar "{query}" manualmente</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {step === 'bucket' && selected && (
              <>
                <View style={styles.selectedHeader}>
                  <View style={[styles.selectedCover, { backgroundColor: Colors_fallback(selected.id) }]}>
                    <Text style={styles.selectedInitial}>{selected.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.selectedInfo}>
                    <Text style={styles.selectedName} numberOfLines={1}>{selected.name}</Text>
                    <Text style={styles.selectedArtist}>{selected.artist_name}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelected(null);
                      setStep('search');
                    }}
                    activeOpacity={0.7}
                    hitSlop={12}
                  >
                    <Ionicons name="close-circle" size={22} color="#555555" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionLabel}>¿Qué te pareció?</Text>
                <View style={styles.bucketGrid}>
                  {BUCKETS.map((b) => (
                    <TouchableOpacity key={b} style={styles.bucketBtn} onPress={() => handlePickBucket(b)} activeOpacity={0.8}>
                      <Text style={styles.bucketBtnText}>{BUCKET_LABELS[b]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Reseña (opcional)</Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="¿Qué te pareció?"
                  placeholderTextColor="#555555"
                  value={review}
                  onChangeText={setReview}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </>
            )}

            {step === 'saving' && (
              <View style={styles.savingBox}>
                <ActivityIndicator size="large" color="#A855F7" />
                <Text style={styles.savingText}>Comparando con tus otras calificaciones...</Text>
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const { feed, loadingFeed, loadFeed } = useRatingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [localLiked, setLocalLiked] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFeed();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const toggleLike = (id: string) => {
    setLocalLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderItem = ({ item }: { item: FeedEntry }) => (
    <FeedCard entry={item} liked={localLiked.has(item.rating.id)} onToggleLike={toggleLike} />
  );

  const ListEmpty = () =>
    loadingFeed ? (
      <View style={styles.empty}>
        <ActivityIndicator color="#A855F7" />
      </View>
    ) : (
      <View style={styles.empty}>
        <Ionicons name="musical-notes-outline" size={56} color="#2A2A2A" />
        <Text style={styles.emptyTitle}>El feed está vacío</Text>
        <Text style={styles.emptySubtitle}>Sé el primero en calificar algo, o sigue a gente con tu mismo gusto musical.</Text>
      </View>
    );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>Sonet</Text>
        <TouchableOpacity activeOpacity={0.7} hitSlop={12}>
          <Ionicons name="notifications-outline" size={22} color="#666666" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.rating.id}
        renderItem={renderItem}
        ListEmptyComponent={<ListEmpty />}
        contentContainerStyle={feed.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#A855F7" />}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setRateModalVisible(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <RateModal visible={rateModalVisible} onClose={() => setRateModalVisible(false)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  logo: { fontSize: 24, fontWeight: '700', color: '#A855F7' },

  listContent: { paddingVertical: 8, paddingBottom: 100 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12, marginTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  emptySubtitle: { fontSize: 14, color: '#666666', textAlign: 'center', lineHeight: 20 },

  card: { backgroundColor: '#1A1A1A', borderRadius: 12, marginHorizontal: 16, marginVertical: 6, padding: 16 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  contentRow: { marginTop: 12, alignItems: 'flex-start' },

  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  userCol: { flex: 1 },
  displayName: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  userMeta: { color: '#666666', fontSize: 13, marginTop: 1 },

  cover: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  coverInitial: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },

  contentCol: { flex: 1 },
  contentName: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  artistName: { color: '#888888', fontSize: 13, marginTop: 2 },
  contentType: { color: '#555555', fontSize: 11, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  scoreBadge: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  scoreText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  review: { color: '#888888', fontSize: 14, fontStyle: 'italic', marginTop: 10, lineHeight: 20 },

  actionsRow: { flexDirection: 'row', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#242424' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likeCount: { color: '#666666', fontSize: 13, fontWeight: '500' },
  likeCountActive: { color: '#F43F5E' },

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

  modalContainer: { flex: 1, backgroundColor: '#0D0D0D' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
  modalScroll: { flex: 1 },

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
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15 },
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

  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  catalogCover: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catalogInitial: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  catalogInfo: { flex: 1 },
  catalogName: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  catalogArtist: { color: '#666666', fontSize: 12, marginTop: 2 },

  manualEntry: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14 },
  manualText: { color: '#A855F7', fontSize: 14 },

  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
  },
  selectedCover: { width: 52, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  selectedInitial: { color: '#FFFFFF', fontWeight: '700', fontSize: 20 },
  selectedInfo: { flex: 1 },
  selectedName: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  selectedArtist: { color: '#888888', fontSize: 13, marginTop: 2 },

  bucketGrid: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 4 },
  bucketBtn: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bucketBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, textAlign: 'center' },

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
    marginBottom: 40,
  },

  savingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 16 },
  savingText: { color: '#888888', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
});
