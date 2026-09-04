import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useHitsterStore } from '@/stores/hitsterStore';

export default function HitsterLobbyScreen() {
  const router = useRouter();
  const { user, spotifyToken, isRichDemo } = useAuthStore();
  const { createRoom, joinRoomByCode, loading } = useHitsterStore();
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join'>('menu');

  const handleCreate = async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas una cuenta para crear una sala.');
      return;
    }
    // No real multiplayer to demo solo — drop straight into a one-round
    // local version instead of creating a Supabase-backed room.
    if (isRichDemo) {
      router.replace('/hitster/demo');
      return;
    }
    const roomId = await createRoom(user.id, spotifyToken);
    if (roomId) router.replace(`/hitster/${roomId}`);
    else Alert.alert('Error', 'No se pudo crear la sala, intenta de nuevo.');
  };

  const handleJoin = async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas una cuenta para unirte a una sala.');
      return;
    }
    if (code.trim().length < 4) return;
    const roomId = await joinRoomByCode(code, user.id);
    if (roomId) router.replace(`/hitster/${roomId}`);
    else Alert.alert('Código inválido', 'Revisa el código con quien te invitó.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#2D0A5C', Colors.background]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hitster</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.subtitle}>
          Adivina en qué año salió cada canción y arma tu línea de tiempo antes que tus amigos.
        </Text>

        {mode === 'menu' ? (
          <View style={styles.menu}>
            <TouchableOpacity onPress={handleCreate} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.primaryBtn}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{isRichDemo ? 'Jugar' : 'Crear sala'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {!isRichDemo && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMode('join')} activeOpacity={0.8}>
                <Text style={styles.secondaryBtnText}>Unirme con un código</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.menu}>
            <TextInput
              style={styles.codeInput}
              placeholder="CÓDIGO"
              placeholderTextColor={Colors.textMuted}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              autoFocus
            />
            <TouchableOpacity onPress={handleJoin} disabled={loading || code.trim().length < 4} activeOpacity={0.85}>
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.primaryBtn}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Unirme</Text>}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMode('menu')} activeOpacity={0.8}>
              <Text style={styles.secondaryBtnText}>Volver</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
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
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },

  body: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, gap: Spacing.xl },
  subtitle: { color: Colors.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },

  menu: { gap: Spacing.md },
  primaryBtn: { borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },

  codeInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 16,
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 6,
  },
});
