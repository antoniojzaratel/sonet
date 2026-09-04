/**
 * Unified concert search — merges Ticketmaster, Songkick, Bandsintown, and
 * SeatGeek into one deduplicated list. Ticketmaster stays primary (best
 * coverage + pricing); the others fill gaps and get dropped on overlap.
 */

import { searchConcerts, type ConcertResult } from './ticketmaster';
import { getEventsByArtists as getSongkickByArtists } from './songkick';
import { getEventsByArtists as getBandsintownByArtists } from './bandsintown';
import { searchEvents as searchSeatGeek } from './seatgeek';

export type UnifiedConcert = ConcertResult;

export interface UnifiedConcertSearchOptions {
  keyword?: string;
  city?: string;
  artistNames?: string[];
  location?: { lat: number; lng: number };
  radiusKm?: number;
  size?: number;
}

/** Search all concert sources and merge, deduping same artist+date+city across providers. */
export async function searchAllConcerts(opts: UnifiedConcertSearchOptions): Promise<UnifiedConcert[]> {
  const { keyword, city, artistNames = [], location, radiusKm = 80, size = 20 } = opts;

  const promises: Promise<UnifiedConcert[]>[] = [
    searchConcerts({
      keyword,
      city,
      size,
      ...(location && { latlong: `${location.lat},${location.lng}`, radius: radiusKm }),
    }),
    searchSeatGeek({
      query: keyword ?? city,
      lat: location?.lat,
      lng: location?.lng,
      radiusKm,
      perPage: size,
    }).then((events) => events.map(fromSeatGeek)),
  ];

  if (artistNames.length) {
    promises.push(getSongkickByArtists(artistNames).then((events) => events.map(fromSongkick)));
    promises.push(getBandsintownByArtists(artistNames).then((events) => events.map(fromBandsintown)));
  } else if (keyword) {
    promises.push(getSongkickByArtists([keyword]).then((events) => events.map(fromSongkick)));
    promises.push(getBandsintownByArtists([keyword]).then((events) => events.map(fromBandsintown)));
  }

  const results = await Promise.allSettled(promises);
  const all = results
    .filter((r): r is PromiseFulfilledResult<UnifiedConcert[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  return dedupe(all);
}

function dedupe(events: UnifiedConcert[]): UnifiedConcert[] {
  const seen = new Map<string, UnifiedConcert>();
  for (const event of events) {
    const key = dedupeKey(event);
    const existing = seen.get(key);
    // Prefer whichever source already has pricing data, else keep first-seen (Ticketmaster first).
    if (!existing || (!existing.price_min && event.price_min)) {
      seen.set(key, event);
    }
  }
  return [...seen.values()];
}

function dedupeKey(event: UnifiedConcert): string {
  const artist = (event.artist_names[0] ?? '').toLowerCase().trim();
  const day = event.date.slice(0, 10);
  const city = event.city.toLowerCase().trim();
  return `${artist}|${day}|${city}`;
}

function fromSeatGeek(e: import('./seatgeek').SeatGeekEvent): UnifiedConcert {
  return {
    id: e.id,
    name: e.name,
    artist_names: e.artist_names,
    venue: e.venue,
    address: '',
    city: e.city,
    country: e.country,
    latitude: e.latitude,
    longitude: e.longitude,
    date: e.date,
    ticket_url: e.ticket_url,
    cover_image: e.cover_image,
    price_min: e.price_min,
    price_max: e.price_max,
    genres: e.genres,
    is_sold_out: false,
    source: 'seatgeek',
  };
}

function fromSongkick(e: import('./songkick').SongkickEvent): UnifiedConcert {
  return {
    id: e.id,
    name: e.name,
    artist_names: e.artist_names,
    venue: e.venue,
    address: '',
    city: e.city,
    country: e.country,
    latitude: e.latitude,
    longitude: e.longitude,
    date: e.date,
    ticket_url: e.ticket_url,
    cover_image: '',
    genres: [],
    is_sold_out: e.is_sold_out,
    source: 'songkick',
  };
}

function fromBandsintown(e: import('./bandsintown').BandsintownEvent): UnifiedConcert {
  return {
    id: e.id,
    name: e.name,
    artist_names: e.artist_names,
    venue: e.venue,
    address: '',
    city: e.city,
    country: e.country,
    latitude: e.latitude,
    longitude: e.longitude,
    date: e.date,
    ticket_url: e.ticket_url,
    cover_image: e.cover_image,
    genres: [],
    is_sold_out: false,
    source: 'bandsintown',
  };
}
