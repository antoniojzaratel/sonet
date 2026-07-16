import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useAuthStore } from '@/stores/authStore';
import { fetchTopArtists, extractGenresFromArtists } from '@/lib/spotify';

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

// Demo friends with their taste profiles
const DEMO_FRIENDS = [
  {
    name: 'Mariana G.',
    score: null as number | null,
    genres: ['corrido', 'rock en español', 'indie'],
    artists: ['Zoé', 'Carin León', 'The Warning'],
    tags: 'Zoé · Carin León · indie',
    subtitle: '7 artistas en común · ya se siguen',
  },
  {
    name: 'Diego R.',
    score: null as number | null,
    genres: ['corrido', 'banda', 'norteno'],
    artists: ['Peso Pluma', 'Caifanes', 'Fuerza Regida'],
    tags: 'Peso Pluma · Caifanes · corridos',
    subtitle: null,
  },
  {
    name: 'Sofía T.',
    score: null as number | null,
    genres: ['rock en español', 'indie', 'alternative'],
    artists: ['Maná', 'Arctic Monkeys', 'Radiohead'],
    tags: 'Rock en español · 4 artistas',
    subtitle: null,
  },
];

const FALLBACK_SCORES: Record<string, number> = {
  'Mariana G.': 91,
  'Diego R.': 84,
  'Sofía T.': 72,
};

export default function DiscoverScreen() {
  const { spotifyToken } = useAuthStore();
  const [friends, setFriends] = useState(DEMO_FRIENDS);

  useEffect(() => {
    if (!spotifyToken) return;
    fetchTopArtists(spotifyToken, 'medium_term', 20).then((data) => {
      if (!data?.items) return;
      const userGenres = Object.keys(extractGenresFromArtists(data.items)).slice(0, 10);
      const updated = DEMO_FRIENDS.map((friend) => {
        const overlap = friend.genres.filter((g) =>
          userGenres.some((ug) => ug.includes(g) || g.includes(ug)),
        ).length;
        const score = Math.min(98, 55 + overlap * 15 + Math.floor(Math.random() * 10));
        return { ...friend, score };
      });
      setFriends(updated);
    });
  }, [spotifyToken]);

  const mariana = friends[0];
  const newPeople = friends.slice(1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>Matches</Text>

        {/* Amigos que van */}
        <Text style={styles.sectionTitle}>AMIGOS QUE VAN</Text>
        <View style={styles.card}>
          <Ring score={mariana.score ?? FALLBACK_SCORES[mariana.name]} size={72} />
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{mariana.name}</Text>
            <Text style={styles.cardSub}>{mariana.subtitle ?? mariana.tags}</Text>
          </View>
          <TouchableOpacity
            style={styles.btnOutlined}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                '¡Genial!',
                'Le avisaremos a Mariana que quieres ir juntos al evento',
              )
            }
          >
            <Text style={styles.btnOutlinedText}>Ir juntos</Text>
          </TouchableOpacity>
        </View>

        {/* Gente nueva compatible */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>GENTE NUEVA COMPATIBLE</Text>
        </View>
        {newPeople.map((p) => (
          <View key={p.name} style={styles.card}>
            <Ring score={p.score ?? FALLBACK_SCORES[p.name]} size={72} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{p.name}</Text>
              <Text style={styles.cardSub}>{p.tags}</Text>
            </View>
            <TouchableOpacity
              style={styles.btnFilled}
              activeOpacity={0.7}
              onPress={() =>
                Alert.alert(
                  '¡Solicitud enviada!',
                  `${p.name.split(' ')[0]} recibirá tu solicitud de conexión`,
                )
              }
            >
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
