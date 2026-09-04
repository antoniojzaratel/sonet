import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { DEMO_USER_ID } from '@/lib/demoContent';

export type LookingFor = 'dating' | 'friendship' | 'music_buddy' | 'concert_buddy';
type GenderPref = 'men' | 'women' | 'both';

export const LOOKING_FOR_OPTIONS: { value: LookingFor; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'friendship', label: 'Amigos', icon: 'people-outline' },
  { value: 'dating', label: 'Pareja', icon: 'heart-outline' },
  { value: 'music_buddy', label: 'Escuchar música', icon: 'headset-outline' },
  { value: 'concert_buddy', label: 'Ir a conciertos', icon: 'musical-notes-outline' },
];

const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'man', label: 'Hombre' },
  { value: 'woman', label: 'Mujer' },
  { value: 'other', label: 'Otro' },
];

const GENDER_PREF_OPTIONS: { value: GenderPref; label: string }[] = [
  { value: 'men', label: 'Hombres' },
  { value: 'women', label: 'Mujeres' },
  { value: 'both', label: 'Ambos' },
];

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

interface SoundmatchSettings {
  active: boolean;
  age: number | null;
  age_min: number;
  age_max: number;
  location_radius_km: number;
  looking_for: LookingFor[];
  gender: string | null;
  gender_preference: GenderPref[];
  show_distance: boolean;
  show_age: boolean;
}

const DEFAULTS: SoundmatchSettings = {
  active: false,
  age: null,
  age_min: 18,
  age_max: 45,
  location_radius_km: 50,
  looking_for: ['concert_buddy'],
  gender: null,
  gender_preference: ['both'],
  show_distance: true,
  show_age: true,
};

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SoundMatchSettingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<SoundmatchSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    // Demo account: no backend to read from — start from an already-active
    // profile with a sensible default intent, so the flow never stalls on
    // an empty picker mid-demo.
    if (user.id === DEMO_USER_ID) {
      setSettings((s) => ({ ...s, active: true, age: 27, looking_for: s.looking_for.length ? s.looking_for : ['music_buddy', 'concert_buddy'] }));
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from('soundmatch_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (data) {
      setSettings({
        active: data.active,
        age: data.age,
        age_min: data.age_min,
        age_max: data.age_max,
        location_radius_km: data.location_radius_km,
        looking_for: (data.looking_for ?? []) as LookingFor[],
        gender: data.gender,
        gender_preference: (data.gender_preference ?? ['both']) as GenderPref[],
        show_distance: data.show_distance,
        show_age: data.show_age,
      });
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleLookingFor = (value: LookingFor) => {
    setSettings((s) => ({
      ...s,
      looking_for: s.looking_for.includes(value) ? s.looking_for.filter((v) => v !== value) : [...s.looking_for, value],
    }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (user.id === DEMO_USER_ID) {
      router.back();
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('soundmatch_profiles').upsert({
      user_id: user.id,
      active: settings.active,
      age: settings.age,
      age_min: settings.age_min,
      age_max: settings.age_max,
      location_radius_km: settings.location_radius_km,
      looking_for: settings.active ? settings.looking_for : [],
      gender: settings.gender,
      gender_preference: settings.gender_preference,
      show_distance: settings.show_distance,
      show_age: settings.show_age,
      last_active: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', 'No se pudo guardar tu configuración de SoundMatch');
      return;
    }
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1A0A3E', Colors.background]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>SoundMatch</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Master toggle */}
        <View style={styles.masterRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.masterTitle}>{settings.active ? 'SoundMatch activo' : 'SoundMatch apagado'}</Text>
            <Text style={styles.masterSubtitle}>
              {settings.active
                ? 'Otros usuarios activos pueden verte y hacer match contigo'
                : 'Apagado — solo recomendaciones, ni siquiera amigos'}
            </Text>
          </View>
          <Switch
            value={settings.active}
            onValueChange={(v) => setSettings((s) => ({ ...s, active: v }))}
            trackColor={{ false: Colors.surfaceElevated, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {settings.active && (
          <>
            <Text style={styles.sectionLabel}>Busco</Text>
            <View style={styles.chipsRow}>
              {LOOKING_FOR_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, settings.looking_for.includes(opt.value) && styles.chipActive]}
                  onPress={() => toggleLookingFor(opt.value)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={opt.icon}
                    size={14}
                    color={settings.looking_for.includes(opt.value) ? Colors.primaryLight : Colors.textSecondary}
                  />
                  <Text style={[styles.chipText, settings.looking_for.includes(opt.value) && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Mi género</Text>
            <View style={styles.chipsRow}>
              {GENDER_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  active={settings.gender === opt.value}
                  onPress={() => setSettings((s) => ({ ...s, gender: opt.value }))}
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Busco conocer a</Text>
            <View style={styles.chipsRow}>
              {GENDER_PREF_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  active={settings.gender_preference.includes(opt.value)}
                  onPress={() => setSettings((s) => ({ ...s, gender_preference: [opt.value] }))}
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Rango de edad: {settings.age_min}–{settings.age_max}</Text>
            <View style={styles.stepperRow}>
              <Stepper
                value={settings.age_min}
                onChange={(v) => setSettings((s) => ({ ...s, age_min: Math.min(v, s.age_max) }))}
                min={18}
                max={99}
              />
              <Text style={styles.stepperDash}>—</Text>
              <Stepper
                value={settings.age_max}
                onChange={(v) => setSettings((s) => ({ ...s, age_max: Math.max(v, s.age_min) }))}
                min={18}
                max={99}
              />
            </View>

            <Text style={styles.sectionLabel}>Radio de búsqueda</Text>
            <View style={styles.chipsRow}>
              {RADIUS_OPTIONS.map((km) => (
                <Chip
                  key={km}
                  label={`${km} km`}
                  active={settings.location_radius_km === km}
                  onPress={() => setSettings((s) => ({ ...s, location_radius_km: km }))}
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Privacidad — perfil ciego</Text>
            <Text style={styles.privacyNote}>
              Nadie ve tu foto ni tu nombre en SoundMatch. Solo se muestra lo que actives aquí, además de tu
              compatibilidad musical.
            </Text>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Mostrar mi edad</Text>
              <Switch
                value={settings.show_age}
                onValueChange={(v) => setSettings((s) => ({ ...s, show_age: v }))}
                trackColor={{ false: Colors.surfaceElevated, true: Colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Mostrar mi distancia aproximada</Text>
              <Switch
                value={settings.show_distance}
                onValueChange={(v) => setSettings((s) => ({ ...s, show_distance: v }))}
                trackColor={{ false: Colors.surfaceElevated, true: Colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </>
        )}

        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={{ marginTop: Spacing.xl }}>
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.saveButton}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Guardar</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stepper({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity onPress={() => onChange(Math.max(min, value - 1))} style={styles.stepperBtn}>
        <Ionicons name="remove" size={16} color={Colors.text} />
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{value}</Text>
      <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))} style={styles.stepperBtn}>
        <Ionicons name="add" size={16} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text },
  scroll: { flex: 1, paddingHorizontal: Spacing.lg },

  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  masterTitle: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  masterSubtitle: { color: Colors.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 16 },

  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: `${Colors.primary}25`, borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: Colors.primaryLight },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  stepperBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceElevated },
  stepperValue: { color: Colors.text, fontSize: 15, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  stepperDash: { color: Colors.textMuted },

  privacyNote: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  toggleLabel: { color: Colors.text, fontSize: 14, flex: 1, marginRight: Spacing.md },

  saveButton: { borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
