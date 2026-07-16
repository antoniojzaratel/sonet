import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';

const SONGS = [
  { name: 'Bohemian Rhapsody', artist: 'Queen', hint: '🎭 Ópera rock icónica de los 70s' },
  { name: 'Despacito', artist: 'Luis Fonsi', hint: '🇵🇷 Canción latina más escuchada del mundo' },
  { name: 'Thriller', artist: 'Michael Jackson', hint: '🧟 El mejor álbum de MJ' },
  { name: 'Blinding Lights', artist: 'The Weeknd', hint: '🌃 Synthwave de 2019' },
  { name: 'Shape of You', artist: 'Ed Sheeran', hint: '🎸 Éxito pop de Ed Sheeran del 2017' },
];

interface Props {
  onExit: () => void;
}

export function GuessSongGame({ onExit }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [score, setScore] = useState(0);

  const song = SONGS[currentIndex];

  const handleGuess = () => {
    const isCorrect = guess.toLowerCase().includes(song.name.toLowerCase().split(' ')[0]);
    setCorrect(isCorrect);
    setRevealed(true);
    if (isCorrect) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (currentIndex >= SONGS.length - 1) {
      onExit();
      return;
    }
    setCurrentIndex((i) => i + 1);
    setGuess('');
    setRevealed(false);
    setCorrect(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#0A1A2E', Colors.background]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onExit} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Adivina 🎵</Text>
        <Text style={styles.scoreText}>⭐ {score}/{SONGS.length}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.waveContainer}>
          <View style={styles.playButton}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.playGradient}>
              <Ionicons name={revealed ? 'musical-note' : 'play'} size={40} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.hintLabel}>🔍 Pista:</Text>
          <Text style={styles.hint}>{song.hint}</Text>
          <Text style={styles.timer}>5 seg de la canción</Text>
        </View>

        {!revealed ? (
          <View style={styles.guessSection}>
            <TextInput
              style={styles.guessInput}
              placeholder="Escribe el nombre de la canción..."
              placeholderTextColor={Colors.textMuted}
              value={guess}
              onChangeText={setGuess}
              returnKeyType="done"
              onSubmitEditing={handleGuess}
            />
            <TouchableOpacity onPress={handleGuess} disabled={!guess.trim()} activeOpacity={0.8}>
              <LinearGradient
                colors={guess.trim() ? [Colors.primary, Colors.primaryDark] : [Colors.border, Colors.border]}
                style={styles.guessButton}
              >
                <Text style={styles.guessButtonText}>Responder</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.result}>
            <Text style={styles.resultEmoji}>{correct ? '✅' : '❌'}</Text>
            <Text style={[styles.resultLabel, { color: correct ? Colors.secondary : Colors.accent }]}>
              {correct ? '¡Correcto!' : 'Era...'}
            </Text>
            <Text style={styles.songName}>{song.name}</Text>
            <Text style={styles.artistName}>{song.artist}</Text>
            <TouchableOpacity onPress={handleNext} activeOpacity={0.8}>
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.nextButton}>
                <Text style={styles.nextButtonText}>
                  {currentIndex >= SONGS.length - 1 ? 'Ver resultados' : 'Siguiente →'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.progressDots}>
        {SONGS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex && styles.dotActive,
              i < currentIndex && styles.dotDone,
            ]}
          />
        ))}
      </View>
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
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  scoreText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },

  content: { flex: 1, paddingHorizontal: Spacing.lg, justifyContent: 'center', gap: Spacing.xl },

  waveContainer: { alignItems: 'center', gap: Spacing.md },
  playButton: { marginBottom: Spacing.md },
  playGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  hintLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  hint: { color: Colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  timer: { color: Colors.textMuted, fontSize: 12 },

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

  result: { alignItems: 'center', gap: Spacing.md },
  resultEmoji: { fontSize: 56 },
  resultLabel: { fontSize: 20, fontWeight: '800' },
  songName: { fontSize: 22, fontWeight: '900', color: Colors.text, textAlign: 'center' },
  artistName: { fontSize: 15, color: Colors.textSecondary },
  nextButton: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xxl,
    marginTop: Spacing.sm,
  },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 40,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 24 },
  dotDone: { backgroundColor: Colors.primaryDark },
});
