// Curated puzzle pool for the daily Wordle-style guess game. Deterministic
// per-date selection means every client picks the identical puzzle for a
// given day without needing a cron job — see stores/gamesStore.ts, which
// upserts the resulting row into daily_game_puzzles (ON CONFLICT DO NOTHING)
// the first time any client loads that date.

export type PuzzleContentType = 'genre' | 'artist' | 'album' | 'song';

export interface PuzzleSeed {
  contentType: PuzzleContentType;
  answerId: string;
  answerName: string;
  hints: string[]; // revealed progressively, hints[0] first
  coverImage?: string;
}

export const PUZZLE_POOL: PuzzleSeed[] = [
  {
    contentType: 'song',
    answerId: 'r-u-mine',
    answerName: 'R U Mine?',
    hints: ['Género: Indie rock', 'Año: 2013', 'Primera letra: R', "Está en el álbum AM"],
  },
  {
    contentType: 'artist',
    answerId: 'bad-bunny',
    answerName: 'Bad Bunny',
    hints: ['Género: Reggaetón / Latin trap', 'País: Puerto Rico', 'Primera letra: B', "Su álbum 'Un Verano Sin Ti' fue un fenómeno global"],
  },
  {
    contentType: 'album',
    answerId: 'genesis-peso-pluma',
    answerName: 'Génesis',
    hints: ['Artista: Peso Pluma', 'Año: 2023', 'Género: Corridos tumbados', 'Redefinió el regional mexicano'],
  },
  {
    contentType: 'genre',
    answerId: 'corridos-tumbados',
    answerName: 'Corridos tumbados',
    hints: ['Ejemplo: Peso Pluma', 'Mezcla trap con banda/regional', 'Popular desde 2020', "También llamado 'trap corridos'"],
  },
  {
    contentType: 'song',
    answerId: 'eres',
    answerName: 'Eres',
    hints: ['Género: Rock alternativo', 'Año: 2003', 'Primera letra: E', 'De su álbum Cuatro Caminos'],
  },
  {
    contentType: 'artist',
    answerId: 'zoe',
    answerName: 'Zoé',
    hints: ['Género: Rock alternativo', 'País: México', 'Primera letra: Z', "Su álbum 'Dreamers' es aclamado"],
  },
  {
    contentType: 'album',
    answerId: 'am-arctic-monkeys',
    answerName: 'AM',
    hints: ['Artista: Arctic Monkeys', 'Año: 2013', 'Género: Indie rock', "Incluye 'Do I Wanna Know?'"],
  },
  {
    contentType: 'song',
    answerId: 'la-bebe',
    answerName: 'La Bebé',
    hints: ['Género: Corridos / Reggaetón', 'Año: 2023', 'Primera letra: L', 'Remix viral en TikTok'],
  },
  {
    contentType: 'artist',
    answerId: 'carin-leon',
    answerName: 'Carin León',
    hints: ['Género: Regional mexicano', 'País: México', 'Primera letra: C', "Conocido por 'La Forma en que Me Quieres'"],
  },
  {
    contentType: 'album',
    answerId: 'un-verano-sin-ti',
    answerName: 'Un Verano Sin Ti',
    hints: ['Artista: Bad Bunny', 'Año: 2022', 'Género: Reggaetón / Latin', 'Ganó el Grammy a Mejor Álbum de Música Urbana'],
  },
  {
    contentType: 'genre',
    answerId: 'rock-en-espanol',
    answerName: 'Rock en español',
    hints: ['Ejemplo: Caifanes', 'Surgió en los 80s-90s', 'Se canta en español con raíces rock', 'Incluye bandas como Zoé y Café Tacvba'],
  },
  {
    contentType: 'song',
    answerId: 'blinding-lights',
    answerName: 'Blinding Lights',
    hints: ['Género: Synth-pop', 'Año: 2019', 'Primera letra: B', 'Rompió récords en Billboard Hot 100'],
  },
  {
    contentType: 'artist',
    answerId: 'radiohead',
    answerName: 'Radiohead',
    hints: ['Género: Rock alternativo / Experimental', 'País: Reino Unido', 'Primera letra: R', 'Su álbum OK Computer es considerado una obra maestra'],
  },
  {
    contentType: 'album',
    answerId: 'ok-computer',
    answerName: 'OK Computer',
    hints: ['Artista: Radiohead', 'Año: 1997', 'Género: Rock alternativo', 'Considerado uno de los mejores álbumes de la historia'],
  },
  {
    contentType: 'song',
    answerId: 'ojitos-lindos',
    answerName: 'Ojitos Lindos',
    hints: ['Género: Reggaetón / Cumbia', 'Año: 2022', 'Primera letra: O', 'Colaboración con Bomba Estéreo'],
  },
  {
    contentType: 'artist',
    answerId: 'caifanes',
    answerName: 'Caifanes',
    hints: ['Género: Rock mexicano', 'País: México', 'Primera letra: C', 'Pioneros del rock en español de los 90s'],
  },
  {
    contentType: 'genre',
    answerId: 'indie-rock',
    answerName: 'Indie rock',
    hints: ['Ejemplo: Arctic Monkeys', 'Surgió como alternativa al rock mainstream', 'Suena crudo y melódico', 'Incluye bandas como Foo Fighters'],
  },
  {
    contentType: 'song',
    answerId: 'natalie',
    answerName: 'Natalie',
    hints: ['Género: Pop / Funk', 'Año: 2016', 'Primera letra: N', 'De su álbum 24K Magic'],
  },
];

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dateOffsetString(base: string, offsetDays: number): string {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function dayOfYear(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

/** Deterministic — every client computes the same puzzle for the same date. */
export function puzzleForDate(dateStr: string): PuzzleSeed {
  const index = dayOfYear(dateStr) % PUZZLE_POOL.length;
  return PUZZLE_POOL[index];
}

export const MAX_ATTEMPTS = 6;
