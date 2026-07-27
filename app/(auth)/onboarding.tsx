import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BG       = '#0D0D0D';
const SURFACE  = '#1A1A1A';
const PRIMARY  = '#A855F7';
const TEXT     = '#FFFFFF';
const TEXT_SEC = '#A0A0A0';
const BORDER   = '#333333';

const GENRES: string[] = [
  'Rock', 'Pop', 'Hip-Hop', 'Corridos', 'Reggaeton',
  'Indie', 'Electronica', 'Jazz', 'Clasica', 'Metal', 'K-Pop', 'Otros',
];

const ONBOARDING_ARTISTS: string[] = [
  'Peso Pluma', 'Bad Bunny', 'Carin Leon', 'Zoe', 'Arctic Monkeys',
  'Radiohead', 'Caifanes', 'Cafe Tacvba', 'Foo Fighters', 'The Weeknd',
  'Natalia Lafourcade', 'Bizarrap', 'Coldplay', 'The Strokes', 'Kendrick Lamar',
  'Drake', 'Rosalia', 'Stromae', 'Bon Iver', 'Tame Impala',
];

const MAX_ARTISTS = 5;

export default function OnboardingScreen() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArtists = searchQuery.length > 0
    ? ONBOARDING_ARTISTS.filter((a) =>
        a.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : ONBOARDING_ARTISTS;

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  const toggleArtist = (artist: string) => {
    setSelectedArtists((prev) => {
      if (prev.includes(artist)) return prev.filter((a) => a !== artist);
      if (prev.length >= MAX_ARTISTS) return prev;
      return [...prev, artist];
    });
  };

  const handleNext = () => {
    setStep(2);
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('sonet_onboarding_genres', JSON.stringify(selectedGenres));
    await AsyncStorage.setItem('sonet_onboarding_artists', JSON.stringify(selectedArtists));
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {step === 1 ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepLabel}>Paso 1 de 2</Text>
            <Text style={styles.title}>Que generos escuchas?</Text>
            <Text style={styles.subtitle}>Selecciona todos los que quieras</Text>

            <View style={styles.chipGrid}>
              {GENRES.map((genre) => {
                const selected = selectedGenres.includes(genre);
                return (
                  <TouchableOpacity
                    key={genre}
                    style={[styles.genreChip, selected && styles.genreChipSelected]}
                    onPress={() => toggleGenre(genre)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.genreChipText, selected && styles.genreChipTextSelected]}>
                      {genre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, selectedGenres.length === 0 && styles.primaryButtonDisabled]}
              onPress={handleNext}
              disabled={selectedGenres.length === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Siguiente</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={styles.btnIcon} />
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View style={styles.flex}>
            <View style={styles.stepHeader}>
              <TouchableOpacity onPress={() => setStep(1)} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color={TEXT} />
              </TouchableOpacity>
              <Text style={styles.stepLabel}>Paso 2 de 2</Text>
            </View>

            <View style={styles.step2TitleBlock}>
              <Text style={styles.title}>Cuales son tus artistas favoritos?</Text>
              <Text style={styles.subtitle}>
                Elige hasta {MAX_ARTISTS} — {selectedArtists.length}/{MAX_ARTISTS} seleccionados
              </Text>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={TEXT_SEC} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar artistas..."
                placeholderTextColor={TEXT_SEC}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={TEXT_SEC} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredArtists}
              keyExtractor={(item) => item}
              style={styles.artistList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = selectedArtists.includes(item);
                const maxReached = selectedArtists.length >= MAX_ARTISTS;
                return (
                  <TouchableOpacity
                    style={[styles.artistRow, selected && styles.artistRowSelected]}
                    onPress={() => toggleArtist(item)}
                    activeOpacity={0.75}
                    disabled={!selected && maxReached}
                  >
                    <View style={[styles.artistAvatar, selected && styles.artistAvatarSelected]}>
                      <Text style={[styles.artistAvatarLetter, selected && styles.artistAvatarLetterSelected]}>
                        {item[0]}
                      </Text>
                    </View>
                    <Text style={[styles.artistName, !selected && maxReached && styles.artistNameMuted]}>
                      {item}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={22} color={PRIMARY} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={[styles.primaryButton, selectedArtists.length === 0 && styles.primaryButtonDisabled]}
                onPress={handleFinish}
                disabled={selectedArtists.length === 0}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Comenzar</Text>
                <Ionicons name="musical-notes" size={18} color="#fff" style={styles.btnIcon} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleFinish} activeOpacity={0.7} style={styles.skipRow}>
                <Text style={styles.skipText}>Conectar Spotify mas tarde para recomendaciones</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
  },

  // Step labels / headers
  stepLabel: {
    color: TEXT_SEC,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  step2TitleBlock: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_SEC,
    lineHeight: 20,
  },

  // Genre chip grid
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 24,
    marginBottom: 36,
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  genreChipSelected: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  genreChipText: {
    color: TEXT_SEC,
    fontSize: 14,
    fontWeight: '600',
  },
  genreChipTextSelected: {
    color: '#fff',
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
    marginHorizontal: 24,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
  },

  // Artist list
  artistList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
    gap: 12,
  },
  artistRowSelected: {
    opacity: 1,
  },
  artistAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistAvatarSelected: {
    backgroundColor: PRIMARY + '22',
    borderColor: PRIMARY,
  },
  artistAvatarLetter: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_SEC,
  },
  artistAvatarLetterSelected: {
    color: PRIMARY,
  },
  artistName: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
    fontWeight: '500',
  },
  artistNameMuted: {
    opacity: 0.4,
  },

  // Bottom actions
  bottomActions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 12,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnIcon: {
    marginLeft: 2,
  },
  skipRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  skipText: {
    color: TEXT_SEC,
    fontSize: 13,
    textAlign: 'center',
  },
});
