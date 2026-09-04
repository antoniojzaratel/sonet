import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { searchAllConcerts } from '@/lib/concerts';
import type { ConcertResult } from '@/lib/ticketmaster';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { isPremium as checkIsPremium } from '@/lib/purchases';
import { PaywallModal } from '@/components/premium/PaywallModal';
import { DEMO_CONCERTS, DEMO_COMMUNITY_EVENTS, DEMO_CONCERT_HISTORY } from '@/lib/demoContent';
import type { Event, EventType } from '@/types';

// Fallback when GPS permission is denied/unavailable, or before it resolves.
const DEFAULT_CITY = { name: 'Monterrey', lat: 25.6866, lng: -100.3161 };

type TabType = 'todos' | 'oficiales' | 'comunidad';

interface UnifiedEvent {
  id: string;
  kind: 'oficial' | 'comunidad';
  name: string;
  venue: string;
  city?: string;
  dateLabel: string;
  latitude: number;
  longitude: number;
  cover_image?: string;
  ticket_url?: string;
  genres?: string[];
  artist_names?: string[];
  attendeesCount?: number;
  eventType?: EventType;
  raw: ConcertResult | Event;
}

function formatDateLabel(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function concertToUnified(c: ConcertResult): UnifiedEvent {
  return {
    id: c.id,
    kind: 'oficial',
    name: c.name,
    venue: c.venue,
    city: c.city,
    dateLabel: formatDateLabel(c.date),
    latitude: c.latitude,
    longitude: c.longitude,
    cover_image: c.cover_image,
    ticket_url: c.ticket_url,
    genres: c.genres,
    artist_names: c.artist_names,
    raw: c,
  };
}

function communityToUnified(e: Event): UnifiedEvent {
  return {
    id: e.id,
    kind: 'comunidad',
    name: e.title,
    venue: e.venue ?? 'Por confirmar',
    dateLabel: formatDateLabel(e.date),
    latitude: e.latitude,
    longitude: e.longitude,
    cover_image: e.cover_image,
    artist_names: e.artist_names,
    attendeesCount: e.attendees_count,
    eventType: e.event_type,
    raw: e,
  };
}

async function upsertConcertToCatalog(c: ConcertResult) {
  await supabase.from('catalog_concerts').upsert({
    id: c.id,
    name: c.name,
    artist_names: c.artist_names,
    venue_name: c.venue,
    venue_address: c.address,
    city: c.city,
    country: c.country,
    latitude: c.latitude,
    longitude: c.longitude,
    date: c.date,
    ticket_url: c.ticket_url,
    cover_image: c.cover_image,
    price_min: c.price_min,
    price_max: c.price_max,
    currency: c.currency,
    genres: c.genres,
    is_sold_out: c.is_sold_out,
    source: 'ticketmaster',
  });
}

// ─── Event card ───────────────────────────────────────────────────────────────

const LISTENING_EVENT_TYPES: EventType[] = ['listening_party', 'watch_party'];

function EventCard({
  item,
  attending,
  friendCount,
  onToggleAttend,
  onEnterParty,
}: {
  item: UnifiedEvent;
  attending: boolean;
  friendCount: number;
  onToggleAttend: (item: UnifiedEvent) => void;
  onEnterParty: (item: UnifiedEvent) => void;
}) {
  const isOficial = item.kind === 'oficial';
  const gradient: [string, string] = isOficial ? ['#A855F7', '#3B82F6'] : ['#92400E', '#78350F'];
  const isListeningEvent = !isOficial && item.eventType && LISTENING_EVENT_TYPES.includes(item.eventType);

  return (
    <LinearGradient colors={gradient} style={styles.eventCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View style={styles.eventBadge}>
        <Text style={styles.eventBadgeText}>{isOficial ? 'OFICIAL · TICKETMASTER' : 'COMUNIDAD'}</Text>
      </View>

      <Text style={styles.eventName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.eventMeta}>{item.venue}{item.city ? ` · ${item.city}` : ''}</Text>
      <Text style={styles.eventMeta}>{item.dateLabel}</Text>

      <View style={styles.eventBottom}>
        <View style={styles.attendeeRow}>
          {isOficial ? (
            <Text style={styles.extraCount}>
              {friendCount > 0 ? `${friendCount} amigo${friendCount > 1 ? 's' : ''} van` : 'Sé el primero en ir'}
            </Text>
          ) : (
            <Text style={styles.extraCount}>{item.attendeesCount ?? 0} asistentes</Text>
          )}
        </View>
        <View style={{ flex: 1 }} />
        {isListeningEvent && attending && (
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonGhost]} onPress={() => onEnterParty(item)}>
            <Text style={styles.actionButtonText}>Entrar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionButton} onPress={() => onToggleAttend(item)}>
          <Text style={styles.actionButtonText}>
            {isOficial ? (attending ? 'Asististe' : 'Ya fui') : attending ? 'Confirmado' : 'Pedir lugar →'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ─── Create-event modal ───────────────────────────────────────────────────────

// Matches the `events.event_type` CHECK constraint in schema.sql exactly.
const EVENT_TYPES: { id: EventType; label: string }[] = [
  { id: 'listening_party', label: 'Listening Party' },
  { id: 'watch_party', label: 'Watch Party' },
  { id: 'meetup', label: 'Meetup' },
  { id: 'festival', label: 'Festival' },
  { id: 'concert', label: 'Concierto' },
];

function CreateEventModal({
  visible,
  onClose,
  onCreated,
  center,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  center: { lat: number; lng: number };
}) {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [eventType, setEventType] = useState<EventType>('listening_party');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!user || !title.trim() || !venue.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('events').insert({
      creator_id: user.id,
      title: title.trim(),
      event_type: eventType,
      venue: venue.trim(),
      latitude: center.lat,
      longitude: center.lng,
      date: new Date(Date.now() + 7 * 86400000).toISOString(),
      is_official: false,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', 'No se pudo crear el evento');
      return;
    }
    setTitle('');
    setVenue('');
    onCreated();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Crear evento</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ padding: Spacing.lg }}>
          <Text style={styles.fieldLabel}>Título</Text>
          <TextInput
            style={styles.input}
            placeholder="Listening party: nuevo álbum..."
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
          <Text style={styles.fieldLabel}>Lugar</Text>
          <TextInput
            style={styles.input}
            placeholder="Barrio Antiguo, Monterrey"
            placeholderTextColor={Colors.textMuted}
            value={venue}
            onChangeText={setVenue}
          />
          <Text style={styles.fieldLabel}>Tipo</Text>
          <View style={styles.typeRow}>
            {EVENT_TYPES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeChip, eventType === t.id && styles.typeChipActive]}
                onPress={() => setEventType(t.id)}
              >
                <Text style={[styles.typeChipText, eventType === t.id && styles.typeChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={handleCreate} disabled={saving} activeOpacity={0.85}>
            <LinearGradient colors={Colors.gradientPrimary} style={styles.createButton}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonText}>Crear evento</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

// Frames every point in `points` in one region — used for the "world view"
// history map rather than a fixed huge delta, so it actually centers on
// wherever the pins are instead of an arbitrary hardcoded spot.
function regionForPoints(points: { latitude: number; longitude: number }[]) {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 20),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, 20),
  };
}

const HISTORY_REGION = regionForPoints(DEMO_CONCERT_HISTORY);
const HISTORY_UNIFIED: UnifiedEvent[] = DEMO_CONCERT_HISTORY.map(concertToUnified);

export default function MapScreen() {
  const router = useRouter();
  const { user, isRichDemo } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('todos');
  const [citySearch, setCitySearch] = useState(DEFAULT_CITY.name);
  const [center, setCenter] = useState(DEFAULT_CITY);
  // Demo-only: toggles the map between "nearby" (today's normal behavior)
  // and a zoomed-out world view of past concerts. Real accounts would need
  // this backed by a `concert_attendance` query across every attended
  // concert — out of scope for now, see the Manual doc.
  const [showHistory, setShowHistory] = useState(false);
  const [concerts, setConcerts] = useState<ConcertResult[]>([]);
  const [communityEvents, setCommunityEvents] = useState<Event[]>([]);
  const [attendance, setAttendance] = useState<Set<string>>(new Set());
  const [communityAttendance, setCommunityAttendance] = useState<Set<string>>(new Set());
  const [friendCounts, setFriendCounts] = useState<Record<string, number>>({});
  const [attendedGenres, setAttendedGenres] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const loadConcerts = useCallback(async (city: { name: string; lat: number; lng: number }) => {
    if (useAuthStore.getState().isRichDemo) {
      setConcerts(DEMO_CONCERTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    let results = await searchAllConcerts({ location: { lat: city.lat, lng: city.lng }, radiusKm: 100, size: 30 });

    if (results.length === 0) {
      // Live API unavailable (no key yet, or no results) — fall back to whatever's cached.
      const { data } = await supabase
        .from('catalog_concerts')
        .select('*')
        .order('date', { ascending: true })
        .limit(30);
      results = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        artist_names: r.artist_names ?? [],
        venue: r.venue_name ?? '',
        address: r.venue_address ?? '',
        city: r.city ?? '',
        country: r.country ?? '',
        latitude: r.latitude,
        longitude: r.longitude,
        date: r.date,
        ticket_url: r.ticket_url ?? '',
        cover_image: r.cover_image ?? '',
        price_min: r.price_min,
        price_max: r.price_max,
        currency: r.currency,
        genres: r.genres ?? [],
        is_sold_out: r.is_sold_out ?? false,
        source: 'ticketmaster' as const,
      }));
    }
    setConcerts(results);
    setLoading(false);
  }, []);

  const loadCommunityEvents = useCallback(async () => {
    if (useAuthStore.getState().isRichDemo) {
      setCommunityEvents(DEMO_COMMUNITY_EVENTS as unknown as Event[]);
      return;
    }
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('is_official', false)
      .order('date', { ascending: true })
      .limit(30);
    setCommunityEvents((data ?? []) as Event[]);
  }, []);

  const loadAttendanceContext = useCallback(async () => {
    if (!user) return;
    if (useAuthStore.getState().isRichDemo) return; // no backend to check attendance against — harmless to skip

    const { data: mine } = await supabase.from('concert_attendance').select('concert_id').eq('user_id', user.id);
    setAttendance(new Set((mine ?? []).map((r: any) => r.concert_id)));

    const { data: myEvents } = await supabase.from('event_attendees').select('event_id').eq('user_id', user.id);
    setCommunityAttendance(new Set((myEvents ?? []).map((r: any) => r.event_id)));

    // Genres from concerts I've attended, to power "basado en tus conciertos".
    const attendedIds = (mine ?? []).map((r: any) => r.concert_id);
    if (attendedIds.length > 0) {
      const { data: attendedConcerts } = await supabase
        .from('catalog_concerts')
        .select('genres')
        .in('id', attendedIds);
      const genres = new Set<string>();
      (attendedConcerts ?? []).forEach((c: any) => (c.genres ?? []).forEach((g: string) => genres.add(g)));
      setAttendedGenres(genres);
    }

    // "Amigos que van" — friends' attendance across everything currently on screen.
    const { data: following } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
    const friendIds = (following ?? []).map((f: any) => f.following_id);
    if (friendIds.length > 0) {
      const { data: friendAttendance } = await supabase
        .from('concert_attendance')
        .select('concert_id, user_id')
        .in('user_id', friendIds);
      const counts: Record<string, number> = {};
      (friendAttendance ?? []).forEach((r: any) => {
        counts[r.concert_id] = (counts[r.concert_id] ?? 0) + 1;
      });
      setFriendCounts(counts);
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const gpsCenter = { name: 'Tu ubicación', lat: position.coords.latitude, lng: position.coords.longitude };
          setCitySearch('');
          setCenter(gpsCenter);
          await loadConcerts(gpsCenter);
          return;
        }
      } catch {
        // Permission API unavailable or the request failed — fall through to the default city below.
      }
      // Denied, undetermined, or errored: keep today's default-city behavior,
      // with a one-time nudge so it's clear why the map isn't centered on them.
      Alert.alert(
        'Ubicación desactivada',
        'Activa el permiso de ubicación para ver conciertos más cerca de ti. Por ahora te mostramos eventos en Monterrey — busca tu ciudad arriba si prefieres otra.'
      );
      await loadConcerts(DEFAULT_CITY);
    })();
    loadCommunityEvents();
  }, []);

  useEffect(() => {
    loadAttendanceContext();
  }, [user?.id, concerts.length]);

  const handleSearchCity = async () => {
    // No geocoding API wired up (would need a key + expo-location for real
    // coordinates) — this reuses Ticketmaster's own `city` keyword filter
    // instead of resolving lat/lng, so the map re-centers loosely rather
    // than precisely for a searched city.
    setLoading(true);
    const results = await searchAllConcerts({ city: citySearch, size: 30 });
    setConcerts(results);
    if (results[0]) setCenter({ name: citySearch, lat: results[0].latitude, lng: results[0].longitude });
    setLoading(false);
  };

  const handleToggleAttend = async (item: UnifiedEvent) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para marcar asistencia.');
      return;
    }
    if (useAuthStore.getState().isRichDemo) {
      if (item.kind === 'oficial') {
        setAttendance((prev) => {
          const next = new Set(prev);
          next.has(item.id) ? next.delete(item.id) : next.add(item.id);
          return next;
        });
      } else {
        setCommunityAttendance((prev) => new Set(prev).add(item.id));
      }
      return;
    }
    if (item.kind === 'oficial') {
      const already = attendance.has(item.id);
      if (already) {
        await supabase.from('concert_attendance').delete().eq('user_id', user.id).eq('concert_id', item.id);
        setAttendance((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      } else {
        await upsertConcertToCatalog(item.raw as ConcertResult);
        await supabase.from('concert_attendance').insert({ user_id: user.id, concert_id: item.id });
        setAttendance((prev) => new Set(prev).add(item.id));
      }
    } else {
      if (communityAttendance.has(item.id)) return; // already attending — the party link covers the rest
      // Rely on the insert's own PK conflict (event_id, user_id) to detect a
      // double-tap that raced past the `communityAttendance` check above —
      // that check reads state that hasn't re-rendered yet on a fast second
      // tap, so without this the RPC below used to fire twice and inflate
      // attendees_count with no compensating decrement anywhere.
      const { error } = await supabase.from('event_attendees').insert({ event_id: item.id, user_id: user.id });
      setCommunityAttendance((prev) => new Set(prev).add(item.id));
      if (error) return;
      await supabase.rpc('increment_event_attendees', { event_id: item.id });
      loadCommunityEvents();
    }
  };

  const handleEnterParty = (item: UnifiedEvent) => {
    router.push(`/party/${item.id}`);
  };

  const handleCreatePress = async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para crear un evento.');
      return;
    }
    const premium = await checkIsPremium();
    if (premium) setCreateVisible(true);
    else setPaywallVisible(true);
  };

  const unified: UnifiedEvent[] = useMemo(() => {
    const official = concerts.map(concertToUnified);
    const community = communityEvents.map(communityToUnified);
    const all = [...official, ...community];
    if (activeTab === 'oficiales') return official;
    if (activeTab === 'comunidad') return community;
    return all;
  }, [concerts, communityEvents, activeTab]);

  const recommended = useMemo(() => {
    if (attendedGenres.size === 0) return [];
    return concerts
      .filter((c) => c.genres.some((g) => attendedGenres.has(g)))
      .slice(0, 5);
  }, [concerts, attendedGenres]);

  const TABS: { key: TabType; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'oficiales', label: 'Oficiales' },
    { key: 'comunidad', label: 'Comunidad' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchBar}>
        <Ionicons name="location-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={citySearch}
          onChangeText={setCitySearch}
          onSubmitEditing={handleSearchCity}
          placeholder="Buscar ciudad..."
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={Colors.primary} />}
      </View>

      {isRichDemo && (
        <View style={styles.historyToggleRow}>
          <TouchableOpacity
            style={[styles.historyToggleBtn, !showHistory && styles.historyToggleBtnActive]}
            onPress={() => setShowHistory(false)}
          >
            <Ionicons name="location-outline" size={14} color={!showHistory ? '#fff' : Colors.textSecondary} />
            <Text style={[styles.historyToggleText, !showHistory && styles.historyToggleTextActive]}>Cerca de mí</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.historyToggleBtn, showHistory && styles.historyToggleBtnActive]}
            onPress={() => setShowHistory(true)}
          >
            <Ionicons name="globe-outline" size={14} color={showHistory ? '#fff' : Colors.textSecondary} />
            <Text style={[styles.historyToggleText, showHistory && styles.historyToggleTextActive]}>Mi historial</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: center.lat,
            longitude: center.lng,
            latitudeDelta: 0.3,
            longitudeDelta: 0.3,
          }}
          region={
            showHistory
              ? HISTORY_REGION
              : { latitude: center.lat, longitude: center.lng, latitudeDelta: 0.3, longitudeDelta: 0.3 }
          }
        >
          {(showHistory ? HISTORY_UNIFIED : unified).map((e) => (
            <Marker
              key={`${e.kind}-${e.id}`}
              coordinate={{ latitude: e.latitude, longitude: e.longitude }}
              title={e.name}
              description={`${e.venue}${e.city ? ` · ${e.city}` : ''} · ${e.dateLabel}`}
              pinColor={showHistory ? Colors.secondary : e.kind === 'oficial' ? Colors.primary : Colors.secondary}
            />
          ))}
        </MapView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {showHistory ? (
          <>
            <Text style={styles.title}>Tu historial · {HISTORY_UNIFIED.length} conciertos</Text>
            {HISTORY_UNIFIED.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyBadge}>
                  <Text style={styles.historyBadgeText}>ASISTISTE</Text>
                </View>
                <Text style={styles.historyName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.historyMeta}>{item.venue}{item.city ? ` · ${item.city}` : ''}</Text>
                <Text style={styles.historyMeta}>{item.dateLabel}</Text>
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.title}>Eventos · {center.name}</Text>

            <View style={styles.tabsRow}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabPill, activeTab === tab.key && styles.tabPillActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={[styles.tabPillText, activeTab === tab.key && styles.tabPillTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {recommended.length > 0 && (
              <View style={styles.recSection}>
                <Text style={styles.recTitle}>Basado en tus conciertos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {recommended.map((c) => (
                    <View key={c.id} style={styles.recCard}>
                      <Text style={styles.recCardName} numberOfLines={2}>{c.name}</Text>
                      <Text style={styles.recCardMeta}>{c.genres[0] ?? ''}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {unified.length === 0 && !loading && (
              <Text style={styles.emptyText}>No hay eventos por aquí todavía.</Text>
            )}

            {unified.map((item) => (
              <EventCard
                key={`${item.kind}-${item.id}`}
                item={item}
                attending={item.kind === 'oficial' ? attendance.has(item.id) : communityAttendance.has(item.id)}
                friendCount={friendCounts[item.id] ?? 0}
                onToggleAttend={handleToggleAttend}
                onEnterParty={handleEnterParty}
              />
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={handleCreatePress} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <CreateEventModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={loadCommunityEvents}
        center={{ lat: center.lat, lng: center.lng }}
      />
      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onPurchased={() => {
          setPaywallVisible(false);
          setCreateVisible(true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14 },

  historyToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  historyToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  historyToggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  historyToggleText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  historyToggleTextActive: { color: '#fff' },

  mapWrap: { height: 220, marginHorizontal: 16, borderRadius: Radius.lg, overflow: 'hidden' },
  map: { flex: 1 },

  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.secondary}22`,
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  historyBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.secondary, letterSpacing: 0.5 },
  historyName: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  historyMeta: { fontSize: 13, color: Colors.textMuted, marginBottom: 2 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  title: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 16 },

  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabPill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99, borderWidth: 1, borderColor: Colors.border },
  tabPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabPillText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabPillTextActive: { color: '#fff' },

  recSection: { marginBottom: 16 },
  recTitle: { color: Colors.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  recCard: {
    width: 130,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recCardName: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  recCardMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 4, textTransform: 'capitalize' },

  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },

  eventCard: { borderRadius: 16, padding: 20, marginBottom: 12 },
  eventBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  eventBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  eventName: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 6 },
  eventMeta: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  eventBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  attendeeRow: { flexDirection: 'row', alignItems: 'center' },
  extraCount: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  actionButton: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 99, paddingVertical: 7, paddingHorizontal: 14, marginLeft: 8 },
  actionButtonGhost: { backgroundColor: 'rgba(255,255,255,0.2)' },
  actionButtonText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },

  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  fieldLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 12,
    color: Colors.text,
    fontSize: 15,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  createButton: { borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
