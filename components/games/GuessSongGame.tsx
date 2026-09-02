import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useGamesStore } from '@/stores/gamesStore';
import { MAX_ATTEMPTS, type PuzzleContentType } from '@/lib/dailyGame';

interface Props {
  onExit: () => void;
}

const TYPE_LABEL: Record<PuzzleContentType, string> = {
  genre: 'Género',
  artist: 'Artista',
  album: 'Álbum',
  song: 'Canción',
};

export function GuessSongGame({ onExit }: Props) {
  const { user } = useAuthStore();
  const { puzzle, attempt, loading, submitGuess, loadToday } = useGamesStore();
  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) loadToday(user.id);
  }, [user?.id]);

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

  if (loading || !puzzle || !attempt) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const hintsShown = puzzle.hints.slice(0, Math.min(attempt.attemptCount + 1, puzzle.hints.length));
  const gameOver = attempt.solved || attempt.attemptCount >= MAX_ATTEMPTS;

  const handleGuess = async () => {
    if (!guess.trim() || submitting) return;
    setSubmitting(true);
    const result = await submitGuess(user.id, guess.trim());
    setSubmitting(false);
    setGuess('');
    if (result.answerName) setRevealedAnswer(result.answerName);
    if (!result.correct && useGamesStore.getState().attempt?.attemptCount === MAX_ATTEMPTS) {
      Alert.alert('Se acabaron los intentos', 'Vuelve mañana para un nuevo reto.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#0A1A2E', Colors.background]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onExit} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Adivina 🎵</Text>
        <Text style={styles.scoreText}>🔥 {attempt.streak}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.typeLabel}>Adivina el {TYPE_LABEL[puzzle.contentType].toLowerCase()} de hoy</Text>

        <View style={styles.hintsBox}>
          {hintsShown.map((h, i) => (
            <View key={i} style={styles.hintRow}>
              <Text style={styles.hintBullet}>🔍</Text>
              <Text style={styles.hint}>{h}</Text>
            </View>
          ))}
        </View>

        <View style={styles.attemptsRow}>
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => {
            const g = attempt.guesses[i];
            return (
              <View
                key={i}
                style={[
                  styles.attemptDot,
                  g && (g.correct ? styles.attemptDotCorrect : styles.attemptDotWrong),
                ]}
              />
            );
          })}
        </View>

        {attempt.guesses.length > 0 && (
          <View style={styles.guessHistory}>
            {attempt.guesses.map((g, i) => (
              <Text key={i} style={[styles.guessHistoryItem, g.correct && styles.guessHistoryCorrect]}>
                {g.correct ? '✅' : '❌'} {g.text}
              </Text>
            ))}
          </View>
        )}

        {!gameOver ? (
          <View style={styles.guessSection}>
            <TextInput
              style={styles.guessInput}
              placeholder={`Escribe el ${TYPE_LABEL[puzzle.contentType].toLowerCase()}...`}
              placeholderTextColor={Colors.textMuted}
              value={guess}
              onChangeText={setGuess}
              returnKeyType="done"
              onSubmitEditing={handleGuess}
              editable={!submitting}
            />
            <TouchableOpacity onPress={handleGuess} disabled={!guess.trim() || submitting} activeOpacity={0.8}>
              <LinearGradient
                colors={guess.trim() ? [Colors.primary, Colors.primaryDark] : [Colors.border, Colors.border]}
                style={styles.guessButton}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.guessButtonText}>Responder</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.result}>
            <Text style={styles.resultEmoji}>{attempt.solved ? '✅' : '❌'}</Text>
            <Text style={[styles.resultLabel, { color: attempt.solved ? Colors.secondary : Colors.accent }]}>
              {attempt.solved ? '¡Correcto!' : 'No esta vez'}
            </Text>
            {revealedAnswer && <Text style={styles.songName}>{revealedAnswer}</Text>}
            <Text style={styles.artistName}>Vuelve mañana para un nuevo reto</Text>
            <TouchableOpacity onPress={onExit} activeOpacity={0.8}>
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.nextButton}>
                <Text style={styles.nextButtonText}>Volver</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  scoreText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg },

  typeLabel: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: Spacing.md },

  hintsBox: { gap: Spacing.sm },
  hintRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  hintBullet: { fontSize: 14 },
  hint: { color: Colors.text, fontSize: 16, fontWeight: '600', flex: 1 },

  attemptsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  attemptDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.border },
  attemptDotCorrect: { backgroundColor: Colors.secondary },
  attemptDotWrong: { backgroundColor: Colors.accent },

  guessHistory: { gap: 4 },
  guessHistoryItem: { color: Colors.textMuted, fontSize: 14 },
  guessHistoryCorrect: { color: Colors.secondary, fontWeight: '700' },

  guessSection: { gap: Spacing.md },
  guessInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    padding: Spacing.md,
    fontSize: 16,
    height: 52,
  },
  guessButton: { borderRadius: Radius.md, height: 52, alignItems: 'center', justifyContent: 'center' },
  guessButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  result: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.lg },
  resultEmoji: { fontSize: 56 },
  resultLabel: { fontSize: 20, fontWeight: '800' },
  songName: { fontSize: 22, fontWeight: '900', color: Colors.text, textAlign: 'center' },
  artistName: { fontSize: 15, color: Colors.textSecondary },
  nextButton: { borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: Spacing.xxl, marginTop: Spacing.sm },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
