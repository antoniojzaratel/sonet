import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { buildHitsterDeck, HITSTER_DECK_SEEDS, type DeckCard } from '@/lib/hitsterDeck';

// Solo, single-round Hitster for the demo account — real multiplayer needs
// a live room with a second player, which a demo can't fake convincingly.
// Same "guess the year" core mechanic, no room code, no realtime, done in
// one round: play the song, pick a year, see if you're right.

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildYearOptions(correctYear: number): number[] {
  const distractorYears = shuffle(HITSTER_DECK_SEEDS.map((s) => s.year).filter((y) => y !== correctYear));
  const options = [correctYear, ...new Set(distractorYears)].slice(0, 4);
  return shuffle(options);
}

export default function HitsterDemoScreen() {
  const router = useRouter();
  const { spotifyToken } = useAuthStore();
  const [card, setCard] = useState<DeckCard | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const player = useAudioPlayer(card?.preview_url ?? null);
  const status = useAudioPlayerStatus(player);

  const loadRound = useCallback(async () => {
    setLoading(true);
    setPicked(null);
    const [drawn] = await buildHitsterDeck(spotifyToken, 1);
    setCard(drawn);
    setOptions(buildYearOptions(drawn.year));
    setLoading(false);
  }, [spotifyToken]);

  useEffect(() => {
    loadRound();
  }, [loadRound]);

  const correct = picked !== null && card !== null && picked === card.year;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#2D0A5C', Colors.background]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/games')} style={styles.backButton} hitSlop={12}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hitster</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading || !card ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.songCard}>
            <Text style={styles.songTitle} numberOfLines={1}>{card.name}</Text>
            <Text style={styles.songArtist} numberOfLines={1}>{card.artist}</Text>
            <Text style={styles.songYear}>{picked !== null ? card.year : '19??'}</Text>

            {card.preview_url ? (
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => (status.playing ? player.pause() : player.play())}
                activeOpacity={0.8}
              >
                <Ionicons name={status.playing ? 'pause' : 'play'} size={22} color="#fff" />
              </TouchableOpacity>
            ) : (
              <Text style={styles.noPreview}>Sin preview disponible — adivina a ciegas</Text>
            )}
          </View>

          {picked === null ? (
            <>
              <Text style={styles.prompt}>¿De qué año es?</Text>
              <View style={styles.optionsGrid}>
                {options.map((year) => (
                  <TouchableOpacity key={year} style={styles.optionBtn} onPress={() => setPicked(year)} activeOpacity={0.8}>
                    <Text style={styles.optionText}>{year}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.result}>
              <Text style={[styles.resultLabel, { color: correct ? Colors.secondary : Colors.accent }]}>
                {correct ? '¡Correcto!' : `Era ${card.year}`}
              </Text>
              <View style={styles.resultActions}>
                <TouchableOpacity onPress={loadRound} activeOpacity={0.85}>
                  <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>Jugar otra ronda</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.replace('/(tabs)/games')} style={styles.secondaryBtn} activeOpacity={0.8}>
                  <Text style={styles.secondaryBtnText}>Salir</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },

  body: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.xl },

  songCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 6,
  },
  songTitle: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  songArtist: { color: Colors.textSecondary, fontSize: 14 },
  songYear: { color: Colors.primaryLight, fontSize: 32, fontWeight: '900', marginVertical: 8, letterSpacing: 2 },
  playBtn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  noPreview: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4 },

  prompt: { color: Colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  optionBtn: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 18,
    alignItems: 'center',
  },
  optionText: { color: Colors.text, fontSize: 20, fontWeight: '800' },

  result: { alignItems: 'center', gap: Spacing.lg, paddingTop: Spacing.md },
  resultLabel: { fontSize: 24, fontWeight: '900' },
  resultActions: { gap: Spacing.sm, alignItems: 'center' },
  primaryBtn: { borderRadius: Radius.md, paddingVertical: 16, paddingHorizontal: Spacing.xxl },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { paddingVertical: 10 },
  secondaryBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
