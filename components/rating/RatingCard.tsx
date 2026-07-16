import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { scoreToColor, formatRelativeTime } from '@/lib/utils';
import type { Rating } from '@/types';

const TYPE_EMOJI: Record<string, string> = {
  song: '🎵',
  album: '💿',
  podcast: '🎙️',
  single: '🎶',
  concert: '🎤',
  music_video: '🎬',
};

interface Props {
  rating: Rating;
  compact?: boolean;
}

export function RatingCard({ rating, compact = false }: Props) {
  const scoreColor = scoreToColor(rating.score);

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      {rating.content_image && (
        <Image source={{ uri: rating.content_image }} style={styles.image} />
      )}
      {!rating.content_image && (
        <View style={[styles.imagePlaceholder, { backgroundColor: `${scoreColor}20` }]}>
          <Text style={styles.typeEmoji}>{TYPE_EMOJI[rating.content_type] || '🎵'}</Text>
        </View>
      )}

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.contentName} numberOfLines={1}>{rating.content_name}</Text>
          <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}20`, borderColor: scoreColor }]}>
            <Text style={[styles.scoreText, { color: scoreColor }]}>{rating.score.toFixed(1)}</Text>
          </View>
        </View>
        <Text style={styles.artistName} numberOfLines={1}>{rating.artist_name}</Text>
        {rating.review && !compact && (
          <Text style={styles.review} numberOfLines={2}>{rating.review}</Text>
        )}
        <View style={styles.meta}>
          <Text style={styles.type}>
            {TYPE_EMOJI[rating.content_type]} {rating.content_type}
          </Text>
          <Text style={styles.date}>{formatRelativeTime(rating.created_at)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardCompact: { padding: Spacing.sm },
  image: { width: 64, height: 64, borderRadius: Radius.sm, flexShrink: 0 },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  typeEmoji: { fontSize: 28 },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  contentName: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: '700' },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  scoreText: { fontSize: 14, fontWeight: '800' },
  artistName: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  review: { color: Colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 16 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  type: { color: Colors.textMuted, fontSize: 11, textTransform: 'capitalize' },
  date: { color: Colors.textMuted, fontSize: 11 },
});
