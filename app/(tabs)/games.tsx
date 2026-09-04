import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { GuessSongGame } from '@/components/games/GuessSongGame';
import { DiscoveryRoulette } from '@/components/games/DiscoveryRoulette';
import { PerfectLineupGame } from '@/components/games/PerfectLineupGame';
import { WorldwideRaceGame } from '@/components/games/WorldwideRaceGame';
import { ListenQuizGame } from '@/components/games/ListenQuizGame';
import { useAuthStore } from '@/stores/authStore';
import { useGamesStore } from '@/stores/gamesStore';

type GameMode = null | 'guess' | 'roulette' | 'lineup' | 'race' | 'quiz-artist' | 'quiz-year';
type IconName = keyof typeof Ionicons.glyphMap;

const GAMES: { id: 'hitster' | GameMode; title: string; subtitle: string; gradient: readonly [string, string]; icon: IconName }[] = [
  {
    id: 'hitster' as const,
    title: 'Hitster',
    subtitle: 'Sala en vivo: adivina el año y arma tu línea de tiempo antes que tus amigos',
    gradient: [Colors.accent, '#7C3AED'] as const,
    icon: 'time-outline',
  },
  {
    id: 'guess' as GameMode,
    title: 'Adivina',
    subtitle: 'Pistas progresivas: género, artista, álbum o canción del día',
    gradient: [Colors.primary, Colors.secondary] as const,
    icon: 'help-circle-outline',
  },
  {
    id: 'race' as GameMode,
    title: 'Carrera Mundial',
    subtitle: 'La misma canción para todo el mundo — el primero en adivinar es el #1',
    gradient: ['#06B6D4', '#0EA5E9'] as const,
    icon: 'flash-outline',
  },
  {
    id: 'lineup' as GameMode,
    title: 'Perfect Lineup',
    subtitle: 'Arma el cartel perfecto: headliner + actos de apoyo, ¿se agota?',
    gradient: ['#F97316', '#EAB308'] as const,
    icon: 'list-outline',
  },
  {
    id: 'quiz-artist' as GameMode,
    title: 'Adivina el Artista',
    subtitle: 'Escucha y adivina quién canta — práctica libre',
    gradient: ['#8B5CF6', '#EC4899'] as const,
    icon: 'person-outline',
  },
  {
    id: 'quiz-year' as GameMode,
    title: 'Adivina el Año',
    subtitle: 'Escucha y adivina el año de lanzamiento — práctica libre',
    gradient: ['#10B981', '#06B6D4'] as const,
    icon: 'calendar-outline',
  },
  {
    id: 'roulette' as GameMode,
    title: 'Discovery Roulette',
    subtitle: 'Swipe para descubrir música nueva',
    gradient: ['#F59E0B', '#F43F5E'] as const,
    icon: 'shuffle-outline',
  },
];

export default function GamesScreen() {
  const [activeGame, setActiveGame] = useState<GameMode>(null);
  const router = useRouter();
  const { user } = useAuthStore();
  const { stats, loadStats } = useGamesStore();

  useEffect(() => {
    if (user?.id) loadStats(user.id);
  }, [user?.id, activeGame]);

  if (activeGame === 'guess') {
    return <GuessSongGame onExit={() => setActiveGame(null)} />;
  }
  if (activeGame === 'roulette') {
    return <DiscoveryRoulette onExit={() => setActiveGame(null)} />;
  }
  if (activeGame === 'lineup') {
    return <PerfectLineupGame onExit={() => setActiveGame(null)} />;
  }
  if (activeGame === 'race') {
    return <WorldwideRaceGame onExit={() => setActiveGame(null)} />;
  }
  if (activeGame === 'quiz-artist') {
    return <ListenQuizGame mode="artist" onExit={() => setActiveGame(null)} />;
  }
  if (activeGame === 'quiz-year') {
    return <ListenQuizGame mode="year" onExit={() => setActiveGame(null)} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Juegos</Text>
        <Text style={styles.subtitle}>Compite y descubre música</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gamesGrid}>
          {GAMES.map((game) => (
            <TouchableOpacity
              key={game.id}
              onPress={() => (game.id === 'hitster' ? router.push('/hitster') : setActiveGame(game.id as GameMode))}
              activeOpacity={0.85}
              style={styles.gameCardWrapper}
            >
              <LinearGradient
                colors={game.gradient}
                style={styles.gameCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={game.icon} size={32} color="#fff" style={styles.gameIcon} />
                <Text style={styles.gameTitle}>{game.title}</Text>
                <Text style={styles.gameSubtitle}>{game.subtitle}</Text>
                <View style={styles.playButton}>
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.playText}>Jugar</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsBar}>
          <StatItem icon="trophy-outline" label="Resueltos" value={String(stats.totalSolved)} />
          <StatItem icon="flame-outline" label="Racha" value={String(stats.currentStreak)} />
          <StatItem icon="star-outline" label="Mejor racha" value={String(stats.bestStreak)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },

  scrollContent: { paddingBottom: Spacing.xxl },
  gamesGrid: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  gameCardWrapper: { borderRadius: Radius.xl, overflow: 'hidden' },
  gameCard: { padding: Spacing.xl, borderRadius: Radius.xl, minHeight: 130 },
  gameIcon: { marginBottom: Spacing.sm },
  gameTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  gameSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4, lineHeight: 18 },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  playText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted },
});
