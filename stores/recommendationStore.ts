import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { computeMatch } from '@/lib/ai/matchEngine';
import { sendPushTo } from '@/lib/push';
import { track } from '@/lib/analytics';
import type { MusicVector } from '@/lib/ai/tasteVector';
import { fetchBlockedIds } from '@/lib/blocking';
import { useAuthStore } from '@/stores/authStore';
import { DEMO_SOUNDMATCH_CANDIDATES } from '@/lib/demoContent';

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

// Blind profile: candidates NEVER carry display_name/avatar_url/username/bio.
// Only what soundmatch_profiles explicitly opts into showing, plus taste match.
export interface SoundMatchCandidate {
  user: { id: string };
  age: number | null; // null when the candidate has show_age = false
  taste_score: number;
  audio_score?: number;
  genre_score?: number;
  behavior_score?: number;
  shared_genres?: string[];
  shared_artists?: string[];
  soundmatch_profile?: {
    looking_for: string[];
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

// Neutral fallback vector for users with no music_profiles row yet, so
// compatibility never hard-fails — just scores as "average" until they sync.
const NEUTRAL_VECTOR: MusicVector = {
  energy: 0.5, danceability: 0.5, valence: 0.5, acousticness: 0.3,
  instrumentalness: 0.1, speechiness: 0.1, tempo_norm: 0.5, loudness_norm: 0.5,
  liveness: 0.2, genre_pop: 0.2, genre_rock: 0.15, genre_hip_hop: 0.15,
  genre_electronic: 0.1, genre_latin: 0.1, genre_rnb: 0.1, genre_jazz: 0.05,
  genre_classical: 0.05, genre_other: 0.1, avg_rating_norm: 0.6,
  bpm_preference: 0.5, vocal_preference: 0.8, mood_index: 0.5, diversity: 0.3,
};

interface SoundmatchProfileRow {
  user_id: string;
  active: boolean;
  age: number | null;
  age_min: number;
  age_max: number;
  looking_for: string[];
  gender: string | null;
  gender_preference: string[];
  show_age: boolean;
}

function genderMatchesPreference(gender: string | null, preference: string[]): boolean {
  if (!preference || preference.length === 0) return true;
  if (preference.includes('both')) return true;
  if (!gender) return false;
  const bucket = gender === 'man' || gender === 'men' ? 'men' : gender === 'woman' || gender === 'women' ? 'women' : gender;
  return preference.includes(bucket);
}

function ageOverlaps(viewer: SoundmatchProfileRow, candidate: SoundmatchProfileRow): boolean {
  // Permissive when age data is missing on either side — never over-filter a small demo pool.
  if (candidate.age != null && (candidate.age < viewer.age_min || candidate.age > viewer.age_max)) return false;
  if (viewer.age != null && (viewer.age < candidate.age_min || viewer.age > candidate.age_max)) return false;
  return true;
}

async function fetchMusicVector(userId: string): Promise<MusicVector> {
  const { data } = await supabase.from('music_profiles').select('feature_vector').eq('user_id', userId).maybeSingle();
  return (data?.feature_vector as MusicVector | undefined) ?? NEUTRAL_VECTOR;
}

/** Computes (or reuses a cached) matchEngine.ts score between two users and upserts compatibility_scores. */
async function computeAndCacheCompatibility(userId: string, otherId: string) {
  const userA = userId < otherId ? userId : otherId;
  const userB = userId < otherId ? otherId : userId;

  const { data: cached } = await supabase
    .from('compatibility_scores')
    .select('*')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .maybeSingle();
  if (cached) return cached;

  const [vecA, vecB] = await Promise.all([fetchMusicVector(userA), fetchMusicVector(userB)]);
  const match = computeMatch(vecA, vecB);

  const row = {
    user_a: userA,
    user_b: userB,
    taste_score: match.score,
    audio_score: match.audio_score,
    genre_score: match.genre_score,
    behavior_score: match.behavior_score,
    shared_genres: match.shared_traits,
    shared_artists: [],
  };
  const { data: saved } = await supabase.from('compatibility_scores').upsert(row).select('*').maybeSingle();
  return saved ?? row;
}

/** Blind-profile candidate list: mutual gender/orientation + age filter, no identity fields ever selected. */
async function fetchBlindCandidates(userId: string): Promise<SoundMatchCandidate[]> {
  const { data: viewer } = await supabase
    .from('soundmatch_profiles')
    .select('user_id, active, age, age_min, age_max, looking_for, gender, gender_preference, show_age')
    .eq('user_id', userId)
    .maybeSingle();
  if (!viewer || !viewer.active) return [];

  const { data: swiped } = await supabase.from('soundmatch_swipes').select('target_id').eq('swiper_id', userId);
  const swipedIds = new Set((swiped ?? []).map((s: any) => s.target_id as string));
  const blockedIds = await fetchBlockedIds(userId);

  const { data: pool } = await supabase
    .from('soundmatch_profiles')
    .select('user_id, active, age, age_min, age_max, looking_for, gender, gender_preference, show_age')
    .eq('active', true)
    .neq('user_id', userId)
    .limit(100);

  const candidates = (pool ?? []).filter((c: SoundmatchProfileRow) => {
    if (swipedIds.has(c.user_id)) return false;
    if (blockedIds.has(c.user_id)) return false;
    if (!genderMatchesPreference(c.gender, viewer.gender_preference)) return false;
    if (!genderMatchesPreference(viewer.gender, c.gender_preference)) return false;
    if (!ageOverlaps(viewer as SoundmatchProfileRow, c)) return false;
    return true;
  });

  const scored = await Promise.all(
    candidates.map(async (c: SoundmatchProfileRow) => {
      const compat = await computeAndCacheCompatibility(userId, c.user_id);
      return {
        user: { id: c.user_id },
        age: c.show_age ? c.age : null,
        taste_score: Math.round(compat.taste_score),
        audio_score: compat.audio_score,
        genre_score: compat.genre_score,
        behavior_score: compat.behavior_score,
        shared_genres: compat.shared_genres ?? [],
        shared_artists: compat.shared_artists ?? [],
        soundmatch_profile: { looking_for: c.looking_for },
      } satisfies SoundMatchCandidate;
    })
  );

  return scored.sort((a, b) => b.taste_score - a.taste_score).slice(0, 20);
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
    if (useAuthStore.getState().isRichDemo) {
      set({ soundMatchCandidates: DEMO_SOUNDMATCH_CANDIDATES, loadingCandidates: false });
      return;
    }
    set({ loadingCandidates: true });
    try {
      const res = await fetch(`${ML_BASE}/soundmatch/candidates/${userId}?limit=30`);
      if (!res.ok) throw new Error('ml api unavailable');
      const json = await res.json();
      set({ soundMatchCandidates: json.candidates || [] });
    } catch {
      // Fallback: Supabase-direct, blind-profile candidate query.
      const candidates = await fetchBlindCandidates(userId);
      set({ soundMatchCandidates: candidates });
    }
    set({ loadingCandidates: false });
  },

  swipeSoundMatch: async (swiperId, targetId, action) => {
    if (useAuthStore.getState().isRichDemo) {
      const candidate = get().soundMatchCandidates.find((c) => c.user.id === targetId);
      set((state) => ({ soundMatchCandidates: state.soundMatchCandidates.filter((c) => c.user.id !== targetId) }));
      // The top candidate always matches back — a satisfying demo moment
      // without needing a second real account to swipe from.
      if ((action === 'like' || action === 'super_like') && targetId === 'demo-cand-1') {
        set((state) => ({
          soundMatchMatches: [
            {
              id: `demo-match-${targetId}`,
              other_user: { display_name: 'Match musical', username: 'match' },
              icebreaker: `¡Match! Tienen ${Math.round(candidate?.taste_score ?? 90)}% de compatibilidad musical`,
              taste_score: candidate?.taste_score ?? 90,
              conversation_id: null,
            },
            ...state.soundMatchMatches,
          ],
        }));
      }
      return;
    }

    await supabase.from('soundmatch_swipes').upsert({
      swiper_id: swiperId,
      target_id: targetId,
      action,
    });

    // Remove from candidates list
    set((state) => ({
      soundMatchCandidates: state.soundMatchCandidates.filter((c) => c.user.id !== targetId),
    }));

    // A 'like'/'super_like' may have just completed a mutual match (the SQL
    // trigger check_soundmatch_mutual creates the row synchronously on
    // insert) — if so, push the other person. Blind profile: never put a
    // name in the notification, matches the in-app notification copy the
    // trigger itself writes.
    if (action === 'like' || action === 'super_like') {
      const a = swiperId < targetId ? swiperId : targetId;
      const b = swiperId < targetId ? targetId : swiperId;
      const { data: match } = await supabase
        .from('soundmatch_matches')
        .select('id')
        .eq('user_a', a)
        .eq('user_b', b)
        .maybeSingle();
      if (match) {
        sendPushTo(targetId, 'Nuevo match musical', '¡Nuevo SoundMatch! Empiecen a hablar');
        track('soundmatch_match');
      }
    }
  },

  fetchSoundMatchMatches: async (userId) => {
    if (useAuthStore.getState().isRichDemo) {
      // A match from "before today" so the tab is never empty even before
      // swiping — separate from the live candidates so swiping cand-1
      // produces its own fresh match without colliding with this one.
      set((state) => ({
        soundMatchMatches: state.soundMatchMatches.some((m) => m.id === 'demo-match-existing')
          ? state.soundMatchMatches
          : [
              {
                id: 'demo-match-existing',
                other_user: { display_name: 'Match musical', username: 'match' },
                icebreaker: '¡Match! Tienen 84% de compatibilidad musical',
                taste_score: 84,
                conversation_id: null,
              },
              ...state.soundMatchMatches,
            ],
      }));
      return;
    }

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
