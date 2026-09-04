/**
 * Songkick API — tour-tracking concert data. Note: Songkick's API requires
 * partner approval (apply at https://www.songkick.com/api_key_requests/new);
 * until a key is approved, calls simply return no results.
 * Docs: https://www.songkick.com/developer
 */

const BASE_URL = 'https://api.songkick.com/api/3.0';
const API_KEY = process.env.EXPO_PUBLIC_SONGKICK_API_KEY ?? '';

export interface SongkickEvent {
  id: string;
  name: string;
  artist_names: string[];
  venue: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  date: string;
  ticket_url: string;
  is_sold_out: boolean;
  source: 'songkick';
}

async function songkickFetch(path: string): Promise<any | null> {
  if (!API_KEY) return null;
  try {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${BASE_URL}${path}${sep}apikey=${API_KEY}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function findArtistId(artistName: string): Promise<number | null> {
  const data = await songkickFetch(`/search/artists.json?query=${encodeURIComponent(artistName)}`);
  const artist = data?.resultsPage?.results?.artist?.[0];
  return artist?.id ?? null;
}

export async function getEventsByArtist(artistName: string): Promise<SongkickEvent[]> {
  const artistId = await findArtistId(artistName);
  if (!artistId) return [];
  const data = await songkickFetch(`/artists/${artistId}/calendar.json`);
  const events = data?.resultsPage?.results?.event ?? [];
  return events.map(mapEvent).filter(Boolean) as SongkickEvent[];
}

export async function getEventsByArtists(artistNames: string[]): Promise<SongkickEvent[]> {
  const results = await Promise.allSettled(artistNames.slice(0, 10).map(getEventsByArtist));
  return results
    .filter((r): r is PromiseFulfilledResult<SongkickEvent[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

function mapEvent(event: any): SongkickEvent | null {
  const venue = event.venue;
  const lat = Number(venue?.lat ?? 0);
  const lng = Number(venue?.lng ?? 0);
  if (!lat || !lng) return null;

  const artists = (event.performance ?? []).map((p: any) => p.artist?.name).filter(Boolean);

  return {
    id: `sk-${event.id}`,
    name: event.displayName,
    artist_names: artists.length ? artists : [event.displayName],
    venue: venue?.displayName ?? 'Venue desconocido',
    city: event.location?.city ?? '',
    country: venue?.metroArea?.country?.displayName ?? '',
    latitude: lat,
    longitude: lng,
    date: event.start?.datetime ?? `${event.start?.date}T20:00:00`,
    ticket_url: event.uri,
    is_sold_out: event.status === 'cancelled',
    source: 'songkick' as const,
  };
}
