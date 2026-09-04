/**
 * Bandsintown API — artist-follow based concert listings.
 * Docs: https://app.swaggerhub.com/apis/Bandsintown/PublicAPI/3.0.0
 */

const BASE_URL = 'https://rest.bandsintown.com';
const APP_ID = process.env.EXPO_PUBLIC_BANDSINTOWN_APP_ID ?? 'sonet';

export interface BandsintownEvent {
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
  cover_image: string;
  source: 'bandsintown';
}

async function bitFetch(path: string): Promise<any | null> {
  try {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${BASE_URL}${path}${sep}app_id=${APP_ID}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Bandsintown has no free-text search — events are looked up per artist name. */
export async function getEventsByArtist(artistName: string): Promise<BandsintownEvent[]> {
  const data = await bitFetch(`/artists/${encodeURIComponent(artistName)}/events`);
  if (!Array.isArray(data)) return [];
  return data.map(mapEvent).filter(Boolean) as BandsintownEvent[];
}

export async function getEventsByArtists(artistNames: string[]): Promise<BandsintownEvent[]> {
  const results = await Promise.allSettled(artistNames.slice(0, 10).map(getEventsByArtist));
  return results
    .filter((r): r is PromiseFulfilledResult<BandsintownEvent[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

function mapEvent(event: any): BandsintownEvent | null {
  const venue = event.venue;
  const lat = parseFloat(venue?.latitude ?? '0');
  const lng = parseFloat(venue?.longitude ?? '0');
  if (!lat || !lng) return null;

  const artists = (event.lineup ?? []).length ? event.lineup : [venue?.name ?? 'Unknown'];

  return {
    id: `bit-${event.id}`,
    name: event.title || (event.lineup ?? []).join(', '),
    artist_names: artists,
    venue: venue?.name ?? 'Venue desconocido',
    city: venue?.city ?? '',
    country: venue?.country ?? '',
    latitude: lat,
    longitude: lng,
    date: event.datetime,
    ticket_url: event.url,
    cover_image: event.artist?.image_url ?? '',
    source: 'bandsintown' as const,
  };
}
