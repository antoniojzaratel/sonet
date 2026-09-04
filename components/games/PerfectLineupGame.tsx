import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useLineupStore } from '@/stores/lineupStore';
import type { LineupArtist } from '@/lib/lineupPool';

interface Props {
  onExit: () => void;
}

type Step = 'headliner' | 'support' | 'result';

export function PerfectLineupGame({ onExit }: Props) {
  const { user } = useAuthStore();
  const { challenge, attempt, loading, loadToday, submitLineup } = useLineupStore();

  const [step, setStep] = useState<Step>('headliner');
  const [headliner, setHeadliner] = useState<LineupArtist | null>(null);
  const [support, setSupport] = useState<LineupArtist[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) loadToday(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (attempt) setStep('result');
  }, [attempt]);

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

  if (loading || !challenge) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const toggleSupport = (artist: LineupArtist) => {
    setSupport((prev) => {
      const already = prev.some((a) => a.name === artist.name);
      if (already) return prev.filter((a) => a.name !== artist.name);
      if (prev.length >= challenge.supportSlots) return prev;
      return [...prev, artist];
    });
  };

  const handleConfirm = async () => {
    if (!headliner || support.length !== challenge.supportSlots || submitting) return;
    setSubmitting(true);
    await submitLineup(user.id, headliner, support);
    setSubmitting(false);
  };

  const shownHeadliner = attempt?.headliner ?? headliner;
  const shownSupport = attempt?.support ?? support;
  const shownScore = attempt?.score;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1A0F00', Colors.background]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onExit} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfect Lineup</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 'headliner' && !attempt && (
          <>
            <Text style={styles.stepLabel}>Elige tu headliner</Text>
            <Text style={styles.stepHint}>El acto principal — mientras más grande, más gente atrae.</Text>
            <View style={styles.grid}>
              {challenge.candidates.map((artist) => (
                <TouchableOpacity
                  key={artist.name}
                  style={[styles.artistCard, headliner?.name === artist.name && styles.artistCardActive]}
                  onPress={() => setHeadliner(artist)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.artistName} numberOfLines={2}>{artist.name}</Text>
                  <Text style={styles.artistMeta}>{artist.genre} · {artist.popularity}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => headliner && setStep('support')} disabled={!headliner} activeOpacity={0.8}>
              <LinearGradient
                colors={headliner ? [Colors.primary, Colors.primaryDark] : [Colors.border, Colors.border]}
                style={styles.confirmButton}
              >
                <Text style={styles.confirmButtonText}>Siguiente</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {step === 'support' && !attempt && headliner && (
          <>
            <Text style={styles.stepLabel}>
              Elige {challenge.supportSlots} actos de apoyo ({support.length}/{challenge.supportSlots})
            </Text>
            <Text style={styles.stepHint}>Piensa en género y qué tan cerca están de opacar a {headliner.name}.</Text>
            <View style={styles.grid}>
              {challenge.candidates
                .filter((a) => a.name !== headliner.name)
                .map((artist) => {
                  const selected = support.some((a) => a.name === artist.name);
                  return (
                    <TouchableOpacity
                      key={artist.name}
                      style={[styles.artistCard, selected && styles.artistCardActive]}
                      onPress={() => toggleSupport(artist)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.artistName} numberOfLines={2}>{artist.name}</Text>
                      <Text style={styles.artistMeta}>{artist.genre} · {artist.popularity}</Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
            <TouchableOpacity onPress={handleConfirm} disabled={support.length !== challenge.supportSlots || submitting} activeOpacity={0.8}>
              <LinearGradient
                colors={support.length === challenge.supportSlots ? [Colors.primary, Colors.primaryDark] : [Colors.border, Colors.border]}
                style={styles.confirmButton}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Confirmar lineup</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {step === 'result' && shownScore && shownHeadliner && (
          <View style={styles.result}>
            <Ionicons
              name={shownScore.total >= 75 ? 'flame' : shownScore.total >= 50 ? 'megaphone' : 'trending-down'}
              size={44}
              color={shownScore.total >= 75 ? Colors.accent : shownScore.total >= 50 ? Colors.primary : Colors.textMuted}
            />
            <Text style={styles.scoreTotal}>{shownScore.total}</Text>
            <Text style={styles.scoreTotalLabel}>Probabilidad de sold out</Text>

            <View style={styles.lineupSummary}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="mic" size={16} color={Colors.text} />
                <Text style={styles.headlinerLine}>{shownHeadliner.name}</Text>
              </View>
              {shownSupport.map((s) => (
                <Text key={s.name} style={styles.supportLine}>+ {s.name}</Text>
              ))}
            </View>

            <View style={styles.breakdown}>
              <BreakdownRow label="Fuerza del headliner" value={shownScore.headlinerStrength} />
              <BreakdownRow label="Cohesión de género" value={shownScore.genreCohesion} />
              <BreakdownRow label="Balance de popularidad" value={shownScore.popularityBalance} />
            </View>

            <Text style={styles.artistName}>Vuelve mañana para un nuevo cartel</Text>
            <TouchableOpacity onPress={onExit} activeOpacity={0.8}>
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.nextButton}>
                <Text style={styles.confirmButtonText}>Volver</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <View style={styles.breakdownBarTrack}>
        <View style={[styles.breakdownBarFill, { width: `${Math.max(4, value)}%` }]} />
      </View>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
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

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  stepLabel: { color: Colors.text, fontSize: 18, fontWeight: '800', marginTop: Spacing.sm },
  stepHint: { color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.sm },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  artistCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  artistCardActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}22` },
  artistName: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  artistMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },

  confirmButton: { borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.lg },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  result: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.md },
  resultEmoji: { fontSize: 48 },
  scoreTotal: { fontSize: 56, fontWeight: '900', color: Colors.primary },
  scoreTotalLabel: { color: Colors.textSecondary, fontSize: 14, marginBottom: Spacing.md },

  lineupSummary: { alignItems: 'center', gap: 4, marginBottom: Spacing.lg },
  headlinerLine: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  supportLine: { color: Colors.textSecondary, fontSize: 14 },

  breakdown: { width: '100%', gap: Spacing.sm, marginBottom: Spacing.lg },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  breakdownLabel: { color: Colors.textSecondary, fontSize: 12, width: 140 },
  breakdownBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.surfaceElevated, overflow: 'hidden' },
  breakdownBarFill: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  breakdownValue: { color: Colors.text, fontSize: 12, fontWeight: '700', width: 28, textAlign: 'right' },

  nextButton: { borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: Spacing.xxl, marginTop: Spacing.sm },
});
