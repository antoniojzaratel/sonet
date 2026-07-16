import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRecommendationStore, type DailyRecommendation } from '@/stores/recommendationStore';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Radius } from '@/constants/colors';

const REASON_ICONS: Record<string, string> = {
  taste_match: '🎯',
  genre_fit:   '🧬',
  trending:    '🔥',
  discovery:   '✨',
};

const REACTION_LABELS = [
  { key: 'loved',         emoji: '❤️',  label: 'Me encantó' },
  { key: 'liked',         emoji: '👍',  label: 'Bien' },
  { key: 'save_playlist', emoji: '➕',  label: 'Guardar' },
  { key: 'skip',          emoji: '⏭️',  label: 'Saltar' },
];

export function SongOfTheDay() {
  const { user } = useAuthStore();
  const { todayRec, loadingRec, fetchTodayRec, requestRec, reactToRec } = useRecommendationStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!user?.id) return;
    fetchTodayRec(user.id).then(() => {
      if (!todayRec) requestRec(user.id);
    });
  }, [user?.id]);

  useEffect(() => {
    if (todayRec && !todayRec.reacted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
      ).start();
    }
  }, [todayRec]);

  const handleReact = async (reaction: string) => {
    if (!user || !todayRec || todayRec.reacted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await reactToRec(user.id, todayRec.date, reaction);
  };

  if (loadingRec) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} size="small" />
        <Text style={styles.loadingText}>Preparando tu canción del día...</Text>
      </View>
    );
  }

  if (!todayRec) return null;

  const energyPercent = Math.round((todayRec.energy || 0.5) * 100);
  const valencePercent = Math.round((todayRec.valence || 0.5) * 100);
  const reasonIcon = REASON_ICONS[todayRec.reason_type] || '🎵';

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🌟 Canción del Día</Text>
        <Text style={styles.sectionDate}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })}
        </Text>
      </View>

      <Animated.View style={[styles.card, { transform: [{ scale: todayRec.reacted ? 1 : pulseAnim }] }]}>
        <LinearGradient
          colors={['#1A0A3E', '#0D1A3E']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.cardInner}>
          <View style={styles.artworkSection}>
            {todayRec.cover_image ? (
              <Image source={{ uri: todayRec.cover_image }} style={styles.artwork} />
            ) : (
              <View style={[styles.artwork, styles.artworkPlaceholder]}>
                <Text style={{ fontSize: 48 }}>🎵</Text>
              </View>
            )}
            {todayRec.preview_url && (
              <TouchableOpacity style={styles.playOverlay}>
                <LinearGradient
                  colors={[`${Colors.primary}CC`, `${Colors.primaryDark}CC`]}
                  style={styles.playButton}
                >
                  <Ionicons name="play" size={22} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.info}>
            <Text style={styles.trackName} numberOfLines={2}>{todayRec.track_name}</Text>
            <Text style={styles.artistName}>{todayRec.artist_name}</Text>

            {todayRec.bpm && (
              <View style={styles.audioBadges}>
                <AudioBadge label="BPM" value={Math.round(todayRec.bpm)} />
                <AudioBadge label="Energía" value={`${energyPercent}%`} />
                <AudioBadge label="Ánimo" value={valencePercent > 60 ? '😊' : valencePercent > 40 ? '😐' : '😔'} />
              </View>
            )}

            <View style={styles.reasonBadge}>
              <Text style={styles.reasonIcon}>{reasonIcon}</Text>
              <Text style={styles.reasonText} numberOfLines={2}>{todayRec.reason}</Text>
            </View>
          </View>
        </View>

        {!todayRec.reacted ? (
          <View style={styles.reactions}>
            {REACTION_LABELS.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={styles.reactionBtn}
                onPress={() => handleReact(r.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                <Text style={styles.reactionLabel}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.reacted}>
            <Text style={styles.reactedText}>
              {REACTION_LABELS.find((r) => r.key === todayRec.reaction)?.emoji}{' '}
              {REACTION_LABELS.find((r) => r.key === todayRec.reaction)?.label}
            </Text>
            <Text style={styles.reactedSub}>Mañana llega una nueva canción ✨</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

function AudioBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.audioBadge}>
      <Text style={styles.audioBadgeValue}>{value}</Text>
      <Text style={styles.audioBadgeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  sectionDate: { fontSize: 12, color: Colors.textMuted, textTransform: 'capitalize' },

  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingText: { color: Colors.textMuted, fontSize: 13 },

  card: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  cardInner: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.md },

  artworkSection: { position: 'relative' },
  artwork: {
    width: 90,
    height: 90,
    borderRadius: Radius.md,
    flexShrink: 0,
  },
  artworkPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  info: { flex: 1, justifyContent: 'center', gap: 4 },
  trackName: { fontSize: 16, fontWeight: '800', color: Colors.text, lineHeight: 20 },
  artistName: { fontSize: 13, color: Colors.textSecondary },

  audioBadges: { flexDirection: 'row', gap: Spacing.xs, marginTop: 4 },
  audioBadge: {
    alignItems: 'center',
    backgroundColor: `${Colors.primary}20`,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  audioBadgeValue: { color: Colors.primaryLight, fontSize: 11, fontWeight: '700' },
  audioBadgeLabel: { color: Colors.textMuted, fontSize: 9 },

  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: `${Colors.secondary}15`,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${Colors.secondary}30`,
  },
  reasonIcon: { fontSize: 12 },
  reasonText: { flex: 1, color: Colors.secondary, fontSize: 10, fontWeight: '600', lineHeight: 13 },

  reactions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: `${Colors.primary}20`,
  },
  reactionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  reactionEmoji: { fontSize: 20 },
  reactionLabel: { color: Colors.textMuted, fontSize: 9 },

  reacted: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${Colors.primary}20`,
  },
  reactedText: { fontSize: 15, fontWeight: '700', color: Colors.text },
  reactedSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
