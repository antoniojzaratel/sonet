import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

const ML_BASE = process.env.EXPO_PUBLIC_ML_API_URL ?? 'http://localhost:8000';

export interface DailyRecommendation {
  user_id: string;
  date: string;
  track_id: string;
  track_name: string;
  artist_name: string;
  cover_image?: string;
  preview_url?: string;
  content_score: number;
  collab_score: number;
  final_score: number;
  reason: string;
  reason_type: string;
  bpm?: number;
  energy?: number;
  valence?: number;
  reacted: boolean;
  reaction?: string;
}

export interface SoundMatchCandidate {
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    bio?: string;
  };
  taste_score: number;
  soundmatch_profile?: {
    looking_for: string[];
    age?: number;
  };
}

interface RecommendationState {
  todayRec: DailyRecommendation | null;
  soundMatchCandidates: SoundMatchCandidate[];
  soundMatchMatches: any[];
  loadingRec: boolean;
  loadingCandidates: boolean;

  fetchTodayRec: (userId: string) => Promise<void>;
  requestRec: (userId: string) => Promise<void>;
  reactToRec: (userId: string, date: string, reaction: string) => Promise<void>;
  fetchSoundMatchCandidates: (userId: string) => Promise<void>;
  swipeSoundMatch: (swiperId: string, targetId: string, action: 'like' | 'pass' | 'super_like') => Promise<void>;
  fetchSoundMatchMatches: (userId: string) => Promise<void>;
  buildDNA: (userId: string, spotifyToken: string) => Promise<void>;
  computeCompatibility: (userA: string, userB: string) => Promise<number | null>;
}

export const useRecommendationStore = create<RecommendationState>((set, get) => ({
  todayRec: null,
  soundMatchCandidates: [],
  soundMatchMatches: [],
  loadingRec: false,
  loadingCandidates: false,

  fetchTodayRec: async (userId) => {
    set({ loadingRec: true });
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('daily_recommendations')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();
      set({ todayRec: data as DailyRecommendation | null });
    } catch {}
    set({ loadingRec: false });
  },

  requestRec: async (userId) => {
    try {
      const res = await fetch(`${ML_BASE}/recommendations/generate/${userId}`, {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.recommendation) {
          set({ todayRec: json.recommendation as DailyRecommendation });
        }
      }
    } catch {}
  },

  reactToRec: async (userId, date, reaction) => {
    const { todayRec } = get();
    if (todayRec) set({ todayRec: { ...todayRec, reacted: true, reaction } });

    try {
      await fetch(`${ML_BASE}/recommendations/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, date, reaction }),
      });
    } catch {
      // Fallback direct to Supabase
      await supabase
        .from('daily_recommendations')
        .update({ reaction, reacted: true, reacted_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('date', date);
    }
  },

  fetchSoundMatchCandidates: async (userId) => {
    set({ loadingCandidates: true });
    try {
      const res = await fetch(`${ML_BASE}/soundmatch/candidates/${userId}?limit=30`);
      if (res.ok) {
        const json = await res.json();
        set({ soundMatchCandidates: json.candidates || [] });
      }
    } catch {
      // Fallback: fetch from compatibility_scores directly
      const { data } = await supabase
        .from('compatibility_scores')
        .select('*, users!user_b(id, username, display_name, avatar_url, bio)')
        .eq('user_a', userId)
        .gte('taste_score', 50)
        .order('taste_score', { ascending: false })
        .limit(20);

      if (data) {
        set({
          soundMatchCandidates: data.map((row: any) => ({
            user: row.users,
            taste_score: row.taste_score,
          })),
        });
      }
    }
    set({ loadingCandidates: false });
  },

  swipeSoundMatch: async (swiperId, targetId, action) => {
    await supabase.from('soundmatch_swipes').upsert({
      swiper_id: swiperId,
      target_id: targetId,
      action,
    });

    // Remove from candidates list
    set((state) => ({
      soundMatchCandidates: state.soundMatchCandidates.filter((c) => c.user.id !== targetId),
    }));
  },

  fetchSoundMatchMatches: async (userId) => {
    const { data } = await supabase
      .from('soundmatch_matches')
      .select(`
        *,
        user_a_profile:users!user_a(id, username, display_name, avatar_url),
        user_b_profile:users!user_b(id, username, display_name, avatar_url)
      `)
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order('matched_at', { ascending: false });

    if (data) {
      const matches = data.map((m: any) => ({
        ...m,
        other_user: m.user_a === userId ? m.user_b_profile : m.user_a_profile,
      }));
      set({ soundMatchMatches: matches });
    }
  },

  buildDNA: async (userId, spotifyToken) => {
    try {
      await fetch(`${ML_BASE}/dna/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, spotify_token: spotifyToken }),
      });
    } catch {}
  },

  computeCompatibility: async (userA, userB) => {
    try {
      const res = await fetch(`${ML_BASE}/compatibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_a: userA, user_b: userB }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.taste_score ?? null;
      }
    } catch {}
    return null;
  },
}));
