import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSpotifyAuth } from '@/lib/spotify';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/colors';

const GENRES = [
  'Rock', 'Pop', 'Hip-Hop', 'Reggaeton', 'Electronic', 'Jazz',
  'Metal', 'R&B', 'Latin', 'Indie', 'Classical', 'Cumbia',
  'Trap', 'Banda', 'Salsa', 'K-Pop', 'Folk', 'Punk',
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [connectingSpotify, setConnectingSpotify] = useState(false);
  const { setSpotifyToken } = useAuthStore();
  const { promptAsync } = useSpotifyAuth();

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre].slice(0, 5),
    );
  };

  const handleSpotifyConnect = async () => {
    setConnectingSpotify(true);
    try {
      const result = await promptAsync();
      if (result?.type === 'success') {
        Alert.alert('¡Conectado!', 'Tu Spotify está vinculado a Sonet');
        setStep(1);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo conectar con Spotify');
    }
    setConnectingSpotify(false);
  };

  const handleFinish = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('users')
        .update({ onboarding_complete: true })
        .eq('id', user.id);
    }
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A0A2E', '#0D0D0D']} style={StyleSheet.absoluteFill} />

      {step === 0 && (
        <View style={styles.step}>
          <Text style={styles.emoji}>🎵</Text>
          <Text style={styles.title}>Conecta tu música</Text>
          <Text style={styles.subtitle}>
            Vincula Spotify para construir tu identidad musical automáticamente
          </Text>

          <TouchableOpacity
            style={styles.spotifyButton}
            onPress={handleSpotifyConnect}
            disabled={connectingSpotify}
            activeOpacity={0.8}
          >
            {connectingSpotify ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="musical-notes" size={24} color="#fff" />
                <Text style={styles.spotifyButtonText}>Conectar Spotify</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setStep(1)} style={styles.skipButton}>
            <Text style={styles.skipText}>Saltar por ahora</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 1 && (
        <View style={styles.step}>
          <Text style={styles.emoji}>🎸</Text>
          <Text style={styles.title}>¿Qué géneros te mueven?</Text>
          <Text style={styles.subtitle}>Elige hasta 5 para personalizar tu feed</Text>

          <ScrollView contentContainerStyle={styles.genreGrid} showsVerticalScrollIndicator={false}>
            {GENRES.map((genre) => {
              const selected = selectedGenres.includes(genre);
              return (
                <TouchableOpacity
                  key={genre}
                  style={[styles.genreChip, selected && styles.genreChipSelected]}
                  onPress={() => toggleGenre(genre)}
                  activeOpacity={0.7}
                >
                  {selected && <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={StyleSheet.absoluteFill} borderRadius={Radius.full} />}
                  <Text style={[styles.genreText, selected && styles.genreTextSelected]}>
                    {genre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity activeOpacity={0.8} onPress={handleFinish}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.continueButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.continueText}>Empezar a explorar 🚀</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  step: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
  },
  emoji: { fontSize: 64, marginBottom: Spacing.lg },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },

  spotifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.spotify,
    borderRadius: Radius.md,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xxl,
  },
  spotifyButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  skipButton: { marginTop: Spacing.lg },
  skipText: { color: Colors.textMuted, fontSize: 14 },

  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    width: '100%',
  },
  genreChip: {
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  genreChipSelected: { borderColor: Colors.primary },
  genreText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  genreTextSelected: { color: Colors.text },

  continueButton: {
    borderRadius: Radius.md,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xxl,
    marginTop: Spacing.xl,
  },
  continueText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
