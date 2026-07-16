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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/colors';

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!displayName || !username || !email || !password) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        display_name: displayName,
        username: username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
        followers_count: 0,
        following_count: 0,
        ratings_count: 0,
      });

      if (profileError) {
        Alert.alert('Error', 'No se pudo crear el perfil: ' + profileError.message);
      } else {
        router.replace('/(auth)/onboarding');
      }
    }

    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#1A0A2E', '#0D0D0D']} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Crea tu cuenta</Text>
          <Text style={styles.subtitle}>Únete a la comunidad musical</Text>
        </View>

        <View style={styles.form}>
          <Field
            icon="person-outline"
            placeholder="Nombre completo"
            value={displayName}
            onChangeText={setDisplayName}
          />
          <Field
            icon="at-outline"
            placeholder="Username (ej: djanton23)"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <Field
            icon="mail-outline"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            icon="lock-closed-outline"
            placeholder="Contraseña (mín. 6 caracteres)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.primaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Crear cuenta</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ icon, ...props }: any) {
  return (
    <View style={styles.inputWrapper}>
      <Ionicons name={icon} size={20} color={Colors.textMuted} style={styles.inputIcon} />
      <TextInput style={styles.input} placeholderTextColor={Colors.textMuted} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: 40 },
  backButton: { marginBottom: Spacing.xl },
  header: { marginBottom: Spacing.xl },
  title: { fontSize: 32, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4 },

  form: { gap: Spacing.md },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, color: Colors.text, fontSize: 16 },
  primaryButton: {
    borderRadius: Radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
