import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { raceSeedForDate, resolveRaceSeed } from '@/lib/racePool';
import { todayDateString } from '@/lib/dailyGame';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Demo mode never touches Supabase, including the check_race_guess RPC —
// this stashes the answer locally so submitGuess can check it client-side.
let demoAnswerName: string | null = null;
const DEMO_LEADERBOARD: RaceLeaderboardRow[] = [
  { userId: 'demo-runner-1', displayName: 'Sofía T.', correctAt: new Date(Date.now() - 4 * 60000).toISOString() },
  { userId: 'demo-runner-2', displayName: 'Diego R.', correctAt: new Date(Date.now() - 2 * 60000).toISOString() },
];

export interface RacePuzzlePublic {
  date: string;
  trackId: string;
  previewUrl: string | null;
  coverImage?: string;
}

export interface RaceLeaderboardRow {
  userId: string;
  displayName: string;
  correctAt: string;
}

interface RaceAttemptState {
  date: string;
  guesses: number;
  solved: boolean;
  rank: number | null;
}

interface RaceState {
  puzzle: RacePuzzlePublic | null;
  attempt: RaceAttemptState | null;
  leaderboard: RaceLeaderboardRow[];
  loading: boolean;

  loadToday: (userId: string, spotifyToken?: string | null) => Promise<void>;
  submitGuess: (userId: string, guessText: string) => Promise<{ correct: boolean; rank: number | null }>;
  subscribeLeaderboard: (date: string) => void;
  unsubscribeLeaderboard: () => void;
}

let channel: RealtimeChannel | null = null;

async function fetchLeaderboard(date: string): Promise<RaceLeaderboardRow[]> {
  const { data } = await supabase
    .from('race_attempts')
    .select('user_id, correct_at, user:users(display_name)')
    .eq('date', date)
    .not('correct_at', 'is', null)
    .order('correct_at', { ascending: true })
    .limit(20);

  return ((data ?? []) as any[]).map((row) => ({
    userId: row.user_id,
    displayName: row.user?.display_name ?? 'Jugador',
    correctAt: row.correct_at,
  }));
}

export const useRaceStore = create<RaceState>((set, get) => ({
  puzzle: null,
  attempt: null,
  leaderboard: [],
  loading: false,

  loadToday: async (userId, spotifyToken) => {
    set({ loading: true });
    const date = todayDateString();
    const seed = raceSeedForDate(date);
    const resolved = await resolveRaceSeed(seed, spotifyToken);

    if (useAuthStore.getState().isRichDemo) {
      demoAnswerName = resolved.answerName;
      const existing = get().attempt;
      set({
        puzzle: { date, trackId: resolved.trackId, previewUrl: resolved.previewUrl, coverImage: resolved.coverImage },
        attempt: existing?.date === date ? existing : { date, guesses: 0, solved: false, rank: null },
        leaderboard: DEMO_LEADERBOARD,
        loading: false,
      });
      return;
    }

    // Deterministic per-date target — safe to race, first writer wins;
    // everyone else just reads the persisted row below.
    await supabase.from('race_puzzles').upsert(
      {
        date,
        track_id: resolved.trackId,
        answer_name: resolved.answerName,
        preview_url: resolved.previewUrl,
        cover_image: resolved.coverImage,
      },
      { onConflict: 'date', ignoreDuplicates: true }
    );

    // check_race_guess() only updates an existing row — make sure one
    // exists before the player's first guess.
    await supabase.from('race_attempts').upsert(
      { date, user_id: userId },
      { onConflict: 'date,user_id', ignoreDuplicates: true }
    );

    const { data: puzzleRow } = await supabase
      .from('race_puzzles')
      .select('date, track_id, preview_url, cover_image')
      .eq('date', date)
      .maybeSingle();

    const { data: attemptRow } = await supabase
      .from('race_attempts')
      .select('guesses, correct_at')
      .eq('date', date)
      .eq('user_id', userId)
      .maybeSingle();

    let rank: number | null = null;
    if (attemptRow?.correct_at) {
      const { count } = await supabase
        .from('race_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('date', date)
        .not('correct_at', 'is', null)
        .lt('correct_at', attemptRow.correct_at);
      rank = (count ?? 0) + 1;
    }

    set({
      puzzle: puzzleRow
        ? { date: puzzleRow.date, trackId: puzzleRow.track_id, previewUrl: puzzleRow.preview_url, coverImage: puzzleRow.cover_image }
        : { date, trackId: resolved.trackId, previewUrl: resolved.previewUrl, coverImage: resolved.coverImage },
      attempt: {
        date,
        guesses: attemptRow?.guesses ?? 0,
        solved: !!attemptRow?.correct_at,
        rank,
      },
      loading: false,
    });

    get().subscribeLeaderboard(date);
  },

  submitGuess: async (userId, guessText) => {
    const { attempt } = get();
    if (!attempt || attempt.solved) return { correct: false, rank: null };

    if (useAuthStore.getState().isRichDemo) {
      const correct = !!demoAnswerName && guessText.trim().toLowerCase() === demoAnswerName.trim().toLowerCase();
      const rank = correct ? DEMO_LEADERBOARD.length + 1 : null;
      set({ attempt: { ...attempt, guesses: attempt.guesses + 1, solved: correct, rank } });
      if (correct) {
        set({
          leaderboard: [
            ...DEMO_LEADERBOARD,
            { userId, displayName: 'Tú', correctAt: new Date().toISOString() },
          ],
        });
      }
      return { correct, rank };
    }

    const { data, error } = await supabase.rpc('check_race_guess', {
      p_date: attempt.date,
      p_guess: guessText,
    });
    if (error) return { correct: false, rank: null };

    const result = (data as { correct: boolean; rank: number | null }[] | null)?.[0];
    const correct = result?.correct ?? false;
    const rank = result?.rank ?? null;

    set({
      attempt: { ...attempt, guesses: attempt.guesses + 1, solved: correct || attempt.solved, rank: rank ?? attempt.rank },
    });

    return { correct, rank };
  },

  subscribeLeaderboard: (date) => {
    if (useAuthStore.getState().isRichDemo) return; // already set locally in loadToday/submitGuess
    get().unsubscribeLeaderboard();
    fetchLeaderboard(date).then((leaderboard) => set({ leaderboard }));

    channel = supabase
      .channel(`race-${date}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'race_attempts', filter: `date=eq.${date}` }, async () => {
        set({ leaderboard: await fetchLeaderboard(date) });
      })
      .subscribe();
  },

  unsubscribeLeaderboard: () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  },
}));
