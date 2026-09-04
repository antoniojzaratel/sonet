// Curated pool for the app-wide Daily Drop — one pick per day, same for
// everyone (distinct from the personalized daily_recommendations/"Song of
// the Day"). Deterministic day-of-year selection, same pattern as
// lib/dailyGame.ts and lib/hitsterDeck.ts: no cron job needed, every client
// computes the identical pick and the first one to load it that day
// upserts it into `daily_drop`.

import { searchMusic } from './musicDB';

export type DropContentType = 'artist' | 'song' | 'album';

export interface DropSeed {
  contentType: DropContentType;
  name: string;
  artist: string;
  blurb: string;
}

export const DAILY_DROP_POOL: DropSeed[] = [
  { contentType: 'song', name: 'La Bebé', artist: 'Yng Lvcas & Peso Pluma', blurb: 'El remix que le dio la vuelta al regional mexicano en TikTok.' },
  { contentType: 'album', name: 'Un Verano Sin Ti', artist: 'Bad Bunny', blurb: 'El disco que hizo historia en Billboard como el primero en español en llegar a #1 del año.' },
  { contentType: 'artist', name: 'Zoé', artist: 'Zoé', blurb: 'Casi 30 años y siguen sonando frescos — el rock alternativo mexicano de referencia.' },
  { contentType: 'song', name: 'Eres', artist: 'Café Tacvba', blurb: 'Una de las canciones de amor más citadas del rock en español.' },
  { contentType: 'album', name: 'Génesis', artist: 'Peso Pluma', blurb: 'El disco que puso los corridos tumbados en el mapa global.' },
  { contentType: 'artist', name: 'Carin León', artist: 'Carin León', blurb: 'La voz que está redefiniendo qué puede sonar el regional mexicano.' },
  { contentType: 'song', name: 'R U Mine?', artist: 'Arctic Monkeys', blurb: 'El riff que define una década de indie rock.' },
  { contentType: 'album', name: 'AM', artist: 'Arctic Monkeys', blurb: 'El disco que llevó a Arctic Monkeys de culto a estadios.' },
  { contentType: 'song', name: 'Ojitos Lindos', artist: 'Bad Bunny ft. Bomba Estéreo', blurb: 'Cumbia y reggaetón en la misma canción, sin fricción.' },
  { contentType: 'artist', name: 'Caifanes', artist: 'Caifanes', blurb: 'Los pioneros del rock mexicano de los 90 que todavía llenan foros.' },
  { contentType: 'album', name: 'OK Computer', artist: 'Radiohead', blurb: 'Casi 30 años después, sigue sonando como el futuro.' },
  { contentType: 'song', name: 'Blinding Lights', artist: 'The Weeknd', blurb: 'El synth-pop que rompió récords en Billboard Hot 100.' },
  { contentType: 'artist', name: 'Natalia Lafourcade', artist: 'Natalia Lafourcade', blurb: 'Folk mexicano contemporáneo con una voz inconfundible.' },
  { contentType: 'song', name: 'Natalie', artist: 'Bruno Mars', blurb: 'Funk-pop directo de 24K Magic.' },
  { contentType: 'album', name: 'Dreamers', artist: 'Zoé', blurb: 'El disco que consolidó a Zoé como banda de estadios.' },
  { contentType: 'song', name: 'Quevedo: Bzrp Music Sessions, Vol. 52', artist: 'Bizarrap', blurb: 'La sesión que se volvió el tema del verano en medio mundo.' },
];

function dayOfYear(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Deterministic — every client computes the same pick for the same date. */
export function dropForDate(dateStr: string): DropSeed {
  return DAILY_DROP_POOL[dayOfYear(dateStr) % DAILY_DROP_POOL.length];
}

export interface ResolvedDrop {
  content_type: DropContentType;
  content_id: string;
  content_name: string;
  artist_name: string;
  cover_image: string | null;
  preview_url: string | null;
  spotify_url: string | null;
  blurb: string;
}

/** Resolves a seed to real Spotify metadata when a token is available; falls back to seed-only (still votable, just no audio/art). */
export async function resolveDailyDrop(seed: DropSeed, accessToken?: string | null): Promise<ResolvedDrop> {
  if (accessToken) {
    try {
      const results = await searchMusic({
        query: `${seed.name} ${seed.artist}`,
        types: [seed.contentType === 'artist' ? 'song' : seed.contentType === 'album' ? 'album' : 'song'],
        accessToken,
        limit: 1,
      });
      const hit = results[0];
      if (hit) {
        return {
          content_type: seed.contentType,
          content_id: hit.id,
          content_name: seed.name,
          artist_name: seed.artist,
          cover_image: hit.cover_image ?? null,
          preview_url: hit.preview_url ?? null,
          spotify_url: hit.external_url ?? null,
          blurb: seed.blurb,
        };
      }
    } catch {
      // fall through to the seed-only drop below
    }
  }
  return {
    content_type: seed.contentType,
    content_id: `seed-${seed.name}-${seed.artist}`,
    content_name: seed.name,
    artist_name: seed.artist,
    cover_image: null,
    preview_url: null,
    spotify_url: null,
    blurb: seed.blurb,
  };
}
