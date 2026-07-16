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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG        = '#0D0D0D';
const SURFACE   = '#1A1A1A';
const PRIMARY   = '#A855F7';
const TEXT      = '#FFFFFF';
const TEXT_SEC  = '#A0A0A0';
const TEXT_MUTED = '#666666';
const BORDER    = '#2A2A2A';

interface Artist {
  name: string;
  genre: string;
  color: string;
}

const ARTISTS: Artist[] = [
  { name: 'Peso Pluma',     genre: 'Corridos tumbados', color: '#A855F7' },
  { name: 'Carin León',     genre: 'Regional mexicano', color: '#F43F5E' },
  { name: 'Zoé',            genre: 'Rock en español',   color: '#84CC16' },
  { name: 'The Warning',    genre: 'Rock',              color: '#F59E0B' },
  { name: 'Arctic Monkeys', genre: 'Indie rock',        color: '#3B82F6' },
  { name: 'Bad Bunny',      genre: 'Reggaetón / Trap',  color: '#EC4899' },
  { name: 'Rosalía',        genre: 'Pop / Flamenco',    color: '#EF4444' },
  { name: 'Caifanes',       genre: 'Rock en español',   color: '#8B5CF6' },
  { name: 'Junior H',       genre: 'Corridos tumbados', color: '#10B981' },
  { name: 'Natanael Cano',  genre: 'Corridos tumbados', color: '#F97316' },
  { name: 'Tame Impala',    genre: 'Psychedelic pop',   color: '#06B6D4' },
  { name: 'The Strokes',    genre: 'Indie rock',        color: '#6366F1' },
  { name: 'Radiohead',      genre: 'Alternative',       color: '#64748B' },
  { name: 'Kendrick Lamar', genre: 'Hip-hop',           color: '#EAB308' },
  { name: 'Maná',           genre: 'Rock en español',   color: '#22C55E' },
  { name: 'Café Tacvba',    genre: 'Rock alternativo',  color: '#FB923C' },
  { name: 'Fuerza Regida',  genre: 'Corridos tumbados', color: '#A855F7' },
  { name: 'Taylor Swift',   genre: 'Pop',               color: '#EC4899' },
  { name: 'Drake',          genre: 'Hip-hop / R&B',     color: '#0EA5E9' },
  { name: 'Beyoncé',        genre: 'Pop / R&B',         color: '#F59E0B' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [searchQuery, setSearchQuery]         = useState('');
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);

  // Filtered results — only shown when user has typed something
  const filteredArtists = searchQuery.length > 0
    ? ARTISTS.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  const detectedGenres = Array.from(
    new Set(selectedArtists.map((a) => a.genre)),
  );

  const isArtistSelected = (artist: Artist) =>
    selectedArtists.some((a) => a.name === artist.name);

  const addArtist = (artist: Artist) => {
    if (isArtistSelected(artist) || selectedArtists.length >= 20) return;
    setSelectedArtists((prev) => [...prev, artist]);
  };

  const removeArtist = (name: string) => {
    setSelectedArtists((prev) => prev.filter((a) => a.name !== name));
  };

  const handleCreateProfile = async () => {
    await AsyncStorage.setItem(
      'onboarding_artists',
      JSON.stringify(selectedArtists),
    );
    router.replace('/(tabs)');
  };

  const count   = selectedArtists.length;
  const ready   = count >= 5;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.headerRow}>
            <Text style={styles.titleBold}>¿Qué escuchas?</Text>
            <Text style={styles.titleAccent}> · elige 5+</Text>
          </View>
          <Text style={styles.subtitle}>
            Busca tus artistas favoritos para crear tu perfil musical
          </Text>

          {/* ── Search ── */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={TEXT_MUTED} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Busca artistas... prueba 'peso p'"
              placeholderTextColor={TEXT_MUTED}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Search results ── */}
          {filteredArtists.length > 0 && (
            <View style={styles.resultsList}>
              {filteredArtists.map((artist) => {
                const selected = isArtistSelected(artist);
                return (
                  <TouchableOpacity
                    key={artist.name}
                    style={[styles.resultRow, selected && styles.resultRowSelected]}
                    onPress={() => addArtist(artist)}
                    activeOpacity={0.7}
                  >
                    {/* Colored avatar */}
                    <View style={[styles.avatar, { backgroundColor: artist.color + '33' }]}>
                      <Text style={[styles.avatarLetter, { color: artist.color }]}>
                        {artist.name[0]}
                      </Text>
                    </View>

                    {/* Info */}
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{artist.name}</Text>
                      <Text style={styles.resultGenre}>{artist.genre}</Text>
                    </View>

                    {/* Add button */}
                    <TouchableOpacity
                      style={[styles.addBtn, selected && styles.addBtnSelected]}
                      onPress={() => addArtist(artist)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons
                        name={selected ? 'checkmark' : 'add'}
                        size={18}
                        color={selected ? PRIMARY : TEXT_SEC}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Selected artists ── */}
          {selectedArtists.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Tus artistas</Text>
              <View style={styles.chipWrap}>
                {selectedArtists.map((artist) => (
                  <View key={artist.name} style={styles.selectedChip}>
                    <Text style={styles.selectedChipText}>{artist.name}</Text>
                    <TouchableOpacity
                      onPress={() => removeArtist(artist.name)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={styles.removeX}> ×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Detected genres ── */}
          {detectedGenres.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Géneros detectados</Text>
              <View style={styles.chipWrap}>
                {detectedGenres.map((genre) => (
                  <View key={genre} style={styles.genreChip}>
                    <Text style={styles.genreChipText}>{genre}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Progress ── */}
          <Text style={[styles.progressText, ready && styles.progressTextReady]}>
            {count} / 5 artistas seleccionados
          </Text>

          {/* ── CTA ── */}
          <TouchableOpacity
            onPress={handleCreateProfile}
            disabled={!ready}
            activeOpacity={0.85}
            style={[styles.ctaWrapper, !ready && styles.ctaDisabled]}
          >
            <LinearGradient
              colors={['#A855F7', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Crear mi perfil musical →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 48,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  titleBold: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT,
  },
  titleAccent: {
    fontSize: 26,
    fontWeight: '800',
    color: PRIMARY,
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_SEC,
    lineHeight: 20,
    marginBottom: 24,
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
    marginBottom: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
    height: '100%',
  },

  // Results list
  resultsList: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  resultRowSelected: {
    backgroundColor: PRIMARY + '10',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarLetter: {
    fontSize: 17,
    fontWeight: '700',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '600',
  },
  resultGenre: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnSelected: {
    backgroundColor: PRIMARY + '20',
  },

  // Sections
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    color: TEXT_SEC,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Selected artist chips
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A0A2E',
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedChipText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },
  removeX: {
    color: PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },

  // Genre chips (non-interactive)
  genreChip: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  genreChipText: {
    color: TEXT_SEC,
    fontSize: 13,
  },

  // Progress
  progressText: {
    marginTop: 20,
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: 'center',
  },
  progressTextReady: {
    color: PRIMARY,
    fontWeight: '700',
  },

  // CTA
  ctaWrapper: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  ctaText: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '700',
  },
});
