import { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { tasteMatchToLabel, tasteMatchToColor } from '@/lib/utils';
import type { SoundMatchCandidate } from '@/stores/recommendationStore';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.30;

interface Props {
  candidate: SoundMatchCandidate;
  onLike: () => void;
  onPass: () => void;
  onSuperLike: () => void;
  isTop: boolean;
}

export function SoundMatchCard({ candidate, onLike, onPass, onSuperLike, isTop }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const hasSwiped = useRef(false);
  const rotate = translateX.interpolate({ inputRange: [-width, 0, width], outputRange: ['-18deg', '0deg', '18deg'] });
  const likeOpacity = translateX.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const passOpacity = translateX.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onPanResponderMove: (_, { dx, dy }) => {
        translateX.setValue(dx);
        translateY.setValue(dy * 0.2);
      },
      onPanResponderRelease: (_, { dx, dy }) => {
        if (dx > SWIPE_THRESHOLD) {
          swipeOut('right');
        } else if (dx < -SWIPE_THRESHOLD) {
          swipeOut('left');
        } else if (dy < -SWIPE_THRESHOLD) {
          swipeOut('up');
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const swipeOut = (dir: 'left' | 'right' | 'up') => {
    if (hasSwiped.current) return;
    hasSwiped.current = true;
    const toX = dir === 'right' ? width * 1.5 : dir === 'left' ? -width * 1.5 : 0;
    const toY = dir === 'up' ? -500 : 0;
    Animated.parallel([
      Animated.timing(translateX, { toValue: toX, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: toY, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      if (dir === 'right') { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onLike(); }
      else if (dir === 'up') { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); onSuperLike(); }
      else { onPass(); }
    });
  };

  const { age, taste_score, audio_score, genre_score, behavior_score, shared_genres } = candidate;
  const matchColor = tasteMatchToColor(taste_score);
  const matchLabel = tasteMatchToLabel(taste_score);

  return (
    <Animated.View
      style={[
        styles.card,
        isTop && { transform: [{ translateX }, { translateY }, { rotate }] },
        !isTop && styles.cardBack,
      ]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      <LinearGradient colors={['#1A1A3E', '#0D0D0D']} style={StyleSheet.absoluteFill} />

      {/* Like / Pass overlays */}
      {isTop && (
        <>
          <Animated.View style={[styles.overlay, styles.likeOverlay, { opacity: likeOpacity }]}>
            <Text style={styles.overlayText}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.overlay, styles.passOverlay, { opacity: passOpacity }]}>
            <Text style={styles.overlayText}>PASS</Text>
          </Animated.View>
        </>
      )}

      {/* Blind profile: no photo, no name — just the taste match visual */}
      <View style={styles.avatarSection}>
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.avatar}>
          <Ionicons name="person" size={64} color="rgba(255,255,255,0.85)" />
        </LinearGradient>
        <LinearGradient
          colors={['transparent', 'rgba(13,13,13,0.9)']}
          style={styles.avatarGradient}
        />
      </View>

      {/* Match score badge */}
      <View style={[styles.matchBadge, { borderColor: matchColor }]}>
        <Text style={[styles.matchPercent, { color: matchColor }]}>{taste_score}%</Text>
        <Text style={styles.matchLabel}>{matchLabel}</Text>
      </View>

      {/* Blind profile info — age only, never name/photo */}
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{age != null ? `${age} años` : 'Edad oculta'}</Text>
        {!!shared_genres?.length && (
          <View style={styles.chipsRow}>
            {shared_genres.slice(0, 3).map((trait) => (
              <View key={trait} style={styles.chip}>
                <Text style={styles.chipText}>{trait}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Compatibility breakdown bars — real matchEngine.ts dimensions */}
      {(audio_score != null || genre_score != null || behavior_score != null) && (
        <View style={styles.breakdown}>
          {([
            ['Audio', audio_score ?? 0, Colors.primary],
            ['Géneros', genre_score ?? 0, Colors.secondary],
            ['Comportamiento', behavior_score ?? 0, Colors.accent],
          ] as [string, number, string][]).map(([label, score, color]) => (
            <View key={label} style={styles.barRow}>
              <Text style={styles.barLabel}>{label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${score}%` as any, backgroundColor: color }]} />
              </View>
              <Text style={[styles.barScore, { color }]}>{Math.round(score)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      {isTop && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.passBtn]} onPress={() => swipeOut('left')}>
            <Ionicons name="close" size={28} color={Colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.superBtn]} onPress={() => swipeOut('up')}>
            <Ionicons name="star" size={24} color={Colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={() => swipeOut('right')}>
            <Ionicons name="heart" size={28} color={Colors.secondary} />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: width - Spacing.lg * 2,
    height: 520,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardBack: { top: 12, transform: [{ scale: 0.95 }] },

  overlay: {
    position: 'absolute',
    top: 40,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 3,
  },
  likeOverlay: { right: 20, borderColor: Colors.secondary, transform: [{ rotate: '15deg' }] },
  passOverlay: { left: 20, borderColor: Colors.accent, transform: [{ rotate: '-15deg' }] },
  overlayText: { fontSize: 22, fontWeight: '900', color: Colors.text, letterSpacing: 2 },

  avatarSection: { width: '100%', height: 220 },
  avatar: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlyph: { fontSize: 64 },
  avatarGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },

  matchBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    alignItems: 'center',
    backgroundColor: 'rgba(13,13,13,0.85)',
    borderRadius: Radius.full,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  matchPercent: { fontSize: 18, fontWeight: '900' },
  matchLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: '600' },

  userInfo: { padding: Spacing.md, gap: 8 },
  displayName: { fontSize: 22, fontWeight: '800', color: Colors.text },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },

  breakdown: { paddingHorizontal: Spacing.md, gap: 5, flex: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  barLabel: { color: Colors.textMuted, fontSize: 11, width: 80 },
  barTrack: { flex: 1, height: 5, backgroundColor: Colors.surfaceElevated, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barScore: { fontSize: 10, fontWeight: '700', width: 24, textAlign: 'right' },

  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  passBtn: { borderColor: Colors.accent, backgroundColor: `${Colors.accent}15` },
  superBtn: { width: 44, height: 44, borderRadius: 22, borderColor: Colors.warning, backgroundColor: `${Colors.warning}15` },
  likeBtn: { borderColor: Colors.secondary, backgroundColor: `${Colors.secondary}15` },
});
