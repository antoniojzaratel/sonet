import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  spotifyToken: string | null;

  setSession: (session: any) => void;
  setUser: (user: User | null) => void;
  setSpotifyToken: (token: string) => void;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  spotifyToken: null,

  setSession: (session) => set({ session, loading: false }),

  setUser: (user) => set({ user }),

  setSpotifyToken: (token) => set({ spotifyToken: token }),

  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      set({ user: data as User });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, spotifyToken: null });
  },
}));
