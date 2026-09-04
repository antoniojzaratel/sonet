import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { puzzleForDate, todayDateString, dateOffsetString, MAX_ATTEMPTS, type PuzzleContentType, type PuzzleSeed } from '@/lib/dailyGame';

export interface GuessRecord {
  text: string;
  correct: boolean;
}

export interface PuzzlePublic {
  date: string;
  contentType: PuzzleContentType;
  hints: string[];
}

export interface GameAttemptState {
  date: string;
  guesses: GuessRecord[];
  solved: boolean;
  attemptCount: number;
  streak: number;
}

interface GameAttemptRow {
  user_id: string;
  date: string;
  guesses: GuessRecord[];
  solved: boolean;
  attempt_count: number;
  streak: number;
}

interface GamesStats {
  currentStreak: number;
  bestStreak: number;
  totalSolved: number;
}

interface GamesState {
  puzzle: PuzzlePublic | null;
  attempt: GameAttemptState | null;
  loading: boolean;
  stats: GamesStats;
  loadingStats: boolean;
  /** Internal reentrancy guard for submitGuess — see comment there. */
  _submittingGuess: boolean;

  loadToday: (userId: string) => Promise<void>;
  submitGuess: (userId: string, guessText: string) => Promise<{ correct: boolean; answerName: string | null }>;
  loadStats: (userId: string) => Promise<void>;
}

function emptyAttempt(date: string): GameAttemptState {
  return { date, guesses: [], solved: false, attemptCount: 0, streak: 0 };
}

// Demo mode never touches Supabase — the puzzle seed is deterministic
// locally anyway, this just stashes it so submitGuess can check answers
// without the check_daily_guess RPC.
let demoSeed: PuzzleSeed | null = null;

function checkGuessLocally(seed: PuzzleSeed, guess: string): boolean {
  const g = guess.trim().toLowerCase();
  return g === seed.answerId.trim().toLowerCase() || g === seed.answerName.trim().toLowerCase();
}

export const useGamesStore = create<GamesState>((set, get) => ({
  puzzle: null,
  attempt: null,
  loading: false,
  stats: { currentStreak: 3, bestStreak: 7, totalSolved: 12 },
  loadingStats: false,
  _submittingGuess: false,

  loadToday: async (userId) => {
    set({ loading: true });
    const date = todayDateString();
    const seed = puzzleForDate(date);

    if (useAuthStore.getState().isRichDemo) {
      demoSeed = seed;
      const existing = get().attempt;
      set({
        puzzle: { date, contentType: seed.contentType, hints: seed.hints },
        attempt: existing?.date === date ? existing : emptyAttempt(date),
        loading: false,
      });
      return;
    }

    // Every client derives the same seed for `date`, so this is safe to
    // race — the first writer wins and everyone else is a no-op.
    await supabase.from('daily_game_puzzles').upsert(
      {
        date,
        content_type: seed.contentType,
        answer_id: seed.answerId,
        answer_name: seed.answerName,
        hints: seed.hints,
      },
      { onConflict: 'date', ignoreDuplicates: true }
    );

    const { data: attemptRow } = await supabase
      .from('game_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    const attempt: GameAttemptState = attemptRow
      ? {
          date: (attemptRow as GameAttemptRow).date,
          guesses: (attemptRow as GameAttemptRow).guesses ?? [],
          solved: (attemptRow as GameAttemptRow).solved,
          attemptCount: (attemptRow as GameAttemptRow).attempt_count,
          streak: (attemptRow as GameAttemptRow).streak,
        }
      : emptyAttempt(date);

    set({
      puzzle: { date, contentType: seed.contentType, hints: seed.hints },
      attempt,
      loading: false,
    });
  },

  submitGuess: async (userId, guessText) => {
    // Reentrancy guard: submitGuess reads `get().attempt` once at the top and
    // upserts the whole guesses/attemptCount array at the end — two
    // overlapping calls (any caller, not just this store's own UI) would
    // both read the same pre-guess state and the later upsert would
    // silently overwrite the earlier one's guess. Unlike raceStore's atomic
    // server-side RPC, this round-trips through client state, so it needs
    // its own lock rather than relying on a component's local `submitting`
    // flag (which lags a render behind the actual call).
    if (get()._submittingGuess) return { correct: false, answerName: null };

    const { attempt } = get();
    if (!attempt || attempt.solved || attempt.attemptCount >= MAX_ATTEMPTS) {
      return { correct: false, answerName: null };
    }
    set({ _submittingGuess: true });

    try {
      if (useAuthStore.getState().isRichDemo && demoSeed) {
        const correct = checkGuessLocally(demoSeed, guessText);
        const guesses = [...attempt.guesses, { text: guessText, correct }];
        const attemptCount = attempt.attemptCount + 1;
        const solved = correct;
        const streak = solved ? attempt.streak + 1 : attempt.streak;
        set({ attempt: { date: attempt.date, guesses, solved, attemptCount, streak } });
        return { correct, answerName: correct ? demoSeed.answerName : null };
      }

      const { data, error } = await supabase.rpc('check_daily_guess', {
        p_date: attempt.date,
        p_guess: guessText,
      });
      if (error) return { correct: false, answerName: null };

      const result = (data as { correct: boolean; answer_name: string | null }[] | null)?.[0];
      const correct = result?.correct ?? false;
      const answerName = result?.answer_name ?? null;

      const guesses = [...attempt.guesses, { text: guessText, correct }];
      const attemptCount = attempt.attemptCount + 1;
      const solved = correct;

      let streak = attempt.streak;
      if (solved) {
        const yesterday = dateOffsetString(attempt.date, -1);
        const { data: prevRow } = await supabase
          .from('game_attempts')
          .select('solved, streak')
          .eq('user_id', userId)
          .eq('date', yesterday)
          .maybeSingle();
        streak = prevRow?.solved ? (prevRow.streak ?? 0) + 1 : 1;
      }

      const nextAttempt: GameAttemptState = { date: attempt.date, guesses, solved, attemptCount, streak };

      await supabase.from('game_attempts').upsert(
        {
          user_id: userId,
          date: attempt.date,
          guesses,
          solved,
          attempt_count: attemptCount,
          streak,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' }
      );

      set({ attempt: nextAttempt });
      return { correct, answerName };
    } finally {
      set({ _submittingGuess: false });
    }
  },

  loadStats: async (userId) => {
    if (useAuthStore.getState().isRichDemo) return; // pre-seeded default stats already in place
    set({ loadingStats: true });
    const { data } = await supabase
      .from('game_attempts')
      .select('date, solved, streak')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    const rows = (data ?? []) as { date: string; solved: boolean; streak: number }[];
    const totalSolved = rows.filter((r) => r.solved).length;
    const bestStreak = rows.reduce((max, r) => Math.max(max, r.streak), 0);

    const today = todayDateString();
    const yesterday = dateOffsetString(today, -1);
    const latest = rows[0];
    const currentStreak = latest && (latest.date === today || latest.date === yesterday) ? latest.streak : 0;

    set({ stats: { currentStreak, bestStreak, totalSolved }, loadingStats: false });
  },
}));
