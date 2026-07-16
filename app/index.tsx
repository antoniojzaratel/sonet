import { Redirect } from 'expo-router';
import { useAuth, isDemoMode } from '@/hooks/useAuth';

export default function Index() {
  const { isAuthenticated, loading } = useAuth();

  if (isDemoMode) return <Redirect href="/(tabs)" />;
  if (loading) return null;

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}
