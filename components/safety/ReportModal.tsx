import { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export type ReportTargetType = 'user' | 'rating' | 'message' | 'story';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate_content' | 'fake_profile' | 'other';

const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Acoso' },
  { id: 'inappropriate_content', label: 'Contenido inapropiado' },
  { id: 'fake_profile', label: 'Perfil falso' },
  { id: 'other', label: 'Otro' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
}

export function ReportModal({ visible, onClose, targetType, targetId }: Props) {
  const { user } = useAuthStore();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setReason(null);
    setDetails('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      Alert.alert('Error', 'No se pudo enviar el reporte. Intenta de nuevo.');
      return;
    }
    Alert.alert('Reporte enviado', 'Gracias — lo revisaremos.');
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Reportar</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>¿Por qué reportas esto?</Text>
          <View style={styles.reasons}>
            {REASONS.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.reasonChip, reason === r.id && styles.reasonChipActive]}
                onPress={() => setReason(r.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.reasonText, reason === r.id && styles.reasonTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Detalles (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Cuéntanos qué pasó..."
            placeholderTextColor={Colors.textMuted}
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.submitBtn, !reason && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!reason || submitting}
            activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Enviar reporte</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  title: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', marginTop: Spacing.sm },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceElevated,
  },
  reasonChipActive: { borderColor: Colors.accent, backgroundColor: `${Colors.accent}22` },
  reasonText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  reasonTextActive: { color: Colors.accent },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    padding: Spacing.md,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
