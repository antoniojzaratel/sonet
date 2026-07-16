import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RATINGS_KEY = 'sonet_ratings_v1';

export type EmojiType = 'love' | 'like' | 'meh';
export type ContentType = 'track' | 'album' | 'podcast';

export interface RatingEntry {
  id: string;
  contentId: string; // Spotify track/album ID
  contentName: string;
  artistName: string;
  imageUrl: string;
  contentType: 'track' | 'album' | 'podcast';
  score: number; // 1-10
  emoji: 'love' | 'like' | 'meh';
  review?: string;
  createdAt: string; // ISO date string
}

interface RatingStore {
  ratings: RatingEntry[];
  loading: boolean;
  loadRatings: () => Promise<void>;
  addRating: (entry: Omit<RatingEntry, 'id' | 'createdAt'>) => Promise<void>;
  removeRating: (contentId: string) => Promise<void>;
  getRatingForContent: (contentId: string) => RatingEntry | undefined;
  getTopRated: (limit?: number) => RatingEntry[];
  getStats: () => { total: number; avgScore: number; loveCount: number; likeCount: number; mehCount: number };
}

export const useRatingStore = create<RatingStore>((set, get) => ({
  ratings: [],
  loading: false,

  loadRatings: async () => {
    set({ loading: true });
    try {
      const raw = await AsyncStorage.getItem(RATINGS_KEY);
      const ratings: RatingEntry[] = raw ? JSON.parse(raw) : [];
      set({ ratings });
    } catch {
      set({ ratings: [] });
    } finally {
      set({ loading: false });
    }
  },

  addRating: async (entry) => {
    const newEntry: RatingEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    const ratings = [newEntry, ...get().ratings.filter((r) => r.contentId !== entry.contentId)];
    set({ ratings });
    await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
  },

  removeRating: async (contentId) => {
    const ratings = get().ratings.filter((r) => r.contentId !== contentId);
    set({ ratings });
    await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
  },

  getRatingForContent: (contentId) => get().ratings.find((r) => r.contentId === contentId),

  getTopRated: (limit = 10) =>
    [...get().ratings].sort((a, b) => b.score - a.score).slice(0, limit),

  getStats: () => {
    const { ratings } = get();
    return {
      total: ratings.length,
      avgScore: ratings.length ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : 0,
      loveCount: ratings.filter((r) => r.emoji === 'love').length,
      likeCount: ratings.filter((r) => r.emoji === 'like').length,
      mehCount: ratings.filter((r) => r.emoji === 'meh').length,
    };
  },
}));
