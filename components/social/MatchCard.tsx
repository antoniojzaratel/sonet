import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSocialStore } from '@/stores/socialStore';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { tasteMatchToLabel, tasteMatchToColor, getInitials } from '@/lib/utils';
import type { Match } from '@/types';

interface Props {
  match: Match;
}

export function MatchCard({ match }: Props) {
  const { startConversation } = useSocialStore();
  const { user } = useAuthStore();
  const { user: matchUser, taste_score, shared_artists } = match;

  const matchColor = tasteMatchToColor(taste_score);
  const matchLabel = tasteMatchToLabel(taste_score);

  const handleMessage = async () => {
    if (!user) return;
    const convId = await startConversation(user.id, matchUser.id);
    if (convId) {
      // Navigate to chat screen
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.avatarSection}>
        {matchUser.avatar_url ? (
          <Image source={{ uri: matchUser.avatar_url }} style={styles.avatar} />
        ) : (
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.avatar}>
            <Text style={styles.avatarInitials}>{getInitials(matchUser.display_name || matchUser.username || '?')}</Text>
          </LinearGradient>
        )}
        <View style={[styles.matchBadge, { backgroundColor: matchColor }]}>
          <Text style={styles.matchScore}>{taste_score}%</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.displayName}>{matchUser.display_name}</Text>
        <Text style={styles.username}>@{matchUser.username}</Text>
        <Text style={[styles.matchLabel, { color: matchColor }]}>{matchLabel}</Text>
        {shared_artists.length > 0 && (
          <Text style={styles.shared} numberOfLines={1}>
            🎵 {shared_artists.slice(0, 3).join(', ')}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.followButton]}>
          <Ionicons name="person-add-outline" size={18} color={Colors.text} />
        </TouchableOpacity>
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
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarSection: { position: 'relative' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#fff', fontSize: 20, fontWeight: '700' },
  matchBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  matchScore: { color: '#fff', fontSize: 10, fontWeight: '800' },

  info: { flex: 1 },
  displayName: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  username: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  matchLabel: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  shared: { color: Colors.textMuted, fontSize: 11, marginTop: 3 },

  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.primary}15`,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  followButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});
