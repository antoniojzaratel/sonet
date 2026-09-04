import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useRaceStore } from '@/stores/raceStore';

interface Props {
  onExit: () => void;
}

export function WorldwideRaceGame({ onExit }: Props) {
  const { user, spotifyToken } = useAuthStore();
  const { puzzle, attempt, leaderboard, loading, loadToday, submitGuess, unsubscribeLeaderboard } = useRaceStore();
  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);

  const player = useAudioPlayer(puzzle?.previewUrl ?? null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (user?.id) loadToday(user.id, spotifyToken);
    return () => unsubscribeLeaderboard();
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

  const handleGuess = async () => {
    if (!guess.trim() || submitting || attempt.solved) return;
    setSubmitting(true);
    const result = await submitGuess(user.id, guess.trim());
    setSubmitting(false);
    setGuess('');
    if (!result.correct) {
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 600);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#001A1A', Colors.background]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onExit} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carrera Mundial</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>El primero en adivinar hoy es el #1 del mundo</Text>

        <TouchableOpacity
          style={styles.playButton}
          onPress={() => (status.playing ? player.pause() : player.play())}
          disabled={!puzzle.previewUrl}
          activeOpacity={0.85}
        >
          <Ionicons name={status.playing ? 'pause' : 'play'} size={32} color="#fff" />
        </TouchableOpacity>
        {!puzzle.previewUrl && (
          <Text style={styles.noAudioHint}>Sin preview disponible hoy — adivina a ciegas</Text>
        )}

        {!attempt.solved ? (
          <View style={styles.guessSection}>
            <TextInput
              style={[styles.guessInput, wrongFlash && styles.guessInputWrong]}
              placeholder="¿Qué canción es?"
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
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.guessButtonText}>Adivinar</Text>}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.attemptsHint}>{attempt.guesses} intento{attempt.guesses === 1 ? '' : 's'}</Text>
          </View>
        ) : (
          <View style={styles.result}>
            <Ionicons
              name={attempt.rank === 1 ? 'trophy' : 'checkmark-circle'}
              size={48}
              color={attempt.rank === 1 ? Colors.warning : Colors.secondary}
            />
            <Text style={styles.resultRank}>{attempt.rank ? `#${attempt.rank} del mundo` : '¡Correcto!'}</Text>
          </View>
        )}

        <View style={styles.leaderboardBox}>
          <Text style={styles.leaderboardTitle}>Tabla en vivo — hoy</Text>
          {leaderboard.length === 0 ? (
            <Text style={styles.leaderboardEmpty}>Nadie ha adivinado todavía. Sé el primero.</Text>
          ) : (
            leaderboard.map((row, i) => (
              <View key={row.userId} style={styles.leaderboardRow}>
                <Text style={styles.leaderboardRank}>#{i + 1}</Text>
                <Text style={styles.leaderboardName} numberOfLines={1}>{row.displayName}</Text>
                {row.userId === user.id && <Text style={styles.leaderboardYou}>Tú</Text>}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { color: Colors.textSecondary, fontSize: 15 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  subtitle: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: Spacing.sm },

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

  guessSection: { width: '100%', gap: Spacing.md, alignItems: 'center' },
  guessInput: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    padding: Spacing.md,
    fontSize: 16,
    height: 52,
  },
  guessInputWrong: { borderColor: Colors.accent },
  guessButton: { width: '100%', borderRadius: Radius.md, height: 52, alignItems: 'center', justifyContent: 'center' },
  guessButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  attemptsHint: { color: Colors.textMuted, fontSize: 12 },

  result: { alignItems: 'center', gap: Spacing.sm },
  resultEmoji: { fontSize: 56 },
  resultRank: { fontSize: 22, fontWeight: '900', color: Colors.secondary },

  leaderboardBox: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  leaderboardTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
  leaderboardEmpty: { color: Colors.textMuted, fontSize: 13 },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  leaderboardRank: { color: Colors.primary, fontSize: 13, fontWeight: '800', width: 32 },
  leaderboardName: { color: Colors.text, fontSize: 14, flex: 1 },
  leaderboardYou: { color: Colors.secondary, fontSize: 12, fontWeight: '700' },
});
