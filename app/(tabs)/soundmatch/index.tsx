import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRecommendationStore, type SoundMatchCandidate } from '@/stores/recommendationStore';
import { useAuthStore } from '@/stores/authStore';
import { SoundMatchCard } from '@/components/soundmatch/SoundMatchCard';
import { Colors, Spacing, Radius } from '@/constants/colors';

const { width } = Dimensions.get('window');

export default function SoundMatchScreen() {
  const { user } = useAuthStore();
  const {
    soundMatchCandidates,
    soundMatchMatches,
    loadingCandidates,
    fetchSoundMatchCandidates,
    fetchSoundMatchMatches,
    swipeSoundMatch,
  } = useRecommendationStore();

  const [tab, setTab] = useState<'discover' | 'matches'>('discover');
  const [optedIn, setOptedIn] = useState(false);

  useEffect(() => {
    if (user?.id && optedIn) {
      fetchSoundMatchCandidates(user.id);
      fetchSoundMatchMatches(user.id);
    }
  }, [user?.id, optedIn]);

  const handleLike = async (candidateId: string) => {
    if (!user?.id) return;
    await swipeSoundMatch(user.id, candidateId, 'like');
  };

  const handlePass = async (candidateId: string) => {
    if (!user?.id) return;
    await swipeSoundMatch(user.id, candidateId, 'pass');
  };

  const handleSuperLike = async (candidateId: string) => {
    if (!user?.id) return;
    await swipeSoundMatch(user.id, candidateId, 'super_like');
  };

  if (!optedIn) {
    return <OptInScreen onOptIn={() => setOptedIn(true)} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1A0A3E', Colors.background]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <Text style={styles.title}>SoundMatch 💘</Text>
        <Text style={styles.subtitle}>Match por compatibilidad musical</Text>
      </View>

      <View style={styles.tabs}>
        {(['discover', 'matches'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'discover' ? '🎵 Descubrir' : `💬 Matches (${soundMatchMatches.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'discover' && (
        <View style={styles.cardStack}>
          {loadingCandidates ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Buscando matches musicales...</Text>
            </View>
          ) : soundMatchCandidates.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyEmoji}>🎭</Text>
              <Text style={styles.emptyTitle}>Sin más candidatos</Text>
              <Text style={styles.emptyText}>
                Vuelve mañana o califica más música para mejorar tu match
              </Text>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={() => user?.id && fetchSoundMatchCandidates(user.id)}
              >
                <Text style={styles.refreshText}>Refrescar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {soundMatchCandidates.slice(0, 3).map((candidate, index) => (
                <SoundMatchCard
                  key={candidate.user.id}
                  candidate={candidate}
                  compatBreakdown={null}
                  onLike={() => handleLike(candidate.user.id)}
                  onPass={() => handlePass(candidate.user.id)}
                  onSuperLike={() => handleSuperLike(candidate.user.id)}
                  isTop={index === 0}
                />
              ))}
            </>
          )}
        </View>
      )}

      {tab === 'matches' && (
        <View style={styles.matchesList}>
          {soundMatchMatches.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyEmoji}>💔</Text>
              <Text style={styles.emptyTitle}>Sin matches aún</Text>
              <Text style={styles.emptyText}>Sigue descubriendo candidatos</Text>
            </View>
          ) : (
            soundMatchMatches.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function MatchRow({ match }: { match: any }) {
  const other = match.other_user;
  if (!other) return null;
  return (
    <View style={styles.matchRow}>
      <View style={styles.matchAvatar}>
        <Text style={{ fontSize: 20 }}>👤</Text>
      </View>
      <View style={styles.matchInfo}>
        <Text style={styles.matchName}>{other.display_name || other.username}</Text>
        <Text style={styles.matchIcebreaker} numberOfLines={1}>{match.icebreaker}</Text>
      </View>
      <View style={styles.matchScore}>
        <Text style={[styles.matchScoreText, { color: Colors.primary }]}>{Math.round(match.taste_score)}%</Text>
      </View>
    </View>
  );
}

function OptInScreen({ onOptIn }: { onOptIn: () => void }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#2D0A5C', Colors.background]} style={StyleSheet.absoluteFill} />
      <View style={styles.optInContent}>
        <Text style={styles.optInEmoji}>💘</Text>
        <Text style={styles.optInTitle}>SoundMatch</Text>
        <Text style={styles.optInSubtitle}>
          Conoce personas que aman la misma música que tú
        </Text>
        <View style={styles.optInFeatures}>
          {[
            ['🧬', 'Match basado en tu ADN musical real'],
            ['🎯', 'Compatibilidad por géneros, BPM, mood y era'],
            ['💬', 'Chats con ice-breakers musicales'],
            ['🎤', 'Encuentra con quién ir a conciertos'],
          ].map(([emoji, text]) => (
            <View key={text} style={styles.optInFeature}>
              <Text style={styles.optInFeatureEmoji}>{emoji}</Text>
              <Text style={styles.optInFeatureText}>{text}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity onPress={onOptIn} activeOpacity={0.85}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.optInButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="heart" size={20} color="#fff" />
            <Text style={styles.optInButtonText}>Activar SoundMatch</Text>
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.optInDisclaimer}>
          Puedes desactivarlo en cualquier momento desde tu perfil
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  title: { fontSize: 28, fontWeight: '900', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: Radius.full,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: { backgroundColor: `${Colors.primary}20`, borderColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: Colors.primaryLight },

  cardStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xxl },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  refreshBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginTop: Spacing.sm,
  },
  refreshText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },

  matchesList: { flex: 1, paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  matchAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  matchInfo: { flex: 1 },
  matchName: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  matchIcebreaker: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  matchScore: {},
  matchScoreText: { fontSize: 18, fontWeight: '900' },

  optInContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  optInEmoji: { fontSize: 80 },
  optInTitle: { fontSize: 36, fontWeight: '900', color: Colors.text },
  optInSubtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  optInFeatures: { width: '100%', gap: Spacing.sm },
  optInFeature: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md },
  optInFeatureEmoji: { fontSize: 24 },
  optInFeatureText: { flex: 1, color: Colors.text, fontSize: 14, lineHeight: 18 },
  optInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xxl,
  },
  optInButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  optInDisclaimer: { color: Colors.textMuted, fontSize: 12, textAlign: 'center' },
});
