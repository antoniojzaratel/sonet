import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { isDemoAccount } from '@/lib/demoContent';

const C = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  primary: '#A855F7',
  primaryDark: '#7C3AED',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  border: '#2A2A2A',
  spotify: '#1DB954',
  spotifyDark: '#158a3e',
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { signInWithGoogle, signInWithApple, loginAsDemo } = useAuthStore();

  const handleLogin = async () => {
    // demo@demo.com / demo123 loads a fully populated local demo account —
    // works regardless of whether Supabase is configured, since it never
    // touches the network at all.
    if (isDemoAccount(email, password)) {
      loginAsDemo();
      router.replace('/(tabs)');
      return;
    }
    if (isDemoMode) {
      router.replace('/(tabs)');
      return;
    }
    if (!email || !password) {
      Alert.alert('Error', 'Ingresa tu correo y contraseña');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Error', error.message);
    setLoading(false);
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    if (isDemoMode) {
      router.replace('/(tabs)');
      return;
    }
    setOauthLoading(provider);
    const { error } = await (provider === 'google' ? signInWithGoogle() : signInWithApple());
    if (error) Alert.alert('Error', error);
    setOauthLoading(null);
  };

  const handleSpotifyLogin = () => {
    if (isDemoMode) {
      router.replace('/(tabs)');
      return;
    }
    Alert.alert(
      'Conecta Spotify',
      'Primero crea tu cuenta (correo, Google o Apple) — luego conecta Spotify desde tu perfil para calificar con datos reales.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Crear cuenta', onPress: () => router.push('/(auth)/register') },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={styles.wordmark}>Sonet</Text>
          <Text style={styles.tagline}>La red social de la música.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color={C.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor={C.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Correo electrónico"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={C.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={C.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              accessibilityLabel="Contraseña"
              textContentType="password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={C.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Entrar"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.7}
            style={styles.registerRow}
            accessibilityRole="link"
            accessibilityLabel="Crear cuenta"
          >
            <Text style={styles.registerText}>
              No tienes cuenta?{' '}
              <Text style={styles.registerLink}>Crear cuenta</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider + social providers */}
        <View style={styles.dividerSection}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>o continua con</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => handleOAuthLogin('google')}
            disabled={oauthLoading !== null}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Continuar con Google"
            accessibilityState={{ disabled: oauthLoading !== null, busy: oauthLoading === 'google' }}
          >
            {oauthLoading === 'google' ? (
              <ActivityIndicator color={C.text} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={C.text} />
                <Text style={styles.googleButtonText}>Continuar con Google</Text>
              </>
            )}
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={() => handleOAuthLogin('apple')}
              disabled={oauthLoading !== null}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Continuar con Apple"
              accessibilityState={{ disabled: oauthLoading !== null, busy: oauthLoading === 'apple' }}
            >
              {oauthLoading === 'apple' ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={22} color="#000" />
                  <Text style={styles.appleButtonText}>Continuar con Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.spotifyButton}
            onPress={handleSpotifyLogin}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Continuar con Spotify"
          >
            <Ionicons name="musical-notes-outline" size={20} color="#fff" />
            <Text style={styles.spotifyButtonText}>Continuar con Spotify</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 48,
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: 56,
  },
  wordmark: {
    fontSize: 56,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: -2,
  },
  tagline: {
    fontSize: 16,
    color: C.text,
    textAlign: 'center',
    marginTop: 10,
  },

  // Form
  form: {
    gap: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 15,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  registerRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  registerText: {
    color: C.textSecondary,
    fontSize: 14,
  },
  registerLink: {
    color: C.primary,
    fontWeight: '700',
  },

  // Divider + Spotify
  dividerSection: {
    marginTop: 40,
    gap: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerLabel: {
    color: C.textSecondary,
    fontSize: 13,
  },
  googleButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleButtonText: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
  },
  appleButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appleButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  spotifyButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: C.spotify,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  spotifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
