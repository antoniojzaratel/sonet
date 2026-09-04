// Rich, entirely local "happy path" content for the demo account
// (demo@demo.com / demo123). No Supabase required — everything here is
// invented but shaped exactly like the real types, so every screen renders
// as if it were talking to a real, populated backend. Deliberately no
// image URLs: CoverImage's colored-initial fallback renders instantly with
// zero network dependency, which matters more for a live demo than real
// artwork would.

import type { User } from '@/types';
import type { RatingEntry, FeedEntry } from '@/stores/ratingStore';
import type { SoundMatchCandidate } from '@/stores/recommendationStore';
import type { MusicItem } from './musicDB';
import type { MusicVector } from './ai/tasteVector';
import { MOCK_USERS, MOCK_RATINGS } from './mockData';

export const DEMO_EMAIL = 'demo@demo.com';
export const DEMO_PASSWORD = 'demo123';
export const DEMO_USER_ID = 'demo-user-000';

export const DEMO_USER: User = {
  id: DEMO_USER_ID,
  username: 'alexdemo',
  display_name: 'Alex Rivera',
  bio: 'Corridos, rock en español y todo lo que suene bien.',
  followers_count: 284,
  following_count: 156,
  ratings_count: 7,
  created_at: new Date(Date.now() - 200 * 86400000).toISOString(),
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();

// Matches the real bucket+rank system exactly — liked (7.0-10.0) before
// fine (4.0-6.9) before disliked (1.0-3.9), rank_position sequential.
export const DEMO_RATINGS: RatingEntry[] = [
  { id: 'd1', contentId: 'demo-t1', contentName: 'Ella Baila Sola', artistName: 'Eslabon Armado & Peso Pluma', imageUrl: '', contentType: 'song', score: 9.8, bucket: 'liked', rankPosition: 1, review: 'La que suena en cada fiesta este año, sin excepción.', createdAt: hoursAgo(2) },
  { id: 'd2', contentId: 'demo-t2', contentName: 'Un Verano Sin Ti', artistName: 'Bad Bunny', imageUrl: '', contentType: 'album', score: 9.4, bucket: 'liked', rankPosition: 2, review: 'De principio a fin, ni una canción de relleno.', createdAt: hoursAgo(8) },
  { id: 'd3', contentId: 'demo-t3', contentName: 'AM', artistName: 'Arctic Monkeys', imageUrl: '', contentType: 'album', score: 9.1, bucket: 'liked', rankPosition: 3, createdAt: hoursAgo(30) },
  { id: 'd4', contentId: 'demo-t4', contentName: 'La Bebé', artistName: 'Yng Lvcas & Peso Pluma', imageUrl: '', contentType: 'song', score: 8.3, bucket: 'liked', rankPosition: 4, createdAt: hoursAgo(50) },
  { id: 'd5', contentId: 'demo-t5', contentName: 'Tití Me Preguntó', artistName: 'Bad Bunny', imageUrl: '', contentType: 'song', score: 6.0, bucket: 'fine', rankPosition: 5, review: 'Buena pero no de sus mejores.', createdAt: hoursAgo(70) },
  { id: 'd6', contentId: 'demo-t6', contentName: 'Quevedo: Bzrp Music Sessions, Vol. 52', artistName: 'Bizarrap', imageUrl: '', contentType: 'song', score: 5.2, bucket: 'fine', rankPosition: 6, createdAt: hoursAgo(95) },
  { id: 'd7', contentId: 'demo-t7', contentName: 'Flowers', artistName: 'Miley Cyrus', imageUrl: '', contentType: 'song', score: 2.8, bucket: 'disliked', rankPosition: 7, review: 'No es lo mío, demasiado repetida en la radio.', createdAt: hoursAgo(140) },
];

// Community feed — other invented users' ratings, reusing the app's
// existing rich mock catalog (lib/mockData.ts) reshaped to the real
// FeedEntry/RatingEntry types.
export const DEMO_FEED: FeedEntry[] = MOCK_RATINGS.map((r): FeedEntry => {
  const u = MOCK_USERS.find((mu) => mu.id === r.userId);
  const contentType: RatingEntry['contentType'] = r.contentType === 'track' ? 'song' : 'album';
  const bucket: RatingEntry['bucket'] = r.score >= 7 ? 'liked' : r.score >= 4 ? 'fine' : 'disliked';
  return {
    rating: {
      id: r.id,
      contentId: r.contentId,
      contentName: r.contentName,
      artistName: r.artistName,
      imageUrl: '',
      contentType,
      score: r.score,
      bucket,
      rankPosition: 0,
      review: r.review,
      createdAt: r.createdAt,
    },
    user: {
      id: r.userId,
      displayName: u?.displayName ?? 'Usuario',
      username: u?.username ?? 'usuario',
      avatarUrl: undefined,
    },
  };
}).concat(
  DEMO_RATINGS.slice(0, 4).map((r) => ({
    rating: r,
    user: { id: DEMO_USER_ID, displayName: DEMO_USER.display_name, username: DEMO_USER.username, avatarUrl: undefined },
  }))
).sort((a, b) => new Date(b.rating.createdAt).getTime() - new Date(a.rating.createdAt).getTime());

// SoundMatch — blind profile, matches the real candidate shape exactly.
export const DEMO_SOUNDMATCH_CANDIDATES: SoundMatchCandidate[] = [
  {
    user: { id: 'demo-cand-1' },
    age: 26,
    taste_score: 91,
    audio_score: 88,
    genre_score: 95,
    behavior_score: 89,
    shared_genres: ['Corridos', 'Regional Mexicano', 'Indie'],
    shared_artists: ['Peso Pluma', 'Carin León'],
    soundmatch_profile: { looking_for: ['dating', 'concert_buddy'] },
  },
  {
    user: { id: 'demo-cand-2' },
    age: 24,
    taste_score: 78,
    audio_score: 74,
    genre_score: 82,
    behavior_score: 76,
    shared_genres: ['Rock en español', 'Indie'],
    shared_artists: ['Zoé', 'Caifanes'],
    soundmatch_profile: { looking_for: ['friendship', 'music_buddy'] },
  },
  {
    user: { id: 'demo-cand-3' },
    age: 28,
    taste_score: 65,
    audio_score: 60,
    genre_score: 70,
    behavior_score: 64,
    shared_genres: ['Pop', 'Urbano'],
    shared_artists: ['Bad Bunny'],
    soundmatch_profile: { looking_for: ['dating'] },
  },
];

export interface DemoEvent {
  id: string;
  title: string;
  venue: string;
  city: string;
  date: string;
  eventType: 'concert' | 'listening_party' | 'watch_party' | 'festival' | 'meetup';
  artistNames: string[];
  attendeesCount: number;
  latitude: number;
  longitude: number;
}

const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

export const DEMO_EVENTS: DemoEvent[] = [
  { id: 'demo-ev-1', title: 'Peso Pluma en Monterrey', venue: 'Arena Monterrey', city: 'Monterrey', date: daysFromNow(18), eventType: 'concert', artistNames: ['Peso Pluma'], attendeesCount: 1240, latitude: 25.6866, longitude: -100.3161 },
  { id: 'demo-ev-2', title: 'Zoé — Gira 2026', venue: 'Auditorio Citibanamex', city: 'Monterrey', date: daysFromNow(32), eventType: 'concert', artistNames: ['Zoé'], attendeesCount: 860, latitude: 25.6595, longitude: -100.3733 },
  { id: 'demo-ev-3', title: 'Listening party: nuevo álbum de Carin León', venue: 'Casa de un amigo', city: 'Monterrey', date: daysFromNow(4), eventType: 'listening_party', artistNames: ['Carin León'], attendeesCount: 12, latitude: 25.6714, longitude: -100.3089 },
  { id: 'demo-ev-4', title: 'Watch party: Bad Bunny — Most Wanted Tour', venue: 'Terraza San Pedro', city: 'San Pedro Garza García', date: daysFromNow(9), eventType: 'watch_party', artistNames: ['Bad Bunny'], attendeesCount: 28, latitude: 25.6512, longitude: -100.4023 },
];

// Local catalog for the demo account's search — Beli-style "search, pick,
// rate" needs something to search even with no Spotify token connected.
// Same Latin/regional-Mexican-leaning taste as the rest of this app's demo
// content. No cover_image: CoverImage's fallback renders instantly.
const DEMO_CATALOG_SEED: { id: string; type: 'song' | 'album'; name: string; artist: string }[] = [
  { id: 'cat-1', type: 'song', name: 'Ella Baila Sola', artist: 'Eslabon Armado & Peso Pluma' },
  { id: 'cat-2', type: 'album', name: 'Génesis', artist: 'Peso Pluma' },
  { id: 'cat-3', type: 'album', name: 'Un Verano Sin Ti', artist: 'Bad Bunny' },
  { id: 'cat-4', type: 'song', name: 'Tití Me Preguntó', artist: 'Bad Bunny' },
  { id: 'cat-5', type: 'song', name: 'La Bebé', artist: 'Yng Lvcas & Peso Pluma' },
  { id: 'cat-6', type: 'song', name: 'Ojitos Lindos', artist: 'Bad Bunny ft. Bomba Estéreo' },
  { id: 'cat-7', type: 'song', name: 'La Forma en que Me Quieres', artist: 'Carin León' },
  { id: 'cat-8', type: 'album', name: 'Colmillo de Leche', artist: 'Carin León' },
  { id: 'cat-9', type: 'album', name: 'Dreamers', artist: 'Zoé' },
  { id: 'cat-10', type: 'song', name: 'Eres', artist: 'Café Tacvba' },
  { id: 'cat-11', type: 'song', name: 'La Negra Tomasa', artist: 'Caifanes' },
  { id: 'cat-12', type: 'album', name: 'Caras Vemos', artist: 'Caifanes' },
  { id: 'cat-13', type: 'song', name: 'En El 2000', artist: 'Natalia Lafourcade' },
  { id: 'cat-14', type: 'song', name: 'Quevedo: Bzrp Music Sessions, Vol. 52', artist: 'Bizarrap' },
  { id: 'cat-15', type: 'album', name: 'AM', artist: 'Arctic Monkeys' },
  { id: 'cat-16', type: 'song', name: 'R U Mine?', artist: 'Arctic Monkeys' },
  { id: 'cat-17', type: 'album', name: 'OK Computer', artist: 'Radiohead' },
  { id: 'cat-18', type: 'song', name: 'Creep', artist: 'Radiohead' },
  { id: 'cat-19', type: 'song', name: 'Everlong', artist: 'Foo Fighters' },
  { id: 'cat-20', type: 'song', name: 'Natalie', artist: 'Bruno Mars' },
  { id: 'cat-21', type: 'album', name: '24K Magic', artist: 'Bruno Mars' },
  { id: 'cat-22', type: 'song', name: 'Blinding Lights', artist: 'The Weeknd' },
  { id: 'cat-23', type: 'song', name: 'Bohemian Rhapsody', artist: 'Queen' },
  { id: 'cat-24', type: 'album', name: 'El Último Tour Del Mundo', artist: 'Bad Bunny' },
];

export const DEMO_CATALOG: MusicItem[] = DEMO_CATALOG_SEED.map((s) => ({
  id: s.id,
  type: s.type,
  name: s.name,
  artist_name: s.artist,
  artist_names: [s.artist],
}));

export function searchDemoCatalog(query: string): MusicItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return DEMO_CATALOG.filter(
    (item) => item.name.toLowerCase().includes(q) || item.artist_name.toLowerCase().includes(q)
  );
}

export function isDemoAccount(email: string, password: string): boolean {
  return email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
}

// A real MusicVector (not random) matching the demo user's invented
// Corridos/rock-en-español taste — genre_latin dominates over genre_rock,
// moderate (not extreme) energy/danceability so the vector reads as a
// genuine regional-Mexican-leaning listener rather than a pure dance-pop
// profile. Feeds lib/archetype.ts's computeArchetype() for the profile
// screen and stands in for a real Spotify-synced vector in SoundMatch
// compatibility math for the demo account.
export const DEMO_USER_VECTOR: MusicVector = {
  energy: 0.55, danceability: 0.4, valence: 0.62, acousticness: 0.28,
  instrumentalness: 0.04, speechiness: 0.12, tempo_norm: 0.55, loudness_norm: 0.6,
  liveness: 0.25, genre_pop: 0.08, genre_rock: 0.22, genre_hip_hop: 0.05,
  genre_electronic: 0.03, genre_latin: 0.62, genre_rnb: 0.03, genre_jazz: 0,
  genre_classical: 0, genre_other: 0.02, avg_rating_norm: 0.78,
  bpm_preference: 0.5, vocal_preference: 0.9, mood_index: 0.58, diversity: 0.35,
};

// Past concerts across continents, for the map's "Mi historial" world view.
// Same ConcertResult-compatible shape as DEMO_CONCERTS below, just with
// dates in the past and spread across real (approximate) venue coordinates
// instead of clustered around one city.
const yearsAgo = (y: number, extraDays = 0) => new Date(Date.now() - y * 365 * 86400000 - extraDays * 86400000).toISOString();

export const DEMO_CONCERT_HISTORY = [
  { id: 'hist-1', name: 'Bad Bunny — Most Wanted Tour', artist_names: ['Bad Bunny'], venue: 'Foro Sol', address: '', city: 'Ciudad de México', country: 'México', latitude: 19.4034, longitude: -99.0949, date: yearsAgo(1, 40), ticket_url: '', cover_image: '', genres: ['Urbano'], is_sold_out: true, source: 'ticketmaster' as const },
  { id: 'hist-2', name: 'Coachella — Fin de semana 1', artist_names: ['Varios artistas'], venue: 'Empire Polo Club', address: '', city: 'Indio, California', country: 'Estados Unidos', latitude: 33.6803, longitude: -116.2378, date: yearsAgo(2, 10), ticket_url: '', cover_image: '', genres: ['Festival'], is_sold_out: true, source: 'ticketmaster' as const },
  { id: 'hist-3', name: 'Rosalía — Motomami World Tour', artist_names: ['Rosalía'], venue: 'WiZink Center', address: '', city: 'Madrid', country: 'España', latitude: 40.4235, longitude: -3.6668, date: yearsAgo(2, 120), ticket_url: '', cover_image: '', genres: ['Pop', 'Flamenco'], is_sold_out: true, source: 'ticketmaster' as const },
  { id: 'hist-4', name: 'Karol G — Mañana Será Bonito Tour', artist_names: ['Karol G'], venue: 'Movistar Arena', address: '', city: 'Bogotá', country: 'Colombia', latitude: 4.6486, longitude: -74.0841, date: yearsAgo(1, 200), ticket_url: '', cover_image: '', genres: ['Urbano'], is_sold_out: true, source: 'ticketmaster' as const },
  { id: 'hist-5', name: 'Lollapalooza Chicago', artist_names: ['Varios artistas'], venue: 'Grant Park', address: '', city: 'Chicago, Illinois', country: 'Estados Unidos', latitude: 41.8746, longitude: -87.6206, date: yearsAgo(3, 30), ticket_url: '', cover_image: '', genres: ['Festival'], is_sold_out: false, source: 'ticketmaster' as const },
  { id: 'hist-6', name: 'Foo Fighters — Everything or Nothing at All Tour', artist_names: ['Foo Fighters'], venue: 'The O2 Arena', address: '', city: 'Londres', country: 'Reino Unido', latitude: 51.5033, longitude: 0.0031, date: yearsAgo(3, 150), ticket_url: '', cover_image: '', genres: ['Rock'], is_sold_out: true, source: 'ticketmaster' as const },
  { id: 'hist-7', name: 'Los Bunkers — Gira Aniversario', artist_names: ['Los Bunkers'], venue: 'Movistar Arena', address: '', city: 'Santiago', country: 'Chile', latitude: -33.4569, longitude: -70.6483, date: yearsAgo(1, 280), ticket_url: '', cover_image: '', genres: ['Rock en español'], is_sold_out: false, source: 'ticketmaster' as const },
  { id: 'hist-8', name: 'Rock in Rio', artist_names: ['Varios artistas'], venue: 'Cidade do Rock', address: '', city: 'Río de Janeiro', country: 'Brasil', latitude: -22.9111, longitude: -43.1964, date: yearsAgo(4, 60), ticket_url: '', cover_image: '', genres: ['Festival'], is_sold_out: true, source: 'ticketmaster' as const },
];

// Shaped exactly like lib/ticketmaster.ts's ConcertResult and the real
// `events` table row, so map.tsx can render them through the same code
// path as live data — no special-casing in the component itself.
export const DEMO_CONCERTS = DEMO_EVENTS.filter((e) => e.eventType === 'concert').map((e) => ({
  id: e.id,
  name: e.title,
  artist_names: e.artistNames,
  venue: e.venue,
  address: '',
  city: e.city,
  country: 'México',
  latitude: e.latitude,
  longitude: e.longitude,
  date: e.date,
  ticket_url: '',
  cover_image: '',
  genres: [] as string[],
  is_sold_out: false,
  source: 'ticketmaster' as const,
}));

export const DEMO_COMMUNITY_EVENTS = DEMO_EVENTS.filter((e) => e.eventType !== 'concert').map((e) => ({
  id: e.id,
  creator_id: DEMO_USER_ID,
  title: e.title,
  description: undefined,
  event_type: e.eventType,
  venue: e.venue,
  address: e.city,
  latitude: e.latitude,
  longitude: e.longitude,
  date: e.date,
  end_date: undefined,
  ticket_url: undefined,
  cover_image: undefined,
  attendees_count: e.attendeesCount,
  max_attendees: undefined,
  is_official: false,
  artist_names: e.artistNames,
  price: undefined,
  created_at: new Date(Date.now() - 86400000).toISOString(),
}));
