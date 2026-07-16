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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '@/stores/musicStore';
import { FeedRatingCard } from '@/components/rating/FeedRatingCard';
import { RateModal } from '@/components/rating/RateModal';
import { SongOfTheDay } from '@/components/recommendations/SongOfTheDay';
import { Colors, Spacing } from '@/constants/colors';
import type { FeedItem } from '@/types';

type MainTab = 'feed' | 'diario';
type EloChoice = 'left' | 'right' | null;
type MoodChoice = 'liked' | 'ok' | 'disliked' | null;

interface AlbumMock {
  name: string;
  artist: string;
  year: string;
  initial: string;
  color: string;
}

const SEARCH_RESULTS: AlbumMock[] = [
  { name: 'GÉNESIS', artist: 'Peso Pluma', year: '2023', initial: 'G', color: '#A855F7' },
  { name: 'Un Verano Sin Ti', artist: 'Bad Bunny', year: '2022', initial: 'V', color: '#84CC16' },
];

const TOP_ALBUMS = [
  { rank: '01', name: 'Un Verano Sin Ti', artist: 'Bad Bunny', color: '#84CC16', initial: 'V', score: '9.6' },
  { rank: '02', name: 'AM', artist: 'Arctic Monkeys', color: '#F43F5E', initial: 'AM', score: '9.1' },
  { rank: '03', name: 'GÉNESIS', artist: 'Peso Pluma', color: '#A855F7', initial: 'G', score: '8.9' },
];

const ELO_LEFT: AlbumMock = { name: 'GÉNESIS', artist: 'Peso Pluma', initial: 'G', color: '#A855F7', year: '2023' };
const ELO_RIGHT: AlbumMock = { name: 'Aztlán', artist: 'Zoé', initial: 'A', color: '#F43F5E', year: '2021' };

function DiarioTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumMock | null>(null);
  const [moodChoice, setMoodChoice] = useState<MoodChoice>(null);
  const [eloChoice, setEloChoice] = useState<EloChoice>(null);

  const showResults = searchQuery.length > 0;
  const filteredResults = SEARCH_RESULTS.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.artist.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelectAlbum = (album: AlbumMock) => {
    setSelectedAlbum(album);
    setSearchQuery('');
    setMoodChoice(null);
  };

  return (
    <ScrollView
      style={styles.diarioScroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.diarioContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Search section */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#666666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Agrega un álbum..."
            placeholderTextColor="#666666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {showResults && (
          <View style={styles.resultsBox}>
            {filteredResults.map((album) => (
              <TouchableOpacity
                key={album.name}
                style={styles.resultRow}
                onPress={() => handleSelectAlbum(album)}
                activeOpacity={0.7}
              >
                <View style={[styles.resultCircle, { backgroundColor: album.color }]}>
                  <Text style={styles.resultInitial}>{album.initial}</Text>
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{album.name}</Text>
                  <Text style={styles.resultMeta}>
                    {album.artist} · {album.year}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.resultAdd}
                  onPress={() => handleSelectAlbum(album)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resultAddText}>+</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Selected album rating */}
      {selectedAlbum && (
        <View style={styles.selectedSection}>
          <View style={styles.selectedHeader}>
            <View style={[styles.selectedCircle, { backgroundColor: selectedAlbum.color }]}>
              <Text style={styles.selectedInitial}>{selectedAlbum.initial}</Text>
            </View>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedName}>{selectedAlbum.name}</Text>
              <Text style={styles.selectedMeta}>
                {selectedAlbum.artist} · {selectedAlbum.year}
              </Text>
            </View>
          </View>

          <View style={styles.moodRow}>
            {(
              [
                { key: 'liked', label: '🔥 Me gustó' },
                { key: 'ok', label: '😊 Estuvo bien' },
                { key: 'disliked', label: '😞 No fue lo mío' },
              ] as { key: MoodChoice; label: string }[]
            ).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.moodBtn,
                  moodChoice === key && styles.moodBtnActive,
                ]}
                onPress={() => setMoodChoice(key)}
                activeOpacity={0.7}
              >
                <Text style={styles.moodBtnText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Elo comparison */}
      <View style={styles.eloSection}>
        <Text style={styles.eloTitle}>¿CUÁL PREFIERES?</Text>
        <View style={styles.eloRow}>
          {([{ album: ELO_LEFT, side: 'left' }, { album: ELO_RIGHT, side: 'right' }] as {
            album: AlbumMock;
            side: EloChoice;
          }[]).map(({ album, side }) => (
            <TouchableOpacity
              key={side}
              style={[
                styles.eloCard,
                { backgroundColor: album.color + '33' },
                eloChoice === side && styles.eloCardActive,
              ]}
              onPress={() => setEloChoice(side)}
              activeOpacity={0.8}
            >
              <Text style={styles.eloInitial}>{album.initial}</Text>
              <Text style={styles.eloName} numberOfLines={2}>
                {album.name}
              </Text>
              <Text style={styles.eloArtist}>{album.artist}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Top álbumes */}
      <View style={styles.topSection}>
        <Text style={styles.topTitle}>TU TOP DE ÁLBUMES</Text>
        {TOP_ALBUMS.map((item) => (
          <View key={item.rank} style={styles.topRow}>
            <Text style={styles.topRank}>{item.rank}</Text>
            <View style={[styles.topCircle, { backgroundColor: item.color }]}>
              <Text style={styles.topInitial}>{item.initial}</Text>
            </View>
            <View style={styles.topInfo}>
              <Text style={styles.topName}>{item.name}</Text>
              <Text style={styles.topArtist}>{item.artist}</Text>
            </View>
            <Text style={styles.topScore}>{item.score}</Text>
          </View>
        ))}
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
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15 },
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
  resultCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultInitial: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  resultInfo: { flex: 1 },
  resultName: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  resultMeta: { color: '#666666', fontSize: 12, marginTop: 2 },
  resultAdd: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  resultAddText: { color: '#A855F7', fontSize: 22, fontWeight: '300' },

  // Selected album
  selectedSection: { marginBottom: 24 },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  selectedCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedInitial: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  selectedInfo: { flex: 1 },
  selectedName: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  selectedMeta: { color: '#666666', fontSize: 13, marginTop: 2 },
  moodRow: { flexDirection: 'row', gap: 8 },
  moodBtn: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  moodBtnActive: { backgroundColor: '#1A0A2E', borderColor: '#A855F7' },
  moodBtnText: { color: '#FFFFFF', fontSize: 13, textAlign: 'center' },

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
  eloInitial: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', marginBottom: 8 },
  eloName: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  eloArtist: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4, textAlign: 'center' },

  // Top albums
  topSection: { marginBottom: 8 },
  topTitle: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  topRank: { color: '#666666', fontWeight: '700', fontSize: 14, width: 28 },
  topCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
