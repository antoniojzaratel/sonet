import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Rating, FeedItem, ContentType } from '@/types';

interface MusicState {
  feed: FeedItem[];
  myRatings: Rating[];
  loadingFeed: boolean;
  loadingRatings: boolean;

  fetchFeed: () => Promise<void>;
  fetchMyRatings: (userId: string) => Promise<void>;
  addRating: (rating: Omit<Rating, 'id' | 'created_at'>) => Promise<Rating | null>;
  updateRating: (id: string, score: number, review?: string) => Promise<void>;
  deleteRating: (id: string) => Promise<void>;
}

export const useMusicStore = create<MusicState>((set, get) => ({
  feed: [],
  myRatings: [],
  loadingFeed: false,
  loadingRatings: false,

  fetchFeed: async () => {
    set({ loadingFeed: true });
    const { data, error } = await supabase
      .from('ratings')
      .select(`*, user:users(id, username, display_name, avatar_url)`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      const feed: FeedItem[] = data.map((r: any) => ({
        id: r.id,
        type: 'rating',
        rating: r,
        user: r.user,
        created_at: r.created_at,
      }));
      set({ feed });
    }
    set({ loadingFeed: false });
  },

  fetchMyRatings: async (userId: string) => {
    set({ loadingRatings: true });
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ myRatings: data as Rating[] });
    }
    set({ loadingRatings: false });
  },

  addRating: async (rating) => {
    const { data, error } = await supabase
      .from('ratings')
      .insert(rating)
      .select()
      .single();

    if (!error && data) {
      set((state) => ({ myRatings: [data as Rating, ...state.myRatings] }));
      return data as Rating;
    }
    return null;
  },

  updateRating: async (id, score, review) => {
    const { error } = await supabase
      .from('ratings')
      .update({ score, review })
      .eq('id', id);

    if (!error) {
      set((state) => ({
        myRatings: state.myRatings.map((r) =>
          r.id === id ? { ...r, score, review } : r,
        ),
      }));
    }
  },

  deleteRating: async (id) => {
    const { error } = await supabase.from('ratings').delete().eq('id', id);
    if (!error) {
      set((state) => ({ myRatings: state.myRatings.filter((r) => r.id !== id) }));
    }
  },
}));
