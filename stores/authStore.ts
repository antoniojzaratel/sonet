import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { DEMO_USER } from '@/lib/demoContent';
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
  /** True after signing in with the demo@demo.com account — every store
   * that reads it serves rich local content (lib/demoContent.ts) instead
   * of querying Supabase, so the app demos fully populated with zero
   * backend required. */
  isRichDemo: boolean;

  loginAsDemo: () => void;
  setSession: (session: any) => void;
  setUser: (user: User | null) => void;
  setSpotifyToken: (token: string | null) => void;
  setSpotifyRefreshToken: (token: string | null) => void;
  setSpotifyProfile: (profile: SpotifyProfile | null) => void;
  loadPersistedSpotifyToken: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithApple: () => Promise<{ error?: string }>;
}

/**
 * Supabase's mobile OAuth flow: ask Supabase for the provider's authorize
 * URL (skipping its own redirect), open it in an in-app browser session,
 * then hand the tokens Supabase appends to our deep-link callback back to
 * `setSession`. Same shape for every OAuth provider Supabase supports.
 */
async function signInWithOAuthProvider(provider: 'google' | 'apple'): Promise<{ error?: string }> {
  const redirectTo = AuthSession.makeRedirectUri({ scheme: 'sonet', path: 'auth/callback' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { error: error?.message ?? 'No se pudo iniciar sesión' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    return result.type === 'cancel' ? {} : { error: 'No se pudo completar el inicio de sesión' };
  }

  // Avoid the `URL` constructor — React Native's polyfill for it is
  // unreliable across engines/versions; plain string splitting is safe and
  // this codebase already relies on `URLSearchParams` elsewhere (lib/spotify.ts).
  const fragmentIndex = result.url.indexOf('#');
  const queryIndex = result.url.indexOf('?');
  const paramsString =
    fragmentIndex >= 0 ? result.url.slice(fragmentIndex + 1) : queryIndex >= 0 ? result.url.slice(queryIndex + 1) : '';
  const params = new URLSearchParams(paramsString);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) {
    return { error: params.get('error_description') ?? 'Respuesta de autenticación incompleta' };
  }

  const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
  return sessionError ? { error: sessionError.message } : {};
}

function usernameFromAuthUser(authUser: { email?: string | null; user_metadata?: Record<string, any> }): string {
  const raw =
    authUser.user_metadata?.preferred_username ||
    authUser.user_metadata?.name ||
    authUser.user_metadata?.full_name ||
    authUser.email?.split('@')[0] ||
    'usuario';
  const base = raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'usuario';
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  spotifyToken: null,
  spotifyRefreshToken: null,
  spotifyProfile: null,
  isRichDemo: false,

  loginAsDemo: () => set({ user: DEMO_USER, isRichDemo: true, loading: false }),

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
      return;
    }

    // No `users` row yet — this is a first-time OAuth sign-in (Google/Apple
    // never go through register.tsx's explicit insert). Create one from the
    // auth user's provider metadata so the rest of the app has a profile.
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData?.user;
    if (!authUser || authUser.id !== userId) return;

    const displayName =
      authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario';

    const { data: created, error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        username: usernameFromAuthUser(authUser),
        display_name: displayName,
        avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
        followers_count: 0,
        following_count: 0,
        ratings_count: 0,
      })
      .select('*')
      .single();

    if (!insertError && created) set({ user: created as User });
  },

  signInWithGoogle: () => signInWithOAuthProvider('google'),
  signInWithApple: () => signInWithOAuthProvider('apple'),

  signOut: async () => {
    if (!get().isRichDemo) await supabase.auth.signOut();
    await AsyncStorage.removeItem('spotify_access_token');
    set({ user: null, session: null, spotifyToken: null, spotifyRefreshToken: null, spotifyProfile: null, isRichDemo: false });
  },
}));
