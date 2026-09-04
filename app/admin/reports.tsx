import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { checkIsAdmin } from '@/lib/admin';

type ReportStatus = 'open' | 'reviewed' | 'dismissed';

interface ReportRow {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  reporter?: { username: string; display_name: string } | null;
}

const REASON_LABEL: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Acoso',
  inappropriate_content: 'Contenido inapropiado',
  fake_profile: 'Perfil falso',
  other: 'Otro',
};

const STATUS_FILTERS: { id: ReportStatus; label: string }[] = [
  { id: 'open', label: 'Abiertos' },
  { id: 'reviewed', label: 'Revisados' },
  { id: 'dismissed', label: 'Descartados' },
];

export default function AdminReportsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReportStatus>('open');
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    checkIsAdmin(user.id).then((ok) => {
      setAuthorized(ok);
      setAuthChecked(true);
    });
  }, [user?.id]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*, reporter:users!reports_reporter_id_fkey(username, display_name)')
      .eq('status', statusFilter)
      .order('created_at', { ascending: false });
    if (!error && data) setReports(data as unknown as ReportRow[]);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    if (authorized) loadReports();
  }, [authorized, loadReports]);

  const resolveReport = async (id: string, status: 'reviewed' | 'dismissed') => {
    setUpdatingId(id);
    const { error } = await supabase.from('reports').update({ status }).eq('id', id);
    setUpdatingId(null);
    if (error) {
      Alert.alert('Error', 'No se pudo actualizar el reporte.');
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  if (!authChecked) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!authorized) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.deniedTitle}>No autorizado</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.lg }}>
            <Text style={{ color: Colors.primary }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moderación</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filters}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, statusFilter === f.id && styles.filterChipActive]}
            onPress={() => setStatusFilter(f.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, statusFilter === f.id && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Nada aquí — al día</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.reasonBadge}>{REASON_LABEL[item.reason] ?? item.reason}</Text>
                <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleDateString('es-MX')}</Text>
              </View>
              <Text style={styles.targetLine}>
                {item.target_type} · <Text style={styles.mono}>{item.target_id}</Text>
              </Text>
              {!!item.details && <Text style={styles.details}>{item.details}</Text>}
              <Text style={styles.reporterLine}>
                Reportado por {item.reporter?.display_name ?? 'usuario'} (@{item.reporter?.username ?? '?'})
              </Text>

              {statusFilter === 'open' && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.dismissBtn]}
                    onPress={() => resolveReport(item.id, 'dismissed')}
                    disabled={updatingId === item.id}
                  >
                    <Text style={styles.dismissText}>Descartar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.reviewBtn]}
                    onPress={() => resolveReport(item.id, 'reviewed')}
                    disabled={updatingId === item.id}
                  >
                    {updatingId === item.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.reviewText}>Marcar revisado</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 60 },
  deniedTitle: { color: Colors.text, fontSize: 16, fontWeight: '700', marginTop: Spacing.sm },
  emptyText: { color: Colors.textMuted, fontSize: 14 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },

  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  filterChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 6,
    marginBottom: Spacing.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reasonBadge: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timestamp: { color: Colors.textMuted, fontSize: 12 },
  targetLine: { color: Colors.textSecondary, fontSize: 13 },
  mono: { fontFamily: 'monospace' },
  details: { color: Colors.text, fontSize: 14, lineHeight: 20, marginTop: 2 },
  reporterLine: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },

  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: { flex: 1, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center' },
  dismissBtn: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  dismissText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700' },
  reviewBtn: { backgroundColor: Colors.primary },
  reviewText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
