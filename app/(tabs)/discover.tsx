import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_USERS, POPULAR_CATALOG, searchCatalog, scoreColor, formatScore } from '@/lib/mockData';
import type { CatalogItem } from '@/lib/mockData';
import { useRatingStore } from '@/stores/ratingStore';

type MainTab = 'musica' | 'personas';

const SCORE_OPTIONS = [
  1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0,
  5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0,
];

// --------------- RateModalSheet ---------------

interface RateModalSheetProps {
  item: CatalogItem | null;
  onClose: () => void;
}

function RateModalSheet({ item, onClose }: RateModalSheetProps) {
  const [score, setScore] = useState(5.0);
  const [review, setReview] = useState('');
  const addRating = useRatingStore((s) => s.addRating);
  const scoreScrollRef = useRef<ScrollView>(null);

  if (!item) return null;

  function handlePublish() {
    if (!item) return;
    addRating({
      contentId: item.id,
      contentName: item.name,
      artistName: item.artist,
      imageUrl: '',
      contentType: item.type === 'album' ? 'album' : 'track',
      score,
      emoji: score >= 7 ? 'love' : score >= 5 ? 'like' : 'meh',
      review: review.trim() || undefined,
    });
    onClose();
    Alert.alert('Calificado', `${item.name} — ${formatScore(score)}`);
  }

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={!!item} onRequestClose={onClose}>
      <View style={modalStyles.root}>
        {/* Handle */}
        <View style={modalStyles.handle} />

        {/* Header */}
        <View style={modalStyles.header}>
          <Text style={modalStyles.headerTitle}>Calificar</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Item preview */}
        <View style={modalStyles.previewRow}>
          <View style={[modalStyles.cover, { backgroundColor: item.coverColor }]}>
            <Text style={modalStyles.coverInitial}>{item.coverInitial}</Text>
          </View>
          <View style={modalStyles.previewInfo}>
            <Text style={modalStyles.previewName} numberOfLines={1}>{item.name}</Text>
            <Text style={modalStyles.previewArtist} numberOfLines={1}>{item.artist}</Text>
          </View>
        </View>

        {/* Score label */}
        <Text style={modalStyles.label}>Tu puntuacion</Text>

        {/* Score display */}
        <Text style={[modalStyles.scoreDisplay, { color: scoreColor(score) }]}>
          {formatScore(score)}
        </Text>

        {/* Score slider */}
        <ScrollView
          ref={scoreScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={modalStyles.scoreRow}
        >
          {SCORE_OPTIONS.map((s) => {
            const selected = s === score;
            return (
              <TouchableOpacity
                key={s}
                style={[
                  modalStyles.scoreChip,
                  selected
                    ? { backgroundColor: scoreColor(s) }
                    : { backgroundColor: '#2A2A2A' },
                ]}
                onPress={() => setScore(s)}
              >
                <Text
                  style={[
                    modalStyles.scoreChipText,
                    { color: selected ? '#FFFFFF' : '#666666', fontWeight: selected ? '700' : '400' },
                  ]}
                >
                  {formatScore(s)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Review */}
        <Text style={modalStyles.label}>Resena (opcional)</Text>
        <TextInput
          style={modalStyles.reviewInput}
          multiline
          numberOfLines={3}
          placeholder="Que te parecio..."
          placeholderTextColor="#666666"
          value={review}
          onChangeText={setReview}
          textAlignVertical="top"
        />

        {/* Publish button */}
        <TouchableOpacity style={modalStyles.publishBtn} activeOpacity={0.85} onPress={handlePublish}>
          <Text style={modalStyles.publishBtnText}>Publicar calificacion</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// --------------- MusicTab ---------------

function MusicTab() {
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);

  const results = query.trim() ? searchCatalog(query) : POPULAR_CATALOG.slice(0, 10);
  const sectionLabel = query.trim() ? 'Resultados' : 'Popular ahora';

  function renderItem({ item }: { item: CatalogItem }) {
    return (
      <View style={styles.catalogRow}>
        <View style={[styles.catalogCover, { backgroundColor: item.coverColor }]}>
          <Text style={styles.catalogCoverInitial}>{item.coverInitial}</Text>
        </View>
        <View style={styles.catalogInfo}>
          <Text style={styles.catalogName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.catalogArtist}>{item.artist}</Text>
          <Text style={styles.catalogTypeBadge}>
            {item.type === 'album' ? 'ALBUM' : 'CANCION'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.rateBtn}
          onPress={() => setSelectedItem(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.rateBtnText}>Calificar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#A0A0A0" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar canciones, albumes, artistas..."
          placeholderTextColor="#666666"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color="#666666" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionLabel}>{sectionLabel.toUpperCase()}</Text>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={false}
      />

      <RateModalSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
}

// --------------- PeopleTab ---------------

function PeopleTab() {
  const [followedIds, setFollowedIds] = useState<Set<string>>(
    () => new Set(MOCK_USERS.filter((u) => u.isFollowing).map((u) => u.id)),
  );

  function toggleFollow(id: string) {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const following = MOCK_USERS.filter((u) => followedIds.has(u.id));
  const discover = MOCK_USERS.filter((u) => !followedIds.has(u.id));

  function renderUser(user: typeof MOCK_USERS[0]) {
    const isFollowing = followedIds.has(user.id);
    return (
      <View key={user.id} style={styles.personRow}>
        <View style={[styles.avatar, { backgroundColor: user.avatarColor }]}>
          <Text style={styles.avatarInitials}>{user.initials}</Text>
        </View>
        <View style={styles.personInfo}>
          <Text style={styles.personName}>{user.displayName}</Text>
          <Text style={styles.personUsername}>@{user.username}</Text>
          <Text style={styles.personRatings}>{user.ratingsCount} calificaciones</Text>
        </View>
        <TouchableOpacity
          style={[styles.followBtn, isFollowing ? styles.followBtnActive : styles.followBtnPrimary]}
          onPress={() => toggleFollow(user.id)}
          activeOpacity={0.8}
        >
          <Text style={[styles.followBtnText, isFollowing ? styles.followBtnTextActive : styles.followBtnTextPrimary]}>
            {isFollowing ? 'Siguiendo' : 'Seguir'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      {following.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>PERSONAS QUE SEGUIS</Text>
          {following.map(renderUser)}
        </>
      )}
      {discover.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, following.length > 0 && { marginTop: 24 }]}>
            DESCUBRIR PERSONAS
          </Text>
          {discover.map(renderUser)}
        </>
      )}
    </>
  );
}

// --------------- Main Screen ---------------

export default function DiscoverScreen() {
  const [activeTab, setActiveTab] = useState<MainTab>('musica');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text style={styles.header}>Descubrir</Text>

        {/* Tab selector */}
        <View style={styles.tabRow}>
          {(['musica', 'personas'] as MainTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabPillText, activeTab === tab && styles.tabPillTextActive]}>
                {tab === 'musica' ? 'Musica' : 'Personas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'musica' ? <MusicTab /> : <PeopleTab />}
      </ScrollView>
    </SafeAreaView>
  );
}

// --------------- Modal Styles ---------------

const modalStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#444444',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    backgroundColor: '#0D0D0D',
    borderRadius: 12,
    padding: 12,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  previewArtist: {
    color: '#A0A0A0',
    fontSize: 14,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  scoreDisplay: {
    fontSize: 64,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
    marginBottom: 24,
  },
  scoreChip: {
    width: 52,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreChipText: {
    fontSize: 13,
  },
  reviewInput: {
    backgroundColor: '#0D0D0D',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 72,
    marginBottom: 24,
  },
  publishBtn: {
    backgroundColor: '#A855F7',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

// --------------- Screen Styles ---------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingTop: 16,
    marginBottom: 20,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  tabPill: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabPillActive: {
    backgroundColor: '#A855F7',
  },
  tabPillText: {
    color: '#A0A0A0',
    fontSize: 14,
    fontWeight: '600',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  // Catalog row
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    gap: 12,
  },
  catalogCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  catalogCoverInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  catalogInfo: {
    flex: 1,
  },
  catalogName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  catalogArtist: {
    color: '#A0A0A0',
    fontSize: 13,
    marginBottom: 2,
  },
  catalogTypeBadge: {
    color: '#A855F7',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  rateBtn: {
    borderWidth: 1,
    borderColor: '#A855F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rateBtnText: {
    color: '#A855F7',
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 4,
  },

  // People
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  personUsername: {
    color: '#A0A0A0',
    fontSize: 13,
    marginBottom: 1,
  },
  personRatings: {
    color: '#666666',
    fontSize: 12,
  },
  followBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  followBtnPrimary: {
    backgroundColor: '#A855F7',
  },
  followBtnActive: {
    backgroundColor: '#2A2A2A',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  followBtnTextPrimary: {
    color: '#FFFFFF',
  },
  followBtnTextActive: {
    color: '#FFFFFF',
  },
});
