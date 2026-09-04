import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useChatStore, type ChatMessage, type SharedSong } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { searchMusic, type MusicItem } from '@/lib/musicDB';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { ReportModal } from '@/components/safety/ReportModal';
import { blockUser, isBlocked } from '@/lib/blocking';

// ─── Song-share bubble ──────────────────────────────────────────────────────

function SongShareBubble({ song, mine }: { song: SharedSong; mine: boolean }) {
  const player = useAudioPlayer(song.preview_url ?? null);
  const status = useAudioPlayerStatus(player);

  return (
    <View style={[styles.songCard, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
      {song.cover_image ? (
        <Image source={{ uri: song.cover_image }} style={styles.songCover} />
      ) : (
        <View style={[styles.songCover, styles.songCoverFallback]}>
          <Ionicons name="musical-note" size={20} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.songInfo}>
        <Text style={styles.songName} numberOfLines={1}>{song.name}</Text>
        <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
      </View>
      <TouchableOpacity
        onPress={() => (status.playing ? player.pause() : player.play())}
        disabled={!song.preview_url}
        hitSlop={8}
      >
        <Ionicons
          name={status.playing ? 'pause-circle' : 'play-circle'}
          size={30}
          color={song.preview_url ? Colors.primary : Colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

// ─── Song search modal (attach to outgoing message) ────────────────────────

function SongSearchModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (song: SharedSong) => void;
}) {
  const { spotifyToken } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicItem[]>([]);
  const [searching, setSearching] = useState(false);

  const runSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const items = await searchMusic({
        query: q,
        types: ['song'],
        accessToken: spotifyToken ?? undefined,
        limit: 10,
      });
      setResults(items);
    } catch {
      setResults([]);
    }
    setSearching(false);
  };

  const handlePick = (item: MusicItem) => {
    onPick({
      id: item.id,
      name: item.name,
      artist: item.artist_name,
      preview_url: item.preview_url ?? null,
      cover_image: item.cover_image,
    });
    setQuery('');
    setResults([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Compartir canción</Text>
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
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: Spacing.md }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultRow} onPress={() => handlePick(item)} activeOpacity={0.7}>
              {item.cover_image ? (
                <Image source={{ uri: item.cover_image }} style={styles.songCover} />
              ) : (
                <View style={[styles.songCover, styles.songCoverFallback]}>
                  <Ionicons name="musical-note" size={18} color={Colors.textMuted} />
                </View>
              )}
              <View style={styles.songInfo}>
                <Text style={styles.songName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.songArtist} numberOfLines={1}>{item.artist_name}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

export default function ChatThreadScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuthStore();
  const {
    messages,
    loadingMessages,
    loadMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
    sendMessage,
    sendSongShare,
  } = useChatStore();

  const [otherName, setOtherName] = useState('Chat');
  const [otherId, setOtherId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [songSearchVisible, setSongSearchVisible] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (!conversationId || !user?.id) return;
    loadMessages(conversationId);
    subscribeToMessages(conversationId);

    supabase
      .from('conversations')
      .select('participants')
      .eq('id', conversationId)
      .maybeSingle()
      .then(async ({ data }) => {
        const other = data?.participants?.find((p: string) => p !== user.id);
        if (!other) return;
        setOtherId(other);
        const [{ data: otherUser }, blockedByMe] = await Promise.all([
          supabase.from('users').select('display_name').eq('id', other).maybeSingle(),
          isBlocked(user.id, other),
        ]);
        if (otherUser?.display_name) setOtherName(otherUser.display_name);
        setBlocked(blockedByMe);
      });

    return () => unsubscribeFromMessages();
  }, [conversationId, user?.id]);

  const handleBlock = () => {
    if (!user?.id || !otherId) return;
    Alert.alert('¿Bloquear a esta persona?', 'No podrán escribirte más.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear',
        style: 'destructive',
        onPress: async () => {
          const ok = await blockUser(user.id, otherId);
          if (ok) setBlocked(true);
          else Alert.alert('Error', 'No se pudo bloquear. Intenta de nuevo.');
        },
      },
    ]);
  };

  const openMoreMenu = () => {
    Alert.alert(otherName, undefined, [
      { text: 'Reportar', onPress: () => setReportVisible(true) },
      { text: 'Bloquear', style: 'destructive', onPress: handleBlock },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleSend = async () => {
    if (!conversationId || !user?.id || !draft.trim()) return;
    const content = draft.trim();
    setDraft('');
    await sendMessage(conversationId, user.id, content);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleShareSong = async (song: SharedSong) => {
    if (!conversationId || !user?.id) return;
    await sendSongShare(conversationId, user.id, song);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.sender_id === user?.id;
    if (item.message_type === 'song_share' && item.metadata?.song) {
      return (
        <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
          <SongShareBubble song={item.metadata.song} mine={mine} />
        </View>
      );
    }
    return (
      <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={styles.bubbleText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{otherName}</Text>
        <TouchableOpacity onPress={openMoreMenu} hitSlop={12}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {loadingMessages ? (
          <View style={styles.centered}><ActivityIndicator color={Colors.primary} /></View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: Spacing.md }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {blocked ? (
          <View style={styles.blockedBar}>
            <Text style={styles.blockedText}>Bloqueaste a esta persona — ya no pueden escribirse.</Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TouchableOpacity onPress={() => setSongSearchVisible(true)} hitSlop={12}>
              <Ionicons name="musical-notes-outline" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={Colors.textMuted}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={handleSend}
              multiline
            />
            <TouchableOpacity onPress={handleSend} disabled={!draft.trim()} hitSlop={12}>
              <Ionicons name="send" size={22} color={draft.trim() ? Colors.primary : Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {otherId && (
        <ReportModal visible={reportVisible} onClose={() => setReportVisible(false)} targetType="user" targetId={otherId} />
      )}
      <SongSearchModal visible={songSearchVisible} onClose={() => setSongSearchVisible(false)} onPick={handleShareSong} />
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
  title: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1, textAlign: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  bubbleRow: { marginVertical: 4, alignItems: 'flex-start' },
  bubbleRowMine: { alignItems: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  bubbleTheirs: { backgroundColor: Colors.surface },
  bubbleMine: { backgroundColor: Colors.primaryDark },
  bubbleText: { color: Colors.text, fontSize: 14, lineHeight: 19 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
    maxHeight: 100,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    maxWidth: '82%',
    borderRadius: Radius.lg,
    padding: Spacing.sm,
  },
  songCover: { width: 44, height: 44, borderRadius: Radius.sm },
  songCoverFallback: { backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  songInfo: { flex: 1, minWidth: 0 },
  songName: { color: Colors.text, fontSize: 13.5, fontWeight: '700' },
  songArtist: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 46,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 10,
  },

  blockedBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  blockedText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
});
