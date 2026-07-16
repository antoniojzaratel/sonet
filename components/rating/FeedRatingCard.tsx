import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { scoreToColor, formatRelativeTime, getInitials } from '@/lib/utils';
import type { Rating, User } from '@/types';

const TYPE_EMOJI: Record<string, string> = {
  song: '🎵', album: '💿', podcast: '🎙️', single: '🎶', concert: '🎤', music_video: '🎬',
};

interface Props {
  rating: Rating;
  user: Partial<User>;
}

export function FeedRatingCard({ rating, user }: Props) {
  const scoreColor = scoreToColor(rating.score);

  return (
    <View style={styles.card}>
      <View style={styles.userRow}>
        <View style={styles.avatarContainer}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.avatar}>
              <Text style={styles.avatarInitials}>
                {getInitials(user.display_name || user.username || '?')}
              </Text>
            </LinearGradient>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{user.display_name || user.username}</Text>
          <Text style={styles.username}>@{user.username} · {formatRelativeTime(rating.created_at)}</Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.contentImageContainer}>
          {rating.content_image ? (
            <Image source={{ uri: rating.content_image }} style={styles.contentImage} />
          ) : (
            <View style={[styles.contentImage, styles.contentImagePlaceholder]}>
              <Text style={{ fontSize: 32 }}>{TYPE_EMOJI[rating.content_type]}</Text>
            </View>
          )}
        </View>

        <View style={styles.contentInfo}>
          <Text style={styles.contentName} numberOfLines={2}>{rating.content_name}</Text>
          <Text style={styles.artistName} numberOfLines={1}>{rating.artist_name}</Text>
          {rating.album_name && (
            <Text style={styles.albumName} numberOfLines={1}>{rating.album_name}</Text>
          )}
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{TYPE_EMOJI[rating.content_type]} {rating.content_type}</Text>
          </View>
        </View>

        <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
          <LinearGradient
            colors={[`${scoreColor}30`, `${scoreColor}10`]}
            style={StyleSheet.absoluteFill}
          />
          <Text style={[styles.scoreText, { color: scoreColor }]}>{rating.score.toFixed(1)}</Text>
        </View>
      </View>

      {rating.review && (
        <View style={styles.reviewContainer}>
          <Text style={styles.reviewText} numberOfLines={3}>"{rating.review}"</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.action}>
          <Ionicons name="heart-outline" size={20} color={Colors.textMuted} />
          <Text style={styles.actionText}>Me gusta</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action}>
          <Ionicons name="chatbubble-outline" size={20} color={Colors.textMuted} />
          <Text style={styles.actionText}>Comentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action}>
          <Ionicons name="share-outline" size={20} color={Colors.textMuted} />
          <Text style={styles.actionText}>Compartir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  avatarContainer: {},
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#fff', fontSize: 14, fontWeight: '700' },
  userInfo: { flex: 1 },
  displayName: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  username: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  moreButton: { padding: 4 },

  contentRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    paddingTop: 0,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  contentImageContainer: {},
  contentImage: {
    width: 72,
    height: 72,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentImagePlaceholder: { backgroundColor: Colors.surfaceElevated },
  contentInfo: { flex: 1 },
  contentName: { color: Colors.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  artistName: { color: Colors.textSecondary, fontSize: 13, marginTop: 3 },
  albumName: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  typeBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  typeText: { color: Colors.textMuted, fontSize: 11, textTransform: 'capitalize' },
  scoreBadge: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
    flexShrink: 0,
  },
  scoreText: { fontSize: 20, fontWeight: '900' },

  reviewContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  reviewText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18, fontStyle: 'italic' },

  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  actionText: { color: Colors.textMuted, fontSize: 12 },
});
