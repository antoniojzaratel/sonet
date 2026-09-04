import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { searchMusic, type MusicItem } from '@/lib/musicDB';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPublish: (localImageUri: string, caption: string | undefined, track: MusicItem | null) => Promise<boolean>;
}

export function CreateStoryModal({ visible, onClose, onPublish }: Props) {
  const { spotifyToken } = useAuthStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [track, setTrack] = useState<MusicItem | null>(null);
  const [showSongSearch, setShowSongSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const reset = () => {
    setImageUri(null);
    setCaption('');
    setTrack(null);
    setShowSongSearch(false);
    setQuery('');
    setResults([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para publicar una historia.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [9, 16],
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para publicar una historia.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [9, 16] });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const runSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const items = await searchMusic({ query: q, types: ['song'], accessToken: spotifyToken ?? undefined, limit: 8 });
      setResults(items);
    } catch {
      setResults([]);
    }
    setSearching(false);
  };

  const handlePublish = async () => {
    if (!imageUri) return;
    setPublishing(true);
    const ok = await onPublish(imageUri, caption.trim() || undefined, track);
    setPublishing(false);
    if (ok) {
      handleClose();
    } else {
      Alert.alert('Error', 'No se pudo publicar tu historia. Intenta de nuevo.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Nueva historia</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {imageUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: imageUri }} style={styles.preview} />
              <TouchableOpacity style={styles.retakeBtn} onPress={() => setImageUri(null)} activeOpacity={0.8}>
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.retakeText}>Cambiar foto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickRow}>
              <TouchableOpacity style={styles.pickBtn} onPress={takePhoto} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={28} color={Colors.primary} />
                <Text style={styles.pickBtnText}>Cámara</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickBtn} onPress={pickFromLibrary} activeOpacity={0.8}>
                <Ionicons name="images-outline" size={28} color={Colors.primary} />
                <Text style={styles.pickBtnText}>Galería</Text>
              </TouchableOpacity>
            </View>
          )}

          {imageUri && (
            <>
              <TextInput
                style={styles.captionInput}
                placeholder="Agrega un texto (opcional)..."
                placeholderTextColor={Colors.textMuted}
                value={caption}
                onChangeText={setCaption}
              />

              {track ? (
                <View style={styles.trackChip}>
                  <Ionicons name="musical-notes" size={16} color={Colors.primary} />
                  <Text style={styles.trackChipText} numberOfLines={1}>
                    {track.name} · {track.artist_name}
                  </Text>
                  <TouchableOpacity onPress={() => setTrack(null)} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : showSongSearch ? (
                <View style={styles.songSearchBox}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Busca una canción..."
                    placeholderTextColor={Colors.textMuted}
                    value={query}
                    onChangeText={runSearch}
                    autoFocus
                  />
                  {searching && <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />}
                  {results.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.resultRow}
                      onPress={() => {
                        setTrack(item);
                        setShowSongSearch(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.resultArtist} numberOfLines={1}>{item.artist_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TouchableOpacity style={styles.addSongBtn} onPress={() => setShowSongSearch(true)} activeOpacity={0.8}>
                  <Ionicons name="musical-note-outline" size={16} color={Colors.primary} />
                  <Text style={styles.addSongText}>Agregar una canción</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.publishBtn} onPress={handlePublish} disabled={publishing} activeOpacity={0.85}>
                {publishing ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishText}>Publicar historia</Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { color: Colors.text, fontWeight: '700', fontSize: 18 },
  scroll: { padding: Spacing.lg, paddingBottom: 48 },

  pickRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  pickBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  pickBtnText: { color: Colors.text, fontWeight: '600', fontSize: 13 },

  previewWrap: { alignItems: 'center' },
  preview: { width: '100%', aspectRatio: 9 / 16, borderRadius: Radius.lg, backgroundColor: Colors.surface },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
  },
  retakeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  captionInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 14,
    marginTop: Spacing.lg,
  },

  addSongBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
    paddingVertical: 10,
  },
  addSongText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  trackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: Spacing.md,
  },
  trackChipText: { flex: 1, color: Colors.text, fontSize: 13, fontWeight: '600' },

  songSearchBox: { marginTop: Spacing.md },
  searchInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 14,
  },
  resultRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultName: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  resultArtist: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  publishBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  publishText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
