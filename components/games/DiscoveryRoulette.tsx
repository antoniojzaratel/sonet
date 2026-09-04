import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.35;

const DISCOVERY_SONGS = [
  { id: '1', name: 'Levitating', artist: 'Dua Lipa', genre: 'Pop', year: '2020' },
  { id: '2', name: 'MONTERO', artist: 'Lil Nas X', genre: 'Hip-Hop', year: '2021' },
  { id: '3', name: 'Easy On Me', artist: 'Adele', genre: 'Soul', year: '2021' },
  { id: '4', name: 'Flowers', artist: 'Miley Cyrus', genre: 'Pop', year: '2023' },
  { id: '5', name: 'As It Was', artist: 'Harry Styles', genre: 'Pop Rock', year: '2022' },
  { id: '6', name: 'Unholy', artist: 'Sam Smith', genre: 'Pop', year: '2022' },
  { id: '7', name: 'Anti-Hero', artist: 'Taylor Swift', genre: 'Pop', year: '2022' },
  { id: '8', name: "Creepin'", artist: 'Metro Boomin', genre: 'Hip-Hop', year: '2022' },
];

interface Props {
  onExit: () => void;
}

export function DiscoveryRoulette({ onExit }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  // Derived, not a separately-tracked boolean: the old imperative
  // `setFinished(true)` inside the animation callback read a stale
  // `currentIndex` closure, so two rapid swipes (no guard against
  // double-firing mid-animation) could push the index past the array's end
  // without ever flipping `finished` — the next render then tried
  // `DISCOVERY_SONGS[currentIndex].emoji` on `undefined` and crashed.
  // Deriving it straight from `currentIndex` every render makes that
  // impossible regardless of how many swipes stack up.
  const finished = currentIndex >= DISCOVERY_SONGS.length;
  const isAnimating = useRef(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = translateX.interpolate({ inputRange: [-width, 0, width], outputRange: ['-15deg', '0deg', '15deg'] });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, { dx }) => translateX.setValue(dx),
      onPanResponderRelease: (_, { dx }) => {
        if (dx > SWIPE_THRESHOLD) {
          swipe('right');
        } else if (dx < -SWIPE_THRESHOLD) {
          swipe('left');
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const swipe = (direction: 'left' | 'right') => {
    if (isAnimating.current || finished) return; // ignore taps while a swipe is already in flight
    isAnimating.current = true;

    const song = DISCOVERY_SONGS[currentIndex];
    if (direction === 'right') setLiked((prev) => [...prev, song.id]);

    Animated.timing(translateX, {
      toValue: direction === 'right' ? width * 1.5 : -width * 1.5,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      translateX.setValue(0);
      isAnimating.current = false;
      setCurrentIndex((i) => i + 1);
    });
  };

  if (finished) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient colors={['#1A2E0A', Colors.background]} style={StyleSheet.absoluteFill} />
        <View style={styles.centered}>
          <Ionicons name="shuffle" size={56} color={Colors.secondary} style={{ marginBottom: Spacing.sm }} />
          <Text style={styles.finishedTitle}>¡Ronda completada!</Text>
          <Text style={styles.finishedSub}>Te gustaron {liked.length} canciones</Text>
          <TouchableOpacity onPress={onExit} activeOpacity={0.8}>
            <LinearGradient colors={[Colors.secondary, '#65A30D']} style={styles.exitButton}>
              <Text style={styles.exitButtonText}>Continuar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const song = DISCOVERY_SONGS[currentIndex];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1A2E0A', Colors.background]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onExit} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discovery</Text>
        <Text style={styles.progress}>{currentIndex + 1}/{DISCOVERY_SONGS.length}</Text>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>Desliza a la izquierda para saltar, a la derecha si te gusta</Text>
      </View>

      <View style={styles.cardContainer}>
        {currentIndex < DISCOVERY_SONGS.length - 1 && (
          <View style={[styles.card, styles.cardBack]}>
            <Ionicons name="musical-notes" size={40} color={Colors.textMuted} />
          </View>
        )}

        <Animated.View
          style={[styles.card, { transform: [{ translateX }, { rotate }] }]}
          {...panResponder.panHandlers}
        >
          <LinearGradient
            colors={[Colors.surface, Colors.background]}
            style={[StyleSheet.absoluteFill, { borderRadius: Radius.xl }]}
          />
          <Ionicons name="musical-notes" size={64} color={Colors.primaryLight} style={{ marginBottom: Spacing.sm }} />
          <Text style={styles.songName}>{song.name}</Text>
          <Text style={styles.artistName}>{song.artist}</Text>
          <View style={styles.tags}>
            <View style={styles.tag}><Text style={styles.tagText}>{song.genre}</Text></View>
            <View style={styles.tag}><Text style={styles.tagText}>{song.year}</Text></View>
          </View>

          <View style={styles.swipeHints}>
            <View style={[styles.swipeHint, styles.swipeHintLeft]}>
              <Ionicons name="close-circle" size={32} color={Colors.accent} />
              <Text style={[styles.swipeHintText, { color: Colors.accent }]}>Skip</Text>
            </View>
            <View style={[styles.swipeHint, styles.swipeHintRight]}>
              <Ionicons name="heart-circle" size={32} color={Colors.secondary} />
              <Text style={[styles.swipeHintText, { color: Colors.secondary }]}>Like</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.bottomActions}>
        <TouchableOpacity style={[styles.actionBtn, styles.skipBtn]} onPress={() => swipe('left')}>
          <Ionicons name="close" size={28} color={Colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={() => swipe('right')}>
          <Ionicons name="heart" size={28} color={Colors.secondary} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  progress: { color: Colors.textMuted, fontSize: 14, width: 40, textAlign: 'right' },

  instructions: { alignItems: 'center', marginBottom: Spacing.md },
  instructionText: { color: Colors.textMuted, fontSize: 13 },

  cardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  card: {
    position: 'absolute',
    width: width - Spacing.lg * 2,
    height: 420,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    gap: Spacing.md,
  },
  cardBack: { transform: [{ scale: 0.95 }], zIndex: -1 },
  songEmoji: { fontSize: 72 },
  songEmojiBack: { fontSize: 48, opacity: 0.5 },
  songName: { fontSize: 26, fontWeight: '900', color: Colors.text, textAlign: 'center' },
  artistName: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
  tags: { flexDirection: 'row', gap: Spacing.sm },
  tag: {
    backgroundColor: `${Colors.primary}20`,
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  tagText: { color: Colors.primaryLight, fontSize: 13, fontWeight: '600' },
  swipeHints: { position: 'absolute', top: Spacing.md, flexDirection: 'row', width: '100%', paddingHorizontal: Spacing.md, justifyContent: 'space-between' },
  swipeHint: { alignItems: 'center', gap: 2, opacity: 0.3 },
  swipeHintLeft: {},
  swipeHintRight: {},
  swipeHintText: { fontSize: 11, fontWeight: '700' },

  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xxl,
    paddingBottom: 40,
    paddingTop: Spacing.lg,
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  skipBtn: { borderColor: Colors.accent, backgroundColor: `${Colors.accent}15` },
  likeBtn: { borderColor: Colors.secondary, backgroundColor: `${Colors.secondary}15` },

  finishedEmoji: { fontSize: 72 },
  finishedTitle: { fontSize: 28, fontWeight: '800', color: Colors.text },
  finishedSub: { fontSize: 16, color: Colors.textSecondary },
  exitButton: { borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: Spacing.xxl, marginTop: Spacing.md },
  exitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
