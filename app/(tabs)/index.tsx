import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMusicStore } from '@/stores/musicStore';
import { useAuthStore } from '@/stores/authStore';
import { useRatingStore } from '@/stores/ratingStore';
import type { EmojiType } from '@/stores/ratingStore';
import { searchSpotify } from '@/lib/spotify';
import { FeedRatingCard } from '@/components/rating/FeedRatingCard';
import { RateModal } from '@/components/rating/RateModal';
import { SongOfTheDay } from '@/components/recommendations/SongOfTheDay';
import { Colors, Spacing } from '@/constants/colors';
import type { FeedItem } from '@/types';

type MainTab = 'feed' | 'diario';
type EloChoice = 'left' | 'right' | null;

interface SearchResult {
  id: string;
  name: string;
  artist: string;
  imageUrl: string;
  type: 'track' | 'album';
  album: string;
}

// Palette of colors for initial-circle fallback
const INITIAL_COLORS = ['#A855F7', '#84CC16', '#F43F5E', '#3B82F6', '#F59E0B', '#10B981'];
function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % INITIAL_COLORS.length;
  return INITIAL_COLORS[hash];
}

function DiarioTab() {
  const router = useRouter();
  const { spotifyToken } = useAuthStore();
  const { ratings, loadRatings, addRating, getTopRated, getRatingForContent } = useRatingStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedContent, setSelectedContent] = useState<SearchResult | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<EmojiType | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [eloChoice, setEloChoice] = useState<EloChoice>(null);

  useEffect(() => {
    loadRatings();
  }, []);

  // Debounced Spotify search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      if (!spotifyToken) return;
      setIsSearching(true);
      try {
        const [trackData, albumData] = await Promise.all([
          searchSpotify(spotifyToken, searchQuery, ['track'], 6),
          searchSpotify(spotifyToken, searchQuery, ['album'], 4),
        ]);
        const tracks: SearchResult[] = (trackData?.tracks?.items ?? []).map((t: any) => ({
          id: t.id,
          name: t.name,
          artist: t.artists?.[0]?.name ?? '',
          imageUrl: t.album?.images?.[0]?.url ?? '',
          type: 'track' as const,
          album: t.album?.name ?? '',
        }));
        const albums: SearchResult[] = (albumData?.albums?.items ?? []).map((a: any) => ({
          id: a.id,
          name: a.name,
          artist: a.artists?.[0]?.name ?? '',
          imageUrl: a.images?.[0]?.url ?? '',
          type: 'album' as const,
          album: a.name,
        }));
        setSearchResults([...tracks, ...albums].slice(0, 8));
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, spotifyToken]);

  const submitRating = async () => {
    if (!selectedContent || !selectedEmoji) return;
    const scoreMap: Record<EmojiType, number> = { love: 9, like: 7, meh: 4 };
    await addRating({
      contentId: selectedContent.id,
      contentName: selectedContent.name,
      artistName: selectedContent.artist,
      imageUrl: selectedContent.imageUrl,
      contentType: selectedContent.type,
      score: scoreMap[selectedEmoji],
      emoji: selectedEmoji,
    });
    setSelectedContent(null);
    setSelectedEmoji(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const top = getTopRated(10);
  const eloItems = getTopRated(2);
  const showElo = eloItems.length >= 2;

  return (
    <ScrollView
      style={styles.diarioScroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.diarioContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* No Spotify token banner */}
      {!spotifyToken && (
        <View style={styles.connectBanner}>
          <Text style={styles.connectBannerText}>
            Para buscar y calificar música, conecta Spotify desde la pantalla de login
          </Text>
          <TouchableOpacity
            style={styles.connectBannerBtn}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.connectBannerBtnText}>Ir al login</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search section */}
      <View style={styles.searchWrapper}>
        {spotifyToken ? (
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color="#666666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Busca canciones o álbumes..."
              placeholderTextColor="#666666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {isSearching && (
              <ActivityIndicator size="small" color="#A855F7" style={styles.searchSpinner} />
            )}
          </View>
        ) : (
          <View style={[styles.searchRow, styles.searchRowDisabled]}>
            <Ionicons name="search" size={18} color="#444444" style={styles.searchIcon} />
            <Text style={styles.searchDisabledText}>Conecta Spotify para buscar música</Text>
          </View>
        )}

        {searchResults.length > 0 && (
          <View style={styles.resultsBox}>
            {searchResults.map((item) => {
              const alreadyRated = !!getRatingForContent(item.id);
              const fallbackColor = colorForId(item.id);
              const initial = item.name.charAt(0).toUpperCase();
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.resultRow}
                  onPress={() => {
                    setSelectedContent(item);
                    setSelectedEmoji(null);
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                  activeOpacity={0.7}
                >
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.resultImage} />
                  ) : (
                    <View style={[styles.resultCircle, { backgroundColor: fallbackColor }]}>
                      <Text style={styles.resultInitial}>{initial}</Text>
                    </View>
                  )}
                  <View style={styles.resultInfo}>
                    <View style={styles.resultNameRow}>
                      <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                      {alreadyRated && (
                        <Ionicons name="checkmark-circle" size={14} color="#A855F7" style={{ marginLeft: 4 }} />
                      )}
                    </View>
                    <Text style={styles.resultMeta} numberOfLines={1}>
                      {item.artist} · {item.type === 'track' ? 'Canción' : 'Álbum'}
                    </Text>
                  </View>
                  <View style={styles.resultAdd}>
                    <Text style={styles.resultAddText}>+</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Selected content rating */}
      {selectedContent && (
        <View style={styles.selectedSection}>
          <View style={styles.selectedHeader}>
            {selectedContent.imageUrl ? (
              <Image source={{ uri: selectedContent.imageUrl }} style={styles.selectedImage} />
            ) : (
              <View style={[styles.selectedCircle, { backgroundColor: colorForId(selectedContent.id) }]}>
                <Text style={styles.selectedInitial}>{selectedContent.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedName} numberOfLines={1}>{selectedContent.name}</Text>
              <Text style={styles.selectedMeta} numberOfLines={1}>{selectedContent.artist}</Text>
            </View>
          </View>

          <View style={styles.moodRow}>
            {(
              [
                { key: 'love' as EmojiType, label: '🔥 Me encantó' },
                { key: 'like' as EmojiType, label: '😊 Estuvo bien' },
                { key: 'meh' as EmojiType, label: '😞 No fue lo mío' },
              ]
            ).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.moodBtn, selectedEmoji === key && styles.moodBtnActive]}
                onPress={() => setSelectedEmoji(key)}
                activeOpacity={0.7}
              >
                <Text style={styles.moodBtnText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, !selectedEmoji && styles.saveBtnDisabled]}
            onPress={submitRating}
            disabled={!selectedEmoji}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>Guardar calificación</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Elo comparison */}
      {showElo && (
        <View style={styles.eloSection}>
          <Text style={styles.eloTitle}>¿CUÁL PREFIERES?</Text>
          <View style={styles.eloRow}>
            {([
              { item: eloItems[0], side: 'left' as EloChoice },
              { item: eloItems[1], side: 'right' as EloChoice },
            ]).map(({ item, side }) => {
              const fallbackColor = colorForId(item.id);
              const initial = item.contentName.charAt(0).toUpperCase();
              return (
                <TouchableOpacity
                  key={side}
                  style={[
                    styles.eloCard,
                    { backgroundColor: fallbackColor + '33' },
                    eloChoice === side && styles.eloCardActive,
                  ]}
                  onPress={() => setEloChoice(side)}
                  activeOpacity={0.8}
                >
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.eloImage} />
                  ) : (
                    <Text style={styles.eloInitial}>{initial}</Text>
                  )}
                  <Text style={styles.eloName} numberOfLines={2}>{item.contentName}</Text>
                  <Text style={styles.eloArtist}>{item.artistName}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Top calificaciones */}
      <View style={styles.topSection}>
        <Text style={styles.topTitle}>TU TOP CALIFICACIONES</Text>
        {top.length === 0 ? (
          <Text style={styles.topEmpty}>Aún no calificaste nada · busca una canción arriba</Text>
        ) : (
          top.map((item, index) => {
            const rank = String(index + 1).padStart(2, '0');
            const fallbackColor = colorForId(item.id);
            const initial = item.contentName.charAt(0).toUpperCase();
            return (
              <View key={item.id} style={styles.topRow}>
                <Text style={styles.topRank}>{rank}</Text>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.topImage} />
                ) : (
                  <View style={[styles.topCircle, { backgroundColor: fallbackColor }]}>
                    <Text style={styles.topInitial}>{initial}</Text>
                  </View>
                )}
                <View style={styles.topInfo}>
                  <Text style={styles.topName} numberOfLines={1}>{item.contentName}</Text>
                  <Text style={styles.topArtist} numberOfLines={1}>{item.artistName}</Text>
                </View>
                <Text style={styles.topScore}>{item.score.toFixed(1)}</Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

export default function FeedScreen() {
  const { feed, loadingFeed, fetchFeed } = useMusicStore();
  const [activeTab, setActiveTab] = useState<MainTab>('feed');
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Sonet</Text>
        <Ionicons name="notifications-outline" size={22} color="#666666" />
      </View>

      {/* Segment control */}
      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'feed' && styles.segmentActive]}
          onPress={() => setActiveTab('feed')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, activeTab === 'feed' && styles.segmentTextActive]}>
            Feed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'diario' && styles.segmentActive]}
          onPress={() => setActiveTab('diario')}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.segmentText, activeTab === 'diario' && styles.segmentTextActive]}
          >
            Diario
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'feed' && (
        <>
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
        </>
      )}

      {activeTab === 'diario' && <DiarioTab />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  logo: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },

  // Segment control
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: '#A855F7' },
  segmentText: { color: '#A0A0A0', fontWeight: '600', fontSize: 14 },
  segmentTextActive: { color: '#FFFFFF' },

  // Feed
  listContent: { paddingVertical: Spacing.sm },
  emptyContainer: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  emptySubtitle: { fontSize: 14, color: '#A0A0A0', textAlign: 'center', lineHeight: 20 },

  // Diario
  diarioScroll: { flex: 1 },
  diarioContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },

  // Connect Spotify banner
  connectBanner: {
    backgroundColor: '#1A0A2E',
    borderWidth: 1,
    borderColor: '#A855F7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  connectBannerText: { color: '#A0A0A0', fontSize: 13, lineHeight: 18 },
  connectBannerBtn: {
    backgroundColor: '#A855F7',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  connectBannerBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // Search
  searchWrapper: { marginBottom: 20 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
  },
  searchRowDisabled: { opacity: 0.5 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  searchDisabledText: { flex: 1, color: '#444444', fontSize: 15 },
  searchSpinner: { marginLeft: 8 },
  resultsBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginTop: 4,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  resultCircle: {
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultInitial: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  resultInfo: { flex: 1 },
  resultNameRow: { flexDirection: 'row', alignItems: 'center' },
  resultName: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, flexShrink: 1 },
  resultMeta: { color: '#666666', fontSize: 12, marginTop: 2 },
  resultAdd: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  resultAddText: { color: '#A855F7', fontSize: 22, fontWeight: '300' },

  // Selected content
  selectedSection: { marginBottom: 24 },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  selectedImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    marginRight: 12,
  },
  selectedCircle: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedInitial: { color: '#FFFFFF', fontWeight: '800', fontSize: 20 },
  selectedInfo: { flex: 1 },
  selectedName: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  selectedMeta: { color: '#666666', fontSize: 13, marginTop: 2 },
  moodRow: { flexDirection: 'column', gap: 8 },
  moodBtn: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  moodBtnActive: { backgroundColor: '#1A0A2E', borderColor: '#A855F7' },
  moodBtnText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center' },
  saveBtn: {
    marginTop: 12,
    backgroundColor: '#A855F7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#3D1A6B', opacity: 0.5 },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  // Elo comparison
  eloSection: { marginBottom: 28 },
  eloTitle: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  eloRow: { flexDirection: 'row', gap: 12 },
  eloCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  eloCardActive: { borderColor: '#A855F7', borderWidth: 3 },
  eloImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginBottom: 8,
  },
  eloInitial: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', marginBottom: 8 },
  eloName: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  eloArtist: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4, textAlign: 'center' },

  // Top ratings
  topSection: { marginBottom: 8 },
  topTitle: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  topEmpty: { color: '#666666', fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  topRank: { color: '#666666', fontWeight: '700', fontSize: 14, width: 28 },
  topImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  topCircle: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topInitial: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  topInfo: { flex: 1 },
  topName: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  topArtist: { color: '#666666', fontSize: 12, marginTop: 2 },
  topScore: { color: '#A855F7', fontWeight: '700', fontSize: 15 },
});
