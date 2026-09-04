// Curated song pool + Spotify resolution for the "Worldwide Race" game —
// one song per day, same for everyone. Deterministic seeding follows the
// same pattern as lib/dailyGame.ts and lib/hitsterDeck.ts; resolution
// against real Spotify data follows lib/hitsterDeck.ts's buildHitsterDeck
// (only the FIRST client to load a given date actually resolves it — the
// result gets upserted into race_puzzles with ignoreDuplicates, so every
// other client just reads that same row and hears the same audio).

import { searchMusic } from './musicDB';

export interface RaceSeed {
  name: string;
  artist: string;
}

export const RACE_POOL: RaceSeed[] = [
  { name: 'La Bebé', artist: 'Yng Lvcas & Peso Pluma' },
  { name: 'Tití Me Preguntó', artist: 'Bad Bunny' },
  { name: 'R U Mine?', artist: 'Arctic Monkeys' },
  { name: 'Eres', artist: 'Café Tacvba' },
  { name: 'Ojitos Lindos', artist: 'Bad Bunny ft. Bomba Estéreo' },
  { name: 'La Forma en que Me Quieres', artist: 'Carin León' },
  { name: 'Blinding Lights', artist: 'The Weeknd' },
  { name: 'Natalie', artist: 'Bruno Mars' },
  { name: 'Quevedo: Bzrp Music Sessions, Vol. 52', artist: 'Bizarrap' },
  { name: 'La Negra Tomasa', artist: 'Caifanes' },
  { name: 'Creep', artist: 'Radiohead' },
  { name: 'Everlong', artist: 'Foo Fighters' },
];

function dayOfYear(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

/** Every client picks the same song for the same date. */
export function raceSeedForDate(dateStr: string): RaceSeed {
  const index = dayOfYear(dateStr) % RACE_POOL.length;
  return RACE_POOL[index];
}

export interface ResolvedRace {
  trackId: string;
  answerName: string;
  previewUrl: string | null;
  coverImage?: string;
}

export async function resolveRaceSeed(seed: RaceSeed, accessToken?: string | null): Promise<ResolvedRace> {
  if (accessToken) {
    try {
      const results = await searchMusic({
        query: `${seed.name} ${seed.artist}`,
        types: ['song'],
        accessToken,
        limit: 1,
      });
      const hit = results[0];
      if (hit) {
        return {
          trackId: hit.id,
          answerName: seed.name,
          previewUrl: hit.preview_url ?? null,
          coverImage: hit.cover_image,
        };
      }
    } catch {
      // fall through to the seed-only card below
    }
  }
  return {
    trackId: `seed-${seed.name}-${seed.artist}`,
    answerName: seed.name,
    previewUrl: null,
  };
}
