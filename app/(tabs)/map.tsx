import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSocialStore } from '@/stores/socialStore';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { formatDate } from '@/lib/utils';
import type { Event, EventType } from '@/types';

const { width } = Dimensions.get('window');
const EVENT_CARD_WIDTH = width * 0.75;

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a1a1aa' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d0d' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e2e2e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
];

const EVENT_TYPE_EMOJI: Record<EventType, string> = {
  concert: '🎤',
  listening_party: '🎧',
  festival: '🎪',
  meetup: '🤝',
};

export default function MapScreen() {
  const { events, fetchEvents, createEvent, attendEvent } = useSocialStore();
  const { user } = useAuthStore();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleAttend = async (event: Event) => {
    if (!user) return;
    await attendEvent(event.id, user.id);
    Alert.alert('¡Apuntado!', `Te has unido a "${event.title}"`);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={{
          latitude: 19.4326,
          longitude: -99.1332,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {events.map((event) => (
          <Marker
            key={event.id}
            coordinate={{ latitude: event.latitude, longitude: event.longitude }}
            onPress={() => setSelectedEvent(event)}
          >
            <View style={styles.markerContainer}>
              <LinearGradient
                colors={event.is_official ? [Colors.secondary, '#65A30D'] : [Colors.primary, Colors.primaryDark]}
                style={styles.marker}
              >
                <Text style={styles.markerEmoji}>{EVENT_TYPE_EMOJI[event.event_type as EventType]}</Text>
              </LinearGradient>
            </View>
          </Marker>
        ))}
      </MapView>

      <SafeAreaView style={styles.overlay} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Mapa Musical</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Crear evento</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.legend}>
          <LegendItem color={Colors.secondary} label="Oficial" />
          <LegendItem color={Colors.primary} label="Comunidad" />
        </View>
      </SafeAreaView>

      {events.length > 0 && (
        <View style={styles.bottomList}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bottomScroll}
          >
            {events.slice(0, 10).map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.eventCard,
                  selectedEvent?.id === event.id && styles.eventCardSelected,
                ]}
                onPress={() => {
                  setSelectedEvent(event);
                  mapRef.current?.animateToRegion({
                    latitude: event.latitude,
                    longitude: event.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  });
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.eventEmoji}>{EVENT_TYPE_EMOJI[event.event_type as EventType]}</Text>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                  <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
                  <Text style={styles.eventVenue} numberOfLines={1}>{event.venue || event.address}</Text>
                </View>
                <View style={styles.attendees}>
                  <Ionicons name="people" size={14} color={Colors.textMuted} />
                  <Text style={styles.attendeesText}>{event.attendees_count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {selectedEvent && (
        <Modal transparent animationType="slide" visible={!!selectedEvent}>
          <View style={styles.eventModalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedEvent(null)} />
            <View style={styles.eventModal}>
              <View style={styles.eventModalHandle} />
              <Text style={styles.eventModalEmoji}>
                {EVENT_TYPE_EMOJI[selectedEvent.event_type as EventType]}
              </Text>
              <Text style={styles.eventModalTitle}>{selectedEvent.title}</Text>
              {selectedEvent.description && (
                <Text style={styles.eventModalDesc}>{selectedEvent.description}</Text>
              )}
              <View style={styles.eventModalDetails}>
                <Detail icon="calendar" text={formatDate(selectedEvent.date)} />
                {selectedEvent.venue && <Detail icon="location" text={selectedEvent.venue} />}
                <Detail icon="people" text={`${selectedEvent.attendees_count} asistentes`} />
              </View>
              <TouchableOpacity
                style={styles.attendButton}
                onPress={() => handleAttend(selectedEvent)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={styles.attendButtonGradient}
                >
                  <Text style={styles.attendButtonText}>¡Me apunto!</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <CreateEventModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={() => { setCreateModalVisible(false); fetchEvents(); }}
        userId={user?.id}
      />
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function Detail({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={`${icon}-outline`} size={16} color={Colors.textMuted} />
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

function CreateEventModal({ visible, onClose, onCreated, userId }: any) {
  const { createEvent } = useSocialStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('listening_party');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title || !userId) return;
    setLoading(true);
    await createEvent({
      creator_id: userId,
      title,
      description,
      event_type: type,
      latitude: 19.4326,
      longitude: -99.1332,
      date: new Date(Date.now() + 86400000).toISOString(),
      is_official: false,
    });
    setLoading(false);
    setTitle('');
    setDescription('');
    onCreated();
  };

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <View style={styles.eventModalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.eventModal}>
          <View style={styles.eventModalHandle} />
          <Text style={styles.eventModalTitle}>Crear Evento</Text>

          <TextInput
            style={styles.createInput}
            placeholder="Nombre del evento"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.createInput, { height: 80 }]}
            placeholder="Descripción (opcional)"
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
            {(['concert', 'listening_party', 'festival', 'meetup'] as EventType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, type === t && styles.typeChipActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.typeChipText, type === t && { color: Colors.primaryLight }]}>
                  {EVENT_TYPE_EMOJI[t]} {t.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity onPress={handleCreate} disabled={loading} activeOpacity={0.8}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.attendButtonGradient}>
              <Text style={styles.attendButtonText}>{loading ? 'Creando...' : 'Crear evento'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
  },
  createButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  legend: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: Colors.textSecondary, fontSize: 12 },

  markerContainer: { alignItems: 'center' },
  marker: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  markerEmoji: { fontSize: 20 },

  bottomList: { position: 'absolute', bottom: 100, left: 0, right: 0 },
  bottomScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  eventCard: {
    width: EVENT_CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventCardSelected: { borderColor: Colors.primary },
  eventEmoji: { fontSize: 28 },
  eventInfo: { flex: 1 },
  eventTitle: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  eventDate: { color: Colors.primary, fontSize: 12, marginTop: 2 },
  eventVenue: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  attendees: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  attendeesText: { color: Colors.textMuted, fontSize: 12 },

  eventModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  eventModal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  eventModalHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  eventModalEmoji: { fontSize: 40, textAlign: 'center', marginBottom: Spacing.sm },
  eventModalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  eventModalDesc: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 6 },
  eventModalDetails: { marginVertical: Spacing.md, gap: Spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { color: Colors.textSecondary, fontSize: 14 },
  attendButton: { marginTop: Spacing.sm },
  attendButtonGradient: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  attendButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  createInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    fontSize: 15,
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  typeChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
});

