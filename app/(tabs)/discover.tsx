import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSocialStore } from '@/stores/socialStore';
import { useAuthStore } from '@/stores/authStore';
import { MatchCard } from '@/components/social/MatchCard';
import { Colors, Spacing } from '@/constants/colors';

type Tab = 'matches' | 'following';

export default function DiscoverScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('matches');
  const { matches, loadingMatches, fetchMatches } = useSocialStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.id) fetchMatches(user.id);
  }, [user?.id]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Descubrir</Text>
        <Text style={styles.subtitle}>Gente con tu mismo gusto musical</Text>
      </View>

      <View style={styles.tabs}>
        {(['matches', 'following'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'matches' ? '🎯 Taste Match' : '👥 Siguiendo'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'matches' && (
        <>
          {loadingMatches ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Calculando compatibilidades...</Text>
            </View>
          ) : (
            <FlatList
              data={matches}
              keyExtractor={(item) => item.user.id}
              renderItem={({ item }) => <MatchCard match={item} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>🎸</Text>
                  <Text style={styles.emptyTitle}>Sin matches aún</Text>
                  <Text style={styles.emptyText}>
                    Califica más música para encontrar personas con tu mismo gusto
                  </Text>
                </View>
              }
              contentContainerStyle={matches.length === 0 ? { flex: 1 } : styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {activeTab === 'following' && (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyTitle}>Tus seguidores</Text>
          <Text style={styles.emptyText}>Aquí verás a la gente que sigues</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: { backgroundColor: `${Colors.primary}20`, borderColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: Colors.primaryLight },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 20, gap: Spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { color: Colors.textSecondary, fontSize: 14, marginTop: Spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xxl },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
