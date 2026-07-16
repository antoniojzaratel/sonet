import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

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
};

type TabType = 'todos' | 'oficiales' | 'comunidad';

interface EventData {
  id: string;
  type: 'oficial' | 'comunidad';
  name: string;
  venue: string;
  date: string;
  attendees: string[];
  extraCount: number;
  gradient: [string, string];
}

const EVENTS: EventData[] = [
  {
    id: '1',
    type: 'oficial',
    name: 'Zoé – Gira 2026',
    venue: 'Arena Monterrey',
    date: 'Sáb 22 Ago · 21:00',
    attendees: ['M', 'D', 'R'],
    extraCount: 9,
    gradient: ['#A855F7', '#3B82F6'],
  },
  {
    id: '2',
    type: 'comunidad',
    name: 'Listening party: nuevo álbum de Junior H',
    venue: 'Barrio Antiguo (zona)',
    date: 'Vie 17 Jul · 20:00 · cupo 25',
    attendees: ['R', 'A'],
    extraCount: 6,
    gradient: ['#92400E', '#78350F'],
  },
  {
    id: '3',
    type: 'oficial',
    name: 'Arctic Monkeys World Tour',
    venue: 'Estadio BBVA',
    date: 'Dom 14 Sep · 20:00',
    attendees: ['M', 'S', 'L'],
    extraCount: 12,
    gradient: ['#1E3A5F', '#0F172A'],
  },
  {
    id: '4',
    type: 'comunidad',
    name: 'Versus musical: Corridos vs Rock',
    venue: 'Café Iguana',
    date: 'Mié 23 Jul · 19:00 · cupo 30',
    attendees: ['P', 'C'],
    extraCount: 4,
    gradient: ['#4C1D95', '#1E1B4B'],
  },
];

const ATTENDEE_COLORS = ['#A855F7', '#F43F5E', '#84CC16', '#F59E0B', '#3B82F6'];

function EventCard({ event }: { event: EventData }) {
  const isOficial = event.type === 'oficial';
  const actionLabel = isOficial ? 'Quiero ir →' : 'Pedir lugar →';
  const badgeLabel = isOficial ? 'OFICIAL · TICKETMASTER' : 'COMUNIDAD';

  return (
    <LinearGradient
      colors={event.gradient}
      style={styles.eventCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Badge */}
      <View style={styles.eventBadge}>
        <Text style={styles.eventBadgeText}>{badgeLabel}</Text>
      </View>

      {/* Name */}
      <Text style={styles.eventName}>{event.name}</Text>

      {/* Venue + date */}
      <Text style={styles.eventMeta}>{event.venue}</Text>
      <Text style={styles.eventMeta}>{event.date}</Text>

      {/* Bottom row */}
      <View style={styles.eventBottom}>
        <View style={styles.attendeeRow}>
          {event.attendees.map((initial, idx) => (
            <View
              key={idx}
              style={[
                styles.attendeeCircle,
                { backgroundColor: ATTENDEE_COLORS[idx % ATTENDEE_COLORS.length], marginLeft: idx === 0 ? 0 : -8 },
              ]}
            >
              <Text style={styles.attendeeInitial}>{initial}</Text>
            </View>
          ))}
          <Text style={styles.extraCount}>+{event.extraCount}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

export default function MapScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('todos');

  const filteredEvents = EVENTS.filter((e) => {
    if (activeTab === 'todos') return true;
    if (activeTab === 'oficiales') return e.type === 'oficial';
    if (activeTab === 'comunidad') return e.type === 'comunidad';
    return true;
  });

  const TABS: { key: TabType; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'oficiales', label: 'Oficiales' },
    { key: 'comunidad', label: 'Comunidad' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Text style={styles.title}>Eventos · Monterrey 📍</Text>

        {/* Segment tabs */}
        <View style={styles.tabsRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabPill, activeTab === tab.key && styles.tabPillActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabPillText, activeTab === tab.key && styles.tabPillTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Event cards */}
        {filteredEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}

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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  /* Header */
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },

  /* Segment tabs */
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tabPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#333',
  },
  tabPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabPillTextActive: {
    color: '#fff',
  },

  /* Event card */
  eventCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  eventBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  eventBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  eventMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  eventBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.4)',
  },
  attendeeInitial: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  extraCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 6,
  },
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 99,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
