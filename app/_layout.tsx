import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSupabaseAuth, useProtectedRoute, useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { initSentry } from '@/lib/sentry';

initSentry();

function RootLayoutNav() {
  const { user } = useAuth();
  useProtectedRoute(!!user);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      {/* hitster/ and chat/ each have their own index.tsx + a dynamic route,
          so Expo Router collapses them to the bare folder name. stories/,
          party/, and admin/ each hold a single file with no index.tsx —
          there's no bare-folder route to collapse to, so these three have
          to be named by their actual nested route instead. */}
      <Stack.Screen name="hitster" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="chat" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="stories/[userId]" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="party/[eventId]" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="admin/reports" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useSupabaseAuth();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        {/* `backgroundColor` was removed from expo-status-bar's props — Android
            is edge-to-edge by default as of this SDK, so the status bar is
            always transparent; `Colors.background` behind it comes from the
            screen content itself, not this component. */}
        <StatusBar style="light" />
        <OfflineBanner />
        <RootLayoutNav />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
