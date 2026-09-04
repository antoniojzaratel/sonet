/**
 * Ticketmaster API — Concert and live event discovery
 * Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';
const API_KEY = process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY ?? '';

export interface TicketmasterEvent {
  id: string;
  name: string;
  type: string;
  url: string;
  locale: string;
  images: { url: string; width: number; height: number }[];
  sales?: { public?: { startDateTime: string; endDateTime: string } };
  dates: {
    start: { localDate: string; localTime: string; dateTime: string };
    status?: { code: string };
  };
  classifications?: { genre?: { name: string }; subGenre?: { name: string } }[];
  promoter?: { name: string };
  priceRanges?: { min: number; max: number; currency: string }[];
  _embedded?: {
    venues?: TicketmasterVenue[];
    attractions?: { name: string; id: string }[];
  };
}

export interface TicketmasterVenue {
  name: string;
  address?: { line1: string };
  city?: { name: string };
  country?: { name: string; countryCode: string };
  location?: { longitude: string; latitude: string };
}

export interface ConcertResult {
  id: string;
  name: string;
  artist_names: string[];
  venue: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  date: string;
  ticket_url: string;
  cover_image: string;
  price_min?: number;
  price_max?: number;
  currency?: string;
  genres: string[];
  is_sold_out: boolean;
  source: ConcertSource;
}

export type ConcertSource = 'ticketmaster' | 'songkick' | 'bandsintown' | 'seatgeek';

export async function searchConcerts(params: {
  keyword?: string;
  city?: string;
  countryCode?: string;
  latlong?: string;     // "19.4326,-99.1332"
  radius?: number;      // km
  startDateTime?: string; // ISO
  genreId?: string;
  size?: number;
  page?: number;
}): Promise<ConcertResult[]> {
  const query = new URLSearchParams({
    apikey: API_KEY,
    classificationName: 'music',
    size: String(params.size ?? 20),
    page: String(params.page ?? 0),
    sort: 'date,asc',
    ...(params.keyword && { keyword: params.keyword }),
    ...(params.city && { city: params.city }),
    ...(params.countryCode && { countryCode: params.countryCode }),
    ...(params.latlong && { latlong: params.latlong, radius: String(params.radius ?? 50), unit: 'km' }),
    ...(params.startDateTime && { startDateTime: params.startDateTime }),
    ...(params.genreId && { genreId: params.genreId }),
  });

  try {
    const res = await fetch(`${BASE_URL}/events.json?${query}`);
    const data = await res.json();
    const events: TicketmasterEvent[] = data._embedded?.events ?? [];
    return events.map(mapEvent).filter(Boolean) as ConcertResult[];
  } catch {
    return [];
  }
}

export async function getConcertById(id: string): Promise<ConcertResult | null> {
  try {
    const res = await fetch(`${BASE_URL}/events/${id}.json?apikey=${API_KEY}`);
    const event: TicketmasterEvent = await res.json();
    return mapEvent(event);
  } catch {
    return null;
  }
}

export async function getConcertsByArtist(artistName: string): Promise<ConcertResult[]> {
  return searchConcerts({ keyword: artistName, size: 10 });
}

function mapEvent(event: TicketmasterEvent): ConcertResult | null {
  const venue = event._embedded?.venues?.[0];
  const lat = parseFloat(venue?.location?.latitude ?? '0');
  const lng = parseFloat(venue?.location?.longitude ?? '0');
  if (!lat || !lng) return null;

  const artists = event._embedded?.attractions?.map((a) => a.name) ?? [event.name];
  const image = event.images?.sort((a, b) => b.width - a.width)?.[0]?.url ?? '';
  const price = event.priceRanges?.[0];
  const genres = event.classifications
    ?.flatMap((c) => [c.genre?.name, c.subGenre?.name].filter(Boolean) as string[]) ?? [];

  return {
    id: event.id,
    name: event.name,
    artist_names: artists,
    venue: venue?.name ?? 'Venue desconocido',
    address: venue?.address?.line1 ?? '',
    city: venue?.city?.name ?? '',
    country: venue?.country?.name ?? '',
    latitude: lat,
    longitude: lng,
    date: event.dates.start.dateTime ?? `${event.dates.start.localDate}T20:00:00Z`,
    ticket_url: event.url,
    cover_image: image,
    price_min: price?.min,
    price_max: price?.max,
    currency: price?.currency,
    genres,
    is_sold_out: event.dates.status?.code === 'offsale',
    source: 'ticketmaster',
  };
}
