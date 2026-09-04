import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { buildHitsterDeck, HITSTER_DECK_SEEDS, type DeckCard } from '@/lib/hitsterDeck';

export type QuizMode = 'artist' | 'year';

interface Props {
  mode: QuizMode;
  onExit: () => void;
}

interface Question {
  card: DeckCard;
  options: string[];
  correctIndex: number;
}

const ROUND_SIZE = 8;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildOptions(mode: QuizMode, card: DeckCard): { options: string[]; correctIndex: number } {
  if (mode === 'artist') {
    const correct = card.artist;
    const distractorPool = shuffle(HITSTER_DECK_SEEDS.map((s) => s.artist).filter((a) => a !== correct));
    const distractors = [...new Set(distractorPool)].slice(0, 3);
    const options = shuffle([correct, ...distractors]);
    return { options, correctIndex: options.indexOf(correct) };
  }

  const correct = String(card.year);
  const nearbyYears = shuffle(
    HITSTER_DECK_SEEDS.map((s) => s.year).filter((y) => y !== card.year)
  );
  const distractors = [...new Set(nearbyYears.map(String))].slice(0, 3);
  const options = shuffle([correct, ...distractors]);
  return { options, correctIndex: options.indexOf(correct) };
}

export function ListenQuizGame({ mode, onExit }: Props) {
  const { user, spotifyToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const current = questions[index];
  const player = useAudioPlayer(current?.card.preview_url ?? null);
  const status = useAudioPlayerStatus(player);

  const loadRound = useCallback(async () => {
    setLoading(true);
    setIndex(0);
    setScore(0);
    setPickedIndex(null);
    setFinished(false);
    const deck = await buildHitsterDeck(spotifyToken, ROUND_SIZE);
    setQuestions(
      deck.map((card) => {
        const { options, correctIndex } = buildOptions(mode, card);
        return { card, options, correctIndex };
      })
    );
    setLoading(false);
  }, [mode, spotifyToken]);

  useEffect(() => {
    loadRound();
  }, [loadRound]);

  const handlePick = (optionIndex: number) => {
    if (pickedIndex !== null || !current) return;
    setPickedIndex(optionIndex);
    if (optionIndex === current.correctIndex) setScore((s) => s + 1);

    setTimeout(() => {
      if (index + 1 >= questions.length) {
        setFinished(true);
      } else {
        setIndex((i) => i + 1);
        setPickedIndex(null);
      }
    }, 1100);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerBox}>
          <Text style={styles.hint}>Inicia sesión para jugar</Text>
          <TouchableOpacity onPress={onExit} style={{ marginTop: Spacing.lg }}>
            <Text style={{ color: Colors.primary }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const title = mode === 'artist' ? 'Adivina el Artista' : 'Adivina el Año';
  const prompt = mode === 'artist' ? '¿Quién canta esto?' : '¿De qué año es?';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1A0A2E', Colors.background]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onExit} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerScore}>{score}/{questions.length || ROUND_SIZE}</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : finished ? (
        <View style={styles.centerBox}>
          <Ionicons
            name={score >= questions.length * 0.7 ? 'trophy' : 'headset'}
            size={48}
            color={score >= questions.length * 0.7 ? Colors.warning : Colors.textMuted}
            style={{ marginBottom: Spacing.sm }}
          />
          <Text style={styles.finishedScore}>{score} / {questions.length}</Text>
          <Text style={styles.finishedLabel}>aciertos</Text>
          <TouchableOpacity onPress={loadRound} activeOpacity={0.85} style={{ marginTop: Spacing.xl }}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.playAgainButton}>
              <Text style={styles.playAgainText}>Jugar de nuevo</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : current ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.progress}>Pregunta {index + 1} de {questions.length}</Text>
          <Text style={styles.prompt}>{prompt}</Text>

          <TouchableOpacity
            style={styles.playButton}
            onPress={() => (status.playing ? player.pause() : player.play())}
            disabled={!current.card.preview_url}
            activeOpacity={0.85}
          >
            <Ionicons name={status.playing ? 'pause' : 'play'} size={32} color="#fff" />
          </TouchableOpacity>
          {!current.card.preview_url && (
            <Text style={styles.noAudioHint}>Sin preview disponible — adivina a ciegas</Text>
          )}

          <View style={styles.options}>
            {current.options.map((opt, i) => {
              const isPicked = pickedIndex === i;
              const isCorrect = i === current.correctIndex;
              const showState = pickedIndex !== null;
              return (
                <TouchableOpacity
                  key={`${opt}-${i}`}
                  style={[
                    styles.optionBtn,
                    showState && isCorrect && styles.optionCorrect,
                    showState && isPicked && !isCorrect && styles.optionWrong,
                  ]}
                  onPress={() => handlePick(i)}
                  disabled={pickedIndex !== null}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                  {showState && isCorrect && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                  {showState && isPicked && !isCorrect && <Ionicons name="close-circle" size={20} color="#fff" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  hint: { color: Colors.textSecondary, fontSize: 15 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  headerScore: { fontSize: 16, fontWeight: '800', color: Colors.secondary, width: 40, textAlign: 'right' },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  progress: { color: Colors.textMuted, fontSize: 12, marginTop: Spacing.sm },
  prompt: { color: Colors.text, fontSize: 20, fontWeight: '800' },

  playButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
  },
  noAudioHint: { color: Colors.textMuted, fontSize: 12, marginTop: -Spacing.sm },

  options: { width: '100%', gap: Spacing.sm, marginTop: Spacing.md },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  optionCorrect: { backgroundColor: Colors.success, borderColor: Colors.success },
  optionWrong: { backgroundColor: Colors.error, borderColor: Colors.error },
  optionText: { color: Colors.text, fontSize: 15, fontWeight: '600' },

  finishedEmoji: { fontSize: 56 },
  finishedScore: { fontSize: 40, fontWeight: '900', color: Colors.text },
  finishedLabel: { color: Colors.textMuted, fontSize: 13 },
  playAgainButton: { borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: 32 },
  playAgainText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
