import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

function Ring({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * (score / 100);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#2A2A2A" strokeWidth={6} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#A855F7"
          strokeWidth={6}
          fill="none"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ color: '#fff', fontSize: size * 0.28, fontWeight: '800' }}>{score}</Text>
    </View>
  );
}

const FRIENDS: { score: number; name: string; subtitle: string }[] = [
  { score: 91, name: 'Mariana G.', subtitle: '7 artistas en común · ya se siguen' },
];

const NEW_PEOPLE: { score: number; name: string; tags: string }[] = [
  { score: 84, name: 'Diego R.', tags: 'Zoé · Caifanes · indie rock' },
  { score: 72, name: 'Sofía T.', tags: 'Rock en español · 4 artistas' },
];

export default function DiscoverScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>Matches</Text>

        {/* Amigos que van */}
        <Text style={styles.sectionTitle}>AMIGOS QUE VAN</Text>
        {FRIENDS.map((f) => (
          <View key={f.name} style={styles.card}>
            <Ring score={f.score} size={72} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{f.name}</Text>
              <Text style={styles.cardSub}>{f.subtitle}</Text>
            </View>
            <TouchableOpacity style={styles.btnOutlined} activeOpacity={0.7}>
              <Text style={styles.btnOutlinedText}>Ir juntos</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Gente nueva compatible */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>GENTE NUEVA COMPATIBLE</Text>
        </View>
        {NEW_PEOPLE.map((p) => (
          <View key={p.name} style={styles.card}>
            <Ring score={p.score} size={72} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{p.name}</Text>
              <Text style={styles.cardSub}>{p.tags}</Text>
            </View>
            <TouchableOpacity style={styles.btnFilled} activeOpacity={0.7}>
              <Text style={styles.btnFilledText}>Conectar</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Safety note */}
        <View style={styles.safetyBox}>
          <Text style={styles.safetyText}>
            🔒 Sonet cuida tus encuentros: perfiles verificados por teléfono, bloqueo y reporte a un
            toque, y las direcciones privadas solo se muestran a asistentes aprobados.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },

  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 24,
  },

  sectionTitle: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionRow: { marginTop: 8 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardInfo: { flex: 1, marginLeft: 16 },
  cardName: { color: '#FFFFFF', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  cardSub: { color: '#A0A0A0', fontSize: 13 },

  btnOutlined: {
    borderWidth: 1,
    borderColor: '#A855F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnOutlinedText: { color: '#A855F7', fontWeight: '600', fontSize: 14 },

  btnFilled: {
    backgroundColor: '#A855F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnFilledText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  safetyBox: {
    backgroundColor: '#0D0A1A',
    borderWidth: 1,
    borderColor: '#A855F7',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  safetyText: { color: '#A0A0A0', fontSize: 13, lineHeight: 20 },
});
