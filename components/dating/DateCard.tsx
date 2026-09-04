import { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { tasteMatchToColor } from '@/lib/utils';
import type { MatchResult } from '@/lib/ai/matchEngine';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - Spacing.lg * 2;
const CARD_HEIGHT = height * 0.62;
const SWIPE_THRESHOLD = width * 0.3;
const ROTATION_FACTOR = 0.08;

interface Props {
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  match: MatchResult;
  isTop: boolean;
  onLike: () => void;
  onSkip: () => void;
}

export function DateCard({ displayName, username, avatarUrl, bio, match, isTop, onLike, onSkip }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotation = translateX.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [`-${ROTATION_FACTOR * 90}deg`, '0deg', `${ROTATION_FACTOR * 90}deg`],
  });
  const likeOpacity = translateX.interpolate({ inputRange: [20, 100], outputRange: [0, 1], extrapolate: 'clamp' });
  const skipOpacity = translateX.interpolate({ inputRange: [-100, -20], outputRange: [1, 0], extrapolate: 'clamp' });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onPanResponderMove: Animated.event(
        [null, { dx: translateX, dy: translateY }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: (_, { dx, dy }) => {
        if (dx > SWIPE_THRESHOLD) {
          flyOut('right', onLike);
        } else if (dx < -SWIPE_THRESHOLD) {
          flyOut('left', onSkip);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 5 }).start();
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 5 }).start();
        }
      },
    }),
  ).current;

  const flyOut = (direction: 'left' | 'right', callback: () => void) => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: direction === 'right' ? width * 1.5 : -width * 1.5, duration: 280, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 50, duration: 280, useNativeDriver: true }),
    ]).start(callback);
  };

  const matchColor = tasteMatchToColor(match.score);
  const initials = displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [
            { translateX },
            { translateY },
            { rotate: rotation },
          ],
          zIndex: isTop ? 10 : 5,
        },
      ]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      {/* Like indicator */}
      <Animated.View style={[styles.indicator, styles.likeIndicator, { opacity: likeOpacity }]}>
        <Text style={styles.indicatorText}>LIKE </Text>
      </Animated.View>
      {/* Skip indicator */}
      <Animated.View style={[styles.indicator, styles.skipIndicator, { opacity: skipOpacity }]}>
        <Text style={styles.indicatorText}>SKIP </Text>
      </Animated.View>

      {/* Avatar */}
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.avatar}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </LinearGradient>
      )}

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(13,13,13,0.97)']}
        style={styles.gradient}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Match score */}
        <View style={[styles.matchBadge, { borderColor: matchColor }]}>
          <Text style={[styles.matchScore, { color: matchColor }]}>{match.score}%</Text>
          <Text style={[styles.matchLabel, { color: matchColor }]}>{match.label}</Text>
        </View>

        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.username}>@{username}</Text>
        {bio && <Text style={styles.bio} numberOfLines={2}>{bio}</Text>}

        {/* Shared traits */}
        {match.shared_traits.length > 0 && (
          <View style={styles.traits}>
            {match.shared_traits.slice(0, 3).map((trait, i) => (
              <View key={i} style={styles.traitChip}>
                <Text style={styles.traitText}>{trait}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Compatibility bars */}
        <View style={styles.compatBars}>
          <CompatBar label="Vibe" value={match.audio_score} color={Colors.primary} />
          <CompatBar label="Géneros" value={match.genre_score} color={Colors.secondary} />
          <CompatBar label="Mood" value={match.behavior_score} color={Colors.accent} />
        </View>
      </View>
    </Animated.View>
  );
}

function CompatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.compatRow}>
      <Text style={styles.compatLabel}>{label}</Text>
      <View style={styles.compatBarBg}>
        <View style={[styles.compatBarFill, { width: `${value}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.compatValue, { color }]}>{value}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: '100%',
    height: '60%',
    alignItems: 'center',
    justifyContent: 'center',
    resizeMode: 'cover',
  },
  avatarInitials: { fontSize: 72, fontWeight: '800', color: '#fff' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%' },
  content: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, gap: 6 },

  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    marginBottom: 4,
  },
  matchScore: { fontSize: 16, fontWeight: '900' },
  matchLabel: { fontSize: 12, fontWeight: '700' },

  name: { fontSize: 24, fontWeight: '900', color: Colors.text },
  username: { fontSize: 13, color: Colors.textSecondary },
  bio: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },

  traits: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  traitChip: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: `${Colors.primary}50`,
  },
  traitText: { color: Colors.primaryLight, fontSize: 11, fontWeight: '600' },

  compatBars: { gap: 4, marginTop: 6 },
  compatRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compatLabel: { color: Colors.textMuted, fontSize: 10, width: 48 },
  compatBarBg: { flex: 1, height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  compatBarFill: { height: '100%', borderRadius: 2 },
  compatValue: { fontSize: 10, fontWeight: '700', width: 30, textAlign: 'right' },

  indicator: {
    position: 'absolute',
    top: 30,
    zIndex: 20,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 3,
  },
  likeIndicator: { right: 20, borderColor: Colors.secondary, transform: [{ rotate: '15deg' }] },
  skipIndicator: { left: 20, borderColor: Colors.accent, transform: [{ rotate: '-15deg' }] },
  indicatorText: { color: Colors.text, fontSize: 18, fontWeight: '900' },
});
