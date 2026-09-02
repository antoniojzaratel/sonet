import { useState, useEffect, useCallback, useRef } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRatingStore } from '@/stores/ratingStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { searchMusic, type MusicItem } from '@/lib/musicDB';
import { CompareDuel, type DuelItem } from '@/components/rating/CompareDuel';
import { BUCKET_LABELS, type Bucket, type Comparator } from '@/lib/ranking';
import type { RatingEntry } from '@/stores/ratingStore';
import { computeMatch } from '@/lib/ai/matchEngine';
import type { MusicVector } from '@/lib/ai/tasteVector';
import type { ContentType } from '@/types';

type MainTab = 'musica' | 'personas';

// --------------- RateModalSheet ---------------

const BUCKETS: Bucket[] = ['liked', 'fine', 'disliked'];

interface RateModalSheetProps {
  item: MusicItem | null;
  onClose: () => void;
}

function RateModalSheet({ item, onClose }: RateModalSheetProps) {
  const { addRating } = useRatingStore();
  const { user } = useAuthStore();
  const [review, setReview] = useState('');
  const [saving, setSaving] = useState(false);
  const [duelPair, setDuelPair] = useState<{ a: DuelItem; b: DuelItem } | null>(null);
  const duelResolveRef = useRef<((winner: 'a' | 'b') => void) | null>(null);

  if (!item) return null;

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

  async function handlePickBucket(bucket: Bucket) {
    if (!item || !user) {
      Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para calificar.');
      return;
    }
    setSaving(true);
    const saved = await addRating({
      userId: user.id,
      contentType: item.type,
      contentId: item.id,
      contentName: item.name,
      artistName: item.artist_name,
      imageUrl: item.cover_image ?? '',
      bucket,
      review: review.trim() || undefined,
      compare,
    });
    setSaving(false);

    if (saved) {
      Alert.alert('Calificado', `"${item.name}" quedó en ${saved.score.toFixed(1)}`);
      handleClose();
    } else {
      Alert.alert('Error', 'No se pudo guardar la calificación');
    }
  }

  function handleClose() {
    setReview('');
    setDuelPair(null);
    duelResolveRef.current = null;
    onClose();
  }

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={!!item} onRequestClose={handleClose}>
      <View style={modalStyles.root}>
        <View style={modalStyles.handle} />

        <View style={modalStyles.header}>
          <Text style={modalStyles.headerTitle}>{duelPair ? '¿Cuál prefieres?' : 'Calificar'}</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {duelPair ? (
          <CompareDuel itemA={duelPair.a} itemB={duelPair.b} onPick={(w) => duelResolveRef.current?.(w)} />
        ) : saving ? (
          <View style={modalStyles.savingBox}>
            <ActivityIndicator size="large" color="#A855F7" />
            <Text style={modalStyles.savingText}>Comparando con tus otras calificaciones...</Text>
          </View>
        ) : (
          <>
            <View style={modalStyles.previewRow}>
              {item.cover_image ? (
                <View style={modalStyles.cover}>
                  <Text style={modalStyles.coverInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
              ) : (
                <View style={[modalStyles.cover, { backgroundColor: '#A855F7' }]}>
                  <Text style={modalStyles.coverInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={modalStyles.previewInfo}>
                <Text style={modalStyles.previewName} numberOfLines={1}>{item.name}</Text>
                <Text style={modalStyles.previewArtist} numberOfLines={1}>{item.artist_name}</Text>
              </View>
            </View>

            <Text style={modalStyles.label}>¿Qué te pareció?</Text>
            <View style={modalStyles.bucketGrid}>
              {BUCKETS.map((b) => (
                <TouchableOpacity key={b} style={modalStyles.bucketBtn} onPress={() => handlePickBucket(b)} activeOpacity={0.8}>
                  <Text style={modalStyles.bucketBtnText}>{BUCKET_LABELS[b]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={modalStyles.label}>Reseña (opcional)</Text>
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
          </>
        )}
      </View>
    </Modal>
  );
}

// --------------- MusicTab ---------------

function MusicTab() {
  const { spotifyToken } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MusicItem | null>(null);

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
          limit: 15,
        });
        setResults(items);
      } catch {
        setResults([]);
      }
      setSearching(false);
    },
    [spotifyToken]
  );

  function renderItem({ item }: { item: MusicItem }) {
    return (
      <View style={styles.catalogRow}>
        <View style={[styles.catalogCover, { backgroundColor: '#A855F7' }]}>
          <Text style={styles.catalogCoverInitial}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.catalogInfo}>
          <Text style={styles.catalogName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.catalogArtist}>{item.artist_name}</Text>
          <Text style={styles.catalogTypeBadge}>{item.type === 'album' ? 'ALBUM' : 'CANCION'}</Text>
        </View>
        <TouchableOpacity style={styles.rateBtn} onPress={() => setSelectedItem(item)} activeOpacity={0.7}>
          <Text style={styles.rateBtnText}>Calificar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#A0A0A0" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar canciones, álbumes..."
          placeholderTextColor="#666666"
          value={query}
          onChangeText={runSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color="#A855F7" />}
        {!searching && query.length > 0 && (
          <TouchableOpacity onPress={() => runSearch('')}>
            <Ionicons name="close-circle" size={18} color="#666666" />
          </TouchableOpacity>
        )}
      </View>

      {!spotifyToken && (
        <Text style={styles.hint}>Conecta Spotify desde tu perfil para buscar canciones y álbumes reales.</Text>
      )}

      {query.trim().length > 0 && (
        <>
          <Text style={styles.sectionLabel}>RESULTADOS</Text>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
            ListEmptyComponent={!searching ? <Text style={styles.emptyText}>Sin resultados</Text> : null}
          />
        </>
      )}

      <RateModalSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
}

// --------------- PeopleTab ---------------

interface PersonRow {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  ratingsCount: number;
  isFollowing: boolean;
  matchScore: number | null;
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

function PeopleTab() {
  const { user } = useAuthStore();
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPeople = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: allUsers }, { data: follows }, { data: myProfile }] = await Promise.all([
      supabase.from('users').select('id, username, display_name, avatar_url, ratings_count').neq('id', user.id).limit(50),
      supabase.from('follows').select('following_id').eq('follower_id', user.id),
      supabase.from('music_profiles').select('feature_vector').eq('user_id', user.id).single(),
    ]);

    const followingIds = new Set((follows ?? []).map((f: any) => f.following_id));
    const myVector = (myProfile?.feature_vector as MusicVector | undefined) ?? null;

    let candidateIds: string[] = [];
    let profilesById: Record<string, MusicVector> = {};
    if (myVector && allUsers?.length) {
      candidateIds = allUsers.map((u: any) => u.id);
      const { data: profiles } = await supabase
        .from('music_profiles')
        .select('user_id, feature_vector')
        .in('user_id', candidateIds);
      profilesById = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p.feature_vector as MusicVector]));
    }

    const rows: PersonRow[] = (allUsers ?? []).map((u: any) => {
      const theirVector = profilesById[u.id];
      const matchScore = myVector && theirVector ? computeMatch(myVector, theirVector).score : null;
      return {
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar_url ?? undefined,
        ratingsCount: u.ratings_count ?? 0,
        isFollowing: followingIds.has(u.id),
        matchScore,
      };
    });

    rows.sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1));

    // Cache freshly computed scores for reuse elsewhere (SoundMatch, etc.)
    if (myVector) {
      const toCache = rows
        .filter((r) => r.matchScore !== null)
        .map((r) => {
          const [userA, userB] = [user.id, r.id].sort();
          return { user_a: userA, user_b: userB, taste_score: r.matchScore! };
        });
      if (toCache.length > 0) {
        await supabase.from('compatibility_scores').upsert(toCache, { onConflict: 'user_a,user_b' });
      }
    }

    setPeople(rows);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  async function toggleFollow(person: PersonRow) {
    if (!user?.id) return;
    setPeople((prev) => prev.map((p) => (p.id === person.id ? { ...p, isFollowing: !p.isFollowing } : p)));

    if (person.isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', person.id);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: person.id });
    }
  }

  function renderUser(person: PersonRow) {
    return (
      <View key={person.id} style={styles.personRow}>
        <View style={[styles.avatar, { backgroundColor: '#A855F7' }]}>
          <Text style={styles.avatarInitials}>{initialsOf(person.displayName)}</Text>
        </View>
        <View style={styles.personInfo}>
          <Text style={styles.personName}>{person.displayName}</Text>
          <Text style={styles.personUsername}>@{person.username}</Text>
          <Text style={styles.personRatings}>
            {person.ratingsCount} calificaciones{person.matchScore !== null ? ` · ${person.matchScore}% match` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.followBtn, person.isFollowing ? styles.followBtnActive : styles.followBtnPrimary]}
          onPress={() => toggleFollow(person)}
          activeOpacity={0.8}
        >
          <Text style={styles.followBtnText}>{person.isFollowing ? 'Siguiendo' : 'Seguir'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#A855F7" />
      </View>
    );
  }

  const following = people.filter((p) => p.isFollowing);
  const discover = people.filter((p) => !p.isFollowing);

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
            {following.length > 0 ? 'DESCUBRIR PERSONAS' : 'GENTE COMPATIBLE'}
          </Text>
          {discover.map(renderUser)}
        </>
      )}
      {people.length === 0 && <Text style={styles.emptyText}>Aún no hay otras personas en Sonet.</Text>}
    </>
  );
}

// --------------- Main Screen ---------------

export default function DiscoverScreen() {
  const [activeTab, setActiveTab] = useState<MainTab>('musica');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Descubrir</Text>

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
  root: { flex: 1, backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  handle: { width: 40, height: 4, backgroundColor: '#444444', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, backgroundColor: '#0D0D0D', borderRadius: 12, padding: 12 },
  cover: { width: 56, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  coverInitial: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  previewInfo: { flex: 1 },
  previewName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  previewArtist: { color: '#A0A0A0', fontSize: 14 },
  label: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  bucketGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  bucketBtn: { flex: 1, backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  bucketBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  reviewInput: { backgroundColor: '#0D0D0D', borderRadius: 8, padding: 12, color: '#FFFFFF', fontSize: 14, minHeight: 72, marginBottom: 24 },
  savingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 16 },
  savingText: { color: '#888888', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
});

// --------------- Screen Styles ---------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', paddingTop: 16, marginBottom: 20 },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  tabPill: { backgroundColor: '#1A1A1A', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  tabPillActive: { backgroundColor: '#A855F7' },
  tabPillText: { color: '#A0A0A0', fontSize: 14, fontWeight: '600' },
  tabPillTextActive: { color: '#FFFFFF' },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12, gap: 8 },
  searchIcon: { marginRight: 2 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },
  hint: { color: '#666666', fontSize: 12, marginBottom: 16, lineHeight: 17 },

  sectionLabel: { fontSize: 11, fontWeight: '600', color: '#666666', letterSpacing: 1.2, marginBottom: 12 },
  emptyText: { color: '#666666', fontSize: 13, paddingVertical: 20, textAlign: 'center' },
  centered: { paddingVertical: 60, alignItems: 'center' },

  catalogRow: { flexDirection: 'row', alignItems: 'center', height: 64, gap: 12 },
  catalogCover: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catalogCoverInitial: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  catalogInfo: { flex: 1 },
  catalogName: { color: '#FFFFFF', fontSize: 15, fontWeight: '500', marginBottom: 2 },
  catalogArtist: { color: '#A0A0A0', fontSize: 13, marginBottom: 2 },
  catalogTypeBadge: { color: '#A855F7', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  rateBtn: { borderWidth: 1, borderColor: '#A855F7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  rateBtnText: { color: '#A855F7', fontSize: 12, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#2A2A2A', marginVertical: 4 },

  personRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarInitials: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  personInfo: { flex: 1 },
  personName: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  personUsername: { color: '#A0A0A0', fontSize: 13, marginBottom: 1 },
  personRatings: { color: '#666666', fontSize: 12 },
  followBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  followBtnPrimary: { backgroundColor: '#A855F7' },
  followBtnActive: { backgroundColor: '#2A2A2A' },
  followBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
});
