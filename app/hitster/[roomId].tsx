import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useHitsterStore, type TimelineCard } from '@/stores/hitsterStore';

function TimelineRow({
  timeline,
  onSelect,
  disabled,
}: {
  timeline: TimelineCard[];
  onSelect?: (position: number) => void;
  disabled?: boolean;
}) {
  const slots = timeline.length + 1;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timelineRow}>
      {Array.from({ length: slots }).map((_, i) => (
        <View key={i} style={styles.timelineSlot}>
          <TouchableOpacity
            disabled={disabled || !onSelect}
            onPress={() => onSelect?.(i)}
            style={[styles.gapBtn, (disabled || !onSelect) && styles.gapBtnDisabled]}
          >
            <Ionicons name="add" size={16} color={disabled || !onSelect ? Colors.textMuted : Colors.primary} />
          </TouchableOpacity>
          {i < timeline.length && (
            <View style={styles.timelineCard}>
              <Text style={styles.timelineYear}>{timeline[i].year}</Text>
              <Text numberOfLines={2} style={styles.timelineName}>{timeline[i].name}</Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

export default function HitsterRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { room, players, round, subscribe, unsubscribe, startGame, submitPlacement, submitSteal, resolveRound } =
    useHitsterStore();
  const [countdown, setCountdown] = useState(15);

  const player = useAudioPlayer(round?.preview_url ?? null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (roomId) subscribe(roomId);
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (round?.status !== 'stealing' || !round.id) return;
    setCountdown(15);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          resolveRound(round.id);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [round?.id, round?.status]);

  if (!room) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top']}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const me = players.find((p) => p.user_id === user?.id);
  const isHost = room.host_id === user?.id;

  const Header = ({ title }: { title: string }) => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.replace('/(tabs)/games')} style={styles.backButton} hitSlop={12}>
        <Ionicons name="close" size={24} color={Colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  // ── Lobby ────────────────────────────────────────────────────────────────
  if (room.status === 'lobby') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient colors={['#2D0A5C', Colors.background]} style={StyleSheet.absoluteFill} />
        <Header title="Sala de espera" />

        <View style={styles.body}>
          <Text style={styles.codeLabel}>Código de la sala</Text>
          <Text style={styles.codeValue}>{room.code}</Text>

          <Text style={styles.sectionLabel}>Jugadores ({players.length})</Text>
          <View style={styles.playerList}>
            {players.map((p) => (
              <View key={p.user_id} style={styles.playerRow}>
                <View style={styles.playerAvatar}>
                  <Text style={styles.playerAvatarText}>{p.display_name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.playerName}>{p.display_name}</Text>
                {p.user_id === room.host_id && <Text style={styles.hostBadge}>Host</Text>}
              </View>
            ))}
          </View>

          {isHost ? (
            <TouchableOpacity onPress={() => startGame(room.id)} disabled={players.length < 2} activeOpacity={0.85}>
              <LinearGradient
                colors={players.length < 2 ? [Colors.border, Colors.border] : [Colors.primary, Colors.primaryDark]}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>
                  {players.length < 2 ? 'Esperando más jugadores...' : 'Iniciar juego'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <Text style={styles.waitingText}>Esperando a que el host inicie la partida...</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Finished ─────────────────────────────────────────────────────────────
  if (room.status === 'finished') {
    const winner = players.find((p) => p.timeline.length >= room.win_target) ?? players[0];
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient colors={['#2D0A5C', Colors.background]} style={StyleSheet.absoluteFill} />
        <Header title="Fin del juego" />
        <View style={[styles.body, styles.centered]}>
          <Ionicons name="trophy" size={48} color={Colors.warning} style={{ marginBottom: Spacing.sm }} />
          <Text style={styles.finishedTitle}>{winner?.display_name ?? 'Alguien'} ganó</Text>
          <Text style={styles.finishedSubtitle}>{winner?.timeline.length ?? 0} canciones en su línea de tiempo</Text>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/games')} activeOpacity={0.85}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Volver a juegos</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Playing ──────────────────────────────────────────────────────────────
  if (!me || !round) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top']}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.waitingText}>Preparando la siguiente ronda...</Text>
      </SafeAreaView>
    );
  }

  const isActivePlayer = round.active_player_id === user?.id;
  const hasStolen = round.steals.some((s) => s.user_id === user?.id);
  const activePlayerName = players.find((p) => p.user_id === round.active_player_id)?.display_name ?? '...';

  const canPlace = round.status === 'placing' && isActivePlayer && round.active_placement === null;
  const canSteal = round.status === 'stealing' && !isActivePlayer && !hasStolen && me.tokens > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#2D0A5C', Colors.background]} style={StyleSheet.absoluteFill} />
      <Header title={`Ronda ${round.round_number}`} />

      <ScrollView style={styles.body} contentContainerStyle={{ gap: Spacing.lg, paddingBottom: Spacing.xxl }}>
        <View style={styles.songCard}>
          <Text style={styles.songTitle} numberOfLines={1}>{round.track_name}</Text>
          <Text style={styles.songArtist} numberOfLines={1}>{round.artist_name}</Text>
          <Text style={styles.songYear}>
            {round.status === 'resolved' ? round.year : '19??'}
          </Text>

          {round.preview_url ? (
            <TouchableOpacity
              style={styles.playBtn}
              onPress={() => (status.playing ? player.pause() : player.play())}
              activeOpacity={0.8}
            >
              <Ionicons name={status.playing ? 'pause' : 'play'} size={22} color="#fff" />
            </TouchableOpacity>
          ) : (
            <Text style={styles.noPreview}>Sin preview disponible — adivina a ciegas</Text>
          )}
        </View>

        {round.status === 'resolved' ? (
          <View style={styles.resolvedBanner}>
            <Text style={styles.resolvedText}>
              {round.resolved_winner_id
                ? `${players.find((p) => p.user_id === round.resolved_winner_id)?.display_name ?? '...'} se quedó con la carta`
                : 'Nadie acertó — la carta se descarta'}
            </Text>
          </View>
        ) : round.status === 'stealing' ? (
          <Text style={styles.statusText}>
            {isActivePlayer
              ? 'Los demás pueden robar tu carta...'
              : canSteal
              ? `¿Robar? Tienes ${me.tokens} ficha(s) — ${countdown}s`
              : hasStolen
              ? 'Ya usaste tu intento este turno'
              : `Esperando resolución — ${countdown}s`}
          </Text>
        ) : (
          <Text style={styles.statusText}>
            {isActivePlayer ? 'Elige dónde va en tu línea de tiempo' : `${activePlayerName} está colocando su carta...`}
          </Text>
        )}

        <Text style={styles.sectionLabel}>Tu línea de tiempo · {me.tokens} ficha(s)</Text>
        <TimelineRow
          timeline={me.timeline}
          disabled={!canPlace && !canSteal}
          onSelect={
            canPlace
              ? (pos) => submitPlacement(round.id, pos)
              : canSteal
              ? (pos) => submitSteal(round.id, pos)
              : undefined
          }
        />

        <Text style={styles.sectionLabel}>Jugadores</Text>
        {players.map((p) => (
          <View key={p.user_id} style={styles.playerRow}>
            <View style={styles.playerAvatar}>
              <Text style={styles.playerAvatarText}>{p.display_name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.playerName}>{p.display_name}</Text>
            <Text style={styles.playerCount}>{p.timeline.length}/{room.win_target}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },

  body: { flex: 1, paddingHorizontal: Spacing.lg },

  codeLabel: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: Spacing.lg },
  codeValue: { color: Colors.primary, fontSize: 40, fontWeight: '900', textAlign: 'center', letterSpacing: 6, marginBottom: Spacing.xl },

  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  playerList: { gap: Spacing.sm, marginBottom: Spacing.xl },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6 },
  playerAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryDark,
    alignItems: 'center', justifyContent: 'center',
  },
  playerAvatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  playerName: { color: Colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  playerCount: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700' },
  hostBadge: {
    color: Colors.primaryLight, fontSize: 11, fontWeight: '700',
    borderWidth: 1, borderColor: Colors.primaryLight, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },

  primaryBtn: { borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  waitingText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: Spacing.md },

  finishedEmoji: { fontSize: 72 },
  finishedTitle: { fontSize: 26, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  finishedSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.lg },

  songCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  songTitle: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  songArtist: { color: Colors.textSecondary, fontSize: 14 },
  songYear: { color: Colors.primaryLight, fontSize: 32, fontWeight: '900', marginVertical: 8, letterSpacing: 2 },
  playBtn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  noPreview: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4 },

  statusText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', fontWeight: '600' },
  resolvedBanner: {
    backgroundColor: `${Colors.secondary}22`, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.secondary,
  },
  resolvedText: { color: Colors.secondaryLight, fontSize: 14, fontWeight: '700', textAlign: 'center' },

  timelineRow: { gap: 0, paddingVertical: Spacing.sm, alignItems: 'center' },
  timelineSlot: { flexDirection: 'row', alignItems: 'center' },
  gapBtn: {
    width: 28, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed',
  },
  gapBtnDisabled: { borderColor: Colors.border },
  timelineCard: {
    width: 88, minHeight: 60, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, padding: 8, marginHorizontal: 4, alignItems: 'center', justifyContent: 'center',
  },
  timelineYear: { color: Colors.primaryLight, fontSize: 15, fontWeight: '800' },
  timelineName: { color: Colors.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 2 },
});
