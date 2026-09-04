import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { candidatesForDate, type LineupArtist } from '@/lib/lineupPool';
import { scoreLineup, type LineupScoreBreakdown } from '@/lib/lineupScore';
import { todayDateString } from '@/lib/dailyGame';

export interface LineupChallenge {
  date: string;
  candidates: LineupArtist[];
  headlinerSlots: number;
  supportSlots: number;
}

export interface LineupAttemptState {
  date: string;
  headliner: LineupArtist;
  support: LineupArtist[];
  score: LineupScoreBreakdown;
}

interface LineupState {
  challenge: LineupChallenge | null;
  attempt: LineupAttemptState | null;
  loading: boolean;

  loadToday: (userId: string) => Promise<void>;
  submitLineup: (userId: string, headliner: LineupArtist, support: LineupArtist[]) => Promise<LineupScoreBreakdown>;
}

export const useLineupStore = create<LineupState>((set, get) => ({
  challenge: null,
  attempt: null,
  loading: false,

  loadToday: async (userId) => {
    set({ loading: true });
    const date = todayDateString();
    const candidates = candidatesForDate(date);
    const headlinerSlots = 1;
    const supportSlots = 3;

    if (useAuthStore.getState().isRichDemo) {
      const existing = get().attempt;
      set({
        challenge: { date, candidates, headlinerSlots, supportSlots },
        attempt: existing?.date === date ? existing : null,
        loading: false,
      });
      return;
    }

    // Deterministic per-date candidates — safe to race, first writer wins.
    await supabase.from('lineup_challenges').upsert(
      { date, candidates, headliner_slots: headlinerSlots, support_slots: supportSlots },
      { onConflict: 'date', ignoreDuplicates: true }
    );

    const { data: attemptRow } = await supabase
      .from('lineup_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    const attempt: LineupAttemptState | null = attemptRow
      ? {
          date: attemptRow.date,
          headliner: attemptRow.lineup.headliner,
          support: attemptRow.lineup.support,
          score: attemptRow.lineup.breakdown ?? {
            total: attemptRow.score,
            headlinerStrength: 0,
            genreCohesion: 0,
            popularityBalance: 0,
          },
        }
      : null;

    set({
      challenge: { date, candidates, headlinerSlots, supportSlots },
      attempt,
      loading: false,
    });
  },

  submitLineup: async (userId, headliner, support) => {
    const { challenge } = get();
    const date = challenge?.date ?? todayDateString();
    const score = scoreLineup({ headliner, support });

    if (useAuthStore.getState().isRichDemo) {
      set({ attempt: { date, headliner, support, score } });
      return score;
    }

    await supabase.from('lineup_attempts').upsert(
      {
        user_id: userId,
        date,
        lineup: { headliner, support, breakdown: score },
        score: score.total,
      },
      { onConflict: 'user_id,date' }
    );

    set({ attempt: { date, headliner, support, score } });
    return score;
  },
}));
