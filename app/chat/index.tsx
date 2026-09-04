import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useChatStore, type ConversationSummary } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { formatRelativeTime } from '@/lib/utils';

function initialsOf(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '?';
}

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { conversations, loadingConversations, loadConversations } = useChatStore();

  useEffect(() => {
    if (user?.id) loadConversations(user.id);
  }, [user?.id]);

  const renderItem = ({ item }: { item: ConversationSummary }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.8}
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsOf(item.otherUser?.display_name ?? '?')}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.otherUser?.display_name ?? 'Usuario'}</Text>
        <Text style={styles.preview} numberOfLines={1}>{item.lastMessage ?? 'Di algo...'}</Text>
      </View>
      <Text style={styles.time}>{formatRelativeTime(item.updated_at)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mensajes</Text>
        <View style={{ width: 24 }} />
      </View>

      {loadingConversations ? (
        <View style={styles.centered}><ActivityIndicator color={Colors.primary} /></View>
      ) : conversations.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={56} color={Colors.border} />
          <Text style={styles.emptyTitle}>Sin conversaciones</Text>
          <Text style={styles.emptySubtitle}>
            Haz match en SoundMatch o inicia un chat desde el perfil de alguien.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.xxl },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginTop: Spacing.sm },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.text, fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  name: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  preview: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  time: { color: Colors.textMuted, fontSize: 11 },
});
