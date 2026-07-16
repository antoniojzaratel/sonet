import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';
import { fetchTopTracks, getRecommendations } from '@/lib/spotify';
import { Colors, Spacing, Radius } from '@/constants/colors';

const SOTD_KEY = 'sonet_sotd_v1';
const SOTD_DATE_KEY = 'sonet_sotd_date';

interface SongData {
  id: string;
  name: string;
  artist: string;
  album: string;
  imageUrl: string;
  previewUrl: string | null;
}

const REACTIONS = [
  { emoji: '🔥', label: '¡Fuego!' },
  { emoji: '😊', label: 'Me gusta' },
  { emoji: '😞', label: 'No es lo mío' },
];

export function SongOfTheDay() {
  const { spotifyToken } = useAuthStore();
  const [song, setSong] = useState<SongData | null>(null);
  const [loading, setLoading] = useState(false);
  const [reacted, setReacted] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendation();
  }, [spotifyToken]);

  const loadRecommendation = async () => {
    if (!spotifyToken) return;

    // Check if we already have today's recommendation
    const today = new Date().toDateString();
    const savedDate = await AsyncStorage.getItem(SOTD_DATE_KEY);
    const savedSotd = await AsyncStorage.getItem(SOTD_KEY);

    if (savedDate === today && savedSotd) {
      setSong(JSON.parse(savedSotd));
      return;
    }

    // Fetch fresh recommendation
    setLoading(true);
    try {
      const topTracks = await fetchTopTracks(spotifyToken, 'medium_term', 5);
      const seedIds = topTracks?.items?.map((t: any) => t.id).slice(0, 5) ?? [];

      if (seedIds.length === 0) {
        setLoading(false);
        return;
      }

      const recs = await getRecommendations(spotifyToken, seedIds, 5);
      const track = recs?.tracks?.[0];

      if (track) {
        const songData: SongData = {
          id: track.id,
          name: track.name,
          artist: track.artists?.[0]?.name ?? '',
          album: track.album?.name ?? '',
          imageUrl: track.album?.images?.[0]?.url ?? '',
          previewUrl: track.preview_url ?? null,
        };
        setSong(songData);
        await AsyncStorage.setItem(SOTD_KEY, JSON.stringify(songData));
        await AsyncStorage.setItem(SOTD_DATE_KEY, today);
      }
    } catch {
      // silently fail — no song shown
    }
    setLoading(false);
  };

  const handleReact = (emoji: string) => {
    setReacted(emoji);
    Alert.alert('¡Guardado!', `Marcaste esta canción con ${emoji}`);
  };

  // No Spotify token
  if (!spotifyToken) {
    return (
      <View style={styles.card}>
        <Ionicons name="musical-notes-outline" size={32} color={Colors.textMuted} />
        <Text style={styles.noTokenText}>Conecta Spotify para tu canción del día</Text>
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={Colors.primary} size="small" />
        <Text style={styles.loadingText}>Preparando tu canción del día...</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎵 Canción del día</Text>
        <Text style={styles.subtitle}>Para ti</Text>
      </View>

      {song ? (
        <>
          {/* Song info */}
          <View style={styles.songRow}>
            {song.imageUrl ? (
              <Image source={{ uri: song.imageUrl }} style={styles.artwork} />
            ) : (
              <View style={[styles.artwork, styles.artworkFallback]}>
                <Text style={{ fontSize: 40 }}>🎵</Text>
              </View>
            )}
            <View style={styles.songInfo}>
              <Text style={styles.songName} numberOfLines={2}>{song.name}</Text>
              <Text style={styles.artistName} numberOfLines={1}>{song.artist}</Text>
              {song.album ? (
                <Text style={styles.albumName} numberOfLines={1}>{song.album}</Text>
              ) : null}
            </View>
          </View>

          {/* Reaction buttons */}
          <View style={styles.reactions}>
            {REACTIONS.map((r) => (
              <TouchableOpacity
                key={r.emoji}
                style={[styles.reactionBtn, reacted === r.emoji && styles.reactionBtnActive]}
                onPress={() => handleReact(r.emoji)}
                activeOpacity={0.7}
                disabled={reacted !== null}
              >
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                <Text style={styles.reactionLabel}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.noSongText}>No pudimos cargar una recomendación hoy.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 16,
    alignItems: 'center',
  },
  header: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  songRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 14,
    alignItems: 'center',
  },
  artwork: {
    width: 120,
    height: 120,
    borderRadius: 12,
    flexShrink: 0,
  },
  artworkFallback: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songInfo: {
    flex: 1,
    gap: 4,
  },
  songName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 22,
  },
  artistName: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  albumName: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  reactions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 8,
  },
  reactionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#242424',
    gap: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  reactionBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}20`,
  },
  reactionEmoji: {
    fontSize: 20,
  },
  reactionLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  noTokenText: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  noSongText: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
