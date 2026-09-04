// Push notifications. Registration (this device -> push_tokens) happens
// client-side; actual sending happens server-side via the `send-push`
// Supabase Edge Function (supabase/functions/send-push) — a user's own
// device can't push to someone else's, so every "notify the other person"
// call in this app goes through sendPushTo() below, which just invokes
// that function and never blocks the action that triggered it.
//
// `expo-notifications` is NOT statically imported here. In Expo Go on
// Android (SDK 53+, where remote push was removed from Expo Go), the
// module throws as soon as it's `require`'d — not just when a function on
// it is called — so a top-level `import` crashed the entire app on boot,
// before a single screen could render, since app/_layout.tsx pulls this
// file in through hooks/useAuth.ts. Loading it lazily inside a try/catch,
// only when actually registering for push, is what actually avoids that.

import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

let handlerReady = false;

function loadNotifications(): typeof import('expo-notifications') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-notifications');
    if (!handlerReady) {
      mod.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      handlerReady = true;
    }
    return mod;
  } catch {
    // Expo Go (Android, SDK 53+) or any environment without the native
    // module — push just won't work here, which is fine, it's a nice-to-have.
    return null;
  }
}

/** Call once after a successful sign-in. Silently no-ops on simulators, in Expo Go (remote push needs a dev/standalone build since SDK 53), or if permission is denied. */
export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!Device.isDevice) return;

  const Notifications = loadNotifications();
  if (!Notifications) return;

  try {
    // Cast: expo-notifications' NotificationPermissionsStatus re-exports
    // PermissionResponse from the `expo` package, and that re-export
    // doesn't type-check cleanly against the `status` field in this
    // installed version combo — `granted` is the same boolean at runtime
    // either way, so read through `any` rather than fight the .d.ts.
    const existing: any = await Notifications.getPermissionsAsync();
    let granted: boolean = existing.granted;
    if (!granted) {
      const requested: any = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    if (!token) return;

    await supabase
      .from('push_tokens')
      .upsert({ user_id: userId, token, platform: Platform.OS === 'ios' ? 'ios' : 'android' }, { onConflict: 'user_id,token' });
  } catch {
    // Push is a nice-to-have, never a hard dependency for app function.
  }
}

/** Best-effort — fire and forget. Never throws, never awaited by UI flows that shouldn't wait on it. */
export async function sendPushTo(userId: string, title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  try {
    await supabase.functions.invoke('send-push', { body: { user_id: userId, title, body, data } });
  } catch {
    // Notifying the other person failing shouldn't fail the action that triggered it.
  }
}
