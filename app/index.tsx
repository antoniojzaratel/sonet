import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}
