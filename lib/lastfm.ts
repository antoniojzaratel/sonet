/**
 * Last.fm API — scrobble-driven tags, similar artists, and popularity signals.
 * Docs: https://www.last.fm/api
 */

const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
const API_KEY = process.env.EXPO_PUBLIC_LASTFM_API_KEY ?? '';

export interface LastfmArtistInfo {
  name: string;
  mbid?: string;
  listeners: number;
  playcount: number;
  tags: string[];
  similar: string[];
  bio_summary?: string;
  source: 'lastfm';
}

async function lastfmFetch(params: Record<string, string>): Promise<any | null> {
  if (!API_KEY) return null;
  try {
    const query = new URLSearchParams({ ...params, api_key: API_KEY, format: 'json' });
    const res = await fetch(`${BASE_URL}?${query}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getArtistInfoLastfm(artistName: string): Promise<LastfmArtistInfo | null> {
  const data = await lastfmFetch({ method: 'artist.getinfo', artist: artistName, autocorrect: '1' });
  const artist = data?.artist;
  if (!artist) return null;
  return {
    name: artist.name,
    mbid: artist.mbid || undefined,
    listeners: Number(artist.stats?.listeners ?? 0),
    playcount: Number(artist.stats?.playcount ?? 0),
    tags: (artist.tags?.tag ?? []).map((t: any) => t.name),
    similar: (artist.similar?.artist ?? []).map((a: any) => a.name),
    bio_summary: artist.bio?.summary,
    source: 'lastfm' as const,
  };
}

export async function getSimilarArtistsLastfm(artistName: string, limit = 10): Promise<string[]> {
  const data = await lastfmFetch({
    method: 'artist.getsimilar',
    artist: artistName,
    autocorrect: '1',
    limit: String(limit),
  });
  return (data?.similarartists?.artist ?? []).map((a: any) => a.name);
}

export async function getTopTagsLastfm(artistName: string): Promise<string[]> {
  const data = await lastfmFetch({ method: 'artist.gettoptags', artist: artistName, autocorrect: '1' });
  return (data?.toptags?.tag ?? []).slice(0, 10).map((t: any) => t.name);
}
