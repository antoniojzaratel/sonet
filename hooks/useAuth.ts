import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// Demo mode: active when no real Supabase URL is configured
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const isDemoMode =
  !SUPABASE_URL || SUPABASE_URL.includes('placeholder') || SUPABASE_URL.includes('your-project');

export function useAuth() {
  const { user, session, loading } = useAuthStore();
  return { user, session, loading, isAuthenticated: isDemoMode || !!session };
}

export function useProtectedRoute() {
  const { session, loading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // In demo mode, never redirect to login
    if (isDemoMode) return;
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, segments, loading]);
}

export function useSupabaseAuth() {
  const { setSession, fetchProfile } = useAuthStore();

  useEffect(() => {
    if (isDemoMode) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) fetchProfile(session.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) fetchProfile(session.user.id);
    });

    return () => listener.subscription.unsubscribe();
  }, []);
}
