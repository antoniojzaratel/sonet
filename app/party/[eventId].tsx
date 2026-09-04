import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useListeningPartyStore, type PartyTrack } from '@/stores/listeningPartyStore';
import { searchMusic, type MusicItem } from '@/lib/musicDB';
import { supabase } from '@/lib/supabase';

// Previews are Spotify's ~30s clips — a late joiner past that window just
// hears silence at the end rather than the seek throwing, so clamp here.
const PREVIEW_DURATION_S = 29;

function elapsedSeconds(startedAt: string | null): number {
  if (!startedAt) return 0;
  const s = (Date.now() - new Date(startedAt).getTime()) / 1000;
  return Math.max(0, Math.min(s, PREVIEW_DURATION_S));
}

function SearchModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (item: MusicItem, mode: 'now' | 'queue') => void;
}) {
  const { spotifyToken } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicItem[]>([]);
  const [searching, setSearching] = useState(false);

  const runSearch = useCallback(
    async (q: string) => {
      setQuery(q);
      if (!q.trim()) return setResults([]);
      setSearching(true);
      try {
        const items = await searchMusic({ query: q, types: ['song'], accessToken: spotifyToken ?? undefined, limit: 12 });
        setResults(items);
      } catch {
        setResults([]);
      }
      setSearching(false);
    },
    [spotifyToken]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.searchModal} edges={['top']}>
        <View style={styles.searchModalHeader}>
          <Text style={styles.searchModalTitle}>Agregar canción</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Busca una canción..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={runSearch}
            autoFocus
          />
          {searching && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>
        <ScrollView>
          {results.map((item) => (
            <View key={item.id} style={styles.resultRow}>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.resultArtist} numberOfLines={1}>{item.artist_name}</Text>
              </View>
              <TouchableOpacity style={styles.resultBtn} onPress={() => onPick(item, 'now')}>
                <Text style={styles.resultBtnText}>Reproducir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.resultBtn, styles.resultBtnGhost]} onPress={() => onPick(item, 'queue')}>
                <Ionicons name="add" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function ListeningPartyScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { state, attendees, loading, loadParty, subscribe, unsubscribe, playNow, addToQueue, playNext } = useListeningPartyStore();

  const [eventTitle, setEventTitle] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const lastTrackId = useRef<string | null | undefined>(undefined);

  const player = useAudioPlayer(state?.preview_url ?? null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!eventId) return;
    supabase.from('events').select('title').eq('id', eventId).maybeSingle().then(({ data }) => {
      if (data) setEventTitle(data.title);
    });
    loadParty(eventId);
    subscribe(eventId);
    return () => unsubscribe();
  }, [eventId]);

  // Sync playback to the shared clock whenever the current track changes,
  // or once this player's clip finishes loading.
  useEffect(() => {
    if (!state?.preview_url || !status.isLoaded) return;
    if (lastTrackId.current === state.track_id && status.playing) return; // already caught up
    lastTrackId.current = state.track_id;
    player.seekTo(elapsedSeconds(state.started_at)).then(() => player.play());
  }, [state?.track_id, state?.preview_url, status.isLoaded]);

  const handlePick = async (item: MusicItem, mode: 'now' | 'queue') => {
    if (!eventId) return;
    const t: PartyTrack = {
      track_id: item.id,
      name: item.name,
      artist: item.artist_name,
      cover_image: item.cover_image,
      preview_url: item.preview_url ?? null,
      added_by: user?.id,
    };
    if (mode === 'now') await playNow(eventId, t);
    else await addToQueue(eventId, t);
    setSearchVisible(false);
  };

  if (loading || !eventId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#2A0F3D', Colors.background]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{eventTitle || 'Listening Party'}</Text>
          <Text style={styles.headerSubtitle}>{attendees.length} escuchando</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {state?.track_id ? (
          <View style={styles.nowPlaying}>
            {state.cover_image ? (
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.cover}>
                <Ionicons name="musical-notes" size={40} color="#fff" />
              </LinearGradient>
            ) : (
              <View style={[styles.cover, styles.coverFallback]}>
                <Ionicons name="musical-notes" size={40} color="#fff" />
              </View>
            )}
            <Text style={styles.trackName} numberOfLines={2}>{state.track_name}</Text>
            <Text style={styles.trackArtist}>{state.artist_name}</Text>
            {!state.preview_url && <Text style={styles.noPreview}>Sin preview disponible — solo lectura</Text>}
          </View>
        ) : (
          <View style={styles.nowPlaying}>
            <Ionicons name="musical-notes-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Nada sonando todavía</Text>
          </View>
        )}

        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.controlBtn} onPress={() => setSearchVisible(true)} activeOpacity={0.85}>
            <Ionicons name="search" size={18} color="#fff" />
            <Text style={styles.controlBtnText}>Buscar canción</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, styles.controlBtnGhost]}
            onPress={() => eventId && playNext(eventId)}
            activeOpacity={0.85}
          >
            <Ionicons name="play-skip-forward" size={18} color={Colors.primary} />
            <Text style={[styles.controlBtnText, { color: Colors.primary }]}>Siguiente</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>En la cola ({state?.queue.length ?? 0})</Text>
        {(state?.queue ?? []).length === 0 ? (
          <Text style={styles.emptyText}>Nadie ha agregado nada — busca una canción arriba.</Text>
        ) : (
          state!.queue.map((t, i) => (
            <View key={`${t.track_id}-${i}`} style={styles.queueRow}>
              <Text style={styles.queueIndex}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.queueName} numberOfLines={1}>{t.name}</Text>
                <Text style={styles.queueArtist} numberOfLines={1}>{t.artist}</Text>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionLabel}>Escuchando</Text>
        <View style={styles.attendeesRow}>
          {attendees.map((a) => (
            <View key={a.user_id} style={styles.attendeeChip}>
              <Text style={styles.attendeeChipText}>{a.display_name}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <SearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} onPick={handlePick} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  headerSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg },

  nowPlaying: { alignItems: 'center', gap: 6, paddingVertical: Spacing.lg },
  cover: { width: 140, height: 140, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  coverFallback: { backgroundColor: Colors.surfaceElevated },
  trackName: { color: Colors.text, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  trackArtist: { color: Colors.textSecondary, fontSize: 14 },
  noPreview: { color: Colors.warning, fontSize: 12, marginTop: 4 },
  emptyText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },

  controlsRow: { flexDirection: 'row', gap: Spacing.sm },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 13,
  },
  controlBtnGhost: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  controlBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  sectionLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: Spacing.sm },

  queueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8 },
  queueIndex: { color: Colors.textMuted, fontSize: 13, fontWeight: '700', width: 20 },
  queueName: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  queueArtist: { color: Colors.textMuted, fontSize: 12 },

  attendeesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attendeeChip: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingVertical: 6, paddingHorizontal: 12 },
  attendeeChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },

  searchModal: { flex: 1, backgroundColor: Colors.background },
  searchModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg },
  searchModalTitle: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.lg, paddingVertical: 10 },
  resultInfo: { flex: 1 },
  resultName: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  resultArtist: { color: Colors.textMuted, fontSize: 12 },
  resultBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: 7, paddingHorizontal: 12 },
  resultBtnGhost: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 9 },
  resultBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
