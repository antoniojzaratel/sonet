// Real Stats.fm/Wrapped-style listening stats — sourced from Spotify's own
// top-artists/top-tracks aggregation (their `time_range` param IS the "last
// 4 weeks / 6 months / all time" breakdown Wrapped-style apps are built on;
// no separate scrobbling service needed for that part). What we can't
// honestly claim is a lifetime "minutes listened" total — Spotify doesn't
// expose that retroactively — so this surfaces top artists/tracks/genres
// and audio-feature averages per range, plus real in-app activity from
// `listening_history` (which this app *does* control end to end).

import { supabase } from './supabase';
import { fetchTopArtists, fetchTopTracks, fetchRecentlyPlayed, extractGenresFromArtists, mapGenresToCategories, type Artist, type Track } from './spotify';
import { getAudioFeatures } from './musicDB';
import { DEMO_USER_ID } from './demoContent';

export type StatsRange = 'short_term' | 'medium_term' | 'long_term';

export const RANGE_LABEL: Record<StatsRange, string> = {
  short_term: '4 semanas',
  medium_term: '6 meses',
  long_term: 'Siempre',
};

export interface RangeStats {
  topArtists: { id: string; name: string; image?: string; popularity: number; genres: string[] }[];
  topTracks: { id: string; name: string; artist: string; image?: string; popularity: number }[];
  genres: { label: string; value: number; color: string }[];
  audioDna: { energy: number; danceability: number; valence: number; avgBpm: number };
}

async function fetchRangeStats(token: string, range: StatsRange): Promise<RangeStats> {
  const [artistsRes, tracksRes] = await Promise.all([
    fetchTopArtists(token, range, 20),
    fetchTopTracks(token, range, 20),
  ]);

  const artists: Artist[] = artistsRes?.items ?? [];
  const tracks: Track[] = tracksRes?.items ?? [];

  const genreCounts = extractGenresFromArtists(artists);
  const genres = mapGenresToCategories(genreCounts);

  const trackIds = tracks.slice(0, 20).map((t) => t.id);
  const features = await getAudioFeatures(trackIds, token);
  const avg = (key: string) =>
    features.length ? features.reduce((s, f) => s + (f[key] ?? 0), 0) / features.length : 0;

  return {
    topArtists: artists.slice(0, 10).map((a) => ({
      id: a.id,
      name: a.name,
      image: a.images?.[0]?.url,
      popularity: a.popularity,
      genres: a.genres ?? [],
    })),
    topTracks: tracks.slice(0, 10).map((t) => ({
      id: t.id,
      name: t.name,
      artist: t.artists?.[0]?.name ?? '',
      image: t.album?.images?.[0]?.url,
      popularity: t.popularity,
    })),
    genres,
    audioDna: {
      energy: Math.round(avg('energy') * 100),
      danceability: Math.round(avg('danceability') * 100),
      valence: Math.round(avg('valence') * 100),
      avgBpm: Math.round(avg('tempo')),
    },
  };
}

/**
 * Pulls all three Spotify time ranges, upserts the medium_term slice into
 * `music_profiles` (top_genres/top_artists/avg_bpm/energy_level/
 * danceability/valence — real columns that have sat unused since the
 * schema was written), and appends genuinely new recently-played tracks
 * into `listening_history` (deduped against the latest row already there,
 * since the table has no unique constraint to lean on).
 */
export async function syncListeningStats(
  userId: string,
  token: string
): Promise<Record<StatsRange, RangeStats>> {
  const [short, medium, long] = await Promise.all([
    fetchRangeStats(token, 'short_term'),
    fetchRangeStats(token, 'medium_term'),
    fetchRangeStats(token, 'long_term'),
  ]);

  // Demo account has no real backend to persist into — the Spotify fetch
  // above is real either way, this just skips the save-to-Supabase half.
  if (userId === DEMO_USER_ID) {
    return { short_term: short, medium_term: medium, long_term: long };
  }

  try {
    await syncToSupabase(userId, token, medium);
  } catch {
    // Persisting is a nice-to-have — the fetched stats still render either way.
  }

  return { short_term: short, medium_term: medium, long_term: long };
}

async function syncToSupabase(userId: string, token: string, medium: RangeStats): Promise<void> {
  await supabase.from('music_profiles').upsert({
    user_id: userId,
    top_genres: medium.genres,
    top_artists: medium.topArtists.map((a) => ({ id: a.id, name: a.name, image_url: a.image, play_count: 0 })),
    avg_bpm: medium.audioDna.avgBpm,
    energy_level: medium.audioDna.energy / 100,
    danceability: medium.audioDna.danceability / 100,
    valence: medium.audioDna.valence / 100,
    spotify_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const { data: latest } = await supabase
    .from('listening_history')
    .select('played_at')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const cutoff = latest?.played_at ? new Date(latest.played_at).getTime() : 0;
  const recent = await fetchRecentlyPlayed(token, 50);
  const newPlays = (recent?.items ?? []).filter((item) => new Date(item.played_at).getTime() > cutoff);

  if (newPlays.length > 0) {
    await supabase.from('listening_history').insert(
      newPlays.map((item) => ({
        user_id: userId,
        track_id: item.track.id,
        track_name: item.track.name,
        artist_name: item.track.artists?.[0]?.name ?? '',
        played_at: item.played_at,
        ms_played: item.track.duration_ms,
        source: 'spotify',
      }))
    );
  }
}

export interface InAppActivity {
  totalPlays: number;
  distinctTracks: number;
  minutesListened: number;
}

const EMPTY_ACTIVITY: InAppActivity = { totalPlays: 0, distinctTracks: 0, minutesListened: 0 };

/** Real, honest activity from what this app itself has recorded playing. */
export async function fetchInAppActivity(userId: string): Promise<InAppActivity> {
  if (userId === DEMO_USER_ID) return EMPTY_ACTIVITY;

  let data: { track_id: string; ms_played: number | null }[] | null = null;
  try {
    ({ data } = await supabase.from('listening_history').select('track_id, ms_played').eq('user_id', userId));
  } catch {
    return EMPTY_ACTIVITY;
  }

  const rows = data ?? [];
  const distinctTracks = new Set(rows.map((r) => r.track_id)).size;
  const totalMs = rows.reduce((s, r) => s + (r.ms_played ?? 0), 0);

  return {
    totalPlays: rows.length,
    distinctTracks,
    minutesListened: Math.round(totalMs / 60000),
  };
}
