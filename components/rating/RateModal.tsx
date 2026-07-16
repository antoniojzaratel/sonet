import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '@/stores/musicStore';
import { useAuthStore } from '@/stores/authStore';
import { searchSpotify } from '@/lib/spotify';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { scoreToColor } from '@/lib/utils';
import type { ContentType } from '@/types';

const CONTENT_TYPES: { id: ContentType; label: string; emoji: string }[] = [
  { id: 'song', label: 'Canción', emoji: '🎵' },
  { id: 'album', label: 'Álbum', emoji: '💿' },
  { id: 'concert', label: 'Concierto', emoji: '🎤' },
  { id: 'podcast', label: 'Podcast', emoji: '🎙️' },
  { id: 'single', label: 'Single', emoji: '🎶' },
  { id: 'music_video', label: 'Video', emoji: '🎬' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function RateModal({ visible, onClose }: Props) {
  const { addRating } = useMusicStore();
  const { user, spotifyToken } = useAuthStore();

  const [step, setStep] = useState<'type' | 'search' | 'rate'>('type');
  const [contentType, setContentType] = useState<ContentType>('song');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [score, setScore] = useState(7.0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      if (spotifyToken) {
        const type = contentType === 'song' || contentType === 'single' ? 'track' : contentType === 'album' ? 'album' : 'track';
        const data = await searchSpotify(spotifyToken, query, [type], 8);
        const items = data?.tracks?.items || data?.albums?.items || [];
        setResults(items);
      } else {
        setResults([{ id: 'manual', name: query, artists: [{ name: 'Artista manual' }] }]);
      }
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const handleSelect = (item: any) => {
    setSelected(item);
    setStep('rate');
  };

  const handleSave = async () => {
    if (!user || !selected) return;
    setSaving(true);
    const rating = await addRating({
      user_id: user.id,
      content_type: contentType,
      content_id: selected.id || 'manual',
      content_name: selected.name,
      content_image: selected.album?.images?.[0]?.url || selected.images?.[0]?.url,
      artist_name: selected.artists?.[0]?.name || 'Desconocido',
      album_name: selected.album?.name,
      score,
      review: review.trim() || undefined,
      liked: score >= 7,
    });

    if (rating) {
      Alert.alert('¡Calificado!', `Le diste ${score.toFixed(1)} a "${selected.name}"`);
      handleClose();
    } else {
      Alert.alert('Error', 'No se pudo guardar la calificación');
    }
    setSaving(false);
  };

  const handleClose = () => {
    setStep('type');
    setQuery('');
    setResults([]);
    setSelected(null);
    setScore(7.0);
    setReview('');
    onClose();
  };

  const scoreColor = scoreToColor(score);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {step === 'type' ? 'Calificar' : step === 'search' ? 'Buscar' : 'Rating'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {step === 'type' && (
          <View style={styles.typeGrid}>
            {CONTENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.typeCard, contentType === type.id && styles.typeCardActive]}
                onPress={() => { setContentType(type.id); setStep('search'); }}
                activeOpacity={0.75}
              >
                <Text style={styles.typeEmoji}>{type.emoji}</Text>
                <Text style={[styles.typeLabel, contentType === type.id && styles.typeLabelActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 'search' && (
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                placeholder={`Buscar ${contentType}...`}
                placeholderTextColor={Colors.textMuted}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                autoFocus
              />
              <TouchableOpacity onPress={handleSearch} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Ionicons name="search" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
              {results.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.resultItem}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.resultArtist} numberOfLines={1}>
                    {item.artists?.map((a: any) => a.name).join(', ') || ''}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.manualEntry}
                onPress={() => handleSelect({ id: 'manual', name: query, artists: [] })}
              >
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.manualText}>Agregar "{query}" manualmente</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {step === 'rate' && selected && (
          <ScrollView style={styles.rateContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.selectedItem}>
              <Text style={styles.selectedEmoji}>
                {CONTENT_TYPES.find((t) => t.id === contentType)?.emoji}
              </Text>
              <Text style={styles.selectedName}>{selected.name}</Text>
              <Text style={styles.selectedArtist}>
                {selected.artists?.map((a: any) => a.name).join(', ') || ''}
              </Text>
            </View>

            <View style={styles.scoreSection}>
              <Text style={[styles.scoreBig, { color: scoreColor }]}>{score.toFixed(1)}</Text>
              <Text style={styles.scoreMax}>/ 10.0</Text>
            </View>

            <View style={styles.scoreButtons}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.scoreBtn,
                    Math.round(score) === s && { backgroundColor: scoreToColor(s), borderColor: scoreToColor(s) },
                  ]}
                  onPress={() => setScore(s)}
                >
                  <Text
                    style={[
                      styles.scoreBtnText,
                      Math.round(score) === s && { color: '#fff' },
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.halfButtons}>
              {[-0.5, +0.5].map((delta) => (
                <TouchableOpacity
                  key={delta}
                  style={styles.halfBtn}
                  onPress={() => setScore((prev) => Math.max(1, Math.min(10, +(prev + delta).toFixed(1))))}
                >
                  <Text style={styles.halfBtnText}>{delta > 0 ? '+0.5' : '-0.5'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Escribe una reseña (opcional)..."
              placeholderTextColor={Colors.textMuted}
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.saveButton}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar Rating ⭐</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.lg,
    gap: Spacing.md,
    justifyContent: 'center',
  },
  typeCard: {
    width: '45%',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  typeCardActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  typeEmoji: { fontSize: 36 },
  typeLabel: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  typeLabelActive: { color: Colors.primaryLight },

  searchContainer: { flex: 1, padding: Spacing.lg },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 16 },
  resultsList: { marginTop: Spacing.md },
  resultItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultName: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  resultArtist: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  manualEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  manualText: { color: Colors.primary, fontSize: 14 },

  rateContainer: { flex: 1, padding: Spacing.lg },
  selectedItem: { alignItems: 'center', marginBottom: Spacing.xl },
  selectedEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  selectedName: { fontSize: 22, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  selectedArtist: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },

  scoreSection: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginBottom: Spacing.xl },
  scoreBig: { fontSize: 72, fontWeight: '900' },
  scoreMax: { fontSize: 22, color: Colors.textMuted, fontWeight: '600' },

  scoreButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: Spacing.md },
  scoreBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreBtnText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700' },

  halfButtons: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center', marginBottom: Spacing.xl },
  halfBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  halfBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },

  reviewInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    padding: Spacing.md,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: Spacing.xl,
  },
  saveButton: {
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
