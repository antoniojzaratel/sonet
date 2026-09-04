import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import {
  buildVectorFromSpotify,
  augmentWithRatings,
  type MusicVector,
  type SpotifyAudioFeature,
  type SpotifyArtist,
} from '@/lib/ai/tasteVector';
import { computeMatch, rankMatches, type MatchResult } from '@/lib/ai/matchEngine';
import { getDailyRecommendations, type DailyRecommendation } from '@/lib/ai/recommendations';
import { fetchTopTracks, fetchTopArtists } from '@/lib/spotify';
import { getAudioFeatures } from '@/lib/musicDB';
import type { Rating } from '@/types';

interface DateProfile {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  vector: MusicVector;
  match: MatchResult;
}

interface AIState {
  myVector: MusicVector | null;
  vectorLoading: boolean;

  dailyRecommendations: DailyRecommendation[];
  recommendationsLoading: boolean;
  lastRecommendationDate: string | null;

  dateProfiles: DateProfile[];
  dateLoading: boolean;
  currentDateIndex: number;

  buildMyVector: (accessToken: string, ratings: Rating[]) => Promise<void>;
  loadDailyRecommendations: (accessToken: string, ratings: Rating[]) => Promise<void>;
  loadDateProfiles: (myUserId: string, myVector: MusicVector) => Promise<void>;
  likeProfile: (profile: DateProfile) => void;
  skipProfile: () => void;
  saveVectorToSupabase: (userId: string, vector: MusicVector) => Promise<void>;
}

export const useAIStore = create<AIState>((set, get) => ({
  myVector: null,
  vectorLoading: false,
  dailyRecommendations: [],
  recommendationsLoading: false,
  lastRecommendationDate: null,
  dateProfiles: [],
  dateLoading: false,
  currentDateIndex: 0,

  buildMyVector: async (accessToken, ratings) => {
    set({ vectorLoading: true });
    try {
      const [tracksData, artistsData] = await Promise.all([
        fetchTopTracks(accessToken, 'medium_term', 50),
        fetchTopArtists(accessToken, 'medium_term', 30),
      ]);

      const trackIds = (tracksData?.items ?? []).map((t: any) => t.id);
      const audioFeatures: SpotifyAudioFeature[] = await getAudioFeatures(trackIds, accessToken);
      const topArtists: SpotifyArtist[] = artistsData?.items ?? [];

      let vector = buildVectorFromSpotify(audioFeatures, topArtists);
      vector = augmentWithRatings(vector, ratings);

      set({ myVector: vector });
    } catch {}
    set({ vectorLoading: false });
  },

  loadDailyRecommendations: async (accessToken, ratings) => {
    const today = new Date().toISOString().slice(0, 10);
    if (get().lastRecommendationDate === today && get().dailyRecommendations.length > 0) return;

    set({ recommendationsLoading: true });
    try {
      const myVector = get().myVector;
      if (!myVector) {
        await get().buildMyVector(accessToken, ratings);
      }

      const tracksData = await fetchTopTracks(accessToken, 'short_term', 20);
      const artistsData = await fetchTopArtists(accessToken, 'short_term', 20);
      const topTrackIds = (tracksData?.items ?? []).map((t: any) => t.id);
      const topArtistIds = (artistsData?.items ?? []).map((a: any) => a.id);

      const recs = await getDailyRecommendations({
        accessToken,
        userVector: get().myVector!,
        ratings,
        topTrackIds,
        topArtistIds,
        limit: 10,
      });

      set({ dailyRecommendations: recs, lastRecommendationDate: today });
    } catch {}
    set({ recommendationsLoading: false });
  },

  loadDateProfiles: async (myUserId, myVector) => {
    set({ dateLoading: true, currentDateIndex: 0 });
    try {
      // Fetch users who have a music_vector stored
      const { data: profiles } = await supabase
        .from('music_profiles')
        .select(`
          user_id,
          feature_vector,
          users (id, username, display_name, avatar_url, bio)
        `)
        .neq('user_id', myUserId)
        .not('feature_vector', 'is', null)
        .limit(50);

      if (!profiles?.length) {
        // Demo mode: generate mock profiles
        set({ dateProfiles: generateMockDateProfiles(myVector), dateLoading: false });
        return;
      }

      // Check who we haven't liked/skipped yet
      const { data: seen } = await supabase
        .from('date_interactions')
        .select('target_id')
        .eq('user_id', myUserId);

      const seenIds = new Set((seen ?? []).map((s: any) => s.target_id));
      const candidates = profiles
        .filter((p: any) => !seenIds.has(p.user_id) && p.feature_vector)
        .map((p: any) => ({
          userId: p.user_id,
          vector: p.feature_vector as MusicVector,
        }));

      const ranked = rankMatches(myVector, candidates);

      const dateProfiles: DateProfile[] = ranked
        .slice(0, 20)
        .map(({ userId, match }) => {
          const profile = profiles.find((p: any) => p.user_id === userId);
          const user = (profile as any)?.users;
          return {
            userId,
            displayName: user?.display_name ?? 'Unknown',
            username: user?.username ?? '',
            avatarUrl: user?.avatar_url,
            bio: user?.bio,
            vector: candidates.find((c) => c.userId === userId)!.vector,
            match,
          };
        });

      set({ dateProfiles });
    } catch {
      set({ dateProfiles: generateMockDateProfiles(myVector) });
    }
    set({ dateLoading: false });
  },

  likeProfile: (profile) => {
    set((state) => ({ currentDateIndex: state.currentDateIndex + 1 }));
  },

  skipProfile: () => {
    set((state) => ({ currentDateIndex: state.currentDateIndex + 1 }));
  },

  saveVectorToSupabase: async (userId, vector) => {
    await supabase.from('music_profiles').upsert({
      user_id: userId,
      feature_vector: vector,
      updated_at: new Date().toISOString(),
    });
  },
}));

function generateMockDateProfiles(myVector: MusicVector): DateProfile[] {
  const mockUsers = [
    { id: 'm1', name: 'Sofía Ramírez', user: 'sofiamusic', bio: 'Rock lover, conciertos todo el año' },
    { id: 'm2', name: 'Diego Torres', user: 'diegodj', bio: 'DJ on weekends, reggaeton fan' },
    { id: 'm3', name: 'Valentina Cruz', user: 'vale_melodies', bio: 'Piano clásico & indie pop' },
    { id: 'm4', name: 'Carlos Mendez', user: 'carloshiphop', bio: 'Hip-hop y R&B para vivir' },
    { id: 'm5', name: 'Isabella Font', user: 'isajazz', bio: 'Jazz & soul, café y vinilo' },
    { id: 'm6', name: 'Andrés Ruiz', user: 'andreselectro', bio: 'Electronic music producer' },
  ];

  return mockUsers.map((u) => {
    const mockVector: MusicVector = {
      ...myVector,
      energy: Math.random(),
      valence: Math.random(),
      danceability: Math.random(),
      genre_pop: Math.random() * 0.4,
      genre_rock: Math.random() * 0.4,
      genre_hip_hop: Math.random() * 0.4,
      genre_latin: Math.random() * 0.4,
      genre_electronic: Math.random() * 0.3,
      genre_jazz: Math.random() * 0.2,
      genre_rnb: Math.random() * 0.2,
      genre_classical: Math.random() * 0.15,
      genre_other: Math.random() * 0.1,
    };
    const match = computeMatch(myVector, mockVector);
    return {
      userId: u.id,
      displayName: u.name,
      username: u.user,
      bio: u.bio,
      vector: mockVector,
      match,
    };
  }).sort((a, b) => b.match.score - a.match.score);
}
