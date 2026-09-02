import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { VersusGame } from '@/components/games/VersusGame';
import { GuessSongGame } from '@/components/games/GuessSongGame';
import { DiscoveryRoulette } from '@/components/games/DiscoveryRoulette';
import { useAuthStore } from '@/stores/authStore';
import { useGamesStore } from '@/stores/gamesStore';

type GameMode = null | 'versus' | 'guess' | 'roulette';

const GAMES = [
  {
    id: 'versus' as GameMode,
    title: 'Versus ⚔️',
    subtitle: 'Enfrenta dos canciones y elige tu favorita',
    gradient: [Colors.accent, '#7C3AED'] as const,
    emoji: '⚔️',
  },
  {
    id: 'guess' as GameMode,
    title: 'Adivina 🎵',
    subtitle: 'Escucha 5 segundos e identifica la canción',
    gradient: [Colors.primary, Colors.secondary] as const,
    emoji: '🎵',
  },
  {
    id: 'roulette' as GameMode,
    title: 'Discovery Roulette 🎰',
    subtitle: 'Swipe para descubrir música nueva',
    gradient: ['#F59E0B', '#F43F5E'] as const,
    emoji: '🎰',
  },
];

export default function GamesScreen() {
  const [activeGame, setActiveGame] = useState<GameMode>(null);
  const { user } = useAuthStore();
  const { stats, loadStats } = useGamesStore();

  useEffect(() => {
    if (user?.id) loadStats(user.id);
  }, [user?.id, activeGame]);

  if (activeGame === 'versus') {
    return <VersusGame onExit={() => setActiveGame(null)} />;
  }
  if (activeGame === 'guess') {
    return <GuessSongGame onExit={() => setActiveGame(null)} />;
  }
  if (activeGame === 'roulette') {
    return <DiscoveryRoulette onExit={() => setActiveGame(null)} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Juegos</Text>
        <Text style={styles.subtitle}>Compite y descubre música</Text>
      </View>

      <View style={styles.gamesGrid}>
        {GAMES.map((game) => (
          <TouchableOpacity
            key={game.id}
            onPress={() => setActiveGame(game.id)}
            activeOpacity={0.85}
            style={styles.gameCardWrapper}
          >
            <LinearGradient
              colors={game.gradient}
              style={styles.gameCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.gameEmoji}>{game.emoji}</Text>
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
        <StatItem emoji="🏆" label="Resueltos" value={String(stats.totalSolved)} />
        <StatItem emoji="🔥" label="Racha" value={String(stats.currentStreak)} />
        <StatItem emoji="⭐" label="Mejor racha" value={String(stats.bestStreak)} />
      </View>
    </SafeAreaView>
  );
}

function StatItem({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statEmoji}>{emoji}</Text>
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

  gamesGrid: { paddingHorizontal: Spacing.lg, gap: Spacing.md, flex: 1 },
  gameCardWrapper: { borderRadius: Radius.xl, overflow: 'hidden' },
  gameCard: { padding: Spacing.xl, borderRadius: Radius.xl, minHeight: 130 },
  gameEmoji: { fontSize: 36, marginBottom: Spacing.sm },
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
  statEmoji: { fontSize: 20 },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted },
});
