import { useEffect, useState, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { useRecommendationStore, type SoundMatchCandidate } from '@/stores/recommendationStore';
import { useAuthStore } from '@/stores/authStore';
import { SoundMatchCard } from '@/components/soundmatch/SoundMatchCard';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { DEMO_USER_ID } from '@/lib/demoContent';
import { LOOKING_FOR_OPTIONS, type LookingFor } from '@/app/(tabs)/soundmatch/settings';

const { width } = Dimensions.get('window');

export default function SoundMatchScreen() {
  const router = useRouter();
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
  // null = still checking soundmatch_profiles; false = off/no row; true = active
  const [optedIn, setOptedIn] = useState<boolean | null>(null);
  // First thing in the flow once active: what are you looking for? Gates
  // the swipe deck until chosen — friends, dating, music buddy, or concert
  // buddy (owner's explicit ask: intent comes before any swiping).
  const [intent, setIntent] = useState<LookingFor[]>([]);
  const [intentChosen, setIntentChosen] = useState(false);

  const checkActive = useCallback(async () => {
    if (!user?.id) return;
    if (user.id === DEMO_USER_ID) {
      setOptedIn(true); // demo account: no backend to check, always available
      return;
    }
    const { data } = await supabase
      .from('soundmatch_profiles')
      .select('active')
      .eq('user_id', user.id)
      .maybeSingle();
    setOptedIn(!!data?.active);
  }, [user?.id]);

  useEffect(() => {
    checkActive();
  }, [checkActive]);

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

  if (optedIn === null) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!optedIn) {
    return (
      <OptInScreen
        onOptIn={() => {
          if (user?.id === DEMO_USER_ID) setOptedIn(true);
          else router.push('/(tabs)/soundmatch/settings');
        }}
      />
    );
  }

  if (!intentChosen) {
    return (
      <IntentPicker
        selected={intent}
        onToggle={(v) => setIntent((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))}
        onContinue={() => setIntentChosen(true)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1A0A3E', Colors.background]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>SoundMatch</Text>
          <Text style={styles.subtitle}>Match por compatibilidad musical</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/soundmatch/settings')} hitSlop={12}>
          <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['discover', 'matches'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'discover' ? 'Descubrir' : `Matches (${soundMatchMatches.length})`}
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
              <Ionicons name="people-outline" size={56} color={Colors.textMuted} />
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
              <Ionicons name="heart-dislike-outline" size={56} color={Colors.textMuted} />
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
  const router = useRouter();
  const other = match.other_user;
  if (!other) return null;
  return (
    <TouchableOpacity
      style={styles.matchRow}
      activeOpacity={0.8}
      disabled={!match.conversation_id}
      onPress={() => match.conversation_id && router.push(`/chat/${match.conversation_id}`)}
    >
      <View style={styles.matchAvatar}>
        <Ionicons name="person" size={20} color={Colors.primary} />
      </View>
      <View style={styles.matchInfo}>
        <Text style={styles.matchName}>{other.display_name || other.username}</Text>
        <Text style={styles.matchIcebreaker} numberOfLines={1}>{match.icebreaker}</Text>
      </View>
      <View style={styles.matchScore}>
        <Text style={[styles.matchScoreText, { color: Colors.primary }]}>{Math.round(match.taste_score)}%</Text>
      </View>
      <Ionicons name="chatbubble-outline" size={18} color={Colors.textSecondary} />
    </TouchableOpacity>
  );
}

function IntentPicker({
  selected,
  onToggle,
  onContinue,
}: {
  selected: LookingFor[];
  onToggle: (v: LookingFor) => void;
  onContinue: () => void;
}) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1A0A3E', Colors.background]} style={StyleSheet.absoluteFill} />
      <View style={styles.intentContent}>
        <Text style={styles.intentTitle}>¿Qué buscas?</Text>
        <Text style={styles.intentSubtitle}>Puedes elegir más de uno — esto define quién te aparece.</Text>

        <View style={styles.intentGrid}>
          {LOOKING_FOR_OPTIONS.map((opt) => {
            const active = selected.includes(opt.value);
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.intentCard, active && styles.intentCardActive]}
                onPress={() => onToggle(opt.value)}
                activeOpacity={0.85}
              >
                <Ionicons name={opt.icon} size={26} color={active ? '#fff' : Colors.textSecondary} />
                <Text style={[styles.intentCardText, active && styles.intentCardTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={onContinue} disabled={selected.length === 0} activeOpacity={0.85} style={{ width: '100%' }}>
          <LinearGradient
            colors={selected.length ? [Colors.primary, Colors.primaryDark] : [Colors.border, Colors.border]}
            style={styles.intentButton}
          >
            <Text style={styles.intentButtonText}>Continuar</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function OptInScreen({ onOptIn }: { onOptIn: () => void }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#2D0A5C', Colors.background]} style={StyleSheet.absoluteFill} />
      <View style={styles.optInContent}>
        <Ionicons name="heart-circle-outline" size={72} color={Colors.primary} />
        <Text style={styles.optInTitle}>SoundMatch</Text>
        <Text style={styles.optInSubtitle}>
          Conoce personas que aman la misma música que tú
        </Text>
        <View style={styles.optInFeatures}>
          {(
            [
              ['analytics-outline', 'Match basado en tu ADN musical real'],
              ['locate-outline', 'Compatibilidad por géneros, BPM, mood y era'],
              ['chatbubbles-outline', 'Chats con ice-breakers musicales'],
              ['musical-notes-outline', 'Encuentra con quién ir a conciertos'],
            ] as const
          ).map(([icon, text]) => (
            <View key={text} style={styles.optInFeature}>
              <Ionicons name={icon} size={22} color={Colors.primaryLight} />
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
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

  intentContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  intentTitle: { fontSize: 28, fontWeight: '900', color: Colors.text, textAlign: 'center' },
  intentSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md },
  intentGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  intentCard: {
    width: '46%',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  intentCardActive: { backgroundColor: `${Colors.primary}25`, borderColor: Colors.primary },
  intentCardText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  intentCardTextActive: { color: Colors.text },
  intentButton: { borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.lg },
  intentButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
