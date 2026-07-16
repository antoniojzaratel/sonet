import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VictoryPie } from 'victory-native';

const Colors = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceElevated: '#242424',
  primary: '#A855F7',
  primaryDark: '#7C3AED',
  secondary: '#84CC16',
  accent: '#F43F5E',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',
  border: '#2A2A2A',
  amber: '#F59E0B',
};

const GENRE_DATA = [
  { x: 'Corridos', y: 38, color: '#A855F7' },
  { x: 'Rock esp.', y: 25, color: '#F43F5E' },
  { x: 'Indie', y: 19, color: '#84CC16' },
  { x: 'Otros', y: 18, color: '#666666' },
];

const TOP_ARTISTS = [
  { rank: '01', name: 'Peso Pluma', initials: 'PP', color: '#A855F7', change: '↑ subió 2 lugares' },
  { rank: '02', name: 'Carin León', initials: 'CL', color: '#F43F5E', change: '→ se mantiene' },
  { rank: '03', name: 'Zoé', initials: 'Z', color: '#84CC16', change: '↑ nuevo en tu top 3' },
];

export default function ProfileScreen() {
  const [humourSeed, setHumourSeed] = useState(0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.headerLogo}>Sonet</Text>
          <Text style={styles.headerMeta}>JUNIO 2026  /  compartir</Text>
        </View>

        {/* User card */}
        <View style={styles.card}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>AV</Text>
          </View>
          <Text style={styles.userName}>Andrea Villarreal</Text>
          <Text style={styles.userHandle}>@andie_mty · Monterrey</Text>
          <Text style={styles.userStats}>128 siguiendo  ·  96 seguidores  ·  14 eventos</Text>
        </View>

        {/* Genre distribution card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tu distribución de géneros</Text>
          <View style={styles.genreRow}>
            <VictoryPie
              data={GENRE_DATA}
              colorScale={GENRE_DATA.map((d) => d.color)}
              innerRadius={45}
              width={140}
              height={140}
              padding={0}
              labels={() => ''}
            />
            <View style={styles.legendCol}>
              {GENRE_DATA.map((item) => (
                <View key={item.x} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.y}% {item.x}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Top artists card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top artistas del mes</Text>
          {TOP_ARTISTS.map((artist) => (
            <View key={artist.rank} style={styles.artistRow}>
              <Text style={styles.artistRank}>{artist.rank}</Text>
              <View style={[styles.artistAvatar, { backgroundColor: artist.color }]}>
                <Text style={styles.artistInitials}>{artist.initials}</Text>
              </View>
              <Text style={styles.artistName}>{artist.name}</Text>
              <View style={styles.changeBadge}>
                <Text style={styles.changeBadgeText}>{artist.change}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* AI humor reading card */}
        <View style={styles.aiCard}>
          <Text style={styles.cardTitle}>Tu sentido del humor 🤖</Text>
          <Text style={styles.aiLabel}>Humor norteño-existencial</Text>
          <Text style={styles.aiBody}>
            Te ríes con memes de corridos a mediodía y lloras con Zoé a las 2 am. Tu chiste favorito es negar que existe tu playlist "para llorar"... que tiene 84 canciones.
          </Text>
          <View style={styles.aiButtons}>
            <TouchableOpacity style={styles.aiButtonOutlined}>
              <Text style={styles.aiButtonOutlinedText}>Compartir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.aiButtonFilled} onPress={() => setHumourSeed((s) => s + 1)}>
              <Text style={styles.aiButtonFilledText}>Otra lectura</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.aiFootnote}>Generado por IA · se renueva cada mes</Text>
        </View>

        {/* Premium card */}
        <View style={styles.premiumCard}>
          <Text style={styles.premiumTitle}>✦ Sonet Premium</Text>
          <Text style={styles.premiumDesc}>
            Accede a estadísticas avanzadas, modo sin publicidad y descuentos exclusivos en conciertos.
          </Text>
          <View style={styles.premiumRow}>
            <Text style={styles.premiumPrice}>$99 MXN / mes</Text>
            <TouchableOpacity style={styles.premiumButton}>
              <Text style={styles.premiumButtonText}>Probar 7 días</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy section */}
        <View style={styles.privacySection}>
          <TouchableOpacity style={styles.privacyRow}>
            <Ionicons name="musical-note-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.privacyText}>Perfil musical visible: solo amigos</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.privacyRow}>
            <Ionicons name="notifications-outline" size={18} color={Colors.textSecondary} />
            <Text style={[styles.privacyText, { color: Colors.textSecondary, flex: 1 }]} numberOfLines={1}>
              Feed: Mariana va a Zoé · Diego sigue a Caifanes
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLogo: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  headerMeta: {
    fontSize: 11,
    color: Colors.amber,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  /* Cards */
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },

  /* User card */
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  userStats: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  /* Genre distribution */
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  legendCol: {
    flex: 1,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  /* Top artists */
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  artistRank: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    width: 24,
  },
  artistAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInitials: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  artistName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  changeBadge: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  changeBadgeText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  /* AI card */
  aiCard: {
    backgroundColor: '#1A0A2E',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  aiLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  aiBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  aiButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  aiButtonOutlined: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 99,
    paddingVertical: 10,
    alignItems: 'center',
  },
  aiButtonOutlinedText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  aiButtonFilled: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 99,
    paddingVertical: 10,
    alignItems: 'center',
  },
  aiButtonFilledText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  aiFootnote: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  /* Premium card */
  premiumCard: {
    backgroundColor: '#1C1200',
    borderWidth: 1,
    borderColor: Colors.amber,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  premiumTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.amber,
    marginBottom: 8,
  },
  premiumDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 14,
    lineHeight: 19,
  },
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  premiumButton: {
    backgroundColor: Colors.primary,
    borderRadius: 99,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  premiumButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  /* Privacy section */
  privacySection: {
    marginHorizontal: 16,
    gap: 8,
    marginBottom: 4,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
});
