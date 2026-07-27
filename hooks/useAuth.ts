import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export const isDemoMode =
  !SUPABASE_URL ||
  SUPABASE_URL.includes('placeholder') ||
  SUPABASE_URL.includes('your-project');

export function useAuth() {
  const { user, loading } = useAuthStore();
  return { user, loading };
}

export function useProtectedRoute(isSignedIn: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isDemoMode) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isSignedIn, segments]);
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
