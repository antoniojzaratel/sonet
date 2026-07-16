import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';

const VERSUS_QUESTIONS = [
  {
    id: '1',
    a: { name: 'Bohemian Rhapsody', artist: 'Queen', emoji: '👑' },
    b: { name: 'Stairway to Heaven', artist: 'Led Zeppelin', emoji: '🌟' },
  },
  {
    id: '2',
    a: { name: 'Gasolina', artist: 'Daddy Yankee', emoji: '🔥' },
    b: { name: 'Despacito', artist: 'Luis Fonsi ft. Daddy Yankee', emoji: '💃' },
  },
  {
    id: '3',
    a: { name: 'Thriller', artist: 'Michael Jackson', emoji: '🕺' },
    b: { name: 'Billie Jean', artist: 'Michael Jackson', emoji: '✨' },
  },
  {
    id: '4',
    a: { name: 'Bad Guy', artist: 'Billie Eilish', emoji: '😈' },
    b: { name: 'Happier Than Ever', artist: 'Billie Eilish', emoji: '🖤' },
  },
  {
    id: '5',
    a: { name: 'Blinding Lights', artist: 'The Weeknd', emoji: '🌃' },
    b: { name: 'Starboy', artist: 'The Weeknd', emoji: '⭐' },
  },
];

interface Props {
  onExit: () => void;
}

export function VersusGame({ onExit }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<'a' | 'b' | null>(null);
  const [score, setScore] = useState({ a: 0, b: 0 });
  const [finished, setFinished] = useState(false);

  const question = VERSUS_QUESTIONS[currentIndex];

  const handleChoose = (choice: 'a' | 'b') => {
    setSelected(choice);
    setScore((prev) => ({ ...prev, [choice]: prev[choice] + 1 }));

    setTimeout(() => {
      if (currentIndex >= VERSUS_QUESTIONS.length - 1) {
        setFinished(true);
      } else {
        setCurrentIndex((i) => i + 1);
        setSelected(null);
      }
    }, 800);
  };

  if (finished) {
    const winner = score.a > score.b ? 'A' : score.b > score.a ? 'B' : '🤝';
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient colors={['#2D0A5C', Colors.background]} style={StyleSheet.absoluteFill} />
        <View style={styles.centered}>
          <Text style={styles.finishedEmoji}>🏆</Text>
          <Text style={styles.finishedTitle}>¡Juego terminado!</Text>
          <Text style={styles.finishedSubtitle}>
            Respondiste {VERSUS_QUESTIONS.length} preguntas
          </Text>
          <TouchableOpacity style={styles.playAgainButton} onPress={onExit} activeOpacity={0.8}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.playAgainGradient}>
              <Text style={styles.playAgainText}>Volver a juegos</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#2D0A5C', Colors.background]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onExit} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Versus ⚔️</Text>
        <Text style={styles.progress}>
          {currentIndex + 1}/{VERSUS_QUESTIONS.length}
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentIndex + 1) / VERSUS_QUESTIONS.length) * 100}%` },
          ]}
        />
      </View>

      <View style={styles.question}>
        <Text style={styles.questionText}>¿Cuál prefieres?</Text>
      </View>

      <View style={styles.options}>
        <OptionCard
          option={question.a}
          side="A"
          onPress={() => handleChoose('a')}
          selected={selected}
          choice="a"
        />

        <View style={styles.vsContainer}>
          <LinearGradient colors={[Colors.accent, Colors.primary]} style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </LinearGradient>
        </View>

        <OptionCard
          option={question.b}
          side="B"
          onPress={() => handleChoose('b')}
          selected={selected}
          choice="b"
        />
      </View>
    </SafeAreaView>
  );
}

function OptionCard({ option, side, onPress, selected, choice }: any) {
  const isSelected = selected === choice;
  const isRejected = selected && selected !== choice;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!!selected}
      activeOpacity={0.85}
      style={[
        styles.option,
        isSelected && styles.optionSelected,
        isRejected && styles.optionRejected,
      ]}
    >
      {isSelected && (
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={StyleSheet.absoluteFill}
          borderRadius={Radius.xl}
        />
      )}
      <Text style={styles.optionEmoji}>{option.emoji}</Text>
      <Text style={styles.optionName} numberOfLines={2}>{option.name}</Text>
      <Text style={styles.optionArtist} numberOfLines={1}>{option.artist}</Text>
      {isSelected && (
        <View style={styles.checkmark}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.secondary} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  progress: { color: Colors.textMuted, fontSize: 14, fontWeight: '600', width: 40, textAlign: 'right' },

  progressBar: {
    height: 3,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
    borderRadius: 2,
    marginBottom: Spacing.xl,
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },

  question: { alignItems: 'center', marginBottom: Spacing.xl },
  questionText: { fontSize: 22, fontWeight: '800', color: Colors.text },

  options: { flex: 1, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  option: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  optionSelected: { borderColor: Colors.primary },
  optionRejected: { opacity: 0.4 },
  optionEmoji: { fontSize: 48 },
  optionName: { fontSize: 18, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  optionArtist: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  checkmark: { position: 'absolute', top: 12, right: 12 },

  vsContainer: { alignItems: 'center', zIndex: 1 },
  vsBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  vsText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  finishedEmoji: { fontSize: 72 },
  finishedTitle: { fontSize: 28, fontWeight: '800', color: Colors.text },
  finishedSubtitle: { fontSize: 15, color: Colors.textSecondary },
  playAgainButton: {},
  playAgainGradient: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xxl,
  },
  playAgainText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
