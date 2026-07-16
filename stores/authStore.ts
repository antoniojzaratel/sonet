import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

interface SpotifyProfile {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
}

interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  spotifyToken: string | null;
  spotifyRefreshToken: string | null;
  spotifyProfile: SpotifyProfile | null;

  setSession: (session: any) => void;
  setUser: (user: User | null) => void;
  setSpotifyToken: (token: string | null) => void;
  setSpotifyRefreshToken: (token: string | null) => void;
  setSpotifyProfile: (profile: SpotifyProfile | null) => void;
  loadPersistedSpotifyToken: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  spotifyToken: null,
  spotifyRefreshToken: null,
  spotifyProfile: null,

  setSession: (session) => set({ session, loading: false }),

  setUser: (user) => set({ user }),

  setSpotifyToken: (token) => {
    set({ spotifyToken: token });
    if (token) AsyncStorage.setItem('spotify_access_token', token);
    else AsyncStorage.removeItem('spotify_access_token');
  },

  setSpotifyRefreshToken: (token) => set({ spotifyRefreshToken: token }),

  setSpotifyProfile: (profile) => set({ spotifyProfile: profile }),

  loadPersistedSpotifyToken: async () => {
    const token = await AsyncStorage.getItem('spotify_access_token');
    if (token) set({ spotifyToken: token });
  },

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
    await AsyncStorage.removeItem('spotify_access_token');
    set({ user: null, session: null, spotifyToken: null, spotifyRefreshToken: null, spotifyProfile: null });
  },
}));
