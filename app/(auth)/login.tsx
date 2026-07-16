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
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

const C = {
  primary: '#A855F7',
  primaryDark: '#7C3AED',
  background: '#0D0D0D',
  surface: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  border: '#2A2A2A',
  borderLight: '#333333',
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Ingresa tu email y contraseña');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Error', error.message);
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) Alert.alert('Error', error.message);
  };

  const handleAppleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple' });
    if (error) Alert.alert('Error', error.message);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0D0B1E', '#0D0D0D']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo section */}
        <View style={styles.logoSection}>
          <Text style={styles.logo}>Sonet</Text>
          <Text style={styles.tagline}>
            {'La música que escuchas,\nen vivo y acompañado.'}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          {/* Google */}
          <TouchableOpacity onPress={handleGoogleLogin} activeOpacity={0.85}>
            <LinearGradient
              colors={[C.primary, C.primaryDark]}
              style={styles.googleButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="logo-google" size={20} color="#fff" />
              <Text style={styles.googleButtonText}>Continuar con Google</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Apple */}
          <TouchableOpacity
            style={styles.appleButton}
            onPress={handleAppleLogin}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-apple" size={20} color={C.text} />
            <Text style={styles.appleButtonText}>Continuar con Apple</Text>
          </TouchableOpacity>

          {/* Email toggle */}
          <TouchableOpacity
            onPress={() => setShowEmailForm((v) => !v)}
            activeOpacity={0.7}
            style={styles.emailToggle}
          >
            <Text style={styles.emailToggleText}>Usar mi correo</Text>
          </TouchableOpacity>

          {/* Email form */}
          {showEmailForm && (
            <View style={styles.emailForm}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color="#555" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Correo electrónico"
                  placeholderTextColor="#555"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color="#555" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Contraseña"
                  placeholderTextColor="#555"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity onPress={handleEmailLogin} disabled={loading} activeOpacity={0.85}>
                <LinearGradient
                  colors={[C.primary, C.primaryDark]}
                  style={styles.enterButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.enterButtonText}>Entrar</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <View style={styles.ageRow}>
            <Ionicons name="calendar-outline" size={13} color="#666" />
            <Text style={styles.ageText}>Fecha de nacimiento – solo mayores de 18</Text>
          </View>

          <Text style={styles.legalText}>
            Al continuar aceptas los Términos y el Aviso de Privacidad (LFPDPPP). Tus gustos
            musicales solo se comparten si tú lo activas.
          </Text>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={styles.registerRow} activeOpacity={0.7}>
              <Text style={styles.registerText}>
                ¿No tienes cuenta?{' '}
                <Text style={styles.registerLink}>Crear cuenta</Text>
              </Text>
            </TouchableOpacity>
          </Link>
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
    paddingBottom: 40,
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: 52,
  },
  logo: {
    fontSize: 52,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -2,
  },
  tagline: {
    fontSize: 16,
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },

  // Buttons
  buttons: {
    gap: 12,
  },
  googleButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  appleButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  appleButtonText: {
    color: C.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emailToggle: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  emailToggleText: {
    color: C.textSecondary,
    fontSize: 15,
  },

  // Email form
  emailForm: {
    gap: 12,
    marginTop: 4,
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
  enterButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Footer
  footer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 12,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ageText: {
    color: '#666',
    fontSize: 12,
  },
  legalText: {
    color: '#444',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  registerRow: {
    marginTop: 4,
  },
  registerText: {
    color: C.textSecondary,
    fontSize: 14,
  },
  registerLink: {
    color: C.primary,
    fontWeight: '700',
  },
});
