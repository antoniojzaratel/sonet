// Pure scoring heuristic for the Perfect Lineup game — deliberately simple
// and legible (not real ML), so the breakdown shown to the player actually
// explains the number. Three weighted components, each 0-100:
//
//   headlinerStrength (25%) — how big a draw the chosen headliner is.
//   genreCohesion     (40%) — do the support acts fit the headliner's genre
//                             family? A lineup of unrelated genres reads as
//                             incoherent, which real festival-goers punish.
//   popularityBalance (35%) — support acts should trail the headliner in a
//                             believable gradient: enough to feel like a
//                             real undercard, not so close they'd upstage
//                             the headliner, not so far below they'd look
//                             like filler.
import type { LineupArtist } from './lineupPool';

export interface LineupChoice {
  headliner: LineupArtist;
  support: LineupArtist[];
}

export interface LineupScoreBreakdown {
  total: number;
  headlinerStrength: number;
  genreCohesion: number;
  popularityBalance: number;
}

// Genres in the same family score a partial-credit match even when not
// identical — e.g. Corridos and Urbano both draw a similar Latin-leaning
// crowd, so pairing them isn't as incoherent as Rock + Corridos.
const GENRE_FAMILIES: Record<string, string[]> = {
  Corridos: ['Corridos', 'Urbano'],
  Urbano: ['Urbano', 'Corridos', 'Pop'],
  Rock: ['Rock'],
  Pop: ['Pop', 'Urbano'],
};

function genrePairScore(a: string, b: string): number {
  if (a === b) return 100;
  if (GENRE_FAMILIES[a]?.includes(b)) return 55;
  return 15;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function computeGenreCohesion(headliner: LineupArtist, support: LineupArtist[]): number {
  if (support.length === 0) return 0;
  const scores = support.map((s) => genrePairScore(headliner.genre, s.genre));
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

/**
 * Each support act is scored against an ideal gap below the headliner
 * (10-45 popularity points lower is the sweet spot: a believable undercard).
 * Upstaging the headliner (gap <= 0) is penalized hard; a gap so large the
 * act reads as filler (> 60) is penalized more gently.
 */
function computePopularityBalance(headliner: LineupArtist, support: LineupArtist[]): number {
  if (support.length === 0) return 0;
  const scores = support.map((s) => {
    const gap = headliner.popularity - s.popularity;
    if (gap <= 0) return clamp(50 + gap * 4, 0, 40); // upstaging: steep penalty
    if (gap <= 10) return 60 + gap * 2; // close but still believable
    if (gap <= 45) return 100 - (gap - 10) * 0.3; // sweet spot, gently decreasing
    return clamp(90 - (gap - 45) * 1.5, 10, 100); // too far below — reads as filler
  });
  return Math.round(clamp(scores.reduce((sum, s) => sum + s, 0) / scores.length, 0, 100));
}

export function scoreLineup(choice: LineupChoice): LineupScoreBreakdown {
  const headlinerStrength = clamp(choice.headliner.popularity, 0, 100);
  const genreCohesion = computeGenreCohesion(choice.headliner, choice.support);
  const popularityBalance = computePopularityBalance(choice.headliner, choice.support);

  const total = Math.round(headlinerStrength * 0.25 + genreCohesion * 0.4 + popularityBalance * 0.35);

  return { total: clamp(total, 0, 100), headlinerStrength, genreCohesion, popularityBalance };
}
