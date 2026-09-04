// Curated artist pool for the daily "Perfect Lineup" game. Same
// deterministic-per-date approach as lib/dailyGame.ts and lib/hitsterDeck.ts:
// every client derives the identical candidate set for a given day without a
// cron job — see stores/lineupStore.ts, which upserts the result into
// lineup_challenges (ON CONFLICT DO NOTHING) the first time any client loads
// that date.

export interface LineupArtist {
  name: string;
  genre: string;
  popularity: number; // 0-100, rough "how big a draw" proxy
}

// `genre` values are grouped into families in lib/lineupScore.ts — keep new
// entries using one of the family labels there (or extend both together).
export const LINEUP_POOL: LineupArtist[] = [
  { name: 'Peso Pluma', genre: 'Corridos', popularity: 96 },
  { name: 'Carin León', genre: 'Corridos', popularity: 88 },
  { name: 'Junior H', genre: 'Corridos', popularity: 82 },
  { name: 'Fuerza Regida', genre: 'Corridos', popularity: 79 },
  { name: 'Grupo Frontera', genre: 'Corridos', popularity: 74 },
  { name: 'Bad Bunny', genre: 'Urbano', popularity: 99 },
  { name: 'Feid', genre: 'Urbano', popularity: 80 },
  { name: 'Karol G', genre: 'Urbano', popularity: 91 },
  { name: 'Rauw Alejandro', genre: 'Urbano', popularity: 78 },
  { name: 'Bizarrap', genre: 'Urbano', popularity: 85 },
  { name: 'Zoé', genre: 'Rock', popularity: 75 },
  { name: 'Caifanes', genre: 'Rock', popularity: 68 },
  { name: 'Café Tacvba', genre: 'Rock', popularity: 66 },
  { name: 'Arctic Monkeys', genre: 'Rock', popularity: 84 },
  { name: 'Radiohead', genre: 'Rock', popularity: 77 },
  { name: 'Foo Fighters', genre: 'Rock', popularity: 79 },
  { name: 'Bruno Mars', genre: 'Pop', popularity: 92 },
  { name: 'The Weeknd', genre: 'Pop', popularity: 94 },
  { name: 'Natalia Lafourcade', genre: 'Pop', popularity: 62 },
  { name: 'Kali Uchis', genre: 'Pop', popularity: 71 },
];

function dayOfYear(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

/** Deterministic per-date shuffle (Fisher-Yates seeded by a simple LCG). */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  const next = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Every client computes the same ~12-artist candidate set for the same date. */
export function candidatesForDate(dateStr: string, size = 12): LineupArtist[] {
  const seed = dayOfYear(dateStr) + new Date(`${dateStr}T00:00:00Z`).getUTCFullYear();
  return seededShuffle(LINEUP_POOL, seed).slice(0, Math.min(size, LINEUP_POOL.length));
}
