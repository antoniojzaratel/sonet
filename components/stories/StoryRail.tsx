import { ScrollView, View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/colors';
import type { UserStories } from '@/lib/stories';

interface Props {
  groups: UserStories[];
  currentUserId?: string;
  onCreatePress: () => void;
}

function initials(name: string): string {
  return (
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  );
}

const RING_SIZE = 64;

export function StoryRail({ groups, currentUserId, onCreatePress }: Props) {
  const router = useRouter();

  if (groups.length === 0 && !currentUserId) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.rail}
      contentContainerStyle={styles.railContent}
    >
      {currentUserId && (
        <TouchableOpacity style={styles.item} onPress={onCreatePress} activeOpacity={0.8}>
          <View style={[styles.ring, styles.ringMuted]}>
            <View style={styles.avatarFallback}>
              <Ionicons name="add" size={24} color={Colors.text} />
            </View>
          </View>
          <Text style={styles.label} numberOfLines={1}>Tu historia</Text>
        </TouchableOpacity>
      )}

      {groups.map((g) => (
        <TouchableOpacity
          key={g.user_id}
          style={styles.item}
          onPress={() => router.push(`/stories/${g.user_id}`)}
          activeOpacity={0.8}
        >
          <View style={[styles.ring, g.hasUnseen ? styles.ringActive : styles.ringMuted]}>
            {g.avatar_url ? (
              <Image source={{ uri: g.avatar_url }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials(g.display_name)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {g.user_id === currentUserId ? 'Tú' : g.display_name.split(' ')[0]}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { marginTop: 10 },
  railContent: { paddingHorizontal: 16, gap: 14 },
  item: { alignItems: 'center', width: RING_SIZE + 8 },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  ringActive: { borderColor: Colors.primary },
  ringMuted: { borderColor: '#2A2A2A' },
  avatarImg: { width: RING_SIZE - 8, height: RING_SIZE - 8, borderRadius: (RING_SIZE - 8) / 2 },
  avatarFallback: {
    width: RING_SIZE - 8,
    height: RING_SIZE - 8,
    borderRadius: (RING_SIZE - 8) / 2,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: Colors.text, fontWeight: '700', fontSize: 16 },
  label: { color: Colors.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'center' },
});
