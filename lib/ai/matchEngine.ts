/**
 * SVM-Inspired Music Taste Match Engine
 *
 * Uses cosine similarity on weighted feature vectors to compute
 * compatibility between users. The weight matrix approximates a
 * linear SVM trained on "compatible pair" vs "incompatible pair" labels.
 *
 * Match score: 0-100
 * Breakdown: audio_similarity (40%) + genre_overlap (35%) + behavior (25%)
 */

import type { MusicVector, FeatureArray } from './tasteVector';
import { vectorToArray, applyWeights, FEATURE_WEIGHTS } from './tasteVector';

export interface MatchResult {
  score: number;            // 0-100 overall compatibility
  audio_score: number;      // 0-100 audio features similarity
  genre_score: number;      // 0-100 genre overlap
  behavior_score: number;   // 0-100 behavior/taste alignment
  shared_traits: string[];  // Human-readable shared features
  contrast_traits: string[]; // Where they differ
  label: CompatibilityLabel;
  description: string;
}

export type CompatibilityLabel =
  | 'Soul Twin'       // 90-100
  | 'Frequency Match' // 80-89
  | 'Vibes Match'     // 70-79
  | 'Groove Partner'  // 60-69
  | 'Music Buddy'     // 50-59
  | 'Different Vibes' // 0-49

/** Main matching function — call this to get compatibility between two users */
export function computeMatch(a: MusicVector, b: MusicVector): MatchResult {
  const aArr = vectorToArray(a);
  const bArr = vectorToArray(b);

  // Audio features: dims 0-8
  const audio_score = cosineSimilarity(aArr.slice(0, 9), bArr.slice(0, 9)) * 100;

  // Genre overlap: dims 9-17
  const genre_score = computeGenreOverlap(aArr.slice(9, 18), bArr.slice(9, 18)) * 100;

  // Behavior: dims 18-22
  const behavior_score = cosineSimilarity(aArr.slice(18), bArr.slice(18)) * 100;

  // Weighted composite using SVM-inspired kernel
  const weighted_a = applyWeights(aArr);
  const weighted_b = applyWeights(bArr);
  const raw_score = cosineSimilarity(weighted_a, weighted_b);

  // Map from [0,1] cosine range to [0,100] with non-linear amplification
  const score = Math.round(sigmoidScale(raw_score) * 100);

  const shared_traits = extractSharedTraits(a, b);
  const contrast_traits = extractContrastTraits(a, b);

  return {
    score,
    audio_score: Math.round(audio_score),
    genre_score: Math.round(genre_score),
    behavior_score: Math.round(behavior_score),
    shared_traits,
    contrast_traits,
    label: scoreToLabel(score),
    description: buildDescription(score, shared_traits),
  };
}

function cosineSimilarity(a: FeatureArray, b: FeatureArray): number {
  if (!a.length || !b.length) return 0;
  const dot = a.reduce((s, ai, i) => s + ai * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((s, ai) => s + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((s, bi) => s + bi * bi, 0));
  return magA && magB ? Math.max(0, dot / (magA * magB)) : 0;
}

function computeGenreOverlap(a: FeatureArray, b: FeatureArray): number {
  // Jaccard-like overlap on genre distributions
  const intersection = a.reduce((s, ai, i) => s + Math.min(ai, b[i] ?? 0), 0);
  const union = a.reduce((s, ai, i) => s + Math.max(ai, b[i] ?? 0), 0);
  return union > 0 ? intersection / union : 0;
}

function sigmoidScale(x: number): number {
  // Maps cosine similarity (mostly 0.5-1.0 for non-random music) → 0-1
  const centered = (x - 0.5) * 8;
  return 1 / (1 + Math.exp(-centered));
}

function scoreToLabel(score: number): CompatibilityLabel {
  if (score >= 90) return 'Soul Twin';
  if (score >= 80) return 'Frequency Match';
  if (score >= 70) return 'Vibes Match';
  if (score >= 60) return 'Groove Partner';
  if (score >= 50) return 'Music Buddy';
  return 'Different Vibes';
}

function extractSharedTraits(a: MusicVector, b: MusicVector): string[] {
  const traits: string[] = [];
  if (Math.abs(a.energy - b.energy) < 0.15) {
    traits.push(a.energy > 0.7 ? '⚡ Mucha energía' : '😌 Música relajada');
  }
  if (Math.abs(a.valence - b.valence) < 0.15) {
    traits.push(a.valence > 0.6 ? '😄 Música alegre' : '🌧 Vibes melancólicos');
  }
  if (Math.abs(a.danceability - b.danceability) < 0.15 && a.danceability > 0.6) {
    traits.push('💃 Ambos mueven el cuerpo');
  }
  if (Math.abs(a.tempo_norm - b.tempo_norm) < 0.2) {
    const bpm = Math.round(a.tempo_norm * 140 + 60);
    traits.push(`🥁 BPM similares (~${bpm})`);
  }
  if (a.genre_latin > 0.2 && b.genre_latin > 0.2) traits.push('🌮 Amor por el género latino');
  if (a.genre_rock > 0.2 && b.genre_rock > 0.2) traits.push('🎸 Rock en común');
  if (a.genre_hip_hop > 0.2 && b.genre_hip_hop > 0.2) traits.push('🎤 Hip-hop heads');
  if (a.genre_electronic > 0.2 && b.genre_electronic > 0.2) traits.push('🎛️ Electronic lovers');
  if (Math.abs(a.acousticness - b.acousticness) < 0.15 && a.acousticness > 0.5) {
    traits.push('🎻 Prefieren lo acústico');
  }
  return traits.slice(0, 4);
}

function extractContrastTraits(a: MusicVector, b: MusicVector): string[] {
  const diffs: { label: string; diff: number }[] = [
    { label: '⚡ Energía', diff: Math.abs(a.energy - b.energy) },
    { label: '😊 Mood', diff: Math.abs(a.valence - b.valence) },
    { label: '💃 Bailabilidad', diff: Math.abs(a.danceability - b.danceability) },
    { label: '🎸 Rock vs Pop', diff: Math.abs(a.genre_rock - b.genre_rock) },
    { label: '🔊 Volumen', diff: Math.abs(a.loudness_norm - b.loudness_norm) },
  ];
  return diffs
    .filter((d) => d.diff > 0.3)
    .sort((x, y) => y.diff - x.diff)
    .slice(0, 2)
    .map((d) => d.label);
}

function buildDescription(score: number, traits: string[]): string {
  if (score >= 90) return `¡Match perfecto! Comparten ${traits.length} características musicales idénticas. Definitivamente van al mismo concierto.`;
  if (score >= 80) return `Alta compatibilidad. Su DNA musical resuena en frecuencias muy similares.`;
  if (score >= 70) return `Buen match. Sus gustos se complementan muy bien — muchas cosas en común.`;
  if (score >= 60) return `Match decente. Descubran música nueva juntos — hay química para explorar.`;
  if (score >= 50) return `Algunos gustos en común. Podrían sorprenderse mutuamente.`;
  return `Gustos muy diferentes — pero los opuestos a veces se atraen 😏`;
}

/** Rank a list of candidates against a target user */
export function rankMatches(
  target: MusicVector,
  candidates: { userId: string; vector: MusicVector }[],
): { userId: string; match: MatchResult }[] {
  return candidates
    .map((c) => ({ userId: c.userId, match: computeMatch(target, c.vector) }))
    .sort((a, b) => b.match.score - a.match.score);
}
