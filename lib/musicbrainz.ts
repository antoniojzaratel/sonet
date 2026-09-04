/**
 * MusicBrainz — free, open canonical metadata for artists/releases/recordings.
 * No API key required, but the API mandates a descriptive User-Agent and a
 * ~1 req/sec rate limit (https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting).
 * Docs: https://musicbrainz.org/doc/MusicBrainz_API
 */

const BASE_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'Sonet/1.0 (contact: support@sonet.app)';

export interface MBArtist {
  id: string;
  name: string;
  disambiguation?: string;
  country?: string;
  tags: string[];
  score: number;
  source: 'musicbrainz';
}

export interface MBRelease {
  id: string;
  title: string;
  artist_name: string;
  date?: string;
  country?: string;
  score: number;
  source: 'musicbrainz';
}

async function mbFetch(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function searchArtistMB(name: string, limit = 5): Promise<MBArtist[]> {
  const params = new URLSearchParams({ query: name, limit: String(limit), fmt: 'json' });
  const data = await mbFetch(`/artist?${params}`);
  return (data?.artists ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    disambiguation: a.disambiguation,
    country: a.country,
    tags: (a.tags ?? []).map((t: any) => t.name),
    score: a.score ?? 0,
    source: 'musicbrainz' as const,
  }));
}

export async function searchReleaseMB(
  title: string,
  artist?: string,
  limit = 5,
): Promise<MBRelease[]> {
  const query = artist ? `release:"${title}" AND artist:"${artist}"` : `release:"${title}"`;
  const params = new URLSearchParams({ query, limit: String(limit), fmt: 'json' });
  const data = await mbFetch(`/release?${params}`);
  return (data?.releases ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    artist_name: r['artist-credit']?.[0]?.name ?? '',
    date: r.date,
    country: r.country,
    score: r.score ?? 0,
    source: 'musicbrainz' as const,
  }));
}

/** Genre/style tags for an artist by MBID — cross-references cleanly with Discogs/Last.fm tags. */
export async function getArtistTagsMB(mbid: string): Promise<string[]> {
  const data = await mbFetch(`/artist/${mbid}?inc=tags&fmt=json`);
  return (data?.tags ?? []).map((t: any) => t.name);
}
