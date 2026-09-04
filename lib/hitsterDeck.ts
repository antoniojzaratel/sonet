// Curated fallback deck for Hitster — used when the host has no Spotify
// token (or a search misses) to resolve real Spotify metadata. Same
// Latin/regional-Mexican-leaning taste as lib/dailyGame.ts and
// lib/mockData.ts, spanning multiple decades so the timeline game is
// actually interesting to play.

import { searchMusic } from './musicDB';

export interface DeckSeed {
  name: string;
  artist: string;
  year: number;
}

export interface DeckCard {
  track_id: string;
  name: string;
  artist: string;
  year: number;
  preview_url: string | null;
  cover_image?: string;
}

export const HITSTER_DECK_SEEDS: DeckSeed[] = [
  { name: 'Génesis', artist: 'Peso Pluma', year: 2023 },
  { name: 'La Bebé', artist: 'Yng Lvcas & Peso Pluma', year: 2022 },
  { name: 'Un Verano Sin Ti', artist: 'Bad Bunny', year: 2022 },
  { name: 'Tití Me Preguntó', artist: 'Bad Bunny', year: 2022 },
  { name: 'El Último Tour Del Mundo', artist: 'Bad Bunny', year: 2020 },
  { name: 'Ojitos Lindos', artist: 'Bad Bunny ft. Bomba Estéreo', year: 2022 },
  { name: 'La Forma en que Me Quieres', artist: 'Carin León', year: 2023 },
  { name: 'Colmillo de Leche', artist: 'Carin León', year: 2022 },
  { name: 'Dreamers', artist: 'Zoé', year: 2008 },
  { name: 'Eres', artist: 'Café Tacvba', year: 2003 },
  { name: 'La Negra Tomasa', artist: 'Caifanes', year: 1988 },
  { name: 'Caras Vemos', artist: 'Caifanes', year: 1990 },
  { name: 'En El 2000', artist: 'Natalia Lafourcade', year: 2002 },
  { name: 'Quevedo: Bzrp Music Sessions, Vol. 52', artist: 'Bizarrap', year: 2022 },
  { name: 'AM', artist: 'Arctic Monkeys', year: 2013 },
  { name: 'R U Mine?', artist: 'Arctic Monkeys', year: 2012 },
  { name: 'OK Computer', artist: 'Radiohead', year: 1997 },
  { name: 'Creep', artist: 'Radiohead', year: 1992 },
  { name: 'Everlong', artist: 'Foo Fighters', year: 1997 },
  { name: 'Natalie', artist: 'Bruno Mars', year: 2016 },
  { name: '24K Magic', artist: 'Bruno Mars', year: 2016 },
  { name: 'Blinding Lights', artist: 'The Weeknd', year: 2019 },
  { name: 'Thriller', artist: 'Michael Jackson', year: 1982 },
  { name: 'Billie Jean', artist: 'Michael Jackson', year: 1983 },
  { name: 'Bohemian Rhapsody', artist: 'Queen', year: 1975 },
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Builds a shuffled deck for a new room. When `accessToken` is available,
 * resolves each seed to a real Spotify track (real preview_url/cover_image);
 * otherwise (or on a miss) falls back to the seed's own data with no audio —
 * the game must still be playable blind.
 */
export async function buildHitsterDeck(accessToken?: string | null, size = 20): Promise<DeckCard[]> {
  const picks = shuffle(HITSTER_DECK_SEEDS).slice(0, Math.min(size, HITSTER_DECK_SEEDS.length));

  const resolved = await Promise.all(
    picks.map(async (seed): Promise<DeckCard> => {
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
              track_id: hit.id,
              name: seed.name,
              artist: seed.artist,
              year: seed.year,
              preview_url: hit.preview_url ?? null,
              cover_image: hit.cover_image,
            };
          }
        } catch {
          // fall through to the seed-only card below
        }
      }
      return {
        track_id: `seed-${seed.name}-${seed.artist}`,
        name: seed.name,
        artist: seed.artist,
        year: seed.year,
        preview_url: null,
      };
    })
  );

  return resolved;
}

export function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}
