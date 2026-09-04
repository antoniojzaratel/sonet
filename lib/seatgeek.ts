/**
 * SeatGeek API — ticketing aggregator; supplements Ticketmaster's coverage
 * and pricing, especially for secondary-market listings.
 * Docs: https://platform.seatgeek.com/
 */

const BASE_URL = 'https://api.seatgeek.com/2';
const CLIENT_ID = process.env.EXPO_PUBLIC_SEATGEEK_CLIENT_ID ?? '';

export interface SeatGeekEvent {
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
  price_min?: number;
  price_max?: number;
  genres: string[];
  source: 'seatgeek';
}

async function seatgeekFetch(path: string): Promise<any | null> {
  if (!CLIENT_ID) return null;
  try {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${BASE_URL}${path}${sep}client_id=${CLIENT_ID}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function searchEvents(params: {
  query?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  perPage?: number;
}): Promise<SeatGeekEvent[]> {
  const qs = new URLSearchParams({
    'taxonomies.name': 'concert',
    per_page: String(params.perPage ?? 20),
    sort: 'datetime_local.asc',
    ...(params.query && { q: params.query }),
    ...(params.lat != null && params.lng != null && {
      lat: String(params.lat),
      lon: String(params.lng),
      range: `${params.radiusKm ?? 80}km`,
    }),
  });

  const data = await seatgeekFetch(`/events?${qs}`);
  const events = data?.events ?? [];
  return events.map(mapEvent).filter(Boolean) as SeatGeekEvent[];
}

function mapEvent(event: any): SeatGeekEvent | null {
  const venue = event.venue;
  const lat = Number(venue?.location?.lat ?? 0);
  const lng = Number(venue?.location?.lon ?? 0);
  if (!lat || !lng) return null;

  const artists = (event.performers ?? []).map((p: any) => p.name);

  return {
    id: `sg-${event.id}`,
    name: event.title ?? event.short_title,
    artist_names: artists.length ? artists : [event.title],
    venue: venue?.name ?? 'Venue desconocido',
    city: venue?.city ?? '',
    country: venue?.country ?? '',
    latitude: lat,
    longitude: lng,
    date: event.datetime_utc,
    ticket_url: event.url,
    cover_image: event.performers?.[0]?.image ?? '',
    price_min: event.stats?.lowest_price ?? undefined,
    price_max: event.stats?.highest_price ?? undefined,
    genres: event.taxonomies?.map((t: any) => t.name) ?? [],
    source: 'seatgeek' as const,
  };
}
