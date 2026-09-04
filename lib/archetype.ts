/**
 * Music taste archetypes — a personality-style label derived from the same
 * 22-dim MusicVector the real match engine (lib/ai/matchEngine.ts) scores
 * compatibility on. Each archetype is a scoring function over real vector
 * dimensions (genre mix, valence/energy/danceability/acousticness/diversity);
 * the highest-scoring archetype wins. This is a separate, explanatory layer
 * surfaced alongside the existing compatibility score — it does not touch
 * or replace the core cosine-similarity matching math in matchEngine.ts.
 */

import type { MusicVector } from './ai/tasteVector';
import { computeMatch, type MatchResult } from './ai/matchEngine';

export interface Archetype {
  id: string;
  name: string;
  description: string;
}

type Scorer = (v: MusicVector) => number;

const ARCHETYPES: (Archetype & { score: Scorer })[] = [
  {
    id: 'bailador',
    name: 'El Bailador',
    description: 'Vive para el ritmo — energía alta y todo lo que se pueda bailar.',
    score: (v) => v.danceability + v.energy,
  },
  {
    id: 'nostalgico',
    name: 'El Nostálgico',
    description: 'Prefiere lo acústico y las canciones que se sienten como recuerdos.',
    score: (v) => v.acousticness * 1.4 + (1 - v.energy) * 0.6,
  },
  {
    id: 'explorador',
    name: 'El Explorador',
    description: 'Nunca se queda en un solo sonido — siempre busca algo nuevo.',
    score: (v) => v.diversity * 2.2,
  },
  {
    id: 'intimo',
    name: 'El Íntimo',
    description: 'Música tranquila y feliz, para momentos de calma.',
    score: (v) => v.valence * 1.1 + (1 - v.energy) * 0.7,
  },
  {
    id: 'melancolico',
    name: 'El Melancólico',
    description: 'Vibes profundos — le encuentra belleza a lo triste.',
    score: (v) => (1 - v.valence) * 1.4,
  },
  {
    id: 'regional',
    name: 'El Regional',
    description: 'Corridos, banda y todo lo que suena a México.',
    score: (v) => v.genre_latin * 2.2,
  },
  {
    id: 'rockero',
    name: 'El Rockero',
    description: 'Guitarras, actitud, y rock en cualquiera de sus formas.',
    score: (v) => v.genre_rock * 2.2,
  },
  {
    id: 'urbano',
    name: 'El Urbano',
    description: 'Hip-hop, trap y todo lo que suena a la calle.',
    score: (v) => v.genre_hip_hop * 2.2,
  },
  {
    id: 'eclectico',
    name: 'El Ecléctico',
    description: 'No se define por un solo género — su playlist tiene de todo.',
    score: () => 0.6, // fallback baseline — wins only when nothing else stands out
  },
];

export function computeArchetype(vector: MusicVector): Archetype {
  let best: Archetype = ARCHETYPES[ARCHETYPES.length - 1];
  let bestScore = -Infinity;
  for (const a of ARCHETYPES) {
    const s = a.score(vector);
    if (s > bestScore) {
      bestScore = s;
      best = a;
    }
  }
  return { id: best.id, name: best.name, description: best.description };
}

export interface MatchWithArchetype extends MatchResult {
  archetypeA: Archetype;
  archetypeB: Archetype;
  sameArchetype: boolean;
}

/** Wraps the real matchEngine.ts computeMatch() with archetype context. */
export function computeMatchWithArchetype(a: MusicVector, b: MusicVector): MatchWithArchetype {
  const match = computeMatch(a, b);
  const archetypeA = computeArchetype(a);
  const archetypeB = computeArchetype(b);
  return { ...match, archetypeA, archetypeB, sameArchetype: archetypeA.id === archetypeB.id };
}
