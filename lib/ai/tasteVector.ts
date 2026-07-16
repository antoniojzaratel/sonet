/**
 * Music Taste Vectorization
 *
 * Converts a user's listening history and ratings into a normalized
 * 22-dimensional feature vector used for AI matching and recommendations.
 *
 * Dimensions:
 *   [0-8]   Spotify audio features (energy, danceability, valence, acousticness,
 *           instrumentalness, speechiness, tempo_norm, loudness_norm, liveness)
 *   [9-16]  Genre weights (pop, rock, hip_hop, electronic, latin, rnb, jazz, other)
 *   [17]    Avg rating quality (how picky the user is)
 *   [18]    BPM preference group (slow/mid/fast → 0/0.5/1)
 *   [19]    Vocal vs instrumental preference
 *   [20]    Mood index (sad→happy)
 *   [21]    Diversity score (how varied the taste is)
 */

import type { Rating } from '@/types';

export interface MusicVector {
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  tempo_norm: number;
  loudness_norm: number;
  liveness: number;
  genre_pop: number;
  genre_rock: number;
  genre_hip_hop: number;
  genre_electronic: number;
  genre_latin: number;
  genre_rnb: number;
  genre_jazz: number;
  genre_classical: number;
  genre_other: number;
  avg_rating_norm: number;
  bpm_preference: number;
  vocal_preference: number;
  mood_index: number;
  diversity: number;
}

export type FeatureArray = number[];

// SVM-inspired feature importance weights — higher = more discriminating for taste
export const FEATURE_WEIGHTS: Record<keyof MusicVector, number> = {
  energy:           1.6,
  danceability:     1.4,
  valence:          2.0,  // mood is the strongest compatibility signal
  acousticness:     1.3,
  instrumentalness: 0.9,
  speechiness:      1.1,
  tempo_norm:       1.5,
  loudness_norm:    0.8,
  liveness:         0.6,
  genre_pop:        1.2,
  genre_rock:       1.5,
  genre_hip_hop:    1.5,
  genre_electronic: 1.4,
  genre_latin:      1.6,
  genre_rnb:        1.3,
  genre_jazz:       1.0,
  genre_classical:  1.1,
  genre_other:      0.5,
  avg_rating_norm:  0.7,
  bpm_preference:   1.4,
  vocal_preference: 1.0,
  mood_index:       1.8,
  diversity:        0.4,
};

export function vectorToArray(v: MusicVector): FeatureArray {
  return Object.values(v);
}

export function applyWeights(arr: FeatureArray, weights = FEATURE_WEIGHTS): FeatureArray {
  const keys = Object.keys(FEATURE_WEIGHTS) as (keyof MusicVector)[];
  return arr.map((val, i) => val * (weights[keys[i]] ?? 1));
}

/** Build a feature vector from Spotify top tracks audio features */
export function buildVectorFromSpotify(
  audioFeatures: SpotifyAudioFeature[],
  topArtists: SpotifyArtist[],
): MusicVector {
  if (!audioFeatures.length) return defaultVector();

  const avg = (key: keyof SpotifyAudioFeature): number =>
    audioFeatures.reduce((s, f) => s + (f[key] as number || 0), 0) / audioFeatures.length;

  const tempos = audioFeatures.map((f) => f.tempo);
  const avgTempo = tempos.reduce((s, t) => s + t, 0) / tempos.length;

  // Genre extraction from top artists
  const genreCount: Record<string, number> = {};
  topArtists.forEach((a) => {
    a.genres.forEach((g) => {
      const key = classifyGenre(g);
      genreCount[key] = (genreCount[key] || 0) + 1;
    });
  });
  const totalGenres = Object.values(genreCount).reduce((s, v) => s + v, 0) || 1;

  const energyAvg = avg('energy');
  const valenceAvg = avg('valence');

  return {
    energy:           clamp(avg('energy')),
    danceability:     clamp(avg('danceability')),
    valence:          clamp(valenceAvg),
    acousticness:     clamp(avg('acousticness')),
    instrumentalness: clamp(avg('instrumentalness')),
    speechiness:      clamp(avg('speechiness')),
    tempo_norm:       clamp((avgTempo - 60) / 140),
    loudness_norm:    clamp((avg('loudness') + 60) / 60),
    liveness:         clamp(avg('liveness')),
    genre_pop:        clamp((genreCount['pop'] || 0) / totalGenres),
    genre_rock:       clamp((genreCount['rock'] || 0) / totalGenres),
    genre_hip_hop:    clamp((genreCount['hip_hop'] || 0) / totalGenres),
    genre_electronic: clamp((genreCount['electronic'] || 0) / totalGenres),
    genre_latin:      clamp((genreCount['latin'] || 0) / totalGenres),
    genre_rnb:        clamp((genreCount['rnb'] || 0) / totalGenres),
    genre_jazz:       clamp((genreCount['jazz'] || 0) / totalGenres),
    genre_classical:  clamp((genreCount['classical'] || 0) / totalGenres),
    genre_other:      clamp((genreCount['other'] || 0) / totalGenres),
    avg_rating_norm:  0.5,
    bpm_preference:   avgTempo < 100 ? 0 : avgTempo < 140 ? 0.5 : 1,
    vocal_preference: clamp(1 - avg('instrumentalness')),
    mood_index:       clamp((energyAvg + valenceAvg) / 2),
    diversity:        computeDiversity(audioFeatures),
  };
}

/** Augment vector with user ratings data */
export function augmentWithRatings(vector: MusicVector, ratings: Rating[]): MusicVector {
  if (!ratings.length) return vector;
  const avgScore = ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
  return {
    ...vector,
    avg_rating_norm: clamp((avgScore - 1) / 9),
  };
}

function computeDiversity(features: SpotifyAudioFeature[]): number {
  if (features.length < 2) return 0;
  const energies = features.map((f) => f.energy);
  const mean = energies.reduce((s, e) => s + e, 0) / energies.length;
  const variance = energies.reduce((s, e) => s + Math.pow(e - mean, 2), 0) / energies.length;
  return clamp(Math.sqrt(variance) * 3);
}

function classifyGenre(genre: string): string {
  const g = genre.toLowerCase();
  if (/pop|indie pop|synth/.test(g)) return 'pop';
  if (/rock|metal|punk|grunge|alternative/.test(g)) return 'rock';
  if (/hip.?hop|rap|trap|drill/.test(g)) return 'hip_hop';
  if (/electronic|house|techno|edm|dance|dubstep|trance/.test(g)) return 'electronic';
  if (/latin|reggaeton|salsa|cumbia|banda|corrido|bachata/.test(g)) return 'latin';
  if (/r&b|rnb|soul|neo soul/.test(g)) return 'rnb';
  if (/jazz|blues|swing|bebop/.test(g)) return 'jazz';
  if (/classical|orchestra|opera|piano|symphony/.test(g)) return 'classical';
  return 'other';
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, isFinite(v) ? v : 0));
}

function defaultVector(): MusicVector {
  return {
    energy: 0.5, danceability: 0.5, valence: 0.5, acousticness: 0.3,
    instrumentalness: 0.1, speechiness: 0.1, tempo_norm: 0.5, loudness_norm: 0.5,
    liveness: 0.2, genre_pop: 0.2, genre_rock: 0.15, genre_hip_hop: 0.15,
    genre_electronic: 0.1, genre_latin: 0.1, genre_rnb: 0.1, genre_jazz: 0.05,
    genre_classical: 0.05, genre_other: 0.1, avg_rating_norm: 0.6,
    bpm_preference: 0.5, vocal_preference: 0.8, mood_index: 0.5, diversity: 0.3,
  };
}

// Spotify API types
export interface SpotifyAudioFeature {
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  tempo: number;
  loudness: number;
  liveness: number;
  key: number;
  mode: number;
  time_signature: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  images: { url: string }[];
}
