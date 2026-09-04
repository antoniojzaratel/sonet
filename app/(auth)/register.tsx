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

const C = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  primary: '#A855F7',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  border: '#2A2A2A',
};

interface FieldProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
  secureTextEntry?: boolean;
}

function Field({ icon, placeholder, value, onChangeText, keyboardType, autoCapitalize, secureTextEntry }: FieldProps) {
  return (
    <View style={styles.inputWrapper}>
      <Ionicons name={icon} size={18} color={C.textSecondary} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={C.textSecondary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [loading, setLoading] = useState(false);

  /** Returns the birthdate as an ISO date string, or null if it's not a real date. */
  const parseBirthdate = (): string | null => {
    const day = parseInt(birthDay, 10);
    const month = parseInt(birthMonth, 10);
    const year = parseInt(birthYear, 10);
    if (!day || !month || !year) return null;

    const date = new Date(Date.UTC(year, month - 1, day));
    const isRealDate =
      date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    if (!isRealDate) return null;

    return date.toISOString().slice(0, 10);
  };

  const isAtLeast18 = (isoDate: string): boolean => {
    const birth = new Date(isoDate);
    const eighteenthBirthday = new Date(Date.UTC(birth.getUTCFullYear() + 18, birth.getUTCMonth(), birth.getUTCDate()));
    return eighteenthBirthday.getTime() <= Date.now();
  };

  const handleRegister = async () => {
    if (isDemoMode) {
      router.replace('/(auth)/onboarding');
      return;
    }

    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    const birthdate = parseBirthdate();
    if (!birthdate) {
      Alert.alert('Error', 'Ingresa una fecha de nacimiento válida');
      return;
    }
    if (!isAtLeast18(birthdate)) {
      Alert.alert('Sonet es para mayores de 18', 'No podemos crear tu cuenta — tienes que ser mayor de edad para usar Sonet.');
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
      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        display_name: username,
        username: cleanUsername,
        birthdate,
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Crea tu cuenta</Text>
          <Text style={styles.subtitle}>Unete a la comunidad musical</Text>
        </View>

        <View style={styles.form}>
          <Field
            icon="person-outline"
            placeholder="Nombre de usuario"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <Field
            icon="mail-outline"
            placeholder="Correo electronico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            icon="lock-closed-outline"
            placeholder="Contrasena (min. 6 caracteres)"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            secureTextEntry
          />
          <Field
            icon="lock-closed-outline"
            placeholder="Confirmar contrasena"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
            secureTextEntry
          />

          <Text style={styles.birthdateLabel}>Fecha de nacimiento — solo mayores de 18</Text>
          <View style={styles.birthdateRow}>
            <TextInput
              style={styles.birthdateInput}
              placeholder="DD"
              placeholderTextColor={C.textSecondary}
              value={birthDay}
              onChangeText={(t) => setBirthDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="number-pad"
              maxLength={2}
              accessibilityLabel="Día de nacimiento"
            />
            <TextInput
              style={styles.birthdateInput}
              placeholder="MM"
              placeholderTextColor={C.textSecondary}
              value={birthMonth}
              onChangeText={(t) => setBirthMonth(t.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="number-pad"
              maxLength={2}
              accessibilityLabel="Mes de nacimiento"
            />
            <TextInput
              style={[styles.birthdateInput, styles.birthdateYear]}
              placeholder="AAAA"
              placeholderTextColor={C.textSecondary}
              value={birthYear}
              onChangeText={(t) => setBirthYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              accessibilityLabel="Año de nacimiento"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Crear cuenta</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.loginRow}
          >
            <Text style={styles.loginText}>
              Ya tienes cuenta?{' '}
              <Text style={styles.loginLink}>Iniciar sesion</Text>
            </Text>
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
    paddingTop: 60,
    paddingBottom: 48,
  },

  backButton: {
    marginBottom: 32,
    width: 40,
  },

  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
  },
  subtitle: {
    fontSize: 15,
    color: C.textSecondary,
    marginTop: 6,
  },

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
  birthdateLabel: {
    color: C.textSecondary,
    fontSize: 12,
    marginTop: 2,
    marginBottom: -2,
  },
  birthdateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  birthdateInput: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    color: C.text,
    fontSize: 16,
    textAlign: 'center',
  },
  birthdateYear: {
    flex: 1.4,
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
  loginRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  loginText: {
    color: C.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: C.primary,
    fontWeight: '700',
  },
});
