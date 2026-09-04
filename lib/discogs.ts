/**
 * Discogs — deep release/pressing metadata: physical editions, credits,
 * genres & styles. Good complement to Spotify for album-level detail.
 * Docs: https://www.discogs.com/developers
 */

const BASE_URL = 'https://api.discogs.com';
const TOKEN = process.env.EXPO_PUBLIC_DISCOGS_TOKEN ?? '';
const USER_AGENT = 'Sonet/1.0 +https://sonet.app';

export interface DiscogsRelease {
  id: number;
  title: string;
  artist_name: string;
  year?: string;
  genres: string[];
  styles: string[];
  cover_image?: string;
  type: 'release' | 'master';
  source: 'discogs';
}

async function discogsFetch(path: string): Promise<any | null> {
  if (!TOKEN) return null;
  try {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${BASE_URL}${path}${sep}token=${TOKEN}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function searchDiscogs(
  query: string,
  type: 'release' | 'master' | 'artist' = 'release',
  limit = 8,
): Promise<DiscogsRelease[]> {
  const params = new URLSearchParams({ q: query, type, per_page: String(limit) });
  const data = await discogsFetch(`/database/search?${params}`);
  return (data?.results ?? []).map((r: any) => ({
    id: r.id,
    title: r.title?.split(' - ').slice(1).join(' - ') || r.title,
    artist_name: r.title?.split(' - ')[0] ?? '',
    year: r.year,
    genres: r.genre ?? [],
    styles: r.style ?? [],
    cover_image: r.cover_image,
    type: r.type === 'master' ? 'master' : 'release',
    source: 'discogs' as const,
  }));
}

/** Genres + styles Discogs assigns to an artist's catalog, aggregated from their top releases. */
export async function getArtistGenresDiscogs(artistName: string): Promise<string[]> {
  const releases = await searchDiscogs(artistName, 'release', 10);
  const set = new Set<string>();
  for (const r of releases) {
    r.genres.forEach((g) => set.add(g));
    r.styles.forEach((s) => set.add(s));
  }
  return Array.from(set);
}
