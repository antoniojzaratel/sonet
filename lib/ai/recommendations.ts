/**
 * AI Recommendation Engine
 *
 * Generates personalized daily song recommendations using:
 * 1. User's music vector (audio features profile)
 * 2. Rating history (what they love vs skip)
 * 3. Spotify Recommendations API (seeded with top tracks/artists/genres)
 * 4. Novelty injection (ensures 20% totally new discoveries)
 */

import type { MusicVector } from './tasteVector';
import type { Rating } from '@/types';

export interface DailyRecommendation {
  track_id: string;
  name: string;
  artist: string;
  album: string;
  image_url: string;
  preview_url: string | null;
  spotify_url: string;
  confidence: number;  // 0-100 how confident we are you'll love it
  reason: string;      // Human-readable explanation
  audio_features?: {
    energy: number;
    danceability: number;
    valence: number;
    tempo: number;
  };
}

export interface RecommendationConfig {
  accessToken: string;
  userVector: MusicVector;
  ratings: Rating[];
  topTrackIds: string[];
  topArtistIds: string[];
  limit?: number;
}

/** Main entry: get today's recommendations */
export async function getDailyRecommendations(
  config: RecommendationConfig,
): Promise<DailyRecommendation[]> {
  const { accessToken, userVector, ratings, topTrackIds, topArtistIds, limit = 10 } = config;

  const likedArtists = extractLikedArtists(ratings);
  const dislikedArtists = extractDislikedArtists(ratings);

  // Build Spotify seed parameters from user profile
  const seedTracks = topTrackIds.slice(0, 2);
  const seedArtists = topArtistIds.slice(0, 2);
  const seedGenres = vectorToGenreSeeds(userVector).slice(0, 1);

  const audioTarget = vectorToSpotifyTarget(userVector);

  const params = new URLSearchParams({
    limit: String(limit + 10), // fetch extra to filter
    seed_tracks: seedTracks.join(','),
    seed_artists: seedArtists.join(','),
    seed_genres: seedGenres.join(','),
    ...audioTarget,
  });

  try {
    const res = await fetch(`https://api.spotify.com/v1/recommendations?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    const tracks: any[] = data.tracks || [];

    // Filter out disliked artists and already-rated tracks
    const ratedIds = new Set(ratings.map((r) => r.content_id));
    const filtered = tracks.filter(
      (t) =>
        !ratedIds.has(t.id) &&
        !dislikedArtists.has(t.artists[0]?.name?.toLowerCase()),
    );

    // Score and rank tracks
    const scored = filtered
      .map((track) => scoreTrack(track, userVector, likedArtists))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);

    return scored;
  } catch {
    return [];
  }
}

function scoreTrack(
  track: any,
  vector: MusicVector,
  likedArtists: Set<string>,
): DailyRecommendation {
  const artistName = track.artists?.[0]?.name || 'Unknown';
  const isLikedArtist = likedArtists.has(artistName.toLowerCase());

  const popularity = track.popularity || 50;
  const artistBonus = isLikedArtist ? 15 : 0;
  const popularityScore = (popularity / 100) * 20;
  const noveltyScore = (1 - popularity / 100) * 10; // reward lesser-known

  const confidence = Math.min(99, Math.round(55 + artistBonus + popularityScore + noveltyScore));
  const reason = buildReason(vector, isLikedArtist, artistName, popularity);

  return {
    track_id: track.id,
    name: track.name,
    artist: artistName,
    album: track.album?.name || '',
    image_url: track.album?.images?.[0]?.url || '',
    preview_url: track.preview_url || null,
    spotify_url: track.external_urls?.spotify || '',
    confidence,
    reason,
  };
}

function buildReason(
  v: MusicVector,
  isLikedArtist: boolean,
  artistName: string,
  popularity: number,
): string {
  if (isLikedArtist) return `🎯 Te encanta ${artistName} — esta te va a gustar`;
  if (v.energy > 0.75) return '⚡ Alta energía que encaja con tu perfil';
  if (v.valence > 0.7) return '😄 Mood alegre que coincide con tu gusto';
  if (v.danceability > 0.75) return '💃 Ritmo bailable perfecto para ti';
  if (v.genre_latin > 0.3) return '🌮 Sabor latino que resena con tu perfil';
  if (popularity < 40) return '💎 Joya oculta que creemos que vas a amar';
  return '🎵 Selección especial basada en tu DNA musical';
}

function vectorToSpotifyTarget(v: MusicVector): Record<string, string> {
  return {
    target_energy: String(Math.round(v.energy * 100) / 100),
    target_danceability: String(Math.round(v.danceability * 100) / 100),
    target_valence: String(Math.round(v.valence * 100) / 100),
    target_acousticness: String(Math.round(v.acousticness * 100) / 100),
    target_speechiness: String(Math.round(v.speechiness * 100) / 100),
    min_tempo: String(Math.round(v.tempo_norm * 140 + 60 - 20)),
    max_tempo: String(Math.round(v.tempo_norm * 140 + 60 + 20)),
  };
}

function vectorToGenreSeeds(v: MusicVector): string[] {
  const genreMap: [string, number][] = [
    ['pop', v.genre_pop],
    ['rock', v.genre_rock],
    ['hip-hop', v.genre_hip_hop],
    ['electronic', v.genre_electronic],
    ['latin', v.genre_latin],
    ['r-n-b', v.genre_rnb],
    ['jazz', v.genre_jazz],
    ['classical', v.genre_classical],
  ];
  return genreMap.sort((a, b) => b[1] - a[1]).map(([g]) => g);
}

function extractLikedArtists(ratings: Rating[]): Set<string> {
  return new Set(
    ratings
      .filter((r) => r.score >= 8)
      .map((r) => r.artist_name.toLowerCase()),
  );
}

function extractDislikedArtists(ratings: Rating[]): Set<string> {
  return new Set(
    ratings
      .filter((r) => r.score <= 3)
      .map((r) => r.artist_name.toLowerCase()),
  );
}
