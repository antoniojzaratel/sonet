/**
 * Unified Music Database
 *
 * Single interface to search across all content types:
 * - Songs / Tracks (Spotify)
 * - Albums (Spotify)
 * - Podcasts & Episodes (Spotify)
 * - Concerts (Ticketmaster + Songkick + Bandsintown + SeatGeek, merged & deduped)
 * - Music Videos (YouTube)
 * - Artist metadata enrichment (MusicBrainz + Discogs + Last.fm)
 *
 * Every extra source is optional: each client no-ops (returns [] / null)
 * when its API key env var isn't set, so the app degrades gracefully to
 * whichever sources are actually configured.
 *
 * Results are normalized to a common MusicItem shape and optionally
 * cached in Supabase for offline access and cross-user discovery.
 */

import { searchSpotify } from './spotify';
import { searchAllConcerts } from './concerts';
import { searchMusicVideos } from './youtube';
import type { ContentType } from '@/types';

export { enrichArtist, type EnrichedArtist } from './artistMetadata';

export interface MusicItem {
  id: string;
  type: ContentType;
  name: string;
  artist_name: string;
  artist_names: string[];
  album_name?: string;
  cover_image?: string;
  preview_url?: string;
  external_url?: string;
  year?: string;
  duration_ms?: number;
  genres?: string[];
  popularity?: number;
  extra?: Record<string, any>;
}

export interface SearchOptions {
  query: string;
  types?: ContentType[];
  accessToken?: string;     // Spotify OAuth token
  limit?: number;
  location?: { lat: number; lng: number };
}

/** Unified search across all content types */
export async function searchMusic(opts: SearchOptions): Promise<MusicItem[]> {
  const { query, types = ['song', 'album', 'podcast', 'concert', 'music_video'], accessToken, limit = 8 } = opts;

  const promises: Promise<MusicItem[]>[] = [];

  if (accessToken) {
    if (types.includes('song') || types.includes('single')) {
      promises.push(searchSpotifyTracks(query, accessToken, limit));
    }
    if (types.includes('album')) {
      promises.push(searchSpotifyAlbums(query, accessToken, limit));
    }
    if (types.includes('podcast')) {
      promises.push(searchSpotifyPodcasts(query, accessToken, limit));
    }
  }

  if (types.includes('concert')) {
    promises.push(searchConcertsNormalized(query, limit, opts.location));
  }

  if (types.includes('music_video')) {
    promises.push(searchVideosNormalized(query, limit));
  }

  const results = await Promise.allSettled(promises);
  return results
    .filter((r): r is PromiseFulfilledResult<MusicItem[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

async function searchSpotifyTracks(q: string, token: string, limit: number): Promise<MusicItem[]> {
  try {
    const data = await searchSpotify(token, q, ['track'], limit);
    return (data?.tracks?.items ?? []).map((t: any) => ({
      id: t.id,
      type: 'song' as ContentType,
      name: t.name,
      artist_name: t.artists?.[0]?.name ?? '',
      artist_names: t.artists?.map((a: any) => a.name) ?? [],
      album_name: t.album?.name,
      cover_image: t.album?.images?.[0]?.url,
      preview_url: t.preview_url,
      external_url: t.external_urls?.spotify,
      year: t.album?.release_date?.slice(0, 4),
      duration_ms: t.duration_ms,
      popularity: t.popularity,
    }));
  } catch {
    return [];
  }
}

async function searchSpotifyAlbums(q: string, token: string, limit: number): Promise<MusicItem[]> {
  try {
    const data = await searchSpotify(token, q, ['album'], limit);
    return (data?.albums?.items ?? []).map((a: any) => ({
      id: a.id,
      type: 'album' as ContentType,
      name: a.name,
      artist_name: a.artists?.[0]?.name ?? '',
      artist_names: a.artists?.map((x: any) => x.name) ?? [],
      cover_image: a.images?.[0]?.url,
      external_url: a.external_urls?.spotify,
      year: a.release_date?.slice(0, 4),
      popularity: a.popularity,
      extra: { total_tracks: a.total_tracks, album_type: a.album_type },
    }));
  } catch {
    return [];
  }
}

async function searchSpotifyPodcasts(q: string, token: string, limit: number): Promise<MusicItem[]> {
  try {
    const params = new URLSearchParams({ q, type: 'show', limit: String(limit) });
    const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return (data?.shows?.items ?? []).map((s: any) => ({
      id: s.id,
      type: 'podcast' as ContentType,
      name: s.name,
      artist_name: s.publisher ?? '',
      artist_names: [s.publisher ?? ''],
      cover_image: s.images?.[0]?.url,
      external_url: s.external_urls?.spotify,
      extra: { total_episodes: s.total_episodes, description: s.description },
    }));
  } catch {
    return [];
  }
}

async function searchConcertsNormalized(
  q: string,
  limit: number,
  location?: { lat: number; lng: number },
): Promise<MusicItem[]> {
  try {
    const concerts = await searchAllConcerts({
      keyword: q,
      location,
      radiusKm: 100,
      size: limit,
    });
    return concerts.map((c) => ({
      id: c.id,
      type: 'concert' as ContentType,
      name: c.name,
      artist_name: c.artist_names[0] ?? '',
      artist_names: c.artist_names,
      cover_image: c.cover_image,
      external_url: c.ticket_url,
      year: c.date.slice(0, 4),
      genres: c.genres,
      extra: {
        venue: c.venue,
        city: c.city,
        date: c.date,
        price_min: c.price_min,
        price_max: c.price_max,
        is_sold_out: c.is_sold_out,
        latitude: c.latitude,
        longitude: c.longitude,
      },
    }));
  } catch {
    return [];
  }
}

async function searchVideosNormalized(q: string, limit: number): Promise<MusicItem[]> {
  try {
    const videos = await searchMusicVideos(q, limit);
    return videos.map((v) => ({
      id: v.id,
      type: 'music_video' as ContentType,
      name: v.name,
      artist_name: v.artist_names[0] ?? '',
      artist_names: v.artist_names,
      cover_image: v.thumbnail,
      external_url: v.youtube_url,
      duration_ms: v.duration_ms,
      extra: { view_count: v.view_count, like_count: v.like_count },
    }));
  } catch {
    return [];
  }
}

/** Fetch Spotify audio features for up to 100 track IDs */
export async function getAudioFeatures(
  trackIds: string[],
  accessToken: string,
): Promise<any[]> {
  if (!trackIds.length || !accessToken) return [];
  try {
    const ids = trackIds.slice(0, 100).join(',');
    const res = await fetch(`https://api.spotify.com/v1/audio-features?ids=${ids}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.audio_features?.filter(Boolean) ?? [];
  } catch {
    return [];
  }
}
